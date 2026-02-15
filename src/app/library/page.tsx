"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, FolderOpen, Piano, Guitar, Activity } from "lucide-react";
import { getStoredSessions, deleteSession, getInstrumentLabel } from "@/lib/sessionLibrary";
import type { StoredSession } from "@/lib/sessionLibrary";
import type { InstrumentId } from "@/lib/posture-engines/EngineFactory";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

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

const INSTRUMENT_ORDER: InstrumentId[] = ["piano", "guitar", "generic"];

function groupSessionsByInstrument(sessions: StoredSession[]): Map<InstrumentId, StoredSession[]> {
  const map = new Map<InstrumentId, StoredSession[]>();
  for (const id of INSTRUMENT_ORDER) {
    map.set(id, []);
  }
  for (const s of sessions) {
    const id = (s.instrument ?? "generic") as InstrumentId;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(s);
  }
  return map;
}

export default function LibraryPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StoredSession | null>(null);

  const refresh = useCallback(() => {
    setSessions(getStoredSessions());
  }, []);

  const byInstrument = useMemo(() => groupSessionsByInstrument(sessions), [sessions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteSession(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 pt-16">
      <Link
        href="/dashboard"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <FolderOpen size={28} className="text-emerald-400" />
        <h1 className="text-2xl font-semibold text-zinc-100">Session Library</h1>
      </div>
      <p className="text-zinc-400 text-sm mb-8">
        Saved sessions from the studio. Replay any session to review your posture.
      </p>

      {sessions.length === 0 ? (
        <div className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-8 text-center max-w-md">
          <p className="text-zinc-400 text-sm">
            No sessions yet. Record a session in the Studio and stop it to save one here.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Play size={16} />
            Open Studio
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-8">
          {INSTRUMENT_ORDER.map((instrumentId) => {
            const list = byInstrument.get(instrumentId) ?? [];
            if (list.length === 0) return null;
            const label = getInstrumentLabel(instrumentId);
            const Icon = instrumentId === "piano" ? Piano : instrumentId === "guitar" ? Guitar : Activity;
            return (
              <section key={instrumentId}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-200 mb-3">
                  <Icon size={20} className="text-emerald-400" />
                  {label}
                </h2>
                <ul className="space-y-3">
                  {list.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-100 truncate">{session.name}</p>
                        <p className="text-zinc-500 text-sm mt-0.5">
                          {(session.viewMode ?? session.view) === "front" ? "Front View" : "Side View"} · {formatDuration(session.recording)} · {formatDate(session.savedAt)}
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
                          className="rounded-lg bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-500 hover:text-zinc-100"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Link
        href="/studio"
        className="mt-8 inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
      >
        <Play size={16} />
        Open Studio
      </Link>

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
