// The concepts' drives (LESSONS 29: no scaled-up rocket bells). A drive here is many magnetic-nozzle thrusters, arrays of them, with a stack of field-coil rings behind. Ancestors: the VASIMR VX-200 (a helicon plasma
// source, an ion-cyclotron booster and superconducting magnets with a magnetic nozzle), Princeton's direct fusion drive (a linear fusion chamber ringed by coils, exhausting through a magnetic nozzle), the Daedalus
// study's coil-held reaction chamber and NASA's nested-channel X3 Hall thruster. Thrusters point their exhaust down the ship's axis, towards -Y, from a mounting plane at y = 0. Pure: no three.js and no DOM.
import { annulus, hoop, type Piece, pipeRun, place, revolve, rod, stamp, type Vec3 } from "./adapter.ts";
import { deg } from "./adapter.ts";

/** What one drive is: how many thrusters of what size, and where. */
export interface ThrusterRing {
  count: number;
  /** Radius of the ring on the thrust plate, metres. */
  r: number;
  /** The thruster's scale: its nozzle flares to 3.6 s across. */
  s: number;
  /** Degrees to turn the first thruster from the +Z axis. */
  start?: number;
}

/** The longest and widest one thruster of scale `s` is, metres: chamber and nozzle down the axis, the flare's outer radius. */
export const thrusterSize = (s: number): { up: number; down: number; radius: number } => ({ up: 9.6 * s, down: 5.5 * s, radius: 3.7 * s });

/** One magnetic-nozzle thruster, its mounting plane at y = 0. A ceramic plasma chamber with its helicon antenna and a stack of superconducting coils, a cryocooler radiator, a feed manifold with three feed lines, a ceramic throat liner, and below it a nozzle that is no bell: six separate field-coil rings growing in radius on struts, which shape the exhaust. */
export function mnThruster(s: number): Piece[] {
  const out: Piece[] = [];
  // the chamber: a ceramic body, domed at the top
  out.push(revolve("hull-white", [[0.01, 9.0 * s], [0.55 * s, 8.85 * s], [0.9 * s, 8.3 * s], [1.0 * s, 7.4 * s], [1.0 * s, 0.4 * s], [0.8 * s, 0.2 * s]], 24, [0, 0], { body: true, outline: true }));
  // the helicon antenna: a double-helix strap on the upper chamber, drawn as five bands
  for (let i = 0; i < 5; i++) out.push(hoop("copper", 1.04 * s, (6.2 + 0.28 * i) * s, 0.05 * s, 24, 6));
  // booster coils, superconducting, wound on the chamber with a clamp band between each
  for (let i = 0; i < 5; i++) out.push(hoop("coil", 1.2 * s, (1.1 + 0.95 * i) * s, 0.2 * s, 28, 8), hoop("hull-grey-dark", 1.08 * s, (1.1 + 0.95 * i + 0.5) * s, 0.09 * s, 20, 6));
  // the feed manifold ring and three feed lines up and out, with flanges
  out.push(hoop("pipe-steel", 1.15 * s, 7.6 * s, 0.14 * s, 24, 8));
  for (let k = 0; k < 3; k++) {
    const a = deg(120 * k + 30);
    const x = 1.15 * s * Math.sin(a);
    const z = 1.15 * s * Math.cos(a);
    out.push(...pipeRun([[x, 7.6 * s, z], [x * 1.5, 9.4 * s, z * 1.5], [x * 2.1, 11.0 * s, z * 2.1]], 0.12 * s, k === 1 ? "coolant" : "pipe-steel", { ends: ["flange", "flange"], bracketEvery: 6 * s }));
  }
  // the cryocooler radiator: four thin fins on the chamber
  for (let k = 0; k < 4; k++) {
    const a = deg(90 * k + 45);
    const c = Math.cos(a);
    const n = Math.sin(a);
    out.push({ kind: "plate", material: "radiator", frame: { o: [(1.0 + 0.5) * s * n, 3.2 * s, (1.0 + 0.5) * s * c], u: [c, 0, -n], v: [0, 1, 0], w: [n, 0, c] }, outline: [[-0.5 * s, -1.8 * s], [0.5 * s, -1.8 * s], [0.5 * s, 1.8 * s], [-0.5 * s, 1.8 * s]], thickness: 0.04 * s, plain: true, only: "mesh" });
  }
  // the ceramic throat liner at the mouth of the chamber: the one piece of solid nozzle there is, and the point the exhaust leaves from
  out.push(revolve("bell", [[0.75 * s, -0.25 * s], [0.6 * s, 0.1 * s], [0.62 * s, 0.4 * s], [0.9 * s, 0.4 * s], [0.9 * s, 0.1 * s], [0.75 * s, -0.25 * s]], 24, [0, 0], { outline: true }));
  // the magnetic nozzle: six coil rings, each wider than the one before, held on struts
  const radii = [1.5, 1.95, 2.45, 3.0, 3.6, 3.7];
  radii.slice(0, 5).forEach((r, i) => out.push(hoop("coil-lit", r * s, -(0.7 + i * 0.95) * s, 0.17 * s, 32, 8, { outline: i === 4 })));
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    const c = Math.cos(a);
    const n = Math.sin(a);
    out.push(rod("hull-grey", [1.0 * s * n, 0.25 * s, 1.0 * s * c], [3.6 * s * n, -4.5 * s, 3.6 * s * c], 0.07 * s, 6));
  }
  // the mounting flange with its bolts
  out.push(annulus("hull-grey-dark", 0.9 * s, 1.7 * s, 0.2 * s, 0.55 * s, 24, { outline: true }));
  return out;
}

/** The thruster arranged in rings on a plane: the same template stamped at a pose for each. */
export function thrusterRings(rings: readonly ThrusterRing[], y: number): Piece[] {
  const out: Piece[] = [];
  const templates = new Map<number, Piece[]>();
  for (const ring of rings) {
    let template = templates.get(ring.s);
    if (!template) {
      template = mnThruster(ring.s);
      templates.set(ring.s, template);
    }
    const poses = Array.from({ length: ring.count }, (_, i) => {
      const a = deg((ring.start ?? 0) + (360 * i) / ring.count);
      return { at: [ring.r * Math.sin(a), y, ring.r * Math.cos(a)] as Vec3, yaw: (ring.start ?? 0) + (360 * i) / ring.count };
    });
    out.push(...stamp(template, ring.r === 0 ? [{ at: [0, y, 0] as Vec3 }] : poses));
  }
  return out;
}

/** A stack of fusion field-coil rings on an in-line chamber, y0 to y1, the way a linear fusion drive is wound: big superconducting coils with a clamp and a cooling pipe between each, a ceramic liner inside, and radial beams to a ring truss. */
export function coilStack(r: number, y0: number, y1: number, rings: number): Piece[] {
  const out: Piece[] = [];
  out.push(revolve("hull-white", [[r * 0.82, y0], [r * 0.82, y1]], 40, [0, 0], { body: true, outline: true }));
  const pitch = (y1 - y0) / rings;
  for (let i = 0; i < rings; i++) {
    const y = y0 + (i + 0.5) * pitch;
    out.push(hoop("coil", r, y, pitch * 0.2, 48, 10, { outline: true }), hoop("hull-grey-dark", r * 0.9, y + pitch * 0.34, pitch * 0.07, 40, 6), hoop("coolant", r * 1.03, y - pitch * 0.34, pitch * 0.06, 40, 6));
  }
  for (let k = 0; k < 8; k++) {
    const a = deg(45 * k);
    out.push(rod("hull-grey", [r * 1.25 * Math.sin(a), y0, r * 1.25 * Math.cos(a)], [r * 1.25 * Math.sin(a), y1, r * 1.25 * Math.cos(a)], r * 0.035, 8));
  }
  for (const y of [y0, y1]) out.push(hoop("hull-grey", r * 1.25, y, r * 0.04, 48, 8));
  return out;
}

/** The thrust plate: a deep round truss that takes the thrust of every thruster into the spine: a disc with radial girders and a ring girder. `y0` is its underside; thrusters mount on it. */
export function thrustPlate(r: number, y0: number, depth: number, spokes = 16): Piece[] {
  const out: Piece[] = [revolve("hull-grey-dark", [[0.01, y0], [r, y0], [r, y0 + depth * 0.35], [0.01, y0 + depth * 0.35]], 64, [0, 0], { body: true, outline: true })];
  out.push(hoop("hull-grey", r, y0 + depth * 0.5, depth * 0.5, 64, 10, { outline: true }), hoop("hull-white", r * 0.5, y0 + depth * 0.5, depth * 0.3, 48, 8));
  for (let k = 0; k < spokes; k++) {
    const a = deg((360 * k) / spokes);
    out.push(rod("hull-grey", [r * 0.12 * Math.sin(a), y0 + depth, r * 0.12 * Math.cos(a)], [r * Math.sin(a), y0 + depth * 0.6, r * Math.cos(a)], depth * 0.18, 8));
  }
  for (const f of [0.3, 0.55, 0.8]) out.push(hoop("hull-grey-dark", r * f, y0 + depth * 0.5, depth * 0.1, 48, 6));
  return out;
}

/** Moves a piece list to a pose, on the ship's axis or off it. */
export const at = (pieces: readonly Piece[], x: number, y: number, z: number, yaw = 0): Piece[] => place(pieces, { at: [x, y, z], yaw });
