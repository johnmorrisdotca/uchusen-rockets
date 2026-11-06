// How Hanabusa is built, as story time. The bible lays the keel in 2456 and flies the ship in 2461, five years. The spine goes up from the drive. The booms, rings, wheel, hubs and docks wait for the module they stand on.
import { buildSpan, type BuildStep } from "../buildSpan.ts";
import { SPINE } from "./hull.ts";
import { HANABUSA_VARIANT_SLOTS } from "./variants.ts";

/** Days from the keel to the first flight: 2456 to 2461. */
export const HANABUSA_BUILD_DAYS = 5 * 365 + 1;

const partOf = (slot: string): string => {
  const part = HANABUSA_VARIANT_SLOTS.hanabusa?.[slot];
  if (!part) throw new Error(`Hanabusa has no part in ${slot}`);
  return part;
};

/** The flown ship. The aft ring order and the opened living ring are states of a slot, not further steps. A ring waits for the spine module that reaches its station, and for the higher station the other order gives that same slot. */
export function hanabusaBuild(): BuildStep[] {
  return buildSpan(HANABUSA_BUILD_DAYS, SPINE.map((one) => one.id), [
    { slot: "boom-port", after: "tank-1" },
    { slot: "boom-starboard", after: "tank-1" },
    { slot: "ring-garden", after: "tank-8" },
    { slot: "ring-research", after: "tank-7" },
    { slot: "ring-living", after: "tank-8" },
    { slot: "wheel-industrial", after: "drum-habitat-2" },
    { slot: "hubs", after: "node" },
    { slot: "docks", after: "node" },
  ], partOf);
}
