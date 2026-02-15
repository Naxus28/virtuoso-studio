# Skill: posture-orchestrator

## Purpose
Implements the Strategy-based posture detection architecture for Virtuoso Studio. Decouples **Views** (the math/geometry layer) from **Instruments** (the rules/filtering layer) using composition over inheritance.

---

## Level 2 Instructions

### 1. View Strategies (The Math Layer)

The `ViewStrategy` interface is the core abstraction for all geometric posture analysis. Each strategy encapsulates a single perspective's math — no instrument-specific logic belongs here.

#### Interface: `ViewStrategy`
```typescript
interface ViewStrategy {
  readonly name: string;
  readonly perspective: 'front' | 'side';
  validate(landmarks: WorldLandmark[], baseline: Baseline, imageLandmarks?: ImageLandmark[]): ViewResult;
}
```

#### `FrontViewStrategy`
- **Focus:** Horizontal shoulder symmetry and leveling.
- **Math:** Compare `landmarks[11].y` vs `landmarks[12].y` (left/right shoulders in world coordinates).
- **Threshold:** Asymmetry in meters (default `0.02m`). If `|shoulderYLeft - shoulderYRight| > threshold`, report tension.
- **Feedback:** "One shoulder is higher than the other. Try to level your shoulders."

#### `SideViewStrategy`
- **Focus:** 3-point angle — Ear (7/8) → Shoulder (11/12) → Hip (23/24).
- **Math:** Compute angle at the shoulder vertex. Use 2D image landmarks when available (more stable), fall back to 3D world landmarks.
- **Threshold:** Angle floor in degrees (default `145°`). Also applies a `baselineAngle - 10°` deviation check.
- **Feedback:** "Head forward / slumped. Sit tall and align ear over shoulder."

#### `AutoDetectStrategy`
- **Focus:** Analyze the first 30 frames to determine whether the user is facing front or side.
- **Detection logic:**
  1. Compute `shoulderWidthRatio = |shoulder_left.x - shoulder_right.x| / frameWidth`.
  2. If ratio > 0.15 consistently (shoulders spread wide), suggest `FrontViewStrategy`.
  3. If ratio < 0.10 consistently (shoulders stacked/narrow), suggest `SideViewStrategy`.
  4. Check visibility scores of ear landmarks — if one ear has consistently low visibility, likely a side view.
- **Behavior:** Buffers 30 frames internally, then delegates to the resolved strategy for all subsequent calls.
- **Fallback:** If inconclusive after 30 frames, default to `FrontViewStrategy`.

---

### 2. Instrument Context (The Rules Layer)

Instruments compose a `ViewStrategy` and layer instrument-specific filtering rules on top.

#### Base Class: `Instrument`
```typescript
abstract class Instrument {
  readonly name: string;
  protected view: ViewStrategy;
  protected sensitivity: Sensitivity;

  constructor(config: { view: ViewStrategy; sensitivity?: Sensitivity });

  validate(input: ValidateInput): ValidateResult;

  // Subclasses override to suppress/modify alerts
  protected applyFilters(result: ViewResult, landmarks: WorldLandmark[], baseline: Baseline): ViewResult;
}
```

#### Composition Pattern
```typescript
const piano = new Piano({ view: new SideViewStrategy() });
const guitar = new Guitar({ view: new FrontViewStrategy() });
const custom = new Piano({ view: new AutoDetectStrategy() }); // auto-resolve then apply piano rules
```

#### `Piano` Instrument
- **Default view:** `SideViewStrategy`
- **Filter:** `applyFilters()` checks wrist-shoulder distance. If wrists are extended beyond `1.05×` baseline distance, suppress tension alerts (pianist reaching for keys, not shrugging).
- **Landmark indices:** Wrists (15/16), Shoulders (11/12).

#### `Guitar` Instrument
- **Default view:** `FrontViewStrategy`
- **Filter:** `applyFilters()` is a passthrough (no overrides). Ready for future rules (e.g., allowing asymmetric shoulder positioning for classical guitar hold).

#### `applyFilters()` Contract
- Receives the raw `ViewResult` from the strategy.
- Returns a (possibly modified) `ViewResult`.
- Must never make the result *worse* — filters only suppress false positives.
- Default implementation in base class: passthrough (return input unchanged).

---

### 3. EngineFactory

Provide a static factory for ergonomic instantiation:
```typescript
const engine = EngineFactory.create('piano', { view: 'side', sensitivity: 'medium' });
```

- Maps string identifiers to concrete classes.
- Maps view strings (`'front'`, `'side'`, `'auto'`) to `ViewStrategy` instances.
- Maps sensitivity strings to numeric thresholds.
- Returns an `Instrument` instance ready for `validate()` calls.

---

## File Locations
- `src/lib/posture-engines/ViewStrategies.ts` — ViewStrategy interface + FrontViewStrategy, SideViewStrategy, AutoDetectStrategy
- `src/lib/posture-engines/Instruments.ts` — Instrument base class + Piano, Guitar
- `src/lib/posture-engines/EngineFactory.ts` — Factory with string-based creation
