// How the first design, SPX-02 加美鳴 Kaminari, goes together, as story time. Her bible lays the keel in 2511 and flies her in 2520, nine years. The spine and the stations on it go up from the drive to the bow shield; the radiator
// wings, the pod and tip mounts, the attitude thrusters and the insides wait for the part they stand in. Every slot of the flown ship is one flight, named as the ship names it.
import { buildSpan, type BuildStep } from "../buildSpan.ts";
import { SHIP_02_SLOTS } from "./index.ts";

/** Days from the keel to the first flight: 2511 to 2520. */
export const SHIP_02_BUILD_DAYS = 9 * 365 + 1;

const KEEL = ["spine", "drive", "drive-engines", "verniers", "header-tanks", "reactor", "shadow-shield", "propellant-lines", "tank-1", "tank-2", "tank-3", "tank-4", "cargo-1", "cargo-2", "cargo-3", "cargo-4", "dock", "farm", "habitat-a", "habitat-b", "command", "shield"] as const;

/** What stands on what: the slot, then the keel slot it waits for. A fit-out step runs to the end, so none waits for another. */
const AFTER: readonly (readonly [string, string])[] = [
  ["radiator-starboard", "spine"],
  ["radiator-port", "spine"],
  ["radiators-stowed", "spine"],
  ["tip-starboard", "spine"],
  ["tip-port", "spine"],
  ["pod", "tank-4"],
  ["pod-ventral", "tank-4"],
  ["attitude-thrusters", "command"],
  ["reactor-inside", "reactor"],
  ["tank-inside", "tank-4"],
  ["cargo-inside", "cargo-4"],
  ["dock-hangar", "dock"],
  ["dock-works", "dock"],
  ["farm-terrace-1", "farm"],
  ["farm-terrace-2", "farm"],
  ["farm-terrace-3", "farm"],
  ...[1, 2, 3].flatMap((n) => [[`habitat-a-deck-${n}`, "habitat-a"], [`habitat-b-deck-${n}`, "habitat-b"]] as const),
  ["command-bridge", "command"],
  ["command-crew", "command"],
  ["command-medbay", "command"],
];

/**
 * The first design's build: every slot once, the keel from the tail to the bow.
 *
 * @example
 * ```ts
 * import { buildOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(buildOf("fleet-02")?.[0]?.slot);
 * ```
 */
export function ship02Build(): BuildStep[] {
  // a mount's flight is the mount, whichever module is in it
  const names = new Map(SHIP_02_SLOTS.map((one) => [one.slot, one.name.replace(/: .*$/, "")]));
  return buildSpan(SHIP_02_BUILD_DAYS, KEEL, AFTER.map(([slot, after]) => ({ slot, after })), (slot) => `fleet-02-fleet-02-${slot}`, (slot) => names.get(slot));
}
