// The lunar module in plain shapes, for the line looks: its height and widths are sourced, and where its legs and tanks stand is measured from NASA's model at that scale. The painted look is NASA's model.
import { LM_ASCENT_WIDTH, LM_WIDTH } from "../data/lunarmodule.ts";
import { deg } from "../framing.ts";
import { merlin } from "./falcon.ts";
import { brace, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const WHOLE = 7.04;
const SCALE = WHOLE / 5.02;
const DESCENT = 3.96;
const ASCENT_AT = (2.1 - 0.1) * SCALE;
const R = 4.22 / 2;

function descent(): Piece[] {
  const out: Piece[] = [tube("gold", R, 1.36, 3.25, { segs: 8, rings: [1.38, 3.23] }), { kind: "lathe", material: "soot", segs: 8, under: true, profile: [[0, 1.36], [R, 1.36]] }, ...merlin([0, 0], 0.45, 0.75, 1)];
  for (const az of [0, 90, 180, 270]) {
    out.push(brace("gold", [4.2, 0.35, az], [2.1, 2.9, az], 0.14), brace("engine-pale", [3, 1.3, az], [2.1, 1.45, az + 28], 0.07), brace("engine-pale", [3, 1.3, az], [2.1, 1.45, az - 28], 0.07));
    out.push({ kind: "lathe", material: "gold", at: [4.3 * Math.sin(deg(az)), 4.3 * Math.cos(deg(az))], segs: 12, outline: true, profile: [[0.001, 0], [0.42, 0.04], [0.42, 0.1], [0.001, 0.28]] });
  }
  for (const az of [45, 135, 225, 315]) out.push(brace("engine-pale", [1.9, 3.25, az], [1.9, DESCENT, az], 0.1));
  return out;
}

function ascent(): Piece[] {
  const r = (LM_ASCENT_WIDTH.value ?? 0) / 2;
  const out: Piece[] = [tube("engine-pale", r * 0.92, 0.7, 2.9, { segs: 8, rings: [0.72] }), taper("engine-pale", r * 0.92, 2.9, r * 0.55, 3.35, { segs: 8 }), { kind: "lathe", material: "dark", segs: 8, under: true, profile: [[0, 0.7], [r * 0.92, 0.7]] }];
  for (const az of [45, 135, 225, 315]) {
    const a = deg(az);
    out.push({ kind: "lathe", material: "gold", at: [r * 1.05 * Math.sin(a), r * 1.05 * Math.cos(a)], segs: 8, profile: [[0.08, 1.8], [0.08, 2.25]] });
  }
  // the dish and its mast
  out.push({ kind: "lathe", material: "white", at: [0, -0.6], segs: 14, outline: true, profile: [[0.001, 3.55], [0.45, 3.9], [0.48, 4]] }, brace("engine-pale", [0.6, 3.2, 180], [0.6, 3.6, 180], 0.06), brace("engine-pale", [0.9, 3.2, 90], [0.9, 4.2, 90], 0.03));
  return out;
}

const FROM = "NASA's model for the painted look. This package's plain shapes for the two line looks, from the sourced height and widths; where its parts stand is measured from NASA's model.";

export const LUNAR_MODULE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "lunar-module",
    variant: "lunar-module",
    drawnFrom: FROM,
    parts: [
      { slot: "descent", kind: "spacecraft", name: "Descent stage, Apollo lunar module", height: DESCENT, diameter: LM_WIDTH.value ?? 0, sourcedDiameter: LM_WIDTH, painted: { file: "lunar-module-descent.glb", credit: "nasa-lunar-module" }, pieces: descent },
      { slot: "ascent", kind: "spacecraft", name: "Ascent stage, Apollo lunar module", height: WHOLE - ASCENT_AT, diameter: LM_ASCENT_WIDTH.value ?? 0, place: { x: 0, z: 0, y: ASCENT_AT }, sourcedDiameter: LM_ASCENT_WIDTH, painted: { file: "lunar-module-ascent.glb", credit: "nasa-lunar-module" }, pieces: ascent },
    ],
  },
];
