/**
 * Shared types for the dexterity analysis subsystem.
 *
 * MediaPipe Hands landmark indices (21 per hand):
 *   0        = Wrist
 *   1–4      = Thumb  (CMC, MCP, IP, TIP)
 *   5–8      = Index  (MCP, PIP, DIP, TIP)
 *   9–12     = Middle (MCP, PIP, DIP, TIP)
 *   13–16    = Ring   (MCP, PIP, DIP, TIP)
 *   17–20    = Pinky  (MCP, PIP, DIP, TIP)
 */

// ---------------------------------------------------------------------------
// Landmark indices
// ---------------------------------------------------------------------------

/** Fingertip landmark indices (TIP joints). */
export const THUMB_TIP = 4;
export const INDEX_TIP = 8;
export const MIDDLE_TIP = 12;
export const RING_TIP = 16;
export const PINKY_TIP = 20;

/** Per-finger joint indices: [MCP, PIP, DIP, TIP]. Thumb uses CMC/MCP/IP/TIP. */
export const FINGER_JOINTS = {
  thumb:  [1, 2, 3, 4],
  index:  [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring:   [13, 14, 15, 16],
  pinky:  [17, 18, 19, 20],
} as const;

export type FingerName = keyof typeof FINGER_JOINTS;
export const FINGER_NAMES: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandFrame {
  landmarks: HandLandmark[];
  handedness: "left" | "right";
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Metric interface
// ---------------------------------------------------------------------------

/**
 * A standalone, composable dexterity metric.
 *
 * Each metric receives hand frames via `update()`, accumulates state internally,
 * and exposes results via `getResult()`. Metrics are observational — they never
 * affect posture validation.
 */
export interface DexterityMetric<T = unknown> {
  readonly name: string;
  update(frame: HandFrame): void;
  getResult(): T;
  reset(): void;
}
