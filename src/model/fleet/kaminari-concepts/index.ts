// The three ships as one table: each ship's slots (the part standing at the tail first, as the registry stacks it), its numbers and its id. The first Kaminari hull stays on its own rocket.
import { SLOTS_A } from "./a.ts";
import { SLOTS_B } from "./b.ts";
import { SLOTS_C } from "./c.ts";
import type { ConceptSlot } from "./common.ts";
import { SAIL_DEPLOYED_SLOTS } from "./sails.ts";
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

/** The rocket id of each ship. */
export const ROCKET_OF: Readonly<Record<ConceptKey, "fleet-kaminari" | "fleet-emiake" | "fleet-romaryu">> = { a: "fleet-kaminari", b: "fleet-emiake", c: "fleet-romaryu" };

/**
 * The rocket ids that take the size slider.
 *
 * @example
 * ```ts
 * import { CONCEPT_ROCKETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(CONCEPT_ROCKETS.join(", "));
 * ```
 */
export const CONCEPT_ROCKETS = [ROCKET_OF.a, ROCKET_OF.b, ROCKET_OF.c] as const;

/** Emiake with the outer radiator sails swung down. */
export const EMIAKE_DEPLOYED = "fleet-emiake-deployed";

export { SAIL_DEPLOYED_SLOTS };
export { BERTHS, type ShipPort } from "./berth.ts";

export { CONCEPT_KEYS, SPECS };
export type { ConceptKey };
export type { ConceptSlot } from "./common.ts";
