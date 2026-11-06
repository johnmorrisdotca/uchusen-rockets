// Three ways to stand a yard around a 1.8 km ship. A spine, a hall and a dock, each from the kit's truss and a rack of its modules. The ship itself is placed in the slot by the picture script, so these pieces are only the yard. Arrival is along the long axis and the berths sit off that line.
import type { Piece } from "../../pieces.ts";
import { ball, cub, hoop, place, rod } from "../kaminari-concepts/adapter.ts";
import { radiatorFin, stackOf, truss } from "../kaminari-concepts/common.ts";

/** How long the slot is, metres: room for a 1.8 km ship and the approach. */
export const YARD_LENGTH = 2000;

const BAY = 50;
const HALF = 14;
const SPAN = 220;
const RACK = ["habitat-drum-large", "farm-drum", "lab-m", "common-area-m", "node-four", "solarium-m"] as const;

export interface YardConcept {
  id: "spine" | "hall" | "dock";
  /** Where the ship in the slot should stand, metres, so it clears the frame. */
  shipAt: readonly [number, number, number];
  pieces: () => Piece[];
}

const beam = (x: number, z: number): Piece[] => place(truss(HALF, BAY, 0, YARD_LENGTH), { at: [x, 0, z] });

const racks = (x: number, z: number): Piece[] => RACK.flatMap((id, i) => place(stackOf([id], 0, 0.2, id).pieces, { at: [x, 240 + i * 220, z] }));

type V3 = [number, number, number];

/** A Canadarm: shoulder, elbow and wrist, each a ball, with a short claw. Sized so it reads beside a 2 km ship. */
const arm = (shoulder: V3, elbow: V3, wrist: V3): Piece[] => {
  const claw: V3 = [wrist[0] + 22, wrist[1] - 6, wrist[2]];
  return [
    ball("engine-metal", shoulder, 9),
    rod("hull-white", shoulder, elbow, 4.2, 10),
    ball("engine-metal", elbow, 7),
    rod("hull-white", elbow, wrist, 3.2, 10),
    ball("hull-grey-dark", wrist, 5),
    rod("hull-grey", wrist, claw, 1.8, 8),
    rod("hull-grey-dark", claw, [claw[0] + 8, claw[1] + 10, claw[2] + 6], 1.1, 6),
    rod("hull-grey-dark", claw, [claw[0] + 8, claw[1] - 8, claw[2] - 6], 1.1, 6),
  ];
};

/** A rack of stalls off the arrival line. Each stall is tens of metres, with an amber charge light and a parked drone, so the row reads in the wide view. */
const berths = (x0: number, y: number, z: number): Piece[] => {
  const out: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const x = x0 + i * 42;
    out.push(rod("hull-grey", [x - 16, y, z], [x - 16, y, z + 28], 2.4, 8));
    out.push(rod("hull-grey", [x + 16, y, z], [x + 16, y, z + 28], 2.4, 8));
    out.push(rod("hull-grey-dark", [x - 16, y, z + 28], [x + 16, y, z + 28], 2, 8));
    out.push(cub("hull-grey", [x - 16, x + 16], [y - 2, y + 14], [z - 2, z + 2]));
    out.push(cub("lamp-amber", [x - 7, x + 7], [y + 4, y + 16], [z + 22, z + 30]));
    out.push(ball("hull-white", [x, y + 6, z + 14], 8));
    out.push(ball("lamp-blue", [x, y + 6, z + 22], 3));
  }
  return out;
};

/** A green lamp and a red lamp astride the open end, so a ship arrives on the axis. */
const approach = (z: number): Piece[] => [
  cub("nav-green", [38, 42], [YARD_LENGTH - 8, YARD_LENGTH - 2], [z - 2, z + 2]),
  cub("nav-red", [-42, -38], [YARD_LENGTH - 8, YARD_LENGTH - 2], [z - 2, z + 2]),
];

const ties = (corners: readonly (readonly [number, number])[]): Piece[] => {
  const out: Piece[] = [];
  for (let y = 0; y <= YARD_LENGTH; y += 200) {
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      if (!a || !b) continue;
      out.push(rod("hull-grey-dark", [a[0], y, a[1]], [b[0], y, b[1]], 1.6, 8));
    }
  }
  return out;
};

const STORE = ["habitat-drum-large", "farm-drum", "lab-m", "common-area-m", "node-four", "solarium-m", "habitat-drum-crew", "deck-nav-m"] as const;

/** Racks of real modules, a rail of arms, a crewed module, wings, berths, a supply ship and floods. One side of a yard. */
function furnish(x: number, z: number): Piece[] {
  const out: Piece[] = [];
  STORE.forEach((id, i) => {
    const along = 220 + Math.floor(i / 2) * 150;
    const rank = (i % 2) * 26;
    out.push(...place(stackOf([id], 0, 0.25, id).pieces, { at: [x, along, z + rank] }));
  });
  out.push(rod("hull-grey", [x, 100, z + 70], [x, YARD_LENGTH - 80, z + 70], 3.2, 8));
  for (let y = 280; y < YARD_LENGTH - 200; y += 420) {
    out.push(...arm([x, y, z + 70], [x + 90, y + 50, z + 40], [x + 150, y + 10, z + 16]));
  }
  out.push(...place(stackOf(["habitat-drum-crew", "deck-nav-m", "dome-observation-m"], 0, 0.35, "crew").pieces, { at: [x, 60, z] }));
  out.push(...radiatorFin(0, 16, 90, 500, 1100, 5, 2));
  for (let y = 480; y < 900; y += 50) out.push(cub("kapton", [x - 2, x + 3], [y, y + 42], [z + 70, z + 140]));
  out.push(...berths(x - 80, 48, z + 8));
  out.push(hoop("hull-grey", 14, YARD_LENGTH - 80, 1.2, 28, 8));
  out.push(rod("hull-white", [x + 30, YARD_LENGTH - 140, z], [x + 30, YARD_LENGTH - 40, z], 7, 16));
  for (let y = 200; y < YARD_LENGTH; y += 180) out.push(cub("flood", [x - 1, x + 1], [y, y + 3], [z + 8, z + 12]));
  return out;
}

const spine = (): Piece[] => [...beam(0, 0), ...racks(-80, 24), ...berths(-120, 70, 80), ...approach(0), ...furnish(-100, 40)];

/** Glazed bays along one face, with a gap between them so the slot stays open to see. */
const bays = (x0: number, x1: number, z0: number, z1: number): Piece[] => {
  const out: Piece[] = [];
  for (let y = 60; y < YARD_LENGTH - 60; y += 90) out.push(cub("hull-white", [x0, x1], [y, y + 58], [z0, z1]));
  return out;
};

const hall = (): Piece[] => {
  const corners: (readonly [number, number])[] = [[-SPAN, -SPAN], [SPAN, -SPAN], [SPAN, SPAN], [-SPAN, SPAN]];
  return [...corners.flatMap(([x, z]) => beam(x, z)), ...ties(corners), ...bays(-SPAN + 16, SPAN - 16, SPAN - 2, SPAN + 2), ...bays(-SPAN - 2, -SPAN + 2, -SPAN + 16, SPAN - 16), ...racks(-SPAN + 40, SPAN - 30), ...berths(-110, 70, -SPAN + 50), ...approach(0), ...furnish(-SPAN + 55, 0)];
};

const dock = (): Piece[] => {
  const out: Piece[] = [...beam(0, -SPAN), ...beam(-SPAN, 0), ...beam(SPAN, 0)];
  for (let y = 0; y <= YARD_LENGTH; y += 200) {
    out.push(rod("hull-grey", [-SPAN, y, -SPAN], [-SPAN, y, 48], 2.2, 8));
    out.push(rod("hull-grey", [SPAN, y, -SPAN], [SPAN, y, 48], 2.2, 8));
    out.push(rod("hull-grey-dark", [-SPAN, y, 48], [SPAN, y, 48], 1.4, 8));
  }
  return [...out, ...bays(-SPAN - 2, -SPAN + 2, -SPAN + 24, 40), ...bays(SPAN - 2, SPAN + 2, -SPAN + 24, 40), ...racks(-SPAN + 36, 20), ...berths(-110, 70, -SPAN + 46), ...approach(-SPAN + 20), ...furnish(-SPAN + 48, 10)];
};

/** The three yards, in the order they are shown. */
export function yardConcepts(): readonly YardConcept[] {
  return [
    { id: "spine", shipAt: [160, 140, 0], pieces: spine },
    { id: "hall", shipAt: [0, 140, 0], pieces: hall },
    { id: "dock", shipAt: [0, 140, 20], pieces: dock },
  ];
}
