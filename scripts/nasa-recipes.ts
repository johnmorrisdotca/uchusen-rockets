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
}
export interface NasaRecipe {
  id: string;
  /** Under the sources folder. Its first file's material names go bare; another's carry its file's name. */
  files: readonly string[];
  title: string;
  /** The dataset's page. */
  source: string;
  changes: string;
  parts: readonly NasaPart[];
  /** A file used more than once, each copy moved by this much in the first file's space. */
  copies?: readonly { file: string; at: readonly [number, number, number] }[];
  /** Which part a triangle belongs to, by its middle in the file's own space; null leaves it out. */
  partOf: (centre: readonly number[], material: string, node: string, file: string) => NasaPart | null;
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
const JUPITER_SCALE = 21.3 / 17.47;
const JUPITER_C: NasaPart = { id: "vehicle", triangles: 12_000, error: 0.01, place: placer([-0.135, 1.36, 0], JUPITER_SCALE, JUPITER_SCALE, 0) };

// The station, its truss along z, 45.54 units with its arrays: scaled to the sourced 109 m. Turned so the truss runs across the front. A ball of stray pieces far above it, at y 40 and over, is left out.
const ISS_SCALE = 109 / 45.54;
const ISS_STATION: NasaPart = { id: "station", triangles: 58_000, error: 0.03, place: placer([0, -4.17, -0.09], ISS_SCALE, ISS_SCALE, 90) };

// Hubble, up +y, 525.49 units: scaled to the sourced 13.2 m, which gives 4.2 m across its tube, against the sourced 4.2 m.
const HUBBLE_SCALE = 13.2 / 525.49;
const HUBBLE: NasaPart = { id: "telescope", triangles: 8_000, error: 0.002, place: placer([-1.3, -266.03, 3.4], HUBBLE_SCALE, HUBBLE_SCALE, 0) };

// Cluster II's drum is already metres: 2.9 m across and 1.3 m tall (ESA). Stood with its base on y = 0. The foil and the 44 m booms are not this part.
const placeCluster = (p: number[]): void => {
  p[1] += 0.65;
  // the foil cap sits a little outside the published drum; bring it back to that size
  p[0] *= 2.9 / 3.03;
  p[2] *= 2.9 / 3.03;
  p[1] *= 1.3 / 1.33;
};

const CLUSTER_BODY: NasaPart = { id: "body", triangles: 12_000, error: 0.002, place: placeCluster };
const CLUSTER_FAR: NasaPart = { id: "far", triangles: 800, error: 0.04, place: placeCluster };

const clusterDrum = (centre: readonly number[], _material: string, node: string, part: NasaPart): NasaPart | null => {
  if (node !== "shiny_panel" && node !== "foil_gold" && node !== "foil_silver") return null;
  // the wire booms run many metres out; the drum and its foil cap stay
  if (Math.hypot(centre[0], centre[2]) > 1.7 || Math.abs(centre[1]) > 0.8) return null;
  return part;
};

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
    changes: "the lettering removed with the two pictures that carried it, which are plain white here; rescaled to the sourced height; its materials made into one picture",
    parts: [JUPITER_C],
    partOf: () => JUPITER_C,
    // its two pictures are lettering and stray lines on white: plain white is what is left once the marks are gone
    colours: { jupiterc_blinn6S: [1, 1, 1], jupiterc_blinn7S: [1, 1, 1] },
    atlas: 256,
  },
  {
    id: "iss",
    files: [`${FOLDER}/iss-b.glb`],
    title: "ISS",
    source: page("nasa-3d-models-iss"),
    changes: "reduced from 174,440 triangles; a ball of stray pieces far above it left out; rescaled to the sourced length; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs",
    parts: [ISS_STATION],
    partOf: (centre) => (centre[1] > 35 ? null : ISS_STATION),
    colours: { "lambert7SG.001": [0.28, 0.16, 0.05], "bendedtruss_blin.001": [0.5, 0.5, 0.5], "blinn1SG.001": [0.62, 0.62, 0.6], "blinn3SG.001": [0.55, 0.55, 0.53], "lambert3SG.001": [0.7, 0.7, 0.68], "anisotropic1SG.001": [0.45, 0.45, 0.46], "soyuz_blinn4SG.001": [0.5, 0.5, 0.48] },
    atlas: 256,
  },
  {
    id: "hubble",
    files: [`${FOLDER}/hubble-a.glb`],
    title: "Hubble Space Telescope",
    source: page("nasa-3d-models-hubble-space-telescope"),
    changes: "a lettered plate painted out of its picture; rescaled to the sourced length; its materials made into one picture",
    parts: [HUBBLE],
    partOf: () => HUBBLE,
    patches: { hbltel_wfc_1: [{ to: [0.2, 0.39, 0.16, 0.05], fill: "#2f2d2a" }] },
    atlas: 1536,
    pictureScale: { hbltel_3: 0.6 },
  },
  {
    id: "cluster-ii",
    files: [`${FOLDER}/cluster-ii.glb`],
    title: "Cluster II",
    source: "https://science.nasa.gov/3d-resources/cluster-ii/",
    changes: "the drum with its foil and its own panels; the long booms left out; scaled to the sourced 2.9 m across and 1.3 m tall; stood with its base at y = 0. No mark was on the panels that were kept",
    parts: [CLUSTER_BODY],
    partOf: (centre, material, node) => clusterDrum(centre, material, node, CLUSTER_BODY),
    atlas: 1024,
  },
  {
    id: "cluster-ii-coarse",
    files: [`${FOLDER}/cluster-ii.glb`],
    title: "Cluster II, distant",
    source: "https://science.nasa.gov/3d-resources/cluster-ii/",
    changes: "the same drum as the near model, foil and panels kept, long booms left out, reduced for a distant view; scaled to the sourced 2.9 m across and 1.3 m tall; stood with its base at y = 0. No mark was on the panels that were kept",
    parts: [CLUSTER_FAR],
    partOf: (centre, material, node) => clusterDrum(centre, material, node, CLUSTER_FAR),
    atlas: 128,
  },
];
