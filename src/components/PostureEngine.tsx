"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Square,
  Play,
  BarChart3,
  RotateCcw,
  Trash2,
  Camera,
} from "lucide-react";
import { SessionRecorder } from "@/lib/SessionRecorder";
import type { SessionRecording } from "@/lib/SessionRecorder";
import { saveSession, getSessionById } from "@/lib/sessionLibrary";
import { SessionStats } from "@/components/SessionStats";
import { drawSkeleton } from "./PostureEngine.draw";

// MediaPipe Pose landmark indices
const EAR_LEFT = 7;
const EAR_RIGHT = 8;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;
const HIP_LEFT = 23;
const HIP_RIGHT = 24;

const SMOOTHING_ALPHA = 0.3;
/** Only alert after bad posture persists this long (ms) — 0.5s for rapid response */
const PERSISTENCE_MS = 500;
/** ~30fps → frames needed for persistence */
const PERSISTENCE_FRAMES = Math.max(1, Math.round((PERSISTENCE_MS / 1000) * 30));
/** Lean: angle (ear-shoulder-hip) below baseline * this = head forward */
const LEAN_ANGLE_RATIO = 0.88;
/** Tension: shoulders elevated vs baseline (world Y). Lower = more sensitive to subtle tension. */
const TENSION_SHOULDER_UP_WORLD_M = 0.005; // ~5mm elevation triggers (catch before you feel it)
/** Only treat as shrug (don’t alert) when shoulder rises this much with ear stable — so small elevation still = tension */
const SHRUG_TOLERANCE_WORLD = 0.025; // ~25mm one-sided rise with ear stable = shrug
/** Quality below this = show alert in playback/chart (0–1) */
const QUALITY_ALERT_THRESHOLD = 0.88;
/** Front view: max shoulder height difference (world Y, meters) for symmetry */
const FRONT_SHOULDER_SYMMETRY_TOLERANCE_M = 0.03;

const TENSION_HUM_HZ = 200;
const TENSION_HUM_GAIN_MIN = 0.05;
const TENSION_HUM_GAIN_MAX = 0.3;

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

/** World landmarks use 3D coordinates in meters (from pose_world_landmarks). */
export type WorldLandmark = { x: number; y: number; z: number };

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

function lowPassWorld(
  prev: WorldLandmark | undefined,
  next: WorldLandmark,
  alpha: number
): WorldLandmark {
  if (!prev) return { ...next };
  return {
    x: alpha * next.x + (1 - alpha) * prev.x,
    y: alpha * next.y + (1 - alpha) * prev.y,
    z: alpha * next.z + (1 - alpha) * prev.z,
  };
}

/** 3D distance in meters (world coordinates). */
function dist3(a: WorldLandmark, b: WorldLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Angle in degrees at shoulder between vectors shoulder→ear and shoulder→hip (3D). Smaller = head forward (lean). */
function angleEarShoulderHipWorld(
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

/** Front view: baseline from world landmarks (3D meters). */
export type PostureBaseline = {
  angleLeft: number;
  angleRight: number;
  earYLeft: number;
  earYRight: number;
  shoulderYLeft: number;
  shoulderYRight: number;
  /** Vertical ear–shoulder distance (world Y) for tension-from-compression. */
  earShoulderVertLeft: number;
  earShoulderVertRight: number;
};

/** Sensitivity 0–100: 0 = 1% shrink (very strict), 100 = 25% shrink (very loose). */
export const SENSITIVITY_MIN_PCT = 1;
export const SENSITIVITY_MAX_PCT = 25;

/** Side view: baseline ear–shoulder 3D distances (meters). */
export type SideViewBaseline = {
  distLeft: number;
  distRight: number;
};

export type PostureAlertType = null | "lean" | "tension";

export type ViewMode = "front" | "side";


/** Sensitivity 0–100 → ratio threshold (trigger when ear-shoulder shrinks below this). 0 = 1%, 100 = 25%. */
function sensitivityToRatioThreshold(sensitivityPercent: number): number {
  const pct = Math.max(0, Math.min(100, sensitivityPercent));
  return 0.99 - (pct / 100) * 0.24; // 1% shrink → 0.99, 25% shrink → 0.75
}

/** Front view: angle + shoulder symmetry + vertical compression (world coords). */
function evaluatePostureFront(
  w: WorldLandmark[],
  baseline: PostureBaseline,
  sensitivityPercent: number
): { leanRaw: boolean; tensionRaw: boolean; isShrug: boolean; quality: number } {
  if (w.length < 25) return { leanRaw: false, tensionRaw: false, isShrug: false, quality: 1 };
  const angleL = angleEarShoulderHipWorld(w[EAR_LEFT], w[SHOULDER_LEFT], w[HIP_LEFT]);
  const angleR = angleEarShoulderHipWorld(w[EAR_RIGHT], w[SHOULDER_RIGHT], w[HIP_RIGHT]);
  const avgAngle = (angleL + angleR) / 2;
  const baselineAngle = (baseline.angleLeft + baseline.angleRight) / 2;
  const leanRaw = avgAngle < baselineAngle * LEAN_ANGLE_RATIO;

  const earYLeft = w[EAR_LEFT].y;
  const earYRight = w[EAR_RIGHT].y;
  const shoulderYLeft = w[SHOULDER_LEFT].y;
  const shoulderYRight = w[SHOULDER_RIGHT].y;
  const shoulderUpLeft = baseline.shoulderYLeft - shoulderYLeft > SHRUG_TOLERANCE_WORLD;
  const shoulderUpRight = baseline.shoulderYRight - shoulderYRight > SHRUG_TOLERANCE_WORLD;
  const earStableLeft = earYLeft <= baseline.earYLeft + SHRUG_TOLERANCE_WORLD;
  const earStableRight = earYRight <= baseline.earYRight + SHRUG_TOLERANCE_WORLD;
  const isShrug = (shoulderUpLeft && earStableLeft) || (shoulderUpRight && earStableRight);

  const avgShoulderY = (shoulderYLeft + shoulderYRight) / 2;
  const baselineShoulderY = (baseline.shoulderYLeft + baseline.shoulderYRight) / 2;
  const avgEarY = (earYLeft + earYRight) / 2;
  const baselineEarY = (baseline.earYLeft + baseline.earYRight) / 2;
  const shouldersHigh = baselineShoulderY - avgShoulderY > TENSION_SHOULDER_UP_WORLD_M;
  const earNotDropped = avgEarY <= baselineEarY + SHRUG_TOLERANCE_WORLD;
  const shoulderSymmetry = Math.abs(shoulderYLeft - shoulderYRight) <= FRONT_SHOULDER_SYMMETRY_TOLERANCE_M;
  const tensionFromElevation = shouldersHigh && earNotDropped && !leanRaw && shoulderSymmetry;

  const vertLeft = Math.abs(w[EAR_LEFT].y - w[SHOULDER_LEFT].y);
  const vertRight = Math.abs(w[EAR_RIGHT].y - w[SHOULDER_RIGHT].y);
  const avgVert = (vertLeft + vertRight) / 2;
  const baselineVert = (baseline.earShoulderVertLeft + baseline.earShoulderVertRight) / 2;
  const vertRatio = baselineVert > 1e-6 ? avgVert / baselineVert : 1;
  const ratioThreshold = sensitivityToRatioThreshold(sensitivityPercent);
  const tensionFromVertical = vertRatio < ratioThreshold && !isShrug;

  const tensionRaw = tensionFromElevation || tensionFromVertical;

  const quality = Math.min(1, avgAngle / baselineAngle);
  return { leanRaw, tensionRaw, isShrug, quality };
}

/** Side view: ear–shoulder distance (7 to 11, 8 to 12) in world; alert when collapse. */
function evaluatePostureSide(
  w: WorldLandmark[],
  baseline: SideViewBaseline,
  ratioThreshold: number
): { leanRaw: boolean; tensionRaw: boolean; isShrug: boolean; quality: number } {
  if (w.length < 25) return { leanRaw: false, tensionRaw: false, isShrug: false, quality: 1 };
  const distLeft = dist3(w[EAR_LEFT], w[SHOULDER_LEFT]);
  const distRight = dist3(w[EAR_RIGHT], w[SHOULDER_RIGHT]);
  const avgDist = (distLeft + distRight) / 2;
  const baselineDist = (baseline.distLeft + baseline.distRight) / 2;
  const ratio = baselineDist > 1e-6 ? avgDist / baselineDist : 1;
  const leanRaw = ratio < ratioThreshold;
  const quality = Math.min(1, ratio);
  return { leanRaw, tensionRaw: false, isShrug: false, quality };
}

type PostureEngineProps = {
  /** When set, load this session from the library and start replay. */
  replayId?: string | null;
};

export function PostureEngine({ replayId }: PostureEngineProps = {}) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<import("@mediapipe/tasks-vision").PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const playbackRef = useRef<number>(0);
  const videoTimestampRef = useRef<number>(0);
  const smoothedLandmarksRef = useRef<Landmark[]>([]);
  const smoothedWorldLandmarksRef = useRef<WorldLandmark[]>([]);
  const sessionRecorderRef = useRef<SessionRecorder>(new SessionRecorder());
  const isRecordingRef = useRef(false);
  const qualityRef = useRef(1);
  const videoSizeRef = useRef({ width: 640, height: 480 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  const [viewMode, setViewMode] = useState<ViewMode>("front");
  const [sensitivity, setSensitivity] = useState(35); // 0–100; 35 ≈ 12% shrink (default)
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [baseline, setBaseline] = useState<PostureBaseline | null>(null);
  const [sideViewBaseline, setSideViewBaseline] = useState<SideViewBaseline | null>(null);
  const [alertType, setAlertType] = useState<PostureAlertType>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<SessionRecording | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [playbackLandmarks, setPlaybackLandmarks] = useState<Landmark[]>([]);
  const [playbackSlouch, setPlaybackSlouch] = useState(false);
  /** When replaying from library, show session name and view mode in the overlay */
  const [replaySessionInfo, setReplaySessionInfo] = useState<{ name: string; viewMode: ViewMode } | null>(null);

  const baselineRef = useRef<PostureBaseline | null>(null);
  const sideViewBaselineRef = useRef<SideViewBaseline | null>(null);
  const isCalibratedRef = useRef(false);
  const viewModeRef = useRef<ViewMode>("front");
  const sensitivityRef = useRef(35);
  const leanFramesRef = useRef(0);
  const tensionFramesRef = useRef(0);
  useEffect(() => {
    baselineRef.current = baseline;
    sideViewBaselineRef.current = sideViewBaseline;
    isCalibratedRef.current = isCalibrated;
    viewModeRef.current = viewMode;
    sensitivityRef.current = sensitivity;
  }, [baseline, sideViewBaseline, isCalibrated, viewMode, sensitivity]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Load session from library when replayId is provided (e.g. from /studio?replay=id)
  useEffect(() => {
    if (!replayId || typeof window === "undefined") return;
    const session = getSessionById(replayId);
    if (session?.recording) {
      setSessionRecording(session.recording);
      setIsPlayback(true);
      setReplaySessionInfo({ name: session.name, viewMode: session.viewMode ?? (session.view === "side" ? "side" : "front") });
      playbackStartTimeRef.current = performance.now();
    }
  }, [replayId]);

  // MediaPipe/TFLite stderr -> console.log
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args[0]?.toString?.() ?? "";
      if (
        msg.includes("INFO:") ||
        msg.includes("TensorFlow Lite") ||
        msg.includes("XNNPACK")
      ) {
        console.log("[MediaPipe]", ...args);
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  // Tension Hum: 200Hz sine, volume scales with slouch severity
  useEffect(() => {
    if (typeof window === "undefined" || !window.AudioContext) return;
    const ctx = new window.AudioContext();
    audioContextRef.current = ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = TENSION_HUM_HZ;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gainNodeRef.current = gain;
    osc.start(0);
    return () => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    };
  }, []);

  useEffect(() => {
    const gain = gainNodeRef.current;
    const ctx = audioContextRef.current;
    if (!gain || !ctx) return;
    const isAlert = alertType != null;
    if (isAlert) {
      const q = qualityRef.current;
      const severity = 1 - Math.max(0, q);
      gain.gain.setTargetAtTime(
        TENSION_HUM_GAIN_MIN + severity * (TENSION_HUM_GAIN_MAX - TENSION_HUM_GAIN_MIN),
        ctx.currentTime,
        0.05
      );
      if (ctx.state === "suspended") ctx.resume();
    } else {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
  }, [alertType]);

  // Initialize MediaPipe Pose
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

  const handleCalibrate = useCallback(() => {
    const world = smoothedWorldLandmarksRef.current;
    if (world.length < 25) return;
    const mode = viewModeRef.current;
    if (mode === "front") {
      const angleLeft = angleEarShoulderHipWorld(
        world[EAR_LEFT],
        world[SHOULDER_LEFT],
        world[HIP_LEFT]
      );
      const angleRight = angleEarShoulderHipWorld(
        world[EAR_RIGHT],
        world[SHOULDER_RIGHT],
        world[HIP_RIGHT]
      );
      const bl: PostureBaseline = {
        angleLeft,
        angleRight,
        earYLeft: world[EAR_LEFT].y,
        earYRight: world[EAR_RIGHT].y,
        shoulderYLeft: world[SHOULDER_LEFT].y,
        shoulderYRight: world[SHOULDER_RIGHT].y,
        earShoulderVertLeft: Math.abs(world[EAR_LEFT].y - world[SHOULDER_LEFT].y),
        earShoulderVertRight: Math.abs(world[EAR_RIGHT].y - world[SHOULDER_RIGHT].y),
      };
      setBaseline(bl);
      setSideViewBaseline(null);
    } else {
      const distLeft = dist3(world[EAR_LEFT], world[SHOULDER_LEFT]);
      const distRight = dist3(world[EAR_RIGHT], world[SHOULDER_RIGHT]);
      setSideViewBaseline({ distLeft, distRight });
      setBaseline(null);
    }
    setIsCalibrated(true);
    setAlertType(null);
    leanFramesRef.current = 0;
    tensionFramesRef.current = 0;
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "front" ? "side" : "front"));
    setBaseline(null);
    setSideViewBaseline(null);
    setIsCalibrated(false);
    setAlertType(null);
    leanFramesRef.current = 0;
    tensionFramesRef.current = 0;
  }, []);

  const handleStartSession = useCallback(() => {
    const w = videoSizeRef.current.width;
    const h = videoSizeRef.current.height;
    sessionRecorderRef.current.start(w, h);
    setIsRecording(true);
    setSessionRecording(null);
    setIsPlayback(false);
    audioContextRef.current?.resume();
  }, []);

  const handleStopSession = useCallback(() => {
    const rec = sessionRecorderRef.current.stop();
    setIsRecording(false);
    setSessionRecording(rec);
    setIsPlayback(false);

    const name = typeof window !== "undefined" ? window.prompt("Name this session (optional):") ?? "" : "";
    if (typeof window !== "undefined") {
      saveSession({
        name: name.trim() || "Unnamed Session",
        viewMode: viewModeRef.current,
        recording: rec,
      });
    }
  }, []);

  const handleReviewSession = useCallback(() => {
    if (!sessionRecording || sessionRecording.frames.length === 0) return;
    setIsPlayback(true);
    playbackStartTimeRef.current = performance.now();
  }, [sessionRecording]);

  const handleBackToLive = useCallback(() => {
    setIsPlayback(false);
  }, []);

  const handleStartNewSession = useCallback(() => {
    setSessionRecording(null);
    setIsPlayback(false);
    setReplaySessionInfo(null);
  }, []);

  const handleDiscardAndRestart = useCallback(() => {
    sessionRecorderRef.current.stop();
    setSessionRecording(null);
    setIsRecording(false);
    setIsPlayback(false);
  }, []);

  // Process video frames (only when not in playback)
  useEffect(() => {
    if (isPlayback) return;
    const pose = poseRef.current;
    const webcam = webcamRef.current?.video;
    if (!pose || !webcam || !isPoseReady) return;

    function tick() {
      const p = poseRef.current;
      if (webcam && webcam.readyState === 4 && p && webcam.videoWidth > 0 && webcam.videoHeight > 0) {
        videoSizeRef.current = { width: webcam.videoWidth, height: webcam.videoHeight };
        try {
          videoTimestampRef.current += 1;
          const result = p.detectForVideo(webcam, videoTimestampRef.current);
          const raw = result?.landmarks?.[0] ?? [];
          const rawWorld = result?.worldLandmarks?.[0] ?? [];
          if (raw.length === 0) {
            setLandmarks([]);
            leanFramesRef.current = 0;
            tensionFramesRef.current = 0;
            setAlertType(null);
          } else {
            const smoothed = raw.map((lm, i) =>
              lowPass(
                smoothedLandmarksRef.current[i],
                { x: lm.x, y: lm.y, z: lm.z, visibility: undefined },
                SMOOTHING_ALPHA
              )
            );
            smoothedLandmarksRef.current = smoothed;
            setLandmarks(smoothed);

            const worldSmoothed: WorldLandmark[] = rawWorld.map((lm, i) =>
              lowPassWorld(
                smoothedWorldLandmarksRef.current[i],
                { x: lm.x, y: lm.y, z: lm.z },
                SMOOTHING_ALPHA
              )
            );
            smoothedWorldLandmarksRef.current = worldSmoothed;

            const mode = viewModeRef.current;
            const base = baselineRef.current;
            const sideBase = sideViewBaselineRef.current;
            let quality = 1;
            if (isCalibratedRef.current && mode === "front" && base != null) {
              const { leanRaw, tensionRaw, isShrug, quality: q } = evaluatePostureFront(
                worldSmoothed,
                base,
                sensitivityRef.current
              );
              quality = q;
              qualityRef.current = quality;

              const leanCounts = leanRaw && !isShrug;
              const tensionCounts = tensionRaw;
              if (leanCounts) {
                leanFramesRef.current += 1;
                tensionFramesRef.current = 0;
              } else if (tensionCounts) {
                tensionFramesRef.current += 1;
                leanFramesRef.current = 0;
              } else {
                leanFramesRef.current = 0;
                tensionFramesRef.current = 0;
              }

              const leanPersisted = leanFramesRef.current >= PERSISTENCE_FRAMES;
              const tensionPersisted = tensionFramesRef.current >= PERSISTENCE_FRAMES;
              setAlertType((prev) => {
                if (leanPersisted) return "lean";
                if (tensionPersisted) return "tension";
                return null;
              });
            } else if (isCalibratedRef.current && mode === "side" && sideBase != null) {
              const ratioThreshold = sensitivityToRatioThreshold(sensitivityRef.current);
              const { leanRaw, quality: q } = evaluatePostureSide(
                worldSmoothed,
                sideBase,
                ratioThreshold
              );
              quality = q;
              qualityRef.current = quality;

              if (leanRaw) {
                leanFramesRef.current += 1;
                tensionFramesRef.current = 0;
              } else {
                leanFramesRef.current = 0;
                tensionFramesRef.current = 0;
              }
              const leanPersisted = leanFramesRef.current >= PERSISTENCE_FRAMES;
              setAlertType(leanPersisted ? "lean" : null);
            } else {
              qualityRef.current = 1;
              leanFramesRef.current = 0;
              tensionFramesRef.current = 0;
              setAlertType(null);
            }

            if (isRecordingRef.current) {
              sessionRecorderRef.current.addFrame(
                Date.now(),
                smoothed,
                quality
              );
            }
          }
        } catch {
          // ignore
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    }
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPoseReady, isPlayback]);

  // Playback loop: advance frame index and set playbackLandmarks/playbackSlouch
  useEffect(() => {
    if (!isPlayback || !sessionRecording || sessionRecording.frames.length === 0) return;
    const frames = sessionRecording.frames;
    const fps = 30;
    const frameMs = 1000 / fps;

    function tick() {
      const elapsed = performance.now() - playbackStartTimeRef.current;
      const frameIndex = Math.floor(elapsed / frameMs) % frames.length;
      const frame = frames[frameIndex];
      if (frame) {
        setPlaybackLandmarks(frame.landmarks);
        setPlaybackSlouch(frame.quality < QUALITY_ALERT_THRESHOLD);
      }
      playbackRef.current = requestAnimationFrame(tick);
    }
    playbackRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(playbackRef.current);
  }, [isPlayback, sessionRecording]);

  // Draw skeleton: live or playback
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isPlayback && sessionRecording) {
      const w = sessionRecording.width;
      const h = sessionRecording.height;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (playbackLandmarks.length > 0) {
        drawSkeleton(ctx, playbackLandmarks, playbackSlouch, w, h);
      }
      return;
    }

    const video = webcamRef.current?.video;
    if (!video || landmarks.length === 0) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    drawSkeleton(ctx, landmarks, alertType != null, w, h);
  }, [landmarks, alertType, isPlayback, sessionRecording, playbackLandmarks, playbackSlouch]);

  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: "user",
  };

  const showLiveView = !isPlayback;
  const hasRecording = sessionRecording && sessionRecording.frames.length > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="relative inline-block rounded-xl overflow-hidden bg-zinc-900 shadow-xl w-full max-w-[640px]">
        {showLiveView ? (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              className="block w-full mirror"
              mirrored
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />
          </>
        ) : (
          <div
            className="w-full aspect-video bg-zinc-900 flex items-center justify-center"
            style={{ aspectRatio: `${sessionRecording?.width ?? 640} / ${sessionRecording?.height ?? 480}` }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2 text-center text-xs text-white/80 bg-black/50 rounded px-2 py-1">
          Educational Tool Only — Not a medical device.
        </div>
        {isPlayback && (
          <div className="absolute top-2 left-2 right-2 text-center text-xs text-amber-200/90 bg-black/50 rounded px-2 py-1">
            {replaySessionInfo
              ? `Reviewing: ${replaySessionInfo.name} · ${replaySessionInfo.viewMode === "front" ? "Front" : "Side"} View`
              : "Reviewing session — replay"}
          </div>
        )}
        <AnimatePresence>
          {(showLiveView ? alertType : playbackSlouch) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-10 left-2 right-2 flex items-center justify-center gap-2 rounded-lg bg-red-500/90 text-white px-3 py-2 text-sm font-medium"
            >
              <AlertTriangle className="shrink-0" size={18} />
              {showLiveView && alertType === "tension"
                ? "Tension Detected"
                : showLiveView && alertType === "lean"
                  ? "Lean Detected"
                  : "Tension Alert"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-[640px] space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 border border-zinc-600"
            aria-live="polite"
          >
            View: {viewMode === "front" ? "Front" : "Side"}
          </span>
          <button
            type="button"
            onClick={handleToggleViewMode}
            disabled={isRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50 disabled:pointer-events-none"
            title={viewMode === "front" ? "Side view focuses on ear–shoulder distance" : "Front view uses angle + shoulder symmetry"}
          >
            <Camera size={18} />
            {viewMode === "front" ? "Switch to Side View" : "Switch to Front View"}
          </button>
          <button
            type="button"
            onClick={handleCalibrate}
            disabled={!isPoseReady || landmarks.length === 0 || isRecording}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Activity size={18} />
            Calibrate
          </button>

        <div className="w-full flex flex-col gap-1 basis-full">
          <label htmlFor="sensitivity" className="text-sm text-zinc-400 flex justify-between">
            <span>Sensitivity</span>
            <span>
              {Math.round(SENSITIVITY_MIN_PCT + (sensitivity / 100) * (SENSITIVITY_MAX_PCT - SENSITIVITY_MIN_PCT))}% shrink
            </span>
          </label>
          <input
            id="sensitivity"
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none bg-zinc-700 accent-emerald-500"
            aria-label="Sensitivity: 5% very strict to 25% very loose"
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Very Strict (5%)</span>
            <span>Very Loose (25%)</span>
          </div>
        </div>

        {!isRecording && (
          <button
            type="button"
            onClick={handleStartSession}
            disabled={!isPoseReady || !isCalibrated}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play size={18} />
            {sessionRecording ? "Continue Session" : "Start Session"}
          </button>
        )}
        {isRecording && (
          <>
            <button
              type="button"
              onClick={handleStopSession}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              <Square size={18} />
              Stop Session
            </button>
            <button
              type="button"
              onClick={handleDiscardAndRestart}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500"
            >
              <Trash2 size={18} />
              Discard & Restart
            </button>
          </>
        )}
        {hasRecording && !isPlayback && (
          <button
            type="button"
            onClick={handleReviewSession}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <RotateCcw size={18} />
            Review Session
          </button>
        )}
        {isPlayback && (
          <>
            <button
              type="button"
              onClick={handleBackToLive}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500"
            >
              Back to Live
            </button>
            <button
              type="button"
              onClick={handleStartNewSession}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Play size={18} />
              Start New Session
            </button>
          </>
        )}

        {isCalibrated && showLiveView && (
          <span className="text-zinc-400 text-sm">
            {viewMode === "side"
              ? alertType === "lean"
                ? "Lean detected"
                : "Good posture"
              : alertType === "tension"
                ? "Tension detected"
                : alertType === "lean"
                  ? "Lean detected"
                  : "Good posture"}
          </span>
        )}
        </div>
      </div>

      {sessionRecording && !isPlayback && (
        <div className="w-full flex flex-col items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <BarChart3 size={18} />
            Session Stats
          </h3>
          <SessionStats recording={sessionRecording} />
        </div>
      )}
    </div>
  );
}
