/**
 * Instruments — The Rules Layer.
 *
 * Each Instrument composes a ViewStrategy and layers instrument-specific
 * filtering on top. Filters only ever suppress false positives; they never
 * make a result worse.
 *
 * Each instrument provides its own PostureThresholds (merged with defaults).
 * ViewStrategies use these thresholds instead of global constants.
 */

import type {
  WorldLandmark,
  Baseline,
  SideBaseline,
  ValidateInput,
  ValidateResult,
  PostureThresholds,
} from "./types";
import type { ViewStrategy, ViewResult } from "./ViewStrategies";
import { FrontViewStrategy, SideViewStrategy } from "./ViewStrategies";
import {
  WRIST_LEFT,
  WRIST_RIGHT,
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  dist3,
  DEFAULT_THRESHOLDS,
} from "./utils";
import type { DexterityMetric } from "../dexterity/types";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface InstrumentConfig {
  view: ViewStrategy;
  sensitivity?: number;
  /** Optional instrument-specific threshold overrides. */
  thresholds?: Partial<PostureThresholds>;
  /** Optional dexterity metrics — observational only, never affect posture. */
  dexterity?: DexterityMetric[];
}

// ---------------------------------------------------------------------------
// Base Instrument
// ---------------------------------------------------------------------------

export abstract class Instrument {
  abstract readonly name: string;
  protected readonly view: ViewStrategy;
  readonly thresholds: PostureThresholds;
  private readonly sensitivityValue: number;
  private readonly dexterityMetrics: DexterityMetric[];

  constructor(config: InstrumentConfig) {
    this.view = config.view;
    this.sensitivityValue = config.sensitivity ?? 50;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
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
   */
  validate(input: ValidateInput): ValidateResult {
    const { landmarks, baseline, imageLandmarks, handFrames } = input;
    const sensitivity = input.sensitivity ?? this.sensitivityValue;

    // Drive dexterity metrics (observational only).
    if (handFrames && handFrames.length > 0) {
      for (const frame of handFrames) {
        for (const metric of this.dexterityMetrics) {
          metric.update(frame);
        }
      }
    }

    const raw = this.view.validate(
      landmarks,
      baseline,
      imageLandmarks,
      sensitivity,
      this.thresholds,
    );
    const filtered = this.applyFilters(raw, landmarks, baseline);
    return {
      leanRaw: filtered.leanRaw,
      tensionRaw: filtered.tensionRaw,
      isShrug: filtered.isShrug,
      quality: filtered.quality,
      feedback: filtered.feedback,
    };
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
      thresholds: config?.thresholds,
      dexterity: config?.dexterity,
    });
  }

  protected override applyFilters(
    result: ViewResult,
    landmarks: WorldLandmark[],
    baseline: Baseline,
  ): ViewResult {
    let filtered = { ...result };

    // Whole-body lean is normal piano playing posture — suppress leanRaw.
    // The SideViewStrategy only sets leanRaw when the body tilts as a unit
    // (ear-shoulder distance stable), so head-forward/neck-curve are already
    // reported as tensionRaw and won't be suppressed here.
    if (filtered.leanRaw) {
      filtered.leanRaw = false;
      if (!filtered.tensionRaw) {
        filtered.feedback = "Good posture";
      }
    }

    // Wrists extended beyond baseline → pianist reaching for keys, not shrugging.
    if (filtered.tensionRaw && landmarks.length >= 25) {
      const base = baseline as SideBaseline;
      const baseLeft = base.wristShoulderDistLeft ?? 0;
      const baseRight = base.wristShoulderDistRight ?? 0;
      const avgBase = (baseLeft + baseRight) / 2;

      if (avgBase >= 1e-6) {
        const nowLeft = dist3(landmarks[WRIST_LEFT], landmarks[SHOULDER_LEFT]);
        const nowRight = dist3(landmarks[WRIST_RIGHT], landmarks[SHOULDER_RIGHT]);
        const avgNow = (nowLeft + nowRight) / 2;

        if (avgNow > avgBase * PIANIST_EXTENSION_RATIO) {
          filtered = {
            ...filtered,
            tensionRaw: false,
            feedback: "Good posture",
          };
        }
      }
    }

    return filtered;
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
      thresholds: config?.thresholds,
      dexterity: config?.dexterity,
    });
  }
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
      thresholds: config?.thresholds,
      dexterity: config?.dexterity,
    });
  }
}
