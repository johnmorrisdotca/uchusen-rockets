// How a ship made of kit modules goes together: the spine from the keel up in the order of its list, then each module hung from a port or beside the spine once the place it stands on is finished. Each step is named for its
// module in plain words. Pure: no three.js and no DOM.
import { buildSpan, type BuildStep } from "./buildSpan.ts";
import { KIT } from "./modules.ts";
import type { ShipList } from "./types.ts";

/**
 * Story days one spine module takes to put in place. This is a pace for the player, not a sourced date: the kit's ships are not dated.
 *
 * @example
 * ```ts
 * import { KIT_STEP_DAYS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(KIT_STEP_DAYS);
 * ```
 */
export const KIT_STEP_DAYS = 30;

/**
 * The assembly order of a kit ship: the spine from the keel up, then everything hung from a port or beside the spine, each after the spine place it stands on. Slots are named as `shipParts` names them, and each step is
 * titled with its module's name, numbered when the ship has several of one.
 *
 * @param ship The ship's id, as `shipParts` was given it.
 * @param list The ship's list of places.
 * @returns The steps, the keel first. Empty for an empty list.
 * @example
 * ```ts
 * import { kitAssembly, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const steps = kitAssembly("demo", SAMPLE_SHIPS.hauler);
 * console.log(steps[0].title, steps.length === SAMPLE_SHIPS.hauler.length);
 * ```
 */
export function kitAssembly(ship: string, list: ShipList): BuildStep[] {
  const places = list.flatMap((spot, index) => (KIT[spot.module] ? [{ spot, index, module: KIT[spot.module], slot: `${spot.module}-${index + 1}` }] : []));
  if (places.length === 0) return [];
  const stands = (index: number): number => {
    const spot = list[index];
    if (spot.on) return stands(spot.on.place);
    if (spot.beside) {
      for (let i = index - 1; i >= 0; i--) if (!list[i].on && !list[i].beside) return i;
      return -1;
    }
    return index;
  };
  const spine = places.filter((one) => !one.spot.on && !one.spot.beside);
  const hung = places.filter((one) => one.spot.on || one.spot.beside);
  const slotAt = (index: number): string | undefined => places.find((one) => one.index === index)?.slot;
  const names = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const one of places) {
    const total = places.filter((other) => other.spot.module === one.spot.module).length;
    const nth = (seen.get(one.spot.module) ?? 0) + 1;
    seen.set(one.spot.module, nth);
    names.set(one.slot, total > 1 ? `${one.module.name} ${nth}` : one.module.name);
  }
  const last = spine.at(-1)?.slot;
  const alone = spine.length < 2;
  const keel = (alone ? places : spine).map((one) => one.slot);
  const fit = alone
    ? []
    : hung.map((one) => {
        const parent = slotAt(stands(one.index));
        const base = parent && parent !== last ? parent : spine.at(-2)?.slot;
        return { slot: one.slot, after: base ?? keel[0] };
      });
  return buildSpan(KIT_STEP_DAYS * keel.length, keel, fit, (slot) => `${ship}-${slot}`, (slot) => names.get(slot));
}
