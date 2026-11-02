// Gemini in plain shapes, for the line looks: its length and width are sourced, and where the adapter ends and the capsule's shape are measured from NASA's model at that scale. The painted look is NASA's model.
import { GEMINI_WIDE } from "../data/gemini.ts";
import { blank } from "../data/types.ts";
import { floor, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const WHOLE = 5.61;
const SCALE = WHOLE / 13.67;
const ADAPTER = (5.95 - 0.14) * SCALE;
const R = (GEMINI_WIDE.value ?? 0) / 2;
const NECK = 1.07;

const adapter = (): Piece[] => [taper("white", R, 0, NECK * 1.12, ADAPTER * 0.55, { rings: [0.02], welds: [ADAPTER * 0.25] }), tube("white", NECK * 1.12, ADAPTER * 0.55, ADAPTER * 0.62), taper("white", NECK * 1.12, ADAPTER * 0.62, NECK, ADAPTER, { rings: [ADAPTER - 0.02] }), floor(R, 0.02)];
const capsule = (): Piece[] => [
  taper("black", NECK, 0, 0.42, 1.55, { rings: [0.02, 1.53] }),
  tube("black", 0.42, 1.55, 2.2, { rings: [1.9] }),
  taper("black", 0.42, 2.2, 0.36, WHOLE - ADAPTER - 0.25),
  tube("white", 0.36, WHOLE - ADAPTER - 0.25, WHOLE - ADAPTER),
];

const FROM = "NASA's model for the painted look. This package's plain shapes for the two line looks, from the sourced length and width; where the adapter ends is measured from NASA's model. No flag or lettering is drawn.";

export const GEMINI_BUILDS: readonly StackBuild[] = [
  {
    rocket: "gemini",
    variant: "gemini",
    drawnFrom: FROM,
    parts: [
      { slot: "adapter", kind: "spacecraft", name: "Adapter, Gemini", height: ADAPTER, diameter: R * 2, sourcedDiameter: GEMINI_WIDE, painted: { file: "gemini-adapter.glb", credit: "nasa-gemini" }, pieces: adapter },
      { slot: "capsule", kind: "capsule", name: "Reentry module, Gemini", height: WHOLE - ADAPTER, diameter: NECK * 2, place: { x: 0, z: 0, y: ADAPTER }, sourcedDiameter: blank("No source read here gives its size."), painted: { file: "gemini-capsule.glb", credit: "nasa-gemini" }, pieces: capsule },
    ],
  },
];
