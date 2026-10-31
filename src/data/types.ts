// A figure and a variant. A figure with no source is blank, never estimated. Where sources disagree it keeps the one chosen, and `others` holds the rest with the reason.
import type { SourceId } from "./sources.ts";

export interface Disagreement<T> {
  value: T;
  source: SourceId;
  note: string;
}

export interface Figure<T = number> {
  value: T | null;
  source: SourceId | null;
  /** The date the figure is from, where it has one. */
  date?: string;
  note?: string;
  others?: readonly Disagreement<T>[];
}

export const blank = <T = number>(note?: string): Figure<T> => ({ value: null, source: null, ...(note ? { note } : {}) });

export type VariantStatus = "flown" | "announced" | "artist-model" | "test-vehicle";

export interface VariantFacts {
  /** Overall height with every part in place, metres. */
  height: Figure;
  diameter: Figure;
  /** Each part's height by its slot, metres. */
  parts: Readonly<Record<string, Figure>>;
  /** Engines by slot. */
  engines: Readonly<Record<string, Figure<string>>>;
  /** Other facts, each with its own source. */
  more: Readonly<Record<string, Figure<number | string>>>;
}

export interface Variant {
  /** "v1", "v2" and so on; a label for what is not a numbered version. */
  id: string;
  rocket: string;
  /** What it is called, in a line: "Block 3 (V3)". */
  name: string;
  status: VariantStatus;
  firstFlight: Figure<string>;
  /** The parts this variant has, in stacking order from the bottom. */
  slots: readonly string[];
  facts: VariantFacts;
  /** What a reader should be told about it. */
  note?: string;
}
