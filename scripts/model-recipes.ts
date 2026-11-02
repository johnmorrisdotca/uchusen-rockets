// What is taken from each licensed model, and how. Each recipe says which material of the model becomes which of ours (null: never used), where each part begins and how its triangles reach the
// package's convention: metres, Y up, base of the part on the axis at y = 0, the windward (tiled) side towards +Z. Scales come from the sourced sizes, never the other way round.

import type { Material } from "@gltf-transform/core";

export interface RecipePart {
  id: string;
  place: (p: number[], n: number[]) => void;
}
/** A merged mesh's connected piece. */
export interface Piece {
  triangles: number[];
  min: number[];
  max: number[];
}
/** Paint this rectangle of a 1024 square picture over with that one. */
export interface Patch {
  to: readonly [number, number, number, number];
  from: readonly [number, number, number, number];
}
export interface MaterialSpecEntry {
  base: [number, number, number];
  metal: number;
  rough: number;
}
export interface ModelRecipe {
  id: string;
  file: string;
  changes: string;
  materials: Record<string, string | null> | ((name: string, material: Material, node: string) => string | null);
  materialSpec: Record<string, MaterialSpecEntry>;
  textures?: Record<string, { from: string; maps: ("base" | "metalRough" | "normal" | "emissive")[]; size?: number; patches?: readonly Patch[] }>;
  partAt: (y: number, nodeName: string) => RecipePart;
  /** For one merged mesh: which part each of its connected pieces belongs to. */
  pieces?: (piece: Piece) => RecipePart;
  budgets: Record<string, Record<string, { ratio: number; error: number }>>;
  /** Keep each island of a cut-up picture whole: a free edge may not move, or it would sample its neighbour. */
  lockBorder?: boolean;
  /** For a model of many small meshes: the part by each primitive's own box, in the file's units. */
  wholeNodes?: (lo: number[], hi: number[]) => RecipePart;
  /** Something no outside view reaches, by its box: left out. */
  hidden?: (material: string, lo: number[], hi: number[]) => boolean;
}

/** Scales and turns a model's point to our convention: `turn` degrees about Y, the axis moved to the origin, `height` and `radial` the two scales. */
export function placer(axis: [number, number, number], height: number, radial: number, turnDeg: number) {
  const a = (turnDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return (p: number[], n: number[]) => {
    const x = (p[0] - axis[0]) * radial;
    const z = (p[2] - axis[2]) * radial;
    p[0] = x * c + z * s;
    p[2] = -x * s + z * c;
    p[1] = (p[1] - axis[1]) * height;
    // a normal takes the inverse scale, then the same turn
    const nx = n[0] / radial;
    const nz = n[2] / radial;
    n[0] = nx * c + nz * s;
    n[2] = -nx * s + nz * c;
    n[1] = n[1] / height;
  };
}

// Block 3: the file is 25.149 units from the lowest bell to the nose, its hull 1.83 units across with its axis at x 0.045, z 0.03. Parts are scaled apart to the sourced 72.3 m, 52.1 m and 9 m.
const B3_AXIS_XZ = [0.045, 0.03] as const;
const B3_INTERFACE = 14.54;
const B3_BOOSTER_TOP = 14.55;
const B3_BOTTOM = -0.005;
const B3_NOSE = 25.144;
const B3_DIAMETER = 1.83;
// Ship 24 and Booster 7: 9.48 units of ship and 12.84 of booster, scaled apart to the sourced 50.3 m and 69 m; its hull is about 1.83 across, as in Block 3.
const S24_INTERFACE = 12.33;
const S24_BOTTOM = -0.6;
const S24_SHIP_BASE = 12.32;
const S24_NOSE = 21.81;
const S24_AXIS_XZ = [0.045, 0.03] as const;
const S24_PARTS = {
  booster: { id: "booster", place: placer([S24_AXIS_XZ[0], S24_BOTTOM, S24_AXIS_XZ[1]], 69 / (S24_INTERFACE - S24_BOTTOM), 9 / 1.83, 90) },
  ship: { id: "ship", place: placer([S24_AXIS_XZ[0], S24_SHIP_BASE, S24_AXIS_XZ[1]], 50.3 / (S24_NOSE - S24_SHIP_BASE), 9 / 1.83, 90) },
};
/** Sorts its many materials by what they are, since most are numbered. */
function s24Material(name: string, material: Material): string | null {
  // a logo, a serial number, the decals on the engines; the payload bay's inside, which no outside view reaches
  if (name === "Logo" || name === "Serial_Number") return null;
  if (material.getBaseColorTexture() && name !== "Heatshield_Tiles") return null;
  if (name === "Material.004" || name === "Material.039") return null;
  if (name === "Heatshield_Tiles") return "tile";
  const [r] = material.getBaseColorFactor();
  const metal = material.getMetallicFactor();
  if (name === "Heat_Tiles2" || name === "Material.055") return "soot";
  if (name === "Material.023" || name === "Material.056") return "tile-plain";
  if (r > 0.5 && metal > 0.9) return "steel";
  if (r > 0.6) return "engine-pale";
  if (r > 0.28 && metal > 0.8) return "engine-metal";
  if (r > 0.1) return "engine-metal";
  if (r > 0.02 && metal < 0.35) return "bell";
  if (metal > 0.2) return "bell";
  return "dark";
}
const STEEL: MaterialSpecEntry = { base: [0.56, 0.57, 0.58], metal: 0.96, rough: 1 };

const PAINT: Record<string, MaterialSpecEntry> = {
  white: { base: [0.62, 0.62, 0.6], metal: 0, rough: 0.5 },
  black: { base: [0.012, 0.012, 0.014], metal: 0, rough: 0.45 },
  gold: { base: [0.58, 0.36, 0.08], metal: 1, rough: 0.28 },
  solar: { base: [0.006, 0.009, 0.045], metal: 0.4, rough: 0.22 },
  glass: { base: [0.012, 0.02, 0.03], metal: 0.1, rough: 0.08 },
  blue: { base: [0.012, 0.08, 0.3], metal: 0.25, rough: 0.5 },  steel: STEEL,
  tile: { base: [1, 1, 1], metal: 0, rough: 1 },
  "tile-plain": { base: [0.016, 0.016, 0.016], metal: 0, rough: 0.6 },
  soot: { base: [0.008, 0.008, 0.008], metal: 0.17, rough: 0.9 },
  dark: { base: [0.016, 0.016, 0.016], metal: 0.4, rough: 0.55 },
  bell: { base: [0.03, 0.03, 0.03], metal: 0.2, rough: 0.5 },
  "engine-metal": { base: [0.17, 0.17, 0.18], metal: 0.75, rough: 0.42 },
  "engine-pale": { base: [0.7, 0.7, 0.7], metal: 0.57, rough: 0.5 },
  fin: { base: [0.29, 0.29, 0.29], metal: 0.89, rough: 0.5 },
  "fin-dark": { base: [0.03, 0.03, 0.03], metal: 0.3, rough: 0.5 },
};

export const MODEL_RECIPES: ModelRecipe[] = [
  {
    id: "starship-v3",
    file: "starship-block-3-clarence365/spacex_starship_block_3.glb",
    changes: "reduced, logos and serial number removed, rescaled to sourced sizes, separated into booster and ship, unseen interior removed, materials merged",
    materials: {
      Cryo_Section1: "steel",
      Cryo_Section3: "steel",
      "Material.003": "steel",
      "Material.244": "steel",
      "Material.464": "steel",
      "Material.461": "steel",
      "Material.008": "steel",
      "Material.007": "steel",
      "Material.033": "steel",
      Heatshield_Tiles: "tile",
      "Material.023": "tile-plain",
      "Material.055": "soot",
      Booster_Heatshield: "soot",
      "Material.497": "soot",
      "Material.053": "dark",
      "Material.056": "dark",
      "Material.206": "dark",
      "Material.504": "dark",
      "Material.204": "bell",
      "Material.512": "engine-metal",
      "Material.498": "engine-metal",
      "Material.499": "engine-metal",
      "Material.202": "engine-metal",
      Material: "engine-metal",
      "Material.506": "engine-pale",
      "Material.005": "fin",
      "Material.001": "fin-dark",
      // the payload bay's inside: no outside view reaches it
      "Material.463": null,
      "Material.462": null,
      // these carry a logo, a serial number or a wordmark
      Logo: null,
      Serial_Number: null,
      "Material.511": null,
    },
    materialSpec: PAINT,
    textures: {
      steel: { from: "Cryo_Section1", maps: ["metalRough"], size: 512 },
      tile: { from: "Heatshield_Tiles", maps: ["base", "metalRough"], size: 512 },
    },
    partAt: (y) => (y < B3_INTERFACE ? B3_PARTS.booster : B3_PARTS.ship),
    budgets: {
      booster: { steel: { ratio: 0.25, error: 0.03 }, soot: { ratio: 0.3, error: 0.03 }, "engine-metal": { ratio: 0.04, error: 0.03 }, bell: { ratio: 0.05, error: 0.02 }, dark: { ratio: 0.3, error: 0.03 }, "*": { ratio: 0.5, error: 0.02 } },
      ship: { steel: { ratio: 0.4, error: 0.02 }, tile: { ratio: 0.8, error: 0.01 }, "engine-metal": { ratio: 0.05, error: 0.02 }, bell: { ratio: 0.08, error: 0.01 }, "*": { ratio: 0.6, error: 0.02 } },
    },
  },
  {
    id: "starship-v1-flight1",
    file: "starship-ship-24-booster-7-clarence365/spacex_starship_ship_24__booster_7_v4 (1).glb",
    changes: "reduced, logo, serial number and engine decals removed, rescaled to sourced sizes, separated into booster and ship, unseen interior removed, materials merged",
    materials: s24Material,
    materialSpec: PAINT,
    textures: {
      steel: { from: "Material.002", maps: ["metalRough"], size: 512 },
      tile: { from: "Heatshield_Tiles", maps: ["base", "metalRough"], size: 512 },
    },
    partAt: (y) => (y < S24_INTERFACE ? S24_PARTS.booster : S24_PARTS.ship),
    budgets: {
      booster: { steel: { ratio: 0.25, error: 0.03 }, soot: { ratio: 0.3, error: 0.03 }, "engine-metal": { ratio: 0.03, error: 0.03 }, bell: { ratio: 0.03, error: 0.02 }, "engine-pale": { ratio: 0.08, error: 0.02 }, dark: { ratio: 0.08, error: 0.03 }, "*": { ratio: 0.5, error: 0.02 } },
      ship: { steel: { ratio: 0.4, error: 0.02 }, tile: { ratio: 0.8, error: 0.01 }, "engine-metal": { ratio: 0.05, error: 0.02 }, bell: { ratio: 0.06, error: 0.01 }, dark: { ratio: 0.2, error: 0.02 }, "*": { ratio: 0.6, error: 0.02 } },
    },
  },
  {
    id: "falcon-9-block-5",
    file: "falcon-9-stanley-creative/falcon_9_-_spacex.glb",
    changes: "reduced, wordmark, logos, flags and mission marks removed with the textures that carried them, rescaled to sourced sizes, separated into first stage, second stage and fairing, materials merged",
    materials: f9Material,
    materialSpec: PAINT,
    partAt: f9Part,
    budgets: { "first-stage": { fin: { ratio: 0.12, error: 0.01 }, gold: { ratio: 0.12, error: 0.01 }, black: { ratio: 0.2, error: 0.01 }, bell: { ratio: 0.3, error: 0.005 }, "engine-metal": { ratio: 0.2, error: 0.008 }, "*": { ratio: 0.8, error: 0.005 } }, "second-stage": { "*": { ratio: 0.7, error: 0.005 } }, fairing: { "*": { ratio: 1, error: 0 } } },
  },
  {
    id: "dragon-dragon-2",
    file: "dragon-2-kubaha/spacex_-_dragon_2.glb",
    changes: "reduced, rescaled to sourced sizes, separated into capsule and trunk, materials merged",
    materials: (name) => D2_MATERIALS[name] ?? null,
    materialSpec: PAINT,
    partAt: (y) => (y < D2_MEET ? D2_TRUNK : D2_CAPSULE),
    budgets: { trunk: { "*": { ratio: 0.6, error: 0.003 } }, capsule: { white: { ratio: 0.55, error: 0.003 }, "*": { ratio: 0.6, error: 0.003 } } },
  },
  {
    id: "dragon-dragon-1",
    file: "cargo-dragon-progressth/spacex_cargo_dragon.glb",
    changes: "merged, logo decal and hidden pressure vessel removed, rescaled to sourced sizes, stood upright, separated into capsule and trunk, materials merged",
    materials: cdMaterial,
    // its solar cells are a picture, which a dark colour would blacken
    materialSpec: { ...PAINT, solar: { base: [1, 1, 1], metal: 0.3, rough: 0.3 } },
    textures: { solar: { from: "SolarPanel", maps: ["base"], size: 512 } },
    partAt: () => CD_CAPSULE,
    wholeNodes: (_lo, hi) => (hi[2] <= CD_MEET + 1 ? CD_TRUNK : CD_CAPSULE),
    hidden: (material, lo, hi) => material === "Metal_Silver" && lo[0] > -374 && hi[0] < -252 && lo[1] > 29 && hi[1] < 151 && lo[2] > -136 && hi[2] < -13,
    budgets: { trunk: { gold: { ratio: 0.25, error: 0.005 }, "*": { ratio: 0.7, error: 0.005 } }, capsule: { "*": { ratio: 0.75, error: 0.004 } } },
  },
  {
    id: "falcon-heavy-falcon-heavy",
    file: "falcon-heavy-low-poly-antonio-adams/spacex_falcon_heavylow_poly (1).glb",
    changes: "wordmark and logos painted out of its colour, roughness and normal maps, which were resized, rescaled to sourced sizes, separated into centre core and side boosters by its own connected pieces",
    materials: { Material__26: "painted" },
    materialSpec: { painted: { base: [1, 1, 1], metal: 1, rough: 1 } },
    textures: {
      painted: {
        from: "Material__26",
        maps: ["base", "metalRough", "normal"],
        size: 1024,
        patches: [
          // the wordmark and its mark, stretched over from clean hull beneath them
          { to: [40, 172, 150, 306], from: [40, 480, 150, 14] },
          // a small mark on the fairing
          { to: [300, 790, 120, 92], from: [300, 884, 120, 76] },
        ],
      },
    },
    partAt: () => FH_PARTS.centre,
    pieces: ({ min, max }) => {
      const x = (min[0] + max[0]) / 2;
      return x < -126.5 ? FH_PARTS.left : x > -106.8 ? FH_PARTS.right : FH_PARTS.centre;
    },
    budgets: { centre: { "*": { ratio: 1, error: 0 } }, "side-left": { "*": { ratio: 1, error: 0 } }, "side-right": { "*": { ratio: 1, error: 0 } } },
  },
  {
    id: "grasshopper-grasshopper",
    file: "grasshopper-echo-3/spacex_grasshopper (1).glb",
    changes: "wordmark and logo removed with the texture that carried them, rescaled to the sourced height, reduced, materials merged",
    materials: ghMaterial,
    materialSpec: PAINT,
    partAt: () => GH,
    budgets: { vehicle: { "*": { ratio: 0.55, error: 0.008 } } },
  },
  {
    id: "space-shuttle-discovery",
    // its marks are painted out first, by scripts/paint-discovery.ts
    file: "shuttle-discovery-smithsonian/discovery-marks-painted-out.glb",
    changes: "the agency mark, the flags, the country's name and the orbiter's name painted out of its picture; reduced from 150,000 triangles; its pictures shrunk from 4096 to 1024; stood upright and scaled to the sourced length; materials renamed",
    materials: { default: "atlas" },
    materialSpec: { atlas: { base: [1, 1, 1], metal: 0, rough: 0.7 } },
    textures: { atlas: { from: "default", maps: ["base"], size: 1024 } },
    partAt: () => DISCOVERY,
    lockBorder: true,
    budgets: { orbiter: { "*": { ratio: 0.5, error: 0.02 } } },
  },
  {
    id: "starship-2019",
    file: "starship-2019-martiandays/spacex_starship.glb",
    changes: "rescaled to the sourced height, turned to this package's axes, materials renamed",
    materials: { Starship: "atlas" },
    materialSpec: { atlas: { base: [1, 1, 1], metal: 1, rough: 1 } },
    textures: { atlas: { from: "Starship", maps: ["base", "metalRough", "normal", "emissive"] } },
    partAt: () => MD_SHIP,
    budgets: { ship: { "*": { ratio: 1, error: 0 } } },
  },
];

// The scan: nose towards +z, top towards +y, 37.6 units long. Stood on its tail with its belly towards +Z, as this package's rule has it, scaled to the sourced 37.24 m.
const DISCOVERY_SCALE = 37.24 / 37.6;
const DISCOVERY: RecipePart = {
  id: "orbiter",
  place: (p, n) => {
    const [x, y, z] = p;
    p[0] = x * DISCOVERY_SCALE;
    p[1] = (z + 18.8) * DISCOVERY_SCALE;
    p[2] = -(y + 1.45) * DISCOVERY_SCALE;
    const [nx, ny, nz] = n;
    n[0] = nx;
    n[1] = nz;
    n[2] = -ny;
  },
};

const B3_RADIAL_BOOSTER = 9 / B3_DIAMETER;
const B3_RADIAL_SHIP = 9 / B3_DIAMETER;
const B3_PARTS = {
  booster: { id: "booster", place: placer([B3_AXIS_XZ[0], B3_BOTTOM, B3_AXIS_XZ[1]], 72.3 / (B3_BOOSTER_TOP - B3_BOTTOM), B3_RADIAL_BOOSTER, 90) },
  ship: { id: "ship", place: placer([B3_AXIS_XZ[0], B3_INTERFACE, B3_AXIS_XZ[1]], 52.1 / (B3_NOSE - B3_INTERFACE), B3_RADIAL_SHIP, 90) },
};

// MartianDays' file is 5,317.9 units tall; sourced height 50 m. Nothing about its width is sourced, so it keeps the file's own proportion.
const MD_SCALE = 50 / 5317.86;
// Falcon 9 Block 5, by Stanley Creative. 7,100 units from the engines to the fairing's tip: first stage with interstage to 4,865, then the second stage, then the fairing from 5,794. Its diameter is 366 units. The second stage's nozzle
// nests in the interstage. It shows Block 5: black interstage, black legs, grid fins.
const F9_TOP_OF_FIRST = 4865;
const F9_FAIRING_BASE = 5794.25;
const F9_R = 3.7 / 366;
const F9_FIRST: RecipePart = { id: "first-stage", place: placer([0, 0.64, 0], 47.7 / (F9_TOP_OF_FIRST - 0.64), F9_R, 0) };
const F9_JOINT_SCALE = 9 / (F9_FAIRING_BASE - F9_TOP_OF_FIRST);
// its origin is where the nozzle would end, 4.8 m under its joint with the interstage, the same as this package's own second stage. The model has no nozzle: it hides in the interstage.
const F9_SECOND_BOTTOM = F9_TOP_OF_FIRST - 4.8 / F9_JOINT_SCALE;
const F9_SECOND: RecipePart = { id: "second-stage", place: placer([0, F9_SECOND_BOTTOM, 0], F9_JOINT_SCALE, F9_R, 0) };
const F9_FAIRING: RecipePart = { id: "fairing", place: placer([0, F9_FAIRING_BASE, 0], 13.1 / (7100 - F9_FAIRING_BASE), F9_R, 0) };
/** Which part of the Falcon 9 a node belongs to: the second stage's nodes run down inside the interstage. */
function f9Part(y: number, name: string): RecipePart {
  if (/^Fairing/.test(name)) return F9_FAIRING;
  if (/Second Stage|MVac|Merlin Vac|Vacuum/i.test(name) && !/Detacher|Interstage/.test(name)) return F9_SECOND;
  if (y > F9_TOP_OF_FIRST) return F9_SECOND;
  return F9_FIRST;
}
function f9Material(name: string): string | null {
  const map: Record<string, string> = { F9_Second_Stage: "white", F9_First_Stage: "white", F9_Fairing: "white", Landing_Leg_White: "white", F9_Black: "black", Landing_Leg_Black: "black", Landing_Leg_Gray: "dark", F9_Octaweb_Black: "soot", Engine_Cloth_Black: "soot", F9_Grid_Fin: "fin", Metal_White_Gold: "gold", Merlin_Engine_1: "bell", Merlin_Engine_2: "engine-metal", Merlin_Engine_3: "engine-metal" };
  return map[name] ?? null;
}

// Dragon 2, by KUBAHA: its capsule and trunk meet at y = 0.04 in its own units, 0.808 from end to end and 0.4 across the capsule.
const D2_MEET = 0.04;
const D2_R = 4 / 0.4;
const D2_CAPSULE_BASE = 0.0031;
const D2_CAPSULE_SCALE = 4.5 / (0.4883 - D2_CAPSULE_BASE);
const D2_TRUNK: RecipePart = { id: "trunk", place: placer([0, -0.3201, 0], 3.942 / (D2_MEET + 0.3201), D2_R, 0) };
const D2_CAPSULE: RecipePart = { id: "capsule", place: placer([0, D2_CAPSULE_BASE, 0], D2_CAPSULE_SCALE, D2_R, 0) };
const D2_MATERIALS: Record<string, string | null> = { "BIALY.001": "white", czarny: "black", radon_solar: "solar", pasek: "dark", METAL: "engine-metal", okno: "glass", plastic: "white" };

// Dragon 1, by ProgressTH: it lies along z, from the trunk's end at -237.9 to the nose at about -12, its capsule's heat shield at -113 to -139. Its pressure vessel is hidden inside the shell.
const CD_AXIS: [number, number] = [-313.2, 89.64];
const CD_MEET = -147.38;
const CD_NOSE = 0;
const CD_END = -237.93;
const CD_R = 3.7 / 154.85;
const cdPlace = (from: number, scale: number) => (p: number[], n: number[]) => {
  // z is up in the file: stand it on its end, with a proper turn
  const x = (p[0] - CD_AXIS[0]) * CD_R;
  const z = -(p[1] - CD_AXIS[1]) * CD_R;
  const y = (p[2] - from) * scale;
  p[0] = x;
  p[1] = y;
  p[2] = z;
  const nx = n[0] / CD_R;
  const ny = n[2] / scale;
  const nz = -n[1] / CD_R;
  n[0] = nx;
  n[1] = ny;
  n[2] = nz;
};
const CD_TRUNK: RecipePart = { id: "trunk", place: cdPlace(CD_END, 2.3 / (CD_MEET - CD_END)) };
const CD_CAPSULE: RecipePart = { id: "capsule", place: cdPlace(CD_MEET, 3.8 / (CD_NOSE - CD_MEET)) };
function cdMaterial(name: string, _m: Material, node: string): string | null {
  void node;
  if (name === "Dragon_Logo") return null;
  if (name === "Metal_Silver") return "engine-metal";
  const map: Record<string, string> = { Metal_Gold: "gold", White_Hull: "white", HeatShield: "soot", SolarPanel: "solar", black: "black", Glass: "glass", material: "white", edge_color000255: "black", edge_color525252255: "dark", edge_color898989255: "dark", edge_color1351105255: "gold", edge_color181181181255: "engine-pale", edge_color200200200255: "engine-pale", edge_color255255255255: "white" };
  return map[name] ?? null;
}

// Falcon Heavy, by Antonio_Adams: 242.3 units tall, 49.7 across its three cores; one mesh, whose side boosters are their own connected pieces, and whose centre core, upper stage and fairing are one shell. Engines are their own pieces too.
const FH_BOTTOM = -6.21;
const FH_CENTRE: [number, number] = [-116.6, -2.1];
const FH_LEFT: [number, number] = [-134.1, -2.1];
const FH_RIGHT: [number, number] = [-99.1, -1.6];
const FH_H = 70 / (236.12 - FH_BOTTOM);
const FH_R = 12.2 / 49.7;
const fhPart = (id: string, at: [number, number]): RecipePart => ({ id, place: placer([at[0], FH_BOTTOM, at[1]], FH_H, FH_R, 0) });
const FH_PARTS = { centre: fhPart("centre", FH_CENTRE), left: fhPart("side-left", FH_LEFT), right: fhPart("side-right", FH_RIGHT) };

// Grasshopper, by Echo_3: 27.75 units from the feet to its tip. Sourced height 32 m; its width is not sourced, so it keeps the file's proportion. Its blue frame is true to photographs. Material.093 carries the wordmark and logo.
const GH_BOTTOM = -15.18;
const GH_SCALE = 32 / (12.57 - GH_BOTTOM);
const GH: RecipePart = { id: "vehicle", place: placer([0, GH_BOTTOM, 0], GH_SCALE, GH_SCALE, 0) };
function ghMaterial(name: string, material: Material): string | null {
  if (name === "Material.093") return "white";
  const [r, g, b] = material.getBaseColorFactor();
  const metal = material.getMetallicFactor();
  if (b > 0.3 && r < 0.05) return "blue";
  if (r > 0.2 && g < 0.08) return "dark";
  if (r > 0.75) return metal > 0.5 ? "engine-pale" : "white";
  if (r > 0.35 && g > 0.3 && b < 0.2) return "gold";
  if (r > 0.3) return "engine-pale";
  if (r > 0.12) return "engine-metal";
  return "dark";
}

const MD_SHIP: RecipePart = { id: "ship", place: placer([0, -5305.51, -23], MD_SCALE, MD_SCALE, 180) };
