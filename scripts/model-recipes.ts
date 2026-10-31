// What is taken from each licensed model, and how. Each recipe says which material of the model becomes which of ours (null: never used), where each part begins and how its triangles reach the
// package's convention: metres, Y up, base of the part on the axis at y = 0, the windward (tiled) side towards +Z. Scales come from the sourced sizes, never the other way round.

import type { Material } from "@gltf-transform/core";

export interface RecipePart {
  id: string;
  place: (p: number[], n: number[]) => void;
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
  textures?: Record<string, { from: string; maps: ("base" | "metalRough" | "normal" | "emissive")[]; size?: number }>;
  partAt: (y: number, nodeName: string) => RecipePart;
  budgets: Record<string, Record<string, { ratio: number; error: number }>>;
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

const PAINT: Record<string, MaterialSpecEntry> = {  steel: STEEL,
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

const B3_RADIAL_BOOSTER = 9 / B3_DIAMETER;
const B3_RADIAL_SHIP = 9 / B3_DIAMETER;
const B3_PARTS = {
  booster: { id: "booster", place: placer([B3_AXIS_XZ[0], B3_BOTTOM, B3_AXIS_XZ[1]], 72.3 / (B3_BOOSTER_TOP - B3_BOTTOM), B3_RADIAL_BOOSTER, 90) },
  ship: { id: "ship", place: placer([B3_AXIS_XZ[0], B3_INTERFACE, B3_AXIS_XZ[1]], 52.1 / (B3_NOSE - B3_INTERFACE), B3_RADIAL_SHIP, 90) },
};

// MartianDays' file is 5,317.9 units tall; sourced height 50 m. Nothing about its width is sourced, so it keeps the file's own proportion.
const MD_SCALE = 50 / 5317.86;
const MD_SHIP: RecipePart = { id: "ship", place: placer([0, -5305.51, -23], MD_SCALE, MD_SCALE, 180) };
