// Hexagonal cladding for a surface of revolution: rows of raised six-sided tiles, each a plate with a seam round it, set on the surface so the rows follow it round and up. Ariake's drive shrouds and her collar wear it in
// near-black in place of Miyamoto's white and gold bands. The tiles are real geometry (a raised plate each, the dark body showing in the seams), drawn from one template of outline and thickness. Pure: no three.js and no DOM.
import { type MaterialName, type Piece, type Plate, rng, type Vec3 } from "./adapter.ts";

/** What a tile is made of, by share: a third the black tile, most the dark panel, a few of the grey. */
const TONES: readonly [number, MaterialName][] = [[0.35, "tile"], [0.9, "panel-dark"], [1, "hull-grey-dark"]];

export interface HexSurface {
  /** The surface's radius at a height. */
  radius: (y: number) => number;
  y0: number;
  y1: number;
  /** Where its axis stands, across and up. */
  at: readonly [number, number];
  /** The arcs of the circle the cladding may cover at a height, in radians from +Z towards +X. */
  arcs: (y: number) => readonly (readonly [number, number])[];
  /** A tile's circumradius in metres (the hexagon is a little under twice that across). */
  tile: number;
  /** How far a tile stands off the surface, in metres. */
  raise?: number;
}

/** A hexagon of circumradius r, point up the surface. */
const hexagon = (r: number): [number, number][] => Array.from({ length: 6 }, (_, i) => [r * Math.cos(Math.PI / 6 + (Math.PI / 3) * i), r * Math.sin(Math.PI / 6 + (Math.PI / 3) * i)] as [number, number]);

/** The tiles of a surface: staggered rows up it, each tile a raised hexagon leaving a seam of 12% between neighbours. */
export function hexClad(s: HexSurface, seed: string): Piece[] {
  const random = rng(`${seed}/hex`);
  const raise = s.raise ?? 0.2;
  const R = s.tile;
  const colPitch = Math.sqrt(3) * R;
  const rowPitch = 1.5 * R;
  const outline = hexagon(R * 0.88);
  const out: Piece[] = [];
  let row = 0;
  for (let y = s.y0 + R; y < s.y1 - R * 0.5; row++) {
    const r = s.radius(y);
    const dr = (s.radius(y + 0.25) - s.radius(y - 0.25)) / 0.5;
    const slope = Math.atan(-dr);
    const step = rowPitch / Math.sqrt(1 + dr * dr);
    const n = Math.max(6, Math.floor((2 * Math.PI * r) / colPitch));
    const half = colPitch / (2 * r) + 0.02;
    const arcs = s.arcs(y);
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * (k + (row % 2) * 0.5)) / n;
      const wrapped = a % (2 * Math.PI);
      const inside = arcs.some(([a0, a1]) => (a0 <= 0 && a1 >= 2 * Math.PI) || (wrapped - half >= a0 && wrapped + half <= a1) || (wrapped + 2 * Math.PI - half >= a0 && wrapped + 2 * Math.PI + half <= a1));
      if (!inside) continue;
      const pick = random();
      const material = TONES.find(([share]) => pick < share)![1];
      const nrm: Vec3 = [Math.sin(a), 0, Math.cos(a)];
      const tangent: Vec3 = [nrm[2], 0, -nrm[0]];
      const up: Vec3 = [-nrm[0] * Math.sin(slope), Math.cos(slope), -nrm[2] * Math.sin(slope)];
      const out3: Vec3 = [nrm[0] * Math.cos(slope), Math.sin(slope), nrm[2] * Math.cos(slope)];
      const lift = raise / 2 + 0.01;
      const o: Vec3 = [s.at[0] + nrm[0] * r + out3[0] * lift, y + out3[1] * lift, s.at[1] + nrm[2] * r + out3[2] * lift];
      const tile: Plate = { kind: "plate", material, frame: { o, u: tangent, v: up, w: out3 }, outline, thickness: raise, plain: true, only: "mesh" };
      out.push(tile);
    }
    y += step;
  }
  return out;
}
