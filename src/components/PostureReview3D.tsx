"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

export type Landmark3D = { x: number; y: number; z?: number; visibility?: number };

// MediaPipe pose indices
const NOSE = 0;
const EAR_LEFT = 7;
const EAR_RIGHT = 8;
const SHOULDER_LEFT = 11;
const SHOULDER_RIGHT = 12;
const ELBOW_LEFT = 13;
const ELBOW_RIGHT = 14;
const WRIST_LEFT = 15;
const WRIST_RIGHT = 16;
const HIP_LEFT = 23;
const HIP_RIGHT = 24;
const KNEE_LEFT = 25;
const KNEE_RIGHT = 26;
const ANKLE_LEFT = 27;
const ANKLE_RIGHT = 28;

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [11, 23], [12, 24],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [7, 11], [8, 12],
];

/** Convert normalized image landmarks to 3D scene coords: centered, Y up. */
function toScene3D(lm: Landmark3D, aspect: number): [number, number, number] {
  const x = (0.5 - lm.x) * 2;
  const y = (0.5 - lm.y) * 2;
  const z = -((lm.z ?? 0) * 2);
  return [x * Math.min(1, aspect), y, z];
}

function vec(a: [number, number, number], b: [number, number, number]) {
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
}
function mid(a: [number, number, number], b: [number, number, number]) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] as const;
}
function len(v: readonly [number, number, number]) {
  return Math.hypot(v[0], v[1], v[2]) || 1e-6;
}

type Vec3 = readonly [number, number, number];

// ─── Shared material ────────────────────────────────────────────────────

const BODY_COLOR = "#c8ccd0";
const MANNEQUIN_MATERIAL_PROPS = {
  metalness: 0.05,
  roughness: 0.65,
  transparent: true as const,
  opacity: 0.97,
};

// ─── Smooth Limb Segment ────────────────────────────────────────────────

/** A smooth capsule positioned between two points, with optional scale override. */
function LimbSegment({
  start,
  end,
  radius,
  color,
  scaleXZ,
}: {
  start: Vec3;
  end: Vec3;
  radius: number;
  color: THREE.Color;
  scaleXZ?: [number, number]; // [scaleX, scaleZ] for flattened shapes like torso
}) {
  const { position, quaternion, cylinderHeight } = useMemo(() => {
    const d = vec([...start], [...end]);
    const totalLength = len(d);
    const cylinderHeight = Math.max(0.001, totalLength - radius * 2);
    const midPoint = mid([...start], [...end]);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    return { position: midPoint, quaternion: q, cylinderHeight };
  }, [start, end, radius]);

  const geometry = useMemo(() => {
    return new THREE.CapsuleGeometry(radius, cylinderHeight, 12, 24);
  }, [radius, cylinderHeight]);

  const scale = scaleXZ ? [scaleXZ[0], 1, scaleXZ[1]] as [number, number, number] : undefined;

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} {...MANNEQUIN_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
}

/** Joint sphere at a point for smooth transitions between segments. */
function JointSphere({ position, radius, color }: { position: Vec3; radius: number; color: THREE.Color }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 20, 16]} />
      <meshStandardMaterial color={color} {...MANNEQUIN_MATERIAL_PROPS} />
    </mesh>
  );
}

// ─── Helper types ───────────────────────────────────────────────────────

type PostureReview3DProps = {
  landmarks: Landmark3D[];
  quality: number;
  qualityAlertThreshold?: number;
  alertType?: "lean" | "tension" | null;
  width: number;
  height: number;
};

function segmentKey(i: number, j: number): string {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}

const NECK_SEGMENTS = new Set(["7-11", "8-12"]);
const SHOULDER_SEGMENTS = new Set(["11-12", "11-13", "12-14"]);

// ─── SolidBody (fallback — original capsule style) ──────────────────────

function Capsule({
  start, end, radius, color, showRed, tensionIntensity,
}: {
  start: Vec3; end: Vec3; radius: number; color: THREE.Color;
  showRed: boolean; tensionIntensity: number;
}) {
  const { position, quaternion, cylinderHeight } = useMemo(() => {
    const d = vec([...start], [...end]);
    const totalLength = len(d);
    const cylinderHeight = Math.max(0.01, totalLength - radius * 2);
    const midPoint = mid([...start], [...end]);
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    return { position: midPoint, quaternion: q, cylinderHeight };
  }, [start, end, radius]);

  const geometry = useMemo(() => new THREE.CapsuleGeometry(radius, cylinderHeight, 6, 16), [radius, cylinderHeight]);

  const redAmount = showRed ? Math.min(1, tensionIntensity * 1.2) : 0;
  const finalColor = useMemo(() => {
    const c = color.clone();
    c.lerp(new THREE.Color("#ef4444"), redAmount);
    return c;
  }, [color, redAmount]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={finalColor} metalness={0.12} roughness={0.8} transparent opacity={0.97} />
      </mesh>
    </group>
  );
}

function SolidBody({
  points, tensionIntensity, alertType,
}: {
  points: [number, number, number][]; tensionIntensity: number; alertType: "lean" | "tension" | null;
}) {
  const baseColor = useMemo(() => new THREE.Color("#9ca3af"), []);
  const shoulderCenter = useMemo(() => mid(points[SHOULDER_LEFT], points[SHOULDER_RIGHT]), [points]);
  const hipCenter = useMemo(() => mid(points[HIP_LEFT], points[HIP_RIGHT]), [points]);
  const shoulderWidth = useMemo(() => len(vec(points[SHOULDER_LEFT], points[SHOULDER_RIGHT])), [points]);
  const headRadius = shoulderWidth * 0.38;
  const headCenter = useMemo(() => {
    const earMid = mid(points[EAR_LEFT], points[EAR_RIGHT]);
    const nose = points[NOSE];
    return [(earMid[0] + nose[0]) / 2, (earMid[1] + nose[1]) / 2 + 0.08, (earMid[2] + nose[2]) / 2] as const;
  }, [points]);
  const neckTop = useMemo(() => [headCenter[0], headCenter[1] - headRadius, headCenter[2]] as const, [headCenter, headRadius]);
  const neckBottom = useMemo(() => {
    const full = [neckTop[0] - shoulderCenter[0], neckTop[1] - shoulderCenter[1], neckTop[2] - shoulderCenter[2]] as const;
    return [shoulderCenter[0] + full[0] * 0.68, shoulderCenter[1] + full[1] * 0.68, shoulderCenter[2] + full[2] * 0.68] as const;
  }, [shoulderCenter, neckTop]);

  return (
    <group>
      <mesh position={headCenter}><sphereGeometry args={[headRadius, 24, 20]} /><meshStandardMaterial color={baseColor.clone()} metalness={0.1} roughness={0.85} /></mesh>
      <Capsule start={neckBottom} end={neckTop} radius={shoulderWidth * 0.1} color={baseColor.clone()} showRed={alertType === "lean"} tensionIntensity={tensionIntensity} />
      <Capsule start={hipCenter} end={neckBottom} radius={shoulderWidth * 0.38} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[SHOULDER_LEFT]} end={points[ELBOW_LEFT]} radius={shoulderWidth * 0.12} color={baseColor.clone()} showRed={alertType === "tension"} tensionIntensity={tensionIntensity} />
      <Capsule start={points[SHOULDER_RIGHT]} end={points[ELBOW_RIGHT]} radius={shoulderWidth * 0.12} color={baseColor.clone()} showRed={alertType === "tension"} tensionIntensity={tensionIntensity} />
      <Capsule start={points[ELBOW_LEFT]} end={points[WRIST_LEFT]} radius={shoulderWidth * 0.08} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[ELBOW_RIGHT]} end={points[WRIST_RIGHT]} radius={shoulderWidth * 0.08} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[HIP_LEFT]} end={points[KNEE_LEFT]} radius={shoulderWidth * 0.16} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[HIP_RIGHT]} end={points[KNEE_RIGHT]} radius={shoulderWidth * 0.16} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[KNEE_LEFT]} end={points[ANKLE_LEFT]} radius={shoulderWidth * 0.12} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
      <Capsule start={points[KNEE_RIGHT]} end={points[ANKLE_RIGHT]} radius={shoulderWidth * 0.12} color={baseColor.clone()} showRed={false} tensionIntensity={tensionIntensity} />
    </group>
  );
}

// ─── MannequinBody (improved humanoid) ──────────────────────────────────

function MannequinBody({
  points,
  tensionIntensity,
  alertType,
}: {
  points: [number, number, number][];
  tensionIntensity: number;
  alertType: "lean" | "tension" | null;
}) {
  // Derived landmarks
  const shoulderCenter = useMemo(() => mid(points[SHOULDER_LEFT], points[SHOULDER_RIGHT]), [points]);
  const hipCenter = useMemo(() => mid(points[HIP_LEFT], points[HIP_RIGHT]), [points]);
  const earCenter = useMemo(() => mid(points[EAR_LEFT], points[EAR_RIGHT]), [points]);
  const shoulderWidth = useMemo(() => len(vec(points[SHOULDER_LEFT], points[SHOULDER_RIGHT])), [points]);

  // Proportional scale factor based on shoulder width
  const s = shoulderWidth;

  // Head: slightly elongated vertically
  const headCenter = useMemo<Vec3>(() => {
    const nose = points[NOSE];
    return [
      (earCenter[0] + nose[0]) / 2,
      (earCenter[1] + nose[1]) / 2 + s * 0.15,
      (earCenter[2] + nose[2]) / 2,
    ];
  }, [points, earCenter, s]);
  const headRadius = s * 0.36;

  // Neck: from shoulder center toward head
  const neckTop = useMemo<Vec3>(() => [
    headCenter[0], headCenter[1] - headRadius * 0.85, headCenter[2],
  ], [headCenter, headRadius]);
  const neckBottom = useMemo<Vec3>(() => {
    const d = vec([...shoulderCenter], [...neckTop]);
    const ratio = 0.35;
    return [
      shoulderCenter[0] + d[0] * ratio,
      shoulderCenter[1] + d[1] * ratio,
      shoulderCenter[2] + d[2] * ratio,
    ];
  }, [shoulderCenter, neckTop]);

  // Colors
  const baseColor = useMemo(() => new THREE.Color(BODY_COLOR), []);
  const neckColor = useMemo(() => {
    if (alertType !== "lean" || tensionIntensity <= 0) return baseColor.clone();
    return baseColor.clone().lerp(new THREE.Color("#ef4444"), Math.min(1, tensionIntensity * 1.2));
  }, [baseColor, alertType, tensionIntensity]);
  const shoulderColor = useMemo(() => {
    if (alertType !== "tension" || tensionIntensity <= 0) return baseColor.clone();
    return baseColor.clone().lerp(new THREE.Color("#ef4444"), Math.min(1, tensionIntensity * 1.2));
  }, [baseColor, alertType, tensionIntensity]);

  return (
    <group>
      {/* ── Head ── */}
      <mesh position={headCenter} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[headRadius, 28, 22]} />
        <meshStandardMaterial color={baseColor} {...MANNEQUIN_MATERIAL_PROPS} />
      </mesh>

      {/* ── Neck ── */}
      <LimbSegment start={neckBottom} end={neckTop} radius={s * 0.09} color={neckColor} />
      <JointSphere position={neckBottom} radius={s * 0.1} color={neckColor} />

      {/* ── Torso: flattened capsule (wider X, thinner Z) ── */}
      <LimbSegment
        start={hipCenter}
        end={neckBottom}
        radius={s * 0.34}
        color={baseColor}
        scaleXZ={[1.15, 0.65]}
      />

      {/* ── Shoulder joints ── */}
      <JointSphere position={points[SHOULDER_LEFT]} radius={s * 0.13} color={shoulderColor} />
      <JointSphere position={points[SHOULDER_RIGHT]} radius={s * 0.13} color={shoulderColor} />

      {/* ── Upper arms ── */}
      <LimbSegment start={points[SHOULDER_LEFT]} end={points[ELBOW_LEFT]} radius={s * 0.10} color={shoulderColor} />
      <LimbSegment start={points[SHOULDER_RIGHT]} end={points[ELBOW_RIGHT]} radius={s * 0.10} color={shoulderColor} />

      {/* ── Elbow joints ── */}
      <JointSphere position={points[ELBOW_LEFT]} radius={s * 0.085} color={baseColor} />
      <JointSphere position={points[ELBOW_RIGHT]} radius={s * 0.085} color={baseColor} />

      {/* ── Forearms ── */}
      <LimbSegment start={points[ELBOW_LEFT]} end={points[WRIST_LEFT]} radius={s * 0.07} color={baseColor} />
      <LimbSegment start={points[ELBOW_RIGHT]} end={points[WRIST_RIGHT]} radius={s * 0.07} color={baseColor} />

      {/* ── Wrist joints ── */}
      <JointSphere position={points[WRIST_LEFT]} radius={s * 0.055} color={baseColor} />
      <JointSphere position={points[WRIST_RIGHT]} radius={s * 0.055} color={baseColor} />

      {/* ── Hip joints ── */}
      <JointSphere position={points[HIP_LEFT]} radius={s * 0.14} color={baseColor} />
      <JointSphere position={points[HIP_RIGHT]} radius={s * 0.14} color={baseColor} />

      {/* ── Thighs ── */}
      <LimbSegment start={points[HIP_LEFT]} end={points[KNEE_LEFT]} radius={s * 0.13} color={baseColor} />
      <LimbSegment start={points[HIP_RIGHT]} end={points[KNEE_RIGHT]} radius={s * 0.13} color={baseColor} />

      {/* ── Knee joints ── */}
      <JointSphere position={points[KNEE_LEFT]} radius={s * 0.10} color={baseColor} />
      <JointSphere position={points[KNEE_RIGHT]} radius={s * 0.10} color={baseColor} />

      {/* ── Shins ── */}
      <LimbSegment start={points[KNEE_LEFT]} end={points[ANKLE_LEFT]} radius={s * 0.09} color={baseColor} />
      <LimbSegment start={points[KNEE_RIGHT]} end={points[ANKLE_RIGHT]} radius={s * 0.09} color={baseColor} />

      {/* ── Ankle joints ── */}
      <JointSphere position={points[ANKLE_LEFT]} radius={s * 0.065} color={baseColor} />
      <JointSphere position={points[ANKLE_RIGHT]} radius={s * 0.065} color={baseColor} />
    </group>
  );
}

// ─── Main scene ─────────────────────────────────────────────────────────

function SkeletonAndBody({
  landmarks,
  quality,
  qualityAlertThreshold,
  alertType,
}: {
  landmarks: Landmark3D[];
  quality: number;
  qualityAlertThreshold: number;
  alertType: "lean" | "tension" | null;
}) {
  const aspect = 640 / 480;
  const points = useMemo(() => {
    return landmarks.map((lm) => toScene3D(lm, aspect));
  }, [landmarks]);

  const tensionIntensity = quality < qualityAlertThreshold
    ? Math.min(1, (qualityAlertThreshold - quality) / qualityAlertThreshold)
    : 0;

  const [mannequinError, setMannequinError] = useState(false);
  const onMannequinError = useCallback(() => setMannequinError(true), []);

  const skeletonLinesWithKey = useMemo(() => {
    const sk: { start: [number, number, number]; end: [number, number, number]; key: string }[] = [];
    for (const [i, j] of POSE_CONNECTIONS) {
      const a = points[i];
      const b = points[j];
      if (!a || !b) continue;
      const visA = landmarks[i]?.visibility ?? 1;
      const visB = landmarks[j]?.visibility ?? 1;
      if (visA < 0.5 || visB < 0.5) continue;
      sk.push({ start: a, end: b, key: segmentKey(i, j) });
    }
    return sk;
  }, [points, landmarks]);

  const hasEnoughPoints = points.length > 28 && points[SHOULDER_LEFT] && points[SHOULDER_RIGHT] && points[HIP_LEFT] && points[HIP_RIGHT];

  if (points.length === 0) return null;

  const greenHex = "#22c55e";
  const redHex = "#ef4444";

  return (
    <group>
      {/* Humanoid body */}
      {hasEnoughPoints && (
        mannequinError ? (
          <SolidBody points={points} tensionIntensity={tensionIntensity} alertType={alertType} />
        ) : (
          <MannequinErrorBoundary onError={onMannequinError}>
            <MannequinBody points={points} tensionIntensity={tensionIntensity} alertType={alertType} />
          </MannequinErrorBoundary>
        )
      )}

      {/* Skeleton lines on top */}
      {skeletonLinesWithKey.map((line, idx) => {
        const isNeck = NECK_SEGMENTS.has(line.key);
        const isShoulder = SHOULDER_SEGMENTS.has(line.key);
        const showRed =
          (alertType === "lean" && isNeck) || (alertType === "tension" && isShoulder);
        const lineColor = showRed && tensionIntensity > 0 ? redHex : greenHex;
        return (
          <line key={`sk${idx}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([...line.start, ...line.end]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color={lineColor} depthTest={false} />
          </line>
        );
      })}
    </group>
  );
}

// ─── Error boundary ─────────────────────────────────────────────────────

class MannequinErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError(); }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Root component ─────────────────────────────────────────────────────

export function PostureReview3D({
  landmarks,
  quality,
  qualityAlertThreshold = 0.88,
  alertType = null,
  width: _width,
  height: _height,
}: PostureReview3DProps) {
  if (landmarks.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 140, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 2, 3]} intensity={1.1} />
        <directionalLight position={[-1, 1, 2]} intensity={0.5} />
        <SkeletonAndBody
          landmarks={landmarks}
          quality={quality}
          qualityAlertThreshold={qualityAlertThreshold}
          alertType={alertType ?? null}
        />
      </Canvas>
    </div>
  );
}
