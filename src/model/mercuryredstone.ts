// Mercury-Redstone from a table of numbers. The whole and the diameter are sourced. The booster and the escape tower are what the sourced wholes leave. The capsule is the existing Mercury part. The bands and the engine's size are judged from photographs. The fins have no sourced size, so they are not drawn.
import { blank } from "../data/types.ts";
import { merlin } from "./falcon.ts";
import { brace, floor, nose, stripes, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 17.51;
const R = 1.78 / 2;
const TOWER = 4.6;

function booster(): Piece[] {
  return [
    tube("white", R, 1.1, H, { rings: [1.12, 6, 12, H - 0.02] }),
    floor(R, 1.1),
    ...stripes("black", R, 2.2, H - 0.3, [0, 90, 180, 270], 26),
    ...merlin([0, 0], 0, 0.32, 1.4),
  ];
}

function tower(): Piece[] {
  const out: Piece[] = [tube("white", 0.1, 1.3, TOWER - 0.7), nose("white", 0.12, TOWER - 0.7, TOWER, 1.2)];
  for (const az of [45, 135, 225, 315]) out.push(brace("white", [0.42, 0, az], [0.1, 1.3, az], 0.05));
  return out;
}

export const MERCURY_REDSTONE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "mercury-redstone",
    variant: "redstone",
    drawnFrom: "This package's code for the booster and the escape tower, from the sourced whole and the spacecraft's two lengths. The capsule is the existing Mercury part, NASA's model in the painted look. The black and white bands and the engine's size are judged from photographs. The fins have no size in a source read here, so they are not drawn, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "Mercury-Redstone booster", height: H, diameter: R * 2, top: [H, R * 2], pieces: booster },
      { slot: "escape-tower", kind: "tower", name: "Mercury escape tower", height: TOWER, diameter: 0.84, bottom: [0, 1.8], sourcedDiameter: blank("No source read here gives the tower's width."), pieces: tower },
    ],
  },
];
