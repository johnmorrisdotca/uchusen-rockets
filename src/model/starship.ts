// Starship's parts from a table of numbers, so a change of block is a change of numbers. Heights and the diameter are the sourced figures. The rest of this table is how a part is drawn, not a published
// figure: no source gives a flap's size or a fin's reach. Block 3's come from measuring Clarence365's model after it was scaled to the sourced sizes (CC BY 4.0, see NOTICE.md); Blocks 1 and 2 keep their
// own documented differences (four fins, flap angles, engine shielding) with sizes judged from photographs.
import { deg } from "../framing.ts";
import { flat, type Frame, type Lathe, type Piece, type Plate, pointOf, radial, radiusAt, strut, type Vec3 } from "./pieces.ts";

export interface FlapDraw {
  /** Where its root is, degrees round from the windward side. */
  az: number;
  /** [radius, height] points of its outline. */
  outline: readonly (readonly [number, number])[];
  thickness: number;
}

export interface EngineDraw {
  ring: number;
  count: number;
  /** Degrees to the first engine. */
  start: number;
  type: "sea" | "vacuum";
}

export interface StarshipDraw {
  radius: number;
  boosterHeight: number;
  shipHeight: number;
  /** Where the booster's steel starts over its engines. */
  boosterSkirt: number;
  /** The bay's ceiling. */
  boosterBay: number;
  /** Whether a skirt shields the engines (Blocks 1 and 2) or they stand bare (Block 3). */
  shielded: boolean;
  ring: { height: number; struts: number; integrated: boolean };
  fins: { az: readonly number[]; y: number; reach: number; width: number; thick: number; octagon: boolean };
  chines: { az: readonly number[]; from: number; to: number; out: number };
  boosterEngines: readonly EngineDraw[];
  shipEngines: readonly EngineDraw[];
  noseStart: number;
  /** Degrees each way from the windward line that tiles cover, by height. */
  tile: readonly (readonly [number, number])[];
  forward: FlapDraw;
  aft: FlapDraw;
  /** Payload door on the leeward side, as [from, to] heights. */
  door: readonly [number, number] | null;
  /** Block 3's docking ports. */
  docking: boolean;
}

const BOOSTER_ENGINES: readonly EngineDraw[] = [
  { ring: 0.78, count: 3, start: 30, type: "sea" },
  { ring: 2.2, count: 10, start: 18, type: "sea" },
  { ring: 3.92, count: 20, start: 9, type: "sea" },
];

const R = 4.5;

const TILE_LONG = (noseStart: number, height: number): readonly (readonly [number, number])[] => [
  [0, 90],
  [noseStart - 1.5, 90],
  [noseStart + 2.5, 138],
  [height - 7, 142],
  [height - 5.5, 180],
  [height, 180],
];

const ring = (height: number): StarshipDraw["ring"] => ({ height, struts: 24, integrated: false });
const FOUR_FINS = { az: [45, 135, 225, 315], reach: 7.9, width: 2.9, thick: 0.9, octagon: false };

export const STARSHIP_DRAWS: Readonly<Record<string, StarshipDraw>> = {
  v1: {
    radius: R,
    boosterHeight: 71,
    shipHeight: 50.3,
    boosterSkirt: 1.1,
    boosterBay: 2.7,
    shielded: true,
    ring: ring(2),
    fins: { ...FOUR_FINS, y: 64.8 },
    chines: { az: [60, -60, 150, -150], from: 3.5, to: 24, out: 0.9 },
    boosterEngines: BOOSTER_ENGINES,
    shipEngines: shipEngineRing(3, 2.95),
    noseStart: 35,
    tile: TILE_LONG(35, 50.3),
    forward: { az: 90, thickness: 0.32, outline: [[3.6, 38.6], [8.1, 38.6], [8.1, 41], [4.3, 47.6], [3, 47.6]] },
    aft: { az: 90, thickness: 0.4, outline: [[4.3, 0.3], [8.3, 0.3], [8.3, 6.3], [4.9, 12.2], [4.3, 12.2]] },
    door: null,
    docking: false,
  },
  "v1-flight1": {
    radius: R,
    boosterHeight: 69,
    shipHeight: 50.3,
    boosterSkirt: 1.1,
    boosterBay: 2.7,
    shielded: true,
    ring: { height: 0, struts: 0, integrated: false },
    fins: { ...FOUR_FINS, y: 64.6 },
    chines: { az: [60, -60, 150, -150], from: 3.5, to: 24, out: 0.9 },
    boosterEngines: BOOSTER_ENGINES,
    shipEngines: shipEngineRing(3, 2.95),
    noseStart: 35,
    tile: TILE_LONG(35, 50.3),
    forward: { az: 90, thickness: 0.32, outline: [[3.6, 38.6], [8.1, 38.6], [8.1, 41], [4.3, 47.6], [3, 47.6]] },
    aft: { az: 90, thickness: 0.4, outline: [[4.3, 0.3], [8.3, 0.3], [8.3, 6.3], [4.9, 12.2], [4.3, 12.2]] },
    door: null,
    docking: false,
  },
  v2: {
    radius: R,
    boosterHeight: 71,
    shipHeight: 52.1,
    boosterSkirt: 1.1,
    boosterBay: 2.7,
    shielded: true,
    ring: ring(2),
    fins: { ...FOUR_FINS, y: 64.8 },
    chines: { az: [60, -60, 150, -150], from: 3.5, to: 24, out: 0.9 },
    boosterEngines: BOOSTER_ENGINES,
    shipEngines: shipEngineRing(3, 2.95),
    noseStart: 36.5,
    tile: TILE_LONG(36.5, 52.1),
    forward: { az: 110, thickness: 0.24, outline: [[3.2, 41], [7.9, 41], [7.9, 43.4], [3.7, 49.2], [2.5, 49.2]] },
    aft: { az: 90, thickness: 0.4, outline: [[4.3, 0.3], [8.1, 0.3], [8.1, 6.2], [5, 11.9], [4.3, 11.9]] },
    door: [33, 41],
    docking: false,
  },
  v3: v3Like(72.3, 52.1, 3),
  v4: v3Like(81, 61, 6),
  "2019": {
    radius: 4.47,
    boosterHeight: 0,
    shipHeight: 50,
    boosterSkirt: 0,
    boosterBay: 0,
    shielded: false,
    ring: ring(0),
    fins: { ...FOUR_FINS, y: 0 },
    chines: { az: [], from: 0, to: 0, out: 0 },
    boosterEngines: [],
    shipEngines: shipEngineRing(3, 2.75),
    noseStart: 30,
    tile: [
      [0, 92],
      [50, 92],
    ],
    // measured from MartianDays' model after scaling: flaps that run from the body, large aft fins
    forward: { az: 90, thickness: 0.5, outline: [[3.1, 34.5], [9.1, 40], [9.1, 42], [1.5, 48.8]] },
    aft: { az: 90, thickness: 0.6, outline: [[4.4, 13.5], [4.4, 0.15], [9.4, 0.15], [9.4, 3.2]] },
    door: null,
    docking: false,
  },
};

function shipEngineRing(vacuum: number, ring: number): readonly EngineDraw[] {
  return [
    { ring: 0.85, count: 3, start: 180, type: "sea" },
    { ring, count: vacuum, start: 60, type: "vacuum" },
  ];
}

function v3Like(boosterHeight: number, shipHeight: number, vacuum: number): StarshipDraw {
  const stretch = shipHeight - 52.1;
  return {
    radius: R,
    boosterHeight,
    shipHeight,
    boosterSkirt: 3.2,
    boosterBay: 2.6,
    shielded: false,
    ring: { height: 2.8, struts: 22, integrated: true },
    fins: { az: [0, 90, -90], y: boosterHeight - 6.8, reach: 8.7, width: 3.4, thick: 0.9, octagon: true },
    chines: { az: [60, -60, 150, -150], from: 5.5, to: 27, out: 1.3 },
    boosterEngines: BOOSTER_ENGINES,
    shipEngines: shipEngineRing(vacuum, 3.1),
    noseStart: 36.5 + stretch,
    tile: TILE_LONG(36.5 + stretch, shipHeight),
    forward: { az: 110, thickness: 0.24, outline: [[3.1, 40.9 + stretch], [7.9, 40.9 + stretch], [7.9, 43.3 + stretch], [3.5, 49 + stretch], [2.4, 49 + stretch]] },
    aft: { az: 90, thickness: 0.4, outline: [[4.3, 0.3], [8.1, 0.3], [8.1, 6.2], [5, 11.9], [4.3, 11.9]] },
    door: [33 + stretch, 41 + stretch],
    docking: true,
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** One Raptor from its exit up: the bell, its dark inside and the machinery over it. Its origin is the middle of its exit. */
export function raptor(at: readonly [number, number], y: number, type: "sea" | "vacuum"): Piece[] {
  const vac = type === "vacuum";
  const exit = vac ? 1.15 : 0.6;
  const length = vac ? 4.4 : 3.1;
  const throat = vac ? 0.26 : 0.22;
  const neck = y + length * (vac ? 0.72 : 0.5);
  const bell: Lathe = {
    kind: "lathe",
    material: "bell",
    at,
    segs: vac ? 18 : 12,
    under: true,
    outline: true,
    profile: [
      [exit, y],
      [exit * 0.9, y + (neck - y) * 0.28],
      [exit * 0.68, y + (neck - y) * 0.58],
      [exit * 0.42, y + (neck - y) * 0.86],
      [throat, neck],
    ],
    rings: [y],
  };
  const inside: Lathe = {
    kind: "lathe",
    material: "bell-inside",
    at,
    segs: vac ? 18 : 12,
    under: true,
    profile: [
      [throat * 0.8, neck - 0.1],
      [exit * 0.62, y + (neck - y) * 0.5],
      [exit * 0.97, y + 0.015],
    ],
  };
  const throatDisc: Lathe = { kind: "lathe", material: "soot", at, segs: 8, under: true, only: "mesh", profile: [[0, neck - 0.1], [throat * 0.8, neck - 0.1]] };
  const head: Lathe = {
    kind: "lathe",
    material: "engine-metal",
    at,
    segs: 10,
    under: true,
    only: "mesh",
    profile: [
      [throat, neck],
      [0.42, neck + (length * 0.5 - (neck - y)) * 0.3 + 0.2],
      [0.48, y + length - 0.3],
      [0.3, y + length],
    ],
  };
  return [bell, inside, throatDisc, head];
}

function engineRings(rings: readonly EngineDraw[], y: number): Piece[] {
  const pieces: Piece[] = [];
  for (const { ring: r, count, start, type } of rings)
    for (let i = 0; i < count; i++) {
      const a = deg(start + (360 * i) / count);
      pieces.push(...raptor([r * Math.sin(a), r * Math.cos(a)], y, type));
    }
  return pieces;
}

/** Clips a line through a convex outline. */
function clip(a: readonly [number, number], b: readonly [number, number], outline: readonly (readonly [number, number])[]): [[number, number], [number, number]] | null {
  let t0 = 0;
  let t1 = 1;
  const d = [b[0] - a[0], b[1] - a[1]];
  let area = 0;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    const q = outline[(i + 1) % outline.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const sign = area > 0 ? 1 : -1;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    const q = outline[(i + 1) % outline.length];
    const nx = -(q[1] - p[1]) * sign;
    const ny = (q[0] - p[0]) * sign;
    const denom = nx * d[0] + ny * d[1];
    const dist = nx * (a[0] - p[0]) + ny * (a[1] - p[1]);
    if (Math.abs(denom) < 1e-9) {
      if (dist < 0) return null;
      continue;
    }
    const t = -dist / denom;
    if (denom > 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
  }
  if (t0 >= t1) return null;
  return [
    [a[0] + d[0] * t0, a[1] + d[1] * t0],
    [a[0] + d[0] * t1, a[1] + d[1] * t1],
  ];
}

/** A grid fin held out flat: a frame and a lattice, u outwards and v along the circle. */
export function gridFin(azDeg: number, y: number, rootRadius: number, reach: number, width: number, thick: number, octagon: boolean): Piece[] {
  const frame = flat(deg(azDeg), y);
  const r0 = rootRadius + 0.35;
  const hw = width / 2;
  const cut = octagon ? width * 0.28 : width * 0.04;
  const outline: [number, number][] = octagon
    ? [
        [r0, -hw + cut],
        [r0 + cut, -hw],
        [reach - cut, -hw],
        [reach, -hw + cut],
        [reach, hw - cut],
        [reach - cut, hw],
        [r0 + cut, hw],
        [r0, hw - cut],
      ]
    : [
        [r0, -hw],
        [reach, -hw],
        [reach, hw],
        [r0, hw],
      ];
  const pieces: Piece[] = [];
  // the lattice in the drawing is a plate with lines; in the mesh it is real bars
  const pitch = width / (octagon ? 8 : 6);
  const ribs: [[number, number], [number, number]][] = [];
  const span = reach + width;
  for (let k = -12; k <= 12; k++) {
    for (const dir of [1, -1]) {
      const c = k * pitch * Math.SQRT2;
      const a: [number, number] = [r0 - span, c - dir * span];
      const b: [number, number] = [r0 + span, c + dir * span];
      const cut2 = clip(a, b, outline);
      if (!cut2) continue;
      ribs.push(cut2);
      pieces.push(strut("fin-dark", pointOf(frame, cut2[0][0], cut2[0][1], -thick / 2 + 0.2), pointOf(frame, cut2[1][0], cut2[1][1], -thick / 2 + 0.2), thick * 0.62, 0.05, { only: "mesh" }));
    }
  }
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i];
    const q = outline[(i + 1) % outline.length];
    pieces.push(strut("fin", pointOf(frame, p[0], p[1], 0), pointOf(frame, q[0], q[1], 0), thick, 0.13, { only: "mesh" }));
  }
  pieces.push({ kind: "plate", material: "fin-dark", frame, outline, thickness: thick * 0.9, ribs, only: "drawing" });
  // the line look in 3D: the frame's edge at both faces
  pieces.push({
    kind: "lines",
    weight: "feature",
    only: "mesh",
    paths: [thick / 2, -thick / 2].map((c) => [...outline, outline[0]].map(([a, b]) => pointOf(frame, a, b, c))),
  });
  pieces.push({
    kind: "lines",
    weight: "weld",
    only: "mesh",
    paths: ribs.map(([p, q]) => [pointOf(frame, p[0], p[1], -thick / 2 - 0.01), pointOf(frame, q[0], q[1], -thick / 2 - 0.01)]),
  });
  // where it meets the hull
  pieces.push(strut("fin", pointOf(frame, rootRadius - 0.1, 0, 0), pointOf(frame, r0 + 0.05, 0, 0), 1, 0.7, { only: "mesh" }));
  return pieces;
}

/** A flap's plate, tiled on its windward face. `outline` is [radius, height]. */
export function flap(draw: FlapDraw, side: 1 | -1): Plate {
  const az = deg(draw.az) * side;
  const frame = radial(az);
  // w must look windward, so the +w face takes the tiles
  const windward: Frame = side > 0 ? frame : { ...frame, w: [-frame.w[0], -frame.w[1], -frame.w[2]] };
  return { kind: "plate", material: "steel", top: "tile-plain", frame: windward, outline: draw.outline, thickness: draw.thickness };
}

/** A flap's root fairing above it. */
function fairing(azDeg: number, y0: number, y1: number, surface: (y: number) => number, proud: number): Plate {
  const frame = radial(deg(azDeg));
  const r0 = surface(y0);
  const r1 = surface(y1);
  return { kind: "plate", material: "tile-plain", frame, outline: [[r0 - 0.2, y0], [r0 + proud, y0], [r1 - 0.2, y1]], thickness: 0.7, plain: false };
}

/** A hull with the given profile and a tile arc: tile on the windward side, steel on the rest, on the same stations. */
function hullWithTiles(profile: readonly (readonly [number, number])[], tile: StarshipDraw["tile"], welds: readonly number[], segs: number): Lathe[] {
  const ys = [...new Set([...profile.map(([, y]) => y), ...tile.map(([y]) => y)])].sort((a, b) => a - b);
  const stations = ys.map((y) => [radiusAt(profile, y), y] as const);
  const half = (y: number): number => {
    for (let i = 0; i + 1 < tile.length; i++) if (y >= tile[i][0] && y <= tile[i + 1][0]) return deg(tile[i][1] + ((tile[i + 1][1] - tile[i][1]) * (y - tile[i][0])) / (tile[i + 1][0] - tile[i][0] || 1));
    return deg(tile[tile.length - 1][1]);
  };
  const FULL = deg(179.9);
  const tiles: Lathe = { kind: "lathe", material: "tile", profile: stations, segs, arc: (y) => [-half(y), half(y)], uv: true, body: true, welds: [] };
  const steelStations = stations.filter(([, y]) => half(y) < FULL || y === stations[stations.length - 1][1]);
  const steel: Lathe = { kind: "lathe", material: "steel", profile: steelStations.length > 1 ? steelStations : stations, segs, arc: (y) => [half(y), 2 * Math.PI - half(y)], uv: true, body: true, welds: welds.filter((y) => half(y) < FULL) };
  return [steel, tiles];
}

const weldsEvery = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let y = from + step; y < to - 0.2; y += step) out.push(Math.round(y * 100) / 100);
  return out;
};

/** The vented ring: struts between two rims, on top of the booster. */
function hotStage(d: StarshipDraw): Piece[] {
  const { radius: r, boosterHeight: H, ring: g } = d;
  const y0 = H - g.height;
  const pieces: Piece[] = [];
  // the forward dome, seen through the vents
  const domeTop = y0 + g.height * (g.integrated ? 0.72 : 0.5);
  pieces.push({
    kind: "lathe",
    material: g.integrated ? "steel" : "soot",
    segs: 40,
    only: "mesh",
    profile: [
      [r - 0.05, y0 - 0.05],
      [r * 0.82, y0 + (domeTop - y0) * 0.55],
      [r * 0.5, y0 + (domeTop - y0) * 0.9],
      [0, domeTop],
    ],
  });
  // the rims
  pieces.push({ kind: "lathe", material: "steel", segs: 64, outline: false, body: true, rings: [H - 0.05, H - 0.4], profile: [[r - 0.45, H - 0.4], [r, H - 0.4], [r, H], [r - 0.45, H]] });
  for (let i = 0; i < g.struts; i++) {
    const a0 = deg((360 * i) / g.struts);
    const a1 = deg((360 * (i + 0.5)) / g.struts);
    const a2 = deg((360 * (i + 1)) / g.struts);
    const low = (a: number): Vec3 => [(r - 0.05) * Math.sin(a), y0, (r - 0.05) * Math.cos(a)];
    const high = (a: number): Vec3 => [(r - 0.1) * Math.sin(a), H - 0.4, (r - 0.1) * Math.cos(a)];
    pieces.push(strut("engine-pale", low(a0), high(a1), 0.2, 0.12));
    pieces.push(strut("engine-pale", high(a1), low(a2), 0.2, 0.12));
  }
  // the drawing's picture of them: one zigzag, with the dark gap behind it
  const zig: Vec3[] = [];
  for (let i = 0; i <= g.struts; i++) {
    const a = deg((360 * i) / (g.struts * 2)) * 2;
    zig.push([(r - 0.05) * Math.sin(a), y0, (r - 0.05) * Math.cos(a)]);
    const b = a + deg(180 / g.struts);
    zig.push([(r - 0.1) * Math.sin(b), H - 0.4, (r - 0.1) * Math.cos(b)]);
  }
  pieces.push({ kind: "lathe", material: "soot", segs: 40, only: "drawing", body: true, profile: [[r - 0.15, y0], [r - 0.15, H - 0.4]] });
  pieces.push({ kind: "lines", weight: "feature", only: "drawing", paths: [zig] });
  if (g.integrated) {
    // the dark vent tongues under the ring
    for (let i = 0; i < g.struts; i++) {
      const a = deg((360 * i) / g.struts);
      pieces.push({ kind: "plate", material: "soot", frame: radial(a), outline: [[r - 0.15, y0 - 1.6], [r + 0.06, y0 - 1.6], [r + 0.06, y0], [r - 0.15, y0]], thickness: 0.55, plain: true });
    }
  }
  return pieces;
}

/** Super Heavy: its base on the axis at the bells' exit. */
export function boosterPieces(d: StarshipDraw): Piece[] {
  const { radius: r, boosterHeight: H, boosterSkirt: skirt, boosterBay: bay } = d;
  const topOfHull = H - d.ring.height;
  const body: Lathe = {
    kind: "lathe",
    material: "steel",
    segs: 64,
    uv: true,
    body: true,
    outline: true,
    profile: [
      [r - (d.shielded ? 0 : 0.25), skirt],
      [r, skirt + (d.shielded ? 0.001 : 0.7)],
      [r, topOfHull],
    ],
    rings: [skirt + (d.shielded ? 1.8 : 0.7), topOfHull - 0.02, topOfHull * 0.62],
    welds: weldsEvery(skirt, topOfHull, 1.83),
  };
  const pieces: Piece[] = [body];
  // the thrust section: dark, under the steel
  pieces.push({
    kind: "lathe",
    material: "soot",
    segs: 48,
    under: true,
    profile: [
      [0, bay],
      [r - 0.3, bay],
      [r - 0.25, skirt],
    ],
    rings: [bay],
  });
  if (d.shielded) pieces.push({ kind: "lathe", material: "soot", segs: 48, only: "mesh", profile: [[r - 0.05, bay], [r - 0.05, skirt]] });
  else
    pieces.push({ kind: "lathe", material: "dark", segs: 48, under: true, rings: [skirt - 0.5], profile: [[r - 0.6, bay - 0.5], [r - 0.2, bay - 0.5], [r - 0.16, skirt + 0.35]] });
  pieces.push(...engineRings(d.boosterEngines, 0));
  // chines: long flats down the lower hull
  for (const az of d.chines.az) {
    const frame = radial(deg(az));
    pieces.push({
      kind: "plate",
      material: "steel",
      frame,
      outline: [
        [r - 0.1, d.chines.from],
        [r + d.chines.out, d.chines.from + 0.8],
        [r + d.chines.out, d.chines.to - 1],
        [r - 0.1, d.chines.to + 1.2],
      ],
      thickness: 1.6,
    });
  }
  // the raceways
  for (const az of [0, 180]) pieces.push(strut("engine-metal", pointOf(radial(deg(az)), r + 0.08, skirt + 3), pointOf(radial(deg(az)), r + 0.08, topOfHull - 8), 0.5, 0.2, { plain: false }));
  // the band of vents round the common dome
  pieces.push({ kind: "lathe", material: "engine-metal", segs: 64, only: "mesh", profile: [[r + 0.015, topOfHull * 0.62 - 0.12], [r + 0.015, topOfHull * 0.62 + 0.12]] });
  for (const az of d.fins.az) pieces.push(...gridFin(az, d.fins.y, r, d.fins.reach, d.fins.width, d.fins.thick, d.fins.octagon));
  if (d.ring.height > 0) pieces.push(...hotStage(d));
  else pieces.push({ kind: "lathe", material: "soot", segs: 48, profile: [[r, topOfHull], [0, topOfHull]], only: "mesh" });
  return pieces;
}

/** The ship: its base on the axis at the bottom of its skirt. */
export function shipPieces(d: StarshipDraw): Piece[] {
  const { radius: r, shipHeight: H, noseStart } = d;
  const noseH = H - noseStart;
  const nose: [number, number][] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    // the points gather at the tip, which is round
    const t = 1 - (1 - i / steps) ** 1.8;
    nose.push([r * Math.sqrt(Math.max(0, 1 - t ** 2.15)), noseStart + noseH * t]);
  }
  const profile: [number, number][] = [[r, 0], ...nose];
  profile[profile.length - 1] = [0.001, H];
  const welds = weldsEvery(0, noseStart + 3, 1.83);
  const pieces: Piece[] = [...hullWithTiles(profile, d.tile, welds, 72)];
  // the bay under it
  pieces.push({ kind: "lathe", material: "soot", segs: 48, under: true, profile: [[0, 1.3], [r - 0.12, 1.3], [r - 0.12, 0], [r, 0]], rings: [0.02] });
  pieces.push(...engineRings(d.shipEngines, 0.2));
  const surface = (y: number) => radiusAt(profile, y);
  for (const side of [1, -1] as const) {
    pieces.push(flap(d.aft, side));
    pieces.push(flap(d.forward, side));
    const aftTop = Math.max(...d.aft.outline.map(([, y]) => y));
    pieces.push(fairing(d.aft.az * side, aftTop - 1, aftTop + 2.8, surface, 0.8));
    const fwdBottom = Math.min(...d.forward.outline.map(([, y]) => y));
    pieces.push(fairing(d.forward.az * side, fwdBottom + 1, fwdBottom - 2.4, surface, 0.6));
  }
  // leeward raceways
  for (const az of [165, -165]) pieces.push(strut("engine-metal", pointOf(radial(deg(az)), r + 0.05, 8), pointOf(radial(deg(az)), r + 0.05, Math.max(noseStart - 4, 12)), 0.3, 0.14, { plain: false }));
  if (d.door) {
    const az = (a: number): Vec3 => [(r + 0.02) * Math.sin(deg(a)), 0, (r + 0.02) * Math.cos(deg(a))];
    const at = (a: number, y: number): Vec3 => [az(a)[0], y, az(a)[2]];
    const path: Vec3[] = [];
    for (let a = 145; a <= 215; a += 5) path.push(at(a, d.door[0]));
    for (let a = 215; a >= 145; a -= 5) path.push(at(a, d.door[1]));
    path.push(at(145, d.door[0]));
    pieces.push({ kind: "lines", weight: "feature", paths: [path] });
    if (d.docking) for (const a of [152, 208]) pieces.push({ kind: "plate", material: "dark", frame: radial(deg(a)), outline: [[r - 0.2, d.door[1] + 1], [r + 0.25, d.door[1] + 1], [r + 0.25, d.door[1] + 2.4], [r - 0.2, d.door[1] + 2.4]], thickness: 1.5 });
  }
  return pieces;
}
