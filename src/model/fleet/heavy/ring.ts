// The heavy habitat ring: a spinning torus of square section, six spokes to a hub on the spine, window cells, plating in three tones, radiator fins and service collars; and, for a cutaway, three decks of streets, blocks and parks inside. It is the ring
// ISV Kaminari (SPX-207) has, 165 m from the axis to the middle of a 36 m section. It is drawn from the radius to the middle of the section (`major`) and the section's size (`tube`), both in metres: every fitting is the reference one (the 36 m
// section's) times `tube / 36`, and the counts of window cells, pads and blocks follow the circumference, so the cells stay the same size round a bigger ring. At the reference size every number is Kaminari's. Pure: no three.js and no DOM.
import { around, beam, box, onHull, pipe, polar, revolve, ring, type MaterialName, type Piece, type Rng, rng } from "../solids.ts";

/** The ring the numbers below were drawn for, in metres. */
export const RING_REF = { major: 165, tube: 36 } as const;

/** What a heavy ring may be, in metres: its section 4 to 60 across, and its radius from two and a half sections to 400. */
export const RING_LIMITS = { tube: [4, 60], major: [8, 400] } as const;

/** Throws a RangeError naming the limit when a ring is outside what the part can be. */
export function checkRing(major: number, tube: number): void {
  if (!(tube >= RING_LIMITS.tube[0] && tube <= RING_LIMITS.tube[1])) throw new RangeError(`A heavy ring's section is ${RING_LIMITS.tube[0]} to ${RING_LIMITS.tube[1]} m across, not ${tube}.`);
  if (!(major >= 2.5 * tube && major <= RING_LIMITS.major[1])) throw new RangeError(`A heavy ring is 2.5 sections (${2.5 * tube} m here) to ${RING_LIMITS.major[1]} m from its axis to the middle of its section, not ${major}.`);
}

/** The numbers every part of a ring is placed from. */
function frame(major: number, tube: number) {
  const s = tube / RING_REF.tube;
  return { s, k: (v: number): number => v * s, R0: major - tube / 2, R1: major + tube / 2, T: tube, mid: tube / 2, count: (ref: number, radius: number, refRadius: number): number => Math.max(6, Math.round((ref * (radius / refRadius)) / s)) };
}

/** A ring standing on the origin, its axis up Y, from y = 0 to y = `tube`. `tone` is the colour of its rim bands; `r` is the seeded generator. */
export function ringPieces(size: { major: number; tube: number }, tone: MaterialName = "hull-orange", r: Rng = rng(2030)): Piece[] {
  checkRing(size.major, size.tube);
  const { major, tube } = size;
  const { k, R0, R1, T, mid, count } = frame(major, tube);
  const refR1 = RING_REF.major + RING_REF.tube / 2;
  const out: Piece[] = [];
  // the ring: an octagon-section torus, body of the drawing
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 72, body: true, outline: true, rings: [k(2), T - k(2)], profile: [[R0 + k(4), 0], [R1 - k(4), 0], [R1, k(4)], [R1, T - k(4)], [R1 - k(4), T], [R0 + k(4), T], [R0, T - k(4)], [R0, k(4)], [R0 + k(4), 0]] });
  // the outer wall as real separate shells, outside to inside: each layer its own ring, the gap left empty
  {
    let rr = R1;
    for (const [m, t] of [["hull-white", 0.02], ["hull-grey", 0.15], [null, 1.0], ["hull-grey", 0.35], ["fuel", 3.0], ["dark", 0.6], ["blanket", 0.4], ["engine-pale", 0.08], ["coolant", 1.2], ["blanket", 0.05]] as const) {
      if (m) out.push(ring(m, [0, 0], rr - k(t), rr - k(0.02), k(5), T - k(5), 72));
      rr -= k(t);
    }
  }
  // outer rim bands: two broad raised bands and a central window band, each a ring
  out.push(ring(tone, [0, 0], R1, R1 + k(0.7), k(3), k(11), 72), ring(tone, [0, 0], R1, R1 + k(0.7), T - k(11), T - k(3), 72), ring("dark", [0, 0], R1, R1 + k(0.5), k(15), k(21), 72));
  // window cells round the outside: a dark pane and a lit strip, every sixth a hatch
  const n = count(120, R1, refR1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    if (i % 6 === 0) {
      out.push(onHull("dark", [0, 0], a, R1, mid, k(6.4), k(13), k(1.2)), onHull("hull-yellow", [0, 0], a, R1 + k(1.1), mid, k(5), k(11.4), k(0.5)), onHull("dark", [0, 0], a, R1 + k(1.5), mid, k(0.5), k(6), k(0.4)));
    } else {
      out.push(onHull("glass", [0, 0], a, R1 + k(0.4), k(18), k(7.6), k(5.4), k(0.4)), onHull("lamp-blue", [0, 0], a, R1 + k(0.7), k(18), k(6.2), k(1.4), k(0.3)), onHull("dark", [0, 0], a, R1 + k(0.2), k(18), k(8.4), k(6.2), k(0.2)));
      if (i % 3 === 1) out.push(onHull("engine-metal", [0, 0], a, R1, mid + k(9), k(7), k(1.0), k(1.0)), onHull("engine-metal", [0, 0], a, R1, mid - k(9), k(7), k(1.0), k(1.0)));
    }
    // plating cells on the upper and lower bands
    for (const y of [k(7), T - k(7)]) if (!r.chance(0.08)) out.push(onHull(r.pick<MaterialName>([tone, "hull-grey", "hull-grey", "hull-white"]), [0, 0], a, R1 + k(0.7), y, k(8.2), k(6.4), k(0.3) + k(0.4) * r.next()));
  }
  // panel seams: weld rings and a heavy flange where the halves meet
  out.push(ring("dark", [0, 0], R1 - k(0.2), R1 + k(2.2), mid - k(0.5), mid + k(0.5), 72), ring("engine-metal", [0, 0], R1 - k(0.2), R1 + k(1.4), k(11), k(12), 72), ring("engine-metal", [0, 0], R1 - k(0.2), R1 + k(1.4), T - k(12), T - k(11), 72));
  // the inner and outer faces of the ring's sides
  const pads = count(96, R1, refR1);
  for (const y of [0, T]) {
    out.push(ring("hull-grey", [0, 0], R0 + k(6), R1 - k(6), y - k(0.5) + (y ? k(0.5) : -k(0.5)), y + (y ? k(0.5) : -k(0.5)), 72));
    for (let i = 0; i < pads; i++) {
      const a = (i / pads) * 2 * Math.PI;
      const rr = r.pick([R0 + k(12), major, R1 - k(12)]);
      const [x, z] = polar(a, rr);
      out.push(box(r.pick<MaterialName>(["hull-grey", "dark", tone, "engine-metal"]), [x, y + (y ? k(0.6) : -k(0.6)), z], [k(6.4), k(1.2), k(9.5)]));
    }
  }
  // six spokes: a box girder, a lift tube and a pipe, from the hub out to the ring, on the ring's mid height
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI;
    const [x0, z0] = polar(a, k(26));
    const [x1, z1] = polar(a, R0 + k(2));
    const side = polar(a + Math.PI / 2, 1);
    out.push(beam("hull-grey", [x0, mid, z0], [x1, mid, z1], k(8), k(10), true));
    out.push(pipe("hull-white", [x0 + side[0] * k(7), mid, z0 + side[1] * k(7)], [x1 + side[0] * k(7), mid, z1 + side[1] * k(7)], k(2), 8), pipe("coolant", [x0 - side[0] * k(7), mid, z0 - side[1] * k(7)], [x1 - side[0] * k(7), mid, z1 - side[1] * k(7)], k(1.5), 8));
    for (let j = 0; j < 8; j++) {
      const f = k(30) + j * ((R0 - k(34)) / 8);
      const [px, pz] = polar(a, f);
      out.push(box("hull-yellow", [px, mid + k(5.4), pz], [k(3), k(0.8), k(3)]), beam("engine-metal", [px + side[0] * k(4), mid - k(4), pz + side[1] * k(4)], [px - side[0] * k(4), mid + k(4), pz - side[1] * k(4)], k(0.7), k(0.7)));
    }
    // a spoke root fairing where it meets the ring
    out.push(onHull("dark", [0, 0], a, R0 - k(6), mid, k(16), k(24), k(6)));
  }
  // the hub on the spine: a cylinder with a bearing ring each side and drive motors
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 32, body: true, outline: true, profile: [[0.001, 0], [k(26), 0], [k(26), T], [0.001, T]] });
  out.push(ring("engine-pale", [0, 0], k(24), k(31), k(4), k(8), 32), ring("engine-pale", [0, 0], k(24), k(31), T - k(8), T - k(4), 32), ring("copper", [0, 0], k(25), k(27), k(14), k(22), 32));
  for (let i = 0; i < 8; i++) {
    const [x, z] = polar((i / 8) * 2 * Math.PI, k(29));
    out.push(box("dark", [x, mid, z], [k(7), k(14), k(7)]), box("hull-yellow", [x, mid + k(8), z], [k(3), k(2), k(3)]));
  }
  // radiator fins on the ring's rim: flat, edge-on plates, twenty-four
  out.push(...around(24, (a) => [onHull("coolant", [0, 0], a, R1 + k(1), mid, k(0.8), T - k(6), k(8))]));
  // service collars on the outside, six standard collars facing out radially are drawn as rings on the rim
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * 2 * Math.PI;
    const [x, z] = polar(a, R1 + k(2));
    out.push(ring("engine-pale", [x, z], k(4.4), k(6), mid - k(3), mid + k(3), 20), ring("hull-yellow", [x, z], k(6), k(6.8), mid - k(3), mid + k(3), 20), box("dark", [x, mid, z], [k(5), k(5), k(5)]));
  }
  return out;
}

/**
 * The decks inside a ring in the frame of the ring, its base at `y0`: three floors, rows of blocks, a park strip and a central rail. `only` picks one deck (0, 1 or 2); left out, all three. `r` is the generator the decks of a ship share.
 */
export function ringInsidePieces(size: { major: number; tube: number }, y0: number, only: number | undefined, r: Rng): Piece[] {
  checkRing(size.major, size.tube);
  const { major, tube } = size;
  const { k, R0, count } = frame(major, tube);
  const out: Piece[] = [];
  for (const deck of only === undefined ? [0, 1, 2] : [only]) {
    const rr = R0 + k(4) + deck * k(8);
    const fy = y0 + k(3) + deck * k(11);
    out.push(ring("concrete", [0, 0], rr, rr + k(7.2), fy, fy + k(0.6), 72));
    const n = count(72 - deck * 4, rr, RING_REF.major - RING_REF.tube / 2 + 4 + deck * 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI;
      const [x, z] = polar(a, rr + k(3.6));
      if (r.chance(0.16)) {
        out.push(revolve("plant", [x, z], [[0.001, fy + k(6)], [k(1.6), fy + k(3)], [k(1.8), fy + k(0.6)]], 6), pipe("hull-orange-worn", [x, fy + k(0.6), z], [x, fy + k(3), z], k(0.25), 6));
        continue;
      }
      out.push(onHull(r.pick<MaterialName>(["blanket", "hull-white", "hull-orange", "hull-grey", "coolant"]), [0, 0], a, rr, fy + k(2.2) + r.range(0, k(2)), k(3.2), k(4.4) + r.range(0, k(4)), k(5.6)));
      out.push(onHull("lamp-blue", [0, 0], a, rr + k(5.6), fy + k(3), k(1.6), k(0.6), k(0.2)));
    }
    out.push(ring("lamp-blue", [0, 0], rr + k(3.4), rr + k(3.7), fy + k(0.6), fy + k(0.75), 72));
    // lamp strip along the ceiling
    out.push(ring("lamp-blue", [0, 0], rr + k(3.4), rr + k(3.8), fy + k(9.6), fy + k(9.8), 72));
  }
  // a rail for the trams, along the middle deck
  if (only === undefined || only === 1) out.push(ring("hull-yellow", [0, 0], R0 + k(11.4), R0 + k(11.7), y0 + k(14.2), y0 + k(14.4), 72));
  return out;
}
