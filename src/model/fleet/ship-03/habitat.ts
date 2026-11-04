// Habitation and medical, station 250 to 302 m: bunks and a mess, a hydroponics rack, water and air recycling, and the six-bed triage bay with its own quarantine and transfer lock. The crew decks stand perpendicular to
// thrust, so they are flat floors one above another along the dorsal axis. The dorsal and ventral faces carry the rails the radiator banks mount on. A cutaway opens the starboard side. Pure: no three.js and no DOM.
import { collar, cub, HULL_STACKS, type Piece, rng, rod } from "./adapter.ts";
import { STATION } from "./dims.ts";
import { facesOf, hullBox, wallShells } from "./hulls.ts";
import { along, rail, WHITE } from "./faces.ts";
import { capsule, ringAt, tubeAt } from "./shapes.ts";

const [Y0, Y1] = STATION.habitat;
const HX = 13;
const HZ = 14;
const BOX = { x: [-HX, HX], y: [Y0, Y1], z: [-HZ, HZ] } as const;
/** Where each deck's floor stands up the spine, from the keel end: medical, crew, mess and farm, recycling. Floors are flat rooms across the beam, with the thrust pushing the crew down towards the tail. */
const DECKS = { medical: Y0 + 1, crew: Y0 + 9.4, mess: Y0 + 22, recycling: Y0 + 34.5 } as const;
const ROOM = { x: HX - 1.2, z: HZ - 1.2 } as const;

function inside(seed: string): Piece[] {
  const random = rng(`${seed}/inside`);
  const out: Piece[] = [];
  const floor = (y: number) => cub("deck", [-ROOM.x, ROOM.x], [y, y + 0.35], [-ROOM.z, ROOM.z], { only: undefined });
  const ceiling = (y: number) => cub("hull-white-worn", [-ROOM.x, ROOM.x], [y - 0.2, y], [-ROOM.z, ROOM.z]);
  for (const y of Object.values(DECKS)) out.push(floor(y));
  out.push(ceiling(Y1 - 1.2));
  // deck 1, medical: six triage berths in two rows of three, each with a monitor arm, a curtain rail and a lamp; a quarantine room behind glass; a transfer lock
  const m = DECKS.medical + 0.35;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const x = -9 + c * 3.8;
      const z = r === 0 ? -7.8 : 1.6;
      out.push(cub("hull-white", [x - 1.1, x + 1.1], [m, m + 0.9], [z, z + 4.6]), cub("hull-grey-dark", [x - 0.9, x + 0.9], [m + 0.9, m + 1.15], [z + 0.2, z + 4.4]), cub("glass", [x - 1.15, x + 1.15], [m + 1.2, m + 2.2], [z + 0.2, z + 2.2]));
      out.push(rod("hull-grey", [x, m + 0.9, z - 0.4], [x, m + 2.9, z - 0.4], 0.07, 6), cub("lamp-blue", [x - 0.4, x + 0.4], [m + 2.9, m + 3.0], [z - 0.7, z - 0.1]), rod("hull-yellow", [x - 1.5, m + 3.2, z - 0.1], [x + 1.5, m + 3.2, z - 0.1], 0.03, 5));
    }
  out.push(cub("glass", [5.6, 5.8], [m, m + 4.6], [-ROOM.z, ROOM.z]), cub("hull-white-worn", [6.4, 11], [m, m + 0.9], [-7.4, -2.6]), cub("hull-white-worn", [6.4, 11], [m, m + 0.9], [2.6, 7.4]), cub("hazard", [5.5, 5.9], [m, m + 0.2], [-ROOM.z, ROOM.z]));
  out.push(cub("hull-orange", [-ROOM.x, -ROOM.x + 3.2], [m, m + 5.2], [ROOM.z - 6, ROOM.z]), cub("hazard", [-ROOM.x, -ROOM.x + 3.2], [m + 5.2, m + 5.4], [ROOM.z - 6, ROOM.z]), cub("lamp-amber", [-ROOM.x + 0.2, -ROOM.x + 0.8], [m + 4.6, m + 4.9], [ROOM.z - 6.1, ROOM.z - 5.9]));
  // deck 2, crew: two tiers of bunks in two rows, lockers between, a lit corridor down the middle
  const c0 = DECKS.crew + 0.35;
  for (const row of [-1, 1])
    for (let k = 0; k < 6; k++)
      for (const tier of [0, 1]) {
        const x = -ROOM.x + 1.2 + k * 3.8;
        const z = row * 8.6;
        out.push(cub(random() < 0.5 ? "hull-blue" : "hull-white-worn", [x - 1.4, x + 1.4], [c0 + tier * 4.2 + 0.4, c0 + tier * 4.2 + 0.9], [z - 1.1, z + 1.1]), cub("hull-grey-dark", [x - 1.5, x + 1.5], [c0 + tier * 4.2 + 0.2, c0 + tier * 4.2 + 1.1], [z + row * 1.1 - 0.1, z + row * 1.1 + 0.1]), cub("lamp-amber", [x - 0.2, x + 0.2], [c0 + tier * 4.2 + 1.3, c0 + tier * 4.2 + 1.45], [z - row * 0.9 - 0.1, z - row * 0.9 + 0.1]));
        if (tier === 0) out.push(cub("hull-grey", [x + 1.6, x + 1.8], [c0, c0 + 8.6], [z - 1.1, z + 1.1]));
      }
  out.push(cub("lamp-blue", [-ROOM.x + 1, ROOM.x - 1], [c0 + 0.02, c0 + 0.1], [-0.15, 0.15]));
  // deck 3, mess and the hydroponics rack: four long tables with benches; racks of green trays under strip lights
  const e0 = DECKS.mess + 0.35;
  for (let k = 0; k < 4; k++) out.push(cub("hull-white", [-9.6 + k * 3, -8.4 + k * 3], [e0 + 0.95, e0 + 1.1], [-9, -1]), cub("hull-grey-dark", [-9.4 + k * 3, -8.6 + k * 3], [e0, e0 + 0.95], [-8.6, -8.2]), cub("hull-grey-dark", [-9.4 + k * 3, -8.6 + k * 3], [e0, e0 + 0.95], [-1.8, -1.4]), cub("hull-blue", [-10 + k * 3, -9.7 + k * 3], [e0 + 0.45, e0 + 0.55], [-9, -1]));
  for (let t = 0; t < 4; t++) for (let k = 0; k < 5; k++) out.push(cub("plant", [1.5, 10.6], [e0 + 0.6 + t * 2.2, e0 + 0.85 + t * 2.2], [-9.2 + k * 3.6, -6.4 + k * 3.6]), cub("lamp-blue", [1.7, 10.4], [e0 + 1.7 + t * 2.2, e0 + 1.78 + t * 2.2], [-9.2 + k * 3.6, -6.4 + k * 3.6]), cub("hull-grey-dark", [1.4, 1.6], [e0, e0 + 8.8], [-9.3 + k * 3.6, -9.1 + k * 3.6]));
  out.push(cub("hull-grey", [-ROOM.x, ROOM.x], [e0, e0 + 5.2], [ROOM.z - 0.4, ROOM.z], { only: "mesh" }), cub("hull-orange", [-10, -3], [e0, e0 + 3], [ROOM.z - 3.4, ROOM.z - 0.4]), cub("hull-grey-dark", [-9.4, -3.6], [e0 + 3, e0 + 3.2], [ROOM.z - 3.4, ROOM.z - 0.4]));
  // deck 4, recycling: four upright tanks (two water, two air), scrubbers, a heat exchanger and a gallery of pipes along the ceiling
  const r0 = DECKS.recycling + 0.35;
  for (const [x, z, fluid] of [[-7, -7, "fuel"], [-7, 7, "fuel"], [0, -7, "hull-white"], [0, 7, "hull-white"]] as const) out.push(capsule(fluid, x, z, 2.7, r0, r0 + 11), ringAt("hull-grey-dark", x, z, 2.8, r0 + 3, 0.2), ringAt("hull-grey-dark", x, z, 2.8, r0 + 8, 0.2), ringAt("hull-orange", x, z, 2.8, r0 + 5.5, 0.15));
  for (const [x, z] of [[7.4, -7], [7.4, 0], [7.4, 7]] as const) out.push(tubeAt("hull-grey", x, z, 1.6, r0, r0 + 8, { segs: 14 }), cub("lamp-amber", [x - 0.4, x + 0.4], [r0 + 6, r0 + 6.4], [z + 1.55, z + 1.7]), ringAt("copper", x, z, 1.7, r0 + 2, 0.12));
  for (const z of [-4, 0, 4]) out.push(tubeAt(z === 0 ? "copper" : "coolant", 0, z, 0.3, DECKS.recycling + 12, Y1 - 1.4));
  for (let y = Y0 + 2; y < Y1 - 1.4; y += 6) out.push(rod("hull-yellow", [-HX + 1.8, y, ROOM.z - 1], [-HX + 1.8, y + 5, ROOM.z - 1], 0.05, 5), rod("hull-yellow", [-HX + 2.4, y, ROOM.z - 1], [-HX + 2.4, y + 5, ROOM.z - 1], 0.05, 5));
  return out;
}

export function habitat(cut: boolean, detail = 1, seed = "habitat"): Piece[] {
  const out: Piece[] = [];
  const o = { seed, scheme: WHITE, detail, density: 0.34 };
  if (!cut) {
    out.push(...hullBox(BOX, "hull-grey-dark", ["stbd", "port", "dorsal", "ventral"], { ...o, kinds: ["hatch", "windows", "windows", "vent", "lamps", "number", "greeble", "stub", "sensor"] }));
  } else {
    out.push(cub("hull-grey-dark", [-HX, -HX + 0.4], [Y0, Y1], [-HZ, HZ], { only: undefined }));
    for (const sign of [1, -1] as const) out.push(...wallShells(HULL_STACKS.command, { axis: "z", sign, at: sign * HZ, y: [Y0, Y1], across: [-HX, HX], step: 0.3 }));
    out.push(...wallShells(HULL_STACKS.command, { axis: "x", sign: -1, at: -HX, y: [Y0, Y1], across: [-HZ, HZ], step: 0.3 }));
    out.push(...inside(seed));
  }
  // the rails the radiator banks mount on, dorsal and ventral, and a transfer lock on the starboard flank
  const f = facesOf(BOX);
  out.push(...rail(along(f.dorsal), -9, Y0 + 2, Y1 - 2), ...rail(along(f.dorsal), 9, Y0 + 2, Y1 - 2));
  out.push(...rail(along(f.ventral), -9, Y0 + 2, Y1 - 2), ...rail(along(f.ventral), 9, Y0 + 2, Y1 - 2));
  out.push(...collar("L", Y0, -1), ...collar("L", Y1, 1));
  return out;
}
