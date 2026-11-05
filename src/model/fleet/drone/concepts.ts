// Three construction machines, from the mood of John's references and not a copy of any of them. The ring drone is the small one, many at a time: layered armour, ducted pods and a gold ring. The tug carries heavy parts in two claws. The arm walks a truss, gripping at both ends. Each is one mesh, so it can be instanced. Pure: no three.js and no DOM.
import type { MaterialName } from "../../materials.ts";
import type { Frame, Piece, Vec3 } from "../../pieces.ts";
import { disc, hoop, place, post, rod } from "../detail.ts";

const WHITE = "hull-white" satisfies MaterialName;
const ORANGE = "hull-orange" satisfies MaterialName;
const YELLOW = "hull-yellow" satisfies MaterialName;
const DARK = "hull-grey-dark" satisfies MaterialName;
const METAL = "hull-grey" satisfies MaterialName;
const GLASS = "glass-clear" satisfies MaterialName;
const GOLD = "gold" satisfies MaterialName;

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A panel. `uDir` is the direction of `wide`; `tall` runs across that and the outward normal. */
function face(material: MaterialName, centre: Vec3, normal: Vec3, uDir: Vec3, wide: number, tall: number, thick = 0.012): Piece {
  const n = unit(normal);
  const u = unit(uDir);
  const frame: Frame = { o: centre, u, v: cross(n, u), w: n };
  return { kind: "plate", material, frame, outline: [[-wide / 2, -tall / 2], [wide / 2, -tall / 2], [wide / 2, tall / 2], [-wide / 2, tall / 2]], thickness: thick, plain: true, only: "mesh" };
}

/** Round members along the edges of a box, so the panels read as set into a frame. */
function frameOf(hx: number, hy: number, hz: number, radius = 0.016): Piece[] {
  const corners: Vec3[] = [];
  for (const x of [-hx, hx]) for (const y of [-hy, hy]) for (const z of [-hz, hz]) corners.push([x, y, z]);
  const out: Piece[] = [];
  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      const same = corners[i].filter((value, k) => Math.abs(value - corners[j][k]) < 1e-6).length;
      if (same === 2) out.push(rod(METAL, corners[i], corners[j], radius, 6));
    }
  }
  return out;
}

/** One layer of panels on the six faces, set `sink` metres in from the box (negative stands proud). */
function skin(material: MaterialName, hx: number, hy: number, hz: number, sink: number, gap: number): Piece[] {
  return [
    face(material, [0, hy - sink, 0], [0, 1, 0], [1, 0, 0], hx * 2 - gap, hz * 2 - gap),
    face(material, [0, -hy + sink, 0], [0, -1, 0], [1, 0, 0], hx * 2 - gap, hz * 2 - gap),
    face(material, [hx - sink, 0, 0], [1, 0, 0], [0, 1, 0], hy * 2 - gap, hz * 2 - gap),
    face(material, [-hx + sink, 0, 0], [-1, 0, 0], [0, 1, 0], hy * 2 - gap, hz * 2 - gap),
    face(material, [0, 0, hz - sink], [0, 0, 1], [1, 0, 0], hx * 2 - gap, hy * 2 - gap),
    face(material, [0, 0, -hz + sink], [0, 0, -1], [1, 0, 0], hx * 2 - gap, hy * 2 - gap),
  ];
}

/** A round duct: a hoop, a fan disc and a hub, opening along Y. */
function duct(x: number, z: number, y: number, radius: number): Piece[] {
  return [
    hoop(METAL, radius, y, radius * 0.16, 16, 5, { at: [x, z] }),
    hoop(DARK, radius * 0.78, y, radius * 0.05, 12, 4, { at: [x, z] }),
    disc(DARK, [x, z], radius * 0.55, y, 0.008, 10),
    post(METAL, [x, z], radius * 0.12, y - 0.01, radius * 0.12, y + 0.01, 6),
  ];
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** A painted edge, standing just outside the frame so the colour reads against the panel. */
function strip(a: Vec3, b: Vec3, out: Vec3, wide = 0.03): Piece {
  const along = sub(b, a);
  const len = Math.hypot(along[0], along[1], along[2]);
  return face(ORANGE, add(a, scale(along, 0.5)), out, along, len, wide, 0.014);
}

/** A grey frame, a dark panel set into it, a smaller panel standing proud, and orange on the long edges. */
function armour(hx: number, hy: number, hz: number, panel: MaterialName): Piece[] {
  const out = [...frameOf(hx, hy, hz, 0.014), ...skin(DARK, hx, hy, hz, 0.028, 0.03), ...skin(panel, hx, hy, hz, -0.008, Math.min(hx, hz) * 0.7)];
  for (const x of [-hx, hx]) for (const z of [-hz, hz]) out.push(strip([x, -hy, z], [x, hy, z], unit([x, 0, z]), 0.026));
  return out;
}

/** A work light sitting on a face. A lathe lamp only grows along Y, so a light on any other face is a plate. */
function lamp(centre: Vec3, normal: Vec3): Piece {
  return face("lamp-amber", centre, normal, Math.abs(normal[1]) > 0.8 ? [1, 0, 0] : [0, 1, 0], 0.05, 0.035, 0.012);
}

/**
 * One construction machine: the small ring drone, the claw tug, or the arm that walks a truss.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ring = droneConcept("ring");
 * console.log(ring.id, ring.mouth[1] > 0);
 * ```
 */
export interface DroneConcept {
  id: "ring" | "tug" | "arm";
  pieces: Piece[];
  /** Where the tool meets the work: the ring's lens, the tug's claws, or the arm's forward gripper. */
  mouth: Vec3;
}

/** The small drone. A gold ring on the nose, four ducted pods on the tail, layered white armour with orange edges. */
function ringConcept(): DroneConcept {
  const hx = 0.18;
  const hy = 0.15;
  const hz = 0.16;
  const ringY = hy + 0.09;
  const pieces: Piece[] = [
    ...armour(hx, hy, hz, WHITE),
    post(METAL, [0, 0], 0.05, hy - 0.02, 0.038, ringY - 0.015, 10),
    hoop(GOLD, 0.09, ringY, 0.013, 24, 6),
    hoop(DARK, 0.062, ringY, 0.006, 16, 5),
    disc(GLASS, [0, 0], 0.048, ringY, 0.008, 12),
    face(DARK, [0, hy * 0.4, hz + 0.012], [0, 0, 1], [1, 0, 0], 0.1, 0.08, 0.016),
    face(GLASS, [0, hy * 0.4, hz + 0.022], [0, 0, 1], [1, 0, 0], 0.05, 0.04, 0.006),
    lamp([0.08, hy * 0.2, hz + 0.02], [0, 0, 1]),
    lamp([-0.08, hy * 0.2, hz + 0.02], [0, 0, 1]),
    rod(METAL, [0, -hy * 0.3, -hz], [0, -hy * 0.3, -hz - 0.055], 0.012, 6),
  ];
  for (const x of [-1, 1]) for (const z of [-1, 1]) pieces.push(...duct(x * 0.085, z * 0.075, -hy - 0.07, 0.05));
  return { id: "ring", pieces, mouth: [0, ringY, 0] };
}

/** One claw: a palm and two fingers that stay apart, so the opening reads. */
function claw(x: number, y: number): Piece[] {
  const sign = Math.sign(x) || 1;
  const tip = y + 0.26;
  const close = x - sign * 0.05;
  return [
    face(YELLOW, [x + sign * 0.03, y + 0.04, 0], [sign, 0, 0], [0, 1, 0], 0.24, 0.2, 0.028),
    rod(METAL, [x, y, 0.07], [close, tip, 0.055], 0.02, 6),
    rod(METAL, [x, y, -0.07], [close, tip, -0.055], 0.02, 6),
    rod(ORANGE, [close, tip, 0.055], [close - sign * 0.02, tip + 0.045, 0.055], 0.016, 5),
    rod(ORANGE, [close, tip, -0.055], [close - sign * 0.02, tip + 0.045, -0.055], 0.016, 5),
  ];
}

/** The heavy tug: a yellow armoured body, a white deck, a cross-frame clear of the nose, and two open claws. */
function tugConcept(): DroneConcept {
  const hx = 0.26;
  const hy = 0.62;
  const hz = 0.18;
  const nose = hy + 0.14;
  const pieces: Piece[] = [
    ...armour(hx, hy, hz, YELLOW),
    face(WHITE, [0, 0, hz + 0.016], [0, 0, 1], [1, 0, 0], hx * 1.15, hy * 1.2, 0.012),
    rod(METAL, [-0.62, nose, 0], [0.62, nose, 0], 0.036, 8),
    rod(METAL, [0, nose, -0.28], [0, nose, 0.28], 0.03, 8),
    ...claw(-0.52, nose),
    ...claw(0.52, nose),
    lamp([-0.16, nose - 0.02, 0.12], [0, 0, 1]),
    lamp([0.16, nose - 0.02, 0.12], [0, 0, 1]),
  ];
  for (const x of [-1, 1]) pieces.push(...duct(x * 0.12, 0, -hy - 0.12, 0.1));
  return { id: "tug", pieces, mouth: [0, nose + 0.3, 0] };
}

/** A latching end: a ring, a dark bore, four lugs and a camera on the rim. Our own end, the round grapple shape. */
function latch(origin: Vec3, axis: Vec3): Piece[] {
  const dir = unit(axis);
  const side = unit(cross(dir, Math.abs(dir[2]) > 0.8 ? [0, 1, 0] : [0, 0, 1]));
  const up = unit(cross(side, dir));
  const radius = 0.1;
  const ring: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    const turn = (i / 8) * Math.PI * 2;
    ring.push(add(origin, add(scale(side, Math.cos(turn) * radius), scale(up, Math.sin(turn) * radius))));
  }
  const out: Piece[] = [];
  for (let i = 0; i < 8; i++) out.push(rod(YELLOW, ring[i], ring[(i + 1) % 8], 0.014, 5));
  for (const i of [0, 2, 4, 6]) out.push(rod(METAL, ring[i], add(ring[i], scale(dir, 0.05)), 0.012, 5));
  out.push(face(DARK, add(origin, scale(dir, 0.012)), dir, side, radius * 1.3, radius * 1.3, 0.014));
  out.push(face(GLASS, add(origin, scale(dir, 0.022)), dir, side, radius * 0.4, radius * 0.4, 0.006));
  const cam = add(origin, scale(up, radius * 0.9));
  out.push(face(METAL, add(cam, scale(up, 0.02)), up, dir, 0.06, 0.045, 0.02), lamp(add(cam, scale(up, 0.04)), up));
  return out;
}

/** A box beam between two points, with a dark panel and a lighter one on top. `place` only spins about Y, so a bent arm is built here, already bent. */
function boxBeam(a: Vec3, b: Vec3, hx: number, hz: number, panel: MaterialName): Piece[] {
  const dir = unit(sub(b, a));
  const side = unit(cross(dir, Math.abs(dir[2]) > 0.8 ? [0, 1, 0] : [0, 0, 1]));
  const up = unit(cross(side, dir));
  const corner = (s: number, t: number, p: Vec3) => add(p, add(scale(side, s * hx), scale(up, t * hz)));
  const out: Piece[] = [];
  for (const s of [-1, 1]) for (const t of [-1, 1]) out.push(rod(METAL, corner(s, t, a), corner(s, t, b), 0.016, 6));
  const mid = add(a, scale(sub(b, a), 0.5));
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  out.push(
    face(DARK, add(mid, scale(up, hz - 0.01)), up, dir, len * 0.94, hx * 1.8, 0.008),
    face(panel, add(mid, scale(up, hz + 0.01)), up, dir, len * 0.7, hx * 1.15, 0.012),
    face(panel, add(mid, scale(side, hx + 0.008)), side, dir, len * 0.7, hz * 1.3, 0.01),
    face(DARK, add(mid, scale(side, -hx - 0.008)), scale(side, -1), dir, len * 0.7, hz * 1.3, 0.01),
    strip(corner(1, 1, a), corner(1, 1, b), up, 0.02),
    strip(corner(-1, 1, a), corner(-1, 1, b), up, 0.02),
    rod(DARK, corner(1, 1, a), corner(-1, 1, b), 0.01, 5),
    rod(DARK, corner(-1, -1, a), corner(1, -1, b), 0.01, 5),
  );
  return out;
}

/** The walker: a latching end at each end of a bent arm, joined by a yellow housing, so it can grip a truss, let go, and grip further along. */
function armConcept(): DroneConcept {
  const elbow: Vec3 = [0, 0.52, 0];
  const wrist: Vec3 = [0.4, 0.98, 0];
  const pieces: Piece[] = [
    ...latch([0, 0.02, 0], [0, -1, 0]),
    ...boxBeam([0, 0.06, 0], [0, 0.5, 0], 0.06, 0.05, WHITE),
    ...place([...frameOf(0.11, 0.1, 0.08, 0.014), ...skin(YELLOW, 0.11, 0.1, 0.08, -0.006, 0.05)], { at: elbow }),
    hoop(YELLOW, 0.1, elbow[1], 0.015, 16, 5),
    ...boxBeam(elbow, wrist, 0.055, 0.045, WHITE),
    ...latch(wrist, unit(sub(wrist, elbow))),
  ];
  return { id: "arm", pieces, mouth: [wrist[0], wrist[1], 0] };
}

/**
 * The three machines, in the order a yard would own them: many ring drones, a few tugs, a few arms.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.map((make) => make().id).join(","));
 * ```
 */
export const DRONE_CONCEPTS: readonly (() => DroneConcept)[] = [ringConcept, tugConcept, armConcept];

/**
 * One concept by its id.
 *
 * @param id `ring`, `tug` or `arm`.
 * @returns That machine.
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const ring = droneConcept("ring");
 * console.log(ring.id, ring.mouth[1] > 0);
 * ```
 */
export function droneConcept(id: DroneConcept["id"]): DroneConcept {
  const found = DRONE_CONCEPTS.map((make) => make()).find((concept) => concept.id === id);
  if (!found) throw new Error(`no drone ${id}`);
  return found;
}
