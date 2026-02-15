"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Square,
  Play,
  Pause,
  BarChart3,
  RotateCcw,
  Trash2,
  Camera,
  Save,
  Grid3X3,
  User,
  CheckCircle,
} from "lucide-react";
import { SessionRecorder } from "@/lib/SessionRecorder";
import type { SessionRecording } from "@/lib/SessionRecorder";
import { saveSession, getSessionById, getStoredSessions } from "@/lib/sessionLibrary";
import type { SessionRecording } from "@/lib/SessionRecorder";
import { SessionStats } from "@/components/SessionStats";
import { drawSkeleton, drawAlignmentGrid, drawBodyGuide } from "./PostureEngine.draw";

const PostureReview3D = dynamic(
  () => import("@/components/PostureReview3D").then((m) => m.PostureReview3D),
  { ssr: false }
);

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
/** Lean: angle (ear-shoulder-hip) below baseline * this = head forward (front view) */
const LEAN_ANGLE_RATIO = 0.88;
/** Side view: one shoulder visible — use lower threshold (12mm) so single-shoulder shrug is detected. */
const SHRUG_SIDE_M = 0.012;
/** Tension: shoulders elevated vs baseline (world Y). Lower = more sensitive to subtle tension. */
const TENSION_SHOULDER_UP_WORLD_M = 0.005; // ~5mm elevation triggers (catch before you feel it)
/** Only treat as shrug (don’t alert) when shoulder rises this much with ear stable — so small elevation still = tension */
const SHRUG_TOLERANCE_WORLD = 0.025; // ~25mm one-sided rise with ear stable = shrug
/** When vertical ear–shoulder shrinks, if angle (ear-shoulder-hip) also dropped = head tilt/lean, not tension */
const ANGLE_DROP_FOR_HEAD_POSE = 0.98; // angle < baseline*this → head position (chin up); only unchanged angle = shoulder tension
/** Quality below this = show alert in playback/chart (0–1) */
const QUALITY_ALERT_THRESHOLD = 0.88;
/** Front view: symmetry = within baseline asymmetry + this (m). Personalized. */
const SYMMETRY_TOLERANCE_ABOVE_BASELINE_M = 0.012;
/** Alert when current asymmetry exceeds baseline by at least this (m). Personalized. */
const ASYMMETRY_DEVIATION_ABOVE_BASELINE_M = 0.008;
/** Minimum asymmetry (m) to ever trigger; avoids noise when baseline is near zero. */
const MIN_ASYMMETRY_ALERT_M = 0.006;
/** Map shoulder asymmetry (m) to chart severity for tension. Asymmetry >= this = worst (0.5). */
const TENSION_SEVERITY_MAX_ASYMMETRY_M = 0.06;
/** Reject calibration if shoulders are this uneven (m); avoids locking in a tense baseline. */
const CALIBRATION_MAX_ASYMMETRY_M = 0.025;

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

/** Side view: baseline distances, angles, and shoulder/ear for shrug vs lean. */
export type SideViewBaseline = {
  distLeft: number;
  distRight: number;
  angleLeft: number;
  angleRight: number;
  /** For shrug/tension: shoulder and ear Y (world); optional for legacy. */
  shoulderYLeft?: number;
  shoulderYRight?: number;
  earYLeft?: number;
  earYRight?: number;
  earShoulderVertLeft?: number;
  earShoulderVertRight?: number;
};

export type PostureAlertType = null | "lean" | "tension";

export type ViewMode = "front" | "side";


/** Sensitivity 0–100 → ratio threshold (trigger when ear-shoulder shrinks below this). 0 = 1%, 100 = 25%. */
function sensitivityToRatioThreshold(sensitivityPercent: number): number {
  const pct = Math.max(0, Math.min(100, sensitivityPercent));
  return 0.99 - (pct / 100) * 0.24; // 1% shrink → 0.99, 25% shrink → 0.75
}

/** Side view: sensitivity → angle ratio (trigger lean when angle < baseline * this). 0 = 1% drop, 100 = 10% drop. */
function sensitivityToAngleRatioSide(sensitivityPercent: number): number {
  const pct = Math.max(0, Math.min(100, sensitivityPercent));
  return 0.99 - (pct / 100) * 0.09; // strict (0) → 0.99, loose (100) → 0.90
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

  // Personalized from calibration: baseline asymmetry (relaxed pose) + tolerance
  const baselineAsymmetry = Math.abs(baseline.shoulderYLeft - baseline.shoulderYRight);
  const shoulderAsymmetry = Math.abs(shoulderYLeft - shoulderYRight);
  const shoulderSymmetry =
    shoulderAsymmetry <= baselineAsymmetry + SYMMETRY_TOLERANCE_ABOVE_BASELINE_M;

  const vertLeft = Math.abs(w[EAR_LEFT].y - w[SHOULDER_LEFT].y);
  const vertRight = Math.abs(w[EAR_RIGHT].y - w[SHOULDER_RIGHT].y);
  const avgVert = (vertLeft + vertRight) / 2;
  const baselineVert = (baseline.earShoulderVertLeft + baseline.earShoulderVertRight) / 2;
  const vertRatio = baselineVert > 1e-6 ? avgVert / baselineVert : 1;
  const ratioThreshold = sensitivityToRatioThreshold(sensitivityPercent);
  // Angle drops when head tilts down or forward; if angle dropped, it's head pose (lean), not shoulder tension
  const angleDropped = avgAngle < baselineAngle * ANGLE_DROP_FOR_HEAD_POSE;
  const verticalShrink = vertRatio < ratioThreshold && !isShrug;

  // Only show "tension" when vertical shrink AND angle did NOT drop (true shoulder hunch, not head-down)
  const tensionFromElevation =
    shouldersHigh && earNotDropped && !leanRaw && shoulderSymmetry && !angleDropped;
  const tensionFromVertical = verticalShrink && !angleDropped;

  // Personalized: tension when current asymmetry exceeds relaxed baseline by at least 8mm (or 6mm floor)
  const personalizedAsymmetryThreshold = Math.max(
    baselineAsymmetry + ASYMMETRY_DEVIATION_ABOVE_BASELINE_M,
    MIN_ASYMMETRY_ALERT_M
  );
  const tensionFromAsymmetry = shoulderAsymmetry > personalizedAsymmetryThreshold;

  // Vertical shrink + angle dropped = head tilt/forward → show lean (chin up), not shoulder message
  const headDownLean = verticalShrink && angleDropped;

  const tensionRaw =
    tensionFromElevation || tensionFromVertical || tensionFromAsymmetry;
  const leanRawResolved = leanRaw || headDownLean;

  const quality = Math.min(1, avgAngle / baselineAngle);
  return { leanRaw: leanRawResolved, tensionRaw, isShrug, quality };
}

/** Side view: lean = head forward (angle drop, threshold from sensitivity). Tension = one-shoulder shrug or ear-shoulder shrink without angle drop.
 *  Uses only the "visible" side angle (the side facing the camera) so head rotation doesn't cancel the alert — when you turn your head,
 *  the occluded side's angle is unreliable and averaging both sides was turning the alert off. */
function evaluatePostureSide(
  w: WorldLandmark[],
  baseline: SideViewBaseline,
  sensitivityPercent: number
): { leanRaw: boolean; tensionRaw: boolean; isShrug: boolean; quality: number } {
  if (w.length < 25) return { leanRaw: false, tensionRaw: false, isShrug: false, quality: 1 };
  const ratioThreshold = sensitivityToRatioThreshold(sensitivityPercent);
  const angleRatioSide = sensitivityToAngleRatioSide(sensitivityPercent);

  const distLeft = dist3(w[EAR_LEFT], w[SHOULDER_LEFT]);
  const distRight = dist3(w[EAR_RIGHT], w[SHOULDER_RIGHT]);
  const avgDist = (distLeft + distRight) / 2;
  const baselineDist = (baseline.distLeft + baseline.distRight) / 2;
  const ratio = baselineDist > 1e-6 ? avgDist / baselineDist : 1;
  const distanceShrink = ratio < ratioThreshold;

  const angleLeft = angleEarShoulderHipWorld(w[EAR_LEFT], w[SHOULDER_LEFT], w[HIP_LEFT]);
  const angleRight = angleEarShoulderHipWorld(w[EAR_RIGHT], w[SHOULDER_RIGHT], w[HIP_RIGHT]);
  // In side view only one side is visible; the other is occluded when the head is turned. Use the side with larger ear-shoulder distance (facing camera).
  const useLeftAngle = distLeft >= distRight;
  const currentAngle = useLeftAngle ? angleLeft : angleRight;
  const baselineAngle =
    baseline.angleLeft != null && baseline.angleRight != null
      ? (useLeftAngle ? baseline.angleLeft : baseline.angleRight)
      : 0;
  // User-controlled: strict (0) = 1% angle drop = lean, loose (100) = 10% drop
  const angleDropped =
    baselineAngle > 0 && currentAngle < baselineAngle * angleRatioSide;

  // Shrug/tension: in side view only one shoulder is visible — use lower threshold (12mm) so one-shoulder shrug is captured
  const hasShoulderBaseline =
    baseline.shoulderYLeft != null &&
    baseline.shoulderYRight != null &&
    baseline.earYLeft != null &&
    baseline.earYRight != null;
  let tensionRaw = false;
  let isShrug = false;
  if (hasShoulderBaseline) {
    const shoulderYLeft = w[SHOULDER_LEFT].y;
    const shoulderYRight = w[SHOULDER_RIGHT].y;
    const earYLeft = w[EAR_LEFT].y;
    const earYRight = w[EAR_RIGHT].y;
    const shoulderUpLeft =
      baseline.shoulderYLeft! - shoulderYLeft > SHRUG_SIDE_M;
    const shoulderUpRight =
      baseline.shoulderYRight! - shoulderYRight > SHRUG_SIDE_M;
    const earStableLeft = earYLeft <= baseline.earYLeft! + SHRUG_SIDE_M;
    const earStableRight =
      earYRight <= baseline.earYRight! + SHRUG_SIDE_M;
    isShrug = (shoulderUpLeft && earStableLeft) || (shoulderUpRight && earStableRight);
    const avgShoulderY = (shoulderYLeft + shoulderYRight) / 2;
    const baselineShoulderY =
      (baseline.shoulderYLeft! + baseline.shoulderYRight!) / 2;
    const avgEarY = (earYLeft + earYRight) / 2;
    const baselineEarY = (baseline.earYLeft! + baseline.earYRight!) / 2;
    const shouldersHigh =
      baselineShoulderY - avgShoulderY > TENSION_SHOULDER_UP_WORLD_M;
    const earNotDropped =
      avgEarY <= baselineEarY + SHRUG_SIDE_M;
    const tensionFromElevation = shouldersHigh && earNotDropped && !angleDropped;
    // Only use vertical shrink as tension when we have angle baseline and angle did NOT drop (else it's head tilt)
    const tensionFromVerticalShrink =
      distanceShrink && !angleDropped && baselineAngle > 0;
    // Head tilt (angle drop) always wins: show lean, never tension, so the message matches the posture
    // When we have no angle baseline we can't tell head tilt from shrug, so don't show tension
    tensionRaw =
      baselineAngle > 0 &&
      !angleDropped &&
      (isShrug || tensionFromElevation || tensionFromVerticalShrink);
  }

  // Lean = head forward / head tilted down (angle drop). If no angle baseline, distance shrink = ambiguous → treat as lean so we don't show shoulder message for head tilt.
  const leanRaw = angleDropped || (baselineAngle <= 0 && distanceShrink);
  const quality = Math.min(
    1,
    ratio,
    baselineAngle > 0 ? currentAngle / baselineAngle : 1
  );
  return { leanRaw, tensionRaw, isShrug, quality };
}

function formatPlaybackTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `0:${String(sec).padStart(2, "0")}`;
}

type PostureEngineProps = {
  /** When set, load this session from the library and start replay. */
  replayId?: string | null;
  /** Instrument chosen on dashboard; used when saving so sessions are tagged correctly. */
  instrument?: import("@/lib/posture-engines/EngineFactory").InstrumentId;
};

export function PostureEngine({ replayId, instrument: instrumentProp = "generic" }: PostureEngineProps = {}) {
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
  const playbackTimeRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(0);
  const lastFrameIndexRef = useRef<number>(-1);

  const [viewMode, setViewMode] = useState<ViewMode>("front");
  const appliedInstrumentViewRef = useRef(false);
  const [sensitivity, setSensitivity] = useState(50); // 0–100; 50 = recommended balance (movement range vs catching tension)
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [baseline, setBaseline] = useState<PostureBaseline | null>(null);
  const [sideViewBaseline, setSideViewBaseline] = useState<SideViewBaseline | null>(null);
  const [alertType, setAlertType] = useState<PostureAlertType>(null);
  /** When set, calibration was rejected (e.g. pose too tense); show message and do not set baseline. */
  const [calibrationRejectedReason, setCalibrationRejectedReason] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<SessionRecording | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [playbackLandmarks, setPlaybackLandmarks] = useState<Landmark[]>([]);
  const [playbackSlouch, setPlaybackSlouch] = useState(false);
  const [playbackQuality, setPlaybackQuality] = useState(1);
  const [playbackAlertType, setPlaybackAlertType] = useState<"lean" | "tension" | null>(null);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0);
  const [reviewViewMode, setReviewViewMode] = useState<"humanoid" | "skeleton">("skeleton");
  const [isStopped, setIsStopped] = useState(false);
  const [sessionName, setSessionName] = useState("");
  /** When true, detection loop stops (after stop / save / discard until start again). */
  const [isDetectionPaused, setIsDetectionPaused] = useState(false);
  /** When replaying from library, show session name, view mode, sensitivity for review UI */
  const [replaySessionInfo, setReplaySessionInfo] = useState<{
    name: string;
    viewMode: ViewMode;
    sensitivityPercent?: number;
  } | null>(null);
  /** Toggle alignment grid (level/tilt reference) over the camera view. */
  const [showAlignmentGrid, setShowAlignmentGrid] = useState(false);
  /** Toggle body position guide overlay for correct posture alignment. */
  const [showBodyGuide, setShowBodyGuide] = useState(false);
  /** Ref copy of recording when stopped, so Save still works if state is cleared (e.g. re-render). */
  const stoppedRecordingRef = useRef<SessionRecording | null>(null);
  /** Brief message after save: "Saved" or error text. */
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  /** True while save is in progress; disables Save button and prevents double-submit. */
  const [isSaving, setIsSaving] = useState(false);

  const baselineRef = useRef<PostureBaseline | null>(null);
  const sideViewBaselineRef = useRef<SideViewBaseline | null>(null);
  const isCalibratedRef = useRef(false);
  const viewModeRef = useRef<ViewMode>("front");
  const sensitivityRef = useRef(50);
  const leanFramesRef = useRef(0);
  const tensionFramesRef = useRef(0);
  useEffect(() => {
    baselineRef.current = baseline;
    sideViewBaselineRef.current = sideViewBaseline;
    isCalibratedRef.current = isCalibrated;
    viewModeRef.current = viewMode;
    sensitivityRef.current = sensitivity;
  }, [baseline, sideViewBaseline, isCalibrated, viewMode, sensitivity]);

  // Piano defaults to side view (one-time when instrument is known)
  useEffect(() => {
    if (instrumentProp !== "piano" || appliedInstrumentViewRef.current) return;
    appliedInstrumentViewRef.current = true;
    setViewMode("side");
  }, [instrumentProp]);

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
      setReplaySessionInfo({
        name: session.name,
        viewMode: session.viewMode ?? (session.view === "side" ? "side" : "front"),
        sensitivityPercent: session.sensitivityPercent,
      });
      playbackStartTimeRef.current = performance.now();
      playbackTimeRef.current = 0;
      lastTickTimeRef.current = 0;
      lastFrameIndexRef.current = -1;
      setPlaybackPositionMs(0);
      setPlaybackPaused(false);
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
    setCalibrationRejectedReason(null);
    const mode = viewModeRef.current;
    if (mode === "front") {
      const shoulderAsymmetry = Math.abs(
        world[SHOULDER_LEFT].y - world[SHOULDER_RIGHT].y
      );
      if (shoulderAsymmetry > CALIBRATION_MAX_ASYMMETRY_M) {
        setCalibrationRejectedReason(
          "Shoulders look uneven. Relax, level them, then click Calibrate again."
        );
        return;
      }
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
      setSideViewBaseline({
        distLeft,
        distRight,
        angleLeft,
        angleRight,
        shoulderYLeft: world[SHOULDER_LEFT].y,
        shoulderYRight: world[SHOULDER_RIGHT].y,
        earYLeft: world[EAR_LEFT].y,
        earYRight: world[EAR_RIGHT].y,
        earShoulderVertLeft: Math.abs(world[EAR_LEFT].y - world[SHOULDER_LEFT].y),
        earShoulderVertRight: Math.abs(world[EAR_RIGHT].y - world[SHOULDER_RIGHT].y),
      });
      setBaseline(null);
    }
    setIsCalibrated(true);
    setAlertType(null);
    leanFramesRef.current = 0;
    tensionFramesRef.current = 0;
    setIsDetectionPaused(false);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "front" ? "side" : "front"));
    setBaseline(null);
    setSideViewBaseline(null);
    setIsCalibrated(false);
    setAlertType(null);
    setCalibrationRejectedReason(null);
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
    setIsDetectionPaused(false);
    audioContextRef.current?.resume();
  }, []);

  const handleStopSession = useCallback(() => {
    const rec = sessionRecorderRef.current.stop();
    stoppedRecordingRef.current = rec;
    setIsRecording(false);
    setSessionRecording(rec);
    setIsStopped(true);
    setIsPlayback(false);
    setIsDetectionPaused(true);
    setAlertType(null);
    setSaveFeedback(null);
    const count = getStoredSessions().length + 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setSessionName(`Session ${count} — ${dateStr}`);
  }, []);

  const handleContinueSession = useCallback(() => {
    sessionRecorderRef.current.start(
      videoSizeRef.current.width,
      videoSizeRef.current.height
    );
    setIsRecording(true);
    setIsStopped(false);
    setIsPlayback(false);
    setIsDetectionPaused(false);
  }, []);

  const handleSaveSession = useCallback(() => {
    const recording = sessionRecording ?? stoppedRecordingRef.current;
    if (!recording) {
      setSaveFeedback("No recording to save.");
      return;
    }
    setSaveFeedback(null);
    setIsSaving(true);
    const pct = Math.round(
      SENSITIVITY_MIN_PCT +
        (sensitivityRef.current / 100) * (SENSITIVITY_MAX_PCT - SENSITIVITY_MIN_PCT)
    );
    const result = saveSession({
      name: sessionName.trim() || "Unnamed Session",
      viewMode: viewModeRef.current,
      recording,
      sensitivityPercent: pct,
      instrument: instrumentProp,
    });
    setIsSaving(false);
    if (result.ok) {
      setSessionRecording(null);
      stoppedRecordingRef.current = null;
      setIsStopped(false);
      setSessionName("");
      setIsPlayback(false);
      setIsDetectionPaused(true);
      setAlertType(null);
      setSaveFeedback("Saved.");
      setTimeout(() => setSaveFeedback(null), 4000);
    } else {
      setSaveFeedback(result.error);
    }
  }, [sessionRecording, sessionName, instrumentProp]);

  const handleReviewSession = useCallback(() => {
    if (!sessionRecording || sessionRecording.frames.length === 0) return;
    setIsPlayback(true);
    playbackStartTimeRef.current = performance.now();
    playbackTimeRef.current = 0;
    lastTickTimeRef.current = 0;
    lastFrameIndexRef.current = -1;
    setPlaybackPositionMs(0);
    setPlaybackPaused(false);
  }, [sessionRecording]);

  const handleBackToLive = useCallback(() => {
    setIsPlayback(false);
    // Stay in stopped state — user can still save/continue/discard
  }, []);

  const handleStartNewSession = useCallback(() => {
    stoppedRecordingRef.current = null;
    setSessionRecording(null);
    setIsPlayback(false);
    setReplaySessionInfo(null);
    setSaveFeedback(null);
  }, []);

  const handleDiscardAndRestart = useCallback(() => {
    sessionRecorderRef.current.stop();
    stoppedRecordingRef.current = null;
    setSessionRecording(null);
    setIsRecording(false);
    setIsStopped(false);
    setIsPlayback(false);
    setSessionName("");
    setIsDetectionPaused(true);
    setAlertType(null);
    setSaveFeedback(null);
  }, []);

  // Process video frames (only when not in playback and detection not paused)
  useEffect(() => {
    if (isPlayback || isDetectionPaused) return;
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
            /** Stored in recording: drops below threshold when we show an alert so chart/summary match alerts. */
            let recordedQuality = 1;
            /** Alert type for this frame: used for replay tension/lean coloring. */
            let frameAlertType: "lean" | "tension" | null = null;
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
              frameAlertType = leanPersisted ? "lean" : tensionPersisted ? "tension" : null;
              setAlertType((prev) => {
                if (leanPersisted) return "lean";
                if (tensionPersisted) return "tension";
                return null;
              });
              if (leanPersisted || tensionPersisted) {
                if (tensionPersisted) {
                  const asymmetry = Math.abs(
                    worldSmoothed[SHOULDER_LEFT].y - worldSmoothed[SHOULDER_RIGHT].y
                  );
                  const baseAsymmetry = Math.abs(
                    base.shoulderYLeft - base.shoulderYRight
                  );
                  const alertThreshold = Math.max(
                    baseAsymmetry + ASYMMETRY_DEVIATION_ABOVE_BASELINE_M,
                    MIN_ASYMMETRY_ALERT_M
                  );
                  const severityRange = Math.max(
                    TENSION_SEVERITY_MAX_ASYMMETRY_M - alertThreshold,
                    0.01
                  );
                  const tensionSeverity = Math.max(
                    0.5,
                    0.87 -
                      ((asymmetry - alertThreshold) / severityRange) * 0.37
                  );
                  recordedQuality = Math.min(quality, tensionSeverity);
                } else {
                  recordedQuality = Math.min(quality, QUALITY_ALERT_THRESHOLD - 0.01);
                }
              } else {
                recordedQuality = quality;
              }
            } else if (isCalibratedRef.current && mode === "side" && sideBase != null) {
              const { leanRaw, tensionRaw, quality: q } = evaluatePostureSide(
                worldSmoothed,
                sideBase,
                sensitivityRef.current
              );
              quality = q;
              qualityRef.current = quality;

              if (leanRaw && !tensionRaw) {
                leanFramesRef.current += 1;
                tensionFramesRef.current = 0;
              } else if (tensionRaw) {
                tensionFramesRef.current += 1;
                leanFramesRef.current = 0;
              } else {
                leanFramesRef.current = 0;
                tensionFramesRef.current = 0;
              }
              const leanPersisted = leanFramesRef.current >= PERSISTENCE_FRAMES;
              const tensionPersisted = tensionFramesRef.current >= PERSISTENCE_FRAMES;
              frameAlertType = leanPersisted ? "lean" : tensionPersisted ? "tension" : null;
              setAlertType((prev) => {
                if (leanPersisted) return "lean";
                if (tensionPersisted) return "tension";
                return null;
              });
              recordedQuality =
                leanPersisted || tensionPersisted
                  ? Math.min(quality, QUALITY_ALERT_THRESHOLD - 0.01)
                  : quality;
            } else {
              qualityRef.current = 1;
              leanFramesRef.current = 0;
              tensionFramesRef.current = 0;
              setAlertType(null);
              recordedQuality = quality;
            }

            if (isRecordingRef.current) {
              sessionRecorderRef.current.addFrame(
                Date.now(),
                smoothed,
                recordedQuality,
                frameAlertType
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
  }, [isPoseReady, isPlayback, isDetectionPaused]);

  const playbackFps = 30;
  const playbackFrameMs = 1000 / playbackFps;

  // Playback loop: advance position when not paused; update frame and position state
  useEffect(() => {
    if (!isPlayback || !sessionRecording || sessionRecording.frames.length === 0) return;
    const frames = sessionRecording.frames;
    const durationMs = frames.length * playbackFrameMs;

    function tick(now: number) {
      if (!playbackPaused) {
        const prev = lastTickTimeRef.current;
        if (prev > 0) playbackTimeRef.current += now - prev;
        playbackTimeRef.current = playbackTimeRef.current % durationMs;
        if (playbackTimeRef.current < 0) playbackTimeRef.current += durationMs;
      }
      lastTickTimeRef.current = now;
      const frameIndex = Math.min(
        Math.floor(playbackTimeRef.current / playbackFrameMs),
        frames.length - 1
      );
      if (frameIndex !== lastFrameIndexRef.current) {
        lastFrameIndexRef.current = frameIndex;
        setPlaybackPositionMs(frameIndex * playbackFrameMs);
      }
      const frame = frames[frameIndex];
      if (frame) {
        setPlaybackLandmarks(frame.landmarks);
        setPlaybackSlouch(frame.quality < QUALITY_ALERT_THRESHOLD);
        setPlaybackQuality(frame.quality);
        setPlaybackAlertType(frame.alertType ?? null);
      }
      playbackRef.current = requestAnimationFrame(tick);
    }
    lastTickTimeRef.current = performance.now();
    playbackRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(playbackRef.current);
  }, [isPlayback, sessionRecording, playbackPaused]);

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
      if (reviewViewMode === "skeleton" && playbackLandmarks.length > 0) {
        drawSkeleton(ctx, playbackLandmarks, playbackSlouch, w, h);
      }
      return;
    }

    const video = webcamRef.current?.video;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    if (showAlignmentGrid) drawAlignmentGrid(ctx, w, h);
    if (showBodyGuide) drawBodyGuide(ctx, w, h);
    if (landmarks.length > 0) drawSkeleton(ctx, landmarks, alertType != null, w, h);
  }, [landmarks, alertType, isPlayback, sessionRecording, playbackLandmarks, playbackSlouch, reviewViewMode, showAlignmentGrid, showBodyGuide]);

  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: "user",
  };

  const showLiveView = !isPlayback;
  const hasRecording = sessionRecording && sessionRecording.frames.length > 0;
  const hasRecordingToSave = !!(sessionRecording ?? stoppedRecordingRef.current);

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {/* Camera setup instructions — only when live and not in replay */}
      {showLiveView && !replaySessionInfo && (
        <div className="w-full max-w-[640px] rounded-lg bg-zinc-800/80 border border-zinc-700 p-3 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300 mb-1">Camera setup</p>
          <p>
            Place the camera at <strong className="text-zinc-200">shoulder height</strong>, facing you straight on for <strong className="text-zinc-200">Front</strong> or from the side for <strong className="text-zinc-200">Side</strong>. Keep it <strong className="text-zinc-200">level</strong> (use the alignment grid below to check). Ensure your head and both shoulders stay in frame to avoid false alerts.
          </p>
        </div>
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
            className="w-full aspect-video bg-zinc-900 flex items-center justify-center relative"
            style={{ aspectRatio: `${sessionRecording?.width ?? 640} / ${sessionRecording?.height ?? 480}` }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{
                transform: "scaleX(-1)",
                opacity: reviewViewMode === "skeleton" ? 1 : 0.4,
              }}
            />
            {reviewViewMode === "humanoid" &&
              sessionRecording &&
              sessionRecording.frames.length > 0 &&
              playbackLandmarks.length > 0 && (
                <PostureReview3D
                  landmarks={playbackLandmarks}
                  quality={playbackQuality}
                  qualityAlertThreshold={QUALITY_ALERT_THRESHOLD}
                  alertType={playbackAlertType}
                  width={sessionRecording.width}
                  height={sessionRecording.height}
                />
              )}
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
              className="absolute top-10 left-2 right-2 flex items-start gap-2 rounded-lg bg-red-500/90 text-white px-3 py-2.5 text-sm"
            >
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {showLiveView && alertType === "tension"
                    ? "Tension detected"
                    : showLiveView && alertType === "lean"
                      ? "Lean detected"
                      : "Tension alert"}
                </span>
                <span className="text-red-100 text-xs">
                  {showLiveView && alertType === "tension"
                    ? "Relax your shoulders and level them — avoid raising or hiking one side."
                    : showLiveView && alertType === "lean"
                      ? "Sit up and align ear over shoulder over hip."
                      : "Relax your shoulders and level them."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Review controls: view toggle (Skeleton / Humanoid), play/pause, seek */}
      {isPlayback && sessionRecording && sessionRecording.frames.length > 0 && (
        <div className="w-full max-w-[640px] flex flex-col gap-3 rounded-xl bg-zinc-800/80 border border-zinc-700 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-lg bg-zinc-900 border border-zinc-600 p-0.5"
              role="radiogroup"
              aria-label="Review view"
            >
              {(["skeleton", "humanoid"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={reviewViewMode === mode}
                  onClick={() => setReviewViewMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    reviewViewMode === mode
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {mode === "skeleton" ? "Skeleton" : "Humanoid"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPlaybackPaused((p) => !p)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-100"
              aria-label={playbackPaused ? "Play" : "Pause"}
            >
              {playbackPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 tabular-nums w-10">
              {formatPlaybackTime(playbackPositionMs)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, sessionRecording.frames.length * playbackFrameMs - 1)}
              step={playbackFrameMs}
              value={playbackPositionMs}
              onChange={(e) => {
                const ms = Number(e.target.value);
                setPlaybackPositionMs(ms);
                playbackTimeRef.current = ms;
                lastTickTimeRef.current = performance.now();
                lastFrameIndexRef.current = Math.floor(ms / playbackFrameMs);
              }}
              className="flex-1 h-2 rounded-full bg-zinc-600 appearance-none cursor-pointer accent-emerald-500"
              aria-label="Seek to position"
            />
            <span className="text-xs text-zinc-400 tabular-nums w-10">
              {formatPlaybackTime(sessionRecording.frames.length * playbackFrameMs)}
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-[640px] space-y-4">
        {/* View mode toggle + calibrate — hidden during replay */}
        {!isPlayback && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`inline-flex rounded-lg bg-zinc-800 border border-zinc-700 p-0.5 ${isRecording ? "opacity-50 pointer-events-none" : ""}`} role="radiogroup" aria-label="Camera view">
                {(["front", "side"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={viewMode === mode}
                    disabled={isRecording}
                    onClick={() => {
                      if (viewMode !== mode) handleToggleViewMode();
                    }}
                    className={`relative inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      viewMode === mode
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100"
                    }`}
                  >
                    <Camera size={14} />
                    {mode === "front" ? "Front" : "Side"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCalibrate}
                disabled={!isPoseReady || landmarks.length === 0 || isRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Activity size={18} />
                Calibrate
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Front / Side choose which posture is analyzed. Calibrate separately for each view.
            </p>
            {/* Alignment grid & body guide toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAlignmentGrid((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  showAlignmentGrid ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50" : "bg-zinc-800 text-zinc-400 border border-zinc-600 hover:text-zinc-200"
                }`}
                aria-pressed={showAlignmentGrid}
              >
                <Grid3X3 size={16} />
                Alignment grid
              </button>
              <button
                type="button"
                onClick={() => setShowBodyGuide((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  showBodyGuide ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50" : "bg-zinc-800 text-zinc-400 border border-zinc-600 hover:text-zinc-200"
                }`}
                aria-pressed={showBodyGuide}
              >
                <User size={16} />
                Body guide
              </button>
            </div>
            {/* Calibration hint */}
            {!isCalibrated && !replaySessionInfo && (
              <div className="space-y-2">
                {calibrationRejectedReason && (
                  <div className="rounded-lg bg-amber-900/40 border border-amber-700 p-3 text-sm text-amber-200 flex items-center gap-2">
                    <AlertTriangle size={18} className="shrink-0" />
                    {calibrationRejectedReason}
                  </div>
                )}
                <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-3 text-sm text-zinc-400 space-y-2">
                  <p>
                    Sit <strong className="text-zinc-200">relaxed and ergonomic</strong>, then perform your instrument. While playing <strong className="text-zinc-200">as relaxed as you can</strong>, click <strong className="text-zinc-200">Calibrate</strong> to set your baseline.
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Calibrating while playing relaxed gives a healthy target; the app will alert you when you tense or deviate from this position.
                  </p>
                </div>
              </div>
            )}

            {/* Sensitivity slider — user sets threshold; 50% = recommended balance (locked during recording) */}
            <div className={`flex flex-col gap-1 ${isRecording ? "opacity-60 pointer-events-none" : ""}`}>
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
                disabled={isRecording}
                className="w-full h-2 rounded-lg appearance-none bg-zinc-700 accent-emerald-500 disabled:opacity-70"
                aria-label="Sensitivity: 1% very strict to 25% very loose. 50% recommended. Locked during recording."
              />
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Very Strict (5%)</span>
                <span>Very Loose (25%)</span>
              </div>
              <p className="text-xs text-zinc-500">50% recommended for balance between movement range and catching tension.</p>
            </div>
          </>
        )}

        {/* Session controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Idle: calibrated, no active session, not stopped, not replaying from library */}
          {isCalibrated && !isRecording && !isStopped && !isPlayback && !replaySessionInfo && (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!isPoseReady}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Play size={18} />
              Start Session
            </button>
          )}

          {/* Recording */}
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
                Discard
              </button>
            </>
          )}

          {/* Stopped (unsaved) — not in playback */}
          {isStopped && !isPlayback && !isRecording && (
            <>
              <div className="w-full">
                <label htmlFor="session-name" className="block text-sm text-zinc-400 mb-1">Session name</label>
                <input
                  id="session-name"
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  placeholder="Session name…"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={!hasRecordingToSave || isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save size={18} />
                {isSaving ? "Saving…" : "Save Session"}
              </button>
              <button
                type="button"
                onClick={handleContinueSession}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                <Play size={18} />
                Continue Recording
              </button>
              <button
                type="button"
                onClick={handleReviewSession}
                disabled={!hasRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                <RotateCcw size={18} />
                Review
              </button>
              <button
                type="button"
                onClick={handleDiscardAndRestart}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500"
              >
                <Trash2 size={18} />
                Discard
              </button>
            </>
          )}

          {/* Reviewing from stopped state (not from library) */}
          {isPlayback && isStopped && !replaySessionInfo && (
            <>
              <button
                type="button"
                onClick={handleBackToLive}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={!hasRecordingToSave || isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save size={18} />
                {isSaving ? "Saving…" : "Save Session"}
              </button>
            </>
          )}

          {/* Save feedback: prominent success banner or error */}
          {saveFeedback && (
            <div
              role="status"
              aria-live="polite"
              className={`w-full flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                saveFeedback.startsWith("Saved")
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/50"
              }`}
            >
              {saveFeedback.startsWith("Saved") ? (
                <CheckCircle size={20} className="shrink-0" />
              ) : (
                <AlertTriangle size={20} className="shrink-0" />
              )}
              <span>{saveFeedback}</span>
            </div>
          )}

          {/* Replaying from library: no Back to Live / Start New Session — review-only UI below */}
          {isPlayback && replaySessionInfo && null}

          {/* Posture status text */}
          {isCalibrated && showLiveView && !isStopped && (
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

      {sessionRecording && isStopped && !isPlayback && (
        <div className="w-full flex flex-col items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <BarChart3 size={18} />
            Session Stats
          </h3>
          <SessionStats recording={sessionRecording} />
        </div>
      )}

      {/* Review session (from library): data panel + graph only */}
      {isPlayback && replaySessionInfo && sessionRecording && sessionRecording.frames.length > 0 && (
        <div className="w-full max-w-[640px] flex flex-col gap-4">
          <div className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-4">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Session summary</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Session</dt>
                <dd className="font-medium text-zinc-100 truncate">{replaySessionInfo.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">View</dt>
                <dd className="font-medium text-zinc-100">
                  {replaySessionInfo.viewMode === "front" ? "Front (symmetry)" : "Side (alignment)"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Duration</dt>
                <dd className="font-medium text-zinc-100">
                  {(() => {
                    const ms = sessionRecording.stoppedAt - sessionRecording.startedAt;
                    const s = Math.round(ms / 1000);
                    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Good posture</dt>
                <dd className="font-medium text-emerald-400">
                  {(() => {
                    const good = sessionRecording.frames.filter((f) => f.quality >= QUALITY_ALERT_THRESHOLD).length;
                    const pct = sessionRecording.frames.length
                      ? Math.round((good / sessionRecording.frames.length) * 100)
                      : 0;
                    return `${pct}%`;
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Alert frames</dt>
                <dd className="font-medium text-amber-400">
                  {(() => {
                    const bad = sessionRecording.frames.filter((f) => f.quality < QUALITY_ALERT_THRESHOLD).length;
                    const pct = sessionRecording.frames.length
                      ? Math.round((bad / sessionRecording.frames.length) * 100)
                      : 0;
                    return `${pct}%`;
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Sensitivity</dt>
                <dd className="font-medium text-zinc-100">
                  {replaySessionInfo.sensitivityPercent != null
                    ? `${replaySessionInfo.sensitivityPercent}% shrink`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <BarChart3 size={18} />
              Posture quality over time
            </h3>
            <SessionStats recording={sessionRecording} />
          </div>
        </div>
      )}
    </div>
  );
}
