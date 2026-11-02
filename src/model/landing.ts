// A drone ship's deck, a landing pad, and a Falcon 9 first stage standing on them with its legs out. The deck's and the pad's sizes are sourced where the data says so; hull, equipment and legs are judged from photographs.
import { blank } from "../data/types.ts";
import { deg } from "../framing.ts";
import { falconFirstStageBare, FALCON_DRAWS } from "./falcon.ts";
import { brace } from "./kit.ts";
import type { MaterialName } from "./materials.ts";
import type { Frame, Piece, Plate } from "./pieces.ts";
import type { StackBuild, StackPart } from "./stacks.ts";

const DECK_L = 91.44;
const DECK_W = 51.82;
const HULL_L = DECK_L * 1.18;
const HULL_W = 30.5;
const HULL_H = 6;
const DECK_T = 0.8;
const DECK_TOP = HULL_H + DECK_T;
const PAD_R = 85.95 / 2;
const PAD_T = 0.4;
const FOOT = 9;
const LEG_TOP = 10.5;

const FLAT = (y: number): Frame => ({ o: [0, y, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] });
const box = (material: MaterialName, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, plain = true): Plate => ({ kind: "plate", material, frame: FLAT((y0 + y1) / 2), outline: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], thickness: y1 - y0, plain });
const disc = (material: MaterialName, r: number, r0: number, y: number): Piece => ({ kind: "lathe", material, segs: 72, body: true, profile: [[r, y], [r0, y]] });

function deck(): Piece[] {
  const L = DECK_L / 2;
  const W = DECK_W / 2;
  const hull = HULL_L / 2;
  const h = HULL_W / 2;
  const out: Piece[] = [
    box("dark", -hull, hull, -h, h, 0, HULL_H, false),
    { ...box("fin", -L, L, -W, W, HULL_H, DECK_TOP, false), plain: false },
    // the plain ring: no mark, no name
    disc("white", 23, 21.8, DECK_TOP + 0.03),
    // the deck's yellow edge
    box("yellow", -L, L, W - 0.5, W, DECK_TOP, DECK_TOP + 0.05),
    box("yellow", -L, L, -W, -W + 0.5, DECK_TOP, DECK_TOP + 0.05),
  ];
  // equipment at each end, on the hull; thrusters at the corners
  for (const side of [1, -1]) {
    const a = side * (L + 0.6);
    const b = side * (hull - 0.6);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    out.push(box("white", lo, hi, -h + 1, -h + 4, HULL_H, HULL_H + 3));
    out.push(box("gold", lo, hi, -h + 5, -h + 8, HULL_H, HULL_H + 2.6));
    out.push(box("white", lo, hi, h - 8, h - 5, HULL_H, HULL_H + 2.6));
    out.push(box("blue", lo, hi, h - 4, h - 1, HULL_H, HULL_H + 3));
    for (const z of [1, -1]) out.push(box("black", side * L - 3, side * L + 3, z * (h + 0.1), z * (h + 3.2), 1, HULL_H - 0.6));
  }
  return out;
}

function pad(): Piece[] {
  return [
    { kind: "lathe", material: "concrete", segs: 72, body: true, outline: true, profile: [[PAD_R, 0], [PAD_R, PAD_T], [0.001, PAD_T]], rings: [PAD_T] },
    disc("white", PAD_R * 0.62, PAD_R * 0.6, PAD_T + 0.03),
  ];
}

function landed(): Piece[] {
  const r = FALCON_DRAWS["block-5"].first.radius;
  const out: Piece[] = falconFirstStageBare("block-5");
  for (const az of [45, 135, 225, 315]) {
    // a leg down from its hinge, a pusher from high on the hull, and a foot
    out.push(brace("black", [r, 1, az], [FOOT, 0.4, az], 0.55));
    out.push(brace("black", [r + 0.05, LEG_TOP, az], [FOOT, 0.5, az], 0.28));
    const a = deg(az);
    out.push(box("dark", FOOT * Math.sin(a) - 0.7, FOOT * Math.sin(a) + 0.7, FOOT * Math.cos(a) - 0.7, FOOT * Math.cos(a) + 0.7, 0, 0.2));
  }
  return out;
}

const LANDED_NAME = "First stage, Falcon 9 Block 5, landed with its legs out";
const NONE = blank("No source read here gives it.");
const standing = (y: number): StackPart => ({ slot: "landed", kind: "first-stage", name: LANDED_NAME, height: FALCON_DRAWS["block-5"].first.height, diameter: FOOT * 2, place: { x: 0, z: 0, y }, sourcedDiameter: NONE, pieces: landed });
const SHIP_FROM = "This package's code. Its deck's size is the first barge's, in its article; hull, equipment and legs are judged from photographs. No name, mark or logo is drawn.";

export const DRONESHIP_BUILDS: readonly StackBuild[] = ["ocisly", "jrti", "asog"].map((variant) => ({
  rocket: "droneship",
  variant,
  drawnFrom: SHIP_FROM,
  parts: [{ slot: "deck", kind: "deck", name: "Deck and hull", height: DECK_TOP, diameter: DECK_L, sourcedDiameter: NONE, pieces: deck }, standing(DECK_TOP)],
}));

export const LANDING_ZONE_BUILDS: readonly StackBuild[] = ["lz-1", "lz-4"].map((variant) => ({
  rocket: "landing-zone",
  variant,
  drawnFrom: "This package's code, a plain round pad at the size the source gives for the Cape's; the stage's legs are judged from photographs. No mark is drawn.",
  parts: [{ slot: "pad", kind: "deck", name: "Landing pad", height: PAD_T, diameter: PAD_R * 2, ...(variant === "lz-4" ? { sourcedDiameter: NONE } : {}), pieces: pad }, standing(PAD_T)],
}));
