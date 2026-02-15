/**
 * ViewStrategies — The Math Layer.
 *
 * Each ViewStrategy encapsulates a single geometric perspective for posture
 * analysis. Strategies are stateless (except AutoDetect during its detection
 * phase) and contain zero instrument-specific logic.
 *
 * Threshold values are provided by the Instrument via PostureThresholds;
 * strategies fall back to DEFAULT_THRESHOLDS when none are supplied.
 */

import type {
  WorldLandmark,
  ImageLandmark,
  Baseline,
  FrontBaseline,
  SideBaseline,
  PostureThresholds,
} from "./types";
import {
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  EAR_LEFT,
  EAR_RIGHT,
  HIP_LEFT,
  HIP_RIGHT,
  angleEarShoulderHipWorld,
  dist3,
  DEFAULT_THRESHOLDS,
  sensitivityToRatioThreshold,
  sensitivityToAngleRatioSide,
} from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewResult {
  leanRaw: boolean;
  tensionRaw: boolean;
  isShrug: boolean;
  quality: number;
  feedback: string;
}

export interface ViewStrategy {
  readonly name: string;
  readonly perspective: "front" | "side";
  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    imageLandmarks?: ImageLandmark[],
    sensitivity?: number,
    thresholds?: PostureThresholds,
  ): ViewResult;
}

const GOOD: ViewResult = {
  leanRaw: false,
  tensionRaw: false,
  isShrug: false,
  quality: 1,
  feedback: "Good posture",
};

// ---------------------------------------------------------------------------
// FrontViewStrategy
// ---------------------------------------------------------------------------

export class FrontViewStrategy implements ViewStrategy {
  readonly name = "Front View";
  readonly perspective = "front" as const;

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    _imageLandmarks?: ImageLandmark[],
    sensitivity: number = 50,
    thresholds: PostureThresholds = DEFAULT_THRESHOLDS,
  ): ViewResult {
    if (landmarks.length < 25) return { ...GOOD };

    const base = baseline as FrontBaseline;
    const w = landmarks;

    // --- angles ---
    const angleL = angleEarShoulderHipWorld(w[EAR_LEFT], w[SHOULDER_LEFT], w[HIP_LEFT]);
    const angleR = angleEarShoulderHipWorld(w[EAR_RIGHT], w[SHOULDER_RIGHT], w[HIP_RIGHT]);
    const avgAngle = (angleL + angleR) / 2;
    const baselineAngle = (base.angleLeft + base.angleRight) / 2;
    const leanRaw = avgAngle < baselineAngle * thresholds.leanAngleRatio;

    // --- shoulder/ear positions ---
    const earYLeft = w[EAR_LEFT].y;
    const earYRight = w[EAR_RIGHT].y;
    const shoulderYLeft = w[SHOULDER_LEFT].y;
    const shoulderYRight = w[SHOULDER_RIGHT].y;

    // --- shrug detection ---
    const shoulderUpLeft = base.shoulderYLeft - shoulderYLeft > thresholds.shrugToleranceM;
    const shoulderUpRight = base.shoulderYRight - shoulderYRight > thresholds.shrugToleranceM;
    const earStableLeft = earYLeft <= base.earYLeft + thresholds.shrugToleranceM;
    const earStableRight = earYRight <= base.earYRight + thresholds.shrugToleranceM;
    const isShrug = (shoulderUpLeft && earStableLeft) || (shoulderUpRight && earStableRight);

    // --- tension from elevation ---
    const avgShoulderY = (shoulderYLeft + shoulderYRight) / 2;
    const baselineShoulderY = (base.shoulderYLeft + base.shoulderYRight) / 2;
    const avgEarY = (earYLeft + earYRight) / 2;
    const baselineEarY = (base.earYLeft + base.earYRight) / 2;
    const shouldersHigh = baselineShoulderY - avgShoulderY > thresholds.tensionShoulderUpM;
    const earNotDropped = avgEarY <= baselineEarY + thresholds.shrugToleranceM;

    // --- personalized symmetry ---
    const baselineAsymmetry = Math.abs(base.shoulderYLeft - base.shoulderYRight);
    const shoulderAsymmetry = Math.abs(shoulderYLeft - shoulderYRight);
    const shoulderSymmetry =
      shoulderAsymmetry <= baselineAsymmetry + thresholds.symmetryToleranceM;

    // --- vertical ear-shoulder compression ---
    const vertLeft = Math.abs(w[EAR_LEFT].y - w[SHOULDER_LEFT].y);
    const vertRight = Math.abs(w[EAR_RIGHT].y - w[SHOULDER_RIGHT].y);
    const avgVert = (vertLeft + vertRight) / 2;
    const baselineVert = (base.earShoulderVertLeft + base.earShoulderVertRight) / 2;
    const vertRatio = baselineVert > 1e-6 ? avgVert / baselineVert : 1;
    const ratioThreshold = sensitivityToRatioThreshold(sensitivity);
    const angleDropped = avgAngle < baselineAngle * thresholds.angleDropForHeadPose;
    const verticalShrink = vertRatio < ratioThreshold && !isShrug;

    // --- tension composites ---
    const tensionFromElevation =
      shouldersHigh && earNotDropped && !leanRaw && shoulderSymmetry && !angleDropped;
    const tensionFromVertical = verticalShrink && !angleDropped;

    const personalizedAsymmetryThreshold = Math.max(
      baselineAsymmetry + thresholds.asymmetryDeviationM,
      thresholds.minAsymmetryAlertM,
    );
    const tensionFromAsymmetry = shoulderAsymmetry > personalizedAsymmetryThreshold;

    // vertical shrink + angle dropped = head tilt/forward → lean, not tension
    const headDownLean = verticalShrink && angleDropped;

    const tensionRaw =
      tensionFromElevation || tensionFromVertical || tensionFromAsymmetry;
    const leanRawResolved = leanRaw || headDownLean;

    const quality = Math.min(1, avgAngle / baselineAngle);

    let feedback = "Good posture";
    if (leanRawResolved) {
      feedback = "Lean detected — sit up and align ear over shoulder over hip.";
    } else if (tensionRaw) {
      feedback = "Tension detected — relax your shoulders and level them.";
    }

    return { leanRaw: leanRawResolved, tensionRaw, isShrug, quality, feedback };
  }
}

// ---------------------------------------------------------------------------
// SideViewStrategy
// ---------------------------------------------------------------------------

export class SideViewStrategy implements ViewStrategy {
  readonly name = "Side View";
  readonly perspective = "side" as const;

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    _imageLandmarks?: ImageLandmark[],
    sensitivity: number = 50,
    thresholds: PostureThresholds = DEFAULT_THRESHOLDS,
  ): ViewResult {
    if (landmarks.length < 25) return { ...GOOD };

    const base = baseline as SideBaseline;
    const w = landmarks;
    const ratioThreshold = sensitivityToRatioThreshold(sensitivity);
    const angleRatioSide = sensitivityToAngleRatioSide(sensitivity);

    // --- distance-based shrink ---
    const distLeft = dist3(w[EAR_LEFT], w[SHOULDER_LEFT]);
    const distRight = dist3(w[EAR_RIGHT], w[SHOULDER_RIGHT]);
    const avgDist = (distLeft + distRight) / 2;
    const baselineDist = (base.distLeft + base.distRight) / 2;
    const ratio = baselineDist > 1e-6 ? avgDist / baselineDist : 1;
    const distanceShrink = ratio < ratioThreshold;

    // --- angle: use visible side only (occluded side unreliable when head turned) ---
    const angleLeft = angleEarShoulderHipWorld(w[EAR_LEFT], w[SHOULDER_LEFT], w[HIP_LEFT]);
    const angleRight = angleEarShoulderHipWorld(w[EAR_RIGHT], w[SHOULDER_RIGHT], w[HIP_RIGHT]);
    const useLeftAngle = distLeft >= distRight;
    const currentAngle = useLeftAngle ? angleLeft : angleRight;
    const baselineAngle =
      base.angleLeft != null && base.angleRight != null
        ? (useLeftAngle ? base.angleLeft : base.angleRight)
        : 0;
    const angleDropped =
      baselineAngle > 0 && currentAngle < baselineAngle * angleRatioSide;

    // --- shrug / tension from shoulder elevation ---
    const hasShoulderBaseline =
      base.shoulderYLeft != null &&
      base.shoulderYRight != null &&
      base.earYLeft != null &&
      base.earYRight != null;

    let tensionRaw = false;
    let isShrug = false;

    if (hasShoulderBaseline) {
      const shoulderYLeft = w[SHOULDER_LEFT].y;
      const shoulderYRight = w[SHOULDER_RIGHT].y;
      const earYLeft = w[EAR_LEFT].y;
      const earYRight = w[EAR_RIGHT].y;

      const shoulderUpLeft = base.shoulderYLeft! - shoulderYLeft > thresholds.shrugSideM;
      const shoulderUpRight = base.shoulderYRight! - shoulderYRight > thresholds.shrugSideM;
      const earStableLeft = earYLeft <= base.earYLeft! + thresholds.shrugSideM;
      const earStableRight = earYRight <= base.earYRight! + thresholds.shrugSideM;
      isShrug = (shoulderUpLeft && earStableLeft) || (shoulderUpRight && earStableRight);

      const avgShoulderY = (shoulderYLeft + shoulderYRight) / 2;
      const baselineShoulderY = (base.shoulderYLeft! + base.shoulderYRight!) / 2;
      const avgEarY = (earYLeft + earYRight) / 2;
      const baselineEarY = (base.earYLeft! + base.earYRight!) / 2;
      const shouldersHigh = baselineShoulderY - avgShoulderY > thresholds.tensionShoulderUpM;
      const earNotDropped = avgEarY <= baselineEarY + thresholds.shrugSideM;
      const tensionFromElevation = shouldersHigh && earNotDropped && !angleDropped;
      const tensionFromVerticalShrink =
        distanceShrink && !angleDropped && baselineAngle > 0;

      tensionRaw =
        baselineAngle > 0 &&
        !angleDropped &&
        (isShrug || tensionFromElevation || tensionFromVerticalShrink);
    }

    // lean = head forward / head tilted down
    const leanRaw = angleDropped || (baselineAngle <= 0 && distanceShrink);
    const quality = Math.min(
      1,
      ratio,
      baselineAngle > 0 ? currentAngle / baselineAngle : 1,
    );

    let feedback = "Good posture";
    if (leanRaw) {
      feedback = "Lean detected — sit up and align ear over shoulder over hip.";
    } else if (tensionRaw) {
      feedback = "Tension detected — relax your shoulders and level them.";
    }

    return { leanRaw, tensionRaw, isShrug, quality, feedback };
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
  get perspective(): "front" | "side" {
    return this.resolved?.perspective ?? "front";
  }

  private frameBuffer: { ratio: number; earVisibility: number }[] = [];
  private resolved: ViewStrategy | null = null;
  private readonly frontStrategy: FrontViewStrategy;
  private readonly sideStrategy: SideViewStrategy;

  constructor() {
    this.frontStrategy = new FrontViewStrategy();
    this.sideStrategy = new SideViewStrategy();
  }

  getResolvedStrategy(): ViewStrategy | null {
    return this.resolved;
  }

  validate(
    landmarks: WorldLandmark[],
    baseline: Baseline,
    imageLandmarks?: ImageLandmark[],
    sensitivity?: number,
    thresholds?: PostureThresholds,
  ): ViewResult {
    if (this.resolved) {
      return this.resolved.validate(landmarks, baseline, imageLandmarks, sensitivity, thresholds);
    }

    if (landmarks.length >= 25) {
      const shoulderWidth = Math.abs(
        landmarks[SHOULDER_LEFT].x - landmarks[SHOULDER_RIGHT].x,
      );
      const earVis =
        imageLandmarks && imageLandmarks.length >= 25
          ? Math.min(
              imageLandmarks[EAR_LEFT].visibility ?? 1,
              imageLandmarks[EAR_RIGHT].visibility ?? 1,
            )
          : 1;
      this.frameBuffer.push({ ratio: shoulderWidth, earVisibility: earVis });
    }

    if (this.frameBuffer.length >= AUTO_DETECT_FRAMES) {
      this.resolved = this.resolveStrategy();
    }

    return { ...GOOD, feedback: "Calibrating view\u2026" };
  }

  private resolveStrategy(): ViewStrategy {
    const avgRatio =
      this.frameBuffer.reduce((s, f) => s + f.ratio, 0) /
      this.frameBuffer.length;
    const avgEarVis =
      this.frameBuffer.reduce((s, f) => s + f.earVisibility, 0) /
      this.frameBuffer.length;

    if (avgEarVis < 0.5) return this.sideStrategy;
    if (avgRatio > FRONT_RATIO_THRESHOLD) return this.frontStrategy;
    if (avgRatio < SIDE_RATIO_THRESHOLD) return this.sideStrategy;
    return this.frontStrategy;
  }
}
