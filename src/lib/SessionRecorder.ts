/**
 * SessionRecorder — stores MediaPipe landmark coordinates and posture quality per frame.
 * No video; only the math (landmarks + quality) for replay and stats.
 */

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

export type SessionFrame = {
  timestamp: number;
  landmarks: Landmark[];
  /** 0 = worst slouch, 1 = good posture (e.g. min(1, earShoulderDist / baseline)) */
  quality: number;
};

export type SessionRecording = {
  frames: SessionFrame[];
  width: number;
  height: number;
  startedAt: number;
  stoppedAt: number;
};

export class SessionRecorder {
  private frames: SessionFrame[] = [];
  private width = 640;
  private height = 480;
  private startedAt = 0;
  private isRecording = false;

  start(width = 640, height = 480): void {
    this.frames = [];
    this.width = width;
    this.height = height;
    this.startedAt = Date.now();
    this.isRecording = true;
  }

  stop(): SessionRecording {
    this.isRecording = false;
    return this.getRecording();
  }

  addFrame(timestampMs: number, landmarks: Landmark[], quality: number): void {
    if (!this.isRecording || landmarks.length === 0) return;
    this.frames.push({
      timestamp: timestampMs,
      landmarks: landmarks.map((lm) => ({ ...lm })),
      quality,
    });
  }

  getRecording(): SessionRecording {
    return {
      frames: [...this.frames],
      width: this.width,
      height: this.height,
      startedAt: this.startedAt,
      stoppedAt: Date.now(),
    };
  }

  get history(): SessionFrame[] {
    return [...this.frames];
  }

  get recording(): boolean {
    return this.isRecording;
  }
}
