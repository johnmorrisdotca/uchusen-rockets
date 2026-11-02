// Soyuz-2 from a table of numbers: the whole, the core, the boosters, the third stage and the width over the fins are sourced. Its waist, how far the boosters lean and the paint are judged from photographs.
import { SOYUZ_BOOSTER_DIAMETER } from "../data/soyuz.ts";
import { blank } from "../data/types.ts";
import { deg } from "../framing.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { radial, strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const WHOLE = 46.3;
const CORE = 27.1;
const CORE_R = 2.95 / 2;
const WAIST = 1.05;
const BOOST = 19.6;
const BOOST_R = 2.68 / 2;
const THIRD = 6.7;
const THIRD_R = 2.66 / 2;
const FAIRING = WHOLE - CORE - THIRD;
const FAIRING_R = 1.65;
const SPAN = 10.3 / 2;
const CHAMBER = 0.34;

/** Four chambers in a square, as one engine of this family has. */
const chambers = (at: readonly [number, number], y: number, spread: number): Piece[] =>
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([a, b]) => merlin([at[0] + a * spread, at[1] + b * spread], y, CHAMBER, 1.5));

function core(): Piece[] {
  const start = 1.3;
  const shoulder = BOOST + 0.9;
  return [
    { kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile: [[WAIST, start], [CORE_R * 0.86, shoulder * 0.55], [CORE_R, shoulder], [CORE_R, CORE - 3.6], [THIRD_R * 1.02, CORE - 2.4]], rings: [start + 0.02, shoulder, CORE - 3.6], welds: [11] },
    floor(WAIST, start),
    ...chambers([0, 0], 0, 0.42),
    // the open frame between the core and the third stage
    ...[45, 135, 225, 315].flatMap((az): Piece[] => {
      const a = deg(az);
      const at = (r: number, y: number): Vec3 => [r * Math.sin(a), y, r * Math.cos(a)];
      return [strut("dark", at(THIRD_R * 0.96, CORE - 2.4), at(THIRD_R * 0.96, CORE), 0.12, 0.12)];
    }),
    { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, CORE - 2.4], [THIRD_R, CORE - 2.4]] },
  ];
}

/** A booster, leaning in to meet the core at its tip: short frusta, each a little nearer the core. `az` is where it stands, in degrees. */
function booster(az: number): Piece[] {
  const a = deg(az);
  const inward: readonly [number, number] = [-Math.sin(a), -Math.cos(a)];
  const base = 1.3;
  const reach = WAIST + BOOST_R - CORE_R * 0.92;
  const slope: readonly [number, number] = [(inward[0] * reach) / (BOOST - base), (inward[1] * reach) / (BOOST - base)];
  const profile: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    profile.push([BOOST_R * (1 - t) ** 0.9, base + (BOOST - base) * t]);
  }
  profile[6] = [0.001, BOOST];
  const out: Piece[] = [{ kind: "lathe", material: "white", at: [-slope[0] * base, -slope[1] * base], lean: slope, segs: 24, body: true, outline: true, profile, rings: [base + 0.02] }];
  out.push({ kind: "lathe", material: "soot", segs: 24, under: true, profile: [[0, base], [BOOST_R, base]] });
  out.push(...chambers([0, 0], 0, 0.42));
  // the square fin that sticks out of its foot, whose tip gives the sourced width over the fins
  const out0 = SPAN - (WAIST + BOOST_R);
  out.push({ kind: "plate", material: "white", frame: radial(a), outline: [[BOOST_R - 0.1, base], [out0, base], [out0, base + 1.4], [BOOST_R - 0.1, base + 1.8]], thickness: 0.1 });
  return out;
}

const third = (): Piece[] => [tube("white", THIRD_R, 0, THIRD, { rings: [0.02, THIRD - 0.02], welds: [THIRD * 0.5] }), floor(THIRD_R, 0), ...merlin([0, 0], -0.0, 0.5, 1)];

const FROM = "This package's code, from the sourced whole, core, boosters, third stage and width over the fins; the waist, the boosters' lean, the fairing's length and the paint are judged from photographs. No licensed model is used, and no name or mark is drawn.";
const STAND = WAIST + BOOST_R;
const place = (az: number) => ({ x: STAND * Math.sin(deg(az)), z: STAND * Math.cos(deg(az)) });

export const SOYUZ_BUILDS: readonly StackBuild[] = [
  {
    rocket: "soyuz",
    variant: "soyuz-2",
    drawnFrom: FROM,
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "Block A, the core, Soyuz-2", height: CORE, diameter: CORE_R * 2, top: [CORE, THIRD_R * 2], sourcedDiameter: { value: 2.95, source: "wikipedia-soyuz-2" }, pieces: core },
      ...[45, 135, 225, 315].map((az, i) => ({ slot: `booster-${i + 1}`, kind: "liquid-booster" as const, name: `Booster ${i + 1}, Soyuz-2`, height: BOOST, diameter: BOOST_R * 2, place: place(az), sourcedDiameter: SOYUZ_BOOSTER_DIAMETER, pieces: () => booster(az) })),
      { slot: "third-stage", kind: "third-stage", name: "Block I, third stage, Soyuz-2", height: THIRD, diameter: THIRD_R * 2, bottom: [0, THIRD_R * 2], top: [THIRD, THIRD_R * 2], sourcedDiameter: { value: 2.66, source: "wikipedia-soyuz-2" }, pieces: third },
      { slot: "fairing", kind: "fairing", name: "Fairing, Soyuz-2", height: FAIRING, diameter: FAIRING_R * 2, bottom: [0, THIRD_R * 2], sourcedDiameter: blank("No source read here gives it."), pieces: () => fairingShell("white", FAIRING_R, FAIRING, FAIRING * 0.5, 1.35, THIRD_R) },
    ],
  },
];
