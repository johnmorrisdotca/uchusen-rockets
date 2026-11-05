// The three Kaminari concepts as one table: each concept's slots (the part standing at the tail first, as the registry stacks it), its numbers and its id. Concept variants only: the shipped ISV Kaminari stays as it is until John picks.
import { SLOTS_A } from "./a.ts";
import { SLOTS_B } from "./b.ts";
import { SLOTS_C } from "./c.ts";
import type { ConceptSlot } from "./common.ts";
import { CONCEPT_KEYS, type ConceptKey, SPECS } from "./specs.ts";

const tailFirst = (slots: readonly ConceptSlot[], first: string): ConceptSlot[] => [...slots.filter((s) => s.slot === first), ...slots.filter((s) => s.slot !== first)];

/** Each concept's slots, the one at the tail first. */
export const CONCEPT_SLOTS: Readonly<Record<ConceptKey, readonly ConceptSlot[]>> = { a: tailFirst(SLOTS_A, "thrusters"), b: tailFirst(SLOTS_B, "thrusters"), c: tailFirst(SLOTS_C, "centre-drive") };

/**
 * The variant ids of the three concepts, in the order the picker lists them.
 *
 * @example
 * ```ts
 * import { CONCEPT_IDS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(CONCEPT_IDS.join(", "));
 * ```
 */
export const CONCEPT_IDS = CONCEPT_KEYS.map((key) => SPECS[key].id);

/** The key of a concept by its variant id, or undefined for any other. */
export const conceptKeyOf = (variant: string | undefined): ConceptKey | undefined => CONCEPT_KEYS.find((key) => SPECS[key].id === variant);

/**
 * The id of the rocket the three concepts are variants of.
 *
 * @example
 * ```ts
 * import { CONCEPT_ROCKET } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(CONCEPT_ROCKET);
 * ```
 */
export const CONCEPT_ROCKET = "fleet-02-concepts";

export { CONCEPT_KEYS, SPECS };
export type { ConceptKey };
export type { ConceptSlot } from "./common.ts";
