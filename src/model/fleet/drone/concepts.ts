// Three concepts for the SPX construction drone. Each is a framed body: grey members, white panels set in behind them, orange only on a small access hatch. Thrusters are quads of small nozzles at the corners. The beam leaves a projector: a finned collar, a ring and a lens.
import type { MaterialName } from "../../materials.ts";
import type { Frame, Piece, Vec3 } from "../../pieces.ts";
import { disc, hoop, lamps, place, post, rod } from "../detail.ts";

/** How far the lens sits ahead of the projector's base. The beam starts there. */
const LENS = 0.11;

const WHITE = "hull-white" satisfies MaterialName;
const ORANGE = "hull-orange" satisfies MaterialName;
const DARK = "hull-grey-dark" satisfies MaterialName;
const METAL = "hull-grey" satisfies MaterialName;
const GLASS = "glass-clear" satisfies MaterialName;

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A panel. `uDir` is the direction of `wide`; `tall` runs across that and the outward normal. */
function face(material: MaterialName, centre: Vec3, normal: Vec3, uDir: Vec3, wide: number, tall: number, thick = 0.01): Piece {
  const n = unit(normal);
  const u = unit(uDir);
  const frame: Frame = { o: centre, u, v: cross(n, u), w: n };
  return { kind: "plate", material, frame, outline: [[-wide / 2, -tall / 2], [wide / 2, -tall / 2], [wide / 2, tall / 2], [-wide / 2, tall / 2]], thickness: thick, plain: true, only: "mesh" };
}

/** Twelve round members, one along each edge of a box. The panels sit in behind them. */
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

/** White panels set back from the frame, one on each face. */
function skin(hx: number, hy: number, hz: number, sink = 0.02): Piece[] {
  const gap = 0.055;
  return [
    face(WHITE, [0, hy - sink, 0], [0, 1, 0], [1, 0, 0], hx * 2 - gap, hz * 2 - gap),
    face(WHITE, [0, -hy + sink, 0], [0, -1, 0], [1, 0, 0], hx * 2 - gap, hz * 2 - gap),
    face(WHITE, [hx - sink, 0, 0], [1, 0, 0], [0, 1, 0], hy * 2 - gap, hz * 2 - gap),
    face(WHITE, [-hx + sink, 0, 0], [-1, 0, 0], [0, 1, 0], hy * 2 - gap, hz * 2 - gap),
    face(WHITE, [0, 0, hz - sink], [0, 0, 1], [1, 0, 0], hx * 2 - gap, hy * 2 - gap),
    face(WHITE, [0, 0, -hz + sink], [0, 0, -1], [1, 0, 0], hx * 2 - gap, hy * 2 - gap),
  ];
}

/** Four small nozzles in a square, opening aft from a face at `y`. */
function quad(x: number, z: number, y: number, size = 1, dir: -1 | 1 = -1): Piece[] {
  const step = 0.02 * size;
  const open = y + dir * 0.032 * size;
  const nozzles = [-step, step].flatMap((dx) => [-step, step].map((dz) => post(DARK, [x + dx, z + dz], 0.006 * size, y, 0.013 * size, open, 6)));
  const pad = dir < 0 ? y - 0.008 * size : y;
  return [disc(METAL, [x, z], 0.046 * size, pad, 0.008 * size, 8), ...nozzles];
}

/** A projector: a body, a finned heat-sink collar, a ring and a glass lens. It points forward. */
function projector(): Piece[] {
  const fins: Piece = { kind: "lathe", material: DARK, segs: 32, flutes: 8, flute: 0.01, only: "mesh", profile: [[0.055, 0.02], [0.055, 0.08]] };
  return [
    post(METAL, [0, 0], 0.05, 0, 0.05, 0.09, 12),
    fins,
    hoop("coil-lit", 0.046, LENS, 0.007, 12, 5),
    disc(GLASS, [0, 0], 0.034, LENS - 0.01, 0.006, 10),
  ];
}

/** The projector moved so its lens is at `at`. */
function emitter(at: Vec3): { pieces: Piece[]; mouth: Vec3 } {
  return { pieces: place(projector(), { at: [at[0], at[1] - LENS, at[2]] }), mouth: at };
}

/** A berthing ring facing ventral, on a short neck, with a centre pin. */
function berth(at: Vec3): Piece[] {
  const centre: Vec3 = [at[0], at[1], at[2] - 0.1];
  const ring: Piece[] = [];
  const r = 0.055;
  for (let i = 0; i < 8; i++) {
    const a = (2 * Math.PI * i) / 8;
    const b = (2 * Math.PI * (i + 1)) / 8;
    ring.push(rod(METAL, [centre[0] + r * Math.cos(a), centre[1] + r * Math.sin(a), centre[2]], [centre[0] + r * Math.cos(b), centre[1] + r * Math.sin(b), centre[2]], 0.006, 5));
  }
  return [rod(DARK, at, centre, 0.012, 6), ...ring, post(METAL, [centre[0], centre[2]], 0.008, centre[1] - 0.02, 0.008, centre[1] + 0.02, 6)];
}

/** A rail on two standoffs, a camera, a small solar patch and an orange hatch. */
function fittings(rail: readonly [Vec3, Vec3], cameraAt: Vec3, solarAt: Vec3, hatchAt: Vec3, hatchNormal: Vec3): Piece[] {
  const mid: Vec3 = [(rail[0][0] + rail[1][0]) / 2, (rail[0][1] + rail[1][1]) / 2, (rail[0][2] + rail[1][2]) / 2];
  const foot: Vec3 = [mid[0] * 0.92, mid[1], mid[2] * 0.92];
  return [
    rod(METAL, rail[0], rail[1], 0.007, 5),
    rod(DARK, rail[0], [rail[0][0] * 0.9, rail[0][1], rail[0][2] * 0.9], 0.005, 4),
    rod(DARK, rail[1], [rail[1][0] * 0.9, rail[1][1], rail[1][2] * 0.9], 0.005, 4),
    rod(DARK, mid, foot, 0.005, 4),
    face(DARK, cameraAt, [1, 0, 0], [0, 1, 0], 0.04, 0.04, 0.016),
    face(GLASS, [cameraAt[0] + 0.012, cameraAt[1], cameraAt[2]], [1, 0, 0], [0, 1, 0], 0.018, 0.018, 0.004),
    face("hull-dawn", solarAt, [0, 0, 1], [1, 0, 0], 0.12, 0.07, 0.006),
    face(ORANGE, hatchAt, hatchNormal, [0, 1, 0], 0.08, 0.05, 0.008),
    ...lamps([
      { at: [0.08, cameraAt[1], 0.06], colour: "amber", size: 0.028 },
      { at: [-0.08, cameraAt[1], 0.06], colour: "amber", size: 0.028 },
    ]),
  ];
}

/**
 * One concept: its pieces, and the point the beam leaves from.
 *
 * @example
 * ```ts
 * import { droneConcept } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const box = droneConcept("box");
 * console.log(box.pieces.length > 20, box.mouth[1] > 0);
 * ```
 */
export interface DroneConcept {
  id: "box" | "long" | "pod";
  pieces: Piece[];
  /** Centre of the lens the beam starts in, in metres. */
  mouth: Vec3;
}

/** A cube, framed, with a thruster quad at each corner and the projector on the nose. */
function boxConcept(): DroneConcept {
  const hx = 0.32;
  const hy = 0.3;
  const hz = 0.32;
  const emit = emitter([0, hy + 0.12, 0]);
  const aft = [-0.18, 0.18].flatMap((x) => [-0.18, 0.18].map((z) => quad(x, z, -hy, 2)));
  const nose = [-0.17, 0.17].flatMap((x) => [-0.17, 0.17].map((z) => quad(x, z, hy, 1.6, 1)));
  return {
    id: "box",
    mouth: emit.mouth,
    pieces: [
      ...frameOf(hx, hy, hz),
      ...skin(hx, hy, hz),
      ...emit.pieces,
      ...berth([0, -0.04, -hz]),
      ...fittings([[hx + 0.03, -0.12, hz - 0.04], [hx + 0.03, 0.14, hz - 0.04]], [hx + 0.01, 0.02, 0.08], [0.06, 0.1, hz + 0.012], [hx + 0.012, -0.08, 0], [1, 0, 0]),
      ...aft.flat(),
      ...nose.flat(),
    ],
  };
}

/** A long body. Quads at the tail, the berthing ring at the nose, the projector hung below. */
function longConcept(): DroneConcept {
  const hx = 0.2;
  const hy = 0.78;
  const hz = 0.17;
  const emit = emitter([0, 0.2, -hz - 0.16]);
  const tail = [-0.1, 0.1].flatMap((x) => [-0.08, 0.08].map((z) => quad(x, z, -hy, 1.8)));
  return {
    id: "long",
    mouth: emit.mouth,
    pieces: [
      ...frameOf(hx, hy, hz, 0.014),
      ...skin(hx, hy, hz),
      ...emit.pieces,
      rod(DARK, [0, 0.2, -hz], [0, 0.2, -hz - 0.1], 0.014, 6),
      ...berth([0, hy - 0.12, -hz]),
      ...fittings([[hx + 0.03, -0.3, 0.04], [hx + 0.03, 0.4, 0.04]], [hx + 0.01, 0.35, 0], [0.04, 0.1, hz + 0.012], [hx + 0.012, -0.15, 0], [1, 0, 0]),
      ...tail.flat(),
    ],
  };
}

/** A pod: a rounded shell in a hoop frame, quads round the tail, the projector on the nose. */
function podConcept(): DroneConcept {
  const emit = emitter([0, 0.45, 0]);
  const shell: Piece = {
    kind: "lathe",
    material: WHITE,
    segs: 16,
    only: "mesh",
    profile: [[0.04, -0.34], [0.26, -0.16], [0.26, 0.16], [0.04, 0.34]],
  };
  const quads = [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    return quad(0.15 * Math.sin(a), 0.15 * Math.cos(a), -0.22, 1.15);
  });
  return {
    id: "pod",
    mouth: emit.mouth,
    pieces: [
      shell,
      hoop(METAL, 0.27, -0.02, 0.012, 16, 5),
      hoop(METAL, 0.27, 0.12, 0.012, 16, 5),
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => rod(METAL, [0.2 * x, -0.16, 0.2 * z], [0.2 * x, 0.16, 0.2 * z], 0.01, 5))),
      ...emit.pieces,
      ...berth([0, -0.02, -0.26]),
      face(ORANGE, [0.275, 0.02, 0.06], [1, 0, 0], [0, 1, 0], 0.06, 0.045, 0.008),
      face("hull-dawn", [0, 0.02, 0.275], [0, 0, 1], [1, 0, 0], 0.09, 0.05, 0.006),
      face(DARK, [0.275, 0.12, -0.02], [1, 0, 0], [0, 1, 0], 0.035, 0.035, 0.014),
      face(GLASS, [0.286, 0.12, -0.02], [1, 0, 0], [0, 1, 0], 0.016, 0.016, 0.004),
      ...lamps([{ at: [0.12, 0.18, 0.16], colour: "amber", size: 0.024 }, { at: [-0.12, 0.18, 0.16], colour: "amber", size: 0.024 }]),
      ...quads.flat(),
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
