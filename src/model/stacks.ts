// One row per part of a rocket drawn wholly by this package's code: its size as drawn, its joints and how to make its pieces. The registry turns each row into the one record every part has.
import type { CreditId } from "../data/credits.ts";
import type { PartKind } from "../parts.ts";
import type { Figure } from "../data/types.ts";
import type { Piece } from "./pieces.ts";

export interface StackPart {
  slot: string;
  kind: PartKind;
  name: string;
  /** Metres, as drawn. */
  height: number;
  /** Metres, the widest as drawn. */
  diameter: number;
  /** Where it mates: metres above its origin, and metres across there. */
  top?: readonly [number, number];
  bottom?: readonly [number, number];
  /** It is placed rather than stacked: beside the core, or standing on what is below. */
  place?: { x: number; z: number; y?: number };
  /** Its own diameter's source, when the variant's is not this part's. */
  sourcedDiameter?: Figure;
  /** The painted look's model, when a licensed one shows it. */
  painted?: { file: string; credit: CreditId };
  /** Other variants it is true for. */
  alsoTrueTo?: readonly string[];
  pieces: () => Piece[];
}

export interface StackBuild {
  rocket: string;
  variant: string;
  /** What a reader should be told about where its shape came from. */
  drawnFrom: string;
  parts: readonly StackPart[];
}
