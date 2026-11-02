// Falcon 1 from a table of numbers. The whole and the fairing are sourced; how the rest shares that out is judged from photographs of its fourth flight's vehicle: a white first stage, a black interstage and a white second stage under the fairing.
import { merlin } from "./falcon.ts";
import { deg } from "../framing.ts";
import { floor, nose, raceway, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";
import { variantOfFairing } from "../data/falcon1.ts";

const R = 0.85;

interface Falcon1Draw {
  first: number;
  interstage: number;
  second: number;
  joint: number;
  fairing: { height: number; radius: number; straight: number; blunt: number };
}

const DRAWS: Readonly<Record<string, Falcon1Draw>> = {
  // 21.3 m: 15.8 of first stage with its interstage, 2 showing of the second stage, and the sourced 3.5 of fairing
  "falcon-1": { first: 15.8, interstage: 3.2, second: 4.5, joint: 2.5, fairing: { height: 3.5, radius: 0.77, straight: 1.5, blunt: 1.25 } },
  // 27.4 m: the 90 feet, with the sourced 4.4 of fairing
  "falcon-1e": { first: 20.8, interstage: 3.2, second: 4.7, joint: 2.5, fairing: { height: 4.4, radius: 0.85, straight: 1.7, blunt: 1.15 } },
};

function firstStage(d: Falcon1Draw): Piece[] {
  const tank = d.first - d.interstage;
  const skirt = 1.7;
  return [
    tube("white", R, skirt, tank, { rings: [skirt + 0.02, tank - 0.02], welds: [tank * 0.5, tank * 0.72] }),
    tube("black", R, tank, d.first, { rings: [d.first - 0.02] }),
    floor(R, skirt),
    // the single engine, and the frame that holds it
    ...merlin([0, 0], 0, 0.42, 2),
    { kind: "lathe", material: "engine-metal", segs: 16, under: true, only: "mesh", profile: [[R * 0.7, skirt], [R * 0.32, skirt - 0.6]] },
    // the cable run up its side
    raceway("white", R, skirt + 0.2, d.first - 0.2, 180, 0.16, 0.08),
  ];
}

function secondStage(d: Falcon1Draw): Piece[] {
  return [
    tube("white", R, d.joint, d.second, { rings: [d.joint + 0.02], welds: [(d.joint + d.second) / 2] }),
    floor(R, d.joint),
    ...merlin([0, 0], 0, 0.36, d.joint * 0.95),
  ];
}

function fairing(d: Falcon1Draw["fairing"]): Piece[] {
  const shell = nose("white", d.radius, d.straight, d.height, d.blunt);
  const seam = (a: number): Vec3[] => shell.profile.map(([r, y]) => [(r + 0.008) * Math.sin(a), y, (r + 0.008) * Math.cos(a)] as Vec3);
  return [
    { ...shell, profile: [[d.radius, 0], ...shell.profile], rings: [d.straight] },
    floor(d.radius, 0),
    { kind: "lines", weight: "feature", paths: [seam(deg(90)), seam(deg(-90))] },
  ];
}

const FROM = "This package's code, sized from SpaceX's user's guide; how the stages share out the whole is judged from photographs. No licensed model shows it.";

export const FALCON_1_BUILDS: readonly StackBuild[] = Object.entries(DRAWS).map(([variant, d]) => ({
  rocket: "falcon-1",
  variant,
  drawnFrom: variant === "falcon-1" ? FROM : `${FROM} It never flew, so no photograph shows it: Falcon 1's look on the guide's sizes.`,
  parts: [
    { slot: "first-stage", kind: "first-stage", name: `First stage, ${variant === "falcon-1" ? "Falcon 1" : "Falcon 1e"}`, height: d.first, diameter: R * 2, top: [d.first, R * 2], pieces: () => firstStage(d) },
    { slot: "second-stage", kind: "second-stage", name: `Second stage, ${variant === "falcon-1" ? "Falcon 1" : "Falcon 1e"}`, height: d.second, diameter: R * 2, bottom: [d.joint, R * 2], top: [d.second, R * 2], pieces: () => secondStage(d) },
    { slot: "fairing", kind: "fairing", name: `Fairing, ${variant === "falcon-1" ? "Falcon 1" : "Falcon 1e"}`, height: d.fairing.height, diameter: d.fairing.radius * 2, bottom: [0, R * 2], sourcedDiameter: variantOfFairing(variant), pieces: () => fairing(d.fairing) },
  ],
}));
