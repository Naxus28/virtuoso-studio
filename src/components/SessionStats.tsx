"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { SessionRecording } from "@/lib/SessionRecorder";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: "Posture Quality Over Time",
      color: "#e4e4e7",
      font: { size: 16 },
    },
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.06)" },
      ticks: { color: "#a1a1aa", maxTicksLimit: 12 },
      title: { display: true, text: "Time", color: "#a1a1aa" },
    },
    y: {
      min: 0,
      max: 1,
      grid: { color: "rgba(255,255,255,0.06)" },
      ticks: { color: "#a1a1aa" },
      title: { display: true, text: "Quality (1 = good)", color: "#a1a1aa" },
    },
  },
};

type SessionStatsProps = {
  recording: SessionRecording | null;
};

export function SessionStats({ recording }: SessionStatsProps) {
  if (!recording || recording.frames.length === 0) {
    return (
      <div className="w-full max-w-2xl h-64 rounded-xl bg-zinc-900/80 border border-zinc-700 flex items-center justify-center text-zinc-500 text-sm">
        No session data. Start a session and stop it to see the graph.
      </div>
    );
  }

  const labels = recording.frames.map((_, i) => {
    const t = (recording.frames[i].timestamp - recording.frames[0].timestamp) / 1000;
    return `${t.toFixed(0)}s`;
  });
  const data = recording.frames.map((f) => f.quality);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Posture Quality",
        data,
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  return (
    <div className="w-full max-w-2xl h-64 rounded-xl bg-zinc-900/80 border border-zinc-700 p-4">
      <Line data={chartData} options={options} />
    </div>
  );
}
