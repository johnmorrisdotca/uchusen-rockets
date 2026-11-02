// The one record every part has, whatever made it: its real size in metres, where its origin is, the named joints where it mates with a neighbour, and which source each of its faces comes from. A part
// from any source can be named in a description, and `check` needs nothing but this record to say whether the joints fit. Pure: no three.js and no DOM.
import type { CreditId } from "./data/credits.ts";
import type { Figure } from "./data/types.ts";

export type PartKind = "booster" | "first-stage" | "ship" | "second-stage" | "fairing" | "capsule" | "trunk" | "engine" | "fin" | "flap" | "ring" | "test-vehicle" | "third-stage" | "adapter" | "service-module" | "tower";

/** Where a part mates. Every part's origin is the middle of its base on its axis, at its lowest point; Y is up and the windward side faces +Z, in metres. */
export interface Joint {
  /** What this joint is, so only like meets like: "stage". */
  kind: "stage";
  /** Metres above the part's origin. A second stage's bottom joint is above its nozzle, which nests in what is below. */
  y: number;
  /** Metres across at the joint. */
  diameter: number;
}

export interface PartRecord {
  id: string;
  kind: PartKind;
  name: string;
  /** The rocket and the variants it is true for. Empty: it was never part of a flown or announced vehicle. */
  rocket: string;
  trueTo: readonly string[];
  /** Metres, as drawn: equal to the sourced figure wherever there is one. */
  height: number;
  diameter: number;
  /** The sourced figures, blank where no source gives one. */
  sourced: { height: Figure; diameter: Figure };
  joints: { readonly top?: Joint; readonly bottom?: Joint };
  /** It is placed rather than stacked, this far from the rocket's axis and this far up (left out: on the ground): a side booster beside the core, or a booster standing on a deck. */
  strapOn?: { x: number; z: number; y?: number };
  /** The painted look's mesh, when a licensed model gives one: its file under assets/models/ and whose it is. Otherwise this package's own code paints it. `ownNozzle`: the model has none, so this package's own shows with it unless the part is nested in the stage below. */
  painted: { file: string; credit: CreditId; ownNozzle?: true } | null;
  /** What a reader should be told about where its shape came from. */
  drawnFrom: string;
}
