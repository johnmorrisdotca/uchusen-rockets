// Three ways to stand a yard around a 1.8 km ship. A spine, a hall and a dock. The ship itself is placed in the slot by the picture script, so these pieces are only the yard. Arrival is along the long axis and the berths sit off that line.
import type { Piece } from "../../pieces.ts";
import { ball, cub, hoop, place, rod } from "../kaminari-concepts/adapter.ts";
import { stackOf } from "../kaminari-concepts/common.ts";
import { boomsOnRail, boxTruss, cabinWindows, crane, hatchDeck, lattice, latticeWall, mouth, parking } from "./structure.ts";

/** How long the slot is, metres: room for a 1.8 km ship and the approach. */
export const YARD_LENGTH = 2000;

const SPAN = 240;
const RACK = ["habitat-drum-large", "farm-drum", "lab-m", "common-area-m", "node-four", "solarium-m"] as const;
const STORE = ["habitat-drum-large", "farm-drum", "lab-m", "common-area-m", "node-four", "solarium-m", "habitat-drum-crew", "deck-nav-m"] as const;

export interface YardConcept {
  id: "spine" | "hall" | "dock";
  /** Where the ship in the slot should stand, metres, so it clears the frame. */
  shipAt: readonly [number, number, number];
  pieces: () => Piece[];
  /** A close picture: the eye sits in open space and looks at one piece of the work. */
  close: readonly { name: string; eye: readonly [number, number, number]; at: readonly [number, number, number] }[];
}

const racks = (x: number, z: number): Piece[] => RACK.flatMap((id, i) => place(stackOf([id], 0, 0.2, id).pieces, { at: [x, 280 + i * 200, z] }));

/** A rack of stalls off the arrival line. Each stall is tens of metres, with an amber charge light and a parked drone. */
const berths = (x0: number, y: number, z: number): Piece[] => {
  const out: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * 48;
    out.push(rod("hull-grey", [x - 18, y, z], [x - 18, y, z + 32], 6, 8));
    out.push(rod("hull-grey", [x + 18, y, z], [x + 18, y, z + 32], 6, 8));
    out.push(rod("hull-grey-dark", [x - 18, y, z + 32], [x + 18, y, z + 32], 5, 8));
    out.push(cub("hull-grey", [x - 18, x + 18], [y - 3, y + 16], [z - 3, z + 3]));
    out.push(cub("lamp-amber", [x - 8, x + 8], [y + 6, y + 20], [z + 24, z + 34]));
    out.push(ball("hull-white", [x, y + 8, z + 16], 10));
    out.push(ball("lamp-blue", [x, y + 8, z + 26], 4));
  }
  return out;
};

/** A green lamp and a red lamp astride the open end, so a ship arrives on the axis. */
const approach = (z: number): Piece[] => [
  cub("nav-green", [44, 52], [YARD_LENGTH - 12, YARD_LENGTH - 2], [z - 4, z + 4]),
  cub("nav-red", [-52, -44], [YARD_LENGTH - 12, YARD_LENGTH - 2], [z - 4, z + 4]),
];

/** Racks, a crewed cabin with windows, booms and berths along one side. */
function furnish(x: number, z: number, reach: number): Piece[] {
  const out: Piece[] = [];
  STORE.forEach((id, i) => {
    const along = 240 + Math.floor(i / 2) * 160;
    const rank = (i % 2) * 30;
    out.push(...place(stackOf([id], 0, 0.25, id).pieces, { at: [x, along, z + rank] }));
  });
  out.push(...place(stackOf(["habitat-drum-crew", "deck-nav-m", "dome-observation-m"], 0, 0.35, "crew").pieces, { at: [x, 70, z] }));
  out.push(...cabinWindows(x, 78, z + 14));
  out.push(...boomsOnRail(x, z + 80, 200, YARD_LENGTH - 160, reach));
  out.push(...berths(x - 70, 40, z + 20));
  return out;
}

/** An open cage around the slot: four trusses, booms on both rails, and a crane above and below. */
const spine = (): Piece[] => {
  const out: Piece[] = [];
  for (const x of [20, 300]) for (const z of [-150, 150]) out.push(...boxTruss(x, z, 0, YARD_LENGTH));
  out.push(...mouth(-10, 330, -180, 180, 36));
  out.push(...boomsOnRail(20, 0, 220, YARD_LENGTH - 180, 120));
  out.push(...boomsOnRail(300, 0, 360, YARD_LENGTH - 180, -120));
  for (const y of [480, 980, 1480]) {
    out.push(...crane(y, 20, 300, 210));
    out.push(...crane(y, 20, 300, -170));
  }
  return [...out, ...racks(-80, 40), ...berths(-40, 50, 200), ...approach(0), ...furnish(-90, 60, 140), ...parking(400, 20, -40)];
};

/** A ring at the near end and a ribbed lattice bay, with no solid roof. */
const hall = (): Piece[] => {
  const corners: (readonly [number, number])[] = [[-SPAN, -SPAN], [SPAN, -SPAN], [SPAN, SPAN], [-SPAN, SPAN]];
  const out: Piece[] = [];
  for (const [x, z] of corners) out.push(...boxTruss(x, z, 0, YARD_LENGTH));
  out.push(hoop("hull-white", 200, 220, 16, 48, 10));
  out.push(hoop("hull-grey", 78, 220, 10, 32, 8));
  out.push(...lattice(-SPAN + 40, SPAN - 40, 80, YARD_LENGTH - 80, SPAN - 10));
  out.push(...latticeWall(-SPAN, 80, YARD_LENGTH - 80, -SPAN + 40, SPAN - 40));
  return [...out, ...racks(-SPAN + 50, SPAN - 40), ...berths(-120, 50, -SPAN + 30), ...approach(0), ...furnish(-SPAN + 70, 20, 160), ...parking(360, 20, -40)];
};

/** A dock open on one side, with gantries above and below the slot and a floodlit hatch. */
const dock = (): Piece[] => {
  const out: Piece[] = [];
  for (const x of [-SPAN, SPAN]) out.push(...boxTruss(x, -SPAN, 0, YARD_LENGTH));
  out.push(...boxTruss(0, -SPAN, 0, YARD_LENGTH));
  out.push(...latticeWall(-SPAN, 60, YARD_LENGTH - 60, -SPAN + 30, 80));
  out.push(...latticeWall(SPAN, 60, YARD_LENGTH - 60, -SPAN + 30, 80));
  for (const y of [420, 920, 1420]) {
    out.push(...crane(y, -SPAN, SPAN, 200));
    out.push(...crane(y, -SPAN, SPAN, -80));
  }
  out.push(...hatchDeck(0, 90, -SPAN + 20));
  return [...out, ...racks(-SPAN + 46, 16), ...berths(-110, 48, -SPAN + 36), ...approach(-SPAN + 16), ...furnish(-SPAN + 64, 8, 150), ...parking(360, 20, -40)];
};

/** The three yards, in the order they are shown. */
export function yardConcepts(): readonly YardConcept[] {
  return [
    {
      id: "spine",
      shipAt: [160, 140, 0],
      close: [
        { name: "arm", eye: [200, 160, 260], at: [90, 360, -10] },
        { name: "berths", eye: [150, -150, 310], at: [80, 55, 210] },
      ],
      pieces: spine,
    },
    {
      id: "hall",
      shipAt: [0, 140, 0],
      close: [
        { name: "store", eye: [-70, 360, 90], at: [-190, 520, 190] },
        { name: "crew", eye: [-320, 20, 70], at: [-165, 95, 24] },
      ],
      pieces: hall,
    },
    {
      id: "dock",
      shipAt: [0, 140, 20],
      close: [
        { name: "gantry", eye: [40, 240, 360], at: [0, 430, 190] },
        { name: "hatch", eye: [90, -40, -60], at: [0, 100, -190] },
      ],
      pieces: dock,
    },
  ];
}
