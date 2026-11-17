// How Kyotori goes together, as story time. The bible gives no dates, so each spine module takes the kit's pace (`KIT_STEP_DAYS`). The station's core and housing go up first; then each ship from the drive to the bow, in
// the order of the variant; what stands on a shaft or on the housing (the class part, the joints, the wings, the visitors' dock, the quarters) waits for it. Pure: no three.js and no DOM.
import { KYOTORI_SLOT_NAMES } from "../../../data/ship-kyotori.ts";
import { KIT_STEP_DAYS } from "../assembly.ts";
import { buildSpan, type BuildStep } from "../buildSpan.ts";
import { KYOTORI_VARIANT_SLOTS } from "./variants.ts";

const SHIP_KEEL = ["drive", "shaft", "tanks", "bay", "crew", "elevator", "bow"] as const;
const SHIP_FIT = ["role", "joints", "jz"] as const;
const STATION_KEEL = ["s-core", "s-housing"] as const;

/**
 * The build of one Kyotori variant: every slot once.
 *
 * @param variant A variant of the Kyotori rocket.
 * @returns The steps, or undefined when that is not one of its variants.
 * @example
 * ```ts
 * import { buildOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(buildOf("kyotori-a")?.[0]?.slot);
 * ```
 */
export function kyotoriBuild(variant: string): BuildStep[] | undefined {
  if (!Object.hasOwn(KYOTORI_VARIANT_SLOTS, variant)) return undefined;
  const slots = KYOTORI_VARIANT_SLOTS[variant];
  const all = Object.keys(slots);
  const prefix = (slot: string): string => (/^[a-d]-/.test(slot) ? slot.slice(0, 1) : "");
  const rest = (slot: string): string => (prefix(slot) ? slot.slice(2) : slot);
  const ships = [...new Set(all.filter((slot) => !slot.startsWith("s-")).map(prefix))];
  const keel: string[] = all.filter((slot) => (STATION_KEEL as readonly string[]).includes(slot));
  const fit: { slot: string; after: string }[] = all.filter((slot) => slot.startsWith("s-") && !keel.includes(slot)).map((slot) => ({ slot, after: "s-housing" }));
  for (const ship of ships) {
    const at = (suffix: string): string => (ship ? `${ship}-${suffix}` : suffix);
    keel.push(...SHIP_KEEL.map(at).filter((slot) => all.includes(slot)));
    fit.push(...SHIP_FIT.map(at).filter((slot) => all.includes(slot)).map((slot) => ({ slot, after: at("shaft") })));
  }
  const placed = new Set([...keel, ...fit.map((one) => one.slot)]);
  const left = all.filter((slot) => !placed.has(slot));
  if (left.length > 0) throw new Error(`no build step for Kyotori ${variant} slot ${left.join(", ")} (${left.map(rest).join(", ")})`);
  return buildSpan(KIT_STEP_DAYS * keel.length, keel, fit, (slot) => slots[slot], (slot) => KYOTORI_SLOT_NAMES[slot]);
}
