import { BaseView } from "./BaseView";
import type { SideBaseline, ValidateInput, ValidateResult } from "./types";
import {
  EAR_LEFT,
  EAR_RIGHT,
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  HIP_LEFT,
  HIP_RIGHT,
  angleEarShoulderHipWorld,
  angleEarShoulderHip2D,
} from "./utils";

const ANGLE_FLOOR_DEG = 145;
const ANGLE_DEVIATION_DEG = 10;

/**
 * Side perspective: tension = head forward (ear-shoulder-hip angle 7-11-23 drops).
 * Uses 2D angle when imageLandmarks provided, else 3D world angle.
 */
export class SideView extends BaseView {
  readonly name: string = "Side View";
  readonly perspective = "Side" as const;

  constructor(thresholdDeg: number = ANGLE_FLOOR_DEG) {
    super(thresholdDeg);
  }

  validate(input: ValidateInput): ValidateResult {
    const { landmarks, baseline, imageLandmarks } = input;
    if (landmarks.length < 25) {
      return { isTense: false, feedback: "Good posture" };
    }
    const base = baseline as SideBaseline;
    const use2D =
      imageLandmarks != null &&
      imageLandmarks.length >= 25 &&
      base.angleLeft2D != null &&
      base.angleRight2D != null;

    let currentAngle: number;
    let baselineAngle: number;
    if (use2D && imageLandmarks) {
      const left2D = angleEarShoulderHip2D(imageLandmarks, EAR_LEFT, SHOULDER_LEFT, HIP_LEFT);
      const right2D = angleEarShoulderHip2D(imageLandmarks, EAR_RIGHT, SHOULDER_RIGHT, HIP_RIGHT);
      currentAngle = (left2D + right2D) / 2;
      baselineAngle = ((base.angleLeft2D ?? base.angleLeft) + (base.angleRight2D ?? base.angleRight)) / 2;
    } else {
      const left = angleEarShoulderHipWorld(
        landmarks[EAR_LEFT],
        landmarks[SHOULDER_LEFT],
        landmarks[HIP_LEFT]
      );
      const right = angleEarShoulderHipWorld(
        landmarks[EAR_RIGHT],
        landmarks[SHOULDER_RIGHT],
        landmarks[HIP_RIGHT]
      );
      currentAngle = (left + right) / 2;
      baselineAngle = (base.angleLeft + base.angleRight) / 2;
    }

    if (Number.isNaN(currentAngle) || Number.isNaN(baselineAngle) || baselineAngle <= 0) {
      return { isTense: false, feedback: "Good posture" };
    }

    const angleThreshold = Math.min(
      this.threshold,
      Math.max(50, baselineAngle - ANGLE_DEVIATION_DEG)
    );
    const isTense = currentAngle < angleThreshold;
    return {
      isTense,
      feedback: isTense
        ? "Tension detected — head forward / slumped. Sit tall and align ear over shoulder."
        : "Good posture",
    };
  }
}
