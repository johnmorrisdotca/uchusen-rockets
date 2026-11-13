// One row per part of the craft on screen: the id the `part` attribute takes, its names, and the launch date and size when a sourced figure has them.
import { PART_JA } from "./data/partJa.ts";
import { partEntry } from "./model/registry.ts";
import { SLOT_NAMES, variantOf } from "./rockets.ts";

/**
 * One part a page can pick out.
 *
 * @example
 * ```ts
 * import { partsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const zarya = partsOf("iss").find((part) => part.id === "zarya");
 * console.log(zarya?.name, zarya?.nameJa, zarya?.launched);
 * ```
 */
export interface PartInfo {
  /** The id `part` takes: the slot, such as `zarya`. */
  id: string;
  /** The English name. */
  name: string;
  /** The Japanese name, or null when the data has none. */
  nameJa: string | null;
  /** The launch date, `YYYY-MM-DD`, when a sourced note gives one. */
  launched: string | null;
  /** The sourced length in metres, when a figure gives one. */
  height: number | null;
  /** The sourced width in metres, when a figure gives one. The station parts' notes do not, so this stays null. */
  diameter: number | null;
}

const launchedOf = (...notes: (string | undefined)[]): string | null => {
  for (const note of notes) {
    const found = note?.match(/launched (\d{4}-\d{2}-\d{2})/i);
    if (found) return found[1];
  }
  return null;
};

/**
 * The parts of a rocket's variant. `id` is the slot the element's `part` attribute takes.
 *
 * @param rocket A rocket's id.
 * @param variantId A variant's id. Left out, the rocket's default.
 * @returns One row per slot. Empty when the rocket or the variant is not known.
 * @example
 * ```ts
 * import { partsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(partsOf("iss").some((part) => part.id === "zarya"));
 * ```
 */
export function partsOf(rocket: string, variantId?: string): PartInfo[] {
  const variant = variantOf(rocket, variantId);
  if (!variant) return [];
  return variant.slots.map((slot) => {
    const record = partEntry(`${rocket}-${variant.id}-${slot}`)?.record;
    const figure = variant.facts.parts[slot];
    const length = variant.facts.more[`${slot}-length`];
    const height = typeof figure?.value === "number" ? figure.value : typeof length?.value === "number" ? length.value : null;
    return {
      id: slot,
      name: SLOT_NAMES[slot] ?? record?.name ?? slot,
      nameJa: PART_JA[slot] ?? null,
      launched: launchedOf(length?.note, figure?.note),
      height,
      diameter: null,
    };
  });
}
