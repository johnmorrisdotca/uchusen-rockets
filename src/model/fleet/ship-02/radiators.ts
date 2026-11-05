// The radiator wings: two flat wings, one each side, in the plane between the upper and lower tanks. Each is six panels (a header pipe, tube rows, ribs and a hinge edge) hung from a boom, deployed. A stowed
// pack of folded panels rides on each side of the spine as well, shown as the folded stack with its latch brackets: the same panel, folded.
import { lampHalo } from "../lights.ts";
import { beam, box, forDrawing, pipe, rng, span, type MaterialName, type Piece, stencil, facesOf } from "./adapter.ts";

/** One wing, from the hull's flank outward on the x axis, from y 0 to its length. `side` is the sign of x. */
export function wing(side: 1 | -1, length = 560, panels = 6, panelWidth = 56, root = 44): Piece[] {
  const r = rng(2080 + side);
  const out: Piece[] = [];
  const s = side;
  // the boom along the root edge: a box girder with a pipe header either side
  out.push(span("hull-grey", s > 0 ? root - 3 : -root - 3, s > 0 ? root + 3 : -root + 3, 0, length, -4, 4, true));
  out.push(pipe("hull-orange", [s * (root + 3), 0, 3], [s * (root + 3), length, 3], 1.8, 8, false), pipe("coolant", [s * (root + 3), 0, -3], [s * (root + 3), length, -3], 1.8, 8, false));
  const sections = 8;
  const sl = length / sections;
  for (let p = 0; p < panels; p++) {
    const x0 = root + 3 + p * (panelWidth + 2);
    const mid = s * (x0 + panelWidth / 2);
    out.push(forDrawing(span("dark", Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), 0, length, -0.7, 0.7, true)));
    for (let q = 0; q < sections; q++) {
      const y0 = q * sl + 1.2;
      const m: MaterialName = r.chance(0.08) ? "hull-grey-dark" : "dark";
      // the panel face: a thin plate; tube rows across it as thin raised strips; ribs between sections
      out.push(span(m, Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), y0, y0 + sl - 2.4, -0.7, 0.7, false));
      for (let t = 0; t < 7; t++) {
        const xx = s * (x0 + 4 + t * 8);
        out.push(span("coolant", xx - 0.8, xx + 0.8, y0 + 1, y0 + sl - 3.4, 0.7, 1.5), span("coolant", xx - 0.8, xx + 0.8, y0 + 1, y0 + sl - 3.4, -1.5, -0.7));
      }
      out.push(span("engine-metal", Math.min(s * x0, s * (x0 + panelWidth)), Math.max(s * x0, s * (x0 + panelWidth)), y0 + sl - 3.4, y0 + sl - 2.4, -1.6, 1.6));
      if (r.chance(0.2)) out.push(box("hull-orange-worn", [mid + r.range(-14, 14), y0 + sl / 2, 1], [r.range(6, 14), r.range(6, 14), 0.3]));
    }
    // hinge edge: a rod with knuckles every section, and a lit edge strip
    const xe = s * (x0 + panelWidth);
    out.push(pipe("engine-metal", [xe, 0, 0], [xe, length, 0], 1.6, 8, false));
    for (let q = 0; q <= sections; q++) out.push(box("hull-yellow", [xe, q * sl + 0.6, 0], [3, 2.2, 3.4]));
    // a pair of struts across the panel from the hinge to the one before
    if (p > 0) for (let q = 0; q < sections; q += 2) out.push(beam("engine-metal", [s * x0, q * sl + 2, 0], [s * (x0 - 2), q * sl + sl, 0], 1, 1, false));
  }
  // end-cap stencil and the tip lamps
  const tip = s * (root + 3 + panels * (panelWidth + 2));
  out.push(box("hull-yellow", [tip, 4, 0], [4, 6, 4]), box("lamp-red", [tip, length - 4, 0], [4, 6, 4]));
  out.push(...lampHalo(s < 0 ? "port" : "starboard", [s * (root + 120), length * 0.42, 0], 4), ...lampHalo(s < 0 ? "beacon" : "nav-white", [s * (root + 120), length * 0.7, 0], 4));
  void stencil;
  void facesOf;
  return out;
}

/** A stowed pack: six panels folded into a stack 56 m by 56 m by 24 m, held by four latch brackets, on a short arm. */
export function stowed(length = 240): Piece[] {
  const out: Piece[] = [];
  for (let p = 0; p < 6; p++) {
    out.push(span(p % 2 ? "hull-grey" : "dark", -28, 28, 0, length, p * 3.6, p * 3.6 + 2.6, true));
    for (let t = 0; t < 6; t++) out.push(span("coolant", -24 + t * 9, -23 + t * 9, 0, length, p * 3.6 + 2.6, p * 3.6 + 3.2));
  }
  for (const y of [8, 60, 120, 180, 232]) {
    out.push(span("hull-orange", -30, 30, y, y + 4, -1.5, 23.4, true));
    out.push(box("hull-yellow", [-30.5, y + 2, 11], [1.4, 5, 3]), box("hull-yellow", [30.5, y + 2, 11], [1.4, 5, 3]));
  }
  out.push(span("hull-grey", -2, 2, 0, length, -3, 0, true));
  return out;
}
