import { FrontView } from "./FrontView";

/**
 * Guitar perspective: extends FrontView (symmetry 11/12).
 * Same logic as FrontView; can be extended later with instrument-specific rules.
 */
export class GuitarView extends FrontView {
  readonly name = "Guitar View";
  override readonly perspective = "Front" as const;
}
