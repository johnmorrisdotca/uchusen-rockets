// The heavy radiator wing: a flat wing hung from a boom, each panel with a header pipe, rows of tubes, ribs and a hinge edge, and the same panels folded into a stowed pack. It is the wing ISV Kaminari (SPX-207) has, six 56 m panels on a 560 m boom,
// drawn from the length, panel width and panel count in metres: every fitting is the reference one (the 56 m panel's) times `panelWidth / 56`, and the sections along the boom follow its length, so a longer wing has more sections and a wider panel has
// bigger tubes and knuckles. At the reference size every number is Kaminari's. Pure: no three.js and no DOM.
import { beam, box, forDrawing, pipe, rng, span, type MaterialName, type Piece, type Rng } from "../solids.ts";

/** The wing the numbers below were drawn for, in metres. */
export const WING_REF = { length: 560, panelWidth: 56, panels: 6, root: 44 } as const;

/** What a heavy radiator wing may be, in metres: a panel 8 to 120 wide, 1 to 12 panels and a boom 32 to 1,500 long, at least four panel widths. */
export const WING_LIMITS = { panelWidth: [8, 120], panels: [1, 12], length: [32, 1500] } as const;

/** Throws a RangeError naming the limit when a wing is outside what the part can be. */
export function checkWing(length: number, panelWidth: number, panels: number): void {
  if (!(panelWidth >= WING_LIMITS.panelWidth[0] && panelWidth <= WING_LIMITS.panelWidth[1])) throw new RangeError(`A heavy radiator panel is ${WING_LIMITS.panelWidth[0]} to ${WING_LIMITS.panelWidth[1]} m wide, not ${panelWidth}.`);
  if (!(Number.isInteger(panels) && panels >= WING_LIMITS.panels[0] && panels <= WING_LIMITS.panels[1])) throw new RangeError(`A heavy radiator wing has ${WING_LIMITS.panels[0]} to ${WING_LIMITS.panels[1]} panels, not ${panels}.`);
  if (!(length >= Math.max(WING_LIMITS.length[0], 4 * panelWidth) && length <= WING_LIMITS.length[1])) throw new RangeError(`A heavy radiator wing's boom is ${Math.max(WING_LIMITS.length[0], 4 * panelWidth)} (four panel widths here) to ${WING_LIMITS.length[1]} m long, not ${length}.`);
}

/** One wing, from the hull's flank outward on the x axis (the root `root` metres out), from y 0 to its boom's length. `side` is the sign of x. */
export function wingPieces(size: { length: number; panelWidth: number; panels: number; root?: number }, side: 1 | -1 = 1, r: Rng = rng(2081)): Piece[] {
  checkWing(size.length, size.panelWidth, size.panels);
  const { length, panelWidth, panels } = size;
  const sc = panelWidth / WING_REF.panelWidth;
  const k = (v: number): number => v * sc;
  const root = size.root ?? k(WING_REF.root);
  const out: Piece[] = [];
  const s = side;
  // the boom along the root edge: a box girder with a pipe header either side
  out.push(span("hull-grey", s > 0 ? root - k(3) : -root - k(3), s > 0 ? root + k(3) : -root + k(3), 0, length, -k(4), k(4), true));
  out.push(pipe("hull-orange", [s * (root + k(3)), 0, k(3)], [s * (root + k(3)), length, k(3)], k(1.8), 8, false), pipe("coolant", [s * (root + k(3)), 0, -k(3)], [s * (root + k(3)), length, -k(3)], k(1.8), 8, false));
  const sections = Math.max(1, Math.round((8 * (length / WING_REF.length)) / sc));
  const sl = length / sections;
  for (let p = 0; p < panels; p++) {
    const x0 = root + k(3) + p * (panelWidth + k(2));
    const mid = s * (x0 + panelWidth / 2);
    out.push(forDrawing(span("dark", Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), 0, length, -k(0.7), k(0.7), true)));
    for (let q = 0; q < sections; q++) {
      const y0 = q * sl + k(1.2);
      const m: MaterialName = r.chance(0.08) ? "hull-grey-dark" : "dark";
      // the panel face: a thin plate; tube rows across it as thin raised strips; ribs between sections
      out.push(span(m, Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), y0, y0 + sl - k(2.4), -k(0.7), k(0.7), false));
      for (let t = 0; t < 7; t++) {
        const xx = s * (x0 + k(4) + t * k(8));
        out.push(span("coolant", xx - k(0.8), xx + k(0.8), y0 + k(1), y0 + sl - k(3.4), k(0.7), k(1.5)), span("coolant", xx - k(0.8), xx + k(0.8), y0 + k(1), y0 + sl - k(3.4), -k(1.5), -k(0.7)));
      }
      out.push(span("engine-metal", Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), y0 + sl - k(3.4), y0 + sl - k(2.4), -k(1.6), k(1.6)));
      if (r.chance(0.2)) out.push(box("hull-orange-worn", [mid + r.range(-k(14), k(14)), y0 + sl / 2, k(1)], [r.range(k(6), k(14)), r.range(k(6), k(14)), k(0.3)]));
    }
    // hinge edge: a rod with knuckles every section
    const xe = s * (x0 + panelWidth);
    out.push(pipe("engine-metal", [xe, 0, 0], [xe, length, 0], k(1.6), 8, false));
    for (let q = 0; q <= sections; q++) out.push(box("hull-yellow", [xe, q * sl + k(0.6), 0], [k(3), k(2.2), k(3.4)]));
    // a pair of struts across the panel from the hinge to the one before
    if (p > 0) for (let q = 0; q < sections; q += 2) out.push(beam("engine-metal", [s * x0, q * sl + k(2), 0], [s * (x0 - k(2)), q * sl + sl, 0], k(1), k(1), false));
  }
  // the tip: a yellow cap at the root end and a red lamp at the far end
  const tip = s * (root + k(3) + panels * (panelWidth + k(2)));
  out.push(box("hull-yellow", [tip, k(4), 0], [k(4), k(6), k(4)]), box("lamp-red", [tip, length - k(4), 0], [k(4), k(6), k(4)]));
  return out;
}

/** A stowed pack: six panels folded into a stack, held by five latch brackets, on a short arm. `width` is the panel's width, `length` the pack's. */
export function stowedPieces(size: { width: number; length: number }): Piece[] {
  checkWing(Math.max(32, 4 * size.width), size.width, 1);
  const k = (v: number): number => (v * size.width) / WING_REF.panelWidth;
  const along = (y: number): number => (y * size.length) / 240;
  const out: Piece[] = [];
  for (let p = 0; p < 6; p++) {
    out.push(span(p % 2 ? "hull-grey" : "dark", -k(28), k(28), 0, size.length, p * k(3.6), p * k(3.6) + k(2.6), true));
    for (let t = 0; t < 6; t++) out.push(span("coolant", -k(24) + t * k(9), -k(23) + t * k(9), 0, size.length, p * k(3.6) + k(2.6), p * k(3.6) + k(3.2)));
  }
  for (const y of [8, 60, 120, 180, 232].map(along)) {
    out.push(span("hull-orange", -k(30), k(30), y, y + k(4), -k(1.5), k(23.4), true));
    out.push(box("hull-yellow", [-k(30.5), y + k(2), k(11)], [k(1.4), k(5), k(3)]), box("hull-yellow", [k(30.5), y + k(2), k(11)], [k(1.4), k(5), k(3)]));
  }
  out.push(span("hull-grey", -k(2), k(2), 0, size.length, -k(3), 0, true));
  return out;
}
