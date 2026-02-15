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
} from "lucide-react";
import { SessionRecorder } from "@/lib/SessionRecorder";
import type { SessionRecording } from "@/lib/SessionRecorder";
import { SessionStats } from "@/components/SessionStats";
import { drawSkeleton } from "./PostureEngine.draw";

// MediaPipe Pose landmark indices
const EAR_LEFT = 7;
const EAR_RIGHT = 8;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;

const SMOOTHING_ALPHA = 0.3;
const SLOUCH_THRESHOLD = 0.85; // 15% collapse => current <= baseline * 0.85

const TENSION_HUM_HZ = 200;
const TENSION_HUM_GAIN_MIN = 0.05;
const TENSION_HUM_GAIN_MAX = 0.3;

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
  const playbackRef = useRef<number>(0);
  const videoTimestampRef = useRef<number>(0);
  const smoothedLandmarksRef = useRef<Landmark[]>([]);
  const sessionRecorderRef = useRef<SessionRecorder>(new SessionRecorder());
  const isRecordingRef = useRef(false);
  const qualityRef = useRef(1);
  const videoSizeRef = useRef({ width: 640, height: 480 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  const [isCalibrated, setIsCalibrated] = useState(false);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [isSlouch, setIsSlouch] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionRecording, setSessionRecording] = useState<SessionRecording | null>(null);
  const [isPlayback, setIsPlayback] = useState(false);
  const [playbackLandmarks, setPlaybackLandmarks] = useState<Landmark[]>([]);
  const [playbackSlouch, setPlaybackSlouch] = useState(false);

  const baselineRef = useRef<number | null>(null);
  const isCalibratedRef = useRef(false);
  useEffect(() => {
    baselineRef.current = baseline;
    isCalibratedRef.current = isCalibrated;
  }, [baseline, isCalibrated]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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
    if (isSlouch) {
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
  }, [isSlouch]);

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
    const current = smoothedLandmarksRef.current;
    if (current.length < 13) return;
    const leftD = verticalDistanceEarShoulder(current[EAR_LEFT], current[SHOULDER_LEFT]);
    const rightD = verticalDistanceEarShoulder(current[EAR_RIGHT], current[SHOULDER_RIGHT]);
    const avg = (leftD + rightD) / 2;
    setBaseline(avg);
    setIsCalibrated(true);
    setIsSlouch(false);
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
          if (raw.length === 0) {
            setLandmarks([]);
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

            const base = baselineRef.current;
            let quality = 1;
            if (isCalibratedRef.current && base != null && base > 0) {
              const leftD = verticalDistanceEarShoulder(
                smoothed[EAR_LEFT],
                smoothed[SHOULDER_LEFT]
              );
              const rightD = verticalDistanceEarShoulder(
                smoothed[EAR_RIGHT],
                smoothed[SHOULDER_RIGHT]
              );
              const avg = (leftD + rightD) / 2;
              quality = Math.min(1, avg / base);
              qualityRef.current = quality;
              setIsSlouch(avg <= base * SLOUCH_THRESHOLD);
            } else {
              qualityRef.current = 1;
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
        setPlaybackSlouch(frame.quality < SLOUCH_THRESHOLD);
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
    drawSkeleton(ctx, landmarks, isSlouch, w, h);
  }, [landmarks, isSlouch, isPlayback, sessionRecording, playbackLandmarks, playbackSlouch]);

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
            Reviewing session — replay
          </div>
        )}
        <AnimatePresence>
          {(showLiveView ? isSlouch : playbackSlouch) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-10 left-2 right-2 flex items-center justify-center gap-2 rounded-lg bg-red-500/90 text-white px-3 py-2 text-sm font-medium"
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
          disabled={!isPoseReady || landmarks.length === 0 || isRecording}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Activity size={18} />
          Calibrate
        </button>

        {!isRecording && (
          <button
            type="button"
            onClick={handleStartSession}
            disabled={!isPoseReady || !isCalibrated}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play size={18} />
            Start Session
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
            {isSlouch ? "Slouch detected" : "Good posture"}
          </span>
        )}
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
