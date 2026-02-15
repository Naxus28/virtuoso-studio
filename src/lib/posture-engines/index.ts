// Legacy class-based engines (kept for backward compatibility)
export { BaseView } from "./BaseView";
export { FrontView } from "./FrontView";
export { SideView } from "./SideView";
export { PianoView } from "./PianoView";
export { GuitarView } from "./GuitarView";
export { getEngine } from "./EngineFactory";

// New composition-based architecture
export type { ViewStrategy, ViewResult } from "./ViewStrategies";
export {
  FrontViewStrategy,
  SideViewStrategy,
  AutoDetectStrategy,
} from "./ViewStrategies";
export type { Sensitivity, InstrumentConfig } from "./Instruments";
export { Instrument, Piano, Guitar } from "./Instruments";
export type { InstrumentId, ViewId, EngineOptions, LegacyEngineId } from "./EngineFactory";
export { EngineFactory } from "./EngineFactory";

// Shared types
export type {
  WorldLandmark,
  ImageLandmark,
  Perspective,
  FrontBaseline,
  SideBaseline,
  Baseline,
  ValidateInput,
  ValidateResult,
} from "./types";

// Utilities
export {
  EAR_LEFT,
  EAR_RIGHT,
  SHOULDER_LEFT,
  SHOULDER_RIGHT,
  WRIST_LEFT,
  WRIST_RIGHT,
  HIP_LEFT,
  HIP_RIGHT,
  dist3,
  angleEarShoulderHipWorld,
  angleEarShoulderHip2D,
} from "./utils";
