// Which engines are alight. The bells are the ones the drawing already has; nothing here adds an engine or a size. The flame's length and its diamonds are a picture, not a measured flame. Pure.
import type { Piece } from "./model/pieces.ts";

/** How many exit-radii a drawn flame reaches, and the most any reaches in metres. A picture, not a measured length. */
export const PLUME_EXITS = 34;
export const PLUME_MOST_M = 26;
/** How many shock diamonds a flame shows near the ground. A picture. */
export const PLUME_DIAMONDS = 6;
/**
 * With no one touching anything, a flame stops moving after this long and nothing draws: a lit rocket at rest costs the same as a dark one.
 *
 * @example
 * ```ts
 * import { FLAME_SETTLE_MS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLAME_SETTLE_MS / 1000, "seconds");
 * ```
 */
export const FLAME_SETTLE_MS = 15_000;
/** A flame that only flickers is drawn at most this often. A turn or a move still draws once a frame. */
export const FLAME_GAP_MS = 33;

/**
 * How long a flame is drawn, in metres, for an engine whose bell is `exit` metres across at the mouth. The length is a picture, not a measured flame.
 *
 * @param exit The exit radius of the bell, in metres.
 * @returns The flame's length in metres.
 * @example
 * ```ts
 * import { plumeLength } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(plumeLength(0.45).toFixed(2));
 * ```
 */
export function plumeLength(exit: number): number {
  return Math.min(exit * PLUME_EXITS, PLUME_MOST_M);
}

/**
 * `on` asks for them, and a reader who asked for reduced motion has them off whatever the page says. Anything else, or nothing, is off.
 *
 * @param attribute The value of the `engines` attribute, or null when it is missing.
 * @param reduced True when the reader asked for reduced motion.
 * @returns True when the flames should be drawn.
 * @example
 * ```ts
 * import { enginesWanted } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(enginesWanted("on", false), enginesWanted("on", true), enginesWanted(null, false));
 * ```
 */
export function enginesWanted(attribute: string | null, reduced: boolean): boolean {
  return attribute === "on" && !reduced;
}

/**
 * One engine bell as the drawing has it: where it stands across the part, the height of its mouth and its exit radius, all in metres in the part's own frame.
 *
 * @example
 * ```ts
 * import { bellsOf, type Bell } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const bells: Bell[] = bellsOf([]);
 * console.log(bells.length);
 * ```
 */
export interface Bell {
  x: number;
  z: number;
  /** Height of the mouth, in the part's own metres. */
  y: number;
  /** Exit radius, metres. */
  exit: number;
}

/**
 * One bell for every engine the pieces already draw. The mouth is the first point of the bell.
 *
 * @param pieces The pieces of a part, as the builder makes them.
 * @returns The bells, one for each engine the pieces already draw.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 * import { bellsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const booster = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
 * console.log(booster ? bellsOf(booster.pieces).length : 0);
 * ```
 */
export function bellsOf(pieces: readonly Piece[]): Bell[] {
  const bells: Bell[] = [];
  for (const piece of pieces) {
    if (piece.kind !== "lathe" || piece.material !== "bell" || piece.profile.length === 0) continue;
    const [exit, y] = piece.profile[0];
    const at = piece.at ?? [0, 0];
    bells.push({ x: at[0], z: at[1], y, exit });
  }
  return bells;
}

export interface LitBell extends Bell {
  slot: string;
}

/**
 * The engines that are alight at full thrust. Stacked, only the parts on the ground or beside the stack, as an orbiter is: a ship's engines are buried in the booster.
 * Apart, or one part on its own, every bell that part draws. A part whose engines no source tells of (`dark`, a stage that has landed) draws no flame.
 */
export function litBells(parts: readonly { slot: string; atY: number; shown: boolean; pieces: readonly Piece[]; beside?: boolean; dark?: boolean }[], together: boolean): LitBell[] {
  const shown = parts.filter((part) => part.shown);
  if (shown.length === 0) return [];
  const floor = Math.min(...shown.map((part) => part.atY));
  const bells: LitBell[] = [];
  for (const part of shown) {
    if (part.dark || (together && part.atY > floor + 0.5 && !part.beside)) continue;
    for (const bell of bellsOf(part.pieces)) bells.push({ ...bell, slot: part.slot });
  }
  return bells;
}

/**
 * The bells grouped by how far they are from the part's axis, innermost ring first, and each ring in order round the axis.
 *
 * @param bells The bells of one part.
 * @returns The rings, innermost first, each a list of bells.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 * import { bellsOf, ringsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const booster = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
 * console.log(booster ? ringsOf(bellsOf(booster.pieces)).map((ring) => ring.length) : []);
 * ```
 */
export function ringsOf(bells: readonly Bell[]): Bell[][] {
  const sorted = [...bells].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const rings: Bell[][] = [];
  for (const bell of sorted) {
    const last = rings[rings.length - 1];
    if (last && Math.abs(Math.hypot(last[0].x, last[0].z) - Math.hypot(bell.x, bell.z)) < 0.05) last.push(bell);
    else rings.push([bell]);
  }
  for (const ring of rings) ring.sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z));
  return rings;
}

/**
 * Which `count` engines burn: from the middle out, and a ring that is only partly used has them evenly round it, so three of a Falcon 9's nine are the middle one and two opposite. A source says how many; where they stand is this rule.
 *
 * @param bells All the bells of a part.
 * @param count How many burn.
 * @returns The bells that burn.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 * import { bellsOf, pickBells } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const booster = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
 * console.log(booster ? pickBells(bellsOf(booster.pieces), 3).length : 0);
 * ```
 */
export function pickBells(bells: readonly Bell[], count: number): Bell[] {
  const wanted = Math.max(0, Math.min(bells.length, Math.floor(count)));
  const out: Bell[] = [];
  for (const ring of ringsOf(bells)) {
    const left = wanted - out.length;
    if (left <= 0) break;
    if (ring.length <= left) out.push(...ring);
    else for (let i = 0; i < left; i++) out.push(ring[Math.floor((i * ring.length) / left)]);
  }
  return out;
}
