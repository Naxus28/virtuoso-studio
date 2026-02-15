/**
 * Shared types for posture engines.
 * MediaPipe Pose landmark indices: 7/8 = ears, 11/12 = shoulders, 15/16 = wrists, 23/24 = hips.
 */

export type WorldLandmark = { x: number; y: number; z: number };

export type ImageLandmark = { x: number; y: number; z?: number; visibility?: number };

export type Perspective = "Front" | "Side";

/** Baseline for front/symmetry views (shoulder heights, etc.) */
export interface FrontBaseline {
  shoulderYLeft: number;
  shoulderYRight: number;
  earYLeft?: number;
  earYRight?: number;
}

/** Baseline for side/angle views (ear-shoulder-hip angles). */
export interface SideBaseline {
  angleLeft: number;
  angleRight: number;
  angleLeft2D?: number;
  angleRight2D?: number;
  wristShoulderDistLeft?: number;
  wristShoulderDistRight?: number;
}

export type Baseline = FrontBaseline | SideBaseline;

export interface ValidateInput {
  landmarks: WorldLandmark[];
  baseline: Baseline;
  imageLandmarks?: ImageLandmark[];
}

export interface ValidateResult {
  isTense: boolean;
  feedback: string;
}
