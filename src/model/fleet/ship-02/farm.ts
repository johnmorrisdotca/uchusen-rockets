// The farm drum: a rotating cylinder 132 m across round the spine, 80 m long, glazed in twelve long panes between ribs, with bearing rings, drive motors, light-collector mirrors and a service skirt.
// Inside (separate): three terraces of planted trays under lamp rails, irrigation mains and a harvest conveyor.
import { box, cyl, onHull, pipe, polar, revolve, ring, rng, beam, type MaterialName, type Piece, hazard, hatch, onFace, facesOf, stencil } from "./adapter.ts";

const R = 66;
const L = 80;

export function farmPieces(): Piece[] {
  const r = rng(2050);
  const out: Piece[] = [];
  // the drum: the ribs are the shell, the panes sit just outside the shell's line
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 48, body: true, outline: true, rings: [6, L - 6], profile: [[R - 2, 0], [R, 3], [R, L - 3], [R - 2, L]] });
  for (let k = 0; k < 12; k++) {
    const a0 = (k / 12) * 2 * Math.PI + 0.04;
    const a1 = ((k + 1) / 12) * 2 * Math.PI - 0.04;
    out.push({ kind: "lathe", material: "glass", at: [0, 0], segs: 48, body: false, profile: [[R + 0.5, 10], [R + 0.5, L - 10]], arc: () => [a0, a1] });
    // the plants show through in the pane: a green strip behind, and mullions every 10 m
    out.push({ kind: "lathe", material: "plant", at: [0, 0], segs: 48, only: "mesh", profile: [[R - 6, 14], [R - 6, L - 14]], arc: () => [a0, a1] });
    const am = (a0 + a1) / 2;
    for (let y = 10; y < L - 9; y += 10) out.push(onHull("engine-metal", [0, 0], am, R, y, ((a1 - a0) * R) * 0.98, 0.9, 0.9));
  }
  // twelve ribs, and a bright lamp strip down each
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 2 * Math.PI;
    out.push(onHull("dark", [0, 0], a, R, L / 2, 2.4, L - 12, 1.6, false), onHull("lamp-blue", [0, 0], a, R + 1.6, L / 2, 0.8, L - 18, 0.4));
    for (let y = 14; y < L - 12; y += 12) out.push(onHull("hull-yellow", [0, 0], a, R + 1.6, y, 2.6, 1.4, 0.8));
  }
  // bearing rings at both ends, with drive motors and brake calipers
  for (const y of [0, L - 8]) {
    out.push(ring("engine-pale", [0, 0], R - 4, R + 5, y, y + 8, 48, { outline: true, only: undefined }), ring("copper", [0, 0], R + 5, R + 6.4, y + 1, y + 7, 48), ring("dark", [0, 0], R - 1, R + 6.6, y + 3.4, y + 4.6, 48));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 2 * Math.PI + 0.2;
      const [x, z] = polar(a, R + 8);
      out.push(onHull("dark", [0, 0], a, R + 6, y + 4, 8, 7, 4), onHull("hull-yellow", [0, 0], a, R + 10, y + 4, 4, 3, 1.5));
      void x;
      void z;
    }
  }
  // light-collector mirrors: four tilted flat panels on arms, standing off the drum
  for (let k = 0; k < 4; k++) {
    const a = ((k + 0.5) / 4) * 2 * Math.PI;
    const [x0, z0] = polar(a, R + 6);
    const [x1, z1] = polar(a, R + 30);
    out.push(beam("engine-metal", [x0, 10, z0], [x1, 4, z1], 2, 2, false), beam("engine-metal", [x0, L - 10, z0], [x1, L - 4, z1], 2, 2, false));
    out.push(onHull("hull-white", [0, 0], a, R + 30, L / 2 - 3, 24, L - 4, 0.8, false), onHull("coolant", [0, 0], a, R + 31, L / 2 - 3, 21, L - 10, 0.3));
  }
  // service skirt on the aft end: a hatch ring and hazard stripe
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    out.push(onHull("hull-orange", [0, 0], a, R + 5, 4, 10, 6, 1.2), onHull("black", [0, 0], a, R + 6, 4, 8, 2, 0.4));
  }
  // end walls, hub and spokes
  out.push(ring("dark", [0, 0], 20, R - 4, 0, 2, 48), ring("dark", [0, 0], 20, R - 4, L - 2, L, 48));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    const [x0, z0] = polar(a, 24);
    const [x1, z1] = polar(a, R - 4);
    out.push(beam("hull-grey", [x0, 1, z0], [x1, 1, z1], 3, 3, true), beam("hull-grey", [x0, L - 1, z0], [x1, L - 1, z1], 3, 3, true));
  }
  out.push(cyl("hull-grey", [0, 0], 24, 0, L, 28, { only: undefined, outline: true }), ring("engine-pale", [0, 0], 23, 27, L / 2 - 4, L / 2 + 4, 28));
  void box;
  void pipe;
  void revolve;
  void r;
  void hazard;
  void hatch;
  void onFace;
  void facesOf;
  void stencil;
  return out;
}

export function farmInside(only?: number): Piece[] {
  const out: Piece[] = [];
  const r = rng(2051);
  for (let t = 0; t < 3; t++) {
    if (only !== undefined && t !== only) continue;
    const rr = 34 + t * 11;
    out.push(ring("concrete", [0, 0], rr, rr + 8, 12, 13, 48));
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * 2 * Math.PI;
      for (let y = 18; y < L - 16; y += 14) {
        out.push(onHull(r.pick<MaterialName>(["plant", "plant", "plant", "blanket"]), [0, 0], a, rr + 0.4, y, 3.4, 11, 1.4 + r.next() * 1.6));
      }
    }
    out.push(ring("lamp-blue", [0, 0], rr + 6, rr + 6.4, 12 + 8, 12 + 8.4, 48));
    for (let k = 0; k < 6; k++) out.push(pipe("coolant", polar((k / 6) * 2 * Math.PI, rr + 2).concat([]).length ? [polar((k / 6) * 2 * Math.PI, rr + 2)[0], 14, polar((k / 6) * 2 * Math.PI, rr + 2)[1]] : [0, 0, 0], [polar((k / 6) * 2 * Math.PI, rr + 2)[0], L - 16, polar((k / 6) * 2 * Math.PI, rr + 2)[1]], 0.5, 6));
  }
  return out;
}
