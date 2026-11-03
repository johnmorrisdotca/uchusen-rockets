// A flight as a timeline: where the reader is along it, which engines burn there and how each part stands. The times and the counts are `src/data/flights.ts`, each with its page. Moving between the phases is a picture. Pure: no three.js and no DOM.
import { FLIGHTS, type Flight, type FlightPhase, type PartPose } from "./data/flights.ts";
import type { Figure } from "./data/types.ts";

export type { Flight, FlightBurn, FlightPhase, PartPose } from "./data/flights.ts";

/**
 * Seconds a phase takes on the screen when the timeline plays: one flight in under a minute, whatever its real length.
 *
 * @example
 * ```ts
 * import { SECONDS_PER_PHASE } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(SECONDS_PER_PHASE);
 * ```
 */
export const SECONDS_PER_PHASE = 2.4;

/**
 * The flight for a rocket's variant, when a page gives one.
 *
 * @param rocket A rocket's id.
 * @param variant A variant's id, or undefined.
 * @returns The flight for that variant, or null when it has none.
 * @example
 * ```ts
 * import { flightOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(flightOf("starship", "v3")?.name, flightOf("starship", "v4"));
 * ```
 */
export const flightOf = (rocket: string, variant: string | undefined): Flight | null => FLIGHTS.find((flight) => flight.rocket === rocket && flight.variant === variant) ?? null;

/**
 * The last place on the timeline: the last phase.
 *
 * @param flight A flight.
 * @returns The index of its last phase.
 * @example
 * ```ts
 * import { flightOf, lastPosition } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * console.log(flight ? lastPosition(flight) : null);
 * ```
 */
export const lastPosition = (flight: Flight): number => flight.phases.length - 1;

/**
 * Which phase a place on the timeline is in, and how far along to the next. A value that is not a number is the start.
 *
 * @param flight A flight.
 * @param position A place on the timeline: 0 is the first phase, 1 the second, 1.5 halfway to the third.
 * @returns The phase index, how far along to the next (0 to 1) and the phase.
 * @example
 * ```ts
 * import { flightOf, phaseAt } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * if (flight) console.log(phaseAt(flight, 1.5).phase.name);
 * ```
 */
export function phaseAt(flight: Flight, position: number): { index: number; along: number; phase: FlightPhase } {
  const last = lastPosition(flight);
  const place = Number.isFinite(position) ? Math.min(last, Math.max(0, position)) : 0;
  const index = Math.floor(place);
  return { index, along: place - index, phase: flight.phases[index] };
}

/**
 * The place on the timeline of a phase by its id, or null for one the flight does not have.
 *
 * @param flight A flight.
 * @param id A phase's id, or null or undefined.
 * @returns The place of that phase on the timeline, or null for an id the flight does not have.
 * @example
 * ```ts
 * import { flightOf, phasePosition } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * if (flight) console.log(phasePosition(flight, "nonsense"));
 * ```
 */
export function phasePosition(flight: Flight, id: string | null | undefined): number | null {
  const index = flight.phases.findIndex((phase) => phase.id === id);
  return index < 0 ? null : index;
}

/**
 * How many engines of each part burn in a phase, as drawn: a blank figure draws its `drawn`.
 *
 * @param phase A phase of a flight.
 * @returns The number of engines burning for each part, by slot.
 * @example
 * ```ts
 * import { burnsOf, flightOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const phase = flightOf("falcon-9", "block-5")?.phases[0];
 * console.log(phase ? burnsOf(phase) : {});
 * ```
 */
export function burnsOf(phase: FlightPhase): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [slot, burn] of Object.entries(phase.burns)) out[slot] = burn.engines.value ?? burn.drawn ?? 0;
  return out;
}

export interface PoseNow {
  dx: number;
  dy: number;
  pitch: number;
  gone: boolean;
  /** Degrees each moving group is turned, by name. */
  moves: Readonly<Record<string, number>>;
}

/**
 * Everything the picture needs at one place on the timeline: the phase, how each part stands, which engines burn, how far the ground has fallen, and how much smoke stands on the pad.
 *
 * @example
 * ```ts
 * import { flightOf, frameAt, type FlightFrame } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * const frame: FlightFrame | undefined = flight ? frameAt(flight, 0, [{ slot: "first-stage", baseY: 0 }], 70) : undefined;
 * console.log(frame?.phase.name, frame?.separated);
 * ```
 */
export interface FlightFrame {
  index: number;
  phase: FlightPhase;
  poses: Readonly<Record<string, PoseNow>>;
  burns: Readonly<Record<string, number>>;
  /** Metres. */
  groundY: number;
  smoke: number;
  air: number;
  /** A part stands away from the stack. */
  separated: boolean;
}

export interface FlightPart {
  slot: string;
  /** Where it stands in the stack: the base's height, metres. */
  baseY: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const poseIn = (pose: PartPose | undefined, part: FlightPart, height: number): PoseNow => ({
  dx: (pose?.dx ?? 0) * height,
  dy: pose?.rest ? -part.baseY : (pose?.dy ?? 0) * height,
  pitch: pose?.pitch ?? 0,
  gone: pose?.gone ?? false,
  moves: pose?.moves ?? {},
});

const mixMoves = (from: Readonly<Record<string, number>>, to: Readonly<Record<string, number>>, t: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const name of new Set([...Object.keys(from), ...Object.keys(to)])) out[name] = mix(from[name] ?? 0, to[name] ?? 0, t);
  return out;
};

/**
 * Everything the picture needs at a place on the timeline, for a vehicle `height` metres tall.
 *
 * @param flight A flight.
 * @param position A place on the timeline.
 * @param parts Each part's slot and the height of its base in the stack, in metres.
 * @param height The vehicle's height in metres.
 * @returns The frame to draw.
 * @example
 * ```ts
 * import { flightOf, frameAt } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * if (flight) console.log(frameAt(flight, 1, [{ slot: "first-stage", baseY: 0 }, { slot: "second-stage", baseY: 41 }], 70).burns);
 * ```
 */
export function frameAt(flight: Flight, position: number, parts: readonly FlightPart[], height: number): FlightFrame {
  const { index, along, phase } = phaseAt(flight, position);
  const next = flight.phases[Math.min(index + 1, lastPosition(flight))];
  const t = smooth(along);
  const poses: Record<string, PoseNow> = {};
  let separated = false;
  for (const part of parts) {
    const from = poseIn(phase.pose[part.slot], part, height);
    const to = poseIn(next.pose[part.slot], part, height);
    const now: PoseNow = { dx: mix(from.dx, to.dx, t), dy: mix(from.dy, to.dy, t), pitch: mix(from.pitch, to.pitch, t), gone: from.gone, moves: mixMoves(from.moves, to.moves, t) };
    poses[part.slot] = now;
    if (now.dx !== 0 || now.dy !== 0) separated = true;
  }
  return {
    index,
    phase,
    poses,
    burns: burnsOf(phase),
    groundY: -mix(phase.ground, next.ground, t) * height,
    smoke: mix(phase.smoke ?? 0, next.smoke ?? 0, t),
    air: mix(phase.air ?? 0, next.air ?? 0, t),
    separated,
  };
}

/** How far a flight's picture reaches, so the camera can hold all of it: the widest and highest every part stands, from the stack's own bounds. */
export function flightBounds(flight: Flight, parts: readonly (FlightPart & { height: number; radius: number })[], height: number): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, 0, Infinity];
  const max: [number, number, number] = [-Infinity, height, -Infinity];
  for (const part of parts)
    for (const phase of flight.phases) {
      const pose = poseIn(phase.pose[part.slot], part, height);
      if (pose.gone) continue;
      const reach = Math.max(part.radius, (Math.abs(Math.sin((pose.pitch * Math.PI) / 180)) * part.height) / 2);
      min[0] = Math.min(min[0], pose.dx - reach);
      max[0] = Math.max(max[0], pose.dx + reach);
      min[1] = Math.min(min[1], part.baseY + pose.dy);
      max[1] = Math.max(max[1], part.baseY + pose.dy + part.height);
      min[2] = Math.min(min[2], -part.radius);
      max[2] = Math.max(max[2], part.radius);
    }
  return { min, max };
}

/**
 * The clock of one timeline: where it is and whether it runs. It only moves when told to, once a frame by whoever draws, so a timeline out of sight stands still.
 *
 * @param flight The flight whose clock this is.
 * @example
 * ```ts
 * import { FlightClock, flightOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const flight = flightOf("falcon-9", "block-5");
 * if (flight) {
 *   const clock = new FlightClock(flight);
 *   clock.play();
 *   clock.advance(2.4);
 *   console.log(clock.position, clock.ended);
 * }
 * ```
 */
export class FlightClock {
  readonly flight: Flight;
  position = 0;
  playing = false;

  constructor(flight: Flight) {
    this.flight = flight;
  }

  get ended(): boolean {
    return this.position >= lastPosition(this.flight);
  }

  play(): void {
    if (this.ended) this.position = 0;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seek(position: number): void {
    const { index, along } = phaseAt(this.flight, position);
    this.position = index + along;
    this.playing = false;
  }

  /** Moves on by `seconds` of the screen's time, and stops at the end. */
  advance(seconds: number): void {
    if (!this.playing) return;
    this.position = Math.min(lastPosition(this.flight), this.position + seconds / SECONDS_PER_PHASE);
    if (this.ended) this.playing = false;
  }
}

/**
 * A time as words: `T+2:35`, `T-0:03`, `T+1:05:20`. A blank says so.
 *
 * @param at A figure holding seconds from the flight's zero.
 * @returns The time as text, such as `T+2:35`. A blank figure gives "Time: no source".
 * @example
 * ```ts
 * import { clockWords } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(clockWords({ value: 155, source: "wikipedia-starship" }), clockWords({ value: -3, source: null }));
 * ```
 */
export function clockWords(at: Figure): string {
  if (at.value === null) return "Time: no source";
  const sign = at.value < 0 ? "-" : "+";
  const total = Math.abs(at.value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `T${sign}${h}:${String(m).padStart(2, "0")}:${s}` : `T${sign}${m}:${s}`;
}
