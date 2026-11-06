// Which part of a real launch stack is still there once the craft is in space. The lower stages have been spent or have turned back. A craft with no such split is drawn as it is.

/** Slots that remain in space, in the order the variant stacks them. A rocket that is not here, or that is already that set, is unchanged. */
const SPACE: Readonly<Record<string, readonly string[]>> = {
  starship: ["ship"],
  "space-shuttle": ["orbiter"],
  "saturn-v": ["third-stage", "adapter", "service-module", "capsule"],
  sls: ["upper-stage", "service-module", "capsule"],
  "falcon-9": ["second-stage", "fairing", "trunk", "capsule"],
  dragon: ["trunk", "capsule"],
};

/**
 * The slots to draw when the craft is in space, or null when the picture stays the whole variant.
 *
 * @param rocket The rocket's id.
 * @param slots The variant's slots, from the bottom.
 * @returns The slots that are still flying, in the variant's order, or null when nothing is spent.
 * @example
 * ```ts
 * import { spaceSlots } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(spaceSlots("starship", ["booster", "ship"]));
 * ```
 */
export function spaceSlots(rocket: string, slots: readonly string[]): readonly string[] | null {
  const wanted = SPACE[rocket];
  if (!wanted) return null;
  const kept = slots.filter((slot) => wanted.includes(slot));
  if (kept.length === 0 || kept.length === slots.length) return null;
  return kept;
}
