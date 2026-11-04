// Round shapes on the spine's axis or beside it, standing along Y: tubes, rings, bells and capsules, each a lathe at an offset in X and Z. A cutaway passes `arc` to leave a side open. Pure: no three.js and no DOM.
import type { Lathe, MaterialName } from "./adapter.ts";

type Arc = (y: number) => readonly [number, number];
type Extra = Partial<Omit<Lathe, "kind" | "material" | "profile" | "at">>;

/** The half circle the starboard cut leaves: the hull from the dorsal side round the port to the ventral side, open to starboard (+X). */
export const OPEN_STARBOARD: Arc = () => [Math.PI, 2 * Math.PI];

/** A straight tube from y0 to y1 at (x, z). */
export const tubeAt = (material: MaterialName, x: number, z: number, r: number, y0: number, y1: number, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at: [x, z], segs: 24, profile: [[r, y0], [r, y1]], only: "mesh", ...extra });

/** A ring (a torus of round section) of major radius `major` and tube radius `minor` at height y, centred at (x, z). */
export function ringAt(material: MaterialName, x: number, z: number, major: number, y: number, minor: number, extra: Extra = {}): Lathe {
  const sides = 6;
  const profile: [number, number][] = [];
  for (let i = 0; i <= sides; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / sides;
    profile.push([major + minor * Math.cos(t), y + minor * Math.sin(t)]);
  }
  return { kind: "lathe", material, at: [x, z], segs: 28, profile, only: "mesh", ...extra };
}

/** A flat ring: inside radius r0, outside radius r1, from y0 to y1. */
export const collarAt = (material: MaterialName, x: number, z: number, r0: number, r1: number, y0: number, y1: number, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at: [x, z], segs: 28, profile: [[r1, y0], [r1, y1], [r0, y1], [r0, y0], [r1, y0]], only: "mesh", ...extra });

/** A capsule along Y: a straight barrel with a rounded dome at each end, from y0 to y1, radius r. */
export function capsule(material: MaterialName, x: number, z: number, r: number, y0: number, y1: number, extra: Extra = {}): Lathe {
  const steps = 6;
  const bottom: [number, number][] = [];
  const top: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    bottom.push([r * Math.sin(t), y0 + r * (1 - Math.cos(t))]);
    top.push([r * Math.cos(t), y1 - r + r * Math.sin(t)]);
  }
  return { kind: "lathe", material, at: [x, z], segs: 28, profile: [[0.001, y0], ...bottom.slice(1), ...top], only: "mesh", ...extra };
}

/** A magnetic nozzle's wall: from the exit at y = exitY (radius `exit`) in to the throat (radius `throat`) and out to a chamber (radius `chamber`). The curves are the ones a plume wants. */
export function nozzleProfile(exitY: number, throatY: number, chamberY: number, exit: number, throat: number, chamber: number, steps = 14): [number, number][] {
  const wall: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    wall.push([throat + (exit - throat) * (1 - t) ** 1.7, exitY + (throatY - exitY) * t]);
  }
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    wall.push([throat + (chamber - throat) * t ** 0.8, throatY + (chamberY - throatY) * t]);
  }
  return wall;
}

/** The radius of that wall at a height. */
export function nozzleRadiusAt(wall: readonly (readonly [number, number])[], y: number): number {
  for (let i = 0; i + 1 < wall.length; i++) {
    const [r0, y0] = wall[i];
    const [r1, y1] = wall[i + 1];
    if (y >= y0 && y <= y1) return y1 === y0 ? Math.max(r0, r1) : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return wall[wall.length - 1][0];
}
