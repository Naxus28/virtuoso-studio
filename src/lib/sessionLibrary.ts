/**
 * Session Library — persist sessions to localStorage with full engine configuration.
 *
 * Extends the legacy schema (name + viewMode) with instrument, view strategy,
 * sensitivity, baseline snapshot, and optional hand recording. Legacy sessions
 * are migrated transparently on read.
 */

import type { SessionRecording } from "./SessionRecorder";
import type { Baseline } from "./posture-engines/types";
import type { InstrumentId, ViewId } from "./posture-engines/EngineFactory";
import type { Sensitivity } from "./posture-engines/Instruments";
import type { HandFrame } from "./dexterity/types";

/** Display labels for instruments (dashboard tags, library section headers). */
export const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  piano: "Piano",
  guitar: "Guitar",
  generic: "General",
};

export function getInstrumentLabel(instrument: InstrumentId): string {
  return INSTRUMENT_LABELS[instrument] ?? "General";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** @deprecated Use `view` field instead. Kept for backward compatibility. */
export type ViewMode = "front" | "side";

export interface HandRecording {
  frames: HandFrame[];
  startedAt: number;
  stoppedAt: number;
}

export interface StoredSession {
  id: string;
  name: string;
  savedAt: number;

  // Engine configuration
  instrument: InstrumentId;
  view: ViewId;
  sensitivity: Sensitivity;

  // Skeletal data
  recording: SessionRecording;

  // Dexterity data (optional)
  handRecording?: HandRecording;

  // Baseline snapshot for replay calibration
  baseline: Baseline;

  /** @deprecated Kept for backward compatibility. Use `view` instead. */
  viewMode?: ViewMode;

  /** Display value for review (e.g. 12 for "12% shrink"). */
  sensitivityPercent?: number;
}

// ---------------------------------------------------------------------------
// Legacy detection & migration
// ---------------------------------------------------------------------------

/** Shape of sessions saved before the schema extension. */
interface LegacySession {
  id: string;
  name: string;
  viewMode: ViewMode;
  recording: SessionRecording;
  savedAt: number;
  // New fields may be absent
  instrument?: undefined;
  view?: undefined;
}

function isLegacy(s: StoredSession | LegacySession): s is LegacySession {
  return (s as LegacySession).instrument === undefined;
}

function migrate(s: LegacySession): StoredSession {
  const viewId: ViewId = s.viewMode === "side" ? "side" : "front";
  return {
    ...s,
    instrument: "generic",
    view: viewId,
    sensitivity: "medium",
    baseline: {} as Baseline,
    // Keep legacy field for components that still read it
    viewMode: s.viewMode,
  };
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "virtuoso-session-library";

function getRaw(): (StoredSession | LegacySession)[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStored(): StoredSession[] {
  return getRaw().map((s) => (isLegacy(s) ? migrate(s) : s));
}

function setStored(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore quota or other errors
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getStoredSessions(): StoredSession[] {
  return getStored();
}

/**
 * Save a session with full engine configuration.
 *
 * Also accepts the legacy `{ name, viewMode, recording }` shape for backward
 * compatibility — missing fields are backfilled with defaults.
 */
export function saveSession(payload: {
  name: string;
  recording: SessionRecording;
  instrument?: InstrumentId;
  view?: ViewId;
  sensitivity?: Sensitivity;
  baseline?: Baseline;
  handRecording?: HandRecording;
  /** @deprecated Pass `view` instead. */
  viewMode?: ViewMode;
  /** For review UI: e.g. 12 for "12% shrink". */
  sensitivityPercent?: number;
}): StoredSession {
  const viewId: ViewId =
    payload.view ?? (payload.viewMode === "side" ? "side" : "front");

  const session: StoredSession = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: payload.name.trim() || "Unnamed Session",
    instrument: payload.instrument ?? "generic",
    view: viewId,
    sensitivity: payload.sensitivity ?? "medium",
    baseline: payload.baseline ?? ({} as Baseline),
    recording: payload.recording,
    handRecording: payload.handRecording,
    savedAt: Date.now(),
    // Keep legacy field so existing UI components don't break
    viewMode: viewId === "side" ? "side" : "front",
    sensitivityPercent: payload.sensitivityPercent,
  };

  const sessions = getStored();
  sessions.unshift(session);
  setStored(sessions);
  return session;
}

export function getSessionById(id: string): StoredSession | null {
  return getStored().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string): void {
  setStored(getStored().filter((s) => s.id !== id));
}
