/**
 * Fake auth utilities — localStorage-based stub.
 * Will be swapped for real authentication later.
 */

import type { InstrumentId } from "./posture-engines/EngineFactory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FakeUser {
  email: string;
  name: string;
  instrument: InstrumentId;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "virtuoso-auth-user";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** "Log in" — any email/password combo works. */
export function login(email: string, _password: string): FakeUser {
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim() || "Musician";
  const user: FakeUser = { email, name, instrument: "piano" };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

/** Clear the stored user. */
export function logout(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/** Return the stored user or null. */
export function getUser(): FakeUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FakeUser;
  } catch {
    return null;
  }
}

/** Persist an updated user object (e.g. after changing instrument). */
export function updateUser(user: FakeUser): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}
