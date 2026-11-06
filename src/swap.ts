// Which module stands on a hardpoint. A ship lists the modules that mate with each mount; the page keeps the choice in the address and the builder puts that part in the slot. Pure: no three.js and no DOM.
import { variantOf } from "./rockets.ts";

/** One module a mount will take. `id` is the short name kept in the address. `part` is the registry id. */
export interface SwapChoice {
  id: string;
  part: string;
  name: string;
}

/** A hardpoint and the modules that mate with it, the ship's own module first. */
export interface SwapMount {
  slot: string;
  name: string;
  choices: readonly SwapChoice[];
}

const choice = (id: string, part: string, name: string): SwapChoice => ({ id, part, name });

const MIYAMOTO_POD: SwapMount = {
  slot: "pod",
  name: "Mission pod",
  choices: [choice("relay", "fleet-ship-03-pod-relay", "Relay"), choice("relief", "fleet-ship-03-pod-relief", "Relief"), choice("survey", "fleet-ship-03-pod-survey", "Survey")],
};

const SHIP_02: readonly SwapMount[] = [
  { slot: "pod", name: "Dorsal pod", choices: [choice("settlement", "fleet-02-fleet-02-pod", "Settlement"), choice("survey", "fleet-02-pod-survey", "Survey"), choice("tanker", "fleet-02-pod-tanker", "Tanker")] },
  { slot: "pod-ventral", name: "Ventral pod", choices: [choice("cargo", "fleet-02-fleet-02-pod-ventral", "Cargo"), choice("lab", "fleet-02-pod-ventral-lab", "Laboratory"), choice("rescue", "fleet-02-pod-ventral-rescue", "Rescue")] },
  { slot: "tip-port", name: "Port wing tip", choices: [choice("relay", "fleet-02-fleet-02-tip-port", "Relay"), choice("tug", "fleet-02-tip-port-tug", "Tug")] },
  { slot: "tip-starboard", name: "Starboard wing tip", choices: [choice("relay", "fleet-02-fleet-02-tip-starboard", "Relay"), choice("tug", "fleet-02-tip-starboard-tug", "Tug")] },
];

/** The mounts a reader can change on this rocket. A rocket with none has an empty list. */
export function mountsOf(rocket: string): readonly SwapMount[] {
  if (rocket === "fleet-ship-03" || rocket === "fleet-ship-ariake") return [MIYAMOTO_POD];
  if (rocket === "fleet-02" || rocket === "fleet-02-original") return SHIP_02;
  return [];
}

const askedOf = (raw: string | null): Map<string, string> => new Map((raw ?? "").split(",").filter((piece) => piece.includes(":")).map((piece) => piece.split(":") as [string, string]));

/** Which short id is showing on each mount: the address, or the variant's own module. */
export function chosenSwap(rocket: string, variant: string, raw: string | null): Record<string, string> {
  const current = variantOf(rocket, variant)?.partIds ?? {};
  const asked = askedOf(raw);
  const out: Record<string, string> = {};
  for (const mount of mountsOf(rocket)) {
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
  for (const mount of mountsOf(rocket)) {
    const choice = mount.choices.find((one) => one.id === asked.get(mount.slot));
    if (choice && current[mount.slot] !== choice.part) out[mount.slot] = choice.part;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** The address value for these short ids, or null when every mount is the variant's own module. */
export function swapQuery(rocket: string, variant: string, picks: Readonly<Record<string, string>>): string | null {
  const current = variantOf(rocket, variant)?.partIds ?? {};
  const bits: string[] = [];
  for (const mount of mountsOf(rocket)) {
    const choice = mount.choices.find((one) => one.id === picks[mount.slot]);
    if (choice && current[mount.slot] !== choice.part) bits.push(`${mount.slot}:${choice.id}`);
  }
  return bits.length > 0 ? bits.join(",") : null;
}
