// Miyamoto's solar array: ten bays of gold cells along the starboard side, for time near a star (the fusion plants are the ship's power; the array adds a little at one astronomical unit and falls with the square of the
// distance). It is built like the ISS's and iROSA's: a root beam on stand-offs to the spine; a rotary joint at each end of it (a ring gear and a motor) that turns the wing to face the star; in each bay a beta gimbal and a
// hinge; and, deployed, a lattice mast 56 m long with a blanket each side of it, the cells in rows on a gold kapton backing, a tension bar at the end, edge wires and a take-up box at the root. Stowed, each bay folds into a
// gold-foil canister on the root beam. The cells are plates from one template of size and thickness. Pure: no three.js and no DOM.
import { cub, ibeam, type Piece, place, rod, roundStrut } from "./adapter.ts";
import { ARRAY } from "./dims.ts";
import { ringAt, tubeAt } from "./shapes.ts";

export type ArrayState = "stowed" | "deployed";

const { root, pitch, mast, blanket } = ARRAY;
const [Y0, Y1] = ARRAY.y;
const CELL = 1.35;
const CELLS = ["coil", "gold", "coil", "coil", "gold"] as const;

/** One stowed bay: a gold-foil canister on the beam, the folded cells showing at its ends, launch locks, the beta gimbal and the hinge barrel. In the wing's own frame: the root beam is the Y axis, a bay reaches out along +X. */
function stowedBay(yb: number): Piece[] {
  const out: Piece[] = [cub("kapton", [1.4, 4.8], [yb + 0.6, yb + 11.4], [-1.6, 1.6])];
  for (let k = 0; k < 4; k++) out.push(cub("foil", [1.3, 4.9], [yb + 1.5 + k * 3, yb + 1.7 + k * 3], [-1.7, 1.7]));
  for (const y of [yb + 0.6, yb + 11.4]) out.push(cub("coil", [1.6, 4.6], [y - 0.04, y + 0.04], [-1.3, 1.3]));
  for (const y of [yb + 2.5, yb + 6, yb + 9.5]) out.push(cub("hull-grey-dark", [4.8, 5.3], [y - 0.4, y + 0.4], [-0.5, 0.5]), cub("lamp-amber", [5.3, 5.45], [y - 0.1, y + 0.1], [-0.1, 0.1]));
  // the folds of the blanket under the foil, hazard marks at both ends, an identification plate and a lamp on the face, and the bolts of the hold-down
  for (let k = 0; k < 10; k++) out.push(cub("foil", [1.5, 4.7], [yb + 1 + k, yb + 1.06 + k], [-1.65, 1.65]));
  for (const y of [yb + 0.55, yb + 11.45]) out.push(cub("hazard", [1.4, 4.8], [y - 0.05, y + 0.05], [-1.6, 1.6]));
  out.push(cub("lamp-blue", [4.8, 4.95], [yb + 5.85, yb + 6.15], [0.6, 0.9]), cub("panel-dark", [4.8, 4.9], [yb + 4.8, yb + 7.2], [-1.2, -0.7]));
  for (let k = 0; k < 8; k++) out.push(cub("hull-grey-dark", [4.7, 4.95], [yb + 1.2 + k * 1.3, yb + 1.45 + k * 1.3], [1.2, 1.45]));
  out.push(cub("hull-grey", [0, 1.4], [yb + 4.6, yb + 7.4], [-1.4, 1.4]), rod("hull-grey-dark", [1.4, yb + 1, 0], [1.4, yb + 11, 0], 0.45, 12));
  return out;
}

/** One deployed bay at its centre: the beta gimbal and its motor, the hinge, the lattice mast, and a blanket each side of it. */
function deployedBay(yc: number, detail: number): Piece[] {
  const out: Piece[] = [];
  const xe = 1.8 + mast;
  // the beta gimbal: a housing with its motor and the hinge barrel the mast swings from
  out.push(cub("hull-grey", [0, 1.6], [yc - 1.6, yc + 1.6], [-1.6, 1.6]), cub("hull-grey-dark", [0.2, 1.2], [yc - 1, yc + 1], [1.6, 2.4]), cub("lamp-amber", [0.4, 0.8], [yc - 0.1, yc + 0.1], [2.4, 2.55]), rod("hull-grey-dark", [1.6, yc - 2.4, 0], [1.6, yc + 2.4, 0], 0.5, 12));
  // the mast: three round longerons, a triangle of rods at every batten, and a diagonal in every bay of the lattice
  const corner = (k: number): [number, number] => [yc + 0.6 * Math.cos(Math.PI / 2 + (2 * Math.PI * k) / 3), 0.6 * Math.sin(Math.PI / 2 + (2 * Math.PI * k) / 3)];
  for (let k = 0; k < 3; k++) out.push(rod("hull-grey", [1.8, corner(k)[0], corner(k)[1]], [xe, corner(k)[0], corner(k)[1]], 0.13, 8));
  const step = detail < 0.6 ? 8 : 4;
  for (let x = 1.8; x + step <= xe + 0.01; x += step) {
    for (let k = 0; k < 3; k++) {
      const [ya, za] = corner(k);
      const [yb, zb] = corner((k + 1) % 3);
      out.push(rod("hull-grey-dark", [x, ya, za], [x, yb, zb], 0.07, 6), rod("hull-grey-dark", [x, ya, za], [x + step, yb, zb], 0.06, 6));
    }
  }
  out.push(cub("hull-grey", [xe, xe + 0.5], [yc - 0.8, yc + 0.8], [-0.8, 0.8]), cub("lamp-red", [xe + 0.5, xe + 0.65], [yc - 0.15, yc + 0.15], [-0.15, 0.15]));
  // a blanket each side: kapton backing, cells in rows, edge wires, a tension bar at the end and a take-up box at the root
  const rows = Math.round(blanket.long / CELL);
  const cols = Math.round(blanket.wide / CELL);
  const cw = blanket.long / rows;
  const ch = blanket.wide / cols;
  for (const s of [-1, 1] as const) {
    const ya = s === 1 ? yc + 0.5 : yc - 0.5 - blanket.wide;
    const yb = ya + blanket.wide;
    out.push(cub("kapton", [3, 3 + blanket.long], [ya, yb], [-0.03, 0.03]), cub("kapton", [1.8, 3], [ya, yb], [-0.5, 0.5]), cub("hull-grey", [3 + blanket.long, 3.6 + blanket.long], [ya - 0.1, yb + 0.1], [-0.12, 0.12]));
    for (const y of [ya + 0.03, yb - 0.03]) out.push(rod("pipe-steel", [3, y, 0.1], [3 + blanket.long, y, 0.1], 0.03, 6));
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) out.push(cub(CELLS[(i * 7 + j * 3 + (s > 0 ? 1 : 0)) % CELLS.length], [3 + i * cw + 0.07, 3 + (i + 1) * cw - 0.07], [ya + j * ch + 0.07, ya + (j + 1) * ch - 0.07], [0.03, 0.08]));
  }
  return out;
}

/** The fixed structure: the root beam on stand-offs to the spine, and a rotary joint at each end with its ring gear, bolts and motor. */
function fixedStructure(): Piece[] {
  const out: Piece[] = [...ibeam("hull-grey", [root.x, Y0 + 6, root.z], [root.x, Y1 - 6, root.z], 1.4, 0.8, [0, 0, 1])];
  for (const y of [Y0 + 8, Y0 + 36, Y0 + 60, Y0 + 84, Y1 - 8]) out.push(...roundStrut("hull-grey-dark", [root.x, y, root.z], [8, y, 6], 0.45), ...roundStrut("hull-grey-dark", [root.x, y + 5, root.z], [8, y, 6], 0.3));
  // a power cable and a coolant line along the beam, and a rail to hold on to
  out.push(rod("copper", [root.x - 0.5, Y0 + 8, root.z + 0.9], [root.x - 0.5, Y1 - 8, root.z + 0.9], 0.1, 8), rod("coolant", [root.x + 0.2, Y0 + 8, root.z + 0.9], [root.x + 0.2, Y1 - 8, root.z + 0.9], 0.1, 8), rod("hull-yellow", [root.x + 0.9, Y0 + 8, root.z + 1.2], [root.x + 0.9, Y1 - 8, root.z + 1.2], 0.08, 8));
  for (const [y0, y1] of [[Y0, Y0 + 6], [Y1 - 6, Y1]] as const) {
    out.push(tubeAt("hull-grey", root.x, root.z, 2.8, y0, y1, { segs: 20, body: true, outline: true }), ringAt("hull-grey-dark", root.x, root.z, 2.9, (y0 + y1) / 2, 0.3), ringAt("hazard", root.x, root.z, 2.85, y0 + 0.4, 0.12));
    for (let k = 0; k < 12; k++) {
      const a = (Math.PI * 2 * k) / 12;
      out.push(rod("hull-grey-dark", [root.x + 3.1 * Math.sin(a), (y0 + y1) / 2 - 0.4, root.z + 3.1 * Math.cos(a)], [root.x + 3.1 * Math.sin(a), (y0 + y1) / 2 + 0.4, root.z + 3.1 * Math.cos(a)], 0.14, 6));
    }
    out.push(cub("hull-grey-dark", [root.x - 1.4, root.x + 1.4], [y0 + 1, y1 - 1], [root.z + 2.8, root.z + 4.4]), cub("lamp-amber", [root.x - 0.2, root.x + 0.2], [(y0 + y1) / 2 - 0.1, (y0 + y1) / 2 + 0.1], [root.z + 4.4, root.z + 4.55]));
  }
  return out;
}

/** The whole array in ship metres, in the given state. Stowed, the wing lies along the root beam; deployed, it is turned about the beam to face the star. */
export function solarArray(state: ArrayState, detail = 1): Piece[] {
  const wing: Piece[] = [rod("hull-grey", [0, Y0 + 6, 0], [0, Y1 - 6, 0], 0.9, 12)];
  for (let k = 0; k < ARRAY.bays; k++) {
    const yb = Y0 + k * pitch;
    wing.push(...(state === "stowed" ? stowedBay(yb) : deployedBay(yb + pitch / 2, detail)));
  }
  return [...fixedStructure(), ...place(wing, { at: [root.x, 0, root.z], yaw: state === "deployed" ? ARRAY.tilt : 0 })];
}
