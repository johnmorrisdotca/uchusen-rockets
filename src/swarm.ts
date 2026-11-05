// How many drones work a ship, which step each one is on, and the path from the berth to the slot. The drone and the dock are boxes until those designs exist. A path stays outside the hull until the last leg, which is the move into the slot. Pure.
import { buildOf, playFrame, type PlayStep } from "./buildPlay.ts";

/**
 * The most drones one ship may have working at once.
 *
 * @example
 * ```ts
 * import { SWARM_CAP } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(SWARM_CAP);
 * ```
 */
export const SWARM_CAP = 100;

/**
 * A box the path must not pass through, in metres. A point on the face is outside.
 *
 * @example
 * ```ts
 * import type { HullBox } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const hull: HullBox = { min: [-1, 0, -1], max: [1, 2, 1] };
 * console.log(hull.max[1]);
 * ```
 */
export interface HullBox {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

/**
 * One drone and the slot it is working.
 *
 * @example
 * ```ts
 * import type { SwarmJob } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const job: SwarmJob = { drone: 0, slot: "drive" };
 * console.log(job.slot);
 * ```
 */
export interface SwarmJob {
  drone: number;
  slot: string;
}

const GAP = 8;

/**
 * How many drones work this ship. A small craft is 6, Miyamoto and Ariake are 24, Hanabusa is 48, and the long ships are 96. Never more than {@link SWARM_CAP}.
 *
 * @param variant The variant id.
 * @returns The count, or undefined when that ship has no build.
 * @example
 * ```ts
 * import { swarmCount } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(swarmCount("miyamoto"));
 * console.log(swarmCount("starship") === undefined);
 * ```
 */
export function swarmCount(variant: string): number | undefined {
  if (!buildOf(variant)) return undefined;
  const named = variant.startsWith("miyamoto") || variant.startsWith("ariake") ? 24
    : variant === "hanabusa" || variant.startsWith("hanabusa-") ? 48
      : variant === "fleet-kaminari" || variant.startsWith("fleet-emiake") || variant === "fleet-romaryu" ? 96
        : 6;
  return Math.min(SWARM_CAP, named);
}

/**
 * Which slot each drone works at `at`. Drones split across the steps the build order has running, and a step that has not started gets none.
 *
 * @param steps The ship's build order.
 * @param count How many drones are on the ship.
 * @param at How far through the build, from 0 to 1.
 * @returns One job per drone. Empty when nothing is being built, or when the count is 0.
 * @example
 * ```ts
 * import { buildOf, swarmJobs } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const steps = buildOf("miyamoto");
 * console.log(steps ? swarmJobs(steps, 24, 0)[0]?.slot : "");
 * ```
 */
export function swarmJobs(steps: readonly PlayStep[], count: number, at: number): SwarmJob[] {
  const going = playFrame(steps, at).going;
  const n = Math.max(0, Math.min(SWARM_CAP, Math.floor(count)));
  if (going.length === 0 || n === 0) return [];
  return Array.from({ length: n }, (_, drone) => ({ drone, slot: going[drone % going.length] ?? going[0] }));
}

/**
 * Berth, parts store, the lane abreast of the slot, then the slot. The first three points are outside the hull, on the starboard side.
 *
 * @param drone Which drone, from 0.
 * @param count How many drones share the lane.
 * @param slot Where the part is placed, in metres.
 * @param hull The hull the path must stay outside of.
 * @returns Four points, the last of them the slot.
 * @example
 * ```ts
 * import { approachPath } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const hull = { min: [-10, 0, -4] as const, max: [10, 40, 4] as const };
 * console.log(approachPath(0, 2, [0, 20, 0], hull).length);
 * ```
 */
export function approachPath(drone: number, count: number, slot: readonly [number, number, number], hull: HullBox): [number, number, number][] {
  const lane = hull.max[0] + GAP;
  const span = Math.max(0, count - 1) * 4;
  const berth: [number, number, number] = [lane, hull.min[1] - GAP * 3 - span + drone * 4, 0];
  const store: [number, number, number] = [lane, hull.min[1] - GAP, 0];
  const alongside: [number, number, number] = [lane, slot[1], slot[2]];
  return [berth, store, alongside, [slot[0], slot[1], slot[2]]];
}

/**
 * One drone, where it is, and the point its beam aims at.
 *
 * @example
 * ```ts
 * import type { Carry } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const carry: Carry = { drone: 0, slot: "drive", part: [10, 0, 0], where: [14, 0, 6], duty: "work" };
 * console.log(carry.slot);
 * ```
 */
export interface Carry {
  drone: number;
  slot: string;
  /** Where the beam aims: the part, for a drone at the work, or a short point ahead. */
  part: [number, number, number];
  /** Where the drone is. */
  where: [number, number, number];
  /** Working a part, flying the path, or waiting at the berth. */
  duty: "work" | "transit" | "berth";
}

/**
 * Where each drone is at `at`. A few work each part that is being built, some fly the path from the stack, and some wait at the berth. Distances differ, so they do not sit in one ring.
 *
 * @param jobs Which slot each drone is on.
 * @param at How far through the build, from 0 to 1.
 * @param steps The ship's build order.
 * @param slotAt Where a finished slot stands.
 * @param dock The parts stack, beside the ship.
 * @param length The ship's length, stern then bow, so drones in transit spread along it. Omitted, they spread from the stack to the slot.
 * @returns One carry per job.
 * @example
 * ```ts
 * import { buildOf, carries, swarmJobs } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const steps = buildOf("miyamoto") ?? [];
 * const jobs = swarmJobs(steps, 4, 0);
 * console.log(carries(jobs, 0, steps, () => [0, 0, 0], [40, 0, 0]).length);
 * ```
 */
export function carries(jobs: readonly SwarmJob[], at: number, steps: readonly PlayStep[], slotAt: (slot: string) => readonly [number, number, number] | undefined, dock: readonly [number, number, number], length?: readonly [number, number]): Carry[] {
  const frame = playFrame(steps, at);
  const going = frame.going;
  const n = jobs.length;
  const parkN = n >= 4 && going.length > 0 ? Math.max(1, Math.floor(n / 4)) : 0;
  const workN = going.length === 0 ? 0 : Math.min(n - parkN, Math.max(1, Math.min(n - parkN, going.length * 3)));
  const cargoOf = (slot: string): [number, number, number] => {
    const step = steps.find((one) => one.slot === slot);
    const place = slotAt(slot) ?? dock;
    const t = step && step.days > 0 ? Math.min(1, Math.max(0, (frame.day - step.start) / step.days)) : 0;
    const index = Math.max(0, going.indexOf(slot));
    const originY = dock[1] + (index - (going.length - 1) / 2) * 22;
    return [dock[0] + (place[0] - dock[0]) * t, originY + (place[1] - originY) * t, dock[2] + (place[2] - dock[2]) * t];
  };
  return jobs.map((job, i) => {
    const slot = slotAt(job.slot) ?? dock;
    if (i < workN) {
      const mates = jobs.slice(0, workN).filter((one) => one.slot === job.slot);
      const place = Math.max(0, mates.findIndex((one) => one.drone === job.drone));
      const turn = (place / Math.max(1, mates.length)) * Math.PI * 2 + 0.6;
      const radius = 12 + (place % 3) * 5;
      const cargo = cargoOf(job.slot);
      const where: [number, number, number] = [cargo[0] + Math.cos(turn) * radius, cargo[1] + ((place % 5) - 2) * 3, cargo[2] + Math.sin(turn) * radius];
      return { drone: job.drone, slot: job.slot, part: cargo, where, duty: "work" };
    }
    if (i < n - parkN) {
      const transitIndex = i - workN;
      const transitCount = Math.max(1, n - parkN - workN);
      const stern = length ? Math.min(length[0], length[1]) : Math.min(dock[1], slot[1]);
      const bow = length ? Math.max(length[0], length[1]) : Math.max(dock[1], slot[1]);
      const t = transitCount === 1 ? 0.5 : transitIndex / (transitCount - 1);
      const lane = dock[0] - 12 - (job.drone % 3) * 8;
      const where: [number, number, number] = [lane, stern + (bow - stern) * t + ((job.drone % 3) - 1) * 4, dock[2] + ((job.drone % 5) - 2) * 8];
      return { drone: job.drone, slot: job.slot, part: aimOf(where, slot, 5), where, duty: "transit" };
    }
    const turn = job.drone * 2.399;
    const reach = 16 + (job.drone % 6) * 8;
    const where: [number, number, number] = [dock[0] + 10 + Math.cos(turn) * 14, dock[1] + Math.sin(turn) * reach, dock[2] + Math.cos(turn * 1.7) * 12];
    return { drone: job.drone, slot: job.slot, part: [where[0] - 3, where[1], where[2]], where, duty: "berth" };
  });
}

/** A point `metres` from `from` toward `toward`. */
function aimOf(from: readonly [number, number, number], toward: readonly [number, number, number], metres: number): [number, number, number] {
  const dx = toward[0] - from[0];
  const dy = toward[1] - from[1];
  const dz = toward[2] - from[2];
  const span = Math.hypot(dx, dy, dz) || 1;
  const scale = metres / span;
  return [from[0] + dx * scale, from[1] + dy * scale, from[2] + dz * scale];
}

/** What a part stands on, for the ships whose build is a spine with parts hung on it. */
const STANDS_ON: Readonly<Record<string, string>> = {
  engineering: "drive",
  "fuel-aft": "engineering",
  "fuel-fore": "fuel-aft",
  habitat: "fuel-fore",
  command: "habitat",
  bow: "command",
  "drive-collar": "drive",
  "hangar-starboard": "fuel-aft",
  "hangar-port": "habitat",
  "hangar-starboard-fore": "habitat",
  "hangar-port-aft": "fuel-aft",
  pod: "fuel-fore",
  array: "fuel-fore",
  "radiators-dorsal": "habitat",
  "radiators-ventral": "habitat",
  "exterior-load": "hangar-starboard",
};

/**
 * Whether `slot` may stand in the picture. A part waits until the part it stands on has finished, and that one waits the same way. A slot with no mount may stand.
 *
 * @param slot The slot.
 * @param done Slots whose step has finished.
 * @returns True when every part it stands on is finished.
 * @example
 * ```ts
 * import { grounded } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(grounded("habitat", ["drive", "engineering", "fuel-aft", "fuel-fore"]));
 * console.log(grounded("radiators-dorsal", ["drive"]));
 * ```
 */
export function grounded(slot: string, done: readonly string[]): boolean {
  const seen = new Set<string>();
  let mount: string | undefined = STANDS_ON[slot];
  while (mount) {
    if (seen.has(mount)) return false;
    seen.add(mount);
    if (!done.includes(mount)) return false;
    mount = STANDS_ON[mount];
  }
  return true;
}

/**
 * A ring of berths around the parts stack, used when nothing is being carried.
 *
 * @param count How many drones.
 * @param dock The parts stack.
 * @returns One point per drone.
 * @example
 * ```ts
 * import { berthRing } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(berthRing(6, [40, 0, 0]).length);
 * ```
 */
export function berthRing(count: number, dock: readonly [number, number, number]): [number, number, number][] {
  const n = Math.max(0, Math.min(SWARM_CAP, Math.floor(count)));
  return Array.from({ length: n }, (_, drone) => {
    const turn = (drone / Math.max(1, n)) * Math.PI * 2;
    return [dock[0] + Math.cos(turn) * 22, dock[1], dock[2] + Math.sin(turn) * 22];
  });
}

const inside = (p: readonly [number, number, number], hull: HullBox): boolean =>
  p[0] > hull.min[0] && p[0] < hull.max[0] && p[1] > hull.min[1] && p[1] < hull.max[1] && p[2] > hull.min[2] && p[2] < hull.max[2];

/**
 * Whether every leg but the last stays out of the hull. The last leg is the move into the slot, so it may enter.
 *
 * @param path The points, in order.
 * @param hull The hull the earlier legs must stay outside of.
 * @returns True when no sample of those legs is inside the hull.
 * @example
 * ```ts
 * import { approachPath, pathClears } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const hull = { min: [-10, 0, -4] as const, max: [10, 40, 4] as const };
 * console.log(pathClears(approachPath(0, 1, [0, 20, 0], hull), hull));
 * ```
 */
export function pathClears(path: readonly (readonly [number, number, number])[], hull: HullBox): boolean {
  for (let leg = 0; leg < path.length - 2; leg += 1) {
    const a = path[leg];
    const b = path[leg + 1];
    if (!a || !b) return false;
    for (let i = 1; i < 8; i += 1) {
      const t = i / 8;
      if (inside([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], hull)) return false;
    }
  }
  return true;
}
