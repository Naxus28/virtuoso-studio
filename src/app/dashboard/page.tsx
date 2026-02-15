"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Piano, Guitar, LogOut, Play, Trash2 } from "lucide-react";
import { getUser, updateUser, logout } from "@/lib/auth";
import type { FakeUser } from "@/lib/auth";
import { getStoredSessions, deleteSession } from "@/lib/sessionLibrary";
import type { StoredSession } from "@/lib/sessionLibrary";
import type { InstrumentId } from "@/lib/posture-engines/EngineFactory";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(recording: StoredSession["recording"]): string {
  const sec = (recording.stoppedAt - recording.startedAt) / 1000;
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const INSTRUMENTS: { id: InstrumentId; label: string; icon: typeof Piano }[] = [
  { id: "piano", label: "Piano", icon: Piano },
  { id: "guitar", label: "Guitar", icon: Guitar },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<FakeUser | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [ready, setReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StoredSession | null>(null);

  const refresh = useCallback(() => {
    setSessions(getStoredSessions().slice(0, 5));
  }, []);

  useEffect(() => {
    const stored = getUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(stored);
    refresh();
    setReady(true);
  }, [router, refresh]);

  function selectInstrument(id: InstrumentId) {
    if (!user) return;
    const updated = { ...user, instrument: id };
    updateUser(updated);
    setUser(updated);
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteSession(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  }

  if (!ready) return null;

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white">
            {initial}
          </div>
          <p className="text-sm text-zinc-400">
            Hello, <span className="text-zinc-100 font-medium">{user?.name}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-500 hover:text-zinc-100 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Instrument Selector */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Choose Your Instrument</h2>
          <div className="grid grid-cols-2 gap-4">
            {INSTRUMENTS.map(({ id, label, icon: Icon }) => {
              const selected = user?.instrument === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectInstrument(id)}
                  className={`rounded-xl border p-6 flex flex-col items-center gap-3 transition-colors ${
                    selected
                      ? "bg-emerald-600/10 border-emerald-500"
                      : "bg-zinc-900/80 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <Icon
                    size={28}
                    className={selected ? "text-emerald-400" : "text-zinc-400"}
                  />
                  <span
                    className={`text-base font-semibold ${
                      selected ? "text-emerald-400" : "text-zinc-100"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <Link
            href={`/studio`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Launch Studio
          </Link>
        </section>

        {/* Recent Sessions */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Recent Sessions</h2>

          {sessions.length === 0 ? (
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-8 text-center">
              <p className="text-zinc-400 text-sm">
                No sessions yet. Record a session in the Studio to see it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100 truncate">
                      {session.name}
                    </p>
                    <p className="text-zinc-500 text-sm mt-0.5">
                      {(session.view ?? session.viewMode) === "side" ? "Side View" : "Front View"} &middot;{" "}
                      {formatDuration(session.recording)} &middot;{" "}
                      {formatDate(session.savedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/studio?replay=${encodeURIComponent(session.id)}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      <Play size={16} />
                      Replay
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(session)}
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {sessions.length > 0 && (
            <Link
              href="/library"
              className="mt-4 inline-block text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
            >
              View all sessions &rarr;
            </Link>
          )}
        </section>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          sessionName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
