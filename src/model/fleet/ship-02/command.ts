// The command citadel: an armoured eight-sided keep 88 m across behind the bow shield, with a ring of narrow bridge slits, four comms dishes, the sensor mast farm, attitude thruster blocks and escape-pod bays.
// Inside (separate): the bridge deck with a ring of consoles round a holo table, the captain's station, a crew deck of bunks and a medical bay.
import { PLATE, beam, box, collar, cyl, dish, facesOf, hatch, hazard, lights, mast, ngon, onFace, pipe, plating, polar, revolve, ring, rng, slab, span, stencil, vent, type MaterialName, type Piece, onHull } from "./adapter.ts";

const R = 44;
const L = 50;

export function commandPieces(): Piece[] {
  const r = rng(2060);
  const out: Piece[] = [];
  out.push(slab("hull-grey", ngon(8, R / Math.cos(Math.PI / 8), Math.PI / 8), 0, L, [0, 0], true));
  out.push(slab("dark", ngon(8, R * 1.08), 0, 4, [0, 0], true), slab("dark", ngon(8, R * 1.08), L - 4, L, [0, 0], true));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    const n: [number, number, number] = [Math.sin(a), 0, Math.cos(a)];
    const u: [number, number, number] = [Math.cos(a), 0, -Math.sin(a)];
    const flat = (m: MaterialName, y: number, t: number, w: number, h: number, th: number) => ({ kind: "plate" as const, material: m, frame: { o: [n[0] * (R + th / 2) + u[0] * t, y, n[2] * (R + th / 2) + u[2] * t] as [number, number, number], u, v: [0, 1, 0] as [number, number, number], w: n }, outline: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as [number, number][], thickness: th, plain: true, only: "mesh" as const });
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      if (r.chance(0.08)) continue;
      out.push(flat(r.pick(PLATE), 6 + row * 10 + 4.6, (col - 2) * 13.4, 12.2, 8.8, 0.5 + 0.4 * r.next()));
    }
    // bridge slits: a row of dark slots with a lit core at deck height
    for (let i = -3; i <= 3; i++) out.push(flat("glass", 29, i * 4.2, 3.2, 1.2, 0.8), flat("lamp-blue", 29, i * 4.2, 2.2, 0.4, 1.0));
    out.push(flat("dark", 18, 0, 8, 12, 1.2), flat("hull-yellow", 18, 0, 6.4, 10.4, 1.8), flat("dark", 18, 0, 0.5, 8, 2.1));
  }
  // dishes on the four flats facing the diagonals, masts along the top
  for (let k = 0; k < 4; k++) {
    const a = ((k + 0.5) / 4) * 2 * Math.PI;
    const [x, z] = polar(a, 30);
    out.push(...dish([x, z], L + 2, 7));
    out.push(cyl("dark", [x, z], 4, L, L + 2, 12), ...mast([polar(a + 0.5, 20)[0], L, polar(a + 0.5, 20)[1]], [polar(a + 0.5, 20)[0], L + 8 + k * 1.5, polar(a + 0.5, 20)[1]], 0.5));
  }
  out.push(cyl("engine-pale", [0, 0], 8, L, L + 12, 16, { only: undefined, outline: true }), ring("copper", [0, 0], 8, 9.2, L + 4, L + 6, 16), cyl("dark", [0, 0], 4, L + 12, L + 18, 12));
  // escape pod bays on the aft ring: eight pods in recesses with hazard frames
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    out.push(onHull("black", [0, 0], a, R + 0.6, 10, 12, 8, 1.6), onHull("hull-yellow", [0, 0], a, R + 2.2, 10, 10, 6, 0.6), onHull("hull-white", [0, 0], a, R + 2.6, 10, 8, 4.4, 0.8));
  }
  out.push(...collar([0, 0], 0, -1, 10), ...collar([0, 0], L, 1, 6));
  void beam;
  void facesOf;
  void hatch;
  void hazard;
  void lights;
  void onFace;
  void pipe;
  void plating;
  void span;
  void stencil;
  void vent;
  return out;
}


/** The thirty-two attitude thrusters: four blocks of eight small bells at the citadel's corners, each with its valve housing. */
export function attitudePieces(): Piece[] {
  const out: Piece[] = [];
  // attitude thruster blocks at the four corners: each four small bells
  for (let k = 0; k < 4; k++) {
    const a = ((k + 0.5) / 4) * 2 * Math.PI;
    const [x, z] = polar(a, R + 5);
    out.push(box("dark", [x, L - 8, z], [10, 10, 10]));
    for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]] as const) out.push(revolve("bell", [x + dx, z + dz], [[1.9, L - 3], [1.1, L - 6.4]], 10), revolve("bell", [x + dx, z + dz], [[1.9, L - 13], [1.1, L - 9.6]], 10));
  }
  return out;
}

export function commandInside(which: "bridge" | "crew" | "med"): Piece[] {
  const out: Piece[] = [];
  const r = rng(2061);
  if (which === "bridge") {
  // bridge deck at y 27..37: floor, a ring of consoles, holo table, captain's chair
  out.push(slab("dark", ngon(8, 38, Math.PI / 8), 26, 27, [0, 0]));
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 2 * Math.PI;
    const [x, z] = polar(a, 30);
    out.push(onHull("hull-grey", [0, 0], a, 28, 29.2, 4.4, 2.4, 3.4), onHull("lamp-blue", [0, 0], a, 31.2, 30.6, 3.6, 1.2, 0.4), onHull("dark", [0, 0], a, 26, 28, 3, 2, 1.8));
    void x;
    void z;
  }
  out.push(cyl("engine-metal", [0, 0], 6, 27, 29, 16), revolve("lamp-blue", [0, 0], [[0.001, 31], [4.4, 29.6], [5, 29]], 16), cyl("dark", [0, 4], 1.6, 27, 29.4, 8), box("hull-orange", [0, 28.6, 12], [3, 2.8, 3]), box("hull-orange", [0, 30.6, 13.4], [3, 2.2, 0.8]));
  return out;
  }
  if (which === "crew") {
  // crew deck at y 12..22: bunks in rows, mess tables, a corridor ring
  out.push(slab("concrete", ngon(8, 38, Math.PI / 8), 12, 12.6, [0, 0]));
  for (let row = -3; row <= 3; row++) for (let col = -4; col <= 4; col++) {
    if (Math.hypot(row * 8, col * 8) > 34 || (Math.abs(col) < 1)) continue;
    out.push(box(r.pick<MaterialName>(["blanket", "coolant"]), [col * 7.2, 14.4, row * 8], [5.8, 1.6, 2.6]), box("hull-white", [col * 7.2, 15.4, row * 8], [5.2, 0.6, 2.4]), box("dark", [col * 7.2, 16.2, row * 8 - 1.3], [5.8, 2.6, 0.3]));
  }
  return out;
  }
  // medical bay: eight beds and a scanner, at the aft side
  for (let k = 0; k < 8; k++) out.push(box("hull-white", [-14 + (k % 4) * 9, 6.4, -24 + Math.floor(k / 4) * 8], [3.6, 1.2, 7]), box("coolant", [-14 + (k % 4) * 9, 7.4, -26.4 + Math.floor(k / 4) * 8], [3.6, 0.6, 2]));
  out.push(revolve("hull-grey", [20, -20], [[2.8, 5], [2.8, 11]], 16), ring("hull-white", [20, -20], 2.8, 4.2, 5, 11, 16));
  return out;
}
