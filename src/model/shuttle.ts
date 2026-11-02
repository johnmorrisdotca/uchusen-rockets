// The Space Shuttle from a table of numbers: the tank's, the boosters' and the orbiter's lengths and widths are sourced, as are the RS-25's. The orbiter's outline and how the parts stand are judged from photographs.
import { ORBITER_SPAN, SHUTTLE_SRB_DIAMETER, SHUTTLE_TANK_DIAMETER } from "../data/shuttle.ts";
import { merlin } from "./falcon.ts";
import { floor, nose, taper, tube } from "./kit.ts";
import type { Frame, Piece, Plate, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const WHOLE = 56;
const TANK = 46.88;
const TANK_R = 8.41 / 2;
const TANK_Y = WHOLE - TANK;
const SRB = 45.46;
const SRB_R = 3.71 / 2;
const SRB_X = TANK_R + SRB_R + 0.65;
const ORB = 37.24;
const ORB_R = 2.7;
const ORB_Y = 8.2;
const ORB_Z = -(TANK_R + 0.9 + 2.2);
// the engine's sourced length and exit, 168 and 90.7 inches
const RS25_LONG = 168 * 0.0254;
const RS25_EXIT = (90.7 * 0.0254) / 2;

function tank(): Piece[] {
  const r = TANK_R;
  const top: [number, number][] = [];
  const from = TANK - 19;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    top.push([r * Math.sqrt(Math.max(0, 1 - t ** 2.4)), from + 19 * t]);
  }
  top[12] = [0.001, TANK];
  const orbiterSide: Vec3 = [0, 0, -r];
  const hold = (y: number, x: number): Plate => strut("foam", [x, y, orbiterSide[2]], [x, y, orbiterSide[2] - 0.9], 0.4, 0.4);
  return [
    { kind: "lathe", material: "foam", segs: 48, body: true, outline: true, profile: [[0.001, 0], [r * 0.55, 0.45], [r * 0.85, 1.5], [r, 3.4], [r, from], ...top.slice(1)], rings: [from, from - 7], welds: [10, 19] },
    // the pipe that runs down its side, and the rods that hold the orbiter
    { kind: "plate", material: "foam", frame: { o: [0.9, 2, -r], u: [0, 1, 0], v: [-1, 0, 0], w: [0, 0, -1] }, outline: [[0, 0], [TANK - 6, 0], [TANK - 6, 0.5], [0, 0.5]], thickness: 0.5, plain: true },
    hold(3, 1.6),
    hold(3, -1.6),
    hold(27, 0),
  ];
}

function booster(): Piece[] {
  const r = SRB_R;
  const shoulder = SRB - 7.4;
  return [
    taper("white", r * 1.4, 1, r, 3.8, { rings: [1.02] }),
    { kind: "lathe", material: "soot", segs: 30, under: true, profile: [[0, 1], [r * 1.4, 1]] },
    tube("white", r, 3.8, shoulder, { rings: [3.82, 12, 20, 28, shoulder - 0.02], welds: [8, 16, 24, 32] }),
    taper("white", r, shoulder, r * 0.5, SRB - 1.4, { rings: [SRB - 4.5] }),
    nose("white", r * 0.5, SRB - 1.4, SRB, 1.2),
    ...merlin([0, 0], 0, r * 1.02, 3.6),
  ];
}

const FLAT: Frame = { o: [0, 0, 1.3], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] };

function orbiter(): Piece[] {
  const r = ORB_R;
  const base = RS25_LONG * 0.8;
  const span = (ORBITER_SPAN.value ?? 0) / 2;
  const profile: [number, number][] = [[r, base], [r, ORB - 12], [r * 0.98, ORB - 9], [r * 0.88, ORB - 6], [r * 0.66, ORB - 3], [r * 0.38, ORB - 1], [0.16, ORB - 0.2], [0.001, ORB]];
  const belly = (y: number): readonly [number, number] => {
    void y;
    return [-Math.PI * 0.42, Math.PI * 0.42];
  };
  const out: Piece[] = [
    { kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile, rings: [ORB - 12], welds: [base + 10, base + 19] },
    floor(r, base),
    // the black belly and nose, in one shell just proud of the white
    { kind: "lathe", material: "black", segs: 40, body: true, arc: belly, profile: profile.slice(0, 6).map(([a, b]) => [a * 1.012, b] as const) },
    { kind: "lathe", material: "black", segs: 24, body: true, profile: [[r * 0.38 * 1.015, ORB - 1], [0.16 * 1.015, ORB - 0.2], [0.001, ORB + 0.01]] },
    // the windscreen, the payload bay's doors, the tail and the two engine pods
    { kind: "plate", material: "black", frame: { o: [0, ORB - 6.3, -r * 0.8], u: [1, 0, 0], v: [0, 0.94, -0.34], w: [0, -0.34, -0.94] }, outline: [[-1, 0], [1, 0], [0.8, 1.1], [-0.8, 1.1]], thickness: 0.08, plain: true },
    { kind: "lines", weight: "feature", paths: [[[0, base + 3.6, -r - 0.01], [0, ORB - 11, -r - 0.01]], [[-1.95, base + 3.6, -1.9], [-1.95, ORB - 11, -1.9]], [[1.95, base + 3.6, -1.9], [1.95, ORB - 11, -1.9]]] },
    { kind: "plate", material: "white", frame: { o: [0, 0, 0], u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0] }, outline: [[r - 0.2, base], [r + 8, base + 0.2], [r + 8, base + 2.2], [r - 0.2, base + 9.2]], thickness: 0.34 },
    { kind: "plate", material: "black", frame: { o: [0, 0, 0], u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0] }, outline: [[r + 0.1, base + 8.7], [r + 8.02, base + 2.1], [r + 8.02, base + 2.4], [r + 0.1, base + 9.2]], thickness: 0.4, plain: true },
    ...[1, -1].map((side): Piece => ({ kind: "lathe", material: "white", at: [side * 2, -1.9], segs: 14, profile: [[1.05, base + 0.3], [1.05, base + 5.5], [0.82, base + 7.8], [0.3, base + 9.1], [0.001, base + 9.5]], rings: [base + 5.5] })),
    ...merlin([0, -1.7], 0, RS25_EXIT, RS25_LONG),
    ...merlin([-1.35, 0.7], 0, RS25_EXIT, RS25_LONG),
    ...merlin([1.35, 0.7], 0, RS25_EXIT, RS25_LONG),
    // the flap under the engines
    { kind: "plate", material: "black", frame: FLAT, outline: [[-3.2, base - 1.6], [3.2, base - 1.6], [3.2, base + 0.1], [-3.2, base + 0.1]], thickness: 0.4, plain: true },
  ];
  // each wing: white above, black below, its leading edge black. Two plates, so each stays convex
  for (const side of [1, -1]) {
    const main: [number, number][] = [[r - 0.3, base + 0.3], [span, base + 0.3], [span, base + 2], [5.1, base + 12], [r - 0.3, base + 12]];
    const strake: [number, number][] = [[r - 0.3, base + 12], [5.1, base + 12], [r - 0.3, base + 21]];
    const mirrored = (points: [number, number][]) => points.map(([u, v]) => [u * side, v] as const);
    out.push({ kind: "plate", material: "white", top: "black", frame: FLAT, outline: mirrored(main), thickness: 0.6 });
    out.push({ kind: "plate", material: "white", top: "black", frame: FLAT, outline: mirrored(strake), thickness: 0.5 });
    const edge = (a: [number, number], b: [number, number]) => strut("black", [a[0] * side, a[1], FLAT.o[2]], [b[0] * side, b[1], FLAT.o[2]], 0.5, 0.66);
    out.push(edge([span - 0.3, base + 2.4], [5.1, base + 12]), edge([5.1, base + 12], [r - 0.3, base + 21]));
  }
  return out;
}

const FROM = "This package's code, from the sourced lengths and widths. The orbiter's outline and where the parts stand are judged from photographs. No licensed model is used, and no name, flag or mark is drawn.";

export const SHUTTLE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "space-shuttle",
    variant: "discovery",
    drawnFrom: "The Smithsonian's scan for the painted look, its marks painted out; this package's own orbiter for the two line looks, from the same sourced sizes.",
    parts: [{ slot: "orbiter", kind: "orbiter", name: "Discovery, OV-103", height: ORB, diameter: ORBITER_SPAN.value ?? 0, sourcedDiameter: ORBITER_SPAN, painted: { file: "space-shuttle-discovery-orbiter.glb", credit: "smithsonian-discovery" }, pieces: orbiter }],
  },
  {
    rocket: "space-shuttle",
    variant: "stack",
    drawnFrom: FROM,
    parts: [
      { slot: "external-tank", kind: "tank", name: "External tank", height: TANK, diameter: TANK_R * 2, place: { x: 0, z: 0, y: TANK_Y }, sourcedDiameter: SHUTTLE_TANK_DIAMETER, pieces: tank },
      { slot: "srb-left", kind: "solid-booster", name: "Solid rocket booster, left", height: SRB, diameter: SRB_R * 2, place: { x: -SRB_X, z: 0 }, sourcedDiameter: SHUTTLE_SRB_DIAMETER, pieces: booster },
      { slot: "srb-right", kind: "solid-booster", name: "Solid rocket booster, right", height: SRB, diameter: SRB_R * 2, place: { x: SRB_X, z: 0 }, sourcedDiameter: SHUTTLE_SRB_DIAMETER, pieces: booster },
      { slot: "orbiter", kind: "orbiter", name: "Orbiter", height: ORB, diameter: (ORBITER_SPAN.value ?? 0), place: { x: 0, z: ORB_Z, y: ORB_Y }, sourcedDiameter: ORBITER_SPAN, pieces: orbiter },
    ],
  },
];
