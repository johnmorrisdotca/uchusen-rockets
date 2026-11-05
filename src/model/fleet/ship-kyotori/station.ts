// The Kyotori station: a destination. A hub with docking ports, airlocks and lift machinery; four arms of lifts and corridors to four quarters of eight decks each (quarters.ts); a slim rim; a docking stub at every quarter for large ships,
// so people dock at a quadrant and walk in; ISS-style solar wings on diagonal masts that stow and deploy (tagged with a Move for the viewer's motion); and the housing at the stern into which the two shafts dock, with collars, latches,
// umbilicals and lights. Concepts for John's V2. Pure: no three.js and no DOM.
import { box, collar, hoop, ibeam, lamps, moving, place, quad, rod, ringOf, stamp, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { figuredMirror } from "./hardware.ts";
import { mod, truss } from "./parts.ts";
import { type QuarterKind, quarter, TOWER, TOWER_H } from "./quarters.ts";

const deg = (a: number): number => (a * Math.PI) / 180;
const lathe = (material: MaterialName, profile: [number, number][], at: [number, number] = [0, 0], extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, segs: 48, only: "mesh", at, profile, ...extra });

export const STATION = { y: 362, hubR: 19, hubHalf: 15, base: 62, rim: 60, kinds: ["control", "lab", "observatory", "engineering"] as readonly QuarterKind[] } as const;

/** The hub: a drum with banded skin, rows of windows lit one by one, four airlocks and four lift houses between and on the arms, four small-craft ports on the forward shoulder, and the stem's collar ahead. */
export function hub(seed = "hub"): Piece[] {
  const { y, hubR: R, hubHalf: H } = STATION;
  const out: Piece[] = [lathe("hull-white", [[R, y - H], [R, y + H]], [0, 0], { body: true, outline: true, only: undefined }), lathe("hull-white", [[R, y + H], [R * 0.74, y + H + 4], [R * 0.4, y + H + 6.5]], [0, 0], { body: true, outline: true, only: undefined }), lathe("hull-white", [[R, y - H], [R * 0.9, y - H - 1.4]]), lathe("hull-grey-dark", [[R * 0.4, y + H + 6.5], [7.4, y + H + 6.5], [7.4, y + H + 8.3]])];
  for (const dy of [-11, -3, 5, 11]) out.push(hoop("hull-orange", R + 0.12, y + dy, 0.28, 48, 6), hoop("hull-grey-dark", R + 0.1, y + dy + 0.7, 0.14, 48, 6));
  // windows: two rows of cells round the drum, lit one by one
  for (let row = 0; row < 2; row++) for (let i = 0; i < 48; i++) {
    const a = (360 * i) / 48 + (row ? 3.75 : 0);
    const roll = Math.sin(i * 12.9898 + row * 78.233) * 43758.5453;
    const f = roll - Math.floor(roll);
    out.push(box(f < 0.55 ? (f < 0.12 ? "lamp-blue" : "lamp-amber") : "window", [(R + 0.1) * Math.sin(deg(a)), y - 6 + row * 8, (R + 0.1) * Math.cos(deg(a))], 1.5, 0.08, 1.1, a - 90 + 90, { only: "mesh", plain: true }));
  }
  // four airlocks between the arms: a box house with a round hatch on its face, a handrail and a lamp
  for (let k = 0; k < 4; k++) {
    const a = 45 + 90 * k;
    const dir: Vec3 = [Math.sin(deg(a)), 0, Math.cos(deg(a))];
    const c: Vec3 = [(R + 2.2) * dir[0], y + 1, (R + 2.2) * dir[2]];
    out.push(box("hull-white-worn", c, 5.4, 5.4, 6, a + 90, { only: "mesh", plain: true }), rod("hull-grey-dark", [c[0] + dir[0] * 2.7, y + 4, c[2] + dir[2] * 2.7], [c[0] + dir[0] * 3, y + 4, c[2] + dir[2] * 3], 1.5, 20, { only: "mesh" }), rod("hull-grey", [c[0] + dir[0] * 3, y + 4, c[2] + dir[2] * 3], [c[0] + dir[0] * 3.1, y + 4, c[2] + dir[2] * 3.1], 1.0, 16, { only: "mesh" }), box("hazard", [c[0] + dir[0] * 2.72, y + 0.1, c[2] + dir[2] * 2.72], 5.2, 0.05, 0.3, a + 90, { only: "mesh", plain: true }), ...lamps([{ at: [c[0] + dir[0] * 2.8, y + 7, c[2] + dir[2] * 2.8], colour: "amber", size: 0.2 }]));
    // a small-craft port on the forward shoulder above it
    out.push(...place(collar("S", 0, 1), { at: [(R * 0.62) * dir[0], y + H + 3.9, (R * 0.62) * dir[2]] }), ...lamps(Array.from({ length: 4 }, (_, i) => ({ at: [(R * 0.62) * dir[0] + 2 * Math.cos((Math.PI / 2) * i), y + H + 4.2, (R * 0.62) * dir[2] + 2 * Math.sin((Math.PI / 2) * i)] as Vec3, colour: "blue" as const, size: 0.14 }))));
  }
  // the lift houses on the arms' roots: a machine room with a motor, a cable drum, a brake disc and two sheaves, the lift tube leaving it
  for (let k = 0; k < 4; k++) {
    const a = 90 * k;
    const dir: Vec3 = [Math.sin(deg(a)), 0, Math.cos(deg(a))];
    const tan: Vec3 = [dir[2], 0, -dir[0]];
    const c: Vec3 = [(R + 3.2) * dir[0], y + 9.5, (R + 3.2) * dir[2]];
    out.push(box("hull-grey-dark", c, 6.4, 6.4, 5, a + 90, { only: "mesh", plain: true }));
    const at = (r: number, t: number, h: number): Vec3 => [c[0] + dir[0] * r + tan[0] * t, y + 12 + h, c[2] + dir[2] * r + tan[2] * t];
    out.push(rod("hull-grey", at(-2, -2, 0), at(-2, 2, 0), 1.0, 20, { only: "mesh" }), rod("steel", at(-2, -1.4, 0), at(-2, -1.45, 0), 1.6, 20, { only: "mesh" }), rod("hull-yellow", at(1, -2.6, 0.2), at(1, 2.6, 0.2), 0.7, 14, { only: "mesh" }), rod("steel", at(2.3, -1.2, 0.1), at(2.3, 1.2, 0.1), 0.9, 16, { only: "mesh" }), box("hull-blue", at(0, 0, -1.2), 1.8, 1.8, 1.6, a + 90, { only: "mesh", plain: true }));
    out.push(rod("glass-clear", [(R + 3) * dir[0], y + 6, (R + 3) * dir[2]], [(STATION.base - TOWER_H - 1) * dir[0], y + 6, (STATION.base - TOWER_H - 1) * dir[2]], 1.5, 14, { only: "mesh" }), rod("hull-grey", [(R + 3) * dir[0], y + 6, (R + 3) * dir[2]], [(STATION.base - TOWER_H - 1) * dir[0], y + 6, (STATION.base - TOWER_H - 1) * dir[2]], 0.18, 6, { only: "mesh" }));
    for (const f of [0.25, 0.62]) {
      const r = R + 3 + ((STATION.base - TOWER_H - 1) - (R + 3)) * f;
      out.push(box("hull-white", [r * dir[0], y + 5.1, r * dir[2]], 1.6, 1.6, 1.8, a + 90, { only: "mesh", plain: true }), box("window", [r * dir[0] + dir[0] * 0.01, y + 5.5, r * dir[2]], 1.65, 1.65, 0.9, a + 90, { only: "mesh", plain: true }));
    }
  }
  void seed;
  return out;
}

/** The four arms: a corridor tube from the hub to each quarter's roof, with a row of lit windows and ribs. */
export function arms(): Piece[] {
  const { y, hubR } = STATION;
  const r0 = hubR + 5;
  const r1 = STATION.base - TOWER_H - 0.5;
  const out: Piece[] = [];
  for (let k = 0; k < 4; k++) {
    const a = 90 * k;
    const dir: Vec3 = [Math.sin(deg(a)), 0, Math.cos(deg(a))];
    const tan: Vec3 = [dir[2], 0, -dir[0]];
    out.push(rod("hull-white", [r0 * dir[0], y, r0 * dir[2]], [r1 * dir[0], y, r1 * dir[2]], 4.4, 16, { only: "mesh" }), rod("hull-grey", [r0 * dir[0], y, r0 * dir[2]], [r1 * dir[0], y, r1 * dir[2]], 4.52, 8, { only: "mesh" }));
    for (const s of [-1, 1]) for (const h of [-1.8, 0.4, 2.2]) out.push(rod("window", [r0 * dir[0] + tan[0] * s * 4.5, y + h, r0 * dir[2] + tan[2] * s * 4.5], [r1 * dir[0] + tan[0] * s * 4.5, y + h, r1 * dir[2] + tan[2] * s * 4.5], 0.3, 6, { only: "mesh" }));
    for (let r = r0 + 3; r < r1; r += 5) out.push(rod("hull-grey-dark", [r * dir[0], y - 4.6, r * dir[2]], [r * dir[0], y + 4.6, r * dir[2]], 0.28, 8, { only: "mesh" }));
  }
  return out;
}

/** The slim rim: a thin tube through the quarters near their bases, with a lit seam every 5 degrees. */
export function rim(): Piece[] {
  const out: Piece[] = [hoop("hull-grey", STATION.rim, STATION.y, 0.7, 180, 10), ...stamp([hoop("hull-grey-dark", STATION.rim, 0, 1.0, 40, 8, { arc: () => [-0.03, 0.03] })], Array.from({ length: 24 }, (_, i): Pose => ({ at: [0, STATION.y, 0], yaw: 15 * i })))];
  return out;
}

/** The dock at one quarter: a stub leaving the tower's flank along the ring's axis, a heavy H collar at its end facing forward with four guide petals, a blue ring of approach lamps, two floodlights and a hatch into the tower at its root. */
export function stub(a: number): Piece[] {
  const rr = STATION.base - TOWER_H * 0.55;
  const x = rr * Math.sin(deg(a));
  const z = rr * Math.cos(deg(a));
  const y0 = STATION.y + TOWER.r - 1;
  const y1 = y0 + 26;
  const out: Piece[] = [lathe("hull-white", [[4.4, y0], [4.4, y1]], [x, z], { body: true, outline: true, only: undefined }), lathe("hull-grey-dark", [[4.9, y0 + 1], [4.9, y0 + 3]], [x, z]), lathe("hull-grey-dark", [[4.9, y1 - 6], [4.9, y1 - 4]], [x, z]), hoop("hull-orange", 4.5, y0 + 9, 0.25, 32, 6, { at: [x, z] }), hoop("hull-orange", 4.5, y0 + 17, 0.25, 32, 6, { at: [x, z] })];
  out.push(...place(collar("H", 0, 1), { at: [x, y1, z] }));
  for (let k = 0; k < 4; k++) {
    const t = deg(45 + 90 * k);
    const c: Vec3 = [x + 6.2 * Math.sin(t), y1 + 0.6, z + 6.2 * Math.cos(t)];
    const o: Vec3 = [x + 9.2 * Math.sin(t), y1 + 4.2, z + 9.2 * Math.cos(t)];
    out.push(quad("hull-grey", [c[0] + 1.6 * Math.cos(t), c[1], c[2] - 1.6 * Math.sin(t)], [c[0] - 1.6 * Math.cos(t), c[1], c[2] + 1.6 * Math.sin(t)], [o[0] - 2.2 * Math.cos(t), o[1], o[2] + 2.2 * Math.sin(t)], [o[0] + 2.2 * Math.cos(t), o[1], o[2] - 2.2 * Math.sin(t)], 0.2, { only: "mesh" }), ...lamps([{ at: [o[0], o[1] + 0.2, o[2]], colour: "blue", size: 0.22 }]));
    out.push(...lamps(Array.from({ length: 2 }, (_, i) => ({ at: [x + 5.6 * Math.sin(t + (i - 0.5) * 0.4), y1 + 0.5, z + 5.6 * Math.cos(t + (i - 0.5) * 0.4)] as Vec3, colour: "amber" as const, size: 0.15 }))));
  }
  out.push(box("flood", [x + 4.6, y1 - 3.2, z], 0.8, 0.8, 0.7, 0, { only: "mesh", plain: true }), box("flood", [x - 4.6, y1 - 3.2, z], 0.8, 0.8, 0.7, 0, { only: "mesh", plain: true }));
  // the hatch into the tower: a short walkway tube across to its flank
  out.push(rod("hull-grey", [x, y0 - 0.3, z], [x, STATION.y + TOWER.r * 0.3, z], 2.2, 14, { only: "mesh" }));
  return out;
}

/**
 * The solar wings, four on diagonal masts at the hub's forward shoulder, in the ISS manner: a rotary joint at the root, a long mast, and two blankets of cells either side of it. Stowed, each mast carries two canisters of folded blanket with their
 * hinge brackets; deployed, the blankets stand out flat 9 m wide and 44 m long in four panels with battens. The blankets are one group, `wing-turn`, about the mast, for the viewer's motion.
 */
export function wings(state: "stowed" | "deployed"): Piece[] {
  const out: Piece[] = [];
  const y0 = STATION.y + 8;
  const L = 44;
  for (let k = 0; k < 4; k++) {
    const a = 45 + 90 * k;
    const x = 26 * Math.sin(deg(a));
    const z = 26 * Math.cos(deg(a));
    out.push(lathe("hull-grey-dark", [[3.2, y0 - 1.5], [3.2, y0 + 0.5]], [x, z]), hoop("hull-grey", 3.2, y0 - 0.5, 0.35, 32, 6, { at: [x, z] }), box("hull-grey-dark", [x, y0 - 1.5, z], 4.4, 4.4, 1.3, a, { only: "mesh", plain: true }));
    out.push(...ibeam("hull-grey", [x, y0 + 0.5, z], [x, y0 + L, z], 1.2, 0.9, [Math.cos(deg(a)), 0, -Math.sin(deg(a))]));
    // the arm from the hub out to the mast: a truss of two beams
    out.push(...ibeam("hull-grey", [10 * Math.sin(deg(a)), y0 - 1, 10 * Math.cos(deg(a))], [x, y0 - 1, z], 1.0, 0.8, [0, 1, 0]));
    const t: Vec3 = [Math.cos(deg(a)), 0, -Math.sin(deg(a))];
    const turning: Piece[] = [];
    for (const s of [-1, 1]) {
      const c: Vec3 = [x + t[0] * s * 5.6, 0, z + t[2] * s * 5.6];
      if (state === "deployed") {
        for (let p = 0; p < 4; p++) {
          const yp = y0 + 3 + p * ((L - 4) / 4);
          turning.push(box("solar", [c[0], yp, c[2]], 9, 0.1, (L - 4) / 4 - 0.5, a + 90, { only: "mesh", plain: true }), box("hull-grey", [c[0], yp - 0.1, c[2]], 9.2, 0.06, 0.25, a + 90, { only: "mesh", plain: true }));
        }
        for (const e of [-1, 1]) turning.push(rod("hull-grey", [c[0] + t[0] * e * 4.4, y0 + 3, c[2] + t[2] * e * 4.4], [c[0] + t[0] * e * 4.4, y0 + L - 1.5, c[2] + t[2] * e * 4.4], 0.14, 6, { only: "mesh" }));
        turning.push(box("hull-grey-dark", [x + t[0] * s * 1.6, y0 + 2, z + t[2] * s * 1.6], 2.6, 0.5, 0.5, a + 90, { only: "mesh", plain: true }), rod("hull-grey", [x + t[0] * s * 0.8, y0 + 2.2, z + t[2] * s * 0.8], [c[0] - t[0] * s * 4.4, y0 + 2.2, c[2] - t[2] * s * 4.4], 0.2, 8, { only: "mesh" }));
      } else {
        turning.push(box("gold", [x + t[0] * s * 1.6, y0 + 9, z + t[2] * s * 1.6], 2.6, 3.4, 12, a + 90, { only: "mesh", plain: true }), box("hull-grey-dark", [x + t[0] * s * 1.6, y0 + 9, z + t[2] * s * 1.6], 2.8, 0.3, 12.2, a + 90, { only: "mesh", plain: true }), rod("hull-grey", [x + t[0] * s * 0.8, y0 + 3.2, z + t[2] * s * 0.8], [x + t[0] * s * 1.6, y0 + 3.2, z + t[2] * s * 1.6], 0.2, 8, { only: "mesh" }));
        for (const dy of [3.6, 14.4]) turning.push(box("hull-grey-dark", [x + t[0] * s * 1.6, y0 + dy, z + t[2] * s * 1.6], 3, 3.6, 0.5, a + 90, { only: "mesh", plain: true }));
      }
    }
    out.push(...moving(turning, { name: "wing-turn", pivot: [x, y0, z], axis: [0, 1, 0] }));
    out.push(...lamps([{ at: [x, y0 + L + 0.3, z], colour: "red", size: 0.25 }]));
  }
  return out;
}

/** The housing at the stern: a block between the hub and the two docking tunnels, each tunnel a barrel with an L collar facing aft, twelve capture latches and four umbilical plates round it, four guide petals, a ring of blue approach lamps, floodlights and an alignment target cross; with the diagonals that carry the load to the hub. */
export function housing(yAft: number, shaftX: number): Piece[] {
  const yTop = STATION.y - STATION.hubHalf - 1.4;
  const len = yTop - yAft;
  const out: Piece[] = [box("hull-grey-dark", [0, yTop - 4, 0], shaftX * 2 + 14, 22, 5, 0, { only: "mesh", plain: true }), box("hull-white-worn", [0, yTop - 4.1, 12.1], shaftX * 2 + 14, 0.3, 5.1, 0, { only: "mesh", plain: true }), box("hazard", [0, yTop - 4.1, 12.3], shaftX * 2 + 14, 0.08, 0.5, 0, { only: "mesh", plain: true })];
  for (const x of [-shaftX - 5, -shaftX * 0.5, 0, shaftX * 0.5, shaftX + 5]) out.push(...ibeam("hull-grey", [x, yTop - 4, 11], [x * 0.6, yTop + 0.2, 8], 1.4, 0.8, [0, 0, 1]), ...ibeam("hull-grey", [x, yTop - 4, -11], [x * 0.6, yTop + 0.2, -8], 1.4, 0.8, [0, 0, 1]));
  for (const s of [-1, 1]) {
    const x = s * shaftX;
    out.push(lathe("hull-white", [[8.9, yAft + 2], [8.9, yTop - 4]], [x, 0], { body: true, outline: true, only: undefined }), lathe("hull-grey-dark", [[7.2, yAft], [8.9, yAft + 2]], [x, 0]), hoop("hull-grey", 8.9, yAft + len * 0.45, 0.4, 36, 6, { at: [x, 0] }), hoop("hull-orange", 8.95, yAft + len * 0.7, 0.3, 36, 6, { at: [x, 0] }));
    out.push(...place(collar("L", 0, -1), { at: [x, yAft + 0.4, 0] }));
    // capture latches round the ring: a body, a hook and a pin
    out.push(...stamp([box("hull-grey-dark", [0, yAft + 0.8, 7.9], 1.3, 0.9, 2.2, 0, { only: "mesh", plain: true }), box("hull-yellow", [0, yAft + 0.3, 8.1], 0.9, 0.5, 0.9, 0, { only: "mesh", plain: true }), rod("steel", [0, yAft + 0.1, 7.2], [0, yAft + 0.1, 8.6], 0.12, 8, { only: "mesh" })], ringOf(12, 0, 0).map((p): Pose => ({ at: [x + p.at[0], 0, p.at[2]], yaw: p.yaw }))));
    // four umbilical plates between the latches
    out.push(...stamp([box("hull-grey-dark", [0, yAft + 1.3, 8.4], 1.5, 0.3, 1.5, 0, { only: "mesh", plain: true }), ...[-0.4, 0, 0.4].map((dx) => rod("pipe-steel", [dx, yAft + 1.2, 8.55], [dx, yAft + 0.5, 8.55], 0.08, 6, { only: "mesh" })), box("hazard", [0, yAft + 1.4, 8.55], 1.4, 0.02, 0.1, 0, { only: "mesh", plain: true })], Array.from({ length: 4 }, (_, i): Pose => ({ at: [x + 0, 0, 0], yaw: 45 + 90 * i }))));
    for (let k = 0; k < 4; k++) {
      const t = deg(45 + 90 * k + 45);
      const c: Vec3 = [x + 8.6 * Math.sin(t), yAft + 0.5, 8.6 * Math.cos(t)];
      const o: Vec3 = [x + 11.6 * Math.sin(t), yAft - 3.4, 11.6 * Math.cos(t)];
      out.push(quad("hull-grey", [c[0] + 1.8 * Math.cos(t), c[1], c[2] - 1.8 * Math.sin(t)], [c[0] - 1.8 * Math.cos(t), c[1], c[2] + 1.8 * Math.sin(t)], [o[0] - 2.4 * Math.cos(t), o[1], o[2] + 2.4 * Math.sin(t)], [o[0] + 2.4 * Math.cos(t), o[1], o[2] - 2.4 * Math.sin(t)], 0.2, { only: "mesh" }), ...lamps([{ at: [o[0], o[1] - 0.2, o[2]], colour: "blue", size: 0.26 }]));
    }
    out.push(...lamps(Array.from({ length: 8 }, (_, i) => ({ at: [x + 6.4 * Math.sin((Math.PI / 4) * i), yAft - 0.2, 6.4 * Math.cos((Math.PI / 4) * i)] as Vec3, colour: "blue" as const, size: 0.16 }))));
    out.push(box("hull-white", [x, yAft + 2.2, 0], 5, 0.3, 0.3, 0, { only: "mesh", plain: true }), box("hull-white", [x, yAft + 2.2, 0], 0.3, 0.3, 5, 0, { only: "mesh", plain: true }));
    out.push(box("flood", [x + 7.4, yAft + 3, 7.6], 0.8, 0.7, 0.7, 0, { only: "mesh", plain: true }), box("flood", [x - 7.4, yAft + 3, -7.6], 0.8, 0.7, 0.7, 0, { only: "mesh", plain: true }));
  }
  return out;
}

/** The whole station: hub, arms, rim, the four quarters (the one at `cutQuarter`, if any, cut open and furnished), their docking stubs, the wings in a state, and the stern housing. */
export function station(o: { wings?: "stowed" | "deployed"; cutQuarter?: number; shaftX?: number; furnish?: boolean } = {}): Piece[] {
  const out: Piece[] = [...hub(), ...arms(), ...rim(), ...wings(o.wings ?? "deployed"), ...housing(335, o.shaftX ?? 13.5), ...mod("adapter-l-m", 386), ...mod("deck-nav-m", 389.3), ...truss(399.3, 24), ...figuredMirror(427)];
  STATION.kinds.forEach((kind, k) => {
    const angle = 90 * k;
    out.push(...quarter(kind, STATION.y, STATION.base, angle, { cut: o.cutQuarter === k, cutAt: 270, seed: kind, furnish: o.furnish !== false }), ...stub(angle));
  });
  return out;
}
