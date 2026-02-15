"use client";

import { PostureEngine } from "@/components/PostureEngine";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function StudioPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
      >
        <ArrowLeft size={18} />
        Back to home
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
        Virtuoso Studio
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Zero-Cost Prototype — Posture feedback
      </p>
      <PostureEngine />
    </main>
  );
}
