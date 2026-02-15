# Skill: dexterity-analyzer

## Purpose
Implements hand dexterity tracking and metric composition for Virtuoso Studio. Integrates MediaPipe Hands landmarks with standalone analysis modules that can be optionally composed into any Instrument.

---

## Level 2 Instructions

### 1. Hand Logic

#### MediaPipe Hands Integration
- Uses `@mediapipe/tasks-vision` `HandLandmarker` (same package as PoseLandmarker).
- Each hand produces 21 landmarks (indices 0–20):
  - **Wrist:** 0
  - **Thumb:** 1–4 (CMC, MCP, IP, TIP)
  - **Index:** 5–8 (MCP, PIP, DIP, TIP)
  - **Middle:** 9–12
  - **Ring:** 13–16
  - **Pinky:** 17–20
- Track both left and right hands. Handedness is provided by the MediaPipe result.

#### Hand Landmark Types
```typescript
interface HandLandmark {
  x: number; y: number; z: number;
}

interface HandFrame {
  landmarks: HandLandmark[];
  handedness: 'left' | 'right';
  timestamp: number;
}
```

---

### 2. Metric Composition

Each metric is a standalone module with a consistent interface:

```typescript
interface DexterityMetric<T> {
  readonly name: string;
  update(frame: HandFrame): void;
  getResult(): T;
  reset(): void;
}
```

#### `FingerIndependence`
- **Purpose:** Measures how independently each finger moves relative to its neighbors.
- **Algorithm:**
  1. For each frame, compute the flexion angle of each finger (angle at PIP joint between MCP-PIP and PIP-DIP vectors).
  2. Track the variance of each finger's angle across a sliding window (default 60 frames).
  3. Independence score = normalized variance per finger. High variance in one finger while others are stable = high independence.
- **Output:** `{ thumb: number, index: number, middle: number, ring: number, pinky: number }` — each 0–1.

#### `HandSpan`
- **Purpose:** Measures the maximum spread distance between fingertips.
- **Algorithm:**
  1. Compute pairwise distances between all 5 fingertip landmarks (4, 8, 12, 16, 20).
  2. Track the maximum observed span (thumb-tip to pinky-tip distance).
  3. Normalize against a calibrated baseline span.
- **Output:** `{ currentSpan: number, maxSpan: number, normalizedSpan: number }`.

#### `BPMCounter`
- **Purpose:** Detects repetitive finger tapping and estimates tempo.
- **Algorithm:**
  1. Detect "tap" events: a fingertip's y-velocity crosses a threshold (moving down then up).
  2. Track inter-tap intervals in a circular buffer (last 16 taps).
  3. BPM = `60000 / medianInterval`.
- **Output:** `{ bpm: number, tapCount: number, confidence: number }` — confidence is based on interval consistency.

---

### 3. Integration with Instruments

Dexterity metrics are optional features passed into the Instrument constructor:

```typescript
const piano = new Piano({
  view: new SideViewStrategy(),
  dexterity: [new FingerIndependence(), new HandSpan(), new BPMCounter()],
});
```

#### Instrument Integration Contract
- `Instrument` base class accepts an optional `dexterity: DexterityMetric[]` array.
- On each `validate()` call, if hand landmarks are provided, the instrument iterates through all dexterity metrics and calls `update()`.
- Dexterity results are exposed via `instrument.getDexterityResults()`.
- Dexterity metrics do NOT affect posture validation — they are observational only.

---

## File Locations
- `src/lib/dexterity/types.ts` — HandLandmark, HandFrame, DexterityMetric interface
- `src/lib/dexterity/FingerIndependence.ts` — Finger independence metric
- `src/lib/dexterity/HandSpan.ts` — Hand span metric
- `src/lib/dexterity/BPMCounter.ts` — BPM counter metric
- `src/lib/dexterity/index.ts` — Barrel exports
