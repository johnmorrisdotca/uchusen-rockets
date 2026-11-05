// Three concepts for the SPX construction drone, drawn from the kit at a small scale. Each one is a white body with a little orange on the panels that come off, work lights, a docking foot, and a nozzle that flares into a ring. The carry's beam starts at that ring. The shapes follow free-flying craft and servicing nozzles; none of them is a copy.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { annulus, beam, box, hoop, lamps, place, post } from "../detail.ts";

/** How far the ring sits ahead of the nozzle's throat, in metres. The beam starts there. */
const RING = 0.22;

const WHITE = "hull-white" satisfies MaterialName;
const ORANGE = "hull-orange" satisfies MaterialName;
const DARK = "hull-grey-dark" satisfies MaterialName;
const METAL = "hull-grey" satisfies MaterialName;

/** A flared nozzle with a lit ring at the mouth and a darker ring inside it, plus a work light on each side. It points forward, along +Y. */
function nozzle(): Piece[] {
  return [
    annulus(DARK, 0.04, 0.08, 0, 0.04, 10),
    post(METAL, [0, 0], 0.08, 0.04, 0.18, RING, 16),
    hoop("coil-lit", 0.18, RING, 0.022, 14, 5),
    hoop(DARK, 0.09, 0.16, 0.01, 12, 5),
  ];
}

/** A thruster bell on the tail face, opening aft. `x` and `z` are where it meets the face; `yFace` is that face. */
function aftBell(x: number, z: number, yFace: number, size = 1): Piece[] {
  const lip = yFace - 0.16 * size;
  return [
    post(DARK, [x, z], 0.04 * size, yFace, 0.085 * size, lip, 10),
    hoop(METAL, 0.085 * size, lip, 0.014 * size, 10, 5, { at: [x, z] }),
  ];
}

/** A work light: a dark housing and an amber lens, standing forward from a face. */
function workLight(x: number, y: number, z: number, size = 0.05): Piece[] {
  return [post(DARK, [x, z], size * 0.9, y, size * 0.9, y + size * 0.7, 8), ...lamps([{ at: [x, y + size * 0.55, z], colour: "amber", size }])];
}

/** A docking foot: a neck and a wide shoe, hanging to ventral, so it can sit in a berth. */
function shoe(at: Vec3): Piece[] {
  const neck: Vec3 = [at[0], at[1], at[2] - 0.2];
  const end: Vec3 = [at[0], at[1], at[2] - 0.32];
  return [beam(DARK, at, neck, 0.1, 0.08), beam(METAL, [at[0], at[1] - 0.03, neck[2]], [at[0], at[1] - 0.03, end[2]], 0.32, 0.18)];
}

/** The nozzle set so its ring is at `at`, and the point the beam leaves from. */
function emitter(at: Vec3): { pieces: Piece[]; mouth: Vec3 } {
  return { pieces: place(nozzle(), { at: [at[0], at[1] - RING, at[2]] }), mouth: at };
}

/**
 * One concept: its pieces, and the point the beam leaves from.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const box = droneConcept("box");
 * console.log(box.pieces.length > 8, box.mouth[1] > 0);
 * ```
 */
export interface DroneConcept {
  id: "box" | "long" | "pod";
  pieces: Piece[];
  /** Centre of the ring the beam starts in, in metres. */
  mouth: Vec3;
}

/** A compact body in the manner of a station free-flyer: the nozzle on the nose, the foot under the belly, four bells on the tail. */
function boxConcept(): DroneConcept {
  const emit = emitter([0, 0.48, 0]);
  const aft = [-0.16, 0.16].flatMap((x) => [-0.16, 0.16].map((z) => aftBell(x, z, -0.4)));
  return {
    id: "box",
    mouth: emit.mouth,
    pieces: [
      box(WHITE, [0, -0.4, 0], 0.7, 0.7, 0.62),
      beam(ORANGE, [0, -0.22, 0.37], [0, 0.12, 0.37], 0.035, 0.46),
      beam(ORANGE, [0.37, -0.18, 0], [0.37, 0.08, 0], 0.4, 0.03),
      ...emit.pieces,
      ...workLight(0.2, 0.22, 0.16),
      ...workLight(-0.2, 0.22, 0.16),
      ...shoe([0, -0.05, -0.35]),
      ...aft.flat(),
    ],
  };
}

/** A longer servicing body: thrusters at the tail, the foot at the nose, the nozzle slung under the belly and still pointing forward. */
function longConcept(): DroneConcept {
  const emit = emitter([0, 0.42, -0.52]);
  return {
    id: "long",
    mouth: emit.mouth,
    pieces: [
      box(WHITE, [0, -1.0, 0], 0.46, 0.4, 1.7),
      beam(ORANGE, [0, -0.4, 0.22], [0, 0.4, 0.22], 0.03, 0.3),
      beam(ORANGE, [0.25, -0.2, 0], [0.25, 0.35, 0], 0.22, 0.025),
      beam(METAL, [0.2, -0.85, -0.18], [0.2, 0.55, -0.18], 0.025, 0.04),
      ...emit.pieces,
      beam(DARK, [0, 0.2, -0.2], [0, 0.2, -0.46], 0.07, 0.1),
      ...workLight(0.12, 0.7, 0.08, 0.07),
      ...workLight(-0.12, 0.7, 0.08, 0.07),
      ...shoe([0, 0.55, -0.2]),
      ...aftBell(0.12, 0, -1.0, 1.15),
      ...aftBell(-0.12, 0, -1.0, 1.15),
    ],
  };
}

/** A pod with a thruster at each corner, the foot below and the nozzle on the nose. */
function podConcept(): DroneConcept {
  const emit = emitter([0, 0.62, 0]);
  const body: Piece = {
    kind: "lathe",
    material: WHITE,
    segs: 14,
    only: "mesh",
    profile: [
      [0.02, -0.4],
      [0.3, -0.2],
      [0.3, 0.22],
      [0.02, 0.42],
    ],
  };
  return {
    id: "pod",
    mouth: emit.mouth,
    pieces: [
      body,
      annulus(ORANGE, 0.3, 0.33, -0.04, 0.12, 14),
      ...emit.pieces,
      ...workLight(0.1, 0.28, 0.12),
      ...workLight(-0.1, 0.28, 0.12),
      ...shoe([0, 0.02, -0.33]),
      ...aftBell(0.12, 0.12, -0.28, 0.85),
      ...aftBell(-0.12, 0.12, -0.28, 0.85),
      ...aftBell(0.12, -0.12, -0.28, 0.85),
      ...aftBell(-0.12, -0.12, -0.28, 0.85),
    ],
  };
}

/**
 * The three concepts, in the order they are shown.
 *
 * @example
 * ```ts
 * import { DRONE_CONCEPTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_CONCEPTS.length === 3);
 * ```
 */
export const DRONE_CONCEPTS = [boxConcept, longConcept, podConcept] as const;

/**
 * One concept by name.
 *
 * @param id `box`, `long` or `pod`.
 * @returns Its pieces and the point the beam leaves from.
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(droneConcept("pod").id === "pod");
 * ```
 */
export function droneConcept(id: DroneConcept["id"]): DroneConcept {
  const found = DRONE_CONCEPTS.map((make) => make()).find((concept) => concept.id === id);
  if (!found) throw new Error(`${id} is not a drone concept`);
  return found;
}
