// The three machines the gate kept: a layered beetle, a claw tug and a jointed arm. Each is one mesh. The beam and the truss are drawn with them in a picture, not inside the mesh.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { disc, discZ, hoop, post, rod } from "../detail.ts";
import { chamfer, polygon, wedge } from "./plates.ts";

const WHITE = "hull-white" satisfies MaterialName;
const ORANGE = "hull-orange" satisfies MaterialName;
const YELLOW = "hull-yellow" satisfies MaterialName;
const DARK = "hull-grey-dark" satisfies MaterialName;
const METAL = "hull-grey" satisfies MaterialName;
const GLASS = "glass-clear" satisfies MaterialName;
const GOLD = "gold" satisfies MaterialName;
const GLOW = "coil-lit" satisfies MaterialName;
const BLUE = "lamp-blue" satisfies MaterialName;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];

/** A plate lying flat, outline in [forward, side]. */
const deck = (material: MaterialName, centre: Vec3, outline: readonly (readonly [number, number])[], thick = 0.04): Piece => polygon(material, centre, [0, 0, 1], [0, 1, 0], outline, thick);

const tube = (material: MaterialName, a: Vec3, b: Vec3, radius: number, segs = 12): Piece => {
  const dy = b[1] - a[1] || 0.001;
  const lean: [number, number] = [(b[0] - a[0]) / dy, (b[2] - a[2]) / dy];
  return post(material, [a[0] - lean[0] * a[1], a[2] - lean[1] * a[1]], radius, a[1], radius, b[1], segs, { lean });
};

/** A round fan set into a face: a dark grille, a metal rim and a ring of blue lights. */
function fan(x: number, y: number, z: number, radius: number): Piece[] {
  const out: Piece[] = [discZ(DARK, x, y, z, z + 0.012, radius * 0.7, 12)];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    const next = t + (Math.PI * 2) / 8;
    out.push(rod(METAL, [x + Math.cos(t) * radius, y + Math.sin(t) * radius, z + 0.014], [x + Math.cos(next) * radius, y + Math.sin(next) * radius, z + 0.014], 0.008, 4));
    out.push(discZ(BLUE, x + Math.cos(t) * radius * 0.78, y + Math.sin(t) * radius * 0.78, z + 0.014, z + 0.024, 0.012, 6));
  }
  return out;
}

/** Two glowing eyes and a camera, on a small white plate. */
function eyes(x: number, y: number, z: number): Piece[] {
  return [deck(WHITE, [x, y, z], chamfer(0.05, 0.032, 0.01), 0.01), discZ(BLUE, x - 0.018, y + 0.006, z + 0.01, z + 0.022, 0.012, 8), discZ(BLUE, x + 0.018, y + 0.006, z + 0.01, z + 0.022, 0.012, 8), discZ(DARK, x, y - 0.016, z + 0.01, z + 0.018, 0.008, 6)];
}

const bumper = (x: number, y: number, z: number): Piece => discZ(DARK, x, y, z, z + 0.04, 0.034, 8);

/** The face every machine works through: a gold ring, a glowing throat and a lens. */
function emitter(at: readonly [number, number], y: number, radius: number): Piece[] {
  return [hoop(GOLD, radius, y, radius * 0.18, 18, 5, { at }), hoop(GLOW, radius * 0.62, y, radius * 0.1, 14, 4, { at }), disc(GLASS, at, radius * 0.4, y, 0.01, 12), disc(DARK, at, radius * 0.72, y - 0.012, 0.012, 12)];
}

/**
 * One of the three machines the gate kept.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const beetle = droneConcept("ring-beetle");
 * console.log(beetle.mouth[1] > 0);
 * ```
 */
export interface DroneConcept {
  id: "ring-beetle" | "tug-crab" | "arm-equal";
  pieces: Piece[];
  /** The centre of the glowing ring, where the beam leaves. */
  mouth: Vec3;
}

function ringBeetle(): DroneConcept {
  const y = 0.32;
  const pieces: Piece[] = [
    deck(DARK, [0, -0.02, -0.015], chamfer(0.26, 0.2, 0.08), 0.035),
    deck(WHITE, [0.03, 0.05, 0.035], chamfer(0.18, 0.13, 0.05), 0.05),
    deck(METAL, [-0.1, -0.04, 0.07], chamfer(0.09, 0.07, 0.028), 0.018),
    deck(ORANGE, [0.08, 0.1, 0.08], wedge(0.07, 0.045, 0.014), 0.016),
    ...fan(0.02, -0.02, 0.09, 0.085),
    ...eyes(0, 0.18, 0.09),
    bumper(-0.22, -0.16, 0.02),
    bumper(0.22, -0.16, 0.02),
    bumper(-0.16, 0.18, 0.03),
    bumper(0.18, 0.2, 0.03),
    post(METAL, [0, 0.01], 0.05, 0.18, 0.04, y - 0.01, 10),
    ...emitter([0, 0.01], y, 0.12),
  ];
  return { id: "ring-beetle", pieces, mouth: [0, y, 0.01] };
}

function jaw(sign: number, wrist: Vec3, grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  for (const root of [add(wrist, [0, 0, 0.055]), add(wrist, [0, 0, -0.055]), add(wrist, [sign * 0.055, 0, 0])] as Vec3[]) {
    const tip = add(root, scale([grasp[0] - root[0], grasp[1] - root[1], grasp[2] - root[2]], 0.7));
    out.push(rod(METAL, root, tip, 0.016, 5), rod(ORANGE, tip, grasp, 0.014, 4));
  }
  return out;
}

function tugCrab(): DroneConcept {
  const grasp: Vec3 = [0, 0.74, 0.05];
  const pieces: Piece[] = [
    deck(DARK, [0, -0.02, -0.01], chamfer(0.24, 0.22, 0.08), 0.028),
    deck(YELLOW, [0, 0.02, 0.03], chamfer(0.17, 0.16, 0.055), 0.04),
    deck(WHITE, [0, 0.08, 0.075], chamfer(0.1, 0.09, 0.03), 0.016),
    hoop(METAL, 0.055, 0.02, 0.014, 14, 4, { at: [-0.26, 0.03] }),
    disc(DARK, [-0.26, 0.03], 0.034, 0.02, 0.02, 10),
    hoop(METAL, 0.055, 0.02, 0.014, 14, 4, { at: [0.26, 0.03] }),
    disc(DARK, [0.26, 0.03], 0.034, 0.02, 0.02, 10),
    tube(METAL, [-0.18, 0.1, 0.06], [-0.08, 0.32, 0.07], 0.026),
    tube(YELLOW, [-0.1, 0.28, 0.07], [-0.06, 0.42, 0.06], 0.06),
    tube(METAL, [-0.06, 0.4, 0.06], [-0.02, 0.58, 0.05], 0.022),
    ...jaw(-1, [-0.02, 0.56, 0.05], grasp),
    tube(METAL, [0.18, 0.1, 0.06], [0.08, 0.32, 0.07], 0.026),
    tube(YELLOW, [0.1, 0.28, 0.07], [0.06, 0.42, 0.06], 0.06),
    tube(METAL, [0.06, 0.4, 0.06], [0.02, 0.58, 0.05], 0.022),
    ...jaw(1, [0.02, 0.56, 0.05], grasp),
    polygon(ORANGE, [0, 0.66, 0.05], [0, 1, 0], [1, 0, 0], chamfer(0.055, 0.045, 0.016), 0.05),
    post(METAL, [0, 0.08], 0.028, 0.2, 0.02, 0.36, 8),
    ...emitter([0, 0.08], 0.42, 0.075),
    ...eyes(0, 0.14, 0.1),
    bumper(-0.2, -0.18, 0.02),
    bumper(0.2, -0.18, 0.02),
    bumper(-0.14, 0.16, 0.05),
    bumper(0.14, 0.16, 0.05),
  ];
  return { id: "tug-crab", pieces, mouth: [0, 0.42, 0.08] };
}

function latch(origin: Vec3, axis: Vec3): Piece[] {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const dir: Vec3 = [axis[0] / len, axis[1] / len, axis[2] / len];
  const side = Math.abs(dir[2]) > 0.8 ? ([1, 0, 0] as Vec3) : ([dir[1], -dir[0], 0] as Vec3);
  const sl = Math.hypot(side[0], side[1], side[2]) || 1;
  const s: Vec3 = [side[0] / sl, side[1] / sl, side[2] / sl];
  const up: Vec3 = [dir[1] * s[2] - dir[2] * s[1], dir[2] * s[0] - dir[0] * s[2], dir[0] * s[1] - dir[1] * s[0]];
  const radius = 0.09;
  const ring: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    ring.push(add(origin, add(scale(s, Math.cos(t) * radius), scale(up, Math.sin(t) * radius))));
  }
  const out: Piece[] = [];
  for (let i = 0; i < 8; i++) out.push(rod(GOLD, ring[i], ring[(i + 1) % 8], 0.012, 4));
  out.push(polygon(DARK, add(origin, scale(dir, 0.01)), dir, s, chamfer(radius * 0.55, radius * 0.55, radius * 0.15), 0.012));
  out.push(polygon(GLOW, add(origin, scale(dir, 0.016)), dir, s, chamfer(radius * 0.28, radius * 0.28, 0.01), 0.006));
  out.push(polygon(GLASS, add(origin, scale(dir, 0.02)), dir, s, chamfer(radius * 0.22, radius * 0.22, 0.01), 0.006));
  const cam = add(origin, scale(s, radius * 1.15));
  out.push(polygon(METAL, cam, s, dir, chamfer(0.028, 0.02, 0.008), 0.02));
  out.push(rod(ORANGE, add(origin, scale(dir, 0.03)), add(origin, scale(dir, 0.1)), 0.016, 5));
  return out;
}

/** A joint: a matte housing with a motor cap on the side, not a stripe. */
function housing(at: Vec3, dir: Vec3): Piece[] {
  const back = add(at, scale(dir, -0.05));
  const fore = add(at, scale(dir, 0.05));
  return [tube(METAL, back, fore, 0.07, 12), tube(DARK, add(at, scale(dir, -0.015)), add(at, scale(dir, 0.015)), 0.086, 10), discZ(ORANGE, at[0], at[1], at[2] + 0.05, at[2] + 0.09, 0.03, 8)];
}

function armEqual(): DroneConcept {
  const wrist: Vec3 = [0.32, 1.62, 0];
  const pieces: Piece[] = [
    ...latch([0, 0.02, 0], [0, -1, 0]),
    ...housing([0, 0.16, 0], [0, 1, 0]),
    tube(WHITE, [0, 0.04, 0], [0, 0.82, 0], 0.038, 14),
    ...housing([0, 0.78, 0], [0, 1, 0]),
    tube(WHITE, [0, 0.74, 0], [0.32, 1.2, 0], 0.036, 14),
    ...housing([0.32, 1.16, 0], [0, 1, 0]),
    tube(WHITE, [0.32, 1.1, 0], [0.32, 1.66, 0], 0.036, 14),
    ...housing([0.32, 1.56, 0], [0, 1, 0]),
    ...latch(wrist, [0, 1, 0]),
  ];
  return { id: "arm-equal", pieces, mouth: wrist };
}

/**
 * The three machines the gate kept, in the order a yard would look at them.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.map((make) => make().id).join(","));
 * ```
 */
export const DRONE_CONCEPTS: readonly (() => DroneConcept)[] = [ringBeetle, tugCrab, armEqual];

/**
 * One machine by its id.
 *
 * @param id One of the three ids.
 * @returns That machine.
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const beetle = droneConcept("ring-beetle");
 * console.log(beetle.id, beetle.mouth[1] > 0);
 * ```
 */
export function droneConcept(id: DroneConcept["id"]): DroneConcept {
  const found = DRONE_CONCEPTS.map((make) => make()).find((concept) => concept.id === id);
  if (!found) throw new Error(`no drone ${id}`);
  return found;
}
