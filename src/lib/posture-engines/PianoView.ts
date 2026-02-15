import { SideView } from "./SideView";
import type { SideBaseline, ValidateInput, ValidateResult } from "./types";
import { WRIST_LEFT, WRIST_RIGHT, SHOULDER_LEFT, SHOULDER_RIGHT, dist3 } from "./utils";

/** When wrist–shoulder distance exceeds baseline by this ratio, treat as "arms extended" (e.g. reaching for keys) and ignore tension. */
const PIANIST_EXTENSION_RATIO = 1.05;

/**
 * Piano perspective: extends SideView (angle 7-11-23).
 * Overrides validate to ignore tension when wrists are extended (reaching for keys — not a shrug to flag).
 */
export class PianoView extends SideView {
  readonly name = "Piano View";
  override readonly perspective = "Side" as const;

  override validate(input: ValidateInput): ValidateResult {
    const { landmarks, baseline } = input;
    if (landmarks.length < 25) {
      return { isTense: false, feedback: "Good posture" };
    }
    const base = baseline as SideBaseline;
    const baseLeft = base.wristShoulderDistLeft ?? 0;
    const baseRight = base.wristShoulderDistRight ?? 0;
    const avgBase = (baseLeft + baseRight) / 2;
    if (avgBase >= 1e-6) {
      const nowLeft = dist3(landmarks[WRIST_LEFT], landmarks[SHOULDER_LEFT]);
      const nowRight = dist3(landmarks[WRIST_RIGHT], landmarks[SHOULDER_RIGHT]);
      const avgNow = (nowLeft + nowRight) / 2;
      if (avgNow > avgBase * PIANIST_EXTENSION_RATIO) {
        return { isTense: false, feedback: "Good posture" };
      }
    }
    return super.validate(input);
  }
}
