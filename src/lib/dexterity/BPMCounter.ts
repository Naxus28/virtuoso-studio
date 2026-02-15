/**
 * BPMCounter — detects repetitive finger tapping and estimates tempo.
 *
 * Algorithm:
 *   1. Track each fingertip's y-position across frames.
 *   2. Detect "tap" events: y-velocity goes from negative (moving down in screen
 *      coords / up in world coords) to positive (moving back up), i.e. a local
 *      minimum in the y trajectory.
 *   3. Record tap timestamps in a circular buffer (last 16 taps).
 *   4. BPM = 60000 / median(inter-tap intervals).
 *   5. Confidence = 1 - (stddev / mean) of inter-tap intervals, clamped to 0–1.
 *
 * Output: { bpm, tapCount, confidence }.
 */

import type { DexterityMetric, HandFrame } from "./types";
import { INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP } from "./types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface BPMResult {
  /** Estimated beats per minute. 0 if insufficient taps. */
  bpm: number;
  /** Total taps detected since last reset. */
  tapCount: number;
  /** 0–1 confidence based on interval consistency. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAP_BUFFER_SIZE = 16;
/** Minimum y-delta between frames to count as movement (filters noise). */
const VELOCITY_THRESHOLD = 0.003;
/** Tracked fingertips (exclude thumb — less reliable for tapping). */
const TAP_FINGERS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

export class BPMCounter implements DexterityMetric<BPMResult> {
  readonly name = "BPM Counter";

  /** Circular buffer of tap timestamps (ms). */
  private tapTimestamps: number[] = [];
  private tapCount = 0;

  /** Previous y-position per tracked fingertip (keyed by landmark index). */
  private prevY: Map<number, number> = new Map();
  /** Previous velocity direction per fingertip: true = moving down (y increasing in screen coords). */
  private wasMovingDown: Map<number, boolean> = new Map();

  update(frame: HandFrame): void {
    if (frame.landmarks.length < 21) return;

    for (const idx of TAP_FINGERS) {
      const currentY = frame.landmarks[idx].y;
      const prevY = this.prevY.get(idx);

      if (prevY != null) {
        const delta = currentY - prevY;
        // In MediaPipe screen coords, y increases downward.
        // "Moving down" = delta > 0.  "Moving up" = delta < 0.
        const isMovingDown = delta > VELOCITY_THRESHOLD;
        const isMovingUp = delta < -VELOCITY_THRESHOLD;
        const wasDown = this.wasMovingDown.get(idx) ?? false;

        // Tap = was moving down, now moving up (fingertip bounced).
        if (wasDown && isMovingUp) {
          this.recordTap(frame.timestamp);
        }

        if (isMovingDown) {
          this.wasMovingDown.set(idx, true);
        } else if (isMovingUp) {
          this.wasMovingDown.set(idx, false);
        }
        // If within dead zone (|delta| < threshold), keep previous direction.
      }

      this.prevY.set(idx, currentY);
    }
  }

  getResult(): BPMResult {
    const intervals = this.getIntervals();
    if (intervals.length < 2) {
      return { bpm: 0, tapCount: this.tapCount, confidence: 0 };
    }

    const median = this.median(intervals);
    const bpm = median > 0 ? 60000 / median : 0;

    // Confidence: 1 - coefficient of variation (stddev / mean), clamped.
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const stddev = Math.sqrt(
      intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length,
    );
    const cv = mean > 0 ? stddev / mean : 1;
    const confidence = Math.max(0, Math.min(1, 1 - cv));

    return {
      bpm: Math.round(bpm),
      tapCount: this.tapCount,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  reset(): void {
    this.tapTimestamps = [];
    this.tapCount = 0;
    this.prevY.clear();
    this.wasMovingDown.clear();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private recordTap(timestamp: number): void {
    this.tapCount++;
    this.tapTimestamps.push(timestamp);
    if (this.tapTimestamps.length > TAP_BUFFER_SIZE) {
      this.tapTimestamps.shift();
    }
  }

  private getIntervals(): number[] {
    const ts = this.tapTimestamps;
    if (ts.length < 2) return [];
    const intervals: number[] = [];
    for (let i = 1; i < ts.length; i++) {
      intervals.push(ts[i] - ts[i - 1]);
    }
    return intervals;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}
