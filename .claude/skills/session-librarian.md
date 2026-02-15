# Skill: session-librarian

## Purpose
Standardizes session persistence and implements replay mode for Virtuoso Studio. Ensures that saved sessions capture the full Instrument/View configuration so they can be faithfully re-instantiated for historical data processing.

---

## Level 2 Instructions

### 1. Storage Schema

#### Standardized `localStorage` Schema

Extend the existing `StoredSession` type to capture the full engine configuration:

```typescript
interface StoredSession {
  id: string;
  name: string;
  savedAt: number;

  // Engine configuration (new fields)
  instrument: InstrumentId;        // 'piano' | 'guitar' | 'generic'
  view: ViewId;                    // 'front' | 'side' | 'auto'
  sensitivity: Sensitivity;        // 'low' | 'medium' | 'high'

  // Skeletal data
  recording: SessionRecording;

  // Dexterity data (optional)
  handRecording?: HandRecording;

  // Baseline snapshot (for replay calibration)
  baseline: Baseline;
}
```

#### `HandRecording` Type
```typescript
interface HandRecording {
  frames: HandFrame[];
  startedAt: number;
  stoppedAt: number;
}
```

#### Migration
- The `STORAGE_KEY` remains `"virtuoso-session-library"`.
- On read, detect legacy sessions (those missing `instrument`/`view` fields) and backfill defaults:
  - `instrument`: `'generic'`
  - `view`: infer from existing `viewMode` field (`'front'` or `'side'`)
  - `sensitivity`: `'medium'`
  - `baseline`: empty object (replay will skip validation)
- The legacy `viewMode` field is kept for backward compatibility but is deprecated.

---

### 2. Replay Mode

#### `ReplayMode` Class
```typescript
class ReplayMode {
  private instrument: Instrument;
  private frameIndex: number;
  private recording: SessionRecording;

  constructor(session: StoredSession);

  // Re-instantiates the exact Instrument/View combination from the stored config
  private buildEngine(session: StoredSession): Instrument;

  // Process the next frame and return the validation result
  nextFrame(): { frame: SessionFrame; result: ValidateResult; progress: number } | null;

  // Process all frames and return aggregate results
  processAll(): ReplayResults;

  // Seek to a specific frame index
  seek(frameIndex: number): void;

  // Reset to frame 0
  reset(): void;
}
```

#### `ReplayResults` Type
```typescript
interface ReplayResults {
  totalFrames: number;
  tensionFrames: number;
  tensionPercentage: number;
  qualityOverTime: number[];         // quality value per frame
  alertTimestamps: number[];         // timestamps where tension was detected
  averageQuality: number;
}
```

#### Replay Behavior
1. `constructor` calls `buildEngine()` which uses `EngineFactory.create(session.instrument, { view: session.view, sensitivity: session.sensitivity })`.
2. The stored `baseline` is passed to every `validate()` call during replay.
3. `nextFrame()` advances one frame at a time — suitable for animated playback.
4. `processAll()` iterates all frames synchronously — suitable for generating stats.
5. If the session has no baseline (legacy), replay skips validation and returns quality from the stored frame data only.

---

### 3. Save Workflow

When saving a session, the caller must provide:
```typescript
saveSession({
  name: string;
  instrument: InstrumentId;
  view: ViewId;
  sensitivity: Sensitivity;
  baseline: Baseline;
  recording: SessionRecording;
  handRecording?: HandRecording;
});
```

The library function generates the `id` and `savedAt` fields automatically.

---

## File Locations
- `src/lib/sessionLibrary.ts` — Extended storage functions (save, load, delete, migrate)
- `src/lib/ReplayMode.ts` — ReplayMode class and ReplayResults type
