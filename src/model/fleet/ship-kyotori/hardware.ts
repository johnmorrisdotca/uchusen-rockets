// The ship-side hardware of Kyotori V2 that the boards called weak: tanks with insulation blankets and valve clusters, the payload bay with its doors drawn from the Shuttle photographs (sectioned doors, hinge fittings, centreline latch gangs, radiator
// panels on the doors' inner faces, door drive units at the bulkheads), the figured JWST-style mirror with its backplane, the load-bearing latch frames between the two shafts, and two designed bows. Concepts for John's V2. Pure: no three.js and no DOM.
import { antenna, ball, beam, box, collar, hoop, horn, ibeam, lamps, navLight, pipeRun, place, quad, rod, roundStrut, type Lathe, type MaterialName, type Piece, type Vec3 } from "./adapter.ts";
import { framedTank, payloadBay2 } from "./pods.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;
const lathe = (material: MaterialName, profile: [number, number][], at: [number, number] = [0, 0], extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, segs: 40, only: "mesh", at, profile, ...extra });
const tri = (m: MaterialName, a: Vec3, b: Vec3, c: Vec3): Piece => quad(m, a, b, c, [c[0] + 0.005, c[1], c[2]], 0.05, { only: "mesh" });

/** A tank in blankets: the framed tank with quilted insulation patches in three rows round it, a seam strip between them, and at its feed end a valve cluster (a manifold with three valves and hand-wheels, a bleed line, a purge sphere and a flex line). */
export function insulatedTank(r: number, len: number): Piece[] {
  const out: Piece[] = [...framedTank(r, len)];
  for (const f of [0.28, 0.5, 0.72]) for (let k = 0; k < 10; k++) {
    const a = deg(36 * k + (f === 0.5 ? 18 : 0));
    out.push(box("blanket", [(r + 0.16) * Math.sin(a), len * f - len * 0.07, (r + 0.16) * Math.cos(a)], r * 0.55, 0.12, len * 0.14, (a * 180) / Math.PI + 90, { only: "mesh", plain: true }));
  }
  const top = len + 1.1;
  out.push(box("hull-grey-dark", [0, top + 0.1, 0], r * 0.9, 0.5, r * 0.5, 0, { only: "mesh", plain: true }));
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * r * 0.32;
    out.push(rod("hull-grey", [x, top + 0.2, 0], [x, top + r * 0.5, 0], 0.16, 10, { only: "mesh" }), rod("hull-yellow", [x - 0.3, top + r * 0.5, 0], [x + 0.3, top + r * 0.5, 0], 0.07, 8, { only: "mesh" }), rod("hull-yellow", [x, top + r * 0.5, -0.3], [x, top + r * 0.5, 0.3], 0.07, 8, { only: "mesh" }));
  }
  out.push(ball("hull-grey", [r * 0.6, top + 0.5, 0], 0.34), ...pipeRun("pipe-steel", [[r * 0.6, top + 0.5, 0], [r * 0.6, top + 1.8, 0.3], [r * 0.1, top + 2.4, 0.6]], 0.07), ...pipeRun("copper", [[-r * 0.5, top + 0.4, 0], [-r * 0.7, top + 1.4, 0.4], [-r * 0.2, top + 2.1, 0.5]], 0.05));
  return out;
}

/**
 * The payload bay with the Shuttle's detail added to the barrel: each door in two sections with a seam, four hinge fittings on the sill of each section, a gang of six latch hooks on each section's free edge, a radiator panel on the inside of each door with
 * its coolant tubes, a rotary drive unit and torque tube at each bulkhead for each door, and the sill's longeron rail. `open` is the doors' angle in degrees.
 */
export function bay(y0: number, open = 100): Piece[] {
  const R = 9;
  const L = 40;
  const out: Piece[] = [...payloadBay2(y0, open)];
  const gap = 1.05;
  for (const s of [-1, 1]) {
    const hingeA = TAU / 4 + s * gap;
    const H: Vec3 = [R * Math.sin(hingeA), 0, R * Math.cos(hingeA)];
    for (let i = 0; i < 8; i++) {
      const y = y0 + 1 + i * 5;
      out.push(box("hull-grey-dark", [H[0] * 1.04, y, H[2] * 1.04], 0.9, 0.9, 1.5, 0, { only: "mesh", plain: true }), rod("steel", [H[0] * 1.08, y - 0.1, H[2] * 1.08], [H[0] * 1.08, y + 1.6, H[2] * 1.08], 0.12, 8, { only: "mesh" }));
    }
    // the sill: a longeron rail along the barrel under each door's hinge, and the torque tube that drives the door
    out.push(rod("hull-grey", [H[0] * 1.02, y0 + 0.5, H[2] * 1.02], [H[0] * 1.02, y0 + L - 0.5, H[2] * 1.02], 0.28, 8, { only: "mesh" }));
    for (const y of [y0 + 0.8, y0 + L - 0.8]) out.push(box("hull-grey-dark", [H[0] * 1.1, y, H[2] * 1.1], 1.6, 1.4, 1.8, 0, { only: "mesh", plain: true }), box("lamp-amber", [H[0] * 1.1, y + 1.7, H[2] * 1.1], 0.3, 0.3, 0.2, 0, { only: "mesh", plain: true }));
    // the door's free edge (a quarter turn from the hinge): gangs of latch hooks
    const free = s > 0 ? hingeA - 1.05 : hingeA + 1.05;
    const turn = (p: Vec3, t: number): Vec3 => [p[0] * Math.cos(t) + p[2] * Math.sin(t), p[1], -p[0] * Math.sin(t) + p[2] * Math.cos(t)];
    const rel = (r: number, a: number, y: number): Vec3 => [r * Math.sin(a) - H[0], y, r * Math.cos(a) - H[2]];
    const at = (r: number, a: number, y: number): Vec3 => {
      const q = turn(rel(r, a, y), deg(s * open));
      return [H[0] + q[0], q[1], H[2] + q[2]];
    };
    for (const sec of [0, 1]) {
      const yc = y0 + L * (sec ? 0.75 : 0.25);
      for (let k = 0; k < 6; k++) {
        const y = yc - 7 + k * 2.8;
        const p = at(R + 0.3, free, y);
        out.push(box("hull-grey-dark", p, 0.7, 0.7, 0.9, 0, { only: "mesh", plain: true }), box("hull-yellow", [p[0], p[1] + 0.9, p[2]], 0.5, 0.5, 0.35, 0, { only: "mesh", plain: true }));
      }
      // the radiator panel on the inside of the door: a flat white panel with eleven coolant tubes
      const mid = (free + hingeA) / 2;
      const a0 = at(R - 0.7, mid, yc - 9);
      const a1 = at(R - 0.7, mid, yc + 9);
      out.push(...ibeam("hull-white-worn", a0, a1, 0.3, 4.6, [0, 1, 0]).slice(0, 1));
      for (let t = -5; t <= 5; t++) out.push(rod("copper", at(R - 0.55, mid + t * 0.07, yc - 8.6), at(R - 0.55, mid + t * 0.07, yc + 8.6), 0.045, 6, { only: "mesh" }));
    }
  }
  return out;
}

/**
 * The mirror at the front, figured: eighteen hexagonal segments in the honeycomb, each a shallow dish of six facets in gold, with a dark hexagonal backplane of box girders behind them (a ring, six spokes and the ribs between the segments), the
 * instrument box behind it, the tripod and its secondary mirror, and the sunshield behind that: five silver layers on spreader booms with battens. `rho` is a segment's circumradius.
 */
export function figuredMirror(y: number, rho = 5.4): Piece[] {
  const out: Piece[] = [];
  const s = rho * Math.sqrt(3);
  const cs: [number, number][] = [];
  for (let r = -3; r <= 3; r++) for (let q = -4; q <= 4; q++) {
    const x = s * (q + r / 2);
    const z = ((s * Math.sqrt(3)) / 2) * r;
    const d = Math.hypot(x, z);
    if (d > 0.1 && d < 2.05 * s) cs.push([x, z]);
  }
  const sag = 0.9;
  const hex = (k: number, c: [number, number], d: number): Vec3 => [c[0] + rho * 0.98 * Math.cos(deg(60 * k)) * d, 0, c[1] + rho * 0.98 * Math.sin(deg(60 * k)) * d];
  for (const [i, c] of cs.entries()) {
    const lean = Math.hypot(c[0], c[1]) * 0.012;
    for (let k = 0; k < 6; k++) {
      const a = hex(k, c, 1);
      const b = hex(k + 1, c, 1);
      out.push(tri(i % 3 === 0 ? "gold" : "kapton", [a[0], y + lean, a[2]], [b[0], y + lean, b[2]], [c[0], y + lean - sag, c[1]]));
    }
    out.push(box("hull-grey-dark", [c[0], y - 2.2, c[1]], rho * 0.5, rho * 0.5, 0.5, 30, { only: "mesh", plain: true }));
  }
  // the backplane: a hexagonal ring of box girders, six spokes and ribs between segments
  const ring = (k: number, rr: number, yy: number): Vec3 => [rr * Math.cos(deg(60 * k + 30)), yy, rr * Math.sin(deg(60 * k + 30))];
  for (let k = 0; k < 6; k++) {
    out.push(beam("hull-grey-dark", ring(k, 2.35 * s, y - 1.6), ring(k + 1, 2.35 * s, y - 1.6), 1.1, 1.5), beam("hull-grey-dark", ring(k, 0.4, y - 1.6), ring(k, 2.35 * s, y - 1.6), 0.9, 1.3), beam("hull-grey", ring(k, 2.35 * s, y - 1.6), ring(k, 2.35 * s, y - 4.8), 0.5, 0.5));
  }
  for (const [x, z] of cs) for (let k = 0; k < 6; k += 2) out.push(beam("hull-grey-dark", [x, y - 1.4, z], [x + rho * Math.cos(deg(60 * k)), y - 1.4, z + rho * Math.sin(deg(60 * k))], 0.35, 0.5));
  out.push(box("hull-grey-dark", [0, y - 8, 0], 9, 9, 7, 0, { only: "mesh", plain: true }), box("radiator", [4.8, y - 6, 0], 0.2, 5, 6, 0, { only: "mesh", plain: true }), box("copper", [0, y - 8.1, 0], 3, 3, 0.2, 0, { only: "mesh", plain: true }));
  // the tripod and the secondary
  const top = y + 2.1 * s;
  for (let k = 0; k < 3; k++) out.push(...roundStrut("hull-grey", ring(2 * k, 2.1 * s * 0.92, y - 0.2), [0, top, 0], 0.22));
  out.push(...horn("hull-grey-dark", [0, top, 0], [0, top + 2.4, 0], [1.9, 1.6, 1.2], 12), tri("gold", [-1.3, top - 0.1, -0.8], [1.3, top - 0.1, -0.8], [0, top - 0.7, 0.6]));
  // the sunshield: five layers on spreader booms
  const wide = 2.6 * s;
  const long = 3.9 * s;
  for (let i = 0; i < 5; i++) {
    const yy = y - 9 - i * 1.2;
    out.push(quad("steel", [-wide, yy, 0], [0, yy, -long], [wide, yy, 0], [0, yy, long], 0.1, { only: "mesh" }));
    for (const sgn of [-1, 1]) out.push(beam("hull-grey", [0, yy, 0], [sgn * wide, yy, 0], 0.18, 0.18));
    out.push(beam("hull-grey", [0, yy, -long], [0, yy, long], 0.16, 0.16));
  }
  out.push(...[-1, 1].map((sg) => beam("hull-grey-dark", [sg * wide * 0.5, y - 9, -long * 0.5], [sg * wide * 0.5, y - 14, long * 0.5], 0.3, 0.3)));
  return out;
}

/**
 * One half of a joint between the two shafts, standing at height `y` in a shaft's own frame with the seam on its -X side at `seam`: a clamp collar of two hoops round the truss, two box girders from the collar toward the seam with diagonal braces back
 * to it, a heavy face plate with four shear-pin sockets (or pins), six bolt heads, the latch (a hooked body and its claw on the hook half, a wedge keeper on the other) and an umbilical tower with a connector panel and a hose.
 */
export function latchHalf(y: number, wall: number, seam: number, hooks: boolean): Piece[] {
  const out: Piece[] = [hoop("hull-grey-dark", wall + 0.3, y - 1.6, 0.45, 40, 8), hoop("hull-grey-dark", wall + 0.3, y + 1.6, 0.45, 40, 8), hoop("hull-orange", wall + 0.55, y, 0.3, 40, 6)];
  const face = seam + 0.35;
  for (const z of [-3.4, 3.4]) {
    out.push(beam("hull-grey", [-wall - 0.2, y, z], [face + 0.6, y, z], 1.5, 2.0), beam("hull-grey-dark", [-wall - 0.2, y + 1.05, z], [face + 0.6, y + 1.05, z], 0.8, 2.1));
    out.push(...ibeam("hull-grey", [-wall - 0.2, y - 1.6, z * 0.7], [face + 2.2, y, z], 0.9, 0.7, [0, 0, 1]), ...ibeam("hull-grey", [-wall - 0.2, y + 1.6, z * 0.7], [face + 2.2, y, z], 0.9, 0.7, [0, 0, 1]));
  }
  out.push(box("hull-grey-dark", [face - 0.1, y - 4, 0], 0.8, 8.6, 8, 0, { only: "mesh", plain: true }));
  for (const [dy, dz] of [[-2.8, -3], [-2.8, 3], [2.8, -3], [2.8, 3]] as const) {
    if (hooks) out.push(rod("steel", [face - 0.4, y + dy, dz], [seam - 1.1, y + dy, dz], 0.32, 12, { only: "mesh" }));
    else out.push(rod("hull-grey-dark", [face - 0.4, y + dy, dz], [seam + 0.1, y + dy, dz], 0.55, 12, { only: "mesh" }), rod("black", [seam + 0.1, y + dy, dz], [seam + 0.12, y + dy, dz], 0.34, 12, { only: "mesh" }));
  }
  for (let k = 0; k < 6; k++) out.push(rod("hull-grey", [face + 0.3, y - 3.6 + (k % 3) * 3.6, -3.7 + Math.floor(k / 3) * 7.4], [face + 0.45, y - 3.6 + (k % 3) * 3.6, -3.7 + Math.floor(k / 3) * 7.4], 0.2, 6, { only: "mesh" }));
  if (hooks) out.push(box("hull-grey-dark", [face - 0.6, y - 0.8, 0], 2.8, 2.6, 2.4, 0, { only: "mesh", plain: true }), box("hull-yellow", [seam - 0.5, y - 0.8, 0], 1.6, 1.3, 1.3, 0, { only: "mesh", plain: true }), box("hull-grey", [seam - 0.4, y - 0.1, 0.9], 1.4, 0.5, 0.5, 0, { only: "mesh", plain: true }), box("hull-grey", [seam - 0.4, y - 0.1, -0.9], 1.4, 0.5, 0.5, 0, { only: "mesh", plain: true }));
  else out.push(box("hull-grey-dark", [face - 0.6, y - 0.8, 0], 2.8, 2.6, 2.4, 0, { only: "mesh", plain: true }), ...[0.9, -0.9].map((dz) => box("hull-yellow", [seam + 0.6, y - 0.8, dz], 1.2, 0.9, 0.9, 0, { only: "mesh", plain: true })), rod("hull-grey", [seam + 0.2, y - 0.7, -1.2], [seam + 0.2, y - 0.7, 1.2], 0.18, 8, { only: "mesh" }));
  out.push(box("hull-grey-dark", [face - 0.3, y + 2.2, 5.6], 1.8, 1.8, 4.2, 0, { only: "mesh", plain: true }), box("black", [face + 0.7, y + 2.4, 5.6], 0.2, 1.4, 1.4, 0, { only: "mesh", plain: true }), ...pipeRun("pipe-steel", [[face - 0.3, y + 4.6, 5.6], [face - 0.3, y + 5.8, 4.4], [-wall * 0.7, y + 5.6, 3]], 0.14), ...lamps([{ at: [face - 0.3, y + 6.5, 5.6], colour: "strobe", size: 0.14 }, { at: [face + 0.2, y + 0.4, -4.6], colour: hooks ? "blue" : "amber", size: 0.16 }]));
  return out;
}

/** The long ship's bow, 31 m, ending in the docking snout: an armoured prow faired out of stacked profiles in white, a lit window band at the bridge with a varied row, attitude-thruster quads, star trackers, a phased panel, navigation lights, and at the front an L collar with its probe, ready for the station's housing. Designed, not a kit stack. */
export function bowLong(y0: number): Piece[] {
  const prow: [number, number][] = [[7.0, y0], [7.4, y0 + 4], [7.2, y0 + 9], [6.9, y0 + 15], [6.6, y0 + 21], [6.4, y0 + 27], [6.5, y0 + 30]];
  const out: Piece[] = [lathe("hull-white", prow, [0, 0], { body: true, outline: true, only: undefined, segs: 48 }), lathe("hull-grey-dark", [[7.1, y0 + 1], [7.5, y0 + 2.2], [7.4, y0 + 3.4]]), lathe("hull-orange", [[7.3, y0 + 8.4], [7.25, y0 + 8.9]]), lathe("window", [[6.95, y0 + 12.6], [6.9, y0 + 14.4]])];
  out.push(...[3.2, 8.6, 15.6, 22.6].map((d) => hoop("hull-grey-dark", prow.find((p) => p[1] >= y0 + d)![0] + 0.05, y0 + d, 0.18, 48, 6)));
  for (let i = 0; i < 36; i++) {
    const a = (360 * i) / 36;
    const roll = Math.sin(i * 12.9898) * 43758.5453;
    const f = roll - Math.floor(roll);
    out.push(box(f < 0.6 ? (f < 0.15 ? "lamp-blue" : "lamp-amber") : "window", [6.96 * Math.sin(deg(a)), y0 + 12.9, 6.96 * Math.cos(deg(a))], 1.0, 0.08, 1.3, a, { only: "mesh", plain: true }));
  }
  out.push(...place(collar("L", 0, 1), { at: [0, y0 + 30.4, 0] }), rod("steel", [0, y0 + 30.6, 0], [0, y0 + 33.2, 0], 0.32, 10, { only: "mesh" }), ...horn("hull-grey", [0, y0 + 33.2, 0], [0, y0 + 34.6, 0], [0.9, 0.5], 12), ...lamps(Array.from({ length: 8 }, (_, i) => ({ at: [5.6 * Math.sin((Math.PI / 4) * i), y0 + 30.9, 5.6 * Math.cos((Math.PI / 4) * i)] as Vec3, colour: "blue" as const, size: 0.12 }))));
  for (let k = 0; k < 4; k++) {
    const a = 45 + 90 * k;
    const c: Vec3 = [7.1 * Math.sin(deg(a)), y0 + 19, 7.1 * Math.cos(deg(a))];
    out.push(box("hull-grey-dark", c, 1.4, 1.4, 1.6, a, { only: "mesh", plain: true }), ...[[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]].flatMap(([dx, dy]) => horn("hull-grey", [c[0] + dx, c[1] + dy + 0.8, c[2]], [c[0] + dx * 1.4, c[1] + dy * 1.4 + 1.2, c[2]], [0.12, 0.2], 8)));
  }
  out.push(...antenna("phased", [0, y0 + 24, 6.7], [0, 0.3, 1], 3.2, "bowL"), ...navLight("port", 6.8, -90, y0 + 18), ...navLight("starboard", 6.8, 90, y0 + 18), ...antenna("whip", [2.2, y0 + 22, 6.2], [0.5, 1, 0.3], 5, "bowLw"));
  for (const a of [60, 180, 300]) out.push(box("hull-grey-dark", [6.3 * Math.sin(deg(a)), y0 + 24.5, 6.3 * Math.cos(deg(a))], 0.5, 0.5, 0.9, a, { only: "mesh", plain: true }), rod("black", [6.3 * Math.sin(deg(a)), y0 + 25, 6.3 * Math.cos(deg(a))], [6.3 * Math.sin(deg(a)), y0 + 25.05, 6.3 * Math.cos(deg(a))], 0.3, 10, { only: "mesh" }));
  return out;
}

/** The runner's bow, 30 m: a rounded bridge with a glazed Cupola-style canopy facing forward, a sensor chin under it, two folded arms with grapples, the docking snout with its L collar and probe, and the lights; its own character, the other way round from the long ship's. */
export function bowRunner(y0: number): Piece[] {
  const hull: [number, number][] = [[7.0, y0], [7.6, y0 + 3], [7.8, y0 + 8], [7.4, y0 + 14], [7.0, y0 + 19], [6.7, y0 + 24], [6.6, y0 + 28]];
  const out: Piece[] = [lathe("hull-white", hull, [0, 0], { body: true, outline: true, only: undefined, segs: 48 }), lathe("hull-blue", [[7.65, y0 + 3.6], [7.82, y0 + 6.2], [7.82, y0 + 9.6], [7.5, y0 + 11.6]]), lathe("hull-grey-dark", [[7.0, y0], [7.9, y0 + 0.6], [7.9, y0 + 1.2], [7.1, y0 + 1.8]])];
  // the canopy: a faceted glazed bubble over the bridge on the +Z side
  const c: Vec3 = [0, y0 + 15, 5.4];
  const ring: Vec3[] = Array.from({ length: 8 }, (_, i) => [c[0] + 3.2 * Math.cos((TAU * i) / 8), c[1] + 3.2 * Math.sin((TAU * i) / 8), c[2]] as Vec3);
  const crown: Vec3 = [c[0], c[1], c[2] + 2.6];
  for (let i = 0; i < 8; i++) out.push(tri("glass-clear", ring[i], ring[(i + 1) % 8], crown), rod("hull-grey-dark", ring[i], crown, 0.1, 6, { only: "mesh" }));
  out.push(...ring.map((p, i) => rod("hull-grey-dark", p, ring[(i + 1) % 8], 0.14, 6, { only: "mesh" })));
  for (let i = 0; i < 30; i++) {
    const a = (360 * i) / 30;
    const roll = Math.sin(i * 7.77) * 43758.5453;
    const f = roll - Math.floor(roll);
    out.push(box(f < 0.55 ? (f < 0.2 ? "lamp-blue" : "lamp-amber") : "window", [7.84 * Math.sin(deg(a)), y0 + 7.4, 7.84 * Math.cos(deg(a))], 0.9, 0.08, 1.1, a, { only: "mesh", plain: true }));
  }
  out.push(...horn("hull-grey-dark", [0, y0 + 9, -7.4], [0, y0 + 7, -8.6], [1.8, 1.4], 14), rod("glass-clear", [0, y0 + 7, -8.6], [0, y0 + 6.9, -8.7], 1.1, 14, { only: "mesh" }));
  for (const s of [-1, 1]) {
    out.push(...roundStrut("hull-grey", [s * 6.5, y0 + 10, 3], [s * 9, y0 + 16, 3.5], 0.28), ...roundStrut("hull-grey", [s * 9, y0 + 16, 3.5], [s * 8.2, y0 + 21, 4.4], 0.22), box("hull-grey-dark", [s * 8.2, y0 + 21, 4.4], 1, 1, 1.4, 0, { only: "mesh", plain: true }), ...[-0.35, 0.35].map((d) => rod("hull-yellow", [s * 8.2 + d, y0 + 21.7, 4.4], [s * 8.2 + d * 1.6, y0 + 23, 4.4], 0.08, 6, { only: "mesh" })));
  }
  out.push(...place(collar("L", 0, 1), { at: [0, y0 + 30.4, 0] }), rod("steel", [0, y0 + 30.6, 0], [0, y0 + 33.2, 0], 0.32, 10, { only: "mesh" }), ...horn("hull-grey", [0, y0 + 33.2, 0], [0, y0 + 34.6, 0], [0.9, 0.5], 12), ...antenna("dish", [-4.2, y0 + 20, -4.5], [-0.5, 0.4, -1], 3.4, "bowR"), ...navLight("port", 7.6, -90, y0 + 11), ...navLight("starboard", 7.6, 90, y0 + 11), ...lamps(Array.from({ length: 8 }, (_, i) => ({ at: [5.6 * Math.sin((Math.PI / 4) * i), y0 + 30.9, 5.6 * Math.cos((Math.PI / 4) * i)] as Vec3, colour: "blue" as const, size: 0.12 }))));
  return out;
}
