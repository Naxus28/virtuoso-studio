/**
 * Instruments — The Rules Layer.
 *
 * Each Instrument composes a ViewStrategy and layers instrument-specific
 * filtering on top. Filters only ever suppress false positives; they never
 * make a result worse.
 */

import type {
  WorldLandmark,
  ImageLandmark,
  Baseline,
  SideBaseline,
  ValidateInput,
  ValidateResult,
} from "./types";
import type { ViewStrategy, ViewResult } from "./ViewStrategies";
import { FrontViewStrategy, SideViewStrategy } from "./ViewStrategies";
import {
  WRIST_LEFT,
  WRIST_RIGHT,
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  dist3,
} from "./utils";
import type { DexterityMetric } from "../dexterity/types";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Sensitivity = "low" | "medium" | "high";

export interface InstrumentConfig {
  view: ViewStrategy;
  sensitivity?: Sensitivity;
  /** Optional dexterity metrics — observational only, never affect posture. */
  dexterity?: DexterityMetric[];
}

/** Maps sensitivity labels to a multiplier applied to the view's threshold. */
const SENSITIVITY_MULTIPLIER: Record<Sensitivity, number> = {
  low: 1.25,   // more forgiving
  medium: 1.0, // default
  high: 0.75,  // stricter
};

// ---------------------------------------------------------------------------
// Base Instrument
// ---------------------------------------------------------------------------

export abstract class Instrument {
  abstract readonly name: string;
  protected readonly view: ViewStrategy;
  protected readonly sensitivity: Sensitivity;
  protected readonly sensitivityMultiplier: number;
  private readonly dexterityMetrics: DexterityMetric[];

  constructor(config: InstrumentConfig) {
    this.view = config.view;
    this.sensitivity = config.sensitivity ?? "medium";
    this.sensitivityMultiplier = SENSITIVITY_MULTIPLIER[this.sensitivity];
    this.dexterityMetrics = config.dexterity ?? [];
  }

  /** The perspective in use (delegated from the composed ViewStrategy). */
  get perspective(): "front" | "side" {
    return this.view.perspective;
  }

  /** The strategy name for display / serialization. */
  get viewName(): string {
    return this.view.name;
  }

  /**
   * Full validation pipeline:
   *   ViewStrategy.validate → applyFilters → ValidateResult
   *
   * If `input.handFrames` are provided, dexterity metrics are updated
   * as a side-effect (they never influence the posture result).
   */
  validate(input: ValidateInput): ValidateResult {
    const { landmarks, baseline, imageLandmarks, handFrames } = input;

    // Drive dexterity metrics (observational only).
    if (handFrames && handFrames.length > 0) {
      for (const frame of handFrames) {
        for (const metric of this.dexterityMetrics) {
          metric.update(frame);
        }
      }
    }

    const raw = this.view.validate(landmarks, baseline, imageLandmarks);
    const filtered = this.applyFilters(raw, landmarks, baseline);
    return { isTense: filtered.isTense, feedback: filtered.feedback };
  }

  /** Retrieve current results from all composed dexterity metrics. */
  getDexterityResults(): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    for (const metric of this.dexterityMetrics) {
      results[metric.name] = metric.getResult();
    }
    return results;
  }

  /** Reset all dexterity metrics. */
  resetDexterity(): void {
    for (const metric of this.dexterityMetrics) {
      metric.reset();
    }
  }

  /**
   * Override in subclasses to suppress false positives.
   * Default: passthrough.
   */
  protected applyFilters(
    result: ViewResult,
    _landmarks: WorldLandmark[],
    _baseline: Baseline,
  ): ViewResult {
    return result;
  }
}

// ---------------------------------------------------------------------------
// Piano
// ---------------------------------------------------------------------------

/** Wrist extension beyond this ratio of baseline suppresses tension alerts. */
const PIANIST_EXTENSION_RATIO = 1.05;

export class Piano extends Instrument {
  readonly name = "Piano";

  constructor(config?: Partial<InstrumentConfig>) {
    super({
      view: config?.view ?? new SideViewStrategy(),
      sensitivity: config?.sensitivity,
      dexterity: config?.dexterity,
    });
  }

  protected override applyFilters(
    result: ViewResult,
    landmarks: WorldLandmark[],
    baseline: Baseline,
  ): ViewResult {
    if (!result.isTense || landmarks.length < 25) return result;

    const base = baseline as SideBaseline;
    const baseLeft = base.wristShoulderDistLeft ?? 0;
    const baseRight = base.wristShoulderDistRight ?? 0;
    const avgBase = (baseLeft + baseRight) / 2;

    if (avgBase < 1e-6) return result;

    const nowLeft = dist3(landmarks[WRIST_LEFT], landmarks[SHOULDER_LEFT]);
    const nowRight = dist3(landmarks[WRIST_RIGHT], landmarks[SHOULDER_RIGHT]);
    const avgNow = (nowLeft + nowRight) / 2;

    // Wrists extended beyond baseline → pianist reaching for keys, not shrugging.
    if (avgNow > avgBase * PIANIST_EXTENSION_RATIO) {
      return { isTense: false, feedback: "Good posture" };
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Guitar
// ---------------------------------------------------------------------------

export class Guitar extends Instrument {
  readonly name = "Guitar";

  constructor(config?: Partial<InstrumentConfig>) {
    super({
      view: config?.view ?? new FrontViewStrategy(),
      sensitivity: config?.sensitivity,
      dexterity: config?.dexterity,
    });
  }

  // Passthrough — no instrument-specific overrides yet.
  // Ready for future rules (e.g. allowing asymmetric shoulders for classical hold).
}

// ---------------------------------------------------------------------------
// Generic (no instrument-specific rules)
// ---------------------------------------------------------------------------

export class Generic extends Instrument {
  readonly name = "Generic";

  constructor(config?: Partial<InstrumentConfig>) {
    super({
      view: config?.view ?? new FrontViewStrategy(),
      sensitivity: config?.sensitivity,
      dexterity: config?.dexterity,
    });
  }
}
