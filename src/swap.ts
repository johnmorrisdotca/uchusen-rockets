// Which module stands on a hardpoint. A ship lists the modules that mate with each mount; the page keeps the choice in the address and the builder puts that part in the slot. A choice is offered only when its collar mates with
// the mount's (`fitsMount`). The kit ships' mounts are worked out from their lists. Pure: no three.js and no DOM.
import { matingOnly, type SwapChoice, type SwapMount } from "./model/fleet/swap.ts";
import { SAMPLE_SWAPS } from "./model/registry.ts";
import { variantOf } from "./rockets.ts";

export type { SwapChoice, SwapMount };

const choice = (id: string, part: string, name: string, collar: SwapChoice["collar"]): SwapChoice => ({ id, part, name, collar });

const MIYAMOTO_POD: SwapMount = {
  slot: "pod",
  name: "Mission pod",
  collar: "L",
  choices: [choice("relay", "fleet-ship-03-pod-relay", "Relay", "L"), choice("relief", "fleet-ship-03-pod-relief", "Relief", "L"), choice("survey", "fleet-ship-03-pod-survey", "Survey", "L")],
};

// the first design's pods and tips all stand on its 12 m collar (class L): docs/fleet/ship-02.md
const SHIP_02: readonly SwapMount[] = [
  { slot: "pod", name: "Dorsal pod", collar: "L", choices: [choice("settlement", "fleet-02-fleet-02-pod", "Settlement", "L"), choice("survey", "fleet-02-pod-survey", "Survey", "L"), choice("tanker", "fleet-02-pod-tanker", "Tanker", "L")] },
  { slot: "pod-ventral", name: "Ventral pod", collar: "L", choices: [choice("cargo", "fleet-02-fleet-02-pod-ventral", "Cargo", "L"), choice("lab", "fleet-02-pod-ventral-lab", "Laboratory", "L"), choice("rescue", "fleet-02-pod-ventral-rescue", "Rescue", "L")] },
  { slot: "tip-port", name: "Port wing tip", collar: "L", choices: [choice("relay", "fleet-02-fleet-02-tip-port", "Relay", "L"), choice("tug", "fleet-02-tip-port-tug", "Tug", "L")] },
  { slot: "tip-starboard", name: "Starboard wing tip", collar: "L", choices: [choice("relay", "fleet-02-fleet-02-tip-starboard", "Relay", "L"), choice("tug", "fleet-02-tip-starboard-tug", "Tug", "L")] },
];

// Kyotori's four class ships carry one role part each on the shaft, whose segments are L class
const KYOTORI_ROLE: SwapMount = {
  slot: "role",
  name: "Class part",
  collar: "L",
  choices: [choice("survey", "fleet-kyotori-k-role-survey", "Survey booms", "L"), choice("laboratory", "fleet-kyotori-k-role-laboratory", "Laboratory", "L"), choice("astronomy", "fleet-kyotori-k-role-astronomy", "Telescope", "L"), choice("crew", "fleet-kyotori-k-role-crew", "Crew quarters", "L")],
};

/**
 * The mounts a reader can change on this rocket (and, when given, its variant): only the modules whose collar mates with the mount's, and only the mounts the variant has a slot for. A rocket with none has an empty list.
 *
 * @param rocket The rocket id.
 * @param variant The variant id. Left out: every mount the rocket has.
 * @returns The mounts.
 */
export function mountsOf(rocket: string, variant?: string): readonly SwapMount[] {
  const all: readonly SwapMount[] =
    rocket === "fleet-ship-03" || rocket === "fleet-ship-ariake" ? [MIYAMOTO_POD]
    : rocket === "fleet-02" || rocket === "fleet-02-original" ? SHIP_02
    : rocket === "fleet-kyotori" ? [KYOTORI_ROLE]
    : rocket === "fleet-samples" ? (variant ? (SAMPLE_SWAPS[variant]?.mounts ?? []) : Object.values(SAMPLE_SWAPS).flatMap((one) => one.mounts))
    : [];
  const slots = variant ? variantOf(rocket, variant)?.slots : undefined;
  return all.filter((mount) => !slots || slots.includes(mount.slot)).map(matingOnly).filter((mount) => mount.choices.length > 1);
}

const askedOf = (raw: string | null): Map<string, string> => new Map((raw ?? "").split(",").filter((piece) => piece.includes(":")).map((piece) => piece.split(":") as [string, string]));

/** Which short id is showing on each mount: the address, or the variant's own module. */
export function chosenSwap(rocket: string, variant: string, raw: string | null): Record<string, string> {
  const current = variantOf(rocket, variant)?.partIds ?? {};
  const asked = askedOf(raw);
  const out: Record<string, string> = {};
  for (const mount of mountsOf(rocket, variant)) {
    const hit = mount.choices.find((one) => one.id === asked.get(mount.slot)) ?? mount.choices.find((one) => one.part === current[mount.slot]) ?? mount.choices[0];
    if (hit) out[mount.slot] = hit.id;
  }
  return out;
}

/**
 * Part ids to put in the description, only for mounts that differ from the variant. Null when the address asks for nothing new.
 *
 * @param rocket The rocket id.
 * @param variant The variant id.
 * @param raw The address value, `pod:relief` or `pod:survey,tip-port:tug`.
 * @returns Slot to part id, or null.
 */
export function swapParts(rocket: string, variant: string, raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  const current = variantOf(rocket, variant)?.partIds ?? {};
  const asked = askedOf(raw);
  const out: Record<string, string> = {};
  for (const mount of mountsOf(rocket, variant)) {
    const choice = mount.choices.find((one) => one.id === asked.get(mount.slot));
    if (choice && current[mount.slot] !== choice.part) out[mount.slot] = choice.part;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** The address value for these short ids, or null when every mount is the variant's own module. */
export function swapQuery(rocket: string, variant: string, picks: Readonly<Record<string, string>>): string | null {
  const current = variantOf(rocket, variant)?.partIds ?? {};
  const bits: string[] = [];
  for (const mount of mountsOf(rocket, variant)) {
    const choice = mount.choices.find((one) => one.id === picks[mount.slot]);
    if (choice && current[mount.slot] !== choice.part) bits.push(`${mount.slot}:${choice.id}`);
  }
  return bits.length > 0 ? bits.join(",") : null;
}
