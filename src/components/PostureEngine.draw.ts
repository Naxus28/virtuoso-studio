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

/** Light grid overlay to help user align the camera (level / no tilt). */
export function drawAlignmentGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  const spacing = 0.25;
  for (let f = 0; f <= 1; f += spacing) {
    const x = f * width;
    const y = f * height;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.restore();
}

/** Reference posture overlay: ideal head/shoulders/spine for user to align to. */
export function drawBodyGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const cx = width / 2;
  const headY = height * 0.22;
  const neckY = height * 0.32;
  const shoulderY = height * 0.36;
  const shoulderW = width * 0.2;
  const spineY = height * 0.55;
  ctx.beginPath();
  ctx.arc(cx, headY, width * 0.08, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, headY + width * 0.08);
  ctx.lineTo(cx, neckY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW, shoulderY);
  ctx.lineTo(cx + shoulderW, shoulderY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, neckY);
  ctx.lineTo(cx, spineY);
  ctx.stroke();
  ctx.restore();
}
