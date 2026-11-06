// Kaminari's two arrays. A blanket pays out from a mast each side of the tail. A ring of trapezoid panels pays out from a hub at the bow. Each panel is built stacked on the one inside it; a slide moves it out, so the stack is the folded array and the paid-out stack is the open one. The cells are one picture on the sheet, not extra draws. Pure: no three.js and no DOM.
import type { Motion } from "../motion.ts";
import type { Move, Piece, Plate } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { cub, disc, place } from "./adapter.ts";

/** Blanket: twelve panels of 52 m, stacked into 52 m and paid out to 624 m, 120 m wide. One wing each side of the hull, about 1.3 km from tip to tip. */
export const BLANKET = { y: 90, root: 20, len: 52, panels: 12, half: 60 } as const;
/** Ring: twelve petals, six segments of 70 m, a 28 m hub, so the open ring is 900 m across. The wedges are built at the hub and slide out. */
export const RING = { y: 1660, hub: 28, len: 70, petals: 12, segments: 6, half: 4 } as const;

const tag = (pieces: readonly Piece[], move: Move): Piece[] => pieces.map((piece) => ({ ...piece, move }));

/** A flat cell blanket facing +Z: one sheet, a white frame, and the cells as one repeating picture. */
function blanketFace(x0: number, x1: number, y0: number, y1: number, z: number): Plate {
  return cub("hull-white", [Math.min(x0, x1), Math.max(x0, x1)], [y0, y1], [z, z + 0.16], {
    plain: false,
    sheet: true,
    top: "cell-gold",
    inset: { margin: 0.8, depth: 0.04 },
  });
}

/** A box truss behind the sheet: two longerons and a frame each bay, so the blanket hangs on structure. */
function mast(x0: number, x1: number, y: number, half: number, z: number): Piece[] {
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  const back: [number, number] = [z - 1.5, z - 0.45];
  const out: Piece[] = [
    cub("hull-grey", [lo, hi], [y - half + 0.6, y - half + 1.8], back, { plain: false }),
    cub("hull-grey", [lo, hi], [y + half - 1.8, y + half - 0.6], back, { plain: false }),
  ];
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const x = lo + ((hi - lo) * i) / bays;
    out.push(cub("hull-grey", [x - 0.4, x + 0.4], [y - half + 0.6, y + half - 0.6], back, { plain: false }));
  }
  return out;
}

/** The box the folded wing stacks into, and the yoke that holds it off the truss. */
function canister(sign: number, y: number, half: number): Piece[] {
  const outer = sign * BLANKET.root;
  const inner = sign * (BLANKET.root - 9);
  const lo = Math.min(inner, outer);
  const hi = Math.max(inner, outer);
  const yoke = sign * 12;
  return [
    cub("hull-grey", [lo, hi], [y - half, y + half], [-1.8, 2.6], { plain: true }),
    cub("hull-grey", [Math.min(yoke, lo), Math.max(yoke, lo)], [y - half + 3, y - half + 6], [-0.5, 1.1], { plain: false }),
    cub("hull-grey", [Math.min(yoke, lo), Math.max(yoke, lo)], [y + half - 6, y + half - 3], [-0.5, 1.1], { plain: false }),
  ];
}

/** One blanket panel: one cell sheet, 120 m wide, and the truss behind it. A lamp only on the outermost panel, so the wing is not a row of lights. */
function blanketPanel(sign: number, y: number, len: number, half: number, stack: number, tip: boolean): Piece[] {
  const x0 = sign * BLANKET.root;
  const x1 = sign * (BLANKET.root + len);
  const face = blanketFace(x0, x1, y - half, y + half, stack);
  const lamps = tip ? lampHalo("nav-white", [sign * (BLANKET.root + len), y, stack + 0.2], 3) : [];
  return [face, ...mast(x0, x1, y, half, stack), ...lamps];
}

/** Both wings, in ship coordinates. Panel 0 stays; each later panel slides out by its own length. */
export function blanketPieces(): Piece[] {
  const { y, len, panels, half } = BLANKET;
  const out: Piece[] = [];
  for (const sign of [1, -1]) {
    out.push(...canister(sign, y, half));
    for (let k = 0; k < panels; k++) {
      const pieces = blanketPanel(sign, y, len, half, k * 0.42, k === panels - 1);
      const side = sign > 0 ? "s" : "p";
      out.push(...(k === 0 ? pieces : tag(pieces, { name: `blanket-${side}-${k}`, pivot: [sign * BLANKET.root, y, 0], axis: [sign, 0, 0] })));
    }
  }
  return out;
}

/** One gold cell tile lying in the ship's horizontal plane, so a three-quarter view sees the cells. */
function ringTile(x0: number, x1: number, halfW: number, y: number): Plate {
  const sx = x1 - x0;
  const sz = halfW * 2;
  return {
    kind: "plate",
    material: "hull-white",
    top: "cell-gold",
    frame: { o: [(x0 + x1) / 2, y, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
    outline: [[-sx / 2, -sz / 2], [sx / 2, -sz / 2], [sx / 2, sz / 2], [-sx / 2, sz / 2]],
    thickness: 0.16,
    sheet: true,
    plain: false,
    only: "mesh",
    inset: { margin: 0.5, depth: 0.04 },
  };
}

/** A petal segment: strips that widen with the radius they reach when paid out, on a box spar. Built at the hub; the slide carries it out. */
function ringSegment(s: number, y: number, hub: number, len: number, petals: number, lamp: boolean): Piece[] {
  const strips = 3;
  const open0 = hub + s * len;
  const out: Piece[] = [cub("hull-grey", [hub, hub + len], [y - 1.3, y - 0.35], [-0.7, 0.7], { plain: false })];
  for (let i = 0; i < strips; i++) {
    const f0 = i / strips;
    const f1 = (i + 1) / strips;
    const radius = open0 + ((f0 + f1) / 2) * len;
    const halfW = radius * Math.tan(Math.PI / petals) * 0.92;
    out.push(ringTile(hub + f0 * len, hub + f1 * len, halfW, y));
  }
  if (lamp) out.push(...lampHalo("nav-white", [hub + len, y + 0.2, 0], 3));
  return out;
}

/** The ring, in ship coordinates. Segment 0 of each petal stays; the outer segments slide out along the petal. */
export function ringPieces(): Piece[] {
  const { y, hub, len, petals, segments } = RING;
  const out: Piece[] = [disc("hull-grey", [0, 0], hub * 0.7, y - 0.4, 0.5, 24), cub("hull-grey", [-hub, hub], [y - 0.2, y + 0.5], [-4, 4], { plain: true })];
  for (let p = 0; p < petals; p++) {
    for (let s = 0; s < segments; s++) {
      const pieces = ringSegment(s, y + s * 0.3, hub, len, petals, s === segments - 1 && p % 3 === 0);
      const tagged = s === 0 ? pieces : tag(pieces, { name: `ring-${p}-${s}`, pivot: [hub, y, 0], axis: [1, 0, 0] });
      out.push(...place(tagged, { at: [0, 0, 0], yaw: (360 * p) / petals }));
    }
  }
  return out;
}

const note = "A solar panel pays out along its mast and comes back. Folded, the panels sit in one stack; open, they tile. Drawn faster than a real wing.";

/** The slides for the two arrays. Panel 0 and segment 0 stay put, so they are not here. */
export const ARRAY_MOTIONS: readonly Motion[] = [
  ...[1, -1].flatMap((sign) => Array.from({ length: BLANKET.panels - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `blanket-${sign > 0 ? "s" : "p"}-${i + 1}`, kind: "slide", travel: (i + 1) * BLANKET.len, period: 48, note }))),
  ...Array.from({ length: RING.petals }, (_, p) => Array.from({ length: RING.segments - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `ring-${p}-${i + 1}`, kind: "slide", travel: (i + 1) * RING.len, period: 48, note }))).flat(),
];
