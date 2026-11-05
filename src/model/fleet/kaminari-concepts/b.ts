// Concept B, "Keel and frame": a hull that is not a tube. A flattened wedge, 44 m thick and tapering in plan from 164 m across at the stern to 40 m at the bow, built the way a ship's hull is: an armoured keel girder
// under the centreline, six longerons along the edges, and transverse ribs every 30 m. Aft, the ribs stand open and the slim tanks and cargo containers lie in the frame in rows, in plain sight; forward, plating closes
// the bays and the crew's town sits behind rows of windows under a long glazed gallery. The drive is the broad kind LESSONS 29 asks of a wide ship: a grid of 27 magnetic-nozzle thrusters across the stern face.
// Real ancestors: a ship's keel and frames, the Space Shuttle's payload-bay longerons, the ISS pressurised modules' plating, Gateway's HALO and the Mars transfer vehicle studies' radiator fins. Pure: no three.js and no DOM.
import { type Face, facesOf, hatch, PLATE, plating, rng as numRng, stencil as faceStencil, vent } from "../ship-02/adapter.ts";
import { container } from "../ship-02/cargo.ts";
import { BUILDERS, cub, iBeam, type Piece, place, prism, rod, stamp, type Vec3 } from "./adapter.ts";
import { berthSlot } from "./berth.ts";
import { type ConceptSlot, reactorRows, stackOf } from "./common.ts";
import { SAIL_SLOTS } from "./sails.ts";
import { thrusterRings } from "./drive.ts";

/** The hull's numbers, metres. */
export const B = {
  H: 48,
  y0: 64,
  yNose: 1560,
  length: 1700,
  w0: 82,
  w1: 20,
  rib: 30,
  tank: { R: 9, L: 84, pitch: 90, y: 130, groups: 8 },
  cargo: { y: 946, cells: 3, deep: 82 },
  gallery: [1236, 1500] as const,
  plated: [1192, 1560] as const,
  reactors: { y: 70, rows: 3, cols: 8, pitch: 18 },
  grid: { cols: 9, rows: [-15, 0, 15], pitch: 16, s: 1.4, plane: 46 },
} as const;

/** Half the width of the hull at y, metres: the plan is a wedge. */
export const halfWidth = (y: number): number => (y >= B.yNose ? Math.max(4, B.w1 - ((y - B.yNose) / (B.length - B.yNose)) * (B.w1 - 4)) : B.w0 + ((y - B.y0) * (B.w1 - B.w0)) / (B.yNose - B.y0));

/** The six corners of a rib at y, in (x, z): the widest point at mid-height, and the four corners of the dorsal and ventral faces. */
const hex = (y: number, k = 1): [number, number][] => {
  const W = halfWidth(y) * k;
  const h = (B.H / 2) * k;
  return [[W, 0], [W * 0.62, h], [-W * 0.62, h], [-W, 0], [-W * 0.62, -h], [W * 0.62, -h]];
};

const local = (pieces: Piece[], y0: number, x = 0, z = 0): Piece[] => place(pieces, { at: [-x, -y0, -z] });
const numbers = (seed: number) => numRng(seed);

/** One rib: six tubes between six nodes, and three ties across. */
function rib(y: number, seed: number): Piece[] {
  const v = hex(y);
  const out: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const [ax, az] = v[i];
    const [bx, bz] = v[(i + 1) % 6];
    out.push(...iBeam("hull-grey", [ax, y, az], [bx, y, bz], [0, 1, 0], 3.4, 1.7));
    out.push(cub("engine-metal", [ax - 2.2, ax + 2.2], [y - 2.2, y + 2.2], [az - 2.2, az + 2.2]));
  }
  // the ties: across the middle, and two from the keel to the upper corners
  out.push(rod("hull-grey-dark", [v[0][0], y, 0], [v[3][0], y, 0], 0.7, 8));
  out.push(rod("hull-grey-dark", [0, y, -B.H / 2], [v[1][0], y, v[1][1]], 0.55, 8), rod("hull-grey-dark", [0, y, -B.H / 2], [v[2][0], y, v[2][1]], 0.55, 8));
  void seed;
  return out;
}

/** The longerons: six tubes the whole length of the wedge, one at each corner of the ribs, and the dorsal ridge. */
function longerons(y0: number, y1: number): Piece[] {
  const a = hex(y0);
  const b = hex(y1);
  const out: Piece[] = [];
  for (let i = 0; i < 6; i++) out.push(rod("hull-grey", [a[i][0], y0, a[i][1]], [b[i][0], y1, b[i][1]], 1.6, 12, { only: undefined }));
  return out;
}

/** The keel: an armoured box girder under the centreline the whole length, 14 m wide and 14 m deep, plated in rows, with a rail on each side, hatches and lamp rows. */
function keel(y0: number, y1: number): Piece[] {
  const r = numbers(5101);
  const z0 = -B.H / 2 - 14;
  const z1 = -B.H / 2 + 1;
  const out: Piece[] = [prism("hull-grey-dark", [[-7, z0], [7, z0], [7, z1], [-7, z1]], y0, y1, { only: undefined })];
  const fx = facesOf([0, (y0 + y1) / 2, (z0 + z1) / 2], [14, y1 - y0, z1 - z0], ["z-", "x+", "x-"]);
  for (const f of fx) out.push(...plating(f, r, f.k === 2 ? ["hull-grey-dark", "hull-grey-dark", "hull-grey", "dark"] : PLATE, 12, 14, { thick: 0.45, skip: 0.04, fine: 0.2 }));
  for (const f of fx.slice(1)) for (let y = y0 + 40; y < y1 - 40; y += 110) out.push(...hatch(f, y - (y0 + y1) / 2, 0, 5, 3, "dark", "hull-yellow", 0.6));
  for (const s of [-1, 1]) out.push(rod("hull-yellow", [s * 7.6, y0, z0 + 3], [s * 7.6, y1, z0 + 3], 0.35, 8));
  return out;
}

/** The dorsal ridge: a light truss along the top of the hull that carries the antennas and the fins' roots. */
function ridge(y0: number, y1: number): Piece[] {
  const out: Piece[] = [];
  const z = B.H / 2 + 5;
  for (const sx of [-1, 1]) out.push(rod("hull-grey", [sx * 3, y0, z], [sx * 3, y1, z], 0.6, 8, { only: undefined }), rod("hull-grey", [sx * 3, y0, z - 2.6], [sx * 3, y1, z - 2.6], 0.4, 8));
  out.push(rod("hull-grey", [0, y0, z + 2.2], [0, y1, z + 2.2], 0.6, 8, { only: undefined }));
  for (let y = y0; y <= y1; y += 30) out.push(rod("hull-grey-dark", [-3, y, z], [3, y, z], 0.3, 6), rod("hull-grey-dark", [-3, y, z], [0, y, z + 2.2], 0.3, 6), rod("hull-grey-dark", [3, y, z], [0, y, z + 2.2], 0.3, 6));
  return out;
}

/** The open section's decks: the dorsal and ventral faces are plated between the ribs, panel by panel, with hatches, vents and stencilled frame numbers; the flanks stay open so the tanks and containers show. */
function decks(): Piece[] {
  const r = numbers(5300);
  const out: Piece[] = [];
  for (let y = B.y0 + 60; y < B.plated[0]; y += B.rib) {
    const ya = y + 1.8;
    const yb = y + B.rib - 1.8;
    const ym = (ya + yb) / 2;
    const W = halfWidth(ym) * 0.62 * 0.97;
    for (const s of [1, -1]) {
      out.push(cub(s > 0 ? "hull-white" : "hull-grey-dark", [-W, W], [ya, yb], [s * (B.H / 2 - 0.4), s * (B.H / 2 + 0.2)]));
      const f = facesOf([0, ym, s * (B.H / 2)], [2 * W, yb - ya, 0.2], [s > 0 ? "z+" : "z-"])[0];
      out.push(...plating(f, r, s > 0 ? PLATE : ["hull-grey-dark", "hull-grey-dark", "hull-grey", "dark"], 7, 7, { thick: 0.3, skip: 0.04, fine: 0.2 }));
      if (Math.round((y - B.y0) / B.rib) % 3 === 1) out.push(...hatch(f, 0, 0, 4, 6, "dark", s > 0 ? "hull-orange" : "hull-yellow", 0.4), ...vent(f, W * 0.5, 0, 6, 4, 4));
    }
  }
  return out;
}

function frames(): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  for (let y = B.y0 + 60; y <= B.plated[1]; y += B.rib) out.push(...rib(y, i++));
  out.push(...rib(B.plated[1] + 20, i), ...rib(B.plated[1] + 70, i + 1));
  return out;
}

/** A slim tank lying along the ship, in the frame. */
const tankTemplate = (seed: string): Piece[] => BUILDERS.tank("b-tank", "Slim propellant tank", B.tank.R, B.tank.L, "L", "L", 80, 1000, "").pieces({ detail: 0.4, seed });

/** How many tanks stand across the hull at y, and in how many layers. */
export const tanksAcross = (y: number): number => Math.max(1, Math.floor((2 * halfWidth(y) * 0.78) / 21));

function tanks(group: number): Piece[] {
  const y = B.tank.y + group * B.tank.pitch;
  const n = tanksAcross(y + B.tank.L);
  const out: Piece[] = [];
  const template = tankTemplate(`b${group % 2}`);
  const poses: { at: Vec3; yaw?: number }[] = [];
  for (const z of [-11.5, 11.5]) for (let i = 0; i < n; i++) poses.push({ at: [(i - (n - 1) / 2) * 21, y, z] });
  out.push(...stamp(template, poses));
  // a header on each row, with a drop to every tank, and a tie to the frame ahead and behind
  for (const z of [-11.5, 11.5]) out.push(rod("pipe-steel", [-(n / 2) * 21, y + B.tank.L + 1.5, z], [(n / 2) * 21, y + B.tank.L + 1.5, z], 0.6, 10), rod("coolant", [-(n / 2) * 21, y - 1.5, z], [(n / 2) * 21, y - 1.5, z], 0.6, 10));
  return out;
}


const containerTemplate = (k: number): Piece[] => container(0, 20, 0, 1, 1, numRng(3300 + k), `K${k + 1}-0${k + 1}`, k ? "hull-orange" : "hull-grey-dark");

/** How many containers stand across the hull in a row of the cargo cell starting at y. */
export const containersAcross = (y: number): number => Math.max(1, Math.floor((2 * halfWidth(y) * 0.8) / 24));

/** The cargo cells: containers lying along the ship, in two layers, in rows two deep, in the frame. */
function cargo(cell: number): Piece[] {
  const y0 = B.cargo.y + cell * B.cargo.deep;
  const t = [containerTemplate(0), containerTemplate(1)];
  const out: Piece[] = [];
  for (const row of [0, 1]) {
    const across = containersAcross(y0 + row * 41);
    for (const layer of [-11.5, 11.5]) for (let j = 0; j < across; j++) out.push(...place(t[(j + row + cell) % 2], { at: [(j - (across - 1) / 2) * 24, y0 + row * 41, layer] }));
  }
  // the cell guides: four round rails along the cell and a twist-lock beam at each end
  for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(rod("hull-grey", [x * 0.5 * containersAcross(y0) * 24 * 0.98, y0, z * 23], [x * 0.5 * containersAcross(y0 + 82) * 24 * 0.98, y0 + 82, z * 23], 0.7, 8));
  return out;
}

/** The plated section: a plated skin closes each bay of the forward hull, with windows in rows down both flanks. */
function plated(): Piece[] {
  const r = numbers(5200);
  const out: Piece[] = [];
  const [p0, p1] = B.plated;
  const bays = Math.round((p1 - p0) / B.rib);
  for (let i = 0; i < bays; i++) {
    const ya = p0 + i * B.rib + 1.5;
    const yb = p0 + (i + 1) * B.rib - 1.5;
    const ym = (ya + yb) / 2;
    const W = halfWidth(ym) * 0.985;
    out.push(prism(i % 2 ? "hull-white" : "hull-white-worn", hex(ym, 0.985).map(([x, z]) => [x, z] as [number, number]), ya, yb, { only: undefined }));
    const fx: Face[] = facesOf([0, ym, 0], [2 * W * 0.62 * 0.98, yb - ya, B.H], ["z+", "z-"]);
    for (const f of fx) out.push(...plating(f, r, PLATE, 6, 7, { thick: 0.3, skip: 0.05, fine: 0.25 }));
    // the side faces: a row of windows and a rail, on each flank
    for (const s of [-1, 1]) {
      const a: [number, number] = [s * W, 0];
      const b: [number, number] = [s * W * 0.62, B.H / 2];
      const d: [number, number] = [b[0] - a[0], b[1] - a[1]];
      const len = Math.hypot(...d);
      const along: Vec3 = [d[0] / len, 0, d[1] / len];
            const nx = s * Math.abs(d[1]) / len;
      const nz = Math.abs(d[0]) / len;
      for (const t of [0.25, 0.6, 0.9]) {
        for (let k = 0; k < 4; k++) {
          const x = a[0] + d[0] * t;
          const z = a[1] + d[1] * t;
          const yy = ya + ((k + 0.5) * (yb - ya)) / 4;
          const o: Vec3 = [x + nx * 0.2, yy, z + nz * 0.2];
          out.push({ kind: "plate", material: "glass", frame: { o, u: [0, 1, 0], v: along, w: [nx, 0, nz] }, outline: [[-1.5, -1.2], [1.5, -1.2], [1.5, 1.2], [-1.5, 1.2]], thickness: 0.4, plain: true, only: "mesh" }, { kind: "plate", material: "window", frame: { o: [o[0] + nx * 0.2, o[1], o[2] + nz * 0.2], u: [0, 1, 0], v: along, w: [nx, 0, nz] }, outline: [[-1.2, -0.85], [1.2, -0.85], [1.2, 0.85], [-1.2, 0.85]], thickness: 0.15, plain: true, only: "mesh" });
        }
      }
    }
    if (i % 3 === 1) for (const f of fx.slice(0, 1)) out.push(...hatch(f, 0, 0, 3, 4.6, "dark", "hull-orange", 0.4), ...vent(f, 8, 0, 4, 3, 4), ...faceStencil(f, `FR-${String(i + 1).padStart(2, "0")}`, -8, 0, 2.4, "hull-white"));
  }
  return out;
}

/** The glazed gallery: a long armoured glass roof along the dorsal face with ribs, a garden under it, and a lit promenade. Descends from the ISS Cupola, arcade roofs and greenhouse halls. */
function gallery(): Piece[] {
  const [g0, g1] = B.gallery;
  const z = B.H / 2;
  const out: Piece[] = [prism("glass-clear", [[-8, z], [-5.5, z + 5.5], [5.5, z + 5.5], [8, z]], g0, g1), prism("leaf", [[-7, z + 0.2], [7, z + 0.2], [7, z + 0.8], [-7, z + 0.8]], g0 + 2, g1 - 2)];
  for (let y = g0; y <= g1; y += 10) {
    out.push(rod("hull-grey", [-8, y, z], [-5.5, y, z + 5.5], 0.35, 8), rod("hull-grey", [-5.5, y, z + 5.5], [5.5, y, z + 5.5], 0.35, 8), rod("hull-grey", [5.5, y, z + 5.5], [8, y, z], 0.35, 8));
    out.push(rod("grow-lamp", [-4, y + 5, z + 4.8], [4, y + 5, z + 4.8], 0.12, 6));
  }
  for (const x of [-5.5, 0, 5.5]) out.push(rod("hull-grey", [x, g0, z + 5.5], [x, g1, z + 5.5], 0.35, 8));
  // shutters: armoured leaves along both sides, open
  for (const s of [-1, 1]) for (let y = g0; y < g1; y += 20) out.push(cub("hull-grey-dark", [s * 8, s * 11], [y + 1, y + 17], [z - 0.2, z + 0.2]));
  return out;
}

const BOW = ["node-two", "adapter-l-m", "common-area-m", "solarium-m", "lab-m", "deck-nav-m", "dome-observation-m"];
const bowStack = (detail: number): { pieces: Piece[]; end: number } => stackOf(BOW, 0, detail, "bowB");
const BOW_Y = 1478;
const BOW_Z = B.H / 2 + 16;

/** The bridge tower: the crew's command modules end to end along the dorsal face, forward, on a saddle of struts to the ridge, as a ship's bridge stands forward on her deck. */
function bridge(): Piece[] {
  const out: Piece[] = place(bowStack(0.8).pieces, { at: [0, 0, 0] });
  for (let y = 6; y < bowStack(0.25).end; y += 20) out.push(rod("hull-grey", [-7, y, -4], [-3, y, -12.6], 0.6, 8), rod("hull-grey", [7, y, -4], [3, y, -12.6], 0.6, 8), rod("hull-grey-dark", [-7, y, -4], [7, y, -4], 0.4, 8));
  return out;
}

/** The nose: three stepped slabs of tile, each narrower and thinner than the one behind, then a tiled wedge; this is the dust shield. */
function nose(): Piece[] {
  const out: Piece[] = [];
  const base = B.plated[1];
  const steps: [number, number, number, number][] = [[base, base + 40, 19, 20], [base + 40, base + 80, 14, 15], [base + 80, B.length - 20, 9, 9]];
  for (const [a, b, w, h] of steps) {
    out.push(prism("tile", [[w, 0], [w * 0.62, h], [-w * 0.62, h], [-w, 0], [-w * 0.62, -h], [w * 0.62, -h]], a, b, { only: undefined }));
    for (const z of [-h, h]) out.push(cub("hull-orange", [-w * 0.5, w * 0.5], [b - 2, b - 0.8], [z - 0.4, z + 0.4]));
  }
  out.push(prism("panel-dark", [[9, 0], [5.6, 9], [-5.6, 9], [-9, 0], [-5.6, -9], [5.6, -9]], B.length - 20, B.length - 4, { only: undefined }), cub("lamp-red", [-1, 1], [B.length - 4, B.length - 2], [-1, 1]));
  return out;
}

function drive(): Piece[] {
  const out: Piece[] = [];
  const { cols, rows, pitch, s, plane } = B.grid;
  const template = thrusterRings([{ count: 1, r: 0, s }], 0);
  const poses: { at: Vec3 }[] = [];
  for (const z of rows) for (let i = 0; i < cols; i++) poses.push({ at: [(i - (cols - 1) / 2) * pitch, plane, z] });
  out.push(...stamp(template, poses));
  return out;
}

/** The thrust bulkhead: a deck the thrusters stand through and a roof 14 m above, joined by round posts, with the feed mains along each row. */
function bulkhead(): Piece[] {
  const { rows, plane, cols, pitch } = B.grid;
  const out: Piece[] = [];
  const W = halfWidth(B.y0) * 0.97;
  const outline = hex(B.y0).map(([x, z]) => [x * 0.97, z * 0.97] as [number, number]);
  out.push(prism("hull-grey-dark", outline, plane, plane + 2, { only: undefined }), prism("hull-grey-dark", outline, plane + 14, plane + 18, { only: undefined }));
  for (const z of rows) out.push(rod("pipe-steel", [-W + 6, plane + 11.5, z], [W - 6, plane + 11.5, z], 0.9, 12), rod("coolant", [-W + 6, plane + 13, z + 3], [W - 6, plane + 13, z + 3], 0.7, 12));
  for (let i = 0; i <= cols; i++) for (const z of [-21, -7.5, 7.5, 21]) if (Math.abs((i - cols / 2) * pitch) <= W * (1 - 0.38 * (Math.abs(z) / (B.H / 2))) - 4) out.push(rod("hull-grey", [(i - cols / 2) * pitch, plane + 2, z], [(i - cols / 2) * pitch, plane + 14, z], 0.9, 8));
  // the engine bay's flank plates, and a row of strobes on the stern edge
  for (const s of [-1, 1]) out.push(prism("hull-white-worn", [[s * W, 0], [s * W * 0.64, B.H / 2 * 0.97], [s * W * 0.64 + s * 1, B.H / 2 * 0.97], [s * W + s * 1, 0]], plane + 2, plane + 14), prism("hull-white-worn", [[s * W, 0], [s * W * 0.64, -B.H / 2 * 0.97], [s * W * 0.64 + s * 1, -B.H / 2 * 0.97], [s * W + s * 1, 0]], plane + 2, plane + 14));
  for (let i = 0; i < 9; i++) out.push(rod(i % 2 ? "strobe" : "lamp-amber", [(i - 4) * 18, plane + 18, B.H / 2], [(i - 4) * 18, plane + 19.4, B.H / 2], 0.5, 8));
  return out;
}

function reactors(): Piece[] {
  const { y, rows, cols, pitch } = B.reactors;
  return reactorRows(cols, pitch, rows, y, 0.6).pieces;
}

const bridgeSlot: ConceptSlot = { slot: "bridge", name: "Bridge tower: docking node, common area, solarium, laboratory, navigation deck and dome", kind: "spacecraft", at: [0, BOW_Y, BOW_Z], height: bowStack(0.25).end, diameter: 21, note: "The crew's command modules end to end on a saddle on the dorsal ridge, forward, as a ship's bridge stands. Descends from the ISS nodes, Columbus and the Cupola.", pieces: bridge };

/** The slots, tail to bow. */
export const SLOTS_B: readonly ConceptSlot[] = [
  { slot: "frame", name: "Ribs and longerons", kind: "spacecraft", at: [0, B.y0, 0], height: B.plated[1] + 70 - B.y0, diameter: 168, note: "Forty-seven transverse ribs every 30 m, hexagonal rings of round tube, and six longerons along the corners of the wedge. Descends from a ship's frames and the Space Shuttle's payload-bay longerons.", pieces: () => local([...frames(), ...decks(), ...longerons(B.y0, B.plated[1] + 70)], B.y0) },
  { slot: "keel", name: "Armoured keel girder", kind: "spacecraft", at: [0, B.y0, -B.H / 2 - 14], height: B.length - 20 - B.y0, diameter: 18, note: "A box girder under the centreline, 14 m wide and 14 m deep, plated, with a service rail each side. It carries the thrust of the drive the whole length of the ship. Descends from a ship's keel and the ISS truss's main beam.", pieces: () => local(keel(B.y0, B.length - 20), B.y0, 0, -B.H / 2 - 14) },
  { slot: "ridge", name: "Dorsal ridge truss", kind: "arms", at: [0, B.y0, B.H / 2 + 2.4], height: B.plated[1] - B.y0, diameter: 8, note: "A light truss along the top of the wedge that carries the antennas and the roots of the radiator fins. Descends from the ISS truss's upper rail.", pieces: () => local(ridge(B.y0, B.plated[1]), B.y0, 0, B.H / 2 + 2.4) },
  { slot: "thrusters", name: "Drive grid: 27 magnetic-nozzle thrusters", kind: "engine", at: [0, 0, 0], height: 62, diameter: 140, note: "Twenty-seven magnetic-nozzle thrusters in three rows of nine across the stern face. Descends from the VASIMR VX-200 and the X3 nested Hall thruster.", pieces: drive },
  { slot: "bulkhead", name: "Thrust bulkhead and feed mains", kind: "service-module", at: [0, B.grid.plane, 0], height: 19, diameter: 162, note: "The mounting deck, the roof and the posts between them, with a feed main of propellant and one of coolant along each row. Descends from the Saturn V's thrust structure.", pieces: () => local(bulkhead(), B.grid.plane) },
  { slot: "reactors", name: "Reactor rows: 24 cells", kind: "service-module", at: [0, B.reactors.y, 0], height: 48, diameter: 140, note: "Twenty-four of the kit's fusion reactor modules in three rows of eight, standing in the frame ahead of the bulkhead. Descends from Kilopower and the Mars transfer vehicle studies' reactors.", pieces: () => local(reactors(), B.reactors.y) },
  ...Array.from({ length: B.tank.groups }, (_, i): ConceptSlot => ({ slot: `tanks-${i + 1}`, name: `Tank group ${i + 1}: slim tanks in two layers`, kind: "tank", at: [0, B.tank.y + i * B.tank.pitch, 0], height: B.tank.L + 4, diameter: tanksAcross(B.tank.y + i * B.tank.pitch + B.tank.L) * 21, note: "Slim propellant tanks lying along the ship in the open frame, in two layers and rows across. Descends from the Space Shuttle's external tank and Saturn V's S-IVB.", pieces: () => local(tanks(i), B.tank.y + i * B.tank.pitch) })),
  ...Array.from({ length: B.cargo.cells }, (_, i): ConceptSlot => ({ slot: `cargo-${i + 1}`, name: `Cargo cell ${i + 1}`, kind: "mount", at: [0, B.cargo.y + i * B.cargo.deep, 0], height: B.cargo.deep, diameter: containersAcross(B.cargo.y + i * B.cargo.deep) * 24 + 1, note: "Containers 22 by 22 by 40 m lying along the ship in two layers, in cell guides. Descends from container-ship cell guides.", pieces: () => local(cargo(i), B.cargo.y + i * B.cargo.deep) })),
  { slot: "plated-hull", name: "Plated forward hull", kind: "module", at: [0, B.plated[0], 0], height: B.plated[1] - B.plated[0] - 8, diameter: 68, note: "Plating closes the bays of the forward hull: the crew's decks, with rows of lit windows down both flanks. Descends from the ISS pressurised modules' plating.", pieces: () => local(plated(), B.plated[0]) },
  { slot: "gallery", name: "Glazed gallery", kind: "module", at: [0, B.gallery[0], B.H / 2], height: B.gallery[1] - B.gallery[0] + 13, diameter: 22, note: "A long armoured glass roof along the top of the hull, a garden under it and a lit promenade, with shutters at its sides. Descends from the ISS Cupola and arcade roofs.", pieces: () => local(gallery(), B.gallery[0], 0, B.H / 2) },
  ...SAIL_SLOTS,
  berthSlot("b"),
  bridgeSlot,
  { slot: "nose", name: "Nose and dust shield", kind: "fairing", at: [0, B.plated[1], 0], height: B.length - B.plated[1] - 2, diameter: 41, note: "Three stepped slabs of tile and a tiled wedge ahead of the crew: at a quarter of the speed of light, dust hits like bullets. Descends from Daedalus' dust shield and Orion's heat shield.", pieces: () => local(nose(), B.plated[1]) },
];
