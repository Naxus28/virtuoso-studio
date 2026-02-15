import type { WorldLandmark } from "./types";
import type { ImageLandmark } from "./types";

export const EAR_LEFT = 7;
export const EAR_RIGHT = 8;
export const SHOULDER_LEFT = 11;
export const SHOULDER_RIGHT = 12;
export const WRIST_LEFT = 15;
export const WRIST_RIGHT = 16;
export const HIP_LEFT = 23;
export const HIP_RIGHT = 24;

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
