// Two radiator banks, one dorsal and one ventral, four leaves each, every leaf 25 by 60 m and two-sided: 24,000 square metres in all. Stowed, the four leaves fold flat into a box on rails along the habitation hull and
// stay inside the envelope. Deployed, a mast carries the bank out clear of the hangar approach corridors and the exhaust cones and the leaves fan out to either side. Sustained main burn needs every leaf out; stowed
// radiators allow short transients only. Pure: no three.js and no DOM.
import { cub, type Piece, rng, rod, roundStrut } from "./adapter.ts";
import { RADIATOR } from "./dims.ts";
import { lamp, WHITE } from "./faces.ts";
import { dressedFace } from "./hulls.ts";

export type Bank = "dorsal" | "ventral";

const [Y0, Y1] = RADIATOR.y;
const CY = (Y0 + Y1) / 2;
const LEAF = RADIATOR.leaf;
/** Where a bank's stowed box lies on the hull: dorsal above the spine's back, ventral under it. */
const SEAT = { dorsal: 14, ventral: -14 } as const;

/** One leaf, lying flat in the plane z = zc from x0 to x1 (width) and Y0 to Y1 (length): a frame, a radiating plate on each face with copper pipes under it, a header at the hinge and hot-end panels at the tip. */
function leaf(x0: number, x1: number, zc: number, seed: string): Piece[] {
  const random = rng(`${seed}/leaf/${x0}`);
  const out: Piece[] = [];
  const dx = x1 - x0;
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  out.push(cub("radiator", [lo + 0.15, hi - 0.15], [Y0 + 0.3, Y1 - 0.3], [zc - 0.07, zc + 0.07], { only: undefined }));
  // frame: four edge beams and a cross brace every 10 m
  for (const x of [lo, hi]) out.push(cub("hull-grey-dark", [x - 0.18, x + 0.18], [Y0, Y1], [zc - 0.25, zc + 0.25]));
  for (let y = Y0; y <= Y1 + 0.01; y += 10) out.push(cub("hull-grey-dark", [lo, hi], [y - 0.18, y + 0.18], [zc - 0.25, zc + 0.25]));
  // pipes along the leaf, on both faces, every 2 m, with a hot panel at the tip
  for (let x = lo + 1; x < hi; x += 2) for (const side of [-1, 1]) out.push(rod("copper", [x, Y0 + 0.6, zc + side * 0.12], [x, Y1 - 6, zc + side * 0.12], 0.07, 12));
  out.push(cub("radiator-hot", [lo + 0.3, hi - 0.3], [Y1 - 6, Y1 - 0.4], [zc - 0.1, zc + 0.1]));
  // a header pipe at the hinge end and tell-tale lamps
  const hinge = dx > 0 ? lo : hi;
  out.push(cub("coolant", [hinge - 0.35, hinge + 0.35], [Y0, Y1], [zc - 0.4, zc + 0.4]));
  for (let y = Y0 + 8; y < Y1; y += 12) out.push(cub("hull-grey", [hinge - 0.7, hinge + 0.7], [y - 0.5, y + 0.5], [zc - 0.55, zc + 0.55]), cub("lamp-amber", [hinge - 0.15, hinge + 0.15], [y - 0.15, y + 0.15], [zc + 0.55, zc + 0.7]));
  // stencilled panel marks: squares of a darker tile in the plate
  for (let k = 0; k < 6; k++) {
    const x = lo + 2 + random() * (Math.abs(dx) - 4);
    const y = Y0 + 4 + random() * (Y1 - Y0 - 14);
    out.push(cub("hull-white-worn", [x - 1.4, x + 1.4], [y - 1.4, y + 1.4], [zc + 0.07, zc + 0.12]));
  }
  return out;
}

/** The bank stowed: a flat box of four folded leaves on a rail seat, with latches, a coolant manifold and a service step. */
function stowed(bank: Bank, detail: number, seed: string): Piece[] {
  const z0 = SEAT[bank];
  const s = bank === "dorsal" ? 1 : -1;
  const out: Piece[] = [];
  const depth = 6.4;
  out.push(cub("hull-grey-dark", [-LEAF.wide / 2, LEAF.wide / 2], [Y0, Y1], [Math.min(z0, z0 + s * depth), Math.max(z0, z0 + s * depth)], { only: undefined }));
  // four leaves seen at the edge as folded plates, and a cover in white with orange latches
  for (let k = 0; k < 4; k++) out.push(cub(k % 2 ? "radiator" : "hull-white-worn", [-LEAF.wide / 2 + 0.2, LEAF.wide / 2 - 0.2], [Y0 + 0.5, Y1 - 0.5], [z0 + s * (0.5 + k * 1.2), z0 + s * (1.5 + k * 1.2)]));
  out.push(cub("hull-white", [-LEAF.wide / 2, LEAF.wide / 2], [Y0, Y1], [z0 + s * depth, z0 + s * (depth + 0.4)], { only: undefined }));
  out.push(...dressedFace({ n: "z", sign: s as 1 | -1, at: z0 + s * (depth + 0.4), a: [-LEAF.wide / 2 + 0.5, LEAF.wide / 2 - 0.5], b: [Y0 + 0.5, Y1 - 0.5] }, { seed, scheme: WHITE, detail, density: 0.3, kinds: ["hatch", "vent", "lamps", "number", "greeble", "sensor"], slot: [8, 7] }));
  for (let y = Y0 + 3; y < Y1; y += 6) for (const x of [-LEAF.wide / 2 + 1, LEAF.wide / 2 - 1, 0]) out.push(cub("hull-orange", [x - 0.9, x + 0.9], [y - 0.6, y + 0.6], [z0 + s * depth, z0 + s * (depth + 0.9)]), cub("hull-grey-dark", [x - 0.2, x + 0.2], [y - 0.2, y + 0.2], [z0 + s * (depth + 0.9), z0 + s * (depth + 1.2)]));
  for (let x = -LEAF.wide / 2 + 3; x < LEAF.wide / 2; x += 6) out.push(cub("hull-grey", [x - 0.14, x + 0.14], [Y0, Y1], [z0 + s * (depth + 0.4), z0 + s * (depth + 0.7)]));
  out.push(cub("hull-orange", [-LEAF.wide / 2, LEAF.wide / 2], [Y0 - 0.4, Y0], [Math.min(z0, z0 + s * depth), Math.max(z0, z0 + s * depth)]), cub("hull-orange", [-LEAF.wide / 2, LEAF.wide / 2], [Y1, Y1 + 0.4], [Math.min(z0, z0 + s * depth), Math.max(z0, z0 + s * depth)]));
  // the seat: rail clamps down to the hull's rails at x +-9
  for (const x of [-9, 9]) for (let y = Y0 + 4; y < Y1; y += 10) out.push(cub("hull-grey", [x - 0.6, x + 0.6], [y - 0.6, y + 0.6], [Math.min(z0, z0 - s * 0.8), Math.max(z0, z0 - s * 0.8)]));
  out.push(...lamp({ n: "z", sign: s as 1 | -1, at: z0 + s * (depth + 0.4), a: [-LEAF.wide / 2, LEAF.wide / 2], b: [Y0, Y1] }, 0, CY, "amber", 0.3));
  return out;
}

/** The bank deployed: a mast from the seat, a boom across, and four leaves hinged out to either side, two to a side, in one plane. */
function deployed(bank: Bank, seed: string): Piece[] {
  const s = bank === "dorsal" ? 1 : -1;
  const plane = bank === "dorsal" ? 41 : -47;
  const out: Piece[] = [];
  // the mast: two legs from the seat up to the boom, cross-braced, with a coolant riser
  const seat = SEAT[bank];
  for (const y of [Y0 + 6, Y1 - 6]) {
    out.push(cub("hull-grey", [-1, 1], [y - 1, y + 1], [Math.min(seat, plane), Math.max(seat, plane)]), cub("hull-grey-dark", [-1.6, 1.6], [y - 1.6, y + 1.6], [seat, seat + s * 1]), cub("coolant", [-0.3, 0.3], [y + 1, y + 1.6], [Math.min(seat, plane), Math.max(seat, plane)]));
    for (let z = seat + s * 4; s * z < s * plane; z += s * 6) out.push(...roundStrut("hull-grey-dark", [-1, y - 1, z], [1, y + 1, z + s * 6], 0.16), ...roundStrut("hull-grey-dark", [1, y - 1, z], [-1, y + 1, z + s * 6], 0.16));
  }
  out.push(cub("hull-grey", [-LEAF.wide / 2, LEAF.wide / 2], [Y0 + 2, Y1 - 2], [plane - 0.9, plane + 0.9]), cub("coolant", [-1.2, 1.2], [Y0, Y1], [plane - 1.4, plane + 1.4]));
  // the leaves: inner pair hinged at the boom's ends, outer pair at the inner pair's edges, a hinge block and a strut at each
  for (const side of [-1, 1] as const) {
    const a = side * (LEAF.wide / 2);
    const b = side * (LEAF.wide / 2 + LEAF.wide);
    const c = side * (LEAF.wide / 2 + 2 * LEAF.wide);
    out.push(...leaf(a, b, plane, `${seed}i${side}`), ...leaf(b, c, plane, `${seed}o${side}`));
    for (const x of [a, b]) for (const y of [Y0 + 2, Y1 - 2]) out.push(cub("hull-grey-dark", [x - 0.9, x + 0.9], [y - 1.2, y + 1.2], [plane - 0.7, plane + 0.7]), ...roundStrut("hull-grey", [x, y, plane - 0.7], [x - side * 3, y, plane - s * 5], 0.2));
    out.push(...[Y0 + 10, CY, Y1 - 10].flatMap((y) => roundStrut("hull-grey-dark", [a, y, plane - 0.2], [c, y, plane - 0.2], 0.16)));
  }
  return out;
}

export function radiators(bank: Bank, open: boolean, detail = 1, seed = `rad-${bank}`): Piece[] {
  return open ? deployed(bank, seed) : stowed(bank, detail, seed);
}
