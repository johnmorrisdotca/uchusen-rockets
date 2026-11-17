// Which module may stand on a mount. A mount (a hardpoint, a port or a place on a kit ship's spine) has a collar class, and a module goes there only when its own collar mates with it. The kit ships' mounts are worked out
// from their lists; the hand-built ships declare theirs, and the same test filters both. Pure: no three.js and no DOM.
import { KIT } from "./modules.ts";
import { type CollarClass, mates } from "./collars.ts";
import type { Hardpoint } from "./kit.ts";
import type { KitModule, ModuleOptions, ShipList } from "./types.ts";

/**
 * One module a mount will take. `id` is the short name kept in the address and `part` the registry id. `collar` is the class of the collar on the module's base.
 *
 * @example
 * ```ts
 * import type { SwapChoice } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const choice: SwapChoice = { id: "survey", part: "demo-pod-survey", name: "Survey", collar: "L" };
 * console.log(choice.collar);
 * ```
 */
export interface SwapChoice {
  id: string;
  part: string;
  name: string;
  collar?: CollarClass;
}

/**
 * A hardpoint or port and the modules that mate with it, the ship's own module first. `collar` is the class of the mount.
 *
 * @example
 * ```ts
 * import type { SwapMount } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const mount: SwapMount = { slot: "pod", name: "Mission pod", collar: "L", choices: [] };
 * console.log(mount.slot);
 * ```
 */
export interface SwapMount {
  slot: string;
  name: string;
  collar?: CollarClass;
  choices: readonly SwapChoice[];
}

/**
 * Whether a module may stand on a mount: the mount has no collar to match, or the module's base collar mates with it.
 *
 * @param mount The mount.
 * @param choice The module offered for it.
 * @returns True when it fits.
 * @example
 * ```ts
 * import { fitsMount } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(fitsMount({ slot: "pod", name: "Pod", collar: "L", choices: [] }, { id: "a", part: "a", name: "A", collar: "M" }));
 * ```
 */
export function fitsMount(mount: Pick<SwapMount, "collar">, choice: Pick<SwapChoice, "collar">): boolean {
  return mount.collar === undefined || mates(mount.collar, choice.collar);
}

/**
 * The mount with only the modules that mate with it.
 *
 * @param mount The mount.
 * @returns The same mount without the choices whose collar does not mate.
 * @example
 * ```ts
 * import { matingOnly } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const mount = matingOnly({ slot: "pod", name: "Pod", collar: "L", choices: [{ id: "a", part: "a", name: "A", collar: "L" }, { id: "b", part: "b", name: "B", collar: "M" }] });
 * console.log(mount.choices.length);
 * ```
 */
export function matingOnly(mount: SwapMount): SwapMount {
  return { ...mount, choices: mount.choices.filter((one) => fitsMount(mount, one)) };
}

/**
 * The modules of the kit that may stand where the module at `index` stands on a ship list: the same kind and length (so whatever hangs from it stays put), a base that mates with the module or port below, and a top that
 * mates with the module above.
 *
 * @param list A kit ship's list of places.
 * @param index The place.
 * @returns The other modules, in the kit's order. None when the place is not there or nothing else fits.
 * @example
 * ```ts
 * import { SAMPLE_SHIPS, swapCandidates } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(swapCandidates(SAMPLE_SHIPS.hauler, 4).map((module) => module.id));
 * ```
 */
export function swapCandidates(list: ShipList, index: number): KitModule[] {
  const spot = list[index];
  const own = spot ? KIT[spot.module] : undefined;
  if (!spot || !own) return [];
  let below: CollarClass | undefined = own.bottom;
  let above: CollarClass | undefined = own.top;
  if (spot.on) {
    const parent = KIT[list[spot.on.place]?.module ?? ""];
    const port = parent?.ports.find((one) => one.id === spot.on?.port);
    if (!port) return [];
    below = port.collar;
  } else if (!spot.beside) {
    for (let i = index - 1; i >= 0; i--) {
      const before = list[i];
      if (before.on || before.beside) continue;
      below = KIT[before.module]?.top ?? below;
      break;
    }
    for (let i = index + 1; i < list.length; i++) {
      const after = list[i];
      if (after.on || after.beside) continue;
      above = KIT[after.module]?.bottom ?? above;
      break;
    }
  }
  return Object.values(KIT).filter((one) => one.id !== own.id && one.kind === own.kind && one.length === own.length && (below === undefined ? one.bottom === undefined : mates(below, one.bottom)) && (above === undefined ? one.top === undefined : mates(above, one.top)));
}

/**
 * A kit ship's mounts and the registry alternates that stand in them.
 *
 * @example
 * ```ts
 * import { kitSwaps, SAMPLE_SHIPS, type KitSwaps } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const swaps: KitSwaps = kitSwaps("demo", SAMPLE_SHIPS.hauler);
 * console.log(swaps.mounts[0]?.slot);
 * ```
 */
export interface KitSwaps {
  mounts: readonly SwapMount[];
  alternates: readonly Hardpoint[];
}

/**
 * The mounts of a kit ship: one for each place that has another module whose collars mate, named as `shipParts` names the place's slot. Each alternate is a `Hardpoint` for `hardpointEntries`, so it keeps the place's
 * joints and where it stands.
 *
 * @param ship The ship's id, as `shipParts` was given it.
 * @param list The ship's list of places.
 * @param options What to draw, as `shipParts` was given it.
 * @returns The mounts and the alternates.
 * @example
 * ```ts
 * import { kitSwaps, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const swaps = kitSwaps("demo", SAMPLE_SHIPS.hauler);
 * console.log(swaps.mounts.length, swaps.alternates.length);
 * ```
 */
export function kitSwaps(ship: string, list: ShipList, options: ModuleOptions = {}): KitSwaps {
  const mounts: SwapMount[] = [];
  const alternates: Hardpoint[] = [];
  list.forEach((spot, index) => {
    const own = KIT[spot.module];
    const found = swapCandidates(list, index);
    if (!own || found.length === 0) return;
    const slot = `${own.id}-${index + 1}`;
    const base = `${ship}-${slot}`;
    const choices: SwapChoice[] = [{ id: own.id, part: base, name: own.name, collar: own.bottom }];
    for (const one of found) {
      const id = `${base}-as-${one.id}`;
      choices.push({ id: one.id, part: id, name: one.name, collar: one.bottom });
      alternates.push({ id, name: `${own.name} place: ${one.name}`, like: slot, pieces: () => one.pieces({ ...options, seed: spot.seed ?? `${options.seed ?? ""}${index}` }) });
    }
    mounts.push({ slot, name: own.name, ...(own.bottom ? { collar: own.bottom } : {}), choices });
  });
  return { mounts, alternates };
}
