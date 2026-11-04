// Engineering and isolators, station 58 to 90 m: the reactor chambers, the locked-out service corridor, two isolated auxiliary power units, the emergency fission battery room and the distribution breakers. The propulsion
// loop and the hotel loop are separate rooms with a hazard-marked lock between them. It is a round pressure drum with berthing rings at both ends, wrapped in gold foil blankets, with the feed lines to the drive strung on
// its flank. A cutaway opens the starboard side. Descends from the ISS's Zvezda service module and the reactor and shadow-shield section of NASA's Mars transfer vehicle studies. Pure: no three.js and no DOM.
import { contextOf, cub, drum, type Piece, pipeRun, place, rod } from "./adapter.ts";
import { STATION } from "./dims.ts";
import { catwalk, pipe } from "./hulls.ts";
import { hazard } from "./faces.ts";
import { collarAt, ringAt, tubeAt } from "./shapes.ts";

const [Y0, Y1] = STATION.engineering;
const R = 13;
const L = Y1 - Y0;

/** The rooms inside, in ship metres. */
export function engineeringInside(): Piece[] {
  const out: Piece[] = [];
  // the reactor chamber: a vessel with a glowing core, field rings and a coolant manifold, on the propulsion side (port)
  out.push(tubeAt("hull-grey", -5.5, 1, 4.6, Y0 + 2, Y0 + 16, { segs: 28 }), tubeAt("core", -5.5, 1, 1.7, Y0 + 3.4, Y0 + 14.6, { segs: 16 }));
  for (let y = Y0 + 3.5; y < Y0 + 15.5; y += 1.6) out.push(ringAt("coil", -5.5, 1, 5, y, 0.32, { segs: 28 }));
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    out.push(rod("coolant", [-5.5 + 5.5 * Math.sin(a), Y0 + 3, 1 + 5.5 * Math.cos(a)], [-5.5 + 5.5 * Math.sin(a), Y0 + 15.5, 1 + 5.5 * Math.cos(a)], 0.2, 12));
  }
  out.push(collarAt("panel-dark", -5.5, 1, 3.6, 5.4, Y0 + 15.8, Y0 + 17.2));
  // two isolated auxiliary power units, each in a cage with its own breaker cabinet
  for (const x of [3, 7.2]) {
    out.push(tubeAt("hull-white", x, -4.4, 1.9, Y0 + 3, Y0 + 12, { segs: 20 }), ...[0, 1, 2, 3, 4].map((k) => ringAt("hull-grey-dark", x, -4.4, 1.95, Y0 + 4 + k * 1.8, 0.14, { segs: 20 })));
    out.push(cub("hull-grey-dark", [x - 2.2, x + 2.2], [Y0 + 2.6, Y0 + 12.4], [-7.3, -7.0]), cub("lamp-blue", [x - 0.3, x + 0.3], [Y0 + 11, Y0 + 11.6], [-7.4, -7.3]));
    out.push(...pipeRun("coolant", [[x, Y0 + 12, -4.4], [x, Y0 + 14, -4.4], [x, Y0 + 14, -1.5]], 0.2), ...pipeRun("copper", [[x, Y0 + 2.6, -4.4], [x - 2, Y0 + 2, -2], [x - 2, Y0 + 2, 0]], 0.17));
  }
  // the emergency fission battery room: a sealed box of cells in three rows, behind a lock
  out.push(cub("hull-grey-dark", [3, 9.6], [Y0 + 19, Y0 + 28], [-2.4, 5.2], { only: "mesh" }));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) out.push(cub(c % 2 ? "hull-yellow" : "hull-white", [3.5 + c * 2.1, 5.4 + c * 2.1], [Y0 + 19.6 + r * 2.8, Y0 + 22], [-1.9, 4.7]), cub("lamp-amber", [3.9 + c * 2.1, 5 + c * 2.1], [Y0 + 21.9 + r * 2.8, Y0 + 22.1], [4.7, 4.9]));
  out.push(...hazard({ n: "x", sign: 1, at: 9.6, a: [Y0 + 19, Y0 + 28], b: [-2.4, 5.2] }, 1, Y0 + 19, Y0 + 28, 0.5, 1));
  // the distribution breakers: a row of cabinets along the port side with a cable trench in front
  for (let y = Y0 + 20; y < Y1 - 1.5; y += 1.9) out.push(cub("panel-dark", [-9.8, -7.8], [y, y + 1.6], [-6, 2]), cub("lamp-blue", [-7.8, -7.7], [y + 0.5, y + 0.9], [-5.6, -4.2]), cub("lamp-amber", [-7.8, -7.7], [y + 0.5, y + 0.9], [-1, 0.2]));
  // the service corridor: a deck along the room and a catwalk, and an isolation lock between the loops: two doors with an airlock between
  out.push(cub("deck", [-9.5, 9.5], [Y0 + 1, Y1 - 1], [-8.6, -8.4]), ...catwalk(Y0 + 1, Y1 - 1, 0, -8.4, 2));
  for (const y of [Y0 + 17.5, Y0 + 18.6]) out.push(cub("hull-orange", [-9.5, 9.5], [y, y + 0.25], [-6, 7]), ...[-1, 1].map((s) => cub("hazard", [s * 2 - 0.5, s * 2 + 0.5], [y, y + 0.3], [-3, 6])));
  return out;
}

/** Engineering from outside, and from the starboard side when `cut`. */
export function engineering(cut: boolean, detail = 1, seed = "eng"): Piece[] {
  const ctx = contextOf(seed, "science", { cutaway: cut, detail, seed }, "command");
  const out: Piece[] = [...place(drum(ctx, { R, L, top: "L", bottom: "L", panels: { wide: 2.6, tall: 1.8 }, hatches: 7, roundHatches: true, conduits: 8, trays: 3, vents: 6, ladders: 1, rings: [0.2, 0.4, 0.6, 0.8], digits: "03", junk: 60 }), { at: [0, Y0, 0], yaw: 90 })];
  if (cut) out.push(...engineeringInside());
  // gold foil blankets: faceted collars round the drum, as on the lunar module's descent stage and Hubble
  for (const [y, h] of [[Y0 + 6, 5], [Y0 + 19, 6], [Y0 + 28, 3]] as const) out.push({ kind: "lathe", material: "gold", segs: 10, profile: [[R + 0.18, y], [R + 0.5, y + 0.4], [R + 0.5, y + h - 0.4], [R + 0.18, y + h]], only: "mesh", ...(cut ? { arc: () => [Math.PI, 2 * Math.PI] as const } : {}) });
  // the feed lines to the drive: a pair of round pipes along the flank with flanges, clamps and a bend at each end
  for (const [x, mat] of [[-3, "coolant"], [3, "copper"]] as const) out.push(...pipeRun(mat, [[x, Y0 + 0.5, R + 0.9], [x, Y0 + 2, R + 1.4], [x, Y1 - 2, R + 1.4], [x, Y1 - 0.5, R + 0.9]], 0.34, { clampEvery: 4, bracket: [0, 0, -1.1] }));
  out.push(...pipe([-3, Y0 + 15, R + 1.4], [3, Y0 + 15, R + 1.4], 0.25, "lamp-red"));
  return out;
}
