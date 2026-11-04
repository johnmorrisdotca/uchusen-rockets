// The spine: a square truss the whole length of the ship that every module hangs from. Chords, bay frames, diagonals, joint nodes, and on each face a cable tray, a pipe pair with clamps and a service rail.
import { beam, box, forDrawing, facesOf, hatch, onFace, pipe, plating, rng, span, stencil, type Piece } from "./adapter.ts";
import { SPINE } from "./dims.ts";

export function spinePieces(): Piece[] {
  const r = rng(2002);
  const h = SPINE.half;
  const c = h - 1.5;
  const out: Piece[] = [];
  // four chords the whole length
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(forDrawing(pipe("hull-grey", [sx * c, 0, sz * c], [sx * c, SPINE.length, sz * c], 1.9, 8, true)), pipe("hull-grey", [sx * c, 0, sz * c], [sx * c, SPINE.length, sz * c], 1.9, 16, false));
  const bays = Math.floor(SPINE.length / SPINE.bay);
  for (let i = 0; i <= bays; i++) {
    const y = i * SPINE.bay;
    // the frame at each bay: four cross members
    const d = i % 6 === 0;
    out.push(span("dark", -c, c, y - 0.9, y + 0.9, c - 0.9, c + 0.9, d), span("dark", -c, c, y - 0.9, y + 0.9, -c - 0.9, -c + 0.9, d));
    out.push(span("dark", c - 0.9, c + 0.9, y - 0.9, y + 0.9, -c, c, false), span("dark", -c - 0.9, -c + 0.9, y - 0.9, y + 0.9, -c, c, false));
    // joint nodes at the four corners
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(box("engine-metal", [sx * c, y, sz * c], [5.2, 4.2, 5.2]));
    if (i === bays) break;
    // diagonals on the four faces, turning each bay
    const y1 = y + SPINE.bay;
    const flip = i % 2 === 0;
    out.push(beam("hull-grey", [-c, flip ? y : y1, c], [c, flip ? y1 : y, c], 1.5, 1.5, false), beam("hull-grey", [-c, flip ? y1 : y, -c], [c, flip ? y : y1, -c], 1.5, 1.5, false));
    for (const [px, py, pz] of [[-c, flip ? y : y1, c], [c, flip ? y1 : y, c], [-c, flip ? y1 : y, -c], [c, flip ? y : y1, -c]] as const) out.push(box("dark", [px, py, pz], [2.6, 0.5, 2.6]));
    out.push(beam("hull-grey", [c, flip ? y : y1, -c], [c, flip ? y1 : y, c], 1.5, 1.5, false), beam("hull-grey", [-c, flip ? y1 : y, -c], [-c, flip ? y : y1, c], 1.5, 1.5, false));
    // a pipe clamp on each face every other bay, a bracket and a hatch sometimes
    if (i % 2 === 0) {
      const ym = y + SPINE.bay / 2;
      for (const sz of [-1, 1]) out.push(box("black", [-5, ym, sz * (h + 1.6)], [3, 1.4, 2.4]), box("black", [5, ym, sz * (h + 1.6)], [3, 1.4, 2.4]));
      for (const sx of [-1, 1]) out.push(box("black", [sx * (h + 1.6), ym, -5], [2.4, 1.4, 3]), box("black", [sx * (h + 1.6), ym, 5], [2.4, 1.4, 3]));
    }
    if (r.chance(0.35)) {
      const face = facesOf([0, y + SPINE.bay / 2, 0], [2 * h, SPINE.bay, 2 * h], [r.pick(["x+", "x-", "z+", "z-"])])[0];
      out.push(...hatch(face, r.range(-8, 8), 0, 3.2, 4.6, "dark", r.pick(["hull-yellow", "hull-orange"]), 0.6));
    }
  }
  // two pipes and a cable tray along each face, one long piece each, over the diagonals
  for (const sz of [-1, 1]) {
    out.push(pipe("coolant", [-5, 0, sz * (h + 1.6)], [-5, SPINE.length, sz * (h + 1.6)], 1.1, 8), pipe("hull-white", [5, 0, sz * (h + 1.6)], [5, SPINE.length, sz * (h + 1.6)], 1.1, 8));
    out.push(span("dark", -10.5, -7, 0, SPINE.length, sz * (h + 0.2) - 0.1, sz * (h + 0.2) + 0.1), span("dark", 7, 10.5, 0, SPINE.length, sz * (h + 0.2) - 0.1, sz * (h + 0.2) + 0.1));
  }
  for (const sx of [-1, 1]) {
    out.push(pipe("hull-orange", [sx * (h + 1.6), 0, -5], [sx * (h + 1.6), SPINE.length, -5], 1.1, 8), pipe("hull-grey", [sx * (h + 1.6), 0, 5], [sx * (h + 1.6), SPINE.length, 5], 1.1, 8));
    // a service rail the maintenance crawlers run on
    out.push(pipe("hull-yellow", [sx * (h + 1), 0, 0], [sx * (h + 1), SPINE.length, 0], 0.45, 12));
  }
  // frame numbers in service stencil on the dorsal face every eighth bay
  for (let i = 4; i < bays; i += 8) {
    const f = facesOf([0, i * SPINE.bay, 0], [2 * h, 6, 2 * h], ["z+"])[0];
    out.push(...stencil(f, `F-${String(i).padStart(2, "0")}`, 0, 0, 3.2, "hull-white"));
    out.push(...plating(facesOf([0, i * SPINE.bay, 0], [2 * h, 3, 2 * h], ["z+"])[0], r, ["blanket", "hull-white"], 6, 1.4, { thick: 0.2, skip: 0 }));
  }
  void onFace;
  return out;
}
