// The four quarters of the Kyotori station: each a radial tower of many decks (eight floors of rooms furnished from the kit: cabins, mess and galley, gym, medical bay, lounge, school, garden), a faceted shell with a row of windows on every
// floor that are lit one by one, and an end of its own (a bridge with a Cupola, a laboratory under radiator fins, an observatory with two telescopes, an engineering block with a reactor can and tanks). Built standing up (floor at y 0,
// the roof at the top) from plates only, then turned to lie along the arm. A cutaway leaves a sector of the shell off. Concepts for John's V2. Pure: no three.js and no DOM.
import { antenna, box, horn, moving, place, prism, quad, rod, room, rng, type MaterialName, type Piece, type Vec3 } from "./adapter.ts";
import { moved } from "../../moves.ts";

const deg = (a: number): number => (a * Math.PI) / 180;
export type QuarterKind = "control" | "lab" | "observatory" | "engineering";

export const TOWER = { r: 9.5, floors: 8, fh: 3.1, sides: 16 } as const;
export const TOWER_H = TOWER.floors * TOWER.fh;

type Room = Parameters<typeof room>[0];
/** The rooms of each floor, bottom (the rim) to top (the hub): four to a floor, two each side of a corridor. */
const PLANS: Record<QuarterKind, Room[][]> = {
  control: [["mess", "mess", "lounge", "recreation"], ["cabin", "cabin", "cabin", "cabin"], ["cabin", "cabin", "cabin", "cabin"], ["medical", "cabin", "gym", "cabin"], ["lounge", "school", "lounge", "recreation"], ["cabin", "cabin", "cabin", "cabin"], ["recreation", "lounge", "lounge", "recreation"], ["lounge", "lounge", "lounge", "lounge"]],
  lab: [["garden", "garden", "garden", "garden"], ["recreation", "lounge", "garden", "shelter"], ["cabin", "cabin", "cabin", "cabin"], ["cabin", "cabin", "cabin", "cabin"], ["medical", "shelter", "gym", "cabin"], ["school", "school", "recreation", "lounge"], ["cabin", "cabin", "cabin", "cabin"], ["lounge", "garden", "garden", "lounge"]],
  observatory: [["lounge", "lounge", "lounge", "lounge"], ["cabin", "cabin", "cabin", "cabin"], ["mess", "recreation", "mess", "lounge"], ["cabin", "cabin", "cabin", "cabin"], ["gym", "gym", "medical", "shelter"], ["cabin", "cabin", "cabin", "cabin"], ["school", "recreation", "lounge", "lounge"], ["lounge", "lounge", "recreation", "recreation"]],
  engineering: [["shelter", "shelter", "medical", "gym"], ["cabin", "cabin", "cabin", "cabin"], ["mess", "mess", "recreation", "lounge"], ["cabin", "cabin", "cabin", "cabin"], ["cabin", "cabin", "cabin", "cabin"], ["garden", "garden", "recreation", "lounge"], ["school", "cabin", "cabin", "gym"], ["lounge", "recreation", "lounge", "recreation"]],
};

const SHAPE: Record<Room, [number, number]> = { cabin: [4.4, 3.4], mess: [6, 4.6], gym: [5.4, 4.2], garden: [5.8, 4.8], lounge: [5.4, 4.6], medical: [5.4, 4.4], shelter: [4.4, 4.4], recreation: [5.2, 4.6], school: [5.6, 5.0], plaza: [5, 5] };

/** A Cupola: six trapezoid windows on a low frustum, a round window on top, six shutters folded out. Standing on y at `at`. */
function cupola(at: Vec3, r: number): Piece[] {
  const R0 = r;
  const R1 = r * 0.48;
  const H = r * 0.75;
  const b = (k: number): Vec3 => [at[0] + R0 * Math.sin(deg(60 * k)), at[1], at[2] + R0 * Math.cos(deg(60 * k))];
  const t = (k: number): Vec3 => [at[0] + R1 * Math.sin(deg(60 * k)), at[1] + H, at[2] + R1 * Math.cos(deg(60 * k))];
  const out: Piece[] = [];
  for (let k = 0; k < 6; k++) {
    out.push(quad("glass-clear", b(k), b(k + 1), t(k + 1), t(k), 0.1, { only: "mesh" }), rod("hull-grey-dark", b(k), t(k), r * 0.05, 6, { only: "mesh" }), rod("hull-grey-dark", b(k), b(k + 1), r * 0.06, 6, { only: "mesh" }));
    const m: Vec3 = [(b(k)[0] + b(k + 1)[0]) / 2, at[1] + 0.05, (b(k)[2] + b(k + 1)[2]) / 2];
    const u: Vec3 = [(m[0] - at[0]) / R0, 0, (m[2] - at[2]) / R0];
    const tan: Vec3 = [u[2], 0, -u[0]];
    const P = (a: number, l: number): Vec3 => [m[0] + tan[0] * a + u[0] * l * 0.9, m[1] + l * 0.45, m[2] + tan[2] * a + u[2] * l * 0.9];
    out.push(quad("hull-white", P(-r * 0.55, 0), P(r * 0.55, 0), P(r * 0.4, r), P(-r * 0.4, r), 0.12, { only: "mesh" }));
  }
  out.push(box("glass-clear", [at[0], at[1] + H, at[2]], R1 * 1.6, R1 * 1.6, 0.1, 45));
  return out;
}

/** The shell of one tower between heights y0 and y1: a polygon of wall panels, each with a window cell lit or dark. `skip` leaves facets off. */
function shell(r: number, y0: number, y1: number, seed: string, lit: number, skip: (a: number) => boolean, bands: boolean): Piece[] {
  const out: Piece[] = [];
  const N = TOWER.sides;
  const w = 2 * r * Math.sin(Math.PI / N);
  const random = rng(seed);
  for (let i = 0; i < N; i++) {
    const a = (360 * i) / N;
    if (skip(a)) continue;
    const c: Vec3 = [r * Math.cos(deg(a)), 0, r * Math.sin(deg(a))];
    const yaw = a + 90;
    const nx = Math.cos(deg(a));
    const nz = Math.sin(deg(a));
    for (let f = Math.round(y0 / TOWER.fh); f < Math.round(y1 / TOWER.fh); f++) {
      const y = f * TOWER.fh;
      out.push(box("hull-white", [c[0], y, c[2]], w * 1.02, 0.32, TOWER.fh * 0.98, yaw, { only: "mesh", plain: true }));
      const roll = random();
      const glow: MaterialName = roll < lit ? (roll < lit * 0.25 ? "lamp-blue" : "lamp-amber") : "window";
      const ww = bands && f >= TOWER.floors - 2 ? w * 0.92 : w * 0.6;
      out.push(box(glow, [c[0] + nx * 0.2, y + 0.85, c[2] + nz * 0.2], ww, 0.06, 1.1, yaw, { only: "mesh", plain: true }), box("hull-grey-dark", [c[0] + nx * 0.19, y + 0.5, c[2] + nz * 0.19], ww + 0.18, 0.05, 0.1, yaw, { only: "mesh", plain: true }), box("hull-grey-dark", [c[0] + nx * 0.19, y + 2.05, c[2] + nz * 0.19], ww + 0.18, 0.05, 0.1, yaw, { only: "mesh", plain: true }));
    }
  }
  return out;
}

/** The end of each quarter that makes it its own: stood on the roof or round the side, in the tower's own frame. */
function features(kind: QuarterKind, seed: string): Piece[] {
  const R = TOWER.r;
  const top = TOWER_H;
  const out: Piece[] = [];
  if (kind === "control") {
    out.push(...cupola([0, top + 2.8, 0], 3.4), ...cupola([-4.6, top + 1.6, 3], 1.8), ...cupola([4.6, top + 1.6, -3], 1.8));
    out.push(...antenna("dish", [R * 0.7, top + 0.4, 0], [1, 0.8, 0], 4.6, `${seed}d`), ...antenna("phased", [0, top + 5, 0], [0, 1, 0], 4, `${seed}p`));
    for (const a of [20, 100, 200, 300]) out.push(box("flood", [R * 0.96 * Math.cos(deg(a)), top - 0.3, R * 0.96 * Math.sin(deg(a))], 0.7, 0.5, 0.5, 0, { only: "mesh", plain: true }));
  } else if (kind === "lab") {
    for (let k = 0; k < 4; k++) {
      const a = 40 + 90 * k;
      const c: Vec3 = [(R + 2.2) * Math.cos(deg(a)), 0, (R + 2.2) * Math.sin(deg(a))];
      out.push(box("radiator", [c[0], 5, c[2]], 0.18, 5.6, 14, a + 90, { only: "mesh", plain: true }), ...[0.5, 1.2, 2.0, 2.8, 3.6, 4.4, 5.0].map((x) => rod("copper", [c[0] + (x - 2.7) * Math.cos(deg(a + 90)), 5.2, c[2] + (x - 2.7) * Math.sin(deg(a + 90))], [c[0] + (x - 2.7) * Math.cos(deg(a + 90)), 18.8, c[2] + (x - 2.7) * Math.sin(deg(a + 90))], 0.06, 6, { only: "mesh" })), rod("hull-grey", [c[0] * 0.8, 12, c[2] * 0.8], [c[0], 12, c[2]], 0.18, 6, { only: "mesh" }));
    }
    out.push(...antenna("dish", [0, top + 0.4, 0], [0, 1, 0], 6, `${seed}d`), ...antenna("whip", [3, top, 3], [0, 1, 0], 7, `${seed}w`));
    out.push(...horn("hull-white", [-3, top, -3], [-3, top + 4.5, -3], [1.6, 1.55, 1.2], 12), ...horn("hull-white", [3, top, -3], [3, top + 3.5, -3], [1.2, 1.2, 1.0], 12));
  } else if (kind === "observatory") {
    for (const s of [-1, 1]) {
      const x = s * 4.2;
      out.push(box("hull-grey-dark", [x, top, 0], 3.4, 3.4, 0.9, 0, { only: "mesh", plain: true }), rod("hull-white", [x, top + 0.9, -3], [x, top + 0.9, 3], 1.55, 18, { only: "mesh" }), ...horn("hull-white-worn", [x, top + 0.9, 3], [x, top + 0.9, 7.5], [2.1, 2.1, 2.0, 1.9], 18), rod("black", [x, top + 0.9, 7.5], [x, top + 0.9, 7.55], 1.7, 18, { only: "mesh" }), rod("hull-grey-dark", [x - 1.6, top + 0.9, 0], [x - 1.6, top + 0.9, 3], 0.2, 6, { only: "mesh" }));
    }
    out.push(...horn("glass-clear", [0, top, 0], [0, top + 5, 0], [3.6, 3.3, 2.6, 1.6], 20), rod("hull-grey-dark", [0, top, 0], [0, top + 0.4, 0], 3.8, 20, { only: "mesh" }));
    out.push(...antenna("dish", [R * 0.8, top + 0.4, 0], [1, 0.5, 0], 3.6, `${seed}d`));
  } else {
    out.push(rod("hull-grey-dark", [0, top, 0], [0, top + 7, 0], 2.7, 18, { only: "mesh" }), rod("hull-white", [0, top + 7, 0], [0, top + 8, 0], 2.2, 18, { only: "mesh" }), ...[1, 2.4, 3.8, 5.2, 6.6].map((y) => rod("hull-grey", [0, top + y, 0], [0, top + y + 0.2, 0], 3.1, 18, { only: "mesh" })), ...horn("copper", [0, top + 8, 0], [0, top + 10, 0], [1.2, 0.9], 12));
    for (const a of [30, 150, 270]) out.push(...horn("hull-white", [6.4 * Math.cos(deg(a)), top, 6.4 * Math.sin(deg(a))], [6.4 * Math.cos(deg(a)), top + 7, 6.4 * Math.sin(deg(a))], [1.6, 1.8, 1.8, 1.6, 1.0, 0.5], 14), rod("hull-grey", [6.4 * Math.cos(deg(a)), top, 6.4 * Math.sin(deg(a))], [1.5 * Math.cos(deg(a)), top + 4, 1.5 * Math.sin(deg(a))], 0.2, 6, { only: "mesh" }));
    for (const a of [90, 270]) out.push(box("radiator-hot", [(R + 2) * Math.cos(deg(a)), 8, (R + 2) * Math.sin(deg(a))], 0.18, 7, 12, a + 90, { only: "mesh", plain: true }), rod("copper", [(R + 1.4) * Math.cos(deg(a)), 4, (R + 1.4) * Math.sin(deg(a))], [(R + 1.4) * Math.cos(deg(a)), 14, (R + 1.4) * Math.sin(deg(a))], 0.12, 6, { only: "mesh" }));
  }
  return out;
}

/**
 * One quarter standing up: eight decks with a deck slab, four furnished rooms and a corridor on each; the shell with its lit windows; the roof and the base; and the features of its kind. `cut` leaves a sector of the shell off to show the rooms
 * (`cutAt` is where it faces, in degrees round the tower), and `furnish` false leaves the rooms out (the plain outside).
 */
export function tower(kind: QuarterKind, o: { cut?: boolean; cutAt?: number; seed?: string; lit?: number; furnish?: boolean } = {}): Piece[] {
  const seed = o.seed ?? kind;
  const R = TOWER.r;
  const lit = o.lit ?? 0.5;
  const cutAt = o.cutAt ?? 0;
  const skip = o.cut ? (a: number): boolean => Math.abs((((a - cutAt + 540) % 360) - 180)) < 105 : (): boolean => false;
  const out: Piece[] = [...shell(R, 0, TOWER_H, seed, lit, skip, kind === "control")];
  const random = rng(`${seed}/rooms`);
  for (let f = 0; f <= TOWER.floors; f++) {
    const y = f * TOWER.fh;
    out.push(prism("deck", Array.from({ length: TOWER.sides }, (_, i) => [(R - 0.1) * Math.cos(deg((360 * i) / TOWER.sides + 11.25)), (R - 0.1) * Math.sin(deg((360 * i) / TOWER.sides + 11.25))] as [number, number]), y - 0.12, y + 0.02, { only: "mesh" }));
    if (f === TOWER.floors || o.furnish === false) continue;
    const plan = PLANS[kind][f];
    plan.forEach((k, i) => {
      const [w, d] = SHAPE[k];
      const side = i < 2 ? -1 : 1;
      const row = i % 2 ? 1 : -1;
      out.push(...place(room(k, `${seed}/${f}/${i}`).filter((p) => !(p.kind === "plate" && p.material === "hull-white" && (p.frame.o[1] > 2.2 || p.thickness > 2))), { at: [side * (1.2 + w / 2), y + 0.02, row * (d / 2 + 0.25)] }));
    });
    out.push(box("lamp-blue", [0, y + TOWER.fh - 0.12, 0], 0.5, 12, 0.05, 0, { only: "mesh", plain: true }));
    if (random() < 0.5) out.push(box("hazard", [0, y + 0.03, 0], 1.6, 0.08, 0.02, 0, { only: "mesh", plain: true }));
  }
  out.push(...horn("hull-white-worn", [0, TOWER_H, 0], [0, TOWER_H + 2.2, 0], [R * 0.97, R * 0.8, R * 0.5], 16), ...horn("hull-white-worn", [0, 0, 0], [0, -2.2, 0], [R * 0.97, R * 0.8, R * 0.5], 16));
  if (o.furnish !== false || !o.cut) out.push(...features(kind, seed));
  return out;
}

/**
 * A quarter on its arm: the tower lying along the arm at `angle` degrees round the station, its base at `radius` from the axis and its roof toward the hub, standing at height `y`. The shell's cut faces `cutAt` in the tower's own frame; the
 * tower's +Z side faces along the ring's axis (+Y of the ship), which is where the docking stub leaves it.
 */
export function quarter(kind: QuarterKind, y: number, radius: number, angle: number, o: { cut?: boolean; cutAt?: number; seed?: string; lit?: number; furnish?: boolean } = {}): Piece[] {
  const standing = tower(kind, o);
  const lying = moved(moving(standing, { name: "lie", pivot: [0, 0, 0], axis: [1, 0, 0] }), { lie: -90 });
  return place(lying, { at: [radius * Math.sin(deg(angle)), y, radius * Math.cos(deg(angle))], yaw: angle });
}
