// New composition-based architecture
export type { ViewStrategy, ViewResult } from "./ViewStrategies";
export {
  FrontViewStrategy,
  SideViewStrategy,
  AutoDetectStrategy,
} from "./ViewStrategies";
export type { InstrumentConfig } from "./Instruments";
export { Instrument, Piano, Guitar, Generic } from "./Instruments";
export type { InstrumentId, ViewId, EngineOptions } from "./EngineFactory";
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
  PostureThresholds,
  PostureAlertType,
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
  DEFAULT_THRESHOLDS,
  SENSITIVITY_MIN_PCT,
  SENSITIVITY_MAX_PCT,
  sensitivityToRatioThreshold,
  sensitivityToAngleRatioSide,
} from "./utils";
