/**
 * Shared types for posture engines.
 * MediaPipe Pose landmark indices: 7/8 = ears, 11/12 = shoulders, 15/16 = wrists, 23/24 = hips.
 */

export type WorldLandmark = { x: number; y: number; z: number };

export type ImageLandmark = { x: number; y: number; z?: number; visibility?: number };

export type Perspective = "Front" | "Side";

export type PostureAlertType = null | "lean" | "tension";

// ---------------------------------------------------------------------------
// Instrument-specific ergonomic threshold profile
// ---------------------------------------------------------------------------

export interface PostureThresholds {
  /** Front view: angle (ear-shoulder-hip) < baseline * this = lean (default 0.88). */
  leanAngleRatio: number;
  /** Front view: baseline asymmetry + this = still symmetric (default 0.012). */
  symmetryToleranceM: number;
  /** Front view: alert when asymmetry exceeds baseline + this (default 0.008). */
  asymmetryDeviationM: number;
  /** Front view: floor — never alert below this (default 0.006). */
  minAsymmetryAlertM: number;
  /** Side view: one-shoulder rise threshold (default 0.012). */
  shrugSideM: number;
  /** Shared: shoulder elevation threshold (default 0.005). */
  tensionShoulderUpM: number;
  /** Shared: one-sided rise + ear stable = shrug (default 0.025). */
  shrugToleranceM: number;
  /** Shared: angle < baseline * this = head position, not tension (default 0.98). */
  angleDropForHeadPose: number;
  /** Calibration: reject if shoulders this uneven (default 0.025). */
  calibrationMaxAsymmetryM: number;
}

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------

/** Baseline for front/symmetry views (shoulder heights, angles, vertical distances). */
export interface FrontBaseline {
  angleLeft: number;
  angleRight: number;
  earYLeft: number;
  earYRight: number;
  shoulderYLeft: number;
  shoulderYRight: number;
  earShoulderVertLeft: number;
  earShoulderVertRight: number;
}

/** Baseline for side/angle views.
 *  Primary detection uses 2D image landmarks (reliable even in side view).
 *  World-coordinate fields kept for Piano wrist-extension filter. */
export interface SideBaseline {
  // --- 2D image landmarks (normalized 0–1) — primary detection signals ---
  /** Horizontal gap |ear.x − shoulder.x| per side (head-forward detection). */
  earShoulderDxLeft: number;
  earShoulderDxRight: number;
  /** Vertical gap shoulder.y − ear.y per side (positive = ear above shoulder). */
  earShoulderDyLeft: number;
  earShoulderDyRight: number;
  /** Shoulder y-position in image (shrug detection). */
  imgShoulderYLeft: number;
  imgShoulderYRight: number;
  /** Ear y-position in image (ear-stability check). */
  imgEarYLeft: number;
  imgEarYRight: number;

  // --- World coordinates (secondary / Piano filter) ---
  distLeft: number;
  distRight: number;
  angleLeft: number;
  angleRight: number;
  shoulderYLeft?: number;
  shoulderYRight?: number;
  earYLeft?: number;
  earYRight?: number;
  earShoulderVertLeft?: number;
  earShoulderVertRight?: number;
  /** Piano filter: wrist-shoulder distance at calibration. */
  wristShoulderDistLeft?: number;
  wristShoulderDistRight?: number;
  /** 2D angle path (image plane). */
  angleLeft2D?: number;
  angleRight2D?: number;
}

export type Baseline = FrontBaseline | SideBaseline;

// ---------------------------------------------------------------------------
// Validate I/O
// ---------------------------------------------------------------------------

export interface ValidateInput {
  landmarks: WorldLandmark[];
  baseline: Baseline;
  imageLandmarks?: ImageLandmark[];
  /** Sensitivity 0-100 numeric (0 = very strict, 100 = very loose). */
  sensitivity?: number;
  /** Optional instrument-specific thresholds (passed through by Instrument). */
  thresholds?: PostureThresholds;
  /** Optional hand frame for dexterity metric updates. */
  handFrames?: import("../dexterity/types").HandFrame[];
}

export interface ValidateResult {
  leanRaw: boolean;
  tensionRaw: boolean;
  isShrug: boolean;
  quality: number;
  feedback: string;
}
