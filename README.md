# Virtuoso Studio — Zero-Cost Prototype

AI-powered posture feedback for practice. This prototype uses your webcam and runs **100% in the browser** with no video storage or server-side processing.

## What it does

- **Live webcam** with a 2D pose skeleton overlay
- **Calibrate** your “good” posture (ear–shoulder vertical distance is saved as a baseline)
- **Slouch detection** when that distance drops by 15% or more → skeleton turns **red** and a **Tension Alert** appears
- **Green** skeleton when posture is within range
- **Educational Tool Only** disclaimer shown on the overlay (not a medical device)

## Prerequisites

- Node.js 18+
- A browser with webcam access (Chrome, Edge, or Safari recommended)

## Setup

```bash
# Install dependencies
npm install

# Run the dev server (with Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), allow camera access when prompted, and you’re ready.

## How to use

1. Sit in frame so your upper body and face are visible.
2. Sit in a **good posture** and click **Calibrate** to set the baseline.
3. Keep practicing; the skeleton stays **green** when posture is good.
4. If you slouch (ear–shoulder distance shrinks by 15%+), the skeleton turns **red** and **Tension Alert** appears.

## Tech stack

- **Next.js 15** (App Router), **TypeScript**, **Tailwind CSS**
- **react-webcam** — live camera feed
- **@mediapipe/pose** — body landmarks (client-side only, no video sent to servers)
- **framer-motion** — UI feedback; **lucide-react** — icons
- **State** — local React state only (no database in this prototype)

## Project structure

```
src/
  app/           # Next.js App Router (layout, page, globals)
  components/
    PostureEngine.tsx   # Webcam, MediaPipe Pose, calibration, slouch logic, skeleton overlay
```

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server (Turbopack) |
| `npm run build`| Production build         |
| `npm run start`| Run production server    |
| `npm run lint` | Run ESLint               |

## Privacy & disclaimer

- **Privacy:** Video is processed only in your browser. No frames or video are stored or transmitted.
- **Disclaimer:** This is an educational prototype only and is not a medical or clinical device.

---

*Virtuoso Studio — Prototyping Phase · [virtuosostudio.vercel.app](https://virtuosostudio.vercel.app) (pending)*
