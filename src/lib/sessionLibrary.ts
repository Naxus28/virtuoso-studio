/**
 * Session Library — persist sessions to localStorage with name and view mode.
 */

import type { SessionRecording } from "./SessionRecorder";

export type ViewMode = "front" | "side";

export type StoredSession = {
  id: string;
  name: string;
  viewMode: ViewMode;
  recording: SessionRecording;
  savedAt: number;
};

const STORAGE_KEY = "virtuoso-session-library";

function getStored(): StoredSession[] {
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

function setStored(sessions: StoredSession[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore quota or other errors
  }
}

export function getStoredSessions(): StoredSession[] {
  return getStored();
}

export function saveSession(payload: {
  name: string;
  viewMode: ViewMode;
  recording: SessionRecording;
}): StoredSession {
  const session: StoredSession = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: payload.name.trim() || "Unnamed Session",
    viewMode: payload.viewMode,
    recording: payload.recording,
    savedAt: Date.now(),
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
