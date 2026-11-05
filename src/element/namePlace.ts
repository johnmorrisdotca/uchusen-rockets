// Where a craft's name sits in the picture: under that craft's own foot, inside the frame, and clear of the other names. Pure, so the 3D view and the tests ask here and nowhere else.

export interface LabelSpot {
  /** The middle of the craft's foot, in CSS pixels from the left of the picture. */
  footX: number;
  /** The craft's foot, in CSS pixels from the top. The name sits just under it. */
  footY: number;
  /** The name's width and height, in CSS pixels. */
  w: number;
  h: number;
}

const PAD = 4;
const GAP = 4;

const clamp = (value: number, lo: number, hi: number): number => Math.min(Math.max(value, lo), hi);

const covers = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean =>
  a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;

/**
 * Puts each name under its own craft's foot. Names that would cover each other step apart sideways, each staying nearer its own foot, and a name that still cannot fit there moves up. None leaves the picture.
 *
 * @param labels One entry for each craft, in the order they stand.
 * @param width The picture's width, in CSS pixels.
 * @param height The picture's height, in CSS pixels.
 * @returns The top-left of each name, in the same order.
 */
export function placeNameLabels(labels: readonly LabelSpot[], width: number, height: number): { x: number; y: number }[] {
  const room = (span: number) => Math.max(PAD, width - span - PAD);
  const head = (span: number) => Math.max(PAD, height - span - PAD);
  const placed = labels.map((label) => ({
    ...label,
    x: clamp(label.footX - label.w / 2, PAD, room(label.w)),
    y: clamp(label.footY + GAP, PAD, head(label.h)),
  }));
  for (let pass = 0; pass < 16; pass++) {
    let hit = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        if (!covers(a, b)) continue;
        hit = true;
        const left = a.footX <= b.footX ? a : b;
        const right = left === a ? b : a;
        const need = (left.w + right.w) / 2 + GAP - ((right.x + right.w / 2) - (left.x + left.w / 2));
        if (need > 0) {
          left.x = clamp(left.x - need / 2, PAD, room(left.w));
          right.x = clamp(right.x + need / 2, PAD, room(right.w));
        }
        if (!covers(left, right)) continue;
        // still covering: the one whose foot is higher on the screen steps up, so they stay in two columns
        const upper = a.footY <= b.footY ? a : b;
        const lower = upper === a ? b : a;
        upper.y = clamp(lower.y - upper.h - GAP, PAD, head(upper.h));
      }
    }
    if (!hit) break;
  }
  return placed.map(({ x, y }) => ({ x, y }));
}
