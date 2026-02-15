import Link from "next/link";
import { Activity, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <p className="text-emerald-400/90 text-sm font-medium tracking-widest uppercase mb-4">
            AI-Powered Music Practice
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance mb-6">
            Perfect Your Posture.
            <br />
            <span className="text-emerald-400">Elevate Your Performance.</span>
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl mb-10 max-w-lg mx-auto">
            Real-time posture feedback so you can focus on the music—not your
            posture. Built for musicians who practice long hours.
          </p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            Launch Studio
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-4 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            Why Virtuoso Studio
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Activity className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time AI Tracking</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Body landmarks tracked live with MediaPipe. See your posture
                skeleton and get instant slouch alerts.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Zap className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Zero Latency</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Everything runs in your browser. No server round-trips—smooth
                feedback at 60fps so you stay in the flow.
              </p>
            </div>
            <div className="flex flex-col items-center text-center group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy-First</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                No video saved or sent. Frames are processed locally; only
                landmark data stays in your browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="py-12 px-4 border-t border-zinc-800/50 text-center">
        <p className="text-zinc-500 text-sm">
          Educational tool only · Not a medical device
        </p>
      </footer>
    </main>
  );
}
