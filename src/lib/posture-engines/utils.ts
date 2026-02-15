import type { WorldLandmark, ImageLandmark, PostureThresholds } from "./types";

// ---------------------------------------------------------------------------
// MediaPipe Pose landmark indices
// ---------------------------------------------------------------------------

export const EAR_LEFT = 7;
export const EAR_RIGHT = 8;
export const SHOULDER_LEFT = 11;
export const SHOULDER_RIGHT = 12;
export const WRIST_LEFT = 15;
export const WRIST_RIGHT = 16;
export const HIP_LEFT = 23;
export const HIP_RIGHT = 24;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function dist3(a: WorldLandmark, b: WorldLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** 3D angle in degrees at shoulder between ear and hip. Smaller = head forward. */
export function angleEarShoulderHipWorld(
  ear: WorldLandmark,
  shoulder: WorldLandmark,
  hip: WorldLandmark
): number {
  const vx = ear.x - shoulder.x;
  const vy = ear.y - shoulder.y;
  const vz = ear.z - shoulder.z;
  const wx = hip.x - shoulder.x;
  const wy = hip.y - shoulder.y;
  const wz = hip.z - shoulder.z;
  const dot = vx * wx + vy * wy + vz * wz;
  const magV = Math.hypot(vx, vy, vz) || 1e-6;
  const magW = Math.hypot(wx, wy, wz) || 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / (magV * magW)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 2D angle in image plane (x,y) at shoulder between ear and hip. */
export function angleEarShoulderHip2D(
  lm: ImageLandmark[],
  earI: number,
  shoulderI: number,
  hipI: number
): number {
  if (lm.length <= Math.max(earI, shoulderI, hipI)) return 180;
  const ear = lm[earI];
  const shoulder = lm[shoulderI];
  const hip = lm[hipI];
  const vx = ear.x - shoulder.x;
  const vy = ear.y - shoulder.y;
  const wx = hip.x - shoulder.x;
  const wy = hip.y - shoulder.y;
  const dot = vx * wx + vy * wy;
  const magV = Math.hypot(vx, vy) || 1e-6;
  const magW = Math.hypot(wx, wy) || 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / (magV * magW)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Default instrument thresholds (current hardcoded values — identical behavior)
// ---------------------------------------------------------------------------

export const DEFAULT_THRESHOLDS: PostureThresholds = {
  leanAngleRatio: 0.88,
  symmetryToleranceM: 0.012,
  asymmetryDeviationM: 0.008,
  minAsymmetryAlertM: 0.006,
  shrugSideM: 0.012,
  tensionShoulderUpM: 0.005,
  shrugToleranceM: 0.025,
  angleDropForHeadPose: 0.98,
  calibrationMaxAsymmetryM: 0.025,
};

// ---------------------------------------------------------------------------
// Sensitivity helpers (moved from PostureEngine.tsx)
// ---------------------------------------------------------------------------

/** Sensitivity slider display: 0 → 1% shrink, 100 → 25% shrink. */
export const SENSITIVITY_MIN_PCT = 1;
export const SENSITIVITY_MAX_PCT = 25;

/** Sensitivity 0–100 → ratio threshold (trigger when ear-shoulder shrinks below this). */
export function sensitivityToRatioThreshold(sensitivityPercent: number): number {
  const pct = Math.max(0, Math.min(100, sensitivityPercent));
  return 0.99 - (pct / 100) * 0.24; // 1% shrink → 0.99, 25% shrink → 0.75
}

/** Side view: sensitivity → angle ratio (trigger lean when angle < baseline * this). */
export function sensitivityToAngleRatioSide(sensitivityPercent: number): number {
  const pct = Math.max(0, Math.min(100, sensitivityPercent));
  return 0.99 - (pct / 100) * 0.09; // strict (0) → 0.99, loose (100) → 0.90
}
