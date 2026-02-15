/**
 * HandSpan — measures the maximum spread distance between fingertips.
 *
 * Algorithm:
 *   1. Compute pairwise distances between all 5 fingertip landmarks (4, 8, 12, 16, 20).
 *   2. Track the maximum observed span (thumb-tip to pinky-tip distance).
 *   3. Normalize against a calibrated baseline span.
 *
 * Output: { currentSpan, maxSpan, normalizedSpan }.
 */

import type { DexterityMetric, HandFrame, HandLandmark } from "./types";
import { THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP } from "./types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface HandSpanResult {
  /** Current thumb-to-pinky distance this frame. */
  currentSpan: number;
  /** Maximum span observed since last reset / calibration. */
  maxSpan: number;
  /** currentSpan / baselineSpan (or maxSpan if no baseline). Clamped 0–2. */
  normalizedSpan: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FINGERTIP_INDICES = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

function dist3(a: HandLandmark, b: HandLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

export class HandSpan implements DexterityMetric<HandSpanResult> {
  readonly name = "Hand Span";
  private maxSpan = 0;
  private currentSpan = 0;
  private baselineSpan: number;

  /**
   * @param baselineSpan Optional calibrated span distance. If 0 or omitted,
   *   the first observed max span is used as the baseline.
   */
  constructor(baselineSpan: number = 0) {
    this.baselineSpan = baselineSpan;
  }

  /** Set or recalibrate the baseline span. */
  calibrate(baselineSpan: number): void {
    this.baselineSpan = baselineSpan;
  }

  update(frame: HandFrame): void {
    if (frame.landmarks.length < 21) return;

    // Find the maximum pairwise distance between all fingertips.
    let maxPairwise = 0;
    for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
      for (let j = i + 1; j < FINGERTIP_INDICES.length; j++) {
        const d = dist3(
          frame.landmarks[FINGERTIP_INDICES[i]],
          frame.landmarks[FINGERTIP_INDICES[j]],
        );
        if (d > maxPairwise) maxPairwise = d;
      }
    }

    this.currentSpan = maxPairwise;
    if (maxPairwise > this.maxSpan) {
      this.maxSpan = maxPairwise;
    }

    // Auto-calibrate if no baseline was provided.
    if (this.baselineSpan <= 0 && this.maxSpan > 0) {
      this.baselineSpan = this.maxSpan;
    }
  }

  getResult(): HandSpanResult {
    const base = this.baselineSpan > 0 ? this.baselineSpan : 1;
    return {
      currentSpan: this.currentSpan,
      maxSpan: this.maxSpan,
      normalizedSpan: Math.min(2, this.currentSpan / base),
    };
  }

  reset(): void {
    this.maxSpan = 0;
    this.currentSpan = 0;
    // Keep baselineSpan — reset only clears accumulated observations.
  }
}
