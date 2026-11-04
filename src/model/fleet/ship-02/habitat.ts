// A habitat ring: a spinning torus of rectangular section 165 m from the axis, spun at 1.65 rpm for half an Earth gravity at the floor, with six spokes (a lift tube and a service pipe each) to a hub on the
// spine. Outside: window rows, plating in three tones, docking collars, radiator fins, the hub's bearings. Inside (separate): three decks of streets, blocks and park, lit by a ceiling strip.
import { around, beam, box, collar, cyl, hatch, lights, onHull, pipe, plating, polar, revolve, ring, rng, span, stencil, type MaterialName, type Piece, vent } from "./adapter.ts";
import { HABITAT } from "./dims.ts";

const R0 = HABITAT.radius - HABITAT.tube / 2;
const R1 = HABITAT.radius + HABITAT.tube / 2;
const T = 36;

export function habitatPieces(which: 0 | 1): Piece[] {
  const r = rng(2030 + which);
  const out: Piece[] = [];
  const mid = T / 2;
  const tone: MaterialName = which === 0 ? "hull-orange" : "hull-white";
  // the ring: an octagon-section torus, body of the drawing
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 72, body: true, outline: true, rings: [2, T - 2], profile: [[R0 + 4, 0], [R1 - 4, 0], [R1, 4], [R1, T - 4], [R1 - 4, T], [R0 + 4, T], [R0, T - 4], [R0, 4], [R0 + 4, 0]] });
  // the outer wall as real separate shells, outside to inside (specs.ts, HULL_STACK_RING): each layer its own ring, the gap left empty
  {
    let rr = R1;
    for (const [m, t] of [["hull-white", 0.02], ["hull-grey", 0.15], [null, 1.0], ["hull-grey", 0.35], ["fuel", 3.0], ["dark", 0.6], ["blanket", 0.4], ["engine-pale", 0.08], ["coolant", 1.2], ["blanket", 0.05]] as const) {
      if (m) out.push(ring(m, [0, 0], rr - t, rr - 0.02, 5, T - 5, 72));
      rr -= t;
    }
  }
  // outer rim bands: two broad raised bands and a central window band, each a ring
  out.push(ring(tone, [0, 0], R1, R1 + 0.7, 3, 11, 72), ring(tone, [0, 0], R1, R1 + 0.7, T - 11, T - 3, 72), ring("dark", [0, 0], R1, R1 + 0.5, 15, 21, 72));
  // window cells round the outside: 120 of them, a dark pane and a lit strip, every sixth a hatch
  const n = 120;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI;
    if (k % 6 === 0) {
      out.push(onHull("dark", [0, 0], a, R1, mid, 6.4, 13, 1.2), onHull("hull-yellow", [0, 0], a, R1 + 1.1, mid, 5, 11.4, 0.5), onHull("dark", [0, 0], a, R1 + 1.5, mid, 0.5, 6, 0.4));
    } else {
      out.push(onHull("glass", [0, 0], a, R1 + 0.4, 18, 7.6, 5.4, 0.4), onHull("lamp-blue", [0, 0], a, R1 + 0.7, 18, 6.2, 1.4, 0.3), onHull("dark", [0, 0], a, R1 + 0.2, 18, 8.4, 6.2, 0.2));
      if (k % 3 === 1) out.push(onHull("engine-metal", [0, 0], a, R1, mid + 9, 7, 1.0, 1.0), onHull("engine-metal", [0, 0], a, R1, mid - 9, 7, 1.0, 1.0));
    }
    // plating cells on the upper and lower bands
    for (const y of [7, T - 7]) if (!r.chance(0.08)) out.push(onHull(r.pick<MaterialName>([tone, "hull-grey", "hull-grey", "hull-white"]), [0, 0], a, R1 + 0.7, y, 8.2, 6.4, 0.3 + 0.4 * r.next()));
  }
  // panel seams: weld rings and a heavy flange where the halves meet
  out.push(ring("dark", [0, 0], R1 - 0.2, R1 + 2.2, mid - 0.5, mid + 0.5, 72), ring("engine-metal", [0, 0], R1 - 0.2, R1 + 1.4, 11, 12, 72), ring("engine-metal", [0, 0], R1 - 0.2, R1 + 1.4, T - 12, T - 11, 72));
  // the inner and outer faces of the ring's sides
  for (const y of [0, T]) {
    out.push(ring("hull-grey", [0, 0], R0 + 6, R1 - 6, y - 0.5 + (y ? 0.5 : -0.5), y + (y ? 0.5 : -0.5), 72));
    for (let k = 0; k < 96; k++) {
      const a = (k / 96) * 2 * Math.PI;
      const rr = r.pick([R0 + 12, HABITAT.radius, R1 - 12]);
      const [x, z] = polar(a, rr);
      out.push(box(r.pick<MaterialName>(["hull-grey", "dark", tone, "engine-metal"]), [x, y + (y ? 0.6 : -0.6), z], [6.4, 1.2, 9.5]));
    }
  }
  // six spokes: a box girder, a lift tube and a pipe, from the hub out to the ring, on the ring's mid height
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 2 * Math.PI;
    const [x0, z0] = polar(a, 26);
    const [x1, z1] = polar(a, R0 + 2);
    const side = polar(a + Math.PI / 2, 1);
    out.push(beam("hull-grey", [x0, mid, z0], [x1, mid, z1], 8, 10, true));
    out.push(pipe("hull-white", [x0 + side[0] * 7, mid, z0 + side[1] * 7], [x1 + side[0] * 7, mid, z1 + side[1] * 7], 2, 8), pipe("coolant", [x0 - side[0] * 7, mid, z0 - side[1] * 7], [x1 - side[0] * 7, mid, z1 - side[1] * 7], 1.5, 8));
    for (let s = 0; s < 8; s++) {
      const f = 30 + s * ((R0 - 34) / 8);
      const [px, pz] = polar(a, f);
      out.push(box("hull-yellow", [px, mid + 5.4, pz], [3, 0.8, 3]), beam("engine-metal", [px + side[0] * 4, mid - 4, pz + side[1] * 4], [px - side[0] * 4, mid + 4, pz - side[1] * 4], 0.7, 0.7));
    }
    // a spoke root fairing where it meets the ring
    out.push(onHull("dark", [0, 0], a, R0 - 6, mid, 16, 24, 6));
  }
  // the hub on the spine: a cylinder with a bearing ring each side, drive motors and a collar either face
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 32, body: true, outline: true, profile: [[0.001, 0], [26, 0], [26, T], [0.001, T]] });
  out.push(ring("engine-pale", [0, 0], 24, 31, 4, 8, 32), ring("engine-pale", [0, 0], 24, 31, T - 8, T - 4, 32), ring("copper", [0, 0], 25, 27, 14, 22, 32));
  for (let k = 0; k < 8; k++) {
    const [x, z] = polar((k / 8) * 2 * Math.PI, 29);
    out.push(box("dark", [x, mid, z], [7, 14, 7]), box("hull-yellow", [x, mid + 8, z], [3, 2, 3]));
  }
  // radiator fins on the ring's rim: flat, edge-on plates, twenty-four
  out.push(...around(24, (a) => [onHull("coolant", [0, 0], a, R1 + 1, mid, 0.8, T - 6, 8)]));
  // service collars on the outside, six standard collars facing out radially are drawn as rings on the rim
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) / 6) * 2 * Math.PI;
    const [x, z] = polar(a, R1 + 2);
    out.push(ring("engine-pale", [x, z], 4.4, 6, mid - 3, mid + 3, 20), ring("hull-yellow", [x, z], 6, 6.8, mid - 3, mid + 3, 20), box("dark", [x, mid, z], [5, 5, 5]));
  }
  void collar;
  void cyl;
  void hatch;
  void lights;
  void plating;
  void revolve;
  void span;
  void stencil;
  void vent;
  return out;
}

/** Decks inside both rings in the frame of the ring: three floors, rows of blocks, a park strip, a central rail. `which` picks the ring's y. */
export function habitatInside(y0: number, only?: number): Piece[] {
  const r = rng(2040 + y0);
  const out: Piece[] = [];
  for (const deck of only === undefined ? [0, 1, 2] : [only]) {
    const rr = R0 + 4 + deck * 8;
    const fy = y0 + 3 + deck * 11;
    out.push(ring("concrete", [0, 0], rr, rr + 7.2, fy, fy + 0.6, 72));
    const n = 72 - deck * 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI;
      const [x, z] = polar(a, rr + 3.6);
      if (r.chance(0.16)) {
        out.push(revolve("plant", [x, z], [[0.001, fy + 6], [1.6, fy + 3], [1.8, fy + 0.6]], 6), pipe("hull-orange-worn", [x, fy + 0.6, z], [x, fy + 3, z], 0.25, 6));
        continue;
      }
      out.push(onHull(r.pick<MaterialName>(["blanket", "hull-white", "hull-orange", "hull-grey", "coolant"]), [0, 0], a, rr, fy + 2.2 + r.range(0, 2), 3.2, 4.4 + r.range(0, 4), 5.6));
      out.push(onHull("lamp-blue", [0, 0], a, rr + 5.6, fy + 3, 1.6, 0.6, 0.2));
    }
    out.push(ring("lamp-blue", [0, 0], rr + 3.4, rr + 3.7, fy + 0.6, fy + 0.75, 72));
    // lamp strip along the ceiling
    out.push(ring("lamp-blue", [0, 0], rr + 3.4, rr + 3.8, fy + 9.6, fy + 9.8, 72));
  }
  // a rail for the trams, along the middle deck
  if (only === undefined || only === 1) out.push(ring("hull-yellow", [0, 0], R0 + 11.4, R0 + 11.7, y0 + 14.2, y0 + 14.4, 72));
  return out;
}
