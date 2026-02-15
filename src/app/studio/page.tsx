"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PostureEngine } from "@/components/PostureEngine";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { getUser } from "@/lib/auth";
import type { InstrumentId } from "@/lib/posture-engines/EngineFactory";

function StudioContent() {
  const searchParams = useSearchParams();
  const replayId = searchParams.get("replay");
  const [instrument, setInstrument] = useState<InstrumentId>("generic");

  useEffect(() => {
    const user = getUser();
    if (user?.instrument) setInstrument(user.instrument);
  }, []);

  return (
    <>
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
        >
          <FolderOpen size={18} />
          Session Library
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
        Virtuoso Studio
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Zero-Cost Prototype — Posture feedback
      </p>
      <PostureEngine replayId={replayId} instrument={instrument} />
    </>
  );
}

export default function StudioPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <StudioContent />
      </Suspense>
    </main>
  );
}
