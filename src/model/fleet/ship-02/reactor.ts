// The reactor hall: an eight-sided armoured shell round the spine, behind a layered shadow shield. Outside: heavy plating, blast doors, isolation valves, radiator manifolds with the roots of both radiator
// wings, feed trunks to the drive raft. Inside (a separate part, for the cutaway): six fusion reactors round the spine, each with coil stacks, a turbine drum, heat exchangers and a service gantry.
import { PLATE, beam, box, cyl, facesOf, hatch, hazard, lights, onFace, onHull, pipe, plating, polar, ring, rng, slab, span, vent, ngon, type Piece, type Vec3 } from "./adapter.ts";

const R = 100;
const Y0 = 8;
const Y1 = 140;

export function reactorPieces(): Piece[] {
  const r = rng(2004);
  const out: Piece[] = [];
  // the shell: an octagonal prism, with a lower and an upper collar ring
  out.push(slab("hull-grey", ngon(8, R / Math.cos(Math.PI / 8), Math.PI / 8), Y0, Y1, [0, 0], true));
  out.push(slab("dark", ngon(8, R * 1.05), 0, Y0, [0, 0], true), slab("dark", ngon(8, R * 1.05), Y1, Y1 + 4, [0, 0], true));
  // the wall as nested shells: bumper, armour, a water jacket, a lead layer and the pressure shell, each an octagon with its own thickness
  {
    let a = R - 0.1;
    for (const [m, t] of [["hull-grey", 0.4], ["hull-grey", 1.0], ["fuel", 4.0], ["dark", 1.2], ["engine-pale", 0.3]] as const) {
      out.push(slab(m, ngon(8, (a - t) / Math.cos(Math.PI / 8), Math.PI / 8), Y0 + 6, Y1 - 6, [0, 0]));
      a -= t + 0.1;
    }
  }
  // face plating on each of the eight flats, with hatches, vents and lettering
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    const apothem = R;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (r.chance(0.07)) continue;
        const wide = (2 * R * Math.sin(Math.PI / 8)) / 7;
        const y = Y0 + 2 + row * ((Y1 - Y0 - 4) / 6) + (Y1 - Y0 - 4) / 12;
        const t = (col - 3) * wide;
        out.push(onHullFlat(r.pick(PLATE), a, apothem, y, t, wide - 1.6, (Y1 - Y0 - 4) / 6 - 1.6, 0.4 + 0.4 * r.next()));
      }
    }
    // a blast door on every flat: two leaves with hazard bands across the head
    out.push(onHullFlat("dark", a, apothem, 38, 0, 24, 30, 1.4), onHullFlat("hull-orange", a, apothem, 38, -6.2, 11, 28, 2.1), onHullFlat("hull-orange", a, apothem, 38, 6.2, 11, 28, 2.1), onHullFlat("hull-yellow", a, apothem, 53.5, 0, 24, 1.8, 2.4), onHullFlat("black", a, apothem, 22.5, 0, 24, 1.8, 2.4));
    out.push(onHullFlat("black", a, apothem, 100, 20, 22, 14, 1.2), onHullFlat("engine-metal", a, apothem, 102, 20, 20, 1.2, 1.9), onHullFlat("engine-metal", a, apothem, 98, 20, 20, 1.2, 1.9), onHullFlat("engine-metal", a, apothem, 94, 20, 20, 1.2, 1.9));
    out.push(onHullFlat("dark", a, apothem, 100, -20, 12, 12, 1.2), onHullFlat("hull-yellow", a, apothem, 100, -20, 7, 7, 1.8));
  }
  // radiator manifolds at the port and starboard flats: a pipe header the wing roots plug into
  for (const sx of [-1, 1]) {
    const x = sx * (R + 3);
    out.push(span("dark", sx > 0 ? x - 2 : x - 6, sx > 0 ? x + 6 : x + 2, 30, 124, -12, 12, true));
    for (let i = 0; i < 5; i++) out.push(pipe(i % 2 ? "coolant" : "hull-orange", [x, 34 + i * 20, -9], [x + sx * 22, 34 + i * 20, -9], 2.3, 8), pipe(i % 2 ? "hull-white" : "coolant", [x, 34 + i * 20, 9], [x + sx * 22, 34 + i * 20, 9], 2.3, 8));
    out.push(box("hull-yellow", [x + sx * 4, 128, 0], [8, 4, 24]));
  }
  // feed trunks, from the drive raft up the outside of the shell: four big pipes in clamps
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]] as const) {
    out.push(pipe("coolant", [x * 1.2, -4, z * 1.2], [x * 1.2, Y0 + 4, z * 1.2], 3.2, 10));
  }
  // dorsal and ventral: service decks on the two flats facing +z and -z are the radial flats; the top collar gets rails and hatches
  for (const f of facesOf([0, Y1 + 2, 0], [2 * R, 4, 2 * R], ["y+"])) {
    out.push(...hazard(f, 0, -R * 0.82, 120, 3, 24), ...lights(f, -R * 0.8, R * 0.9, R * 0.8, R * 0.9, 12, 2.2, "lamp-red"), ...lights(f, -R * 0.8, -R * 0.9, R * 0.8, -R * 0.9, 12, 2.2, "hull-yellow"));
    for (let i = 0; i < 4; i++) out.push(...hatch(f, -60 + i * 40, 60, 8, 8, "dark", "hull-yellow"));
  }
  // vents high on the hall, a coolant ring round the top
  out.push(ring("coolant", [0, 0], R * 0.93, R * 0.99, Y1 - 6, Y1 - 2, 8));
  void vent;
  void onFace;
  void cyl;
  void beam;
  void onHull;
  void plating;
  return out;
}


/** The shadow shield: an octagon over the hall, three spaced layers on standoffs, orange tiles on the outer face. */
export function shadowShieldPieces(): Piece[] {
  const r = rng(2005);
  const out: Piece[] = [];
  // the shadow shield: an octagon over the hall, three spaced layers on standoffs, orange tiles on the outer face
  const sy = 0;
  out.push(slab("dark", ngon(8, 148), sy, sy + 4, [0, 0], true), slab("hull-grey", ngon(8, 142), sy + 8, sy + 11, [0, 0], true), slab("hull-orange", ngon(8, 136), sy + 15, sy + 17, [0, 0], true));
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 2 * Math.PI;
    const [x, z] = polar(a, 120);
    out.push(pipe("engine-metal", [x, sy + 4, z], [x, sy + 15, z], 2.4, 8, false));
  }
  // tiles on the shield's face: a grid, clipped to the octagon by distance
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const x = i * 20;
    const z = j * 20;
    if (Math.hypot(x, z) > 126 || r.chance(0.1)) continue;
    out.push(box(r.pick(["hull-orange", "hull-orange", "hull-orange", "hull-grey", "hull-grey-dark", "hull-white"]), [x, sy + 18, z], [18.4, 1.6, 18.4]));
  }
  for (let k = 0; k < 8; k++) {
    const [x, z] = polar((k / 8) * 2 * Math.PI + Math.PI / 8, 130);
    out.push(box("hull-yellow", [x, sy + 19, z], [6, 2, 6]));
  }
  return out;
}

/** A thin box standing on one flat of the eight-sided shell. `a` is the flat's angle round the y axis, `apothem` its distance from the axis, `t` along the flat and `h` up it. */
function onHullFlat(material: Parameters<typeof box>[0], a: number, apothem: number, y: number, t: number, w: number, h: number, thick: number) {
  const n: Vec3 = [Math.sin(a), 0, Math.cos(a)];
  const u: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
  const o: Vec3 = [n[0] * (apothem + thick / 2) + u[0] * t, y, n[2] * (apothem + thick / 2) + u[2] * t];
  return { kind: "plate" as const, material, frame: { o, u, v: [0, 1, 0] as Vec3, w: n }, outline: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as [number, number][], thickness: thick, plain: true, only: "mesh" as const };
}

/** The six reactors and their works, in the hall's frame. */
export function reactorInside(): Piece[] {
  const out: Piece[] = [];
  const r = rng(2006);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 2 * Math.PI;
    const at = polar(a, 62);
    out.push(cyl("engine-pale", at, 20, Y0 + 14, Y1 - 12, 28, { only: undefined, outline: true }));
    for (let i = 0; i < 6; i++) out.push(ring("copper", at, 20, 24.5, Y0 + 24 + i * 16, Y0 + 24 + i * 16 + 7, 28), ring("dark", at, 24.5, 25.5, Y0 + 22 + i * 16, Y0 + 33 + i * 16, 28));
    out.push(cyl("dark", at, 14, Y1 - 12, Y1 - 4, 20), cyl("coolant", at, 8, Y1 - 4, Y1, 16), cyl("dark", at, 24, Y0 + 8, Y0 + 14, 20));
    // a turbine and heat exchanger drum beside each reactor, and pipes between
    const side = polar(a + 0.38, 78);
    out.push(cyl("hull-grey", side, 9, Y0 + 20, Y1 - 30, 16, { only: undefined, outline: true }), ring("hull-orange", side, 9, 11, Y0 + 40, Y0 + 46, 16), ring("hull-orange", side, 9, 11, Y1 - 50, Y1 - 44, 16));
    out.push(pipe("coolant", [at[0], Y0 + 60, at[1]], [side[0], Y0 + 60, side[1]], 2.2, 8), pipe("hull-orange", [at[0], Y1 - 40, at[1]], [side[0], Y1 - 40, side[1]], 2.2, 8));
    // a gantry round each reactor at mid height with rail posts
    out.push(ring("hull-yellow", at, 25.5, 29, Y0 + 70, Y0 + 72, 24));
    for (let i = 0; i < 8; i++) {
      const [px, pz] = polar(a + (i / 8) * 2 * Math.PI, 28.6, at);
      out.push(box("hull-yellow", [px, Y0 + 76, pz], [0.8, 8, 0.8]));
    }
    const [lx, lz] = polar(a, 40);
    out.push(beam("hull-yellow", [lx, Y0 + 71, lz], [polar(a, 48)[0] - 0 * lx, Y0 + 71, polar(a, 48)[1]], 3, 1));
  }
  // the central service core round the spine, a deck and corridor ring, a crane rail overhead
  out.push(ring("concrete", [0, 0], 24, 28, Y0 + 3, Y0 + 5, 24), ring("hull-white", [0, 0], 24, 27, Y0 + 5, Y0 + 7, 24));
  for (let i = 0; i < 24; i++) {
    const [x, z] = polar((i / 24) * 2 * Math.PI, 40);
    out.push(box(r.pick(["dark", "hull-grey", "engine-metal"]), [x, Y0 + 12, z], [4 + r.next() * 3, 18 + r.next() * 12, 4 + r.next() * 3]));
  }
  return out;
}
