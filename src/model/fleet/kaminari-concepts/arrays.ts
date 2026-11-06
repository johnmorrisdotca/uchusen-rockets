// Kaminari's two arrays. A blanket pays out from a mast at the tail: a lattice mast with a cell blanket on each side. A ring of trapezoid panels pays out from a hub at the bow. Each panel is built stacked on the one inside it; a slide moves it out, so the stack is the folded array and the paid-out stack is the open one. Pure: no three.js and no DOM.
import type { Motion } from "../motion.ts";
import type { Move, Piece, Plate } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { cub, disc, place, rod } from "./adapter.ts";

/** Blanket: eight panels of 50 m, stacked into 50 m and paid out to 400 m. The wing stands `half` metres each side of the mast. */
export const BLANKET = { y: 90, root: 18, len: 50, panels: 8, half: 22 } as const;
/** Ring: eight petals, three segments of 60 m, a 22 m hub, so the open ring is 400 m across. The wedges are built at the hub and slide out. */
export const RING = { y: 1660, hub: 22, len: 60, petals: 8, segments: 3, half: 2 } as const;

const tag = (pieces: readonly Piece[], move: Move): Piece[] => pieces.map((piece) => ({ ...piece, move }));

/** Grid lines across a flat face, in the face's own plane: the dark gaps between cells. */
function grid(spanU: number, spanV: number, nu: number, nv: number): [readonly [number, number], readonly [number, number]][] {
  const lines: [readonly [number, number], readonly [number, number]][] = [];
  for (let i = 1; i < nu; i++) {
    const u = -spanU / 2 + (spanU * i) / nu;
    lines.push([[u, -spanV / 2], [u, spanV / 2]]);
  }
  for (let j = 1; j < nv; j++) {
    const v = -spanV / 2 + (spanV * j) / nv;
    lines.push([[-spanU / 2, v], [spanU / 2, v]]);
  }
  return lines;
}

/** A flat cell blanket facing +Z: one sheet, a white frame, gold cells, and the gaps drawn as lines. The sheen is the gold's own. */
function blanketFace(x0: number, x1: number, y0: number, y1: number, z: number): Plate {
  return cub("hull-white", [x0, x1], [y0, y1], [z, z + 0.12], {
    only: undefined,
    plain: false,
    sheet: true,
    top: "gold",
    inset: { margin: 0.4, depth: 0.03 },
    ribs: grid(x1 - x0, y1 - y0, 8, 4),
  });
}

/** A box truss along the mast: two longerons and a zigzag, so the blanket reads as hung on a lattice. */
function mast(x0: number, x1: number, y: number, z: number): Piece[] {
  const out: Piece[] = [
    rod("hull-grey", [x0, y - 0.9, z], [x1, y - 0.9, z], 0.38, 6, { only: undefined }),
    rod("hull-grey", [x0, y + 0.9, z], [x1, y + 0.9, z], 0.38, 6, { only: undefined }),
  ];
  const bays = 5;
  for (let i = 0; i <= bays; i++) {
    const x = x0 + ((x1 - x0) * i) / bays;
    out.push(rod("hull-grey", [x, y - 0.9, z], [x, y + 0.9, z], 0.28, 5, { only: undefined }));
    if (i < bays) {
      const x2 = x0 + ((x1 - x0) * (i + 1)) / bays;
      out.push(rod("hull-grey", [x, y - 0.9, z], [x2, y + 0.9, z], 0.22, 5, { only: undefined }));
    }
  }
  return out;
}

/** One blanket panel: two cell sheets either side of the mast, and a fold bar at the inner edge. */
function blanketPanel(x0: number, y: number, len: number, half: number, tip: boolean, stack: number): Piece[] {
  const x1 = x0 + len;
  const gap = 1.7;
  const upper = blanketFace(x0, x1, y + gap, y + half, stack);
  const lower = blanketFace(x0, x1, y - half, y - gap, stack);
  const pleat = cub("hull-white", [x0, x0 + 0.45], [y - half, y + half], [stack - 0.06, stack + 0.28], { only: undefined, plain: false });
  const lamps = tip ? lampHalo("nav-white", [x1, y, stack], 4) : lampHalo("nav-white", [x1, y, stack], 2.4);
  return [upper, lower, pleat, ...mast(x0, x1, y, stack), ...lamps];
}

/** The blanket, in ship coordinates. Panel 0 stays; each later panel slides out by its own length. */
export function blanketPieces(): Piece[] {
  const { y, root, len, panels, half } = BLANKET;
  return Array.from({ length: panels }, (_, k) => {
    const pieces = blanketPanel(root, y, len, half, true, k * 0.35);
    return k === 0 ? pieces : tag(pieces, { name: `blanket-${k}`, pivot: [root, y, 0], axis: [1, 0, 0] });
  }).flat();
}

/** One gold cell tile lying in the ship's horizontal plane, so a three-quarter view sees the cells. */
function ringTile(x0: number, x1: number, halfW: number, y: number): Plate {
  const sx = x1 - x0;
  const sz = halfW * 2;
  return {
    kind: "plate",
    material: "hull-white",
    top: "gold",
    frame: { o: [(x0 + x1) / 2, y, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
    outline: [[-sx / 2, -sz / 2], [sx / 2, -sz / 2], [sx / 2, sz / 2], [-sx / 2, sz / 2]],
    thickness: 0.16,
    sheet: true,
    plain: false,
    only: undefined,
    inset: { margin: 0.3, depth: 0.03 },
    ribs: grid(sx, sz, 4, 2),
  };
}

/** A petal segment: strips that widen with the radius they reach when paid out, so the open ring is one annulus. Built at the hub; the slide carries it out. */
function ringSegment(s: number, y: number, hub: number, len: number, petals: number): Piece[] {
  const strips = 3;
  const open0 = hub + s * len;
  const out: Piece[] = [];
  for (let i = 0; i < strips; i++) {
    const f0 = i / strips;
    const f1 = (i + 1) / strips;
    const radius = open0 + ((f0 + f1) / 2) * len;
    const halfW = radius * Math.tan(Math.PI / petals) * 0.96;
    out.push(ringTile(hub + f0 * len, hub + f1 * len, halfW, y));
  }
  out.push(rod("hull-grey", [hub, y, 0], [hub + len, y, 0], 0.42, 6, { only: undefined }));
  const tip = s === 2;
  out.push(...lampHalo("nav-white", [hub + len, y, 0], tip ? 4 : 2.2));
  return out;
}

/** The ring, in ship coordinates. Segment 0 of each petal stays; the outer segments slide out along the petal. */
export function ringPieces(): Piece[] {
  const { y, hub, len, petals, segments } = RING;
  const out: Piece[] = [disc("hull-grey", [0, 0], hub * 0.72, y - 0.1, 0.35, 24)];
  for (let p = 0; p < petals; p++) {
    for (let s = 0; s < segments; s++) {
      const pieces = ringSegment(s, y + s * 0.28, hub, len, petals);
      const tagged = s === 0 ? pieces : tag(pieces, { name: `ring-${p}-${s}`, pivot: [hub, y, 0], axis: [1, 0, 0] });
      out.push(...place(tagged, { at: [0, 0, 0], yaw: (360 * p) / petals }));
    }
  }
  return out;
}

const note = "A solar panel pays out along its mast and comes back. Folded, the panels sit in one stack; open, they tile. Drawn faster than a real wing.";

/** The slides for the two arrays. Panel 0 and segment 0 stay put, so they are not here. */
export const ARRAY_MOTIONS: readonly Motion[] = [
  ...Array.from({ length: BLANKET.panels - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `blanket-${i + 1}`, kind: "slide", travel: (i + 1) * BLANKET.len, period: 48, note })),
  ...Array.from({ length: RING.petals }, (_, p) => Array.from({ length: RING.segments - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `ring-${p}-${i + 1}`, kind: "slide", travel: (i + 1) * RING.len, period: 48, note }))).flat(),
];
