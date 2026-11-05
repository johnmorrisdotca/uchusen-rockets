// The three construction machines, drawn from the saucer, the servicer and the two-arm robot. Each is one mesh. The beam, the laser, the weld sparks and the truss are drawn with them in a picture, not inside the mesh. No mark from a reference is copied.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { disc, discZ, hoop, post, rod } from "../detail.ts";
import { chamfer, polygon } from "./plates.ts";

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

const tube = (material: MaterialName, a: Vec3, b: Vec3, radius: number, segs = 10): Piece => {
  const dy = b[1] - a[1] || 0.001;
  const lean: [number, number] = [(b[0] - a[0]) / dy, (b[2] - a[2]) / dy];
  return post(material, [a[0] - lean[0] * a[1], a[2] - lean[1] * a[1]], radius, a[1], radius, b[1], segs, { lean });
};

/** The face the beam leaves: a gold ring, a glowing throat and a lens. */
function emitter(at: readonly [number, number], y: number, radius: number): Piece[] {
  return [hoop(GOLD, radius, y, radius * 0.16, 16, 4, { at }), hoop(GLOW, radius * 0.55, y, radius * 0.08, 12, 4, { at }), disc(GLASS, at, radius * 0.42, y, 0.01, 10), disc(DARK, at, radius * 0.7, y - 0.01, 0.01, 10)];
}

function whip(from: Vec3, to: Vec3): Piece[] {
  return [rod(METAL, from, to, 0.006, 4), discZ(BLUE, to[0], to[1], to[2], to[2] + 0.02, 0.012, 6)];
}

function jaw(sign: number, wrist: Vec3, grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  for (const root of [add(wrist, [0, 0, 0.04]), add(wrist, [0, 0, -0.04]), add(wrist, [sign * 0.04, 0, 0])] as Vec3[]) {
    const tip = add(root, scale([grasp[0] - root[0], grasp[1] - root[1], grasp[2] - root[2]], 0.68));
    out.push(rod(METAL, root, tip, 0.012, 4), rod(ORANGE, tip, grasp, 0.01, 3));
  }
  return out;
}

/** One jointed arm: a boom into a housing at each joint, then a gripper. */
function limb(root: Vec3, joints: readonly Vec3[], grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  let prev = root;
  for (const joint of joints) {
    const dir: Vec3 = [joint[0] - prev[0], joint[1] - prev[1], joint[2] - prev[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
    out.push(tube(WHITE, prev, joint, 0.022, 8));
    out.push(tube(METAL, add(joint, scale(u, -0.03)), add(joint, scale(u, 0.03)), 0.04, 8));
    out.push(discZ(ORANGE, joint[0], joint[1], joint[2] + 0.03, joint[2] + 0.055, 0.018, 6));
    prev = joint;
  }
  out.push(...jaw(root[0] < 0 ? -1 : 1, prev, grasp));
  return out;
}

/**
 * One construction machine.
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
  /** The centre of the lens, where the beam leaves. */
  mouth: Vec3;
  /** Where the working tool meets the work. */
  tool: Vec3;
  /** A thin alignment line, or a weld. */
  toolKind: "laser" | "weld";
}

function ringBeetle(): DroneConcept {
  const y = 0.34;
  const grip: Vec3 = [-0.16, 0.46, -0.02];
  const pieces: Piece[] = [
    discZ(ORANGE, 0, 0, -0.012, 0.012, 0.34, 20),
    discZ(WHITE, 0, 0.02, 0.012, 0.05, 0.28, 20),
    deck(WHITE, [0, -0.02, 0.07], chamfer(0.12, 0.09, 0.035), 0.028),
    deck(DARK, [0.02, -0.08, 0.1], chamfer(0.06, 0.045, 0.016), 0.02),
    discZ(BLUE, 0, 0, -0.045, -0.02, 0.14, 12),
    rod(METAL, [-0.2, 0.06, 0.02], [-0.32, 0.08, 0.02], 0.032, 8),
    rod(ORANGE, [-0.32, 0.08, 0.02], [-0.4, 0.09, 0.02], 0.026, 6),
    rod(METAL, [0.2, 0.06, 0.02], [0.32, 0.08, 0.02], 0.032, 8),
    rod(ORANGE, [0.32, 0.08, 0.02], [0.4, 0.09, 0.02], 0.026, 6),
    ...whip([-0.06, -0.06, 0.1], [-0.1, -0.1, 0.4]),
    ...whip([0.1, -0.02, 0.1], [0.16, 0.02, 0.38]),
    ...limb([-0.08, 0.04, -0.03], [[-0.18, 0.16, -0.12], [-0.22, 0.32, -0.06]], grip),
    ...limb([0.08, 0.04, -0.03], [[0.18, 0.14, -0.12], [0.2, 0.3, -0.05]], [0.14, 0.44, 0]),
    post(METAL, [0, 0.02], 0.05, 0.2, 0.04, y - 0.02, 10),
    ...emitter([0, 0.02], y, 0.1),
  ];
  return { id: "ring-beetle", pieces, mouth: [0, y, 0.02], tool: grip, toolKind: "laser" };
}

function tugCrab(): DroneConcept {
  const grasp: Vec3 = [0, 0.78, 0.04];
  const pieces: Piece[] = [
    deck(DARK, [0, 0, -0.01], chamfer(0.26, 0.2, 0.07), 0.03),
    deck(YELLOW, [0, 0.02, 0.03], chamfer(0.18, 0.15, 0.05), 0.04),
    deck(WHITE, [0, 0.06, 0.08], chamfer(0.09, 0.08, 0.025), 0.016),
    deck(ORANGE, [0.2, 0, 0.04], chamfer(0.02, 0.1, 0.008), 0.01),
    deck(DARK, [0.2, 0.06, 0.05], chamfer(0.018, 0.03, 0.008), 0.01),
    rod(METAL, [-0.1, 0.16, 0.06], [-0.1, 0.46, 0.06], 0.028, 8),
    rod(ORANGE, [-0.1, 0.46, 0.06], [-0.1, 0.54, 0.06], 0.022, 6),
    rod(METAL, [0.1, 0.16, 0.06], [0.1, 0.46, 0.06], 0.028, 8),
    rod(ORANGE, [0.1, 0.46, 0.06], [0.1, 0.54, 0.06], 0.022, 6),
    ...limb([-0.16, 0.1, 0.02], [[-0.22, 0.28, 0.04], [-0.1, 0.48, 0.05]], grasp),
    ...limb([0.16, 0.1, 0.02], [[0.22, 0.28, 0.04], [0.1, 0.48, 0.05]], grasp),
    polygon(ORANGE, [0, 0.7, 0.04], [0, 1, 0], [1, 0, 0], chamfer(0.05, 0.04, 0.014), 0.04),
    post(METAL, [0, 0.05], 0.025, 0.16, 0.02, 0.32, 8),
    ...emitter([0, 0.05], 0.38, 0.06),
  ];
  for (let i = 0; i < 6; i++) pieces.push(rod(METAL, [-0.1 + i * 0.04, 0.18, 0.02], [-0.1 + i * 0.04, 0.18, -0.08], 0.008, 3));
  return { id: "tug-crab", pieces, mouth: [0, 0.38, 0.05], tool: grasp, toolKind: "weld" };
}

function latch(origin: Vec3, axis: Vec3): Piece[] {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const dir: Vec3 = [axis[0] / len, axis[1] / len, axis[2] / len];
  const s: Vec3 = [dir[1], -dir[0], 0];
  const radius = 0.08;
  const ring: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    ring.push(add(origin, add(scale(s, Math.cos(t) * radius), [0, 0, Math.sin(t) * radius])));
  }
  const out: Piece[] = [];
  for (let i = 0; i < 8; i++) out.push(rod(GOLD, ring[i], ring[(i + 1) % 8], 0.01, 3));
  out.push(polygon(GLOW, add(origin, scale(dir, 0.012)), dir, s, chamfer(radius * 0.3, radius * 0.3, 0.01), 0.006));
  return out;
}

function armEqual(): DroneConcept {
  const grip: Vec3 = [0.42, 0.62, 0.02];
  const pieces: Piece[] = [
    deck(DARK, [0, 0, -0.02], chamfer(0.16, 0.2, 0.05), 0.03),
    deck(WHITE, [0, 0.02, 0.04], chamfer(0.12, 0.16, 0.04), 0.08),
    deck(DARK, [0.04, -0.02, 0.1], chamfer(0.07, 0.05, 0.012), 0.008),
    deck(BLUE, [0.04, -0.04, 0.108], chamfer(0.02, 0.04, 0.006), 0.004),
    deck(BLUE, [0.04, 0.01, 0.108], chamfer(0.02, 0.012, 0.006), 0.004),
    discZ(BLUE, -0.08, 0.08, 0.09, 0.1, 0.012, 6),
    discZ(BLUE, 0.08, 0.08, 0.09, 0.1, 0.012, 6),
    discZ(BLUE, -0.08, -0.1, 0.09, 0.1, 0.012, 6),
    discZ(BLUE, 0.08, -0.1, 0.09, 0.1, 0.012, 6),
    ...latch([0, -0.16, 0.05], [0, -1, 0]),
    ...limb([-0.14, 0.02, 0.02], [[-0.28, 0.16, 0.02], [-0.4, 0.36, 0], [-0.46, 0.52, 0.02]], [-0.4, 0.64, 0.02]),
    ...limb([0.14, 0.02, 0.02], [[0.28, 0.16, 0.04], [0.4, 0.36, 0.02], [0.44, 0.52, 0.02]], grip),
    post(METAL, [0, 0.02], 0.035, 0.14, 0.028, 0.2, 8),
    ...emitter([0, 0.02], 0.22, 0.07),
  ];
  return { id: "arm-equal", pieces, mouth: [0, 0.22, 0.02], tool: grip, toolKind: "laser" };
}

/**
 * The three machines, in the order a yard would look at them.
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
 * console.log(beetle.id, beetle.toolKind);
 * ```
 */
export function droneConcept(id: DroneConcept["id"]): DroneConcept {
  const found = DRONE_CONCEPTS.map((make) => make()).find((concept) => concept.id === id);
  if (!found) throw new Error(`no drone ${id}`);
  return found;
}
