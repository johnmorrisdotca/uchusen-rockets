// How the fleet's moving parts move: one table, one helper, shared by every ship. A part that moves is tagged with a `Move` (a name, a pivot and an axis) where its ship builds it, and this file says what each name does over time: a ring that
// spins at its stated rpm, a door leaf that rides up its tracks and comes back, an array or a dish that sweeps. It moves only parts that exist: no geometry is made here, and nothing is rebuilt; the viewer turns or slides each tagged group. A
// `Move` turns about its axis, and a slide moves along that same axis. A hangar leaf slides up its tracks. An array that unfolds is still two parts. Pure: no three.js and no DOM.
import type { Move, Piece } from "../pieces.ts";
import { rpmFor } from "./ship-01/spin.ts";

/**
 * What a moving group does: `spin` turns without end at `rate` degrees a second; `swing` goes from rest to `to` and back, with holds; `sweep` goes from `from` to `to` and back like a pendulum; `slide` moves along its axis from `from` to `travel` metres and back, on the same holds as a swing.
 *
 * @example
 * ```ts
 * import type { MotionKind } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kind: MotionKind = "spin";
 * console.log(kind);
 * ```
 */
export type MotionKind = "spin" | "swing" | "sweep" | "slide";

/**
 * One moving group of a ship: which ship and which tagged group, what it does and how fast, and its note.
 *
 * @example
 * ```ts
 * import { motionsOf, type Motion } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ring: Motion = motionsOf("fleet-ship-01")[0];
 * console.log(ring.kind);
 * ```
 */
export interface Motion {
  /** The rocket (a registry id) whose parts carry the group. */
  ship: string;
  /** The name of the `Move` on the pieces. */
  group: string;
  kind: MotionKind;
  /** Spin: degrees a second at real speed (negative turns the other way). */
  rate?: number;
  /** Swing and sweep: the angles in degrees. A slide: metres at the stowed end. Both start at `from` (default 0). */
  from?: number;
  to?: number;
  /** Slide: how far it pays out, in metres, at the open end. */
  travel?: number;
  /** Swing and sweep: seconds for a whole cycle at real speed. */
  period?: number;
  /** Where in the cycle it starts, 0 to 1, so the five leaves of a door open one after another. */
  phase?: number;
  /** What it is in the ship's words, with its real rate. */
  note: string;
}

/**
 * The speeds of the Motion choice: real, or ten times faster so a slow part can be seen.
 *
 * @example
 * ```ts
 * import type { MotionSpeed } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const speed: MotionSpeed = 10;
 * console.log(speed);
 * ```
 */
export type MotionSpeed = 1 | 10;

/** Tags every piece with a `Move`: the group turns about `move.pivot` on `move.axis` (right-handed) by the angle the clock gives its name. Returns new pieces; nothing else about them changes. */
export const moving = (pieces: readonly Piece[], move: Move): Piece[] => pieces.map((piece) => ({ ...piece, move }));

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** A swing's cycle: 20% shut, 25% opening, 25% held open, 25% closing, 5% shut. */
const swingShape = (u: number): number => (u < 0.2 ? 0 : u < 0.45 ? smooth((u - 0.2) / 0.25) : u < 0.7 ? 1 : u < 0.95 ? smooth(1 - (u - 0.7) / 0.25) : 0);

/**
 * The angle of a group `seconds` into the show, in degrees.
 *
 * @param motion What the group does.
 * @param seconds How long since the show began.
 * @param speed 1 for real speed, 10 for ten times.
 * @returns The angle in degrees: for a spin, 0 up to 360; for a swing or a sweep, between its two angles.
 * @example
 * ```ts
 * import { angleAt, motionsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ring = motionsOf("fleet-ship-01")[0];
 * console.log(angleAt(ring, 17.5));
 * ```
 */
export function angleAt(motion: Motion, seconds: number, speed: MotionSpeed = 1): number {
  const t = seconds * speed;
  if (motion.kind === "spin") return (((motion.rate ?? 0) * t) % 360 + 360) % 360;
  if (motion.kind === "slide") return 0;
  const period = motion.period ?? 20;
  const u = (((t / period + (motion.phase ?? 0)) % 1) + 1) % 1;
  const from = motion.from ?? 0;
  const to = motion.to ?? 0;
  return motion.kind === "swing" ? from + (to - from) * swingShape(u) : from + (to - from) * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
}

/**
 * How far a slide has paid out, in metres. Anything that is not a slide stays at 0.
 *
 * @param motion What the group does.
 * @param seconds How long since the show began.
 * @param speed 1 for real speed, 10 for ten times.
 * @returns The distance in metres, from its stowed end to its open end, or 0 when it is not a slide.
 * @example
 * ```ts
 * import { slideAt, type Motion } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const mast: Motion = { ship: "fleet-kyotori", group: "mast", kind: "slide", travel: 12, period: 16, note: "The mast telescopes." };
 * console.log(slideAt(mast, 8));
 * ```
 */
export function slideAt(motion: Motion, seconds: number, speed: MotionSpeed = 1): number {
  if (motion.kind !== "slide") return 0;
  const period = motion.period ?? 16;
  const t = seconds * speed;
  const u = (((t / period + (motion.phase ?? 0)) % 1) + 1) % 1;
  const from = motion.from ?? 0;
  const travel = motion.travel ?? 0;
  return from + (travel - from) * swingShape(u);
}

const DEG_PER_RPM = 6;
const HANABUSA_RPM = rpmFor(76, 1);
const WHEEL_RPM = rpmFor(112, 1);
const rpmNote = (rpm: number): string => `${rpm.toFixed(2)} rpm, one turn every ${(60 / rpm).toFixed(1)} s`;

const DOOR_TRAVEL_M = 16;

const doorLeaves = (ship: string): Motion[] =>
  Array.from({ length: 5 }, (_, k): Motion => ({ ship, group: `door-leaf-${k}`, kind: "slide", from: 0, travel: DOOR_TRAVEL_M, period: 24, phase: k * 0.04, note: "A hangar door leaf rides 16 m up its tracks and back, one after the next, in 24 s: a roller shutter on the tracks of a hangar door, as the doors of the Vehicle Assembly Building lift in stages. Drawn faster than a real door." }));

/**
 * Every motion of the fleet, by ship. Hanabusa's rings and the wheel turn at their real rpm; the others are drawn at a pace that can be watched, and say so.
 *
 * @example
 * ```ts
 * import { MOTIONS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MOTIONS.length > 0);
 * ```
 */
export const MOTIONS: readonly Motion[] = [
  { ship: "fleet-ship-01", group: "spin", kind: "spin", rate: HANABUSA_RPM * DEG_PER_RPM, note: `The three glazed rings and the two propellant booms turn together on one bearing at ${rpmNote(HANABUSA_RPM)}, which gives the living ring 1.00 g; the keel does not turn.` },
  { ship: "fleet-ship-01", group: "spin-wheel", kind: "spin", rate: WHEEL_RPM * DEG_PER_RPM, note: `The industrial wheel turns at ${rpmNote(WHEEL_RPM)} (1.00 g at its rim).` },
  ...[0, 1, 2, 3, "node"].map((k, i): Motion => ({ ship: "fleet-ship-01", group: k === "node" ? "keel-lift-node" : `keel-lift-${k}`, kind: "slide", from: 0, travel: -15, period: 24, phase: i * 0.04, note: "A lift car rides 15 m along the keel toward the tail and back, one at each wheel and one at the docking node. The cars are drawn at every stop, so the ride stays short of the next car and inside the tube. Drawn faster than a real lift." })),
  { ship: "fleet-ship-03", group: "pod-swap", kind: "slide", from: 0, travel: 12, period: 36, note: "The mission pod rises 12 m off the dorsal collar and settles back. The isolator and its locks stay. A pod is exchanged at a dock. Drawn faster than a real exchange." },
  { ship: "fleet-ship-ariake", group: "pod-swap", kind: "slide", from: 0, travel: 12, period: 36, note: "The mission pod rises 12 m off the dorsal collar and settles back. The isolator and its locks stay. A pod is exchanged at a dock. Drawn faster than a real exchange." },
  ...doorLeaves("fleet-ship-03"),
  ...doorLeaves("fleet-ship-ariake"),
  { ship: "fleet-ship-03", group: "craft-leave", kind: "slide", from: 0, travel: 24, period: 40, note: "The outer ship in each hangar slides 24 m out through the bay door and comes back. The booster on the inner cradle stays. Drawn faster than a real departure." },
  { ship: "fleet-ship-ariake", group: "craft-leave", kind: "slide", from: 0, travel: 24, period: 40, note: "The outer ship in each hangar slides 24 m out through the bay door and comes back. The booster on the inner cradle stays. Drawn faster than a real departure." },
  { ship: "fleet-kyotori", group: "wing-turn", kind: "sweep", from: -45, to: 45, period: 90, note: "The four solar wings turn on their masts to face the star, as the ISS arrays turn on their rotary joints (once an orbit, about 92 minutes); the wings sweep 90 degrees in 45 s here." },
  { ship: "fleet-kyotori", group: "mast-extend", kind: "slide", from: 0, travel: 22, period: 40, note: "The outer section of each mast slides 22 m out of the inner lattice, from the flared wings to the full length, and back, as an ISS array mast telescopes. The blankets keep turning. Drawn faster than a real extension." },
  { ship: "fleet-kyotori", group: "bay-door-0", kind: "swing", from: 0, to: -100, period: 48, note: "A payload-bay door swings shut on its vertical hinge and back. The Space Shuttle's payload bay doors opened on hinges along the sill, and a full open or close took several minutes. Drawn here in 48 s. At rest the door is drawn open." },
  { ship: "fleet-kyotori", group: "bay-door-1", kind: "swing", from: 0, to: 100, period: 48, phase: 0.04, note: "A payload-bay door swings shut on its vertical hinge and back. The Space Shuttle's payload bay doors opened on hinges along the sill, and a full open or close took several minutes. Drawn here in 48 s. At rest the door is drawn open." },
  ...[0, 1, 2, 3].map((k): Motion => ({ ship: "fleet-kyotori", group: `airlock-hatch-${k}`, kind: "swing", from: 0, to: -70, period: 16, phase: k * 0.05, note: "An airlock hatch swings open on its top hinge and shuts again. It opens outward, as a station hatch does. Drawn faster than a real hatch." })),
  { ship: "fleet-emiake", group: "sail-swing-port", kind: "swing", from: 0, to: -115, period: 40, note: "The outer two radiator sails swing down and out on their hinge along the ship's axis and back, as the ISS radiator wings deploy (the middle sail stays up). Drawn faster than the real deployment." },
  { ship: "fleet-emiake", group: "sail-swing-starboard", kind: "swing", from: 0, to: 115, period: 40, note: "The outer two radiator sails swing down and out on their hinge along the ship's axis and back, as the ISS radiator wings deploy (the middle sail stays up). Drawn faster than the real deployment." },
  { ship: "fleet-ship-03", group: "array-turn", kind: "sweep", from: -50, to: 50, period: 90, note: "The gold solar array turns on its root beam to face the star, as the ISS's solar array rotary joints do (the ISS turns once an orbit, about 92 minutes; the array here sweeps 100 degrees in 45 s)." },
  { ship: "fleet-ship-03", group: "dish-track", kind: "sweep", from: -35, to: 35, period: 60, note: "The command tower's dishes sweep slowly on their mounts, as a Deep Space Network dish tracks a spacecraft across the sky (a degree or so a minute); drawn faster so it can be seen." },
  { ship: "fleet-ship-ariake", group: "dish-track", kind: "sweep", from: -35, to: 35, period: 60, note: "The command tower's dishes sweep slowly on their mounts, as a Deep Space Network dish tracks a spacecraft across the sky." },
];

/**
 * The motions of one rocket: empty for a rocket with none.
 *
 * @param rocket A rocket's registry id.
 * @returns Its motions, in table order.
 * @example
 * ```ts
 * import { motionsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(motionsOf("fleet-ship-01").length, motionsOf("starship").length);
 * ```
 */
export const motionsOf = (rocket: string): Motion[] => MOTIONS.filter((m) => m.ship === rocket);

/**
 * The sentence for the panel: what moves on this ship and how fast it really is. Empty when nothing moves.
 *
 * @param rocket A rocket's registry id.
 * @returns The notes of its motions, one after the other.
 * @example
 * ```ts
 * import { motionNote } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(motionNote("fleet-ship-01"));
 * ```
 */
export const motionNote = (rocket: string): string => {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const m of motionsOf(rocket)) {
    const key = `${m.kind}/${m.note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(m.note);
  }
  return lines.join(" ");
};

/**
 * Whether the moving parts move: the `motion` attribute says `on` (real speed) or `fast` (ten times), anything else leaves them still, and a reader who asked for reduced motion sees stills whatever it says.
 *
 * @param attribute The value of the `motion` attribute, or null.
 * @param reduced True when the reader asked for reduced motion.
 * @returns True when the parts move.
 * @example
 * ```ts
 * import { motionWanted } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(motionWanted("on", false), motionWanted("on", true), motionWanted(null, false));
 * ```
 */
export const motionWanted = (attribute: string | null, reduced: boolean): boolean => (attribute === "on" || attribute === "fast") && !reduced;

/**
 * How fast they move: `fast` is ten times the real speed, anything else the real speed.
 *
 * @param attribute The value of the `motion` attribute, or null.
 * @returns 10 for `fast`, else 1.
 * @example
 * ```ts
 * import { motionSpeed } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(motionSpeed("fast"), motionSpeed("on"));
 * ```
 */
export const motionSpeed = (attribute: string | null): MotionSpeed => (attribute === "fast" ? 10 : 1);
