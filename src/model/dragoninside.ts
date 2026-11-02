// Inside Crew Dragon: the capsule cut open down its middle, at Dragon 2's sourced sizes. Four seats and the three-screen panel over the two centre seats are sourced, with the cargo below them; where each sits and its size are judged from one published picture of the cabin. For scale, a plain person of 1.8 m, not a fact about anyone.
import { DRAGON_DRAWS } from "./falcon.ts";
import { deg } from "../framing.ts";
import type { MaterialName } from "./materials.ts";
import { type Lathe, type Piece, strut, type Vec3 } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const d = DRAGON_DRAWS["dragon-2"];
const H = d.capsule;
const R = d.baseRadius;
const N = d.nest;
const SHOULDER = H * 0.74;
const OUTER: readonly (readonly [number, number])[] = [[R * 0.9, N], [R, N + 0.3], [R * 0.93, N + 0.7], [R * 0.5, SHOULDER], [R * 0.47, H * 0.84], [R * 0.3, H * 0.95], [0.001, H]];
const BACK = (): readonly [number, number] => [deg(90), deg(270)];
const FLOOR_Y = N + 0.75;

const shell = (profile: readonly (readonly [number, number])[], material: MaterialName, extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, segs: 48, body: true, arc: BACK, profile, ...extra });
const box = (material: MaterialName, a: Vec3, b: Vec3, width: number, depth: number): Piece => strut(material, a, b, width, depth, { plain: false });

function seat(x: number, y: number, z: number): Piece[] {
  return [
    box("white", [x, y, z - 0.3], [x, y + 0.82, z - 0.62], 0.58, 0.1),
    box("black", [x, y + 0.02, z - 0.28], [x, y + 0.08, z + 0.26], 0.54, 0.12),
    box("black", [x, y + 0.72, z - 0.5], [x, y + 0.84, z - 0.54], 0.3, 0.14),
  ];
}

/** A plain person for scale, standing. */
function person(x: number, y: number, z: number): Piece[] {
  const tall = 1.8;
  const head = 0.12;
  const at: [number, number] = [x, z];
  return [
    { kind: "lathe", material: "engine-pale", at, segs: 12, profile: [[0.14, y], [0.2, y + tall * 0.5], [0.23, y + tall * 0.8], [0.09, y + tall - 2 * head]] },
    { kind: "lathe", material: "engine-pale", at, segs: 12, profile: [[0.001, y + tall - 2 * head], [head * 0.72, y + tall - 1.72 * head], [head, y + tall - head], [head * 0.72, y + tall - 0.28 * head], [0.001, y + tall]] },
  ];
}

function inside(): Piece[] {
  const inner = OUTER.map(([r, y]) => [Math.max(0.001, r * 0.93), y + 0.03] as const).reverse();
  const out: Piece[] = [
    shell(OUTER, "white", { outline: true, rings: [N + 0.3, SHOULDER] }),
    // the inner wall, seen through the cut
    shell(inner, "engine-pale"),
    { kind: "lathe", material: "soot", segs: 40, under: true, profile: [[0, 0], [R * 0.72, 0], [R * 0.9, N]], rings: [N] },
    // the floor and the cut edge of the shell
    { kind: "lathe", material: "dark", segs: 40, body: true, profile: [[R * 0.86, FLOOR_Y], [0.001, FLOOR_Y]] },
    // the cargo under the centre seats
    box("engine-pale", [-0.55, FLOOR_Y, 0.1], [-0.55, FLOOR_Y + 0.5, 0.1], 0.5, 0.55),
    box("engine-metal", [0, FLOOR_Y, 0.15], [0, FLOOR_Y + 0.46, 0.15], 0.4, 0.55),
    box("engine-pale", [0.55, FLOOR_Y, 0.1], [0.55, FLOOR_Y + 0.5, 0.1], 0.5, 0.55),
    // the two centre seats, higher, and the outer two
    ...seat(-0.34, FLOOR_Y + 0.72, -0.15),
    ...seat(0.34, FLOOR_Y + 0.72, -0.15),
    ...seat(-1.02, FLOOR_Y + 0.42, -0.42),
    ...seat(1.02, FLOOR_Y + 0.42, -0.42),
    // the panel over the centre seats, with its three screens
    box("engine-metal", [0, FLOOR_Y + 1.62, 0.22], [0, FLOOR_Y + 1.92, 0.08], 1.34, 0.08),
    ...[-0.42, 0, 0.42].map((x) => box("glass", [x, FLOOR_Y + 1.66, 0.25], [x, FLOOR_Y + 1.88, 0.15], 0.38, 0.03)),
    // a window on each side of the cabin, and the docking port in the ceiling
    ...[-1, 1].map((side) => box("glass", [side * 1.36, FLOOR_Y + 0.96, -0.1], [side * 1.2, FLOOR_Y + 1.24, -0.1], 0.3, 0.06)),
    { kind: "lathe", material: "engine-metal", segs: 20, body: true, profile: [[0.38, H * 0.8], [0.38, H * 0.86], [0.001, H * 0.86]] },
    ...person(1.5, FLOOR_Y, 0.9),
  ];
  return out;
}

export const DRAGON_INSIDE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "dragon",
    variant: "crew-dragon-inside",
    drawnFrom: "This package's code. The outside is Dragon 2's sourced size; its four seats, panel and cargo are from its article, placed by eye from one published picture of the cabin. Their sizes have no source. Cut open to look inside: the real capsule's front half is not drawn. The figure of 1.8 m is for scale.",
    parts: [{ slot: "capsule", kind: "capsule", name: "Inside Crew Dragon, cut open", height: H, diameter: R * 2, pieces: inside }],
  },
];
