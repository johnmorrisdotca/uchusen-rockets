// One cargo station: four cells in the corners of the cross, each a frame holding twelve containers (two by two by three), and the clamps that tie the frame to the spine. A container is 22 m by 22 m by 40 m,
// with corner castings, corrugation, a door end with lock rods, wear patches and its own number. The inside of the containers is a separate part for the cutaway.
import { detail } from "../../detail.ts";
import { PLATE, ibeam, beam, box, forDrawing, facesOf, hazard, hatch, lights, pipe, plating, rng, span, stencil, type MaterialName, type Piece, type Rng, vent } from "./adapter.ts";
import { containerPieces } from "../heavy/container.ts";
import { CONTAINER, SPINE, STATION } from "./dims.ts";

const L = STATION.cargo.length;

/** One container, centre (cx, cy, cz); `ox` and `oz` are the directions that face outward from the spine, so those faces get the detail. The kit draws it (`../heavy/container.ts`); this ship asks for its own size. */
export function container(cx: number, cy: number, cz: number, ox: 1 | -1, oz: 1 | -1, r: Rng, id: string, band: MaterialName): Piece[] {
  return containerPieces(CONTAINER, [cx, cy, cz], ox, oz, r, id, band, detail.level !== "coarse");
}

/** A cell frame at the corner (sx, sz): posts, ring beams at the four levels and the clamp arms to the spine. The cell spans 24..74 from the axis in x and z. */
function cellFrame(sx: 1 | -1, sz: 1 | -1, r: Rng): Piece[] {
  const out: Piece[] = [];
  const xs = [24, 49, 74].map((v) => v * sx);
  const zs = [24, 49, 74].map((v) => v * sz);
  for (const x of xs) for (const z of zs) {
    out.push(...ibeam("hull-grey", x, z, 0, L, 2.4));
    // a flange plate with four bolts every nine metres, a stiffener rib up the outer corner and a cable clip between
    for (let y = 4.5; detail.level === "full" && y < L; y += 9) {
      out.push(box("dark", [x, y, z], [3.8, 0.8, 3.8]));
      for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]] as const) out.push(box("engine-metal", [x + dx, y + 0.7, z + dz], [0.6, 0.5, 0.6]));
      out.push(box("black", [x + 1.6 * sx, y + 4.5, z + 1.6 * sz], [0.9, 1.2, 0.9]));
    }
  }
  for (const y of [0, 44, 88, 132]) {
    for (const x of xs) out.push(span("dark", x - 1, x + 1, y, y + 4, Math.min(...zs) - 1.2, Math.max(...zs) + 1.2, false));
    for (const z of zs) out.push(span("dark", Math.min(...xs) - 1.2, Math.max(...xs) + 1.2, y, y + 4, z - 1, z + 1, false));
  }
  // twist-lock plates under every container, bracing diagonals on the outer sides
  for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1, 2]) {
    const x = (37 + 24 * i) * sx;
    const z = (37 + 24 * j) * sz;
    const y = 4 + k * 44;
    out.push(box("hull-yellow", [x, y + 0.5, z], [3, 1, 3]));
  }
  for (const side of [74 * sx]) {
    for (let k = 0; k < 3; k++) out.push(beam("hull-grey", [side + sx * 1.5, k * 44 + 4, 24 * sz], [side + sx * 1.5, k * 44 + 44, 74 * sz], 1.4, 1.4, false));
  }
  for (const side of [74 * sz]) {
    for (let k = 0; k < 3; k++) out.push(beam("hull-grey", [24 * sx, k * 44 + 4, side + sz * 1.5], [74 * sx, k * 44 + 44, side + sz * 1.5], 1.4, 1.4, false));
  }
  // clamp arms from the spine face to the cell at the two ends and the middle: a box girder each
  for (const y of [0, 66, 132]) {
    out.push(span("hull-orange", sx > 0 ? SPINE.half - 1 : -24.4, sx > 0 ? 24.4 : -(SPINE.half - 1), y, y + 4, sz * 26 - 2, sz * 26 + 2, false));
    out.push(span("hull-orange", sx * 26 - 2, sx * 26 + 2, y, y + 4, sz > 0 ? SPINE.half - 1 : -24.4, sz > 0 ? 24.4 : -(SPINE.half - 1), false));
    out.push(...[0, 1].map((n) => box("black", [sx * (21 + n * 2), y + 5, sz * 27], [1.6, 2.4, 1.6])));
  }
  void r;
  return out;
}

export function cargoPieces(index: number): Piece[] {
  const r = rng(2010 + index);
  const out: Piece[] = [];
  const bandColours: MaterialName[] = ["hull-grey-dark", "hull-grey-dark", "hull-grey-dark", "hull-grey-dark", "hull-grey-dark", "hull-orange"];
  for (const sx of [1, -1] as const) for (const sz of [1, -1] as const) {
    out.push(...cellFrame(sx, sz, r));
    out.push(forDrawing(span("hull-grey", Math.min(24 * sx, 74 * sx), Math.max(24 * sx, 74 * sx), 4, 132, Math.min(24 * sz, 74 * sz), Math.max(24 * sz, 74 * sz), true)));
    let n = 0;
    for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1, 2]) {
      const id = `${["A", "B", "C", "D"][index]}${sx > 0 ? (sz > 0 ? "1" : "2") : sz > 0 ? "3" : "4"}-${String(++n).padStart(2, "0")}`.slice(0, 5);
      out.push(...container((37 + 24 * i) * sx, 4 + k * 44 + 20, (37 + 24 * j) * sz, sx, sz, r, id, r.pick(bandColours)));
    }
    // the cell's end faces, plated, with hazard bands, vents and a lamp row
    for (const y of [0, L]) {
      const f = facesOf([49 * sx, y, 49 * sz], [52, 0.1, 52], [y === 0 ? "y-" : "y+"])[0];
      out.push(...plating(f, r, PLATE, 12, 12, { thick: 0.5, skip: 0.15, fine: 0.7 }));
      out.push(...hazard(f, 0, 21, 44, 1.8, 16), ...lights(f, -20, -22, 20, -22, 6, 1.4, y === 0 ? "lamp-red" : "lamp-blue"));
    }
  }
  // the station hub: a cross frame round the spine at both ends and a central service ring with pipe runs to the cells
  for (const y of [0, L - 4]) {
    out.push(span("hull-orange", -SPINE.half - 4, SPINE.half + 4, y, y + 4, -SPINE.half - 4, -SPINE.half - 1, false), span("hull-orange", -SPINE.half - 4, SPINE.half + 4, y, y + 4, SPINE.half + 1, SPINE.half + 4, false));
  }
  for (const sx of [-1, 1]) {
    out.push(pipe("coolant", [sx * 20, 6, 0], [sx * 20, L - 6, 0], 1.3, 8), pipe("hull-orange", [sx * 20, 6, 4], [sx * 20, L - 6, 4], 1.0, 8));
    for (let y = 10; y < L - 6; y += 12) out.push(box("black", [sx * 20, y, 2], [2.4, 1.3, 7]));
  }
  // lettering on the spine-side flat of the station, hatches into the corridor
  const sp = facesOf([0, L / 2, 0], [2 * SPINE.half + 10, L, 2 * SPINE.half + 10], ["z+", "z-"]);
  for (const f of sp) {
    out.push(...stencil(f, `CARGO ${index + 1}`, 0, 20, 6, "hull-white", 0.6));
    for (let i = 0; i < 3; i++) out.push(...hatch(f, -10 + i * 10, -20, 4, 6, "dark", "hull-yellow"), ...vent(f, -10 + i * 10, -40, 5, 4, 4));
  }
  return out;
}

/** What is in the containers: crates on pallets, drums, a vehicle or two, tie-down straps. The inside of every station, in the frame of the whole ship (each station starts where its part starts). */
export function cargoInside(): Piece[] {
  const r = rng(2020);
  const out: Piece[] = [];
  for (const sx of [1, -1] as const) for (const sz of [1, -1] as const) for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1, 2]) {
    const cx = (37 + 24 * i) * sx;
    const cz = (37 + 24 * j) * sz;
    const cy = 4 + k * 44 + 20;
    const kind = r.int(0, 3);
    out.push(span("dark", cx - 10, cx + 10, cy - 19, cy - 18.5, cz - 10, cz + 10));
    if (kind === 0) for (let n = 0; n < 6; n++) out.push(box(r.pick(["blanket", "hull-orange", "coolant"]), [cx + r.range(-6, 6), cy - 14 + r.range(0, 6), cz + r.range(-6, 6)], [r.range(4, 8), r.range(5, 11), r.range(4, 8)]));
    else if (kind === 1) for (let n = 0; n < 8; n++) out.push(pipe(r.pick(["coolant", "hull-grey", "hull-white"]), [cx - 7 + (n % 4) * 4.6, cy - 18, cz - 4 + Math.floor(n / 4) * 8], [cx - 7 + (n % 4) * 4.6, cy - 4, cz - 4 + Math.floor(n / 4) * 8], 2, 10));
    else if (kind === 2) out.push(box("hull-grey", [cx, cy - 12, cz], [13, 12, 30]), box("dark", [cx - 7, cy - 17, cz - 10], [3, 3, 3]), box("dark", [cx + 7, cy - 17, cz - 10], [3, 3, 3]), box("dark", [cx - 7, cy - 17, cz + 10], [3, 3, 3]), box("dark", [cx + 7, cy - 17, cz + 10], [3, 3, 3]));
    else for (let n = 0; n < 4; n++) out.push(box("blanket", [cx + r.range(-6, 6), cy - 8 + n * 3.5, cz + r.range(-5, 5)], [14, 3, 14]));
    out.push(box("hull-yellow", [cx, cy - 4, cz + 10.4], [20, 0.6, 0.3]), box("hull-yellow", [cx, cy - 12, cz + 10.4], [20, 0.6, 0.3]));
  }
  void STATION;
  return out;
}
