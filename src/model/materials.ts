// One material naming scheme for every part from every source: this package's code and the licensed models alike. The viewer reads these names, so a part from anywhere looks as if it belongs, in the
// painted look and in the two line looks. Colours are sRGB.
import type { FillName } from "../looks.ts";

export interface MaterialSpec {
  color: string;
  metal: number;
  rough: number;
  /** The fill it takes in a drawing. */
  fill: FillName;
}

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
  foam: { color: "#a9592a", metal: 0, rough: 0.8, fill: "metal" },
  yellow: { color: "#c9a227", metal: 0.1, rough: 0.6, fill: "metal" },
  concrete: { color: "#8b8d8a", metal: 0, rough: 0.9, fill: "metal" },
  red: { color: "#a4322b", metal: 0.1, rough: 0.5, fill: "metal" },
} as const satisfies Record<string, MaterialSpec>;

export type MaterialName = keyof typeof MATERIALS;
