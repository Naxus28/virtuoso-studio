/**
 * EngineFactory — ergonomic creation of fully-configured Instrument instances.
 *
 * Usage:
 *   const engine = EngineFactory.create('piano', { view: 'side', sensitivity: 'medium' });
 *   const result = engine.validate({ landmarks, baseline });
 */

import type { ViewStrategy } from "./ViewStrategies";
import {
  FrontViewStrategy,
  SideViewStrategy,
  AutoDetectStrategy,
} from "./ViewStrategies";
import type { Sensitivity } from "./Instruments";
import { Piano, Guitar, Generic, Instrument } from "./Instruments";

// Legacy imports for getEngine backward compat
import type { BaseView } from "./BaseView";
import { FrontView } from "./FrontView";
import { SideView } from "./SideView";
import { PianoView } from "./PianoView";
import { GuitarView } from "./GuitarView";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Legacy factory (backward compat — prefer EngineFactory.create)
// ---------------------------------------------------------------------------

export type LegacyEngineId = "piano" | "guitar" | "front" | "side";

/** @deprecated Use EngineFactory.create() instead. */
export function getEngine(id: string): BaseView {
  const key = id.toLowerCase().trim() as LegacyEngineId;
  switch (key) {
    case "piano":
      return new PianoView();
    case "guitar":
      return new GuitarView();
    case "front":
      return new FrontView();
    case "side":
      return new SideView();
    default:
      return new FrontView();
  }
}

export type InstrumentId = "piano" | "guitar" | "generic";
export type ViewId = "front" | "side" | "auto";

export interface EngineOptions {
  view?: ViewId;
  sensitivity?: Sensitivity;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildView(id: ViewId): ViewStrategy {
  switch (id) {
    case "front":
      return new FrontViewStrategy();
    case "side":
      return new SideViewStrategy();
    case "auto":
      return new AutoDetectStrategy();
  }
}

/** Default view per instrument when the caller doesn't specify. */
const DEFAULT_VIEW: Record<InstrumentId, ViewId> = {
  piano: "side",
  guitar: "front",
  generic: "front",
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export class EngineFactory {
  /**
   * Create a fully-configured Instrument.
   *
   * @param instrument - The instrument identifier.
   * @param options    - Optional view and sensitivity overrides.
   * @returns A ready-to-use Instrument instance.
   *
   * @example
   * ```ts
   * const engine = EngineFactory.create('piano', { view: 'side', sensitivity: 'medium' });
   * ```
   */
  static create(
    instrument: InstrumentId,
    options: EngineOptions = {},
  ): Instrument {
    const viewId = options.view ?? DEFAULT_VIEW[instrument];
    const view = buildView(viewId);
    const sensitivity = options.sensitivity ?? "medium";

    switch (instrument) {
      case "piano":
        return new Piano({ view, sensitivity });
      case "guitar":
        return new Guitar({ view, sensitivity });
      case "generic":
        return new Generic({ view, sensitivity });
    }
  }
}
