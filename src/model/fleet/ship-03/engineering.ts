// Engineering and isolators, station 58 to 90 m: the reactor chambers, the locked-out service corridor, two isolated auxiliary power units, the emergency fission battery room and the distribution breakers. The propulsion
// loop and the hotel loop are separate rooms with a hazard-marked lock between them. A cutaway opens the starboard side to show them. Pure: no three.js and no DOM.
import { collar, cub, HULL_STACKS, type Piece, rod } from "./adapter.ts";
import { STATION } from "./dims.ts";
import { catwalk, facesOf, hullBox, pipe, wallShells } from "./hulls.ts";
import { hazard, SPINE, WHITE } from "./faces.ts";
import { capsule, collarAt, ringAt, tubeAt } from "./shapes.ts";

const [Y0, Y1] = STATION.engineering;
const HX = 14;
const HZ = 13;
const BOX = { x: [-HX, HX], y: [Y0, Y1], z: [-HZ, HZ] } as const;

/** The rooms inside, in ship metres. */
export function engineeringInside(seed = "eng"): Piece[] {
  const out: Piece[] = [];
  // the reactor chamber: a vessel with a glowing core, field rings and a coolant manifold, on the propulsion side (port)
  out.push(tubeAt("hull-grey", -6.5, 1.5, 5.4, Y0 + 2, Y0 + 16, { segs: 28 }), tubeAt("core", -6.5, 1.5, 1.8, Y0 + 3.4, Y0 + 14.6, { segs: 16 }));
  for (let y = Y0 + 3.5; y < Y0 + 15.5; y += 1.6) out.push(ringAt("coil", -6.5, 1.5, 5.8, y, 0.32, { segs: 28 }));
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    out.push(rod("coolant", [-6.5 + 6.3 * Math.sin(a), Y0 + 3, 1.5 + 6.3 * Math.cos(a)], [-6.5 + 6.3 * Math.sin(a), Y0 + 15.5, 1.5 + 6.3 * Math.cos(a)], 0.2, 6));
  }
  out.push(collarAt("panel-dark", -6.5, 1.5, 4.2, 6.2, Y0 + 15.8, Y0 + 17.2));
  // two isolated auxiliary power units, each in a cage with its own breaker cabinet
  for (const [i, x] of [4.5, 9.5].entries()) {
    out.push(tubeAt("hull-white", x, -5, 2.1, Y0 + 3, Y0 + 12, { segs: 20 }), ...[0, 1, 2, 3, 4].map((k) => ringAt("hull-grey-dark", x, -5, 2.15, Y0 + 4 + k * 1.8, 0.14, { segs: 20 })));
    out.push(cub("hull-grey-dark", [x - 2.4, x + 2.4], [Y0 + 2.6, Y0 + 12.4], [-8.2, -7.9]), cub("lamp-blue", [x - 0.3, x + 0.3], [Y0 + 11, Y0 + 11.6], [-8.3, -8.2]));
    out.push(...pipe([x, Y0 + 12, -5], [x, Y0 + 14, -2], 0.18), ...pipe([x, Y0 + 2.6, -5], [x - 3, Y0 + 2, 0], 0.16, "copper"));
    void i;
  }
  // the emergency fission battery room: a sealed box of twelve cells in three rows, behind a lock
  out.push(cub("hull-grey-dark", [3, 12.5], [Y0 + 19, Y0 + 28], [-3, 7], { only: "mesh" }));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) out.push(cub(c % 2 ? "hull-yellow" : "hull-white", [3.6 + c * 2.2, 5.5 + c * 2.2], [Y0 + 19.6 + r * 2.8, Y0 + 22], [-2.4, 6.4]), cub("lamp-amber", [4 + c * 2.2, 5.1 + c * 2.2], [Y0 + 21.9 + r * 2.8, Y0 + 22.1], [6.4, 6.6]));
  out.push(...hazard({ n: "x", sign: 1, at: 12.5, a: [Y0 + 19, Y0 + 28], b: [-3, 7] }, 2, Y0 + 19, Y0 + 28, 0.5, 1));
  // the distribution breakers: a row of cabinets along the port wall with a cable trench in front
  for (let y = Y0 + 20; y < Y1 - 1; y += 1.9) out.push(cub("panel-dark", [-HX + 1.2, -HX + 3.4], [y, y + 1.6], [-6, 4]), cub("lamp-blue", [-HX + 3.4, -HX + 3.5], [y + 0.5, y + 0.9], [-5.6, -4.2]), cub("lamp-amber", [-HX + 3.4, -HX + 3.5], [y + 0.5, y + 0.9], [-1, 0.2]));
  // the service corridor: a deck along the whole room and a locked door in each bulkhead
  out.push(cub("deck", [-HX + 1, HX - 1], [Y0 + 1, Y1 - 1], [-6.4, -6.2]), ...catwalk(Y0 + 1, Y1 - 1, 0, -6.2, 2));
  // the isolation locks between the propulsion loop and the hotel loop: two doors with an airlock between
  for (const y of [Y0 + 17.5, Y0 + 18.6]) out.push(cub("hull-orange", [-HX + 1, HX - 1], [y, y + 0.25], [-6, 9]), ...[-1, 1].map((s) => cub("hazard", [s * 2 - 0.5, s * 2 + 0.5], [y, y + 0.3], [-3, 6])));
  void [capsule, seed];
  return out;
}

/** Engineering from outside, and from the starboard side when `cut`. */
export function engineering(cut: boolean, detail = 1, seed = "eng"): Piece[] {
  const out: Piece[] = [];
  const o = { seed, scheme: WHITE, detail, density: 0.34 };
  const f = facesOf(BOX);
  if (!cut) out.push(...hullBox(BOX, "hull-grey-dark", ["stbd", "port", "dorsal", "ventral"], { ...o, kinds: ["hatch", "vent", "greeble", "stub", "number", "hazard", "lamps"] }));
  else {
    out.push(cub("hull-grey-dark", [-HX, -HX + 0.4], [Y0, Y1], [-HZ, HZ], { only: undefined }));
    out.push(...wallShells(HULL_STACKS.command, { axis: "z", sign: 1, at: HZ, y: [Y0, Y1], across: [-HX, HX], step: 0.3, scale: 1 }), ...wallShells(HULL_STACKS.command, { axis: "z", sign: -1, at: -HZ, y: [Y0, Y1], across: [-HX, HX], step: 0.3 }));
    out.push(...wallShells(HULL_STACKS.command, { axis: "x", sign: -1, at: -HX, y: [Y0, Y1], across: [-HZ, HZ], step: 0.3 }));
    out.push(...engineeringInside(seed));
  }
  // the end collars, and the exposed spine conduits that pass through
  out.push(...collar("L", Y0, -1), ...collar("L", Y1, 1));
  for (const x of [-4.5, -1.5, 1.5, 4.5]) out.push(...pipe([x, Y0 + 0.3, HZ + 0.4], [x, Y1 - 0.3, HZ + 0.4], 0.28, x < 0 ? "coolant" : "copper"));
  void [SPINE, f];
  return out;
}
