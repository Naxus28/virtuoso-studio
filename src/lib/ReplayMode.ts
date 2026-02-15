/**
 * ReplayMode — re-processes a stored session through the exact Instrument/View
 * combination that was active when it was recorded.
 *
 * Supports both frame-by-frame playback (animated UI) and batch processing
 * (stats generation). Legacy sessions without a baseline fall back to the
 * stored per-frame quality values.
 */

import type { StoredSession } from "./sessionLibrary";
import type { SessionFrame } from "./SessionRecorder";
import type { ValidateResult, Baseline, WorldLandmark } from "./posture-engines/types";
import { EngineFactory } from "./posture-engines/EngineFactory";
import type { Instrument } from "./posture-engines/Instruments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayFrameResult {
  frame: SessionFrame;
  result: ValidateResult;
  /** 0–1 progress through the recording. */
  progress: number;
}

export interface ReplayResults {
  totalFrames: number;
  tensionFrames: number;
  tensionPercentage: number;
  /** Per-frame quality value (from validation or stored fallback). */
  qualityOverTime: number[];
  /** Timestamps (ms) where tension was detected. */
  alertTimestamps: number[];
  averageQuality: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the baseline object has meaningful data. */
function hasBaseline(baseline: Baseline | undefined): baseline is Baseline {
  if (!baseline) return false;
  return Object.keys(baseline).length > 0;
}

// ---------------------------------------------------------------------------
// ReplayMode
// ---------------------------------------------------------------------------

export class ReplayMode {
  private readonly instrument: Instrument;
  private readonly recording: StoredSession["recording"];
  private readonly baseline: Baseline;
  private readonly useFallback: boolean;
  private frameIndex = 0;

  constructor(session: StoredSession) {
    this.recording = session.recording;
    this.baseline = session.baseline;
    this.useFallback = !hasBaseline(session.baseline);
    this.instrument = this.buildEngine(session);
  }

  /** Total frame count in the recording. */
  get totalFrames(): number {
    return this.recording.frames.length;
  }

  /** Current playhead position. */
  get currentIndex(): number {
    return this.frameIndex;
  }

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------

  /**
   * Advance one frame and return the validation result.
   * Returns `null` when all frames have been consumed.
   */
  nextFrame(): ReplayFrameResult | null {
    if (this.frameIndex >= this.recording.frames.length) return null;

    const frame = this.recording.frames[this.frameIndex];
    const result = this.processFrame(frame);
    const progress =
      this.recording.frames.length > 0
        ? (this.frameIndex + 1) / this.recording.frames.length
        : 1;

    this.frameIndex++;
    return { frame, result, progress };
  }

  /**
   * Process every frame synchronously and return aggregate statistics.
   * Resets the playhead to 0 before processing, and leaves it at the end.
   */
  processAll(): ReplayResults {
    this.frameIndex = 0;

    const qualityOverTime: number[] = [];
    const alertTimestamps: number[] = [];
    let tensionFrames = 0;

    for (const frame of this.recording.frames) {
      const result = this.processFrame(frame);

      if (result.isTense) {
        tensionFrames++;
        alertTimestamps.push(frame.timestamp);
      }

      // Use frame.quality as the quality signal (it's always present).
      qualityOverTime.push(frame.quality);
    }

    this.frameIndex = this.recording.frames.length;

    const totalFrames = this.recording.frames.length;
    const averageQuality =
      totalFrames > 0
        ? qualityOverTime.reduce((s, v) => s + v, 0) / totalFrames
        : 0;

    return {
      totalFrames,
      tensionFrames,
      tensionPercentage:
        totalFrames > 0 ? (tensionFrames / totalFrames) * 100 : 0,
      qualityOverTime,
      alertTimestamps,
      averageQuality,
    };
  }

  /** Jump to a specific frame index. Clamped to valid range. */
  seek(index: number): void {
    this.frameIndex = Math.max(
      0,
      Math.min(index, this.recording.frames.length),
    );
  }

  /** Reset playhead to frame 0. */
  reset(): void {
    this.frameIndex = 0;
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private buildEngine(session: StoredSession): Instrument {
    return EngineFactory.create(session.instrument, {
      view: session.view,
      sensitivity: session.sensitivity,
    });
  }

  private processFrame(frame: SessionFrame): ValidateResult {
    // Legacy sessions without a baseline — skip validation, use stored quality.
    if (this.useFallback) {
      const isTense = frame.quality < 0.88;
      return {
        isTense,
        feedback: isTense
          ? "Tension detected (from stored quality)"
          : "Good posture",
      };
    }

    const landmarks = frame.landmarks as WorldLandmark[];
    return this.instrument.validate({
      landmarks,
      baseline: this.baseline,
    });
  }
}
