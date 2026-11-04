// A figure and a variant. A figure with no source is blank, never estimated. Where sources disagree it keeps the one chosen, and `others` holds the rest with the reason.
import type { SourceId } from "./sources.ts";

/**
 * Another value a source gave for a figure, with the source and the reason it was not the one chosen.
 *
 * @example
 * ```ts
 * import { variantOf, type Disagreement } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const others: readonly Disagreement<number>[] = variantOf("starship", "v3")?.facts.parts.booster?.others ?? [];
 * console.log(others.map((other) => other.value));
 * ```
 */
export interface Disagreement<T> {
  value: T;
  source: SourceId;
  note: string;
}

/**
 * A number or a text with where it came from. A figure with no source is blank (`value` is null) and is never estimated. Where sources disagree, the figure keeps the one chosen and `others` holds the rest.
 *
 * @example
 * ```ts
 * import { variantOf, type Figure } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const height: Figure | undefined = variantOf("starship", "v3")?.facts.height;
 * console.log(height?.value, height?.source);
 * ```
 */
export interface Figure<T = number> {
  value: T | null;
  source: SourceId | null;
  /** The date the figure is from, where it has one. */
  date?: string;
  note?: string;
  /** A few words that must stay beside the value wherever it is shown, so it cannot be misread: "announced", "in this form". For a blank, what to say in place of a value. */
  brief?: string;
  others?: readonly Disagreement<T>[];
}

/**
 * A figure with no value: the shape of "no source gives this".
 *
 * @param note Why there is no value. Optional.
 * @param brief What to say in place of a value wherever it is shown. Optional.
 * @returns A figure whose value and source are null.
 * @example
 * ```ts
 * import { blank } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(blank("No source read gives it.", "not given"));
 * ```
 */
export const blank = <T = number>(note?: string, brief?: string): Figure<T> => ({ value: null, source: null, ...(note ? { note } : {}), ...(brief ? { brief } : {}) });

/**
 * A figure as words for a table: its value and whatever must stay beside it; a blank says why, or that no source gives it.
 *
 * @param figure A figure, or undefined.
 * @param unit Text to put after a number, such as " m". Optional.
 * @returns The figure as words for a table. A blank gives its `brief`, or "No source" when it has none.
 * @example
 * ```ts
 * import { figureWords, variantOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(figureWords(variantOf("starship", "v3")?.facts.height, " m"));
 * ```
 */
export function figureWords(figure: Figure<number | string> | undefined, unit = ""): string {
  if (!figure || figure.value === null) return figure?.brief ?? "No source";
  const value = typeof figure.value === "number" ? `${figure.value}${unit}` : figure.value;
  return figure.brief ? `${value}, ${figure.brief}` : value;
}

/**
 * What kind of thing a variant is: flown, announced (not built), an artist's model, a test vehicle or a support item.
 *
 * @example
 * ```ts
 * import { variantOf, type VariantStatus } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const status: VariantStatus | undefined = variantOf("starship", "v4")?.status;
 * console.log(status);
 * ```
 */
export type VariantStatus = "flown" | "announced" | "artist-model" | "test-vehicle" | "support" | "fictional";

/**
 * The sourced numbers of a variant: its height and diameter, each part's height by slot, its engines, other facts and any sizes that are not a height or a width.
 *
 * @example
 * ```ts
 * import { variantOf, type VariantFacts } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const facts: VariantFacts | undefined = variantOf("falcon-9", "block-5")?.facts;
 * console.log(facts?.height.value, Object.keys(facts?.parts ?? {}));
 * ```
 */
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
  /** Sizes that are not a height or a width, shown as they are named here: "Deck length". */
  sizes?: Readonly<Record<string, Figure>>;
}

/**
 * One version of a rocket as data: its id, name, status, first flight, its parts from the bottom up, and the sourced facts about it.
 *
 * @example
 * ```ts
 * import { variantOf, type Variant } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const variant: Variant | undefined = variantOf("starship", "v3");
 * console.log(variant?.name, variant?.slots);
 * ```
 */
export interface Variant {
  /** "v1", "v2" and so on; a label for what is not a numbered version. */
  id: string;
  rocket: string;
  /** What it is called, in a line: "Block 3 (V3)". */
  name: string;
  status: VariantStatus;
  /** What to call its first date, when it is not a vehicle that flew: "In service". */
  firstWord?: string;
  /** When this variant, in this form, first flew. Its `brief` says so when the form is not the block's first. */
  firstFlight: Figure<string>;
  /** The parts this variant has, in stacking order from the bottom. */
  slots: readonly string[];
  facts: VariantFacts;
  /** A slot's part when it is not this variant's own: a part shared with another rocket. */
  partIds?: Readonly<Record<string, string>>;
  /** What a reader should be told about it. */
  note?: string;
  /** The side a to-scale lineup shows of it when asked for the front, because the front hides what it is: the orbiter stands behind the Shuttle's tank. */
  lineupView?: "back" | "side";
}
