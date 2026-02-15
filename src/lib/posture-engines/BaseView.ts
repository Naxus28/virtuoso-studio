import type { Perspective } from "./types";
import type { ValidateInput, ValidateResult } from "./types";

/**
 * Abstract base for posture validation engines.
 * Subclasses implement perspective-specific logic (symmetry for Front, angle for Side).
 */
export abstract class BaseView {
  abstract readonly name: string;
  abstract readonly perspective: Perspective;
  /** Threshold in view-specific units (e.g. meters for asymmetry, degrees for angle). */
  threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Validates current posture against the calibrated baseline.
   * @returns { isTense: boolean, feedback: string }
   */
  abstract validate(input: ValidateInput): ValidateResult;
}
