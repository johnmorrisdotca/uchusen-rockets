// Where a ship's build is at one moment of the time-lapse. A ship with no build order is not offered the player. The rate is story days in one real second: 60 finishes a four-year build in about 24 seconds, and 100000 finishes it at once. Pure.
import { emiakeBuild, kaminariBuild, romaryuBuild } from "./model/fleet/kaminari-concepts/buildOrder.ts";
import { hanabusaBuild } from "./model/fleet/ship-01/buildOrder.ts";
import { buildSteps } from "./model/fleet/ship-03/buildOrder.ts";

/**
 * Story days that pass in one real second. The slowest is 60, which finishes a four-year build in about 24 seconds, and the fastest is 100000.
 *
 * @example
 * ```ts
 * import { PLAY_RATES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PLAY_RATES[0], PLAY_RATES.at(-1));
 * ```
 */
export const PLAY_RATES = [60, 600, 3_600, 10_000, 100_000] as const;

/**
 * One step the player reads: the slot, when it starts and how long it takes.
 *
 * @example
 * ```ts
 * import { playFrame, type PlayStep } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const step: PlayStep = { slot: "drive", start: 0, days: 10 };
 * console.log(playFrame([step], 0).going[0]);
 * ```
 */
export interface PlayStep {
  slot: string;
  start: number;
  days: number;
}

/**
 * One moment of the build: the story day, the slots that are finished, and the slots that are being built.
 *
 * @example
 * ```ts
 * import { playFrame, type PlayFrame } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const frame: PlayFrame = playFrame([{ slot: "drive", start: 0, days: 10 }], 1);
 * console.log(frame.done.join(","));
 * ```
 */
export interface PlayFrame {
  /** Days after the keel was laid. */
  day: number;
  /** Days from the keel to the first flight. */
  total: number;
  /** Slots whose step has finished. */
  done: readonly string[];
  /** Slots whose step has started and not finished. */
  going: readonly string[];
}

const stepsOf = (variant: string): readonly PlayStep[] | undefined => {
  if (variant === "hanabusa" || variant === "hanabusa-aft" || variant === "hanabusa-section") return hanabusaBuild();
  if (variant === "fleet-kaminari") return kaminariBuild();
  if (variant === "fleet-emiake" || variant === "fleet-emiake-deployed") return emiakeBuild();
  if (variant === "fleet-romaryu") return romaryuBuild();
  if (variant.startsWith("miyamoto")) return buildSteps("miyamoto");
  if (variant.startsWith("ariake")) return buildSteps("ariake");
  return undefined;
};

/**
 * The build order of a ship, or nothing when that ship has no build to play. A cutaway and a deployed sail play the same build as the flown ship.
 *
 * @param variant The variant id.
 * @returns The steps, or undefined when that ship has no build to play.
 * @example
 * ```ts
 * import { buildOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(buildOf("miyamoto")?.length);
 * console.log(buildOf("starship") === undefined);
 * ```
 */
export function buildOf(variant: string): readonly PlayStep[] | undefined {
  return stepsOf(variant);
}

/**
 * The build at `at`, from 0 when the keel is laid to 1 when the ship flies.
 *
 * @param steps The ship's build order.
 * @param at How far through the build, from 0 to 1.
 * @returns The story day and which slots are finished or underway.
 * @example
 * ```ts
 * import { buildOf, playFrame } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const steps = buildOf("miyamoto");
 * console.log(steps ? playFrame(steps, 0).going[0] : "");
 * ```
 */
export function playFrame(steps: readonly PlayStep[], at: number): PlayFrame {
  const total = Math.max(0, ...steps.map((step) => step.start + step.days));
  const t = Math.min(1, Math.max(0, at));
  const day = t * total;
  const done = steps.filter((step) => step.start + step.days <= day).map((step) => step.slot);
  const going = steps.filter((step) => step.start <= day && step.start + step.days > day).map((step) => step.slot);
  return { day, total, done, going };
}

/**
 * Whether the address asked for the build, and how far through it. A missing or wild `at` is the start.
 *
 * @param params The page address's query.
 * @returns `on` when `build=on`, and `at` from 0 to 1.
 * @example
 * ```ts
 * import { playFrom } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(playFrom(new URLSearchParams("build=on&at=0.5")).at);
 * ```
 */
export function playFrom(params: URLSearchParams): { on: boolean; at: number } {
  const at = Number(params.get("at"));
  return { on: params.get("build") === "on", at: Number.isFinite(at) ? Math.min(1, Math.max(0, at)) : 0 };
}

/**
 * The numbered stills for reduced motion: the keel just laid, evenly spaced moments, and the finished ship.
 *
 * @param steps The ship's build order.
 * @param count How many stills. Fewer than 2 becomes the start and the end.
 * @returns One frame per still, from the start to the end.
 * @example
 * ```ts
 * import { stills } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const frames = stills([{ slot: "drive", start: 0, days: 10 }], 3);
 * console.log(frames.length, frames[0].day, frames[2].day);
 * ```
 */
export function stills(steps: readonly PlayStep[], count = 6): PlayFrame[] {
  const n = Math.max(2, Math.floor(count));
  return Array.from({ length: n }, (_, i) => playFrame(steps, i / (n - 1)));
}
