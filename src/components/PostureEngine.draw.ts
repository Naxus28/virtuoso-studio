import type { Landmark } from "./PostureEngine";

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [11, 23], [12, 24],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [7, 11], [8, 12],
];

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  isSlouch: boolean,
  width: number,
  height: number
): void {
  const color = isSlouch ? "#ef4444" : "#22c55e";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  for (const [i, j] of POSE_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b || (a.visibility !== undefined && a.visibility < 0.5) || (b.visibility !== undefined && b.visibility < 0.5)) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }
  landmarks.forEach((lm) => {
    if (lm.visibility !== undefined && lm.visibility < 0.5) return;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}
