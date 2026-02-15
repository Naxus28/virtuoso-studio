/**
 * FingerIndependence — measures how independently each finger moves
 * relative to its neighbors.
 *
 * Algorithm:
 *   1. Compute flexion angle at the PIP joint (angle between MCP→PIP and PIP→DIP).
 *      For the thumb, uses the IP joint (index 3) with MCP→IP and IP→TIP.
 *   2. Track each finger's angle in a sliding window (default 60 frames).
 *   3. Independence = normalized per-finger variance.
 *      High variance in one finger while others are stable = high independence.
 *
 * Output: { thumb, index, middle, ring, pinky } — each 0–1.
 */

import type { DexterityMetric, HandFrame, HandLandmark } from "./types";
import { FINGER_JOINTS, FINGER_NAMES, type FingerName } from "./types";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type FingerIndependenceResult = Record<FingerName, number>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function angleBetweenVectors(
  a: HandLandmark,
  b: HandLandmark,
  c: HandLandmark,
): number {
  // Vectors: b→a and b→c. Angle at vertex b.
  const vx = a.x - b.x;
  const vy = a.y - b.y;
  const vz = a.z - b.z;
  const wx = c.x - b.x;
  const wy = c.y - b.y;
  const wz = c.z - b.z;
  const dot = vx * wx + vy * wy + vz * wz;
  const magV = Math.hypot(vx, vy, vz) || 1e-9;
  const magW = Math.hypot(wx, wy, wz) || 1e-9;
  const cos = Math.max(-1, Math.min(1, dot / (magV * magW)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function flexionAngle(landmarks: HandLandmark[], finger: FingerName): number {
  const joints = FINGER_JOINTS[finger];
  // Angle at the PIP joint (index 1 in the 4-joint array).
  // For thumb: angle at IP (joint index 2) — joints are [CMC, MCP, IP, TIP].
  const pivotIdx = finger === "thumb" ? 2 : 1;
  const mcp = landmarks[joints[pivotIdx - 1]];
  const pip = landmarks[joints[pivotIdx]];
  const dip = landmarks[joints[pivotIdx + 1]];
  if (!mcp || !pip || !dip) return 180;
  return angleBetweenVectors(mcp, pip, dip);
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW = 60;
/** Empirical cap — variance above this is treated as max independence. */
const MAX_VARIANCE_DEG2 = 400;

export class FingerIndependence
  implements DexterityMetric<FingerIndependenceResult>
{
  readonly name = "Finger Independence";
  private readonly windowSize: number;
  private buffers: Record<FingerName, number[]>;

  constructor(windowSize: number = DEFAULT_WINDOW) {
    this.windowSize = windowSize;
    this.buffers = this.emptyBuffers();
  }

  update(frame: HandFrame): void {
    if (frame.landmarks.length < 21) return;
    for (const finger of FINGER_NAMES) {
      const angle = flexionAngle(frame.landmarks, finger);
      const buf = this.buffers[finger];
      buf.push(angle);
      if (buf.length > this.windowSize) buf.shift();
    }
  }

  getResult(): FingerIndependenceResult {
    const result = {} as FingerIndependenceResult;
    for (const finger of FINGER_NAMES) {
      const v = variance(this.buffers[finger]);
      result[finger] = Math.min(1, v / MAX_VARIANCE_DEG2);
    }
    return result;
  }

  reset(): void {
    this.buffers = this.emptyBuffers();
  }

  private emptyBuffers(): Record<FingerName, number[]> {
    return {
      thumb: [],
      index: [],
      middle: [],
      ring: [],
      pinky: [],
    };
  }
}
