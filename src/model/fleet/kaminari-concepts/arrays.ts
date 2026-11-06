// Kaminari's two arrays. A blanket pays out from a mast at the tail, and a ring of petals pays out from a hub at the bow. Each panel is built stacked on the one inside it; a slide moves it out along the mast, so the stack is the folded array and the paid-out stack is the open one. Pure: no three.js and no DOM.
import type { Motion } from "../motion.ts";
import type { Move, Piece, Vec3 } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { cub, place, rod } from "./adapter.ts";

/** Blanket: eight panels of 50 m, stacked into 50 m and paid out to 400 m. */
export const BLANKET = { y: 90, root: 18, len: 50, panels: 8, half: 22 } as const;
/** Ring: eight petals, three segments of 60 m, a 22 m hub, so the open ring is 400 m across. */
export const RING = { y: 1660, hub: 22, len: 60, petals: 8, segments: 3, half: 8 } as const;

const tag = (pieces: readonly Piece[], move: Move): Piece[] => pieces.map((piece) => ({ ...piece, move }));

function panel(x0: number, y: number, len: number, half: number, tip: Vec3 | null): Piece[] {
  const x1 = x0 + len;
  const plate = cub("solar", [x0, x1], [y - 0.12, y + 0.12], [-half, half], { only: undefined, plain: false, sheet: true, quilt: { nu: 6, nv: 3, bulge: 0.1 } });
  const boom = rod("hull-grey", [x0, y, 0], [x1, y, 0], 0.45, 6, { only: undefined });
  return tip ? [plate, boom, ...lampHalo("nav-white", tip, 4)] : [plate, boom];
}

/** The blanket, in ship coordinates. Panel 0 stays; each later panel slides out by its own length. */
export function blanketPieces(): Piece[] {
  const { y, root, len, panels, half } = BLANKET;
  return Array.from({ length: panels }, (_, k) => {
    const pieces = panel(root, y, len, half, k === panels - 1 ? [root + len, y, 0] : null);
    return k === 0 ? pieces : tag(pieces, { name: `blanket-${k}`, pivot: [root, y, 0], axis: [1, 0, 0] });
  }).flat();
}

/** The ring, in ship coordinates. Segment 0 of each petal stays; the outer segments slide out along the petal. */
export function ringPieces(): Piece[] {
  const { y, hub, len, petals, segments, half } = RING;
  const out: Piece[] = [];
  for (let p = 0; p < petals; p++) {
    for (let s = 0; s < segments; s++) {
      const tip = s === segments - 1 ? ([hub + len, y, 0] as Vec3) : null;
      const pieces = panel(hub, y, len, half, tip);
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
