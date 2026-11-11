// The station in plain shapes, for the line looks, as parts in slots: its length and truss are sourced, and where each module, segment, array, radiator and visiting craft stands is measured from NASA's model at that
// scale. Boxes and tubes, few enough for a drawing. The painted look is NASA's model, one file a part. The module run stacks up the axis from Zvezda's aft; the laboratories lie out along ±X from Harmony, the airlock
// and the visiting craft along ±Z, and the truss, its arrays and its radiators stand where the model has them, each in a frame of its own.
import { ISS_DRAWN_TALL, ISS_LONG } from "../data/iss.ts";
import { blank } from "../data/types.ts";
import { horn, rod } from "./fleet/detail.ts";
import { taper, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const SPAN = (ISS_LONG.value ?? 0) / 2;
/** Where the module run's parts begin, from NASA's model at the sourced length, from Zvezda's aft. */
const ZVEZDA = 11.9;
const ZARYA = 10.8;
const UNITY = 4.7;
const DESTINY = 6.3;
const HARMONY = 5.6;
/** Where the truss, the laboratories, the airlock and the visiting craft are rooted, from Zvezda's aft. */
const TRUSS_Y = 24.3;
const TRUSS_Z = 2.5;
const ARRAYS_Y = 25.8;
const LAB_Y = 36.3;
const LAB_ROOT = 1.85;
const SIDE = 2;
const MODULE_R = 1.85;
const CRAFT_R = 1.1;
const ARRAY_HALF = 2.4;

/** A round rod drawn in every look: a module or a craft lying along an axis. */
const pipe = (material: Parameters<typeof rod>[0], a: Vec3, b: Vec3, r: number): Piece => rod(material, a, b, r, 20, { only: undefined, plain: false });
const panel = (material: "gold" | "white", o: Vec3, half: readonly [number, number]): Piece => ({ kind: "plate", material, frame: { o, u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-half[0], -half[1]], [half[0], -half[1]], [half[0], half[1]], [-half[0], half[1]]], thickness: 0.1 });

const zvezda = (): Piece[] => [
  tube("white", 2.1, 0, 4.3, { rings: [0.02, 4.28] }),
  { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [2.1, 0]] },
  taper("white", 2.1, 4.3, 1.5, 5),
  tube("white", 1.5, 5, 9.3, { rings: [7] }),
  tube("white", 1.2, 9.3, 11.3, { rings: [9.32, 11.28] }),
  tube("engine-pale", 1, 11.3, ZVEZDA),
  ...[1, -1].map((side) => panel("gold", [side * 6.6, 7.3, 0], [5.4, 1])),
];

const zarya = (): Piece[] => [
  tube("engine-pale", 1, 0, 1.5),
  taper("white", 1, 1.5, 2, 2.6),
  tube("white", 2, 2.6, 8.5, { rings: [2.62, 5.5, 8.48] }),
  taper("white", 2, 8.5, 1.2, 9.2),
  tube("white", 1.2, 9.2, ZARYA, { rings: [ZARYA - 0.02] }),
  ...[1, -1].map((side) => panel("gold", [side * 4.5, 4.9, 0], [3.5, 1.5])),
];

const unity = (): Piece[] => [tube("white", 1.13, 0, UNITY, { rings: [0.6, 1.5, 3.2, UNITY - 0.02] })];
const destiny = (): Piece[] => [tube("white", MODULE_R, 0, DESTINY, { rings: [0.02, 3.1, DESTINY - 0.02] })];
const harmony = (): Piece[] => [tube("white", MODULE_R, 0, 3.9, { rings: [0.02, 3.88] }), taper("white", MODULE_R, 3.9, 1, 5), tube("engine-pale", 1, 5, HARMONY)];

/** A visiting craft standing on its service module, its docking end at the top. */
const craftUp = (): Piece[] => [
  tube("white", CRAFT_R, 0, 2.2, { rings: [0.02, 2.18] }),
  { kind: "lathe", material: "dark", segs: 24, under: true, profile: [[0, 0], [CRAFT_R, 0]] },
  taper("white", CRAFT_R, 2.2, 0.9, 3.6),
  tube("white", CRAFT_R, 3.6, 5.5, { rings: [3.62] }),
  ...[1, -1].map((side) => panel("gold", [side * 2.6, 1.1, 0], [1.5, 0.7])),
];

/** The same craft lying out along `side` Z from its docking end, its wings flat. */
const craftOut = (side: number): Piece[] => [
  pipe("white", [0, 0, 0], [0, 0, side * 1.9], CRAFT_R),
  ...horn("white", [0, 0, side * 1.9], [0, 0, side * 3.3], [0.9, 1, 1.1, 1.1], 20, { only: undefined, plain: false }),
  pipe("white", [0, 0, side * 3.3], [0, 0, side * 5.5], CRAFT_R),
  ...[1, -1].map((wing): Piece => ({ kind: "plate", material: "gold", frame: { o: [wing * 2.6, 0, side * 4.4], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline: [[-1.5, -0.7], [1.5, -0.7], [1.5, 0.7], [-1.5, 0.7]], thickness: 0.1 })),
];

/** The airlock lying out along -Z where the model puts it: its equipment lock, then its narrower crew lock. */
const airlock = (): Piece[] => [pipe("white", [0, 0, 0], [0, 0, -4.1], 1.83), ...horn("white", [0, 0, -4.1], [0, 0, -4.9], [1.83, 1.2, 0.75], 20, { only: undefined, plain: false }), pipe("white", [0, 0, -4.9], [0, 0, -6.2], 0.75)];

const columbus = (): Piece[] => [pipe("white", [0, 0, 0], [5.75, 0, 0], MODULE_R)];

/** Kibo lying out along -X: its pressurised module, its logistics module standing on it, and its exposed facility beyond with the arm. */
const kibo = (): Piece[] => [
  pipe("white", [0, 0, 0], [-7.45, 0, 0], MODULE_R),
  pipe("white", [-4.75, 0, 1.6], [-4.75, 0, 5], 1.75),
  strut("engine-pale", [-7.45, 0, 0], [-15.2, 0, 0], 2, 1.2, { plain: false }),
];

/** A truss segment: a square-section beam, `from` to `to` along X, 1.5 m across, in the model's place. */
const segment = (from: number, to: number): Piece[] => [strut("engine-pale", [from, 1, 0], [to, 1, 0], 1.5, 1.5, { plain: false })];

/** A pair of solar array wings on their mast: one blanket below the truss and one above, `outer` metres out along X from the mast. */
const arrays = (outer: number): Piece[] => [panel("gold", [outer, -(ARRAYS_Y + 8.7) / 2 - 0.75, 0], [ARRAY_HALF, (ARRAYS_Y + 8.7) / 2 - 0.75]), panel("gold", [outer, (ISS_DRAWN_TALL - ARRAYS_Y - 8.7) / 2 + 0.75, 0], [ARRAY_HALF, (ISS_DRAWN_TALL - ARRAYS_Y - 8.7) / 2 - 0.75])];

const radiators = (): Piece[] => [-4.2, 0, 4.2].map((x) => panel("white", [x, -7.3, 0], [1.65, 9.7]));

const FROM = "NASA's model for the painted look, one file a part, with its colours judged from photographs. This package's plain shapes for the two line looks, from the sourced length and truss; where each part stands is measured from NASA's model. No flag or mark is drawn.";
const painted = (part: string) => ({ file: `iss-${part}.glb`, credit: "nasa-iss" as const });
const across = (what: string, metres: number) => blank(`${what}, as NASA's model draws it: ${metres} m.`);

const CRAFT_WIDE = across("A visiting craft's wings, tip to tip", 8.2);
const OUTER = SPAN - 50.5 - ARRAY_HALF + 0.4;

export const ISS_BUILDS: readonly StackBuild[] = [
  {
    rocket: "iss",
    variant: "iss",
    drawnFrom: FROM,
    parts: [
      { slot: "zvezda", kind: "module", name: "Zvezda service module, ISS", height: ZVEZDA, diameter: 24, top: [ZVEZDA, 2], sourcedDiameter: across("Zvezda's wings, tip to tip", 24), painted: painted("zvezda"), pieces: zvezda },
      { slot: "zarya", kind: "module", name: "Zarya, ISS", height: ZARYA, diameter: 16, bottom: [0, 2], top: [ZARYA, 2.4], sourcedDiameter: across("Zarya's wings, tip to tip", 16), painted: painted("zarya"), pieces: zarya },
      { slot: "unity", kind: "module", name: "Unity node with PMA-1, ISS", height: UNITY, diameter: 2.26, bottom: [0, 2.4], top: [UNITY, MODULE_R * 2], sourcedDiameter: across("Unity with PMA-1, which the model draws narrow", 2.26), painted: painted("unity"), pieces: unity },
      { slot: "destiny", kind: "module", name: "Destiny laboratory, ISS", height: DESTINY, diameter: MODULE_R * 2, bottom: [0, MODULE_R * 2], top: [DESTINY, MODULE_R * 2], sourcedDiameter: across("Destiny", 3.7), painted: painted("destiny"), pieces: destiny },
      { slot: "harmony", kind: "module", name: "Harmony node with PMA-2, ISS", height: HARMONY, diameter: MODULE_R * 2, bottom: [0, MODULE_R * 2], sourcedDiameter: across("Harmony", 3.7), painted: painted("harmony"), pieces: harmony },
      { slot: "soyuz-aft", kind: "spacecraft", name: "Visiting craft at Zvezda's aft port, ISS", height: 5.5, diameter: 8.2, place: { x: 0, z: 0, y: -5.5 }, sourcedDiameter: CRAFT_WIDE, painted: painted("soyuz-aft"), pieces: craftUp },
      { slot: "soyuz-zvezda-nadir", kind: "spacecraft", name: "Visiting craft at Zvezda's nadir port, ISS", height: CRAFT_R * 2, diameter: 8.2, place: { x: 0, z: -SIDE, y: 7 }, sourcedDiameter: CRAFT_WIDE, painted: painted("soyuz-zvezda-nadir"), pieces: () => craftOut(-1) },
      { slot: "soyuz-zvezda-zenith", kind: "spacecraft", name: "Visiting craft at Zvezda's zenith port, ISS", height: CRAFT_R * 2, diameter: 8.2, place: { x: 0, z: SIDE, y: 10.3 }, sourcedDiameter: CRAFT_WIDE, painted: painted("soyuz-zvezda-zenith"), pieces: () => craftOut(1) },
      { slot: "soyuz-zarya-nadir", kind: "spacecraft", name: "Visiting craft at Zarya's nadir port, ISS", height: CRAFT_R * 2, diameter: 8.2, place: { x: 0, z: -SIDE, y: 17 }, sourcedDiameter: CRAFT_WIDE, painted: painted("soyuz-zarya-nadir"), pieces: () => craftOut(-1) },
      { slot: "airlock", kind: "module", name: "Airlock under Unity, as NASA's model places it, ISS", height: 3.66, diameter: 6.2, place: { x: 0, z: -1.3, y: 25.2 }, sourcedDiameter: blank("The airlock's length, lying out from the run, as NASA's model draws it: 6.2 m. Quest is 5.5 m in its article."), painted: painted("airlock"), pieces: airlock },
      { slot: "columbus", kind: "module", name: "Columbus laboratory, ISS", height: MODULE_R * 2, diameter: 5.75, place: { x: LAB_ROOT, z: 0, y: LAB_Y }, sourcedDiameter: blank("Columbus's length, lying out from Harmony, as NASA's model draws it: 5.75 m. Its article gives 6.9 m."), painted: painted("columbus"), pieces: columbus },
      { slot: "kibo", kind: "module", name: "Kibo laboratory with its logistics module and exposed facility, ISS", height: 7, diameter: 15.2, place: { x: -LAB_ROOT, z: 0, y: LAB_Y }, sourcedDiameter: blank("Kibo's reach, lying out from Harmony with its exposed facility, as NASA's model draws it: 15.2 m. Its pressurised module is 11.2 m in its article."), painted: painted("kibo"), pieces: kibo },
      { slot: "truss-s0", kind: "module", name: "Truss segment S0, ISS", height: 2, diameter: 14, place: { x: 0, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The centre segment's length", 14), painted: painted("truss-s0"), pieces: () => segment(-7, 7) },
      { slot: "truss-s1", kind: "module", name: "Truss segment S1, ISS", height: 2, diameter: 12, place: { x: 7, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 12), painted: painted("truss-s1"), pieces: () => segment(0, 12) },
      { slot: "truss-p1", kind: "module", name: "Truss segment P1, ISS", height: 2, diameter: 12, place: { x: -7, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 12), painted: painted("truss-p1"), pieces: () => segment(-12, 0) },
      { slot: "truss-s3-s4", kind: "module", name: "Truss segments S3 and S4, ISS", height: 2, diameter: 14, place: { x: 19, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segments' length", 14), painted: painted("truss-s3-s4"), pieces: () => segment(0, 14) },
      { slot: "truss-p3-p4", kind: "module", name: "Truss segments P3 and P4, ISS", height: 2, diameter: 14, place: { x: -19, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segments' length", 14), painted: painted("truss-p3-p4"), pieces: () => segment(-14, 0) },
      { slot: "truss-s5", kind: "module", name: "Truss segment S5, ISS", height: 2, diameter: 5, place: { x: 33, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 5), painted: painted("truss-s5"), pieces: () => segment(0, 5) },
      { slot: "truss-p5", kind: "module", name: "Truss segment P5, ISS", height: 2, diameter: 5, place: { x: -33, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 5), painted: painted("truss-p5"), pieces: () => segment(-5, 0) },
      { slot: "truss-s6", kind: "module", name: "Truss segment S6, ISS", height: 2, diameter: 13, place: { x: 38, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 13), painted: painted("truss-s6"), pieces: () => segment(0, 13) },
      { slot: "truss-p6", kind: "module", name: "Truss segment P6, ISS", height: 2, diameter: 13, place: { x: -38, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The segment's length", 13), painted: painted("truss-p6"), pieces: () => segment(-13, 0) },
      { slot: "arrays-s4", kind: "array", name: "Solar array wings on S4, ISS", height: ISS_DRAWN_TALL, diameter: ARRAY_HALF * 2, place: { x: 35.5, z: TRUSS_Z, y: ARRAYS_Y }, sourcedDiameter: across("A wing's width", ARRAY_HALF * 2), painted: painted("arrays-s4"), pieces: () => arrays(0) },
      { slot: "arrays-p4", kind: "array", name: "Solar array wings on P4, ISS", height: ISS_DRAWN_TALL, diameter: ARRAY_HALF * 2, place: { x: -35.5, z: TRUSS_Z, y: ARRAYS_Y }, sourcedDiameter: across("A wing's width", ARRAY_HALF * 2), painted: painted("arrays-p4"), pieces: () => arrays(0) },
      { slot: "arrays-s6", kind: "array", name: "Solar array wings on S6, ISS", height: ISS_DRAWN_TALL, diameter: ARRAY_HALF * 2 + OUTER, place: { x: 50.5, z: TRUSS_Z, y: ARRAYS_Y }, sourcedDiameter: across("A wing's width, standing out from its mast", ARRAY_HALF * 2 + OUTER), painted: painted("arrays-s6"), pieces: () => arrays(OUTER) },
      { slot: "arrays-p6", kind: "array", name: "Solar array wings on P6, ISS", height: ISS_DRAWN_TALL, diameter: ARRAY_HALF * 2 + OUTER, place: { x: -50.5, z: TRUSS_Z, y: ARRAYS_Y }, sourcedDiameter: across("A wing's width, standing out from its mast", ARRAY_HALF * 2 + OUTER), painted: painted("arrays-p6"), pieces: () => arrays(-OUTER) },
      { slot: "radiators-starboard", kind: "module", name: "Radiators on S1, ISS", height: 19.4, diameter: 11.7, place: { x: 19, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The three panels, across", 11.7), painted: painted("radiators-starboard"), pieces: radiators },
      { slot: "radiators-port", kind: "module", name: "Radiators on P1, ISS", height: 19.4, diameter: 11.7, place: { x: -19, z: TRUSS_Z, y: TRUSS_Y }, sourcedDiameter: across("The three panels, across", 11.7), painted: painted("radiators-port"), pieces: radiators },
    ],
  },
];
