// The bow shield: three spaced octagonal plates (a Whipple stack) 410 m across behind the tip, on standoff columns, with the forward face tiled in removable orange panels; ribs, bumper bars, running lights,
// debris sensors and a dust-clearing mast at the very tip. The widest part of the ship, because it has to cover everything behind it.
import { beam, box, cyl, hazard, lights, mast, ngon, onFace, pipe, polar, revolve, ring, rng, slab, span, stencil, type MaterialName, type Piece, facesOf, vent, hatch, plating, collar } from "./adapter.ts";

const R = 205;

export function shieldPieces(): Piece[] {
  const r = rng(2070);
  const out: Piece[] = [];
  // three plates: rear (thick, dark), middle (grey), front (thin, tiled), 8 m apart
  const layers: [number, number, number, MaterialName][] = [[R, 0, 5, "dark"], [R * 0.985, 12, 15, "hull-grey"], [R * 0.97, 24, 26, "hull-grey"]];
  for (const [rad, y0, y1, m] of layers) out.push(slab(m, ngon(8, rad / Math.cos(Math.PI / 8), Math.PI / 8), y0, y1, [0, 0], true));
  // standoff columns between the layers: a ring of them at three radii
  for (const rr of [50, 110, 170]) for (let k = 0; k < 16; k++) {
    const [x, z] = polar((k / 16) * 2 * Math.PI + rr * 0.01, rr);
    out.push(cyl("engine-metal", [x, z], 2.2, 5, 12, 10), cyl("engine-metal", [x, z], 2.2, 15, 24, 10));
    out.push(ring("dark", [x, z], 2.2, 3.4, 5, 7, 10), ring("dark", [x, z], 2.2, 3.4, 22, 24, 10));
  }
  // radial ribs on the rear face and the face of the front plate, eight each, with a bumper bar round the edge
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    const [x1, z1] = polar(a, R * 0.96);
    out.push(beam("engine-metal", [0, 27.4, 0], [x1, 27.4, z1], 3, 2.4, false));
    const [x0, z0] = polar(a + Math.PI / 8, R * 0.94);
    out.push(box("hull-yellow", [x0, 27.5, z0], [8, 2, 8]), box("dark", [x0, 28.4, z0], [4, 1.2, 4]));
  }
  // tiles on the forward face: a grid of 20 m panels, orange, grey and white, each with an inset and bolts up close
  const face = facesOf([0, 26, 0], [0.1, 0.1, 0.1], ["y+"])[0];
  for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
    const x = i * 19.6;
    const z = j * 19.6;
    const edge = Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) * 0.7071);
    if (edge > R * 0.96 - 6 || Math.hypot(x, z) < 8) continue;
    const m = r.pick<MaterialName>(["hull-orange", "hull-orange", "hull-orange", "hull-orange", "hull-grey", "hull-grey-dark", "hull-orange-worn"]);
    out.push(box(m, [x, 27, z], [18.2, 1.4 + 0.5 * r.next(), 18.2], false));
    out.push(box("dark", [x, 27.9 + 0.2, z], [12.6, 0.3, 12.6]));
    for (const [dx, dz] of [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]] as const) out.push(box("engine-metal", [x + dx, 28.1, z + dz], [1.1, 0.5, 1.1]));
    if (r.chance(0.12)) out.push(...vent({ ...face, c: [x, 27.9, z], a: 7, b: 7 }, 0, 0, 9, 6, 4, 0.3));
  }
  // a hazard ring round the tip and running lights along the rim
  out.push(ring("hull-yellow", [0, 0], 18, 24, 26, 27.6, 24), ring("black", [0, 0], 24, 28, 26, 27.6, 24), ring("dark", [0, 0], 8, 18, 26, 29, 24));
  for (let k = 0; k < 32; k++) {
    const [x, z] = polar((k / 32) * 2 * Math.PI, R * 0.99);
    out.push(box(k % 4 === 0 ? "lamp-red" : "lamp-blue", [x, 14, z], [3, 3, 3]));
  }
  // debris sensors: sixteen domes in a ring at 90 m, each on a short post
  for (let k = 0; k < 16; k++) {
    const [x, z] = polar((k / 16) * 2 * Math.PI + 0.1, 90);
    out.push(cyl("dark", [x, z], 2.8, 27, 30, 10), revolve("glass", [x, z], [[2.6, 30], [2.2, 32], [1.2, 33.4], [0.001, 33.8]], 10), ring("hull-yellow", [x, z], 2.8, 3.4, 29.6, 30.4, 10));
  }
  // the tip: a dust-clearing mast from y 28 to 54: a stack of rings, a coil, a needle, the bow marker
  out.push(cyl("engine-pale", [0, 0], 7, 27, 36, 20, { only: undefined, outline: true }));
  for (let i = 0; i < 5; i++) out.push(ring("copper", [0, 0], 7, 9, 29 + i * 1.6, 30.2 + i * 1.6, 20));
  out.push(revolve("dark", [0, 0], [[7, 36], [4.4, 40], [3, 54]], 14, { only: undefined, outline: true }), ring("hull-orange", [0, 0], 3, 4.6, 44, 46, 14));
  out.push(...mast([0, 54, 0], [0, 60, 0], 0.6));
  // eight stowed sensor booms beyond the rim on arms, a stencil in each quadrant
  void collar;
  void hazard;
  void hatch;
  void lights;
  void onFace;
  void pipe;
  void plating;
  void span;
  void stencil;
  return out;
}
