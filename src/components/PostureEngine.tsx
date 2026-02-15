"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle } from "lucide-react";

// MediaPipe Pose landmark indices
const EAR_LEFT = 7;
const EAR_RIGHT = 8;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;

const SMOOTHING_ALPHA = 0.3;
const SLOUCH_THRESHOLD = 0.85; // 15% collapse => current <= baseline * 0.85

// Skeleton connections for drawing (pairs of landmark indices)
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [11, 23], [12, 24],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [7, 11], [8, 12], // ear to shoulder for posture visibility
];

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

function lowPass(
  prev: Landmark | undefined,
  next: Landmark,
  alpha: number
): Landmark {
  if (!prev) return { ...next };
  return {
    x: alpha * next.x + (1 - alpha) * prev.x,
    y: alpha * next.y + (1 - alpha) * prev.y,
    z: next.z,
    visibility: next.visibility,
  };
}

/** Vertical distance (Y difference) ear to shoulder in normalized coords (Y increases downward). */
function verticalDistanceEarShoulder(
  ear: Landmark,
  shoulder: Landmark
): number {
  return Math.abs(ear.y - shoulder.y);
}

export function PostureEngine() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<import("@mediapipe/tasks-vision").PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const videoTimestampRef = useRef<number>(0);
  const smoothedLandmarksRef = useRef<Landmark[]>([]);

  const [isCalibrated, setIsCalibrated] = useState(false);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [isSlouch, setIsSlouch] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baselineRef = useRef<number | null>(null);
  const isCalibratedRef = useRef(false);
  useEffect(() => {
    baselineRef.current = baseline;
    isCalibratedRef.current = isCalibrated;
  }, [baseline, isCalibrated]);

  // Initialize MediaPipe Pose (tasks-vision — avoids Emscripten Module.arguments error)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );
        const wasm = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const pose = await PoseLandmarker.createFromOptions(wasm, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          pose.close();
          return;
        }
        poseRef.current = pose;
        setIsPoseReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load Pose");
      }
    })();
    return () => {
      cancelled = true;
      const p = poseRef.current;
      poseRef.current = null;
      p?.close();
    };
  }, []);

  // isCalibrated and baseline in dependency would cause re-init; we only need pose once.
  // We read baseline/calibration from state in onResults so they're always current.

  const handleCalibrate = useCallback(() => {
    const current = smoothedLandmarksRef.current;
    if (current.length < 13) return;
    const leftD = verticalDistanceEarShoulder(current[EAR_LEFT], current[SHOULDER_LEFT]);
    const rightD = verticalDistanceEarShoulder(current[EAR_RIGHT], current[SHOULDER_RIGHT]);
    const avg = (leftD + rightD) / 2;
    setBaseline(avg);
    setIsCalibrated(true);
    setIsSlouch(false);
  }, []);

  // Process video frames (detectForVideo + smoothing + slouch check)
  useEffect(() => {
    const pose = poseRef.current;
    const webcam = webcamRef.current?.video;
    if (!pose || !webcam || !isPoseReady) return;

    function tick() {
      const p = poseRef.current;
      if (webcam && webcam.readyState === 4 && p && webcam.videoWidth > 0 && webcam.videoHeight > 0) {
        try {
          // VIDEO mode requires strictly monotonically increasing timestamps (ms)
          videoTimestampRef.current += 1;
          const result = p.detectForVideo(webcam, videoTimestampRef.current);
          const raw = result?.landmarks?.[0] ?? [];
          if (raw.length === 0) {
            setLandmarks([]);
          } else {
            const smoothed = raw.map((lm, i) =>
              lowPass(
                smoothedLandmarksRef.current[i],
                {
                  x: lm.x,
                  y: lm.y,
                  z: lm.z,
                  visibility: undefined,
                },
                SMOOTHING_ALPHA
              )
            );
            smoothedLandmarksRef.current = smoothed;
            setLandmarks(smoothed);

            const base = baselineRef.current;
            if (isCalibratedRef.current && base != null) {
              const leftD = verticalDistanceEarShoulder(
                smoothed[EAR_LEFT],
                smoothed[SHOULDER_LEFT]
              );
              const rightD = verticalDistanceEarShoulder(
                smoothed[EAR_RIGHT],
                smoothed[SHOULDER_RIGHT]
              );
              const avg = (leftD + rightD) / 2;
              setIsSlouch(avg <= base * SLOUCH_THRESHOLD);
            }
          }
        } catch {
          // ignore per-frame errors (e.g. timestamp)
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    }
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPoseReady]);

  // Draw skeleton overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video || landmarks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);
    const scaleX = w;
    const scaleY = h;

    const color = isSlouch ? "#ef4444" : "#22c55e";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    for (const [i, j] of POSE_CONNECTIONS) {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b || (a.visibility !== undefined && a.visibility < 0.5) || (b.visibility !== undefined && b.visibility < 0.5)) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * scaleX, a.y * scaleY);
      ctx.lineTo(b.x * scaleX, b.y * scaleY);
      ctx.stroke();
    }
    landmarks.forEach((lm, i) => {
      if (lm.visibility !== undefined && lm.visibility < 0.5) return;
      ctx.beginPath();
      ctx.arc(lm.x * scaleX, lm.y * scaleY, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [landmarks, isSlouch]);

  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: "user",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="relative inline-block rounded-xl overflow-hidden bg-zinc-900 shadow-xl">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          className="block w-full max-w-[640px] mirror"
          mirrored
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />
        <div
          className="absolute bottom-2 left-2 right-2 text-center text-xs text-white/80 bg-black/50 rounded px-2 py-1"
          aria-hidden
        >
          Educational Tool Only — Not a medical device.
        </div>
        <AnimatePresence>
          {isSlouch && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-2 left-2 right-2 flex items-center justify-center gap-2 rounded-lg bg-red-500/90 text-white px-3 py-2 text-sm font-medium"
            >
              <AlertTriangle className="shrink-0" size={18} />
              Tension Alert
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleCalibrate}
          disabled={!isPoseReady || landmarks.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Activity size={18} />
          Calibrate
        </button>
        {isCalibrated && (
          <span className="text-zinc-400 text-sm">
            Baseline set — {isSlouch ? "Slouch detected" : "Good posture"}
          </span>
        )}
      </div>
    </div>
  );
}
