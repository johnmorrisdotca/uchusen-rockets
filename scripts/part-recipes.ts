// What is taken from the licensed models that are split into parts the way NASA's are (scripts/reduce-nasa.ts runs these too): where each part begins, how its triangles reach this package's convention, which marks
// are painted out and which materials are left out. Scales come from the sourced sizes. Every mark was found by looking: at the file's pictures, then at the result from every side. No flag, logo or lettering is shipped.
import type { NasaPart, NasaRecipe, PieceBox } from "./nasa-recipes.ts";

const CC_BY = "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)";

/** Moves a point and its normal: the file's point less `base`, each axis scaled by `scale`, then the file's axes mapped onto ours by `axes` (which of ours each of the file's x, y, z becomes, with its sign). */
function mover(base: readonly [number, number, number], scale: readonly [number, number, number], axes: readonly [readonly [number, number], readonly [number, number], readonly [number, number]] = [[0, 1], [1, 1], [2, 1]]): NasaPart["place"] {
  return (p, n) => {
    const q = [0, 0, 0];
    const m = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const [to, sign] = axes[k];
      q[to] = (p[k] - base[k]) * scale[k] * sign;
      m[to] = (n[k] / scale[k]) * sign;
    }
    for (let k = 0; k < 3; k++) {
      p[k] = q[k];
      n[k] = m[k];
    }
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Hubble, from the Sketchfab model by Cybertron B-127. The file stands the telescope on end up +y, its aft bulkhead at y -5.65 and the light shield's rim at 7.17: 12.82 units, scaled to the sourced 13.2 m; its aft
// shroud is 4.51 units across, scaled to the sourced 4.2 m. Those are two scales, 10% apart. Its aperture door stands open; it is turned shut about its hinge, as the line looks draw it. Its solar arrays run out along
// ±x, its high-gain antennas along ±z.

const HST_ALONG = 13.2 / 12.82;
const HST_RADIAL = 4.2 / 4.51;
const HST_AFT = -5.65;
const hstStanding = (base: number): NasaPart["place"] => mover([0, base, 0], [HST_RADIAL, HST_ALONG, HST_RADIAL]);
/** The door turned shut: its hinge runs along x at (y 7.2, z -1.6), and the open door leans 18 degrees back from straight up, so 108 degrees forward lays it flat over the rim. */
const hstDoor = (): NasaPart["place"] => {
  const a = (108.2 * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hinge = [7.2, -1.6] as const;
  const scale = mover([0, 7.17, 0], [HST_RADIAL, HST_ALONG, HST_RADIAL]);
  return (p, n) => {
    const dy = p[1] - hinge[0];
    const dz = p[2] - hinge[1];
    p[1] = hinge[0] + dy * c - dz * s;
    p[2] = hinge[1] + dy * s + dz * c;
    const ny = n[1];
    const nz = n[2];
    n[1] = ny * c - nz * s;
    n[2] = ny * s + nz * c;
    scale(p, n);
  };
};
const HST_AFT_SHROUD: NasaPart = { id: "aft-shroud", triangles: 4_500, error: 0.01, place: hstStanding(HST_AFT) };
const HST_EQUIPMENT: NasaPart = { id: "equipment-section", triangles: 1_800, error: 0.01, place: hstStanding(-2.1) };
const HST_FORWARD: NasaPart = { id: "forward-shell", triangles: 3_200, error: 0.01, place: hstStanding(-0.45) };
const HST_SHIELD: NasaPart = { id: "light-shield", triangles: 3_600, error: 0.01, place: hstStanding(2.5) };
const HST_DOOR: NasaPart = { id: "aperture-door", triangles: 900, error: 0.01, place: hstDoor() };
// an array's frame begins at its mast's root on the shell, x ±1.59, and runs out along ±x; an antenna's at its boom's root, z ±1.81, and runs out along ±z
const HST_ARRAY_RIGHT: NasaPart = { id: "array-right", triangles: 1_400, error: 0.01, place: mover([1.59, 0, 0], [HST_RADIAL, HST_ALONG, HST_RADIAL]) };
const HST_ARRAY_LEFT: NasaPart = { id: "array-left", triangles: 1_400, error: 0.01, place: mover([-1.59, 0, 0], [HST_RADIAL, HST_ALONG, HST_RADIAL]) };
const HST_ANTENNA_NEAR: NasaPart = { id: "antenna-near", triangles: 1_600, error: 0.01, place: mover([0, 0.3, 1.81], [HST_RADIAL, HST_ALONG, HST_RADIAL]) };
const HST_ANTENNA_FAR: NasaPart = { id: "antenna-far", triangles: 1_600, error: 0.01, place: mover([0, 0.3, -1.81], [HST_RADIAL, HST_ALONG, HST_RADIAL]) };

const hubblePartOf = (centre: readonly number[], material: string, _node: string, _file: string, piece: PieceBox): NasaPart | null => {
  // the agency's logo is a decal of its own, left out whole; "transparent" is a unit cube at the origin that no view shows
  if (material === "NASA_logo" || material === "transparent") return null;
  // the arrays and the antennas are pieces standing clear of the shell: a mast runs 1.7 units out from x ±1.59 and its panels reach ±5.53, a boom runs from z ±1.81 to ±5.4 and its dish to ±6.3;
  // the small fittings on the shell's sides, which also begin outside its radius, are not among them
  const wide = piece.max[0] - piece.min[0];
  if (piece.min[0] >= 1.5 && (piece.max[0] > 3.2 || wide > 1.2)) return HST_ARRAY_RIGHT;
  if (piece.max[0] <= -1.5 && (piece.min[0] < -3.2 || wide > 1.2)) return HST_ARRAY_LEFT;
  if (piece.min[2] >= 1.7 && piece.max[2] > 3.5) return HST_ANTENNA_NEAR;
  if (piece.max[2] <= -1.7 && piece.min[2] < -3.5) return HST_ANTENNA_FAR;
  // the open door and its hinge stand on the light shield's rim, on its far side; a latch on the near side of the rim stays with the shield
  if (piece.min[1] >= 7.15 && piece.max[2] < -1.3) return HST_DOOR;
  const y = centre[1];
  if (y < -2.1) return HST_AFT_SHROUD;
  if (y < -0.45) return HST_EQUIPMENT;
  if (y < 2.5) return HST_FORWARD;
  return HST_SHIELD;
};

// ---------------------------------------------------------------------------------------------------------------------------------
// Tiangong, from the Sketchfab model by w29572227. The file lies the station flat: Tianhe runs along z, its aft at z -2.2 and its node's forward face at 0.8, 3.0 units scaled to the sourced 16.6 m (5.53 a unit), and its
// big cylinder is 0.76 units across, scaled to the sourced 4.2 m (the same 5.53). The laboratories run along ±x from the node (Wentian, with its small arm, along -x), each 2.45 units past the node's collars, scaled to the sourced 17.9 m (7.31 a unit:
// the file draws them short, so a laboratory is stretched a fifth along its own axis and nothing else is); their big wings along z, scaled to the sourced 55 m span and 110 m² each. Shenzhou at the forward port
// and under the nadir port, and Tianzhou at the aft, each scaled to its own sourced length and width. Here the station stands on end: the file's z becomes up, its y the near side (nadir towards the reader).

const TG = 16.6 / 3.0;
const TG_AFT = -2.2;
const TG_NODE = 0.0;
const TG_NODE_TOP = 0.8;
const TG_LAB_AXIS_Z = 0.4;
const TG_LAB_FROM = 0.5;
const TG_LAB_ALONG = 17.9 / 2.45;
const TG_WING_ALONG = 27.8 / 3.25;
const TG_WING_WIDE = 4.0 / 0.95;
/** The file's z up, its y towards the reader: a proper turn, the station seen from where its nadir faces. */
const STAND: readonly [readonly [number, number], readonly [number, number], readonly [number, number]] = [[0, 1], [2, -1], [1, 1]];
const TG_TIANHE: NasaPart = { id: "tianhe", triangles: 12_000, error: 0.15, place: mover([0, 0, TG_AFT], [TG, TG, TG], STAND) };
const TG_HUB: NasaPart = { id: "hub", triangles: 7_000, error: 0.15, place: mover([0, 0, TG_NODE], [TG, TG, TG], STAND) };
// a laboratory's frame begins at the node's collar and runs out along ±x, centred on its own axis
// Wentian, with its small arm, is the file's -x laboratory and Mengtian its +x one
const TG_WENTIAN: NasaPart = { id: "wentian", triangles: 9_000, error: 0.15, place: mover([-TG_LAB_FROM, 0, TG_LAB_AXIS_Z], [TG_LAB_ALONG, TG, TG], STAND) };
const TG_MENGTIAN: NasaPart = { id: "mengtian", triangles: 9_000, error: 0.15, place: mover([TG_LAB_FROM, 0, TG_LAB_AXIS_Z], [TG_LAB_ALONG, TG, TG], STAND) };
// a laboratory's wings: their frame on the laboratory's axis at the wings' middle, x ±2.72, the wings running up and down
const TG_WENTIAN_WINGS: NasaPart = { id: "wentian-arrays", triangles: 2_000, error: 0.3, place: mover([-2.72, 0, TG_LAB_AXIS_Z], [TG_WING_WIDE, TG, TG_WING_ALONG], STAND) };
const TG_MENGTIAN_WINGS: NasaPart = { id: "mengtian-arrays", triangles: 2_000, error: 0.3, place: mover([2.72, 0, TG_LAB_AXIS_Z], [TG_WING_WIDE, TG, TG_WING_ALONG], STAND) };
// Tianhe's own two wings, on its axis where they stand, z -0.63
const TG_TIANHE_WINGS: NasaPart = { id: "tianhe-arrays", triangles: 1_500, error: 0.3, place: mover([0, 0, -0.63], [TG, TG, TG], STAND) };
// Shenzhou at the forward port: 1.8 units long from the node's face, 0.58 across; scaled to 9.25 m and 2.8 m
const TG_SHENZHOU_FORWARD: NasaPart = { id: "shenzhou-forward", triangles: 4_000, error: 0.15, place: mover([0, 0, TG_NODE_TOP], [2.8 / 0.58, 2.8 / 0.58, 9.25 / 1.8], STAND) };
// Shenzhou under the nadir port: it hangs down the file's -y from the collar at -0.6 to -2.15; its frame begins at the collar and runs out towards the reader
const TG_SHENZHOU_NADIR: NasaPart = { id: "shenzhou-nadir", triangles: 4_000, error: 0.15, place: mover([0, -0.6, TG_LAB_AXIS_Z], [2.8 / 0.58, 9.25 / 1.55, 2.8 / 0.58], [[0, 1], [2, -1], [1, 1]]) };
// Tianzhou at the aft: from the file's z -3.94 to the aft port at -2.2, 0.62 across; scaled to 10.6 m and 3.35 m, standing on its own far end
const TG_TIANZHOU: NasaPart = { id: "tianzhou", triangles: 5_000, error: 0.15, place: mover([0, 0, -3.94], [3.35 / 0.62, 3.35 / 0.62, 10.6 / 1.74], STAND) };

const tiangongPartOf = (centre: readonly number[], material: string): NasaPart | null => {
  // the flags and the agency's mark are decals of their own, left out whole
  if (/^flag/.test(material)) return null;
  const [x, y, z] = centre;
  // a laboratory's wings lie flat past its end, x ±2.25 to ±3.32, clear of its axis along z, with their yoke between them round the laboratory's narrow end
  const offAxis = Math.hypot(y, z - TG_LAB_AXIS_Z);
  if ((Math.abs(x) > 2.2 && (z < -0.45 || z > 1.25 || offAxis > 0.45)) || Math.abs(x) > 3) return x < 0 ? TG_WENTIAN_WINGS : TG_MENGTIAN_WINGS;
  if (z < TG_AFT) return TG_TIANZHOU;
  // Tianhe's wings lie flat beside it, from x ±0.61 to ±2.09 at z -1.12 to -0.14, and nothing of a laboratory stands aft of z -0.45
  if (Math.abs(x) > 0.55 && z > -1.25 && z < -0.1 && (Math.abs(y) < 0.2 || z < -0.5)) return TG_TIANHE_WINGS;
  // a laboratory runs out from the node's collar along its own axis; the craft's wings beside the node, forward of it and under it, are not it
  if (Math.abs(x) >= TG_LAB_FROM && z >= -0.5 && z <= 1.3 && Math.abs(y) <= 0.7) return x < 0 ? TG_WENTIAN : TG_MENGTIAN;
  if (z >= TG_NODE_TOP) return TG_SHENZHOU_FORWARD;
  if (z >= TG_NODE) return y <= -0.6 ? TG_SHENZHOU_NADIR : TG_HUB;
  return TG_TIANHE;
};

export const PART_RECIPES: readonly NasaRecipe[] = [
  {
    id: "hubble",
    files: ["sketchfab/hubble-space-telescope/source/Hubble.glb"],
    title: "Hubble space telescope",
    source: "https://sketchfab.com/3d-models/hubble-space-telescope-e22236fab9634c959c0525c7ab9c83d7",
    credit: { author: "Cybertron B-127 (https://sketchfab.com/robo-reboot)", license: CC_BY },
    changes: "the agency's wordmark and the agencies' logos painted out of its picture, the agency's logo decal and a lettered plate left out; rescaled to the sourced length and width; its aperture door turned shut; separated into its aft shroud, equipment section, forward shell, light shield, aperture door, two solar arrays and two high-gain antennas; its materials made into one picture a part",
    parts: [HST_AFT_SHROUD, HST_EQUIPMENT, HST_FORWARD, HST_SHIELD, HST_DOOR, HST_ARRAY_LEFT, HST_ARRAY_RIGHT, HST_ANTENNA_NEAR, HST_ANTENNA_FAR],
    partOf: hubblePartOf,
    // tex_01 carries the wordmark and the logos on the light shield's banner, a plate with lettering, and a line of lettering on a panel: each painted over from clean foil and panel of the same picture
    patches: {
      tex_01: [
        { to: [0.05, 0.62, 0.95, 0.38], from: [0.49, 0.06, 0.26, 0.33] },
        { to: [0.1, 0.42, 0.22, 0.24], from: [0.01, 0.42, 0.09, 0.09] },
        { to: [0.0, 0.385, 0.26, 0.035], from: [0.0, 0.3, 0.26, 0.035] },
      ],
    },
    atlas: 1024,
    quality: 0.8,
    metal: 0.3,
    rough: 0.5,
    maxTriangle: 0.5,
  },
  {
    id: "tiangong",
    files: ["sketchfab/tiangong/tiangong.glb"],
    title: "tianGong",
    source: "https://sketchfab.com/3d-models/tiangong-aca22b1dd6d242c1ae7b88de2f483b77",
    credit: { author: "w29572227 (https://sketchfab.com/w29572227)", license: CC_BY },
    changes: "the flags and the agency's mark left out with the picture that carried them; reduced from 4,425,408 triangles; stood on end; each module and craft rescaled to its own sourced length and width; separated into Tianhe, its node, Wentian, Mengtian, the three pairs of solar wings, two Shenzhou and a Tianzhou; its materials made into one picture a part",
    parts: [TG_TIANHE, TG_HUB, TG_WENTIAN, TG_MENGTIAN, TG_TIANHE_WINGS, TG_WENTIAN_WINGS, TG_MENGTIAN_WINGS, TG_SHENZHOU_FORWARD, TG_SHENZHOU_NADIR, TG_TIANZHOU],
    partOf: tiangongPartOf,
    atlas: 256,
    metal: 0.2,
    rough: 0.55,
    freeBorders: true,
    maxTriangle: 0.15,
  },
];
