// The front of the repair drone and its top: the big camera lens that is also the tractor-beam emitter, the two thruster pods with their red noses, the two red-ringed stalks, the two tall antennas with glowing tips,
// the cyan ring light under the rim and the rear equipment block's stand-in. Plain pieces. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { LENS_RADIUS } from "./layout.ts";
import { add, block, bolt, boltRing, cyl, fine, mul, pipe, rng, stack, unit, vents } from "./shapes.ts";

const Z: Vec3 = [0, 0, 1];
const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];

/** The lens barrel, built stepwise along +Z from the saucer's nose to the glass. */
export function lensPieces(): Piece[] {
  const out: Piece[] = [];
  const c: Vec3 = [0, 0.03, 0];
  const at = (z: number): Vec3 => [c[0], c[1], z];
  const R = LENS_RADIUS - 0.012;
  // the collar into the nose, the body, the grip band with its ribs, the focus ring and the front flange
  out.push(...stack("hull-grey-dark", at(0.26), Z, [[R * 1.25, 0.05], [R * 1.12, 0.02]], 36));
  out.push(cyl("hull-white", at(0.33), at(0.43), R, 40));
  out.push(cyl("panel-dark", at(0.3995), at(0.4005), R * 1.012, 40));
  out.push(cyl("black", at(0.43), at(0.5), R * 0.96, 40));
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * 2 * Math.PI;
    const p: Vec3 = [Math.sin(a) * R * 0.975, c[1] + Math.cos(a) * R * 0.975, 0];
    out.push(block("hull-grey-dark", [p[0], p[1], 0.465], { u: [Math.cos(a), -Math.sin(a), 0], v: Z }, [0.006, 0.066, 0.006], 0.0008));
  }
  out.push(cyl("hull-grey", at(0.5), at(0.525), R * 1.04, 40));
  out.push(cyl("engine-pale", at(0.5), at(0.512), R * 1.07, 40));
  out.push(cyl("hull-white", at(0.525), at(0.55), R * 1.1, 40));
  out.push(...boltRing(at(0.55), Z, R * 1.03, 14, 0.0052, 0.005));
  // the glass: a ring of cyan light, a dark seat, and a convex lens of four steps, with a lit core
  out.push(cyl("lamp-blue", at(0.545), at(0.553), R * 0.93, 40));
  out.push(cyl("black", at(0.55), at(0.556), R * 0.88, 40));
  const bulge: [number, number][] = [[0.82, 0.556], [0.68, 0.562], [0.5, 0.568], [0.3, 0.572]];
  for (const [k, z] of bulge) out.push(cyl("glass", at(z - 0.006), at(z + 0.004), R * k, 36));
  // coated rings in the glass, and eight iris blades round the centre, as a lens's elements show
  for (const [k, z, m] of [[0.74, 0.5585, "blue"], [0.56, 0.5655, "blue"], [0.36, 0.5695, "blue"]] as const) out.push(cyl(m, at(z), at(z + 0.0035), R * k, 36));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI + 0.2;
    out.push(fine(block("engine-pale", [Math.sin(a) * R * 0.2, c[1] + Math.cos(a) * R * 0.2, 0.5745], { u: [Math.cos(a), -Math.sin(a), 0], v: [Math.sin(a), Math.cos(a), 0] }, [0.006, R * 0.2, 0.0016], 0.0008)));
  }
  out.push(cyl("lamp-blue", at(0.57), at(0.576), R * 0.1, 18));
  out.push(cyl("engine-pale", at(0.5565), at(0.5585), R * 0.5, 36));
  out.push(cyl("glass", at(0.5575), at(0.564), R * 0.46, 36));
  // two brackets that hold the barrel to the nose and a hood ring above it
  for (const s of [-1, 1]) out.push(block("hull-grey", [s * (R * 1.2), c[1], 0.3], { u: X, v: Y }, [0.03, 0.08, 0.05], 0.006));
  // a sensor cluster on top of the barrel: a bar with two small lenses, a light and a laser window, as on a free-flyer's face
  const top: Vec3 = [0, c[1] + R * 1.0, 0.385];
  out.push(block("hull-grey-dark", add(top, [0, 0.012, 0]), { u: X, v: Z }, [0.1, 0.08, 0.026], 0.008));
  for (const s of [-1, 1]) {
    out.push(cyl("black", add(top, [s * 0.03, 0.024, 0.035]), add(top, [s * 0.03, 0.024, 0.045]), 0.014, 18));
    out.push(cyl("glass", add(top, [s * 0.03, 0.024, 0.044]), add(top, [s * 0.03, 0.024, 0.05]), 0.0095, 18));
    out.push(cyl("engine-pale", add(top, [s * 0.03, 0.024, 0.0345]), add(top, [s * 0.03, 0.024, 0.037]), 0.0165, 18));
  }
  out.push(cyl("lamp-red", add(top, [0, 0.024, 0.034]), add(top, [0, 0.024, 0.04]), 0.0052, 10));
  out.push(block("black", add(top, [0, 0.0105, 0.04]), { u: X, v: Z }, [0.036, 0.0035, 0.005], 0.001));
  // service tags on the body
  for (let i = 0; i < 4; i++) out.push(block("hazard", [0, c[1] + R * 1.002, 0.35 + i * 0.022], { u: X, v: Z }, [0.04, 0.008, 0.002], 0.0008));
  return out;
}

/** The two thruster pods beside the lens. */
export function podPieces(): Piece[] {
  const out: Piece[] = [];
  const random = rng(11);
  for (const s of [-1, 1] as const) {
    const x = s * 0.262;
    const y = 0.005;
    out.push(block("hull-white", [x, y, 0.4], { u: X, v: Y }, [0.1, 0.15, 0.2], 0.022));
    out.push(block("hull-white", [x, y + 0.06, 0.4], { u: X, v: Y }, [0.085, 0.07, 0.205], 0.016));
    out.push(block("hull-grey", [x, y, 0.296], { u: X, v: Y }, [0.12, 0.17, 0.03], 0.02));
    out.push(block("red", [x, y, 0.545], { u: X, v: Y }, [0.108, 0.158, 0.06], 0.026));
    out.push(block("red", [x, y + 0.062, 0.5], { u: X, v: Y }, [0.09, 0.03, 0.06], 0.01));
    out.push(...stack("bell-inside", [x, y, 0.575], Z, [[0.036, 0.012], [0.028, 0.008]], 20));
    out.push(cyl("lamp-blue", [x, y, 0.583], [x, y, 0.588], 0.017, 16));
    // the outer face: slotted vents, a panel and bolts; the inner face: two lamps
    const side = [x + s * 0.0505, y, 0.4] as Vec3;
    out.push(...vents(add(side, [0, 0, -0.045]), Z, [s, 0, 0], 8, 0.012, [0.006, 0.05], "soot"));
    out.push(block("hull-white-worn", add(side, [s * 0.0012, 0.05, 0.02]), { u: Y, v: Z }, [0.025, 0.06, 0.003], 0.003));
    for (let k = 0; k < 6; k++) out.push(bolt([x + s * 0.0505, y - 0.065, 0.3 + k * 0.032 + random() * 0.002], [s, 0, 0], 0.0035, 0.003, "engine-metal", 6));
    out.push(cyl("lamp-red", [x - s * 0.05, y + 0.05, 0.48], [x - s * 0.0575, y + 0.05, 0.48], 0.006, 10));
    out.push(cyl("lamp-blue", [x - s * 0.05, y + 0.05, 0.46], [x - s * 0.0575, y + 0.05, 0.46], 0.006, 10));
    // louvres on the pod's top, ribs down its side and a light strip
    out.push(...vents([x - 0.026, y + 0.0985, 0.33], [1, 0, 0], Y, 4, 0.0175, [0.01, 0.12], "soot", 0.0024).map((p) => p));
    for (let k = 0; k < 4; k++) out.push(block("hull-white-worn", [x + s * 0.0508, y + 0.045 - k * 0.03, 0.46], { u: Z, v: Y }, [0.1, 0.004, 0.003], 0.001));
    out.push(block("lamp-blue", [x + s * 0.0502, y - 0.03, 0.5], { u: Z, v: Y }, [0.03, 0.006, 0.002], 0.001));
    // the red-ringed stalk on the shell above the pod
    const px = s * 0.205;
    out.push(cyl("hull-grey", [px, 0.146, 0.24], [px, 0.2, 0.24], 0.012, 14));
    out.push(cyl("red", [px, 0.188, 0.24], [px, 0.2, 0.24], 0.0165, 16));
    out.push(cyl("black", [px, 0.2, 0.24], [px, 0.206, 0.24], 0.0125, 14));
    out.push(...boltRing([px, 0.146, 0.24], Y, 0.02, 6, 0.0028, 0.004));
    // the pod's mount: two struts into the shell
    out.push(...pipe("hull-grey", [[x - s * 0.03, y - 0.06, 0.3], [x - s * 0.08, y - 0.05, 0.24], [x - s * 0.13, y - 0.03, 0.22]], 0.012, 10));
  }
  return out;
}

/** Two tall antennas with glowing tips. */
export function antennaPieces(): Piece[] {
  const out: Piece[] = [];
  for (const s of [-1, 1] as const) {
    const base: Vec3 = [s * 0.13, 0.172, 0.03];
    const tip: Vec3 = [s * 0.2, 0.62, -0.08];
    const d = unit([tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]]);
    const L = Math.hypot(tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]);
    out.push(cyl("engine-metal", add(base, mul(Y, -0.006)), add(base, mul(Y, 0.022)), 0.017, 18));
    out.push(cyl("hull-grey-dark", add(base, mul(Y, 0.022)), add(base, mul(Y, 0.034)), 0.011, 14));
    out.push(...boltRing(add(base, mul(Y, 0.016)), Y, 0.0135, 8, 0.0024, 0.0045));
    out.push(cyl("steel", add(base, mul(d, 0.03)), tip, 0.0042, 10));
    out.push(cyl("black", add(base, mul(d, 0.03)), add(base, mul(d, L * 0.34)), 0.0054, 10));
    for (const t of [0.2, 0.4, 0.6, 0.8]) out.push(cyl("hull-grey-dark", add(base, mul(d, L * t)), add(base, mul(d, L * t + 0.01)), 0.0072, 10));
    out.push(cyl("lamp-blue", tip, add(tip, mul(d, 0.026)), 0.0105, 12));
    out.push(cyl("engine-pale", add(tip, mul(d, 0.026)), add(tip, mul(d, 0.03)), 0.0075, 12));
  }
  return out;
}

/** The ring of cyan light under the rim, and the plate it shines from. */
export function underglowPieces(): Piece[] {
  return [
    { kind: "lathe", material: "lamp-blue", segs: 64, profile: [[0.452, -0.062], [0.452, -0.042]] },
    { kind: "lathe", material: "lamp-blue", segs: 64, under: true, profile: [[0.4, -0.0625], [0.452, -0.0625]] },
    { kind: "lathe", material: "lamp-blue", segs: 64, profile: [[0.4, -0.0625], [0.4, -0.04]] },
  ];
}

/**
 * The block on the saucer's rear top, as plain shapes for the line looks. The painted look has the High Energy Transient Explorer's body there instead, which is NASA's, so these are the stand-in.
 */
export function rearBlockPieces(): Piece[] {
  const out: Piece[] = [];
  out.push(block("hull-grey-dark", [0, 0.235, -0.2], { u: X, v: Y }, [0.42, 0.13, 0.3], 0.02));
  out.push(block("panel-dark", [0, 0.31, -0.2], { u: X, v: Y }, [0.36, 0.03, 0.26], 0.012));
  for (let i = 0; i < 6; i++) out.push(block("soot", [-0.15 + i * 0.06, 0.236, -0.352], { u: X, v: Y }, [0.03, 0.07, 0.004], 0.003));
  out.push(...vents([-0.1, 0.33, -0.2], X, Y, 6, 0.04, [0.014, 0.18], "soot"));
  return out;
}
