// Hanabusa's docking plan, outside the hull as at a space station: an explorer takes its own small craft and one crew vehicle, so it has two arms on the still keel at the bow, clear of every turning part: a small S-class port that a crew vehicle
// (Dragon) docks to, and an M-class berth with a cradle for the ship's own ATC small craft, shown empty. No Starship berth: carriers and service ships take those. Pure: no three.js and no DOM.
import { box, collar, cub, ibeam, place, rod, roundStrut, type Piece } from "./adapter.ts";
import { SPINE_Y } from "./hull.ts";
import { SPIN } from "./spin.ts";

/** Where the arms stand: the arm's face on the keel's solarium (bow side), the ports' faces, and how far out the ports are. */
export const DOCK = {
  /** The height of the port faces up the keel, metres from the tail: they look down the keel (-Y), so a craft docks from below with its nose up. */
  face: SPINE_Y.solarium + 4,
  /** Radial distance of each port's axis from the keel's axis, and the sides they stand on. */
  reach: 16,
  small: { side: 1, collar: "S" as const, craft: "a crew vehicle (Dragon, 4 m wide, 8.3 m long)" },
  medium: { side: -1, collar: "M" as const, craft: "the ship's own ATC small craft, up to 6 m wide and 12 m long (the cradle is shown empty)" },
} as const;

/** The pieces of both arms, in ship metres. */
export function dockingPieces(): Piece[] {
  const y = DOCK.face;
  const out: Piece[] = [];
  for (const one of [DOCK.small, DOCK.medium]) {
    const x = one.side * DOCK.reach;
    // two round-section I-beam arms from the solarium's hull to the port ring, a cross-brace and a ring of the port's own class facing down the keel
    for (const dy of [-3.2, 3.2]) out.push(...ibeam("hull-grey", [one.side * 7.5, y + dy, 0], [x, y + dy, 0], 1.0, 0.7, [0, 0, 1]));
    out.push(...roundStrut("hull-grey", [one.side * 7.8, y - 3.2, 0], [x - one.side * 1.2, y + 0.4, 0], 0.22), ...roundStrut("hull-grey", [one.side * 7.8, y + 3.2, 0], [x - one.side * 1.2, y + 0.4, 0], 0.22));
    out.push(...place(collar(one.collar, 0, -1), { at: [x, y, 0] }));
    // the port's housing above the ring: a drum with a hatch and lamps, and an umbilical run down the arm
    out.push(box("hull-white", [x, y, 0], one.collar === "S" ? 4.2 : 7.4, one.collar === "S" ? 4.2 : 7.4, 2.2, 0, { only: "mesh", plain: true }));
    out.push(rod("copper", [x * 0.55, y + 1.6, 0.5], [x, y + 1.6, 0.5], 0.12, 8, { only: "mesh" }), rod("coolant", [x * 0.55, y + 1.9, -0.5], [x, y + 1.9, -0.5], 0.12, 8, { only: "mesh" }));
  }
  // the medium berth's cradle: guide rails either side of the empty bay, four clamp arms and hazard chocks, below the ring
  const mx = DOCK.medium.side * DOCK.reach;
  for (const dx of [-3.2, 3.2]) out.push(cub("hull-yellow", [mx + dx - 0.15, mx + dx + 0.15], [y - 12, y - 0.2], [-0.15, 0.15]));
  for (const dy of [-2.4, -6, -9.6]) out.push(cub("hull-grey-dark", [mx - 3.9, mx + 3.9], [y + dy - 0.2, y + dy + 0.2], [-0.4, 0.4]), ...[-1, 1].map((s) => cub("hull-grey", [mx + s * 3.9 - 0.25, mx + s * 3.9 + 0.25], [y + dy - 1, y + dy + 1], [-0.25, 0.25])));
  out.push(cub("hazard", [mx - 4, mx + 4], [y - 12.4, y - 12], [-0.5, 0.5]));
  return out;
}

/** The nearest approach to anything that turns, in metres: the axial gap from the lowest piece of the docking hardware, with a craft docked, to the top of the booms and to the top of the garden ring, and the radial reach of the hardware and of a docked craft. */
export function clearance(craftLength = 12, craftRadius = 3.2): { lowest: number; toBooms: number; toRing: number; reach: number } {
  const lowest = DOCK.face - craftLength;
  const boomTop = 100 + 17 * 24;
  const ring = SPIN.close.ys[2] + 12;
  return { lowest, toBooms: lowest - boomTop, toRing: lowest - ring, reach: DOCK.reach + craftRadius };
}
