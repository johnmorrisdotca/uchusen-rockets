// Falcon 9, Falcon Heavy, Dragon and Grasshopper from tables of numbers. Heights and diameters are the sourced figures where there are any. How a part is drawn is not a published figure: Block 5, Dragon 2, Dragon 1, Falcon Heavy
// and Grasshopper take their proportions from their licensed models at the sourced sizes (see NOTICE.md), and the older Falcons from the sourced totals and the documented differences.
import { deg } from "../framing.ts";
import { type Lathe, type Piece, pointOf, radial, strut, type Vec3 } from "./pieces.ts";
import { gridFin } from "./starship.ts";

/** A rocket engine from its exit up: bell, dark inside and a body. */
export function merlin(at: readonly [number, number], y: number, exit: number, length: number): Piece[] {
  const neck = y + length * 0.62;
  const throat = exit * 0.34;
  const bell: Lathe = { kind: "lathe", material: "bell", at, segs: 12, under: true, outline: true, rings: [y], profile: [[exit, y], [exit * 0.82, y + (neck - y) * 0.4], [exit * 0.5, y + (neck - y) * 0.8], [throat, neck]] };
  const inside: Lathe = { kind: "lathe", material: "bell-inside", at, segs: 12, under: true, profile: [[throat * 0.8, neck - 0.05], [exit * 0.96, y + 0.01]] };
  const head: Lathe = { kind: "lathe", material: "engine-metal", at, segs: 8, under: true, only: "mesh", profile: [[throat, neck], [exit * 0.5, y + length * 0.82], [exit * 0.4, y + length]] };
  return [bell, inside, head];
}

export interface FirstStageDraw {
  /** With its interstage. */
  height: number;
  interstage: number;
  radius: number;
  /** "octaweb": eight round one. "grid": three by three, as v1.0. */
  engines: "octaweb" | "grid";
  legs: boolean;
  fins: boolean;
}

export interface FalconDraw {
  first: FirstStageDraw;
  second: { height: number; joint: number; radius: number; nozzle: number };
  fairing: { height: number; radius: number };
}

const R = 1.85;

/** Each part's height is the sourced figure where there is one; the others share out what the sourced whole leaves, so the parts add up to it. */
const falconOf = (first: number, interstage: number, secondHeight: number, joint: number, fairing: number, fairingRadius: number, engines: "octaweb" | "grid", legs: boolean, fins: boolean): FalconDraw => ({
  first: { height: first, interstage, radius: R, engines, legs, fins },
  second: { height: secondHeight, joint, radius: R, nozzle: joint * 0.9 },
  fairing: { height: fairing, radius: fairingRadius },
});

export const FALCON_DRAWS: Readonly<Record<string, FalconDraw>> = {
  // 54.9 m in all: 39.6 m of stage. The interstage, second stage and fairing are shared out: thin evidence
  "v1.0": falconOf(44.5, 4.9, 7, 3, 6.4, 2.6, "grid", false, false),
  // 68.4 m in all: 41.2 m of stage
  "v1.1": falconOf(46, 4.8, 13.8, 4.5, 13.1, 2.6, "octaweb", true, false),
  ft: falconOf(47.7, 6.5, 13.8, 4.8, 13.1, 2.6, "octaweb", true, true),
  "block-5": falconOf(47.7, 6.5, 13.8, 4.6, 13.1, 2.6, "octaweb", true, true),
};

function firstStage(d: FirstStageDraw, withTop: boolean): Piece[] {
  const { height: H, interstage, radius: r } = d;
  const tank = H - interstage;
  const pieces: Piece[] = [];
  const skirt = 1.2;
  const hull: Lathe = { kind: "lathe", material: "white", segs: 48, uv: false, body: true, outline: true, profile: [[r, skirt], [r, tank]], rings: [skirt + 0.02, tank * 0.28, tank * 0.74], welds: [tank * 0.5, tank * 0.62, tank * 0.86] };
  pieces.push(hull);
  if (withTop) pieces.push({ kind: "lathe", material: "black", segs: 48, body: true, outline: true, profile: [[r, tank], [r, H]], rings: [tank + 0.02, H - 0.02], welds: [tank + interstage * 0.5] });
  pieces.push({ kind: "lathe", material: "soot", segs: 36, under: true, profile: [[0, skirt + 0.5], [r - 0.1, skirt + 0.5], [r, skirt]], rings: [skirt + 0.5] });
  if (d.engines === "grid") {
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) pieces.push(...merlin([i * 1.05, j * 1.05], 0, 0.42, 2));
  } else {
    pieces.push(...merlin([0, 0], 0, 0.46, 2));
    for (let i = 0; i < 8; i++) {
      const a = deg(22.5 + i * 45);
      pieces.push(...merlin([1.32 * Math.sin(a), 1.32 * Math.cos(a)], 0.1, 0.46, 1.9));
    }
  }
  // a raceway up the back
  pieces.push(strut("black", pointOf(radial(Math.PI), r + 0.06, skirt + 1), pointOf(radial(Math.PI), r + 0.06, tank + 0.5), 0.28, 0.14, { plain: false }));
  if (d.legs)
    for (const az of [45, 135, 225, 315]) {
      const frame = radial(deg(az));
      pieces.push({ kind: "plate", material: "black", frame, outline: [[r - 0.05, 0.8], [r + 0.5, 0.8], [r + 0.55, 3], [r + 0.15, 10.5], [r - 0.05, 11]], thickness: 1.2 });
    }
  if (d.fins) for (const az of [45, 135, 225, 315]) pieces.push(...gridFin(az, tank + 0.1, r, r + 1.4, 1.5, 0.3, false));
  return pieces;
}

function secondStage(d: FalconDraw["second"]): Piece[] {
  const { height, joint, radius: r, nozzle } = d;
  const pieces: Piece[] = [];
  pieces.push({ kind: "lathe", material: "white", segs: 48, body: true, outline: true, profile: [[r * 0.6, joint - 0.5], [r, joint], [r, height]], rings: [joint + 0.5, height - 0.05], welds: [(joint + height) / 2] });
  pieces.push({ kind: "lathe", material: "soot", segs: 36, under: true, only: "mesh", profile: [[0, joint - 0.5], [r * 0.6, joint - 0.5]] });
  pieces.push(...merlin([0, 0], 0, r * 0.62, nozzle * 1.06));
  return pieces;
}

function fairing(d: FalconDraw["fairing"], jointRadius: number): Piece[] {
  const { height: H, radius: r } = d;
  const profile: [number, number][] = [[jointRadius, 0], [r, H * 0.16]];
  const steps = 10;
  const start = H * 0.4;
  for (let i = 0; i <= steps; i++) {
    const t = 1 - (1 - i / steps) ** 1.7;
    profile.push([r * Math.sqrt(Math.max(0, 1 - t ** 2.1)), start + (H - start) * t]);
  }
  profile[profile.length - 1] = [0.001, H];
  const seam = (a: number): Vec3[] => profile.slice(1).map(([rr, y]) => [(rr + 0.01) * Math.sin(a), y, (rr + 0.01) * Math.cos(a)] as Vec3);
  return [
    { kind: "lathe", material: "white", segs: 48, body: true, outline: true, profile, rings: [H * 0.16] },
    { kind: "lathe", material: "soot", segs: 24, under: true, only: "mesh", profile: [[0, 0], [jointRadius, 0]] },
    { kind: "lines", weight: "feature", paths: [seam(deg(90)), seam(deg(-90))] },
  ];
}

export const falconFirstStage = (id: string) => firstStage(FALCON_DRAWS[id].first, true);
export const falconSecondStage = (id: string) => secondStage(FALCON_DRAWS[id].second);
export const falconFairing = (id: string) => fairing(FALCON_DRAWS[id].fairing, R);

// ---------------------------------------------------------------------------------------------------------------------------------
// Dragon

export interface DragonDraw {
  capsule: number;
  /** How far its heat shield nests into the trunk. */
  nest: number;
  trunk: number;
  baseRadius: number;
  trunkRadius: number;
  windows: boolean;
  wings: boolean;
  fins: boolean;
}

export const DRAGON_DRAWS: Readonly<Record<string, DragonDraw>> = {
  "dragon-1": { capsule: 3.8, nest: 0, trunk: 2.3, baseRadius: 1.85, trunkRadius: 1.8, windows: false, wings: true, fins: false },
  // the capsule's 4.5 m includes its heat shield, which nests 0.34 m into the trunk: 3.94 m of trunk and that make the sourced 8.1 m
  "dragon-2": { capsule: 4.5, nest: 0.342, trunk: 3.94, baseRadius: 2, trunkRadius: 1.92, windows: true, wings: false, fins: true },
};

export function capsule(d: DragonDraw): Piece[] {
  const H = d.capsule;
  const r = d.baseRadius;
  const shoulder = H * 0.74;
  const n = d.nest;
  const profile: [number, number][] = [[r * 0.9, n], [r, n + 0.3], [r * 0.93, n + 0.7], [r * 0.5, shoulder], [r * 0.47, H * 0.84], [r * 0.3, H * 0.95], [0.001, H]];
  const pieces: Piece[] = [{ kind: "lathe", material: "white", segs: 48, body: true, outline: true, profile, rings: [n + 0.3, shoulder], welds: [H * 0.3] }];
  pieces.push({ kind: "lathe", material: "soot", segs: 40, under: true, profile: [[0, 0], [r * 0.72, 0], [r * 0.9, n]], rings: [n] });
  if (d.windows)
    for (const az of [38, -38, 142, -142]) {
      const frame = radial(deg(az));
      pieces.push({ kind: "plate", material: "glass", frame, outline: [[r * 0.76, H * 0.31], [r * 0.73, H * 0.39], [r * 0.64, H * 0.43], [r * 0.6, H * 0.36]], thickness: 0.36 });
    }
  return pieces;
}

export function trunk(d: DragonDraw): Piece[] {
  const H = d.trunk;
  const r = d.trunkRadius;
  const pieces: Piece[] = [];
  if (d.fins) {
    // half of it is solar cells, half white, with four fins at the foot
    const half = (y: number): readonly [number, number] => { void y; return [-Math.PI / 2, Math.PI / 2]; };
    pieces.push({ kind: "lathe", material: "solar", segs: 40, body: true, profile: [[r, 0], [r, H]], arc: half, rings: [H - 0.02] });
    pieces.push({ kind: "lathe", material: "white", segs: 40, body: true, profile: [[r, 0], [r, H]], arc: () => [Math.PI / 2, (3 * Math.PI) / 2], rings: [H - 0.02] });
    for (const az of [45, 135, 225, 315]) pieces.push({ kind: "plate", material: "white", frame: radial(deg(az)), outline: [[r - 0.05, 0], [r + 0.6, 0], [r + 0.25, 1.4], [r - 0.05, 1.8]], thickness: 0.12 });
  } else {
    pieces.push({ kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile: [[r, 0], [r, H]], rings: [0.02, H - 0.02], welds: [H * 0.5] });
  }
  pieces.push({ kind: "lathe", material: "soot", segs: 30, under: true, only: "mesh", profile: [[0, 0.02], [r, 0.02]] });
  if (d.wings) {
    for (const side of [1, -1]) {
      const frame = radial(deg(90 * side), H * 0.5);
      pieces.push({ kind: "plate", material: "solar", frame, outline: [[r + 0.5, -0.75], [r + 5.8, -0.75], [r + 5.8, 0.75], [r + 0.5, 0.75]], thickness: 0.08, ribs: [1.5, 2.5, 3.5, 4.5].map((u) => [[r + u, -0.75], [r + u, 0.75]]) });
      pieces.push(strut("gold", pointOf(frame, r - 0.05, 0), pointOf(frame, r + 0.55, 0), 0.14, 0.14));
    }
  }
  return pieces;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Falcon Heavy

/** A side booster, with its nose cone in place of an upper stage. */
export function sideBooster(height: number, r: number, side: 1 | -1): Piece[] {
  const nose = 5.5;
  const tank = height - nose;
  const pieces = firstStage({ height: tank, interstage: 0.001, radius: r, engines: "octaweb", legs: true, fins: false }, false);
  const profile: [number, number][] = [[r, tank]];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    profile.push([r * Math.sqrt(Math.max(0, 1 - t ** 1.9)), tank + nose * t]);
  }
  profile[profile.length - 1] = [0.001, height];
  pieces.push({ kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile, rings: [tank + 0.02] });
  // where it holds the centre core
  const frame = radial(deg(90 * -side));
  pieces.push(strut("black", pointOf(frame, r, tank - 1), pointOf(frame, r + 0.5, tank - 1), 0.4, 0.4));
  for (const az of [0, 180]) pieces.push(...gridFin(az + 45, tank - 0.3, r, r + 1.4, 1.5, 0.3, false));
  return pieces;
}

export function centreCore(height: number, r: number): Piece[] {
  const first = 47.7;
  const pieces = firstStage({ height: first, interstage: 6.5, radius: r, engines: "octaweb", legs: true, fins: false }, true);
  const secondTop = height - 13.1;
  pieces.push({ kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile: [[r, first], [r, secondTop]], rings: [secondTop - 0.02] });
  const fair = fairing({ height: 13.1, radius: 2.6 }, r);
  for (const piece of fair) {
    if (piece.kind === "lathe") pieces.push({ ...piece, profile: piece.profile.map(([a, b]) => [a, b + secondTop] as const), rings: piece.rings?.map((y) => y + secondTop), under: false, body: true });
    else if (piece.kind === "lines") pieces.push({ ...piece, paths: piece.paths.map((path) => path.map(([x, y, z]) => [x, y + secondTop, z] as Vec3)) });
  }
  return pieces;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Grasshopper

export function grasshopper(height: number): Piece[] {
  const hullBottom = height * 0.17;
  const r = 1.57;
  const frameTop = hullBottom + 0.2;
  const pieces: Piece[] = [];
  const profile: [number, number][] = [[r, hullBottom], [r, height - 2.4], [r * 0.7, height - 1], [r * 0.32, height - 0.2], [0.001, height]];
  pieces.push({ kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile, rings: [height - 2.4, hullBottom + 0.05], welds: [height * 0.4, height * 0.6, height * 0.8] });
  pieces.push({ kind: "lathe", material: "soot", segs: 30, under: true, only: "mesh", profile: [[0, hullBottom], [r, hullBottom]] });
  pieces.push(...merlin([0, 0], 1.2, 0.5, 3.2));
  // the blue frame
  const low = hullBottom - 2.8;
  for (const a of [45, 135, 225, 315]) {
    const f = radial(deg(a));
    pieces.push(strut("blue", pointOf(f, 2.2, low), pointOf(f, 2.2, frameTop), 0.2, 0.2, { plain: false }));
    pieces.push(strut("blue", pointOf(f, 2.2, low), pointOf(f, 0.5, low + 1), 0.16, 0.16, { plain: false }));
    // the leg: from the frame out to a foot, and a strut back up
    pieces.push(strut("engine-pale", pointOf(f, 2.2, low + 0.5), pointOf(f, 5.3, 0.1), 0.2, 0.2, { plain: false }));
    pieces.push(strut("engine-pale", pointOf(f, 2.2, frameTop - 0.5), pointOf(f, 5.3, 0.1), 0.14, 0.14, { plain: false }));
    pieces.push({ kind: "plate", material: "dark", frame: { o: [f.u[0] * 5.3, 0.05, f.u[2] * 5.3], u: f.u, v: f.w, w: [0, 1, 0] }, outline: [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]], thickness: 0.1, plain: true });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * 90 + 45) * (Math.PI / 180);
    const b = ((i + 1) * 90 + 45) * (Math.PI / 180);
    const p = (ang: number, y: number): Vec3 => [2.2 * Math.sin(ang), y, 2.2 * Math.cos(ang)];
    for (const y of [low, frameTop]) pieces.push(strut("blue", p(a, y), p(b, y), 0.18, 0.18, { plain: false }));
    pieces.push(strut("blue", p(a, low), p(b, frameTop), 0.12, 0.12, { plain: true }));
  }
  // the bottles round the frame
  for (const a of [0, 90, 180, 270]) pieces.push({ kind: "plate", material: "dark", frame: radial(deg(a)), outline: [[2.05, frameTop - 1.6], [2.28, frameTop - 1.6], [2.28, frameTop - 0.5], [2.05, frameTop - 0.5]], thickness: 2.4, plain: false });
  return pieces;
}
