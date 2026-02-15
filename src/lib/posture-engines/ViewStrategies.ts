/**
 * ViewStrategies — The Math Layer.
 *
 * Each ViewStrategy encapsulates a single geometric perspective for posture
 * analysis. Strategies are stateless (except AutoDetect during its detection
 * phase) and contain zero instrument-specific logic.
 */

import type {
  WorldLandmark,
  ImageLandmark,
  Baseline,
  FrontBaseline,
  SideBaseline,
} from "./types";
import {
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  EAR_LEFT,
  EAR_RIGHT,
  HIP_LEFT,
  HIP_RIGHT,
  angleEarShoulderHipWorld,
  angleEarShoulderHip2D,
} from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewResult {
  isTense: boolean;
  feedback: string;
}

export interface ViewStrategy {
  readonly name: string;
  readonly perspective: "front" | "side";
  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    imageLandmarks?: ImageLandmark[],
  ): ViewResult;
}

// ---------------------------------------------------------------------------
// FrontViewStrategy
// ---------------------------------------------------------------------------

const DEFAULT_ASYMMETRY_M = 0.02;

export class FrontViewStrategy implements ViewStrategy {
  readonly name = "Front View";
  readonly perspective = "front" as const;
  private readonly threshold: number;

  constructor(threshold: number = DEFAULT_ASYMMETRY_M) {
    this.threshold = threshold;
  }

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    _imageLandmarks?: ImageLandmark[],
  ): ViewResult {
    if (landmarks.length < 25) {
      return { isTense: false, feedback: "Good posture" };
    }
    const _base = baseline as FrontBaseline;
    const asymmetry = Math.abs(
      landmarks[SHOULDER_LEFT].y - landmarks[SHOULDER_RIGHT].y,
    );
    const isTense = asymmetry > this.threshold;
    return {
      isTense,
      feedback: isTense
        ? "Tension detected — one shoulder is higher than the other. Try to level your shoulders."
        : "Good posture",
    };
  }
}

// ---------------------------------------------------------------------------
// SideViewStrategy
// ---------------------------------------------------------------------------

const ANGLE_FLOOR_DEG = 145;
const ANGLE_DEVIATION_DEG = 10;

export class SideViewStrategy implements ViewStrategy {
  readonly name = "Side View";
  readonly perspective = "side" as const;
  private readonly thresholdDeg: number;

  constructor(thresholdDeg: number = ANGLE_FLOOR_DEG) {
    this.thresholdDeg = thresholdDeg;
  }

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    imageLandmarks?: ImageLandmark[],
  ): ViewResult {
    if (landmarks.length < 25) {
      return { isTense: false, feedback: "Good posture" };
    }
    const base = baseline as SideBaseline;

    const use2D =
      imageLandmarks != null &&
      imageLandmarks.length >= 25 &&
      base.angleLeft2D != null &&
      base.angleRight2D != null;

    let currentAngle: number;
    let baselineAngle: number;

    if (use2D && imageLandmarks) {
      const left2D = angleEarShoulderHip2D(
        imageLandmarks,
        EAR_LEFT,
        SHOULDER_LEFT,
        HIP_LEFT,
      );
      const right2D = angleEarShoulderHip2D(
        imageLandmarks,
        EAR_RIGHT,
        SHOULDER_RIGHT,
        HIP_RIGHT,
      );
      currentAngle = (left2D + right2D) / 2;
      baselineAngle =
        ((base.angleLeft2D ?? base.angleLeft) +
          (base.angleRight2D ?? base.angleRight)) /
        2;
    } else {
      const left = angleEarShoulderHipWorld(
        landmarks[EAR_LEFT],
        landmarks[SHOULDER_LEFT],
        landmarks[HIP_LEFT],
      );
      const right = angleEarShoulderHipWorld(
        landmarks[EAR_RIGHT],
        landmarks[SHOULDER_RIGHT],
        landmarks[HIP_RIGHT],
      );
      currentAngle = (left + right) / 2;
      baselineAngle = (base.angleLeft + base.angleRight) / 2;
    }

    if (
      Number.isNaN(currentAngle) ||
      Number.isNaN(baselineAngle) ||
      baselineAngle <= 0
    ) {
      return { isTense: false, feedback: "Good posture" };
    }

    const angleThreshold = Math.min(
      this.thresholdDeg,
      Math.max(50, baselineAngle - ANGLE_DEVIATION_DEG),
    );
    const isTense = currentAngle < angleThreshold;
    return {
      isTense,
      feedback: isTense
        ? "Tension detected — head forward / slumped. Sit tall and align ear over shoulder."
        : "Good posture",
    };
  }
}

// ---------------------------------------------------------------------------
// AutoDetectStrategy
// ---------------------------------------------------------------------------

const AUTO_DETECT_FRAMES = 30;
const FRONT_RATIO_THRESHOLD = 0.15;
const SIDE_RATIO_THRESHOLD = 0.10;

export class AutoDetectStrategy implements ViewStrategy {
  readonly name = "Auto Detect";
  /** Perspective is mutable — resolves after detection phase. */
  get perspective(): "front" | "side" {
    return this.resolved?.perspective ?? "front";
  }

  private frameBuffer: { ratio: number; earVisibility: number }[] = [];
  private resolved: ViewStrategy | null = null;
  private readonly frontStrategy: FrontViewStrategy;
  private readonly sideStrategy: SideViewStrategy;

  constructor(opts?: { frontThreshold?: number; sideThresholdDeg?: number }) {
    this.frontStrategy = new FrontViewStrategy(opts?.frontThreshold);
    this.sideStrategy = new SideViewStrategy(opts?.sideThresholdDeg);
  }

  /** Returns the resolved inner strategy once detection is complete, or null. */
  getResolvedStrategy(): ViewStrategy | null {
    return this.resolved;
  }

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    imageLandmarks?: ImageLandmark[],
  ): ViewResult {
    // If already resolved, delegate directly.
    if (this.resolved) {
      return this.resolved.validate(landmarks, baseline, imageLandmarks);
    }

    // Buffer detection frames.
    if (landmarks.length >= 25) {
      const shoulderWidth = Math.abs(
        landmarks[SHOULDER_LEFT].x - landmarks[SHOULDER_RIGHT].x,
      );
      // Use image landmarks for visibility when available.
      const earVis =
        imageLandmarks && imageLandmarks.length >= 25
          ? Math.min(
              imageLandmarks[EAR_LEFT].visibility ?? 1,
              imageLandmarks[EAR_RIGHT].visibility ?? 1,
            )
          : 1;

      this.frameBuffer.push({ ratio: shoulderWidth, earVisibility: earVis });
    }

    // Resolve after enough frames.
    if (this.frameBuffer.length >= AUTO_DETECT_FRAMES) {
      this.resolved = this.resolveStrategy();
    }

    // During detection, return a neutral result.
    return { isTense: false, feedback: "Calibrating view…" };
  }

  private resolveStrategy(): ViewStrategy {
    const avgRatio =
      this.frameBuffer.reduce((s, f) => s + f.ratio, 0) /
      this.frameBuffer.length;
    const avgEarVis =
      this.frameBuffer.reduce((s, f) => s + f.earVisibility, 0) /
      this.frameBuffer.length;

    // Low ear visibility suggests one ear is occluded → side view.
    if (avgEarVis < 0.5) {
      return this.sideStrategy;
    }
    // Wide shoulder spread → facing camera → front view.
    if (avgRatio > FRONT_RATIO_THRESHOLD) {
      return this.frontStrategy;
    }
    // Narrow shoulder spread → perpendicular to camera → side view.
    if (avgRatio < SIDE_RATIO_THRESHOLD) {
      return this.sideStrategy;
    }
    // Inconclusive — default to front.
    return this.frontStrategy;
  }
}
