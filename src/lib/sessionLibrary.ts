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
/** Legacy sessions used string labels; new sessions use numeric 0-100. */
type Sensitivity = "low" | "medium" | "high" | number;
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

type SetStoredResult = { ok: true } | { ok: false; error: string };

function setStored(sessions: StoredSession[]): SetStoredResult {
  if (typeof window === "undefined") return { ok: false, error: "Storage not available." };
  try {
    const json = JSON.stringify(sessions);
    const sizeMB = (json.length * 2) / (1024 * 1024); // rough UTF-16 estimate
    window.localStorage.setItem(STORAGE_KEY, json);
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const isQuota =
      err.name === "QuotaExceededError" ||
      (typeof DOMException !== "undefined" && err instanceof DOMException && err.code === 22);
    if (isQuota) {
      // Try to estimate the size of the latest session
      const latestSize = sessions.length > 0
        ? ((JSON.stringify(sessions[0]).length * 2) / (1024 * 1024)).toFixed(1)
        : "?";
      return {
        ok: false,
        error: `Storage full — this session is ~${latestSize} MB. Delete old sessions in Library to free space, or shorten recordings.`,
      };
    }
    return {
      ok: false,
      error: `Storage error: ${err.message}. Check browser settings or try a different browser.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getStoredSessions(): StoredSession[] {
  return getStored();
}

export type SaveSessionResult =
  | { ok: true; session: StoredSession }
  | { ok: false; error: string };

/**
 * Save a session with full engine configuration.
 *
 * Returns { ok, session } on success or { ok: false, error } if storage fails
 * (e.g. quota exceeded, private browsing). Callers should only clear in-memory
 * state after ok: true.
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
}): SaveSessionResult {
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
    viewMode: viewId === "side" ? "side" : "front",
    sensitivityPercent: payload.sensitivityPercent,
  };

  const sessions = getStored();
  sessions.unshift(session);
  const written = setStored(sessions);
  if (!written.ok) {
    return {
      ok: false,
      error: written.error,
    };
  }
  return { ok: true, session };
}

export function getSessionById(id: string): StoredSession | null {
  return getStored().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string): void {
  setStored(getStored().filter((s) => s.id !== id));
}
