// The two strongest silhouettes of each construction machine, detailed. Each is one mesh. The beam and the truss a walker holds are drawn with it in a picture, not inside the mesh.
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

const tube = (material: MaterialName, a: Vec3, b: Vec3, radius: number, segs = 14): Piece => {
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
    out.push(discZ(BLUE, x + Math.cos(t) * radius * 0.78, y + Math.sin(t) * radius * 0.78, z + 0.014, z + 0.022, 0.01, 6));
  }
  return out;
}

/** Two glowing eyes and a camera, on a small white plate. */
function eyes(x: number, y: number, z: number): Piece[] {
  return [deck(WHITE, [x, y, z], chamfer(0.055, 0.035, 0.012), 0.012), discZ(BLUE, x - 0.02, y + 0.008, z + 0.01, z + 0.02, 0.012, 8), discZ(BLUE, x + 0.02, y + 0.008, z + 0.01, z + 0.02, 0.012, 8), discZ(DARK, x, y - 0.018, z + 0.01, z + 0.018, 0.009, 6)];
}

const bumper = (x: number, y: number, z: number): Piece => discZ(DARK, x, y, z, z + 0.035, 0.032, 8);

/** Short white sleeves with a dark collar, the blanketed look of a jointed arm. */
function blanket(a: Vec3, b: Vec3, radius: number, count: number): Piece[] {
  const step: Vec3 = [(b[0] - a[0]) / count, (b[1] - a[1]) / count, (b[2] - a[2]) / count];
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const p = add(a, scale(step, i));
    out.push(tube(WHITE, p, add(p, scale(step, 0.82)), radius, 10));
    out.push(tube(DARK, add(p, scale(step, 0.7)), add(p, scale(step, 1.05)), radius * 1.35, 8));
  }
  return out;
}

/** The face every machine works through: a gold ring, a glowing throat and a lens. */
function emitter(at: readonly [number, number], y: number, radius: number): Piece[] {
  return [hoop(GOLD, radius, y, radius * 0.16, 18, 5, { at }), hoop(GLOW, radius * 0.62, y, radius * 0.08, 14, 4, { at }), disc(GLASS, at, radius * 0.45, y, 0.008, 12), disc(DARK, at, radius * 0.7, y - 0.01, 0.01, 12)];
}

/**
 * One detailed construction machine, one of the two kept from each silhouette set.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const manta = droneConcept("ring-manta");
 * console.log(manta.mouth[1] > 0);
 * ```
 */
export interface DroneConcept {
  id: "ring-manta" | "ring-beetle" | "tug-crab" | "tug-boot" | "arm-equal" | "arm-inch";
  pieces: Piece[];
  /** The centre of the glowing ring, where the beam leaves. */
  mouth: Vec3;
}

const MANTA: [number, number][] = [[-0.26, -0.08], [0.34, 0], [-0.26, 0.4], [-0.4, 0.04]];

function ringManta(): DroneConcept {
  const y = 0.3;
  const pieces: Piece[] = [
    deck(DARK, [0, -0.02, -0.025], MANTA.map(([u, v]) => [u * 0.96, v * 0.96]), 0.03),
    deck(WHITE, [0, 0, 0], MANTA, 0.045),
    deck(ORANGE, [0.02, 0.04, 0.04], wedge(0.14, 0.05, 0.012), 0.016),
    post(METAL, [0.02, 0], 0.03, 0.22, 0.02, y - 0.02, 10),
    ...emitter([0.02, 0], y, 0.05),
    hoop(METAL, 0.045, -0.16, 0.01, 14, 4, { at: [-0.16, 0.02] }),
    disc(DARK, [-0.16, 0.02], 0.028, -0.16, 0.008, 10),
    hoop(METAL, 0.038, -0.22, 0.009, 12, 4, { at: [-0.28, 0.02] }),
    disc(DARK, [-0.28, 0.02], 0.022, -0.22, 0.008, 10),
    ...fan(-0.18, -0.16, 0.04, 0.07),
    ...eyes(-0.02, 0.1, 0.05),
    bumper(0.06, -0.24, 0.03),
    bumper(-0.36, -0.24, 0.03),
    bumper(-0.02, -0.38, 0.03),
    deck(DARK, [0.1, -0.22, 0.04], chamfer(0.01, 0.04, 0.008), 0.01),
    polygon("lamp-amber", [0.08, -0.1, 0.04], [0, 0, 1], [0, 1, 0], chamfer(0.025, 0.018, 0.008), 0.01),
  ];
  return { id: "ring-manta", pieces, mouth: [0.02, y, 0] };
}

function ringBeetle(): DroneConcept {
  const y = 0.27;
  const pieces: Piece[] = [
    post(WHITE, [0, 0], 0.03, -0.24, 0.15, -0.02, 18),
    post(WHITE, [0, 0], 0.15, -0.02, 0.045, 0.26, 18),
    hoop(DARK, 0.155, -0.02, 0.012, 18, 4),
    deck(ORANGE, [0, 0.04, 0.145], wedge(0.08, 0.035, 0.012), 0.014),
    deck(METAL, [0.1, -0.04, 0.08], chamfer(0.05, 0.035, 0.015), 0.012),
    ...emitter([0, 0], y, 0.06),
    hoop(METAL, 0.045, 0.04, 0.01, 12, 4, { at: [-0.13, 0.04] }),
    hoop(METAL, 0.045, 0.04, 0.01, 12, 4, { at: [0.13, 0.04] }),
    ...fan(0, -0.02, 0.16, 0.06),
    ...eyes(0, 0.12, 0.15),
    bumper(-0.14, -0.02, 0.04),
    bumper(0.14, -0.02, 0.04),
    polygon("lamp-amber", [-0.06, 0.1, 0.14], [0, 0, 1], [0, 1, 0], chamfer(0.02, 0.015, 0.006), 0.008),
  ];
  return { id: "ring-beetle", pieces, mouth: [0, y, 0] };
}

function jaw(sign: number, wrist: Vec3, grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  for (const root of [
    add(wrist, [0, 0.02, 0.06]),
    add(wrist, [0, 0.02, -0.06]),
    add(wrist, [sign * 0.06, 0.02, 0]),
  ] as Vec3[]) {
    const tip = add(root, scale([grasp[0] - root[0], grasp[1] - root[1], grasp[2] - root[2]], 0.72));
    out.push(rod(METAL, root, tip, 0.016, 5), rod(ORANGE, tip, grasp, 0.012, 4));
  }
  return out;
}

function tugCrab(): DroneConcept {
  const pieces: Piece[] = [
    deck(DARK, [0, 0, -0.02], chamfer(0.2, 0.32, 0.1), 0.06),
    deck(YELLOW, [0, 0.02, 0.04], chamfer(0.16, 0.26, 0.08), 0.08),
    deck(WHITE, [0, 0.04, 0.1], chamfer(0.1, 0.16, 0.04), 0.018),
    tube(METAL, [-0.28, 0.02, 0.06], [-0.14, 0.28, 0.1], 0.032),
    tube(YELLOW, [-0.16, 0.26, 0.1], [-0.12, 0.34, 0.08], 0.045),
    tube(METAL, [-0.14, 0.32, 0.08], [-0.04, 0.5, 0.04], 0.026),
    ...jaw(-1, [-0.04, 0.5, 0.04], [-0.02, 0.66, 0]),
    tube(METAL, [0.28, 0.02, 0.06], [0.14, 0.28, 0.1], 0.032),
    tube(YELLOW, [0.16, 0.26, 0.1], [0.12, 0.34, 0.08], 0.045),
    tube(METAL, [0.14, 0.32, 0.08], [0.04, 0.5, 0.04], 0.026),
    ...jaw(1, [0.04, 0.5, 0.04], [0.02, 0.66, 0]),
    post(METAL, [0, 0], 0.03, 0.16, 0.02, 0.22, 8),
    ...emitter([0, 0], 0.24, 0.04),
    ...fan(0, 0.02, 0.12, 0.06),
    ...eyes(0, 0.12, 0.13),
    polygon("lamp-amber", [-0.1, 0.12, 0.12], [0, 0, 1], [0, 1, 0], chamfer(0.02, 0.015, 0.006), 0.008),
  ];
  for (const x of [-1, 1]) for (const y of [-1, 1]) pieces.push(hoop(METAL, 0.05, y * 0.16, 0.011, 14, 4, { at: [x * 0.24, -0.02] }), disc(DARK, [x * 0.24, -0.02], 0.03, y * 0.16, 0.008, 10), bumper(x * 0.14, y * 0.2, 0.08));
  return { id: "tug-crab", pieces, mouth: [0, 0.24, 0] };
}

function tugBoot(): DroneConcept {
  const pieces: Piece[] = [
    polygon(YELLOW, [0, 0, 0], [1, 0, 0], [0, 1, 0], [[-0.4, -0.08], [0.36, -0.06], [0.18, 0.16], [-0.4, 0.2]], 0.28),
    deck(WHITE, [0, 0.02, 0.16], chamfer(0.22, 0.1, 0.04), 0.02),
    deck(ORANGE, [0.1, 0, 0.12], wedge(0.1, 0.06, 0.02), 0.014),
    tube(METAL, [0.08, 0.3, -0.02], [0.04, 0.52, 0.02], 0.028),
    tube(YELLOW, [0.05, 0.48, 0.02], [0.03, 0.56, 0.02], 0.04),
    ...jaw(1, [0.02, 0.56, 0.02], [0, 0.72, 0]),
    post(METAL, [0, 0.06], 0.02, 0.28, 0.015, 0.34, 8),
    ...emitter([0, 0.06], 0.36, 0.032),
    hoop(METAL, 0.07, -0.32, 0.014, 14, 4, { at: [0.1, -0.02] }),
    hoop(METAL, 0.055, -0.28, 0.012, 12, 4, { at: [-0.1, 0] }),
    ...fan(0, -0.05, 0.18, 0.055),
    ...eyes(0.04, 0.14, 0.19),
    bumper(0.12, -0.36, 0.04),
    bumper(-0.12, -0.36, 0.04),
    bumper(0.1, 0.28, 0.08),
    polygon("lamp-amber", [0.06, 0.12, 0.18], [0, 0, 1], [0, 1, 0], chamfer(0.02, 0.014, 0.006), 0.008),
  ];
  return { id: "tug-boot", pieces, mouth: [0, 0.4, 0] };
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
  const cam = add(origin, scale(s, radius * 1.2));
  out.push(polygon(METAL, cam, s, dir, chamfer(0.03, 0.02, 0.008), 0.02), polygon("lamp-amber", add(cam, scale(up, 0.035)), up, dir, chamfer(0.015, 0.012, 0.004), 0.008));
  out.push(rod(ORANGE, add(origin, scale(dir, 0.04)), add(origin, scale(dir, 0.12)), 0.016, 5));
  return out;
}

function drums(from: Vec3, dir: Vec3, count: number): Piece[] {
  const out: Piece[] = [];
  const step = 0.11;
  for (let i = 0; i < count; i++) {
    const a = add(from, scale(dir, i * step));
    out.push(tube(METAL, a, add(a, scale(dir, 0.08)), 0.055, 12), tube(DARK, add(a, scale(dir, 0.025)), add(a, scale(dir, 0.055)), 0.066, 12));
  }
  return out;
}

function armEqual(): DroneConcept {
  const fore: Vec3 = [0.42, 0.55, 0];
  const fl = Math.hypot(fore[0], fore[1]) || 1;
  const dir: Vec3 = [fore[0] / fl, fore[1] / fl, 0];
  const wrist = add([0, 1.2, 0], scale(dir, 0.7));
  const pieces: Piece[] = [
    ...latch([0, 0.02, 0], [0, -1, 0]),
    ...drums([0, 0.1, 0], [0, 1, 0], 3),
    ...blanket([0, 0.36, 0], [0, 1.16, 0], 0.04, 5),
    tube(METAL, [0, 1.08, 0], [0, 1.24, 0], 0.07, 14),
    ...blanket([0, 1.16, 0], add([0, 1.16, 0], scale(dir, 0.7)), 0.04, 4),
    ...drums(add([0, 1.16, 0], scale(dir, 0.58)), dir, 3),
    ...latch(wrist, dir),
  ];
  return { id: "arm-equal", pieces, mouth: [wrist[0], wrist[1], wrist[2]] };
}

function armInch(): DroneConcept {
  const dir: Vec3 = [0.55, 0.84, 0];
  const wrist = add([0, 0.3, 0], scale(dir, 0.42));
  const pieces: Piece[] = [
    ...latch([0, 0.02, 0], [0, -1, 0]),
    ...blanket([0, 0.1, 0], [0, 0.32, 0], 0.06, 3),
    tube(METAL, [0, 0.26, 0], [0, 0.36, 0], 0.09, 14),
    ...blanket([0, 0.32, 0], wrist, 0.05, 3),
    ...latch(wrist, dir),
  ];
  return { id: "arm-inch", pieces, mouth: [wrist[0], wrist[1], 0] };
}

/**
 * The six detailed machines: two of each kind, in the order a yard would look at them.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.map((make) => make().id).join(","));
 * ```
 */
export const DRONE_CONCEPTS: readonly (() => DroneConcept)[] = [ringManta, ringBeetle, tugCrab, tugBoot, armEqual, armInch];

/**
 * One detailed machine by its id.
 *
 * @param id One of the six ids.
 * @returns That machine.
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const manta = droneConcept("ring-manta");
 * console.log(manta.id, manta.mouth[1] > 0);
 * ```
 */
export function droneConcept(id: DroneConcept["id"]): DroneConcept {
  const found = DRONE_CONCEPTS.map((make) => make()).find((concept) => concept.id === id);
  if (!found) throw new Error(`no drone ${id}`);
  return found;
}
