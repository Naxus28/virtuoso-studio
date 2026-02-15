import { BaseView } from "./BaseView";
import type { FrontBaseline, ValidateInput, ValidateResult } from "./types";
import { SHOULDER_LEFT, SHOULDER_RIGHT } from "./utils";

const DEFAULT_ASYMMETRY_THRESHOLD_M = 0.02;

/**
 * Front perspective: tension = one shoulder (11/12) significantly higher than the other.
 */
export class FrontView extends BaseView {
  readonly name: string = "Front View";
  readonly perspective = "Front" as const;

  constructor(threshold: number = DEFAULT_ASYMMETRY_THRESHOLD_M) {
    super(threshold);
  }

  validate(input: ValidateInput): ValidateResult {
    const { landmarks, baseline } = input;
    if (landmarks.length < 25) {
      return { isTense: false, feedback: "Good posture" };
    }
    const base = baseline as FrontBaseline;
    const shoulderYLeft = landmarks[SHOULDER_LEFT].y;
    const shoulderYRight = landmarks[SHOULDER_RIGHT].y;
    const asymmetry = Math.abs(shoulderYLeft - shoulderYRight);
    const isTense = asymmetry > this.threshold;
    return {
      isTense,
      feedback: isTense
        ? "Tension detected — one shoulder is higher than the other. Try to level your shoulders."
        : "Good posture",
    };
  }
}
