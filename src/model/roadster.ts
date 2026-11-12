// The Roadster in plain shapes for the line looks, and Starman in every look. The car's length, wheelbase, wheels and seat are measured from each licensed model at its sourced scale; the painted look is the
// model. Starman is this package's own: a seated figure in a white suit with dark trim, a white helmet with a dark visor, his right hand on the wheel and his left arm on the door. He shares the car's origin
// (the middle of the car on the ground), so he sits in its seat in any build that places the two together.
import { ROADSTER_FLIGHT } from "../data/roadster.ts";
import { blank } from "../data/types.ts";
import { centreCore } from "./falcon.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild, StackPart } from "./stacks.ts";

/** One car as measured from its model, in metres: nose towards +Z, on the ground at y = 0. */
export interface CarDraw {
  /** Nose to tail, and across. */
  length: number;
  width: number;
  /** The top of the windscreen. */
  height: number;
  /** The wheels: their middles along the car, their radius and how far each stands from the middle. */
  front: number;
  rear: number;
  wheel: number;
  track: number;
  /** The top of the doors. */
  belt: number;
  /** Where the windscreen meets the body, along the car. */
  screen: number;
  /** The driver's hip, in the left seat: across, up and along. */
  seat: Vec3;
  /** The middle of the steering wheel. */
  wheelAt: Vec3;
}

export const ROADSTER_DRAWS: Readonly<Record<string, CarDraw>> = {
  "first-generation": { length: 3.946, width: 1.85, height: 1.03, front: 1.114, rear: -1.258, wheel: 0.3, track: 1.46, belt: 0.8, screen: 0.95, seat: [0.29, 0.34, -0.22], wheelAt: [0.29, 0.62, 0.37] },
  "second-generation": { length: 4.47, width: 1.83, height: 1.14, front: 1.417, rear: -1.408, wheel: 0.31, track: 1.52, belt: 0.84, screen: 0.75, seat: [0.32, 0.22, -0.18], wheelAt: [0.32, 0.58, 0.3] },
  "second-generation-2": { length: 4.28, width: 1.86, height: 1.07, front: 1.398, rear: -1.429, wheel: 0.31, track: 1.58, belt: 0.8, screen: 0.7, seat: [0.32, 0.17, -0.2], wheelAt: [0.32, 0.55, 0.28] },
};

const side = (d: CarDraw): readonly (readonly [number, number])[] => {
  const nose = d.length / 2;
  return [
    [-nose, 0.22],
    [-d.length * 0.16, 0.14],
    [nose * 0.8, 0.14],
    [nose, 0.32],
    [nose * 0.92, 0.6],
    [d.screen, d.belt - 0.02],
    [-nose * 0.9, d.belt + 0.04],
    [-nose, 0.62],
  ];
};

const octagon = (r: number): (readonly [number, number])[] => Array.from({ length: 12 }, (_, i) => [Math.cos((i * Math.PI) / 6) * r, Math.sin((i * Math.PI) / 6) * r] as const);

/** The car: its body seen from the side and pressed to its width, its cockpit open, the windscreen and the four wheels. */
export function carPieces(d: CarDraw): Piece[] {
  const half = d.width / 2;
  const pieces: Piece[] = [{ kind: "plate", material: "red", frame: { o: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0], w: [1, 0, 0] }, outline: side(d), thickness: d.width - 0.06 }];
  // the open cockpit, dark, sunk into the top of the body
  pieces.push({ kind: "plate", material: "dark", frame: { o: [0, d.belt + 0.005, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline: [[-half + 0.2, -0.75], [half - 0.2, -0.75], [half - 0.2, d.screen - 0.05], [-half + 0.2, d.screen - 0.05]], thickness: 0.01, plain: true });
  // the windscreen, leaning back from the scuttle
  const lean = 0.55;
  const rise = d.height - d.belt;
  const up: Vec3 = [0, Math.cos(lean), -Math.sin(lean)];
  pieces.push({ kind: "plate", material: "glass", frame: { o: [0, d.belt, d.screen], u: [1, 0, 0], v: up, w: [0, Math.sin(lean), Math.cos(lean)] }, outline: [[-half + 0.18, 0], [half - 0.18, 0], [half - 0.26, rise / Math.cos(lean)], [-half + 0.26, rise / Math.cos(lean)]], thickness: 0.012 });
  for (const z of [d.front, d.rear])
    for (const s of [1, -1]) {
      const x = (s * d.track) / 2;
      pieces.push({ kind: "plate", material: "black", frame: { o: [x, d.wheel, z], u: [0, 0, 1], v: [0, 1, 0], w: [1, 0, 0] }, outline: octagon(d.wheel), thickness: 0.24 });
      pieces.push({ kind: "plate", material: "fin-dark", frame: { o: [x + s * 0.121, d.wheel, z], u: [0, 0, 1], v: [0, 1, 0], w: [1, 0, 0] }, outline: octagon(d.wheel * 0.62), thickness: 0.01, plain: true });
    }
  return pieces;
}

const at = (p: Vec3, dx: number, dy: number, dz: number): Vec3 => [p[0] + dx, p[1] + dy, p[2] + dz];

/** Starman in the driver's seat: legs forward to the pedals, his back against the seat, his right hand on the wheel, his left arm along the top of the door. */
export function starmanPieces(d: CarDraw): Piece[] {
  const hip = d.seat;
  const shoulder = at(hip, 0, 0.52, -0.1);
  const knee = at(hip, 0, 0.12, 0.44);
  // the feet on the floor, which is never under the ground
  const foot: Vec3 = [hip[0], Math.max(0.12, hip[1] - 0.18), hip[2] + 0.86];
  const right = at(shoulder, -0.19, 0, 0);
  const left = at(shoulder, 0.19, 0, 0);
  const door: Vec3 = [Math.min(d.width / 2 - 0.08, hip[0] + 0.42), d.belt + 0.05, hip[2] + 0.12];
  const pieces: Piece[] = [
    // the torso, leaning back with the seat
    { kind: "lathe", material: "white", segs: 16, at: [hip[0], hip[2]], lean: [0, -0.19], profile: [[0.14, hip[1]], [0.18, hip[1] + 0.22], [0.19, shoulder[1] - 0.06], [0.1, shoulder[1] + 0.04]] },
    // the helmet, white, round, with its dark visor facing the road
    { kind: "lathe", material: "white", segs: 20, at: [shoulder[0], shoulder[2] - 0.02], profile: [[0.07, shoulder[1] + 0.04], [0.15, shoulder[1] + 0.13], [0.155, shoulder[1] + 0.22], [0.12, shoulder[1] + 0.31], [0.001, shoulder[1] + 0.35]] },
    { kind: "plate", material: "glass", frame: { o: [shoulder[0], shoulder[1] + 0.2, shoulder[2] + 0.12], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-0.1, -0.06], [0.1, -0.06], [0.11, 0.05], [-0.11, 0.05]], thickness: 0.04, plain: true },
    // a dark ring where the helmet meets the suit
    { kind: "lathe", material: "black", segs: 16, at: [shoulder[0], shoulder[2] - 0.02], profile: [[0.12, shoulder[1] + 0.01], [0.12, shoulder[1] + 0.06]], only: "mesh" },
  ];
  for (const s of [-1, 1]) {
    const h = at(hip, s * 0.1, 0, 0);
    const k = at(knee, s * 0.1, 0, 0);
    const f = at(foot, s * 0.1, 0, 0);
    pieces.push(strut("white", h, k, 0.15, 0.15), strut("white", k, f, 0.13, 0.13), strut("black", f, at(f, 0, 0.02, 0.1), 0.12, 0.14));
  }
  // his right hand on the wheel's rim, his left arm on the door top
  const hand = at(d.wheelAt, -0.12, 0.04, -0.03);
  const elbowR = at(right, -0.02, -0.22, 0.2);
  const elbowL = at(left, 0.12, -0.2, 0.05);
  pieces.push(strut("white", right, elbowR, 0.11, 0.11), strut("white", elbowR, hand, 0.1, 0.1), strut("black", hand, at(hand, 0, 0, 0.06), 0.09, 0.09));
  pieces.push(strut("white", left, elbowL, 0.11, 0.11), strut("white", elbowL, door, 0.1, 0.1), strut("black", door, at(door, 0, 0, 0.07), 0.09, 0.09));
  return pieces;
}

const FILES: Readonly<Record<string, { file: string; credit: "the86guy-roadster" | "metarex4d-roadster" | "gmmichaelonearth-roadster"; also?: readonly "minchou19-wheels"[] }>> = {
  "first-generation": { file: "roadster-first-generation-car.glb", credit: "the86guy-roadster" },
  "second-generation": { file: "roadster-second-generation-car.glb", credit: "metarex4d-roadster" },
  "second-generation-2": { file: "roadster-second-generation-2-car.glb", credit: "gmmichaelonearth-roadster", also: ["minchou19-wheels"] },
};

const STARMAN_NAME = "Starman, a mannequin in a pressure suit";

const carPart = (variant: string, place?: StackPart["place"]): StackPart => {
  const d = ROADSTER_DRAWS[variant];
  return { slot: "car", kind: "payload", name: variant === "first-generation" ? "The Roadster, first generation" : "The Roadster, second generation", height: d.height, diameter: d.width, sourcedDiameter: blank(`Its width as drawn: the model at its sourced scale is ${d.width} m across.`), painted: FILES[variant], ...(place ? { place } : {}), pieces: () => carPieces(d) };
};
const starmanPart = (variant: string, place: NonNullable<StackPart["place"]>): StackPart => {
  const d = ROADSTER_DRAWS[variant];
  return { slot: "starman", kind: "payload", name: STARMAN_NAME, height: d.seat[1] + 0.87, diameter: 0.6, sourcedDiameter: blank("No source read here gives Starman's size."), place, pieces: () => starmanPieces(d) };
};

const FROM = (variant: string) =>
  variant === "first-generation"
    ? "The 86 guy's model for the painted look, with its badges and roof left off and its bonnet made bare carbon; this package's plain shapes for the line looks, measured from it at the sourced length. Starman is this package's own in every look."
    : "Its author's model for the painted look, with its badges left off, painted the first generation's red; this package's plain shapes for the line looks, measured from it at the sourced wheelbase. Starman is this package's own in every look.";

/** Where the payload stands in Falcon Heavy: 0.8 m above where its fairing begins (the fairing's sourced 13.1 m under the 70 m top), clear of the fairing's walls. The 0.8 m is a placing, not a figure. */
export const FALCON_HEAVY_PAYLOAD_Y = 70 - 13.1 + 0.8;

export const ROADSTER_BUILDS: readonly StackBuild[] = [
  ...Object.keys(ROADSTER_DRAWS).map((variant) => ({ rocket: "roadster", variant, drawnFrom: FROM(variant), parts: [carPart(variant), starmanPart(variant, { x: 0, z: 0 })] })),
  {
    rocket: "falcon-heavy",
    variant: ROADSTER_FLIGHT.id,
    drawnFrom: "Antonio_Adams's low-poly Falcon Heavy and the 86 guy's Roadster for the painted look, this package's plain shapes for the line looks. Starman is this package's own in every look.",
    parts: [
      // the same vehicle as Falcon Heavy's own, on its first flight: its centre core is its own part here, so the test flight is reached from its own foot
      { slot: "centre", kind: "first-stage", name: "Falcon Heavy centre core, with its upper stage and fairing", height: 70, diameter: 5.2, sourcedDiameter: blank("3.7 m the core; 5.2 m the fairing."), painted: { file: "falcon-heavy-falcon-heavy-centre.glb", credit: "antonio-falcon-heavy" }, pieces: () => centreCore(70, 1.85) },
      carPart("first-generation", { x: 0, z: 0, y: FALCON_HEAVY_PAYLOAD_Y }),
      starmanPart("first-generation", { x: 0, z: 0, y: FALCON_HEAVY_PAYLOAD_Y }),
    ],
  },
];
