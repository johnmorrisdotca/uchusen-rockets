// Three ways to stand a yard around a 1.8 km ship. A spine, a hall and a dock, each from the kit's truss and a rack of its modules. The ship itself is placed in the slot by the picture script, so these pieces are only the yard. Arrival is along the long axis and the berths sit off that line.
import type { Piece } from "../../pieces.ts";
import { cub, hoop, place, rod } from "../kaminari-concepts/adapter.ts";
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

/** A row of stalls off the arrival line, each with an amber charge light. */
const berths = (x0: number, z: number): Piece[] => {
  const out: Piece[] = [];
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * 22;
    out.push(rod("hull-grey", [x, 36, z], [x, 36, z + 16], 1.1, 8));
    out.push(rod("hull-grey-dark", [x - 5, 36, z + 16], [x + 5, 36, z + 16], 0.7, 8));
    out.push(cub("lamp-amber", [x - 1.1, x + 1.1], [34.2, 37.8], [z + 14.5, z + 17.2]));
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
  out.push(rod("hull-grey", [x, 100, z + 60], [x, YARD_LENGTH - 60, z + 60], 1.6, 8));
  for (let y = 180; y < YARD_LENGTH - 100; y += 220) {
    out.push(rod("hull-white", [x, y, z + 60], [x + 70, y + 24, z + 40], 1.8, 8));
    out.push(rod("hull-white", [x + 70, y + 24, z + 40], [x + 120, y + 6, z + 20], 1.3, 8));
  }
  out.push(...place(stackOf(["habitat-drum-crew", "deck-nav-m", "dome-observation-m"], 0, 0.35, "crew").pieces, { at: [x, 60, z] }));
  out.push(...radiatorFin(0, 16, 90, 500, 1100, 5, 2));
  for (let y = 480; y < 900; y += 50) out.push(cub("kapton", [x - 2, x + 3], [y, y + 42], [z + 70, z + 140]));
  for (let i = 0; i < 8; i++) {
    const bx = x - 20 + (i % 4) * 16;
    const by = 40 + Math.floor(i / 4) * 22;
    out.push(rod("hull-grey-dark", [bx - 6, by, z], [bx + 6, by, z], 0.8, 6));
    out.push(cub("lamp-amber", [bx - 1.4, bx + 1.4], [by - 1.4, by + 1.4], [z + 4, z + 7]));
    if (i % 2 === 0) out.push(cub("hull-white", [bx - 2, bx + 2], [by - 0.6, by + 0.6], [z + 1, z + 3]));
  }
  out.push(hoop("hull-grey", 14, YARD_LENGTH - 80, 1.2, 28, 8));
  out.push(rod("hull-white", [x + 30, YARD_LENGTH - 140, z], [x + 30, YARD_LENGTH - 40, z], 7, 16));
  for (let y = 200; y < YARD_LENGTH; y += 180) out.push(cub("flood", [x - 1, x + 1], [y, y + 3], [z + 8, z + 12]));
  return out;
}

const spine = (): Piece[] => [...beam(0, 0), ...racks(-80, 24), ...berths(-150, 50), ...approach(0), ...furnish(-100, 40)];

const hall = (): Piece[] => {
  const corners: (readonly [number, number])[] = [[-SPAN, -SPAN], [SPAN, -SPAN], [SPAN, SPAN], [-SPAN, SPAN]];
  return [...corners.flatMap(([x, z]) => beam(x, z)), ...ties(corners), ...racks(-SPAN + 40, SPAN - 30), ...berths(-80, -SPAN + 36), ...approach(0), ...furnish(-SPAN + 55, 0)];
};

const dock = (): Piece[] => {
  const out: Piece[] = [...beam(0, -SPAN), ...beam(-SPAN, 0), ...beam(SPAN, 0)];
  for (let y = 0; y <= YARD_LENGTH; y += 200) {
    out.push(rod("hull-grey", [-SPAN, y, -SPAN], [-SPAN, y, 48], 2.2, 8));
    out.push(rod("hull-grey", [SPAN, y, -SPAN], [SPAN, y, 48], 2.2, 8));
    out.push(rod("hull-grey-dark", [-SPAN, y, 48], [SPAN, y, 48], 1.4, 8));
  }
  return [...out, ...racks(-SPAN + 36, 20), ...berths(-80, -SPAN + 30), ...approach(-SPAN + 20), ...furnish(-SPAN + 48, 10)];
};

/** The three yards, in the order they are shown. */
export function yardConcepts(): readonly YardConcept[] {
  return [
    { id: "spine", shipAt: [160, 140, 0], pieces: spine },
    { id: "hall", shipAt: [0, 140, 0], pieces: hall },
    { id: "dock", shipAt: [0, 140, 20], pieces: dock },
  ];
}
