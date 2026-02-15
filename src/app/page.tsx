"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Shield,
  Music,
  Video,
  Crosshair,
  SlidersHorizontal,
  Camera,
  Hand,
} from "lucide-react";
import { getUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [router]);

  useEffect(() => {
    setUser(getUser());
    setChecked(true);
  }, []);

  if (!checked) return null;

  const loggedIn = !!user;
  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Music size={22} className="text-emerald-400" />
          <span className="text-base font-bold">Virtuoso</span>
        </div>
        {loggedIn ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 pl-2 pr-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <span
              className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white"
              aria-hidden
            >
              {initial}
            </span>
            <span>Dashboard</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          >
            Log In
          </Link>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <p className="text-emerald-400/90 text-sm font-medium tracking-widest uppercase mb-4">
            Posture & dexterity training for musicians
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance mb-6">
            Perfect Your Posture.
            <br />
            <span className="text-emerald-400">Sharpen Your Hands.</span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl mb-10 max-w-lg mx-auto">
            Real-time posture monitoring and dexterity training while you
            practice — front and side views, tension and lean alerts, hand and
            finger tracking, session recording and replay, all running privately
            in your browser.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-4 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            Why Virtuoso Studio
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Activity className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Real-time Posture Tracking
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Live skeleton overlay with tension and lean detection. Get
                instant alerts when you slouch or lean forward.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Camera className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Front & Side Views
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Front view tracks shoulder symmetry; side view tracks
                ear-shoulder-hip alignment. Switch by instrument or preference.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Hand className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Dexterity Training
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Hand and finger tracking for dexterity drills. Build coordination
                and technique with feedback that stays in your browser.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Video className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Session Recording & Library
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Record sessions, save them with a name, and replay posture and
                dexterity data from your library to track progress over time.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Crosshair className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Calibration</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Set your ideal posture as a baseline with one click. Alerts
                trigger when you deviate so you can correct in the moment.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy-first</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Everything runs in your browser. No video is saved or sent —
                only landmark data stays on your device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two perspectives */}
      <section className="relative py-24 px-4 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Two Perspectives
          </h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            Choose the view that matches how you sit at your instrument.
          </p>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <SlidersHorizontal className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold">Front View</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Camera faces you. Tension is detected when one shoulder is
                significantly higher than the other — symmetry tracking for
                even shoulders while you play.
              </p>
            </div>
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-700 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold">Side View</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Camera to your side (profile). Tension is detected when the
                ear–shoulder–hip angle drops — head-forward and slumping alert.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 px-4 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Calibrate</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Sit in your ideal playing posture and set it as your baseline
                with one click.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Practice</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Play while Virtuoso tracks your posture and dexterity in real
                time and alerts you to tension, lean, or hand position.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Review</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Replay sessions from your library and review posture and
                dexterity to track progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="relative py-16 px-4 border-t border-zinc-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-700 px-4 py-3 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">Privacy-first</span>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Everything runs in your browser. No video is saved or sent — only
            landmark data stays on your device.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-zinc-800/50 text-center">
        <p className="text-zinc-500 text-sm">
          Educational tool only &middot; Not a medical device
        </p>
      </footer>
    </main>
  );
}
