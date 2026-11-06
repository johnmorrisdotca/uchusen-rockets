// How Miyamoto and Ariake are built, as story time. The bible lays the keel in 2452 and flies the ship in 2456, four years. The spine goes up from the drive. What stands out from the spine waits until the part it mounts on is there, and those steps run together.
import { MIYAMOTO_VARIANT_SLOTS } from "./variants.ts";

/** Days from the keel to the first flight: 2452 to 2456. */
export const BUILD_DAYS = 4 * 365 + 1;

export interface BuildStep {
  /** The slot on the ship. */
  slot: string;
  /** The part that fills it, as the variant records it. */
  part: string;
  /** Days after the keel is laid. */
  start: number;
  /** How many days the step takes. */
  days: number;
  /** Steps that share a group may run at the same time. The keel does not: each module docks to the one before it. */
  group: "keel" | "fit-out";
}

const WHEN: Readonly<Record<string, { start: number; days: number; group: BuildStep["group"] }>> = {
  drive: { start: 0, days: 200, group: "keel" },
  engineering: { start: 200, days: 180, group: "keel" },
  "fuel-aft": { start: 380, days: 160, group: "keel" },
  "fuel-fore": { start: 540, days: 160, group: "keel" },
  habitat: { start: 700, days: 220, group: "keel" },
  command: { start: 920, days: 180, group: "keel" },
  bow: { start: 1100, days: 200, group: "keel" },
  "drive-collar": { start: 200, days: 160, group: "fit-out" },
  "hangar-starboard": { start: 920, days: 400, group: "fit-out" },
  "hangar-port": { start: 920, days: 400, group: "fit-out" },
  "hangar-starboard-fore": { start: 920, days: 541, group: "fit-out" },
  "hangar-port-aft": { start: 920, days: 541, group: "fit-out" },
  pod: { start: 1100, days: 250, group: "fit-out" },
  array: { start: 700, days: 761, group: "fit-out" },
  bird: { start: 1100, days: 200, group: "fit-out" },
  "radiators-dorsal": { start: 380, days: 300, group: "fit-out" },
  "radiators-ventral": { start: 380, days: 300, group: "fit-out" },
  // the craft the starboard hangar services, so it waits until that hangar is finished
  "exterior-load": { start: 1320, days: 141, group: "fit-out" },
};

/** The build of one flown ship. A cutaway, a deployed array and a swapped pod are states of a slot, not further steps. */
export function buildSteps(variant: "miyamoto" | "ariake"): BuildStep[] {
  const slots = MIYAMOTO_VARIANT_SLOTS[variant];
  return Object.entries(slots).map(([slot, part]) => {
    const when = WHEN[slot];
    if (!when) throw new Error(`no build step for ${variant} slot ${slot}`);
    return { slot, part, ...when };
  });
}
