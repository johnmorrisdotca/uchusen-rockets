// Outrigger wings for the first Kaminari: one boom straight out on each side, and two panels on each boom. The panels run along the hull and reach the same distance above and below the boom. The wings that go straight out stay the other choice.
import { pipe, span, type Piece } from "./adapter.ts";

/** Where an outrigger sits in the radiator part's own frame, in metres. The part itself stands at 200 m from the tail. */
export const OUTRIGGER = {
  boomY: 280,
  y0: 80,
  y1: 480,
  root: 28,
  boomEnd: 270,
  panels: [
    [80, 160],
    [180, 260],
  ],
} as const;

/** One side. `side` is the sign of x. Two panels, a double-bar boom through their middles. */
export function outrigger(side: 1 | -1): Piece[] {
  const s = side;
  const { boomY, y0, y1, root, boomEnd, panels } = OUTRIGGER;
  const out: Piece[] = [];
  for (const z of [-6, 6]) out.push(pipe("hull-grey", [s * root, boomY, z], [s * boomEnd, boomY, z], 2.2, 8, false));
  for (const x of [root + 16, (root + boomEnd) / 2, boomEnd - 12]) {
    out.push(pipe("hull-grey-dark", [s * x, boomY, -6], [s * x, boomY, 6], 1.4, 6, false));
  }
  for (const [a, b] of panels) {
    const x0 = Math.min(s * a, s * b);
    const x1 = Math.max(s * a, s * b);
    out.push(span("gold", x0, x1, y0, y1, -0.5, 0.5, true));
  }
  return out;
}
