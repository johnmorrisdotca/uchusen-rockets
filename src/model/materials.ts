// One material naming scheme for every part from every source: this package's code and the licensed models alike. The viewer reads these names, so a part from anywhere looks as if it belongs, in the
// painted look and in the two line looks. Colours are sRGB.
import type { FillName } from "../looks.ts";
import { FLEET_PALETTE as P } from "./fleet/palette.ts";

/**
 * One material: its colour, how metal and how rough it is in a 3D view, and the fill group it takes in a drawing.
 *
 * @example
 * ```ts
 * import { MATERIALS, type MaterialSpec } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const steel: MaterialSpec = MATERIALS.steel;
 * console.log(steel.color, steel.fill);
 * ```
 */
export interface MaterialSpec {
  color: string;
  metal: number;
  rough: number;
  /** The fill it takes in a drawing. */
  fill: FillName;
}

/**
 * Every material the meshes use, by name. One naming scheme serves every source.
 *
 * @example
 * ```ts
 * import { MATERIALS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(MATERIALS).length > 5);
 * ```
 */
export const MATERIALS = {
  steel: { color: "#c3c7cb", metal: 1, rough: 0.3, fill: "hull" },
  tile: { color: "#101114", metal: 0, rough: 0.62, fill: "tile" },
  "tile-plain": { color: "#101114", metal: 0, rough: 0.6, fill: "tile" },
  soot: { color: "#17181a", metal: 0.2, rough: 0.85, fill: "dark" },
  dark: { color: "#1c1d20", metal: 0.4, rough: 0.55, fill: "dark" },
  bell: { color: "#2c2d31", metal: 0.55, rough: 0.42, fill: "bell" },
  "bell-inside": { color: "#0a0a0c", metal: 0.2, rough: 0.8, fill: "dark" },
  "engine-metal": { color: "#6d7075", metal: 0.85, rough: 0.4, fill: "metal" },
  "engine-pale": { color: "#b9bcc0", metal: 0.6, rough: 0.5, fill: "metal" },
  fin: { color: "#6b6e73", metal: 0.85, rough: 0.5, fill: "metal" },
  "fin-dark": { color: "#2a2b2f", metal: 0.4, rough: 0.55, fill: "dark" },
  white: { color: "#cfcfca", metal: 0, rough: 0.5, fill: "white" },
  black: { color: "#141518", metal: 0, rough: 0.45, fill: "dark" },
  gold: { color: "#c8a24c", metal: 1, rough: 0.28, fill: "metal" },
  solar: { color: "#10163a", metal: 0.4, rough: 0.22, fill: "dark" },
  glass: { color: "#141c26", metal: 0.1, rough: 0.08, fill: "dark" },
  blue: { color: "#1d4f96", metal: 0.25, rough: 0.5, fill: "metal" },
  foam: { color: "#a9592a", metal: 0, rough: 0.8, fill: "foam" },
  yellow: { color: "#c9a227", metal: 0.1, rough: 0.6, fill: "metal" },
  concrete: { color: "#8b8d8a", metal: 0, rough: 0.9, fill: "metal" },
  ground: { color: "#4d5a41", metal: 0, rough: 1, fill: "dark" },
  sand: { color: "#c3b58c", metal: 0, rough: 1, fill: "white" },
  water: { color: "#27475e", metal: 0.1, rough: 0.4, fill: "dark" },
  red: { color: "#a4322b", metal: 0.1, rough: 0.5, fill: "metal" },
  "hull-white": { color: P.protected, metal: 0.25, rough: 0.5, fill: "white" },
  "hull-white-worn": { color: "#b9b7ae", metal: 0.3, rough: 0.62, fill: "white" },
  "hull-orange": { color: P.shield, metal: 0.35, rough: 0.5, fill: "metal" },
  "hull-orange-worn": { color: "#a86432", metal: 0.4, rough: 0.62, fill: "metal" },
  "hull-yellow": { color: P.service, metal: 0.3, rough: 0.5, fill: "metal" },
  "hull-grey": { color: P.structure, metal: 0.65, rough: 0.45, fill: "metal" },
  "hull-grey-dark": { color: "#4b5057", metal: 0.7, rough: 0.5, fill: "dark" },
  "hull-blue": { color: "#55778c", metal: 0.4, rough: 0.5, fill: "metal" },
  "panel-dark": { color: P.heatSink, metal: 0.55, rough: 0.55, fill: "dark" },
  coolant: { color: P.coolant, metal: 0.55, rough: 0.4, fill: "metal" },
  blanket: { color: "#e3e0d8", metal: 0.05, rough: 0.9, fill: "white" },
  copper: { color: "#b8733a", metal: 1, rough: 0.34, fill: "metal" },
  coil: { color: P.coil, metal: 1, rough: 0.26, fill: "metal" },
  radiator: { color: "#e4e2da", metal: 0.15, rough: 0.4, fill: "white" },
  "radiator-hot": { color: "#9b4b3a", metal: 0.3, rough: 0.5, fill: "metal" },
  hazard: { color: "#dcb126", metal: 0.1, rough: 0.55, fill: "metal" },
  frost: { color: "#b9d2de", metal: 0.1, rough: 0.55, fill: "white" },
  "lamp-amber": { color: "#ffb43a", metal: 0, rough: 0.3, fill: "metal" },
  "lamp-blue": { color: P.light, metal: 0, rough: 0.2, fill: "white" },
  "lamp-red": { color: "#d8372f", metal: 0, rough: 0.35, fill: "metal" },
  deck: { color: "#7b7f84", metal: 0.3, rough: 0.7, fill: "metal" },
  plant: { color: P.farm, metal: 0, rough: 0.8, fill: "dark" },
  fuel: { color: P.propellant, metal: 0.1, rough: 0.35, fill: "metal" },
  core: { color: "#e9f6ff", metal: 0, rough: 0.2, fill: "white" },
} as const satisfies Record<string, MaterialSpec>;

/**
 * The name of one material in `MATERIALS`.
 *
 * @example
 * ```ts
 * import type { MaterialName } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const name: MaterialName = "steel";
 * console.log(name);
 * ```
 */
export type MaterialName = keyof typeof MATERIALS;
