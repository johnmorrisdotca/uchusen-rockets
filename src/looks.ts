// The three looks, each one table entry: the line drawing, the thick lines, and the painted rocket. A look changes lines, colours and fills, never a shape. Pure.

export const LOOK_NAMES = ["line", "thick", "painted"] as const;
export type LookName = (typeof LOOK_NAMES)[number];
export const DEFAULT_LOOK: LookName = "line";

export interface Look {
  /** The colour of its lines. */
  line: string;
  /** Pixels wide in a 3D view: the outline and the lines between. */
  outlinePx: number;
  featurePx: number;
  weldPx: number;
  /** How much of the weld lines shows. */
  weldOpacity: number;
  /** The drawing's strokes, in its units. */
  outline: number;
  feature: number;
  weld: number;
  /** The drawing's fills, by material group. */
  fills: Readonly<Record<FillName, readonly [string, string, string]>>;
  /** The soft light behind the rocket in a drawing. */
  halo: boolean;
}

export type FillName = "hull" | "white" | "tile" | "metal" | "dark" | "bell" | "foam";

const NIGHT = {
  hull: ["#0c1422", "#2a3850", "#0c1422"],
  white: ["#0e1626", "#33435f", "#0e1626"],
  tile: ["#05080e", "#101827", "#05080e"],
  metal: ["#16202f", "#3a475c", "#16202f"],
  dark: ["#070b12", "#121a28", "#070b12"],
  bell: ["#0a0f18", "#242f42", "#0a0f18"],
  foam: ["#16202f", "#3a475c", "#16202f"],
} as const;

export const LOOKS: Readonly<Record<LookName, Look>> = {
  line: { line: "#8fa1b8", outlinePx: 1.4, featurePx: 1, weldPx: 0.6, weldOpacity: 0.45, outline: 1.2, feature: 0.8, weld: 0.45, fills: NIGHT, halo: true },
  thick: { line: "#b4c2d4", outlinePx: 3.4, featurePx: 2, weldPx: 0.9, weldOpacity: 0.5, outline: 3.4, feature: 1.7, weld: 0.6, fills: NIGHT, halo: true },
  painted: {
    line: "#30343a",
    outlinePx: 0,
    featurePx: 1,
    weldPx: 1,
    weldOpacity: 0.28,
    outline: 0.6,
    feature: 0.5,
    weld: 0.3,
    fills: {
      hull: ["#7f858c", "#e6e9ec", "#8d9399"],
      white: ["#b9bab5", "#f4f4ef", "#c2c3be"],
      tile: ["#0b0c0e", "#26282c", "#0b0c0e"],
      metal: ["#5a5f66", "#a9afb6", "#5a5f66"],
      dark: ["#111316", "#2a2d31", "#111316"],
      bell: ["#141518", "#3c3f44", "#141518"],
      foam: ["#6e3a1b", "#c8743a", "#6e3a1b"],
    },
    halo: false,
  },
};

/** A value from outside as a look's name: the default for anything else. */
export const cleanLook = (value: unknown): LookName => ((LOOK_NAMES as readonly unknown[]).includes(value) ? (value as LookName) : DEFAULT_LOOK);
