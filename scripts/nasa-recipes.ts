// What is taken from each of NASA's models, and how: where each part begins, how its triangles reach this package's convention, which marks are painted out and which materials are left out. Scales come from the sourced sizes.
// Every mark was found by looking: at the file's pictures, then at the result from every side. These models are NASA's; no logo, insignia, flag or lettering is shipped.
import { placer } from "./model-recipes.ts";

/** [x, y, width, height] as fractions of a picture, from its top left. */
export type Rect = readonly [number, number, number, number];
export interface Patch {
  to: Rect;
  /** Painted over from this clean part of the same picture. */
  from?: Rect;
  /** Or with this colour. */
  fill?: string;
}
export interface NasaPart {
  id: string;
  place: (p: number[], n: number[]) => void;
  /** At most this many triangles. */
  triangles: number;
  /** Metres the surface may move. */
  error?: number;
  /** True where the model may not draw this part at all: nothing falling in it is then no file and this package's own paint shows for it. Without it, a part nothing falls in stops the run, so a typo cannot drop a file unseen. */
  optional?: boolean;
}
/** A connected piece of a file's mesh: the triangles that touch, welded, with the box they fill in the file's own space. */
export interface PieceBox {
  min: readonly number[];
  max: readonly number[];
  triangles: number;
}
export interface NasaRecipe {
  id: string;
  /** Under the sources folder. Its first file's material names go bare; another's carry its file's name. */
  files: readonly string[];
  title: string;
  /** The dataset's page. */
  source: string;
  changes: string;
  /** Whose the model is when it is not NASA's: the author and the licence line written into each part's file. */
  credit?: { author: string; license: string };
  parts: readonly NasaPart[];
  /** A file used more than once, each copy moved by this much in the first file's space. */
  copies?: readonly { file: string; at: readonly [number, number, number] }[];
  /** Which part a triangle belongs to, by its middle in the file's own space, its material, its node and the connected piece it is part of; null leaves it out. */
  partOf: (centre: readonly number[], material: string, node: string, file: string, piece: PieceBox) => NasaPart | null;
  patches?: Readonly<Record<string, readonly Patch[]>>;
  /** A material's plain colour in place of its own or its picture, in linear values. */
  colours?: Readonly<Record<string, readonly [number, number, number]>>;
  /** A material's picture at this share of its size. */
  pictureScale?: Readonly<Record<string, number>>;
  /** The largest picture a part may have, in pixels on a side. */
  atlas?: number;
  quality?: number;
  metal?: number;
  rough?: number;
  /** Let free edges move: for a model whose pieces can take it. */
  freeBorders?: boolean;
  /** Weld a place's vertices even when each face stored its own normal, so a flat-shaded file can be simplified. Picture seams stay split. */
  looseWeld?: boolean;
  /** A triangle with a side of its box over this many of the file's units is cut up first, so a facet that runs the length of a hull falls where each piece of it stands. */
  maxTriangle?: number;
}

const FOLDER = "nasa-3d-resources";
const page = (slug: string) => `https://data.nasa.gov/dataset/${slug}`;

// The orbiter: nose towards +x, its top towards +z, its span along y. 1,471 units from the tail's tip to the nose, scaled to the sourced 37.24 m, which gives a span of 23.7 m against the sourced 23.79 m. Stood on its tail with its belly
// towards +Z and its back towards the tank's far side, as the code-made orbiter stands.
const ORBITER_SCALE = 37.24 / 1471.07;
const ORBITER: NasaPart = {
  id: "orbiter",
  triangles: 30_000,
  error: 0.012,
  place: (p, n) => {
    const [x, y, z] = p;
    p[0] = y * ORBITER_SCALE;
    p[1] = (x + 706.07) * ORBITER_SCALE;
    p[2] = -(z + 30) * ORBITER_SCALE;
    const [nx, ny, nz] = n;
    n[0] = ny;
    n[1] = nx;
    n[2] = -nz;
  },
};
const ET_SCALE = 46.88 / 1879.7;
const EXTERNAL_TANK: NasaPart = {
  id: "external-tank",
  triangles: 20_000,
  error: 0.012,
  // nose towards +x, the orbiter's side towards +y. The hull's axis is 23 units below the file's
  place: (p, n) => {
    const [x, y, z] = p;
    p[0] = -z * ET_SCALE;
    p[1] = (x + 939.85) * ET_SCALE;
    p[2] = -(y + 23) * ET_SCALE;
    const [nx, ny, nz] = n;
    n[0] = -nz;
    n[1] = nx;
    n[2] = -ny;
  },
};
const SRB_SCALE = 45.46 / 1781.16;
const SRB: NasaPart = {
  id: "srb",
  triangles: 20_000,
  error: 0.012,
  place: (p, n) => {
    const [x, y, z] = p;
    p[0] = y * SRB_SCALE;
    p[1] = (x + 890.58) * SRB_SCALE;
    p[2] = -z * SRB_SCALE;
    const [nx, ny, nz] = n;
    n[0] = ny;
    n[1] = nx;
    n[2] = -nz;
  },
};

// The lunar module, file up +y, 5.02 units from the footpads to the top antenna: scaled to the sourced 7.04 m. Its descent stage is what is under y 2.1 in the file, which then stands 3.25 m against the sourced 3.231 m.
const LM_SCALE = 7.04 / 5.02;
const LM_CUT = 2.1;
const LM_DESCENT: NasaPart = { id: "descent", triangles: 34_000, error: 0.006, place: placer([0, 0.1, 0], LM_SCALE, LM_SCALE, 0) };
const LM_ASCENT: NasaPart = { id: "ascent", triangles: 26_000, error: 0.006, place: placer([0, LM_CUT, 0], LM_SCALE, LM_SCALE, 0) };

// Apollo docked to Soyuz, lying along x: Apollo's engine at -12.26, its nose at -0.42, the docking module to 1.78, Soyuz's docking end at 1.58 and its tail at 9.39. Each stood on end and scaled to its own sourced length and width.
const AS_ALONG = (from: number, along: number, radial: number, axisY: number, axisZ: number): NasaPart["place"] => (p, n) => {
  const [x, y, z] = p;
  p[0] = (y - axisY) * radial;
  p[1] = (x - from) * along;
  p[2] = -(z - axisZ) * radial;
  const [nx, ny, nz] = n;
  n[0] = ny / radial;
  n[1] = nx / along;
  n[2] = -nz / radial;
};
const AS_ALONG_CSM = 11 / (-0.42 + 12.26);
const AS_CSM: NasaPart = { id: "csm", triangles: 16_000, error: 0.004, place: AS_ALONG(-12.26, AS_ALONG_CSM, 3.9 / 5.12, 0.23, -0.03) };
const AS_DOCK: NasaPart = { id: "docking-module", triangles: 7_000, error: 0.003, place: AS_ALONG(-0.74, AS_ALONG_CSM, 3.9 / 5.12, -0.07, -0.11) };
const AS_SOYUZ: NasaPart = { id: "soyuz", triangles: 13_000, error: 0.004, place: AS_ALONG(1.58, 7.48 / (9.39 - 1.58), 2.72 / 3.3, 0.08, -0.03) };

// Gemini, up +y, 13.67 units tall: scaled to the sourced 5.61 m, which gives 2.96 m across against the sourced 3 m wide. The adapter is what stands under y 5.95.
const GEMINI_SCALE = 5.61 / 13.67;
const GEMINI_CUT = 5.95;
const GEMINI_ADAPTER: NasaPart = { id: "adapter", triangles: 24_000, error: 0.004, place: placer([0.09, 0.14, 0], GEMINI_SCALE, GEMINI_SCALE, 0) };
const GEMINI_CAPSULE: NasaPart = { id: "capsule", triangles: 14_000, error: 0.004, place: placer([0.09, GEMINI_CUT, 0], GEMINI_SCALE, GEMINI_SCALE, 0) };

// Friendship 7, up +y from 0.86 to 10.09, 5.99 units across: scaled to the sourced 3.3 m long and 1.8 m wide. Those are two scales, 19% apart: the file is stouter than its sources.
const MERCURY: NasaPart = { id: "capsule", triangles: 40_000, error: 0.002, place: placer([-0.085, 0.86, 0.655], 3.3 / 9.23, 1.8 / 5.99, 0) };

// Jupiter-C, up +y, 17.47 units: scaled to the sourced 21.3 m, which gives 1.83 m across against the sourced 1.8 m.
// Its 23 named objects fall into four stages: the tail unit with its fins (y 1.36 to 3.9), the Redstone body with four small fittings (3.9 to 16.23), the spinning tub with its clustered motors (16.085 to 17.27) and the top
// stage with Explorer 1 (17.25 to 18.83). Each stands in a frame of its own at its base.
const JUPITER_SCALE = 21.3 / 17.47;
const jupiterPart = (id: string, base: number, triangles: number): NasaPart => ({ id, triangles, error: 0.01, place: placer([-0.135, base, 0], JUPITER_SCALE, JUPITER_SCALE, 0) });
const JC_TAIL = jupiterPart("tail", 1.362, 3_000);
const JC_BODY = jupiterPart("first-stage", 3.901, 5_000);
const JC_TUB = jupiterPart("tub", 16.085, 2_500);
const JC_TOP = jupiterPart("fourth-stage", 17.25, 1_500);
const JC_TAIL_NODES = /^(jupiterc_[2578]|jupiterc_6|jupiterc_9|jupiterc10|pCube3)/;
const JC_TUB_NODES = /^(pCylinder2|jupiterc1[1-6]|pCube5)/;

// The station, its truss along z, 45.54 units with its arrays: scaled to the sourced 109 m. Turned so the truss runs across the front, and its module run put on the axis. A ball of stray pieces far above it, at y 40
// and over, is left out. Then every part is cut out by where it stands in that frame, each in a frame of its own at its base, or at its root for one that lies out from the run: the module run stacks up the axis from
// Zvezda's aft, the laboratories lie out along ±X from Harmony, the airlock and the visiting craft lie out along ±Z, and the truss, its arrays and its radiators stand where the model has them.
const ISS_SCALE = 109 / 45.54;
const issWhole = placer([0, -4.17, -0.006], ISS_SCALE, ISS_SCALE, 90);
/** A part of the station in a frame of its own: the whole station's frame, moved so that `origin` is at its origin. */
const issPart = (id: string, origin: readonly [number, number, number], triangles: number): NasaPart => ({
  id,
  triangles,
  error: 0.03,
  place: (p, n) => {
    issWhole(p, n);
    p[0] -= origin[0];
    p[1] -= origin[1];
    p[2] -= origin[2];
  },
});
const ISS_AFT = 8.7;
const ISS_ZARYA = 20.6;
const ISS_UNITY = 31.4;
const ISS_DESTINY = 36.1;
const ISS_HARMONY = 42.4;
const ISS_LAB_Y = 45;
const ISS_LAB_ROOT = 1.85;
const ISS_SIDE = 2;
const ISS_PARTS: Readonly<Record<string, NasaPart>> = {
  "soyuz-aft": issPart("soyuz-aft", [0, 3.2, 0], 1_600),
  zvezda: issPart("zvezda", [0, ISS_AFT, 0], 4_500),
  zarya: issPart("zarya", [0, ISS_ZARYA, 0], 3_500),
  unity: issPart("unity", [0, ISS_UNITY, 0], 3_500),
  destiny: issPart("destiny", [0, ISS_DESTINY, 0], 2_500),
  harmony: issPart("harmony", [0, ISS_HARMONY, 0], 3_000),
  columbus: issPart("columbus", [ISS_LAB_ROOT, ISS_LAB_Y, 0], 2_000),
  kibo: issPart("kibo", [-ISS_LAB_ROOT, ISS_LAB_Y, 0], 3_500),
  airlock: issPart("airlock", [0, 33.9, -1.3], 2_500),
  "soyuz-zvezda-nadir": issPart("soyuz-zvezda-nadir", [0, 15.7, -ISS_SIDE], 1_800),
  "soyuz-zvezda-zenith": issPart("soyuz-zvezda-zenith", [0, 19, ISS_SIDE], 1_800),
  "soyuz-zarya-nadir": issPart("soyuz-zarya-nadir", [0, 25.7, -ISS_SIDE], 1_800),
  "truss-s0": issPart("truss-s0", [0, 33, 2.5], 1_500),
  "truss-s1": issPart("truss-s1", [7, 33, 2.5], 3_500),
  "truss-p1": issPart("truss-p1", [-7, 33, 2.5], 3_500),
  "truss-s3-s4": issPart("truss-s3-s4", [19, 33, 2.5], 3_000),
  "truss-p3-p4": issPart("truss-p3-p4", [-19, 33, 2.5], 3_000),
  "truss-s5": issPart("truss-s5", [33, 33, 2.5], 800),
  "truss-p5": issPart("truss-p5", [-33, 33, 2.5], 800),
  "truss-s6": issPart("truss-s6", [38, 33, 2.5], 1_200),
  "truss-p6": issPart("truss-p6", [-38, 33, 2.5], 1_200),
  "arrays-s4": issPart("arrays-s4", [35.5, 34.5, 2.5], 800),
  "arrays-p4": issPart("arrays-p4", [-35.5, 34.5, 2.5], 800),
  "arrays-s6": issPart("arrays-s6", [50.5, 34.5, 2.5], 800),
  "arrays-p6": issPart("arrays-p6", [-50.5, 34.5, 2.5], 800),
  "radiators-starboard": issPart("radiators-starboard", [19, 33, 2.5], 700),
  "radiators-port": issPart("radiators-port", [-19, 33, 2.5], 700),
};
/** Which part a triangle of the station is, by its middle in the station's frame and the piece it belongs to. */
function issPartOf(centre: readonly number[], piece: PieceBox): NasaPart | null {
  const at = [...centre];
  const n = [0, 1, 0];
  issWhole(at, n);
  const [x, y, z] = at;
  const box = { min: [...piece.min], max: [...piece.max] };
  issWhole(box.min, [0, 1, 0]);
  issWhole(box.max, [0, 1, 0]);
  // the turn swaps and flips the box's sides: read them back in order
  const lo = [0, 1, 2].map((k) => Math.min(box.min[k], box.max[k]));
  const hi = [0, 1, 2].map((k) => Math.max(box.min[k], box.max[k]));
  const side = x < 0 ? "p" : "s";
  // a ball of stray pieces far above the station
  if (y > 80) return null;
  const ax = Math.abs(x);
  const segment = ISS_PARTS[ax <= 7 ? "truss-s0" : ax <= 19 ? `truss-${side}1` : ax <= 33 ? `truss-${side}3-${side}4` : ax <= 38 ? `truss-${side}5` : `truss-${side}6`];
  // the one rail the model runs the length of the truss, cut up, falls into the segments by where each piece of it stands
  if (hi[0] - lo[0] > 60) return segment;
  // the solar array wings, in two pairs each side, with their masts' feet on the truss
  if ((ax >= 30 && ax <= 40) || (ax >= 45 && ax <= 56)) return ISS_PARTS[`arrays-${side}${ax < 42 ? "4" : "6"}`];
  // the three radiators each side, hanging from the truss
  if (ax >= 13 && ax <= 25 && hi[1] - lo[1] > 15) return ISS_PARTS[`radiators-${side === "p" ? "port" : "starboard"}`];
  // the truss, a lattice nine metres deep, clear of the module run, by its segments
  if (y >= 32.5 && y <= 37.6 && ax > 2.5) return segment;
  // the two laboratories across Harmony, Kibo with its logistics module and exposed facility, and the visiting craft lying out from the run
  if (y > 41 && x >= ISS_SIDE) return ISS_PARTS.columbus;
  if (y > 41 && x <= -ISS_SIDE) return ISS_PARTS.kibo;
  if (y >= ISS_UNITY && y < 36.5 && z <= -1.2) return ISS_PARTS.airlock;
  if (y >= 13.5 && y < 18 && z < -1.9) return ISS_PARTS["soyuz-zvezda-nadir"];
  if (y >= 17.5 && y < 21 && z > 1.9) return ISS_PARTS["soyuz-zvezda-zenith"];
  if (y >= 23.5 && y < 28 && z < -1.9) return ISS_PARTS["soyuz-zarya-nadir"];
  // the module run, from the Soyuz at the aft up to Harmony's cone
  if (y < ISS_AFT) return ISS_PARTS["soyuz-aft"];
  if (y < ISS_ZARYA) return ISS_PARTS.zvezda;
  if (y < ISS_UNITY) return ISS_PARTS.zarya;
  if (y < ISS_DESTINY) return ISS_PARTS.unity;
  if (y < ISS_HARMONY) return ISS_PARTS.destiny;
  return ISS_PARTS.harmony;
}

// Voyager Probe (A), file up +y. The high-gain antenna is a disc of 0.100 in x and z: scaled to the sourced 3.7 m. The record's marked face is its own material and is left out. One model serves Voyager 1 and Voyager 2.
// Turned so the long boom, which runs to +z in the file, lies across +x.
const VOYAGER_SCALE = 3.7 / 0.1;
const VOYAGER: NasaPart = { id: "craft", triangles: 4_500, error: 0.04, place: placer([0, -0.04972575, 0], VOYAGER_SCALE, VOYAGER_SCALE, 90) };

// Juno (B), one mesh and no picture. The two farthest array tips are 25.3437 apart: scaled to the sourced 20 m span. It carries no mark.
const JUNO_SCALE = 20 / 25.3437;
const JUNO: NasaPart = { id: "craft", triangles: 6_000, error: 0.4, place: placer([0, -2.475, 0], JUNO_SCALE, JUNO_SCALE, 0) };

export const NASA_RECIPES: readonly NasaRecipe[] = [
  {
    id: "space-shuttle-stack",
    files: [`${FOLDER}/shuttle-d.glb`, `${FOLDER}/shuttle-d-door-prt.glb`, `${FOLDER}/shuttle-d-door-stb.glb`],
    title: "Shuttle (Hi-Res)",
    source: page("nasa-3d-models-shuttle-hi-res"),
    changes: "the agency mark, the flag, the country's name and the rest of the lettering painted out of its pictures; its open bay closed with its own doors and what was inside it left out; its engines put in place; reduced; rescaled to the sourced length; stood upright; its materials made into one picture",
    parts: [ORBITER],
    // its engines come in files of their own, one engine each with its origin at the gimbal: three main engines where the aft picture draws them, two on the pods
    copies: [
      { file: `${FOLDER}/shuttle-d-eng.glb`, at: [-490, 0, 64] },
      { file: `${FOLDER}/shuttle-d-eng.glb`, at: [-523, 53, -28] },
      { file: `${FOLDER}/shuttle-d-eng.glb`, at: [-523, -53, -28] },
      { file: `${FOLDER}/shuttle-d-rcs.glb`, at: [-516, 80, 78] },
      { file: `${FOLDER}/shuttle-d-rcs.glb`, at: [-516, -80, 78] },
    ],
    // the bay is shut by its own doors, so what is inside it goes
    partOf: (_centre, material) => (/^(shut-bay|shut-handrails|shut-cam|bay )/.test(material) ? null : ORBITER),
    patches: {
      wingtop: [
        { to: [0.05, 0.205, 0.115, 0.12], from: [0.07, 0.335, 0.05, 0.012] },
        { to: [0.095, 0.645, 0.08, 0.115], from: [0.19, 0.645, 0.08, 0.115] },
      ],
      "side stb": [{ to: [0.133, 0.37, 0.28, 0.28], from: [0.42, 0.37, 0.14, 0.28] }],
      "side prt": [{ to: [0.133, 0.4, 0.28, 0.28], from: [0.42, 0.4, 0.14, 0.28] }],
    },
    // the file leaves these pale, and on the real one they are as black as the belly
    colours: { "belly flap": [0.015, 0.015, 0.017], "fusolage aft fla": [0.015, 0.015, 0.017] },
    atlas: 2048,
    quality: 0.78,
  },
  {
    id: "space-shuttle-stack",
    files: [`${FOLDER}/parts-et.glb`, `${FOLDER}/parts-srb.glb`],
    title: "Shuttle Parts (Hi-Res)",
    source: page("nasa-3d-models-shuttle-parts-hi-res"),
    changes: "reduced; rescaled to the sourced lengths; stood upright; its materials made into one picture; its pictures shrunk",
    parts: [EXTERNAL_TANK, SRB],
    partOf: (_centre, _material, _node, file) => (file.endsWith("parts-et.glb") ? EXTERNAL_TANK : SRB),
    pictureScale: { [`${FOLDER}/parts-srb.glb/srb all`]: 0.4 },
    atlas: 1536,
    quality: 0.78,
  },
  {
    id: "lunar-module",
    files: [`${FOLDER}/lm.glb`],
    title: "Apollo Lunar Module",
    source: page("nasa-3d-models-apollo-lunar-module"),
    changes: "the flag and the country's name removed with the two plates that carried them; reduced from 97,588 triangles; rescaled to the sourced height; separated into its two stages; its materials made into one picture",
    parts: [LM_DESCENT, LM_ASCENT],
    partOf: (centre, material, node) => {
      if (material === "blinn8SG.001" || material === "blinn12SG.001") return null;
      // the legs' struts and the frames the ascent stage stands on run above the cut
      return centre[1] < 2.47 || node === "pCylinder1" || (centre[1] < 2.95 && /^group7[345]/.test(node)) || (centre[1] < 2.5 && node.startsWith("group31")) || (centre[1] < 3.1 && material === "blinn7SG.002") ? LM_DESCENT : LM_ASCENT;
    },
    atlas: 512,
  },
  {
    id: "apollo-soyuz",
    files: [`${FOLDER}/apollo-soyuz.glb`],
    title: "Apollo Soyuz",
    source: page("nasa-3d-models-apollo-soyuz"),
    changes: "the flags and the countries' names painted out of its pictures; reduced from 32,996 triangles; rescaled to the sourced lengths and widths; stood on end; separated into its three craft; its materials made into one picture",
    parts: [AS_CSM, AS_DOCK, AS_SOYUZ],
    partOf: (centre, material) => (material === "blinn2SG" || material === "blinn7SG" ? AS_SOYUZ : centre[0] < -0.5 ? AS_CSM : centre[0] < 1.74 ? AS_DOCK : AS_SOYUZ),
    colours: { lambert5SG: [0.53, 0.71, 0.61] },
    patches: { blinn11SG: [{ to: [0.36, 0.08, 0.27, 0.2], from: [0.36, 0.36, 0.27, 0.2] }] },
    atlas: 1024,
  },
  {
    id: "gemini",
    files: [`${FOLDER}/gemini.glb`],
    title: "Gemini",
    source: page("nasa-3d-models-gemini"),
    changes: "the flag and the country's name painted out of its picture; rescaled to the sourced length; separated into adapter and capsule; its materials made into one picture",
    parts: [GEMINI_ADAPTER, GEMINI_CAPSULE],
    partOf: (centre) => (centre[1] < GEMINI_CUT ? GEMINI_ADAPTER : GEMINI_CAPSULE),
    patches: { blinn3SG: [{ to: [0.28, 0.58, 0.44, 0.38], from: [0.28, 0.1, 0.44, 0.38] }] },
    pictureScale: { blinn3SG: 0.6, lambert2SG: 0.7, blinn6SG: 0.7, blinn5SG: 0.8, blinn7SG: 0.6 },
    atlas: 1536,
  },
  {
    id: "mercury",
    files: [`${FOLDER}/friendship7.glb`],
    title: "Friendship 7",
    source: page("nasa-3d-models-friendship-7"),
    changes: "reduced from 164,622 triangles; rescaled to the sourced length and width; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs",
    parts: [MERCURY],
    partOf: () => MERCURY,
    colours: { "blinn2SG.002": [0.03, 0.03, 0.035], "lambert6SG.001": [0.09, 0.09, 0.1], "blinn1SG.002": [0.05, 0.05, 0.06], "lambert3SG.001": [0.45, 0.45, 0.45], "lambert2SG.001": [0.2, 0.2, 0.2], "blinn6SG.002": [0.5, 0.5, 0.5], "blinn5SG.002": [0.5, 0.5, 0.5], "blinn3SG.002": [0.1, 0.1, 0.1], "anisotropic1SG.001": [0.02, 0.03, 0.04] },
    atlas: 256,
  },
  {
    id: "jupiter-c",
    files: [`${FOLDER}/jupiter-c.glb`],
    title: "Jupiter-C",
    source: page("nasa-3d-models-jupiter-c"),
    changes: "the lettering removed with the two pictures that carried it, which are plain white here; rescaled to the sourced height; separated into its tail unit, Redstone body, spinning tub and top stage by its own named objects; its materials made into one picture a part",
    parts: [JC_TAIL, JC_BODY, JC_TUB, JC_TOP],
    partOf: (_centre, _material, node) => (JC_TAIL_NODES.test(node) ? JC_TAIL : JC_TUB_NODES.test(node) ? JC_TUB : node.startsWith("pCylinder3") ? JC_TOP : JC_BODY),
    // its two pictures are lettering and stray lines on white: plain white is what is left once the marks are gone
    colours: { jupiterc_blinn6S: [1, 1, 1], jupiterc_blinn7S: [1, 1, 1] },
    atlas: 256,
  },
  {
    id: "iss",
    files: [`${FOLDER}/iss-b.glb`],
    title: "ISS",
    source: page("nasa-3d-models-iss"),
    changes: "reduced from 174,440 triangles; a ball of stray pieces far above it left out; rescaled to the sourced length; separated into its modules, truss segments, arrays, radiators and visiting craft by where each stands; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs; one picture a part",
    parts: Object.values(ISS_PARTS),
    partOf: (centre, _material, _node, _file, piece) => issPartOf(centre, piece),
    colours: { "lambert7SG.001": [0.28, 0.16, 0.05], "bendedtruss_blin.001": [0.5, 0.5, 0.5], "blinn1SG.001": [0.62, 0.62, 0.6], "blinn3SG.001": [0.55, 0.55, 0.53], "lambert3SG.001": [0.7, 0.7, 0.68], "anisotropic1SG.001": [0.45, 0.45, 0.46], "soyuz_blinn4SG.001": [0.5, 0.5, 0.48] },
    maxTriangle: 2,
    atlas: 256,
  },
  {
    id: "voyager",
    files: [`${FOLDER}/voyager-a.glb`],
    title: "Voyager Probe (A)",
    source: "https://science.nasa.gov/3d-resources/voyager-probe-a/",
    changes: "the record's marked face removed; reduced from 29,911 triangles; rescaled so the high-gain antenna is the sourced 3.7 m; plain colours kept",
    parts: [VOYAGER],
    partOf: (_centre, material) => (material === "VoyagerDiskEmblem" ? null : VOYAGER),
    looseWeld: true,
    freeBorders: true,
    atlas: 128,
    quality: 0.62,
  },
  {
    id: "juno",
    files: [`${FOLDER}/juno-b.glb`],
    title: "Juno (B)",
    source: "https://science.nasa.gov/3d-resources/juno-b/",
    changes: "reduced from 29,856 triangles; rescaled so the arrays' tip-to-tip is the sourced 20 m; plain colours kept. It carried no mark to remove.",
    parts: [JUNO],
    partOf: () => JUNO,
    looseWeld: true,
    freeBorders: true,
    atlas: 128,
    quality: 0.62,
  },
];
