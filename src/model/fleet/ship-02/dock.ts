// The dock and works: a dorsal hangar (a box cage with open doors and a gantry crane), a ventral manufacturing hall with roof vents and crane rails, port and starboard dock arms with standard collars, a drydock
// frame for craft up to 90 m, tool arms and fuel-transfer booms. Inside (separate): a parked craft in its cradle, machine tools, robot arms, a stores racks aisle.
import { dockedCraft } from "../docked.ts";
import { PLATE, closeDetail, beam, box, collar, cyl, facesOf, hatch, hazard, lights, mast, onFace, pipe, plating, polar, revolve, ring, rng, span, stencil, vent, type MaterialName, type Piece } from "./adapter.ts";
import { SPINE } from "./dims.ts";

const L = 140;

export function dockPieces(): Piece[] {
  const r = rng(2090);
  const out: Piece[] = [];
  const h = SPINE.half;
  // dorsal hangar: z from 22 to 92, x from -62 to 62, whole length: an open cage with posts, roof beams, plated back wall and two big door leaves swung open at the bow end
  const hz0 = 22;
  const hz1 = 92;
  for (const x of [-62, -31, 0, 31, 62]) for (const y of [0, 46, 94, L - 2]) out.push(span("hull-grey", x - 1.5, x + 1.5, y, y + 2, hz0, hz1, false));
  for (const x of [-62, 62]) for (const y of [0, 46, 94, L - 4]) out.push(span("hull-grey", x - 1.5, x + 1.5, y, y + 4, hz0, hz1, false));
  for (const x of [-62, -31, 0, 31, 62]) for (const z of [hz0 + 1.5, hz1 - 1.5]) out.push(span("hull-grey", x - 1.5, x + 1.5, 0, L, z - 1.5, z + 1.5, false));
  out.push(span("hull-grey", -62, 62, 0, L, hz0, hz0 + 2, true), span("hull-grey", -62, 62, 0, L, hz1 - 2, hz1, true), span("hull-grey", -62, 62, 0, 4, hz0, hz1, true));
  // roof and side walls: plated
  for (const f of facesOf([0, L / 2, (hz0 + hz1) / 2], [124, L, hz1 - hz0], ["z+", "x+", "x-"])) out.push(...plating(f, r, PLATE, 15, 14, { thick: 0.6, skip: 0.1, fine: 0.5 }));
  // the gantry crane: two rails and a bridge with a hoist, over the bay
  for (const x of [-52, 52]) out.push(span("hull-yellow", x - 1, x + 1, 4, L - 4, hz1 - 6, hz1 - 4, false));
  out.push(span("hull-orange", -54, 54, 66, 80, hz1 - 10, hz1 - 6, false), box("dark", [8, 72, hz1 - 14], [10, 12, 6]), pipe("engine-metal", [8, 72, hz1 - 17], [8, 72, hz1 - 38], 0.6, 6), box("hull-yellow", [8, 72, hz1 - 40], [4, 3, 3]));
  // doors: two leaves open at the stern end
  for (const sx of [-1, 1]) out.push(span("hull-orange", sx * 62 - 1.5, sx * 62 + 1.5, -2, 16, hz0, hz1, false), beam("engine-metal", [sx * 62, 8, hz0 + 4], [sx * 80, 8, hz0 + 22], 3, 3));
  // ventral works hall: a boxy volume with a roof, vents and a travelling crane rail
  const wz0 = -80;
  const wz1 = -22;
  out.push(span("hull-grey", -60, 60, 4, L - 4, wz0, wz1, true));
  for (const f of facesOf([0, L / 2, (wz0 + wz1) / 2], [120, L - 8, wz1 - wz0], ["z-", "x+", "x-", "y+", "y-"])) out.push(...plating(f, r, PLATE, 14, 13, { thick: 0.6, skip: 0.1, fine: 0.5 }), ...closeDetail(f, r, { rails: false }));
  const wf = facesOf([0, L / 2, wz0], [120, L - 8, 0.1], ["z-"])[0];
  for (let i = 0; i < 4; i++) out.push(...vent(wf, -42 + i * 28, 18, 14, 8, 5, 1.2), ...hatch(wf, -42 + i * 28, -14, 7, 10, "dark", "hull-yellow"));
  out.push(...stencil(wf, "WORKS 02", 0, 48, 9, "hull-white", 1.4), ...hazard(wf, 0, 36, 110, 3, 24, 1.2));
  for (let i = 0; i < 6; i++) out.push(cyl("hull-grey", [-48 + i * 19, wz0 - 4], 5, 20, 36, 10), ring("hull-yellow", [-48 + i * 19, wz0 - 4], 5, 6, 30, 31, 10));
  // port and starboard dock arms: a girder out to a collar, a boom of three pipes, a walkway
  for (const sx of [-1, 1]) for (const y of [26, 92]) {
    out.push(span("hull-orange", sx > 0 ? h : -h - 130, sx > 0 ? h + 130 : -h, y, y + 6, -4, 4, false));
    out.push(span("hull-yellow", sx > 0 ? h : -h - 130, sx > 0 ? h + 130 : -h, y + 6, y + 6.6, -4.4, 4.4));
    out.push(pipe("coolant", [sx * h, y + 9, 3], [sx * (h + 124), y + 9, 3], 1.3, 8), pipe("hull-orange", [sx * h, y + 9, -3], [sx * (h + 124), y + 9, -3], 1.3, 8));
    // collar at the end, facing outboard: a ring standing on the x axis would need a sideways lathe, so the standard collar is built as a square-ish frame with the same latches
    const cx = sx * (h + 134);
    out.push(span("engine-pale", cx - 6, cx + 6, y - 6, y + 12, -9, 9, false), span("dark", cx - 7, cx - 5, y - 4, y + 10, -7, 7), span("dark", cx + 5, cx + 7, y - 4, y + 10, -7, 7));
    for (let i = 0; i < 8; i++) out.push(box("hull-yellow", [cx + sx * 7, y + 3 + (i % 4) * 2, (i < 4 ? -1 : 1) * 6.5], [1.4, 1.6, 1.4]));
    for (let i = 0; i < 6; i++) out.push(box("dark", [sx * (h + 20 + i * 18), y + 7.4, 0], [3, 2, 7]));
  }
  // the drydock frame: two upright towers either side of the bay at the bow end with a cradle arm each
  for (const sx of [-1, 1]) {
    out.push(span("hull-grey", sx * 68 - 3, sx * 68 + 3, L - 4, L + 6, hz0, hz1 + 20, false));
    out.push(beam("hull-orange", [sx * 68, L + 2, hz0 + 30], [sx * 30, L + 2, hz0 + 30], 3, 3, false));
  }
  // fuel-transfer booms on the spine-side flats, and sensor masts and lights along the top
  for (const sx of [-1, 1]) out.push(pipe("hull-orange", [sx * (h + 3), 6, -h - 4], [sx * (h + 3), L - 6, -h - 4], 1.8, 8), pipe("coolant", [sx * (h + 3), 6, h + 4], [sx * (h + 3), L - 6, h + 4], 1.8, 8));
  out.push(...mast([-50, L, hz1], [-50, L + 26, hz1]), ...mast([50, L, hz1], [50, L + 20, hz1]), ...mast([0, 0, hz1], [0, -18, hz1]));
  out.push(...lights(facesOf([0, L / 2, hz1], [124, L, 0.1], ["z+"])[0], -60, 0, -60, 0, 1), ...lights(facesOf([0, L / 2, hz1], [124, L, 0.1], ["z+"])[0], -56, -66, 56, -66, 16, 1.8, "lamp-blue"));
  void collar;
  void onFace;
  void polar;
  void revolve;
  out.push(...dockedCraft("fleet-02"));
  return out;
}

export function dockInside(which: "hangar" | "works"): Piece[] {
  const out: Piece[] = [];
  const r = rng(2091);
  // the parked craft in its cradle: a 70 m spacecraft built of a hull cylinder, a nose, a wing pair, engines, resting on a four-arm cradle
  const cz = 55;
  out.push(cyl("hull-white", [0, cz], 11, 36, 96, 20), revolve("hull-white", [0, cz], [[11, 96], [8, 104], [4, 110], [0.001, 112]], 20), revolve("hull-orange", [0, cz], [[11.1, 40], [11.1, 56]], 20));
  out.push(span("hull-grey", -26, 26, 40, 66, cz - 1, cz + 1), span("hull-orange", -26, -22, 52, 66, cz - 1.2, cz + 1.2), span("hull-orange", 22, 26, 52, 66, cz - 1.2, cz + 1.2));
  for (let k = 0; k < 3; k++) out.push(revolve("bell", [(k - 1) * 6, cz], [[3, 36], [1.4, 42]], 12));
  for (const sx of [-1, 1]) for (const y of [48, 84]) out.push(beam("hull-yellow", [sx * 30, 6, cz - 20], [sx * 12, y, cz], 3, 3), span("hull-grey", sx * 30 - 2, sx * 30 + 2, 4, 8, cz - 24, cz - 16));
  if (which === "hangar") return out;
  out.length = 0;
  // machine tools in the works hall: lathes and presses as boxes with detail, robot arms on rails
  for (let i = 0; i < 12; i++) {
    const x = -50 + (i % 6) * 20;
    const z = i < 6 ? -40 : -62;
    out.push(box(r.pick<MaterialName>(["hull-grey", "coolant", "hull-orange"]), [x, 18, z], [14, 12, 10]), box("dark", [x, 25, z], [9, 3, 7]), box("lamp-blue", [x + 4, 20, z + 5.2], [3, 2, 0.4]));
    out.push(beam("engine-metal", [x - 4, 24, z], [x + 4, 40, z], 1.6, 1.6), beam("engine-metal", [x + 4, 40, z], [x + 10, 30, z], 1.2, 1.2));
  }
  // stores racks: tall shelves with boxes, in an aisle
  for (const x of [-56, -40, 40, 56]) for (let y = 60; y < 130; y += 14) out.push(span("hull-yellow", x - 5, x - 4.6, y, y + 10, -80, -22), span("dark", x - 5, x + 5, y, y + 0.6, -80, -22), ...[0, 1, 2, 3].map((n) => box(r.pick<MaterialName>(["blanket", "hull-orange", "coolant"]), [x, y + 4, -74 + n * 12], [7, 6.4, 8])));
  return out;
}
