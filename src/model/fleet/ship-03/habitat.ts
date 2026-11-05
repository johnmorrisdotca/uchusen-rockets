// Habitation and medical, station 250 to 302 m: bunks and a mess, a hydroponics rack, water and air recycling, and the six-bed triage bay with its own quarantine and transfer lock. It is a round pressure volume, a drum with
// berthing rings at both ends and a ring of portholes, like the ISS's modules. The crew decks stand perpendicular to thrust, so they are round floors one above another up the spine. The dorsal and ventral rails carry the
// radiator banks. A cutaway opens the starboard side. Descends from the ISS's Destiny and Node modules and Skylab's wet workshop, with Orion's armoured shell. Pure: no three.js and no DOM.
import { collar, contextOf, cub, drum, type Piece, place, rng, rod } from "./adapter.ts";
import { lampHalo, lightPool } from "../lights.ts";
import { STATION } from "./dims.ts";
import { capsule, ringAt, tubeAt } from "./shapes.ts";

const [Y0, Y1] = STATION.habitat;
const R = 13;
const L = Y1 - Y0;
/** Where each deck's floor stands up the spine, from the keel end: medical, crew, mess and farm, recycling. */
const DECKS = { medical: Y0 + 1, crew: Y0 + 9.4, mess: Y0 + 22, recycling: Y0 + 34.5 } as const;
const INNER = 11.7;

/** A ring of portholes: a frame, a glass pane and a lit rim, facing out of the drum at a height. */
function portholes(y: number, n: number, start: number): Piece[] {
  const out: Piece[] = [];
  for (let k = 0; k < n; k++) {
    const a = start + (Math.PI * 2 * k) / n;
    const u: [number, number, number] = [Math.cos(a), 0, -Math.sin(a)];
    const w: [number, number, number] = [Math.sin(a), 0, Math.cos(a)];
    const ring = (material: "hull-grey-dark" | "window" | "lamp-blue", rad: number, from: number, thick: number): Piece => ({ kind: "plate", material, frame: { o: [(R + from + thick / 2) * w[0], y, (R + from + thick / 2) * w[2]], u, v: [0, 1, 0], w }, outline: Array.from({ length: 12 }, (_, i) => [rad * Math.cos((Math.PI * 2 * i) / 12), rad * Math.sin((Math.PI * 2 * i) / 12)] as [number, number]), thickness: thick, plain: true, only: "mesh" });
    out.push(ring("hull-grey-dark", 0.62, 0.0, 0.2), ring("window", 0.55, 0.2, 0.06), ring("lamp-blue", 0.16, 0.26, 0.04));
    // the burn shutter: a plate on a hinge above the window, drawn back, with its actuator
    const at = (a2: number, b2: number, c2: number): [number, number, number] => [(R + c2) * w[0] + b2 * u[0], y + a2, (R + c2) * w[2] + b2 * u[2]];
    out.push(rod("hull-grey-dark", at(0.78, -0.7, 0.3), at(0.78, 0.7, 0.3), 0.07, 8), rod("hull-grey", at(0.8, -0.6, 0.45), at(1.5, -0.6, 0.45), 0.05, 8), rod("hull-orange", at(0.82, -0.62, 0.34), at(0.82, 0.62, 0.34), 0.05, 8));
  }
  return out;
}

/** The colours of the rooms: the class's own, and Ariake's dawn theme (warm wood and dawn-gold in place of blue). */
const THEMES = {
  plain: { bunk: ["hull-blue", "hull-white-worn"], table: "hull-white", bench: "hull-blue", trim: "lamp-blue" },
  dawn: { bunk: ["hull-dawn", "wood"], table: "wood", bench: "hull-dawn", trim: "lamp-amber" },
} as const;
export type Theme = keyof typeof THEMES;

function inside(seed: string, theme: Theme): Piece[] {
  const t = THEMES[theme];
  const random = rng(`${seed}/inside`);
  const out: Piece[] = [];
  const disc = (y: number): Piece => ({ kind: "lathe", material: "deck", segs: 40, only: "mesh", profile: [[0.01, y], [INNER, y], [INNER, y + 0.35], [0.01, y + 0.35]] });
  for (const y of Object.values(DECKS)) out.push(disc(y));
  out.push({ kind: "lathe", material: "hull-white-worn", segs: 40, only: "mesh", profile: [[INNER, Y1 - 1.4], [0.01, Y1 - 1.4]] });
  // deck 1, medical: six triage berths in two rows of three, each with a monitor arm, a curtain rail and a lamp; a quarantine room behind glass; a transfer lock
  const m = DECKS.medical + 0.35;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const x = -7.6 + c * 3.6;
      const z = r === 0 ? -7 : 1.4;
      out.push(cub("hull-white", [x - 1.1, x + 1.1], [m, m + 0.9], [z, z + 4.4]), cub("hull-grey-dark", [x - 0.9, x + 0.9], [m + 0.9, m + 1.15], [z + 0.2, z + 4.2]), cub("glass", [x - 1.15, x + 1.15], [m + 1.2, m + 2.2], [z + 0.2, z + 2.2]));
      out.push(rod("hull-grey", [x, m + 0.9, z - 0.4], [x, m + 2.9, z - 0.4], 0.07, 12), cub("lamp-blue", [x - 0.4, x + 0.4], [m + 2.9, m + 3.0], [z - 0.7, z - 0.1]), rod("hull-yellow", [x - 1.5, m + 3.2, z - 0.1], [x + 1.5, m + 3.2, z - 0.1], 0.03, 12));
    }
  out.push(cub("glass", [4.6, 4.8], [m, m + 4.6], [-9.2, 9.2]), cub("hull-white-worn", [5.4, 9.2], [m, m + 0.9], [-6.4, -2.4]), cub("hull-white-worn", [5.4, 9.2], [m, m + 0.9], [2.4, 6.4]), cub("hazard", [4.5, 4.9], [m, m + 0.2], [-9.2, 9.2]));
  out.push(cub("hull-orange", [-9.8, -6.8], [m, m + 5.2], [2, 6.4]), cub("hazard", [-9.8, -6.8], [m + 5.2, m + 5.4], [2, 6.4]), cub("lamp-amber", [-9.6, -9], [m + 4.6, m + 4.9], [1.9, 2.1]));
  // deck 2, crew: two tiers of bunks in two rows, a lit corridor down the middle
  const c0 = DECKS.crew + 0.35;
  for (const row of [-1, 1])
    for (let k = 0; k < 5; k++)
      for (const tier of [0, 1]) {
        const x = -6.6 + k * 3.3;
        const z = row * 6.2;
        out.push(cub(random() < 0.5 ? t.bunk[0] : t.bunk[1], [x - 1.4, x + 1.4], [c0 + tier * 4.2 + 0.4, c0 + tier * 4.2 + 0.9], [z - 1.1, z + 1.1]), cub("hull-grey-dark", [x - 1.5, x + 1.5], [c0 + tier * 4.2 + 0.2, c0 + tier * 4.2 + 1.1], [z + row * 1.1 - 0.1, z + row * 1.1 + 0.1]), cub("lamp-amber", [x - 0.2, x + 0.2], [c0 + tier * 4.2 + 1.3, c0 + tier * 4.2 + 1.45], [z - row * 0.9 - 0.1, z - row * 0.9 + 0.1]));
        if (tier === 0) out.push(rod("hull-grey", [x + 1.6, c0, z], [x + 1.6, c0 + 8.6, z], 0.1, 12));
      }
  out.push(cub(t.trim, [-8, 8], [c0 + 0.02, c0 + 0.1], [-0.15, 0.15]));
  // deck 3, mess and the hydroponics rack: four long tables with benches; racks of green trays under strip lights
  const e0 = DECKS.mess + 0.35;
  for (let k = 0; k < 4; k++) out.push(cub(t.table, [-7.2 + k * 2.6, -6 + k * 2.6], [e0 + 0.95, e0 + 1.1], [-7, -1]), cub("hull-grey-dark", [-7 + k * 2.6, -6.2 + k * 2.6], [e0, e0 + 0.95], [-6.6, -6.2]), cub("hull-grey-dark", [-7 + k * 2.6, -6.2 + k * 2.6], [e0, e0 + 0.95], [-1.8, -1.4]), cub(t.bench, [-7.6 + k * 2.6, -7.3 + k * 2.6], [e0 + 0.45, e0 + 0.55], [-7, -1]));
  for (let t = 0; t < 4; t++) for (let k = 0; k < 4; k++) out.push(cub("plant", [1.5, 8.2], [e0 + 0.6 + t * 2.2, e0 + 0.85 + t * 2.2], [-7.4 + k * 3.4, -4.8 + k * 3.4]), cub("lamp-blue", [1.7, 8], [e0 + 1.7 + t * 2.2, e0 + 1.78 + t * 2.2], [-7.4 + k * 3.4, -4.8 + k * 3.4]), rod("hull-grey-dark", [1.5, e0, -7.5 + k * 3.4], [1.5, e0 + 8.8, -7.5 + k * 3.4], 0.07, 12));
  out.push(cub("hull-grey", [-5, 5], [e0, e0 + 5.2], [9.8, 10.4], { only: "mesh" }), cub("hull-orange", [-6, -2], [e0, e0 + 3], [7, 9.8]), cub("hull-grey-dark", [-6, -2], [e0 + 3, e0 + 3.2], [7, 9.8]));
  // deck 4, recycling: four upright tanks (two water, two air), scrubbers, a heat exchanger and a gallery of pipes along the ceiling
  const r0 = DECKS.recycling + 0.35;
  for (const [x, z, fluid] of [[-5.5, -5.5, "fuel"], [-5.5, 5.5, "fuel"], [1, -5.5, "hull-white"], [1, 5.5, "hull-white"]] as const) out.push(capsule(fluid, x, z, 2.7, r0, r0 + 11), ringAt("hull-grey-dark", x, z, 2.8, r0 + 3, 0.2), ringAt("hull-grey-dark", x, z, 2.8, r0 + 8, 0.2), ringAt("gold", x, z, 2.8, r0 + 5.5, 0.15));
  for (const z of [-5, 0, 5]) out.push(tubeAt("hull-grey", 7, z, 1.6, r0, r0 + 8, { segs: 14 }), cub("lamp-amber", [6.6, 7.4], [r0 + 6, r0 + 6.4], [z + 1.55, z + 1.7]), ringAt("copper", 7, z, 1.7, r0 + 2, 0.12));
  for (const z of [-4, 0, 4]) out.push(tubeAt(z === 0 ? "copper" : "coolant", 0, z, 0.3, DECKS.recycling + 12, Y1 - 1.6, { segs: 12 }));
  for (let y = Y0 + 2; y < Y1 - 1.6; y += 6) out.push(rod("hull-yellow", [-8.4, y, 7.8], [-8.4, y + 5, 7.8], 0.05, 12), rod("hull-yellow", [-7.8, y, 7.8], [-7.8, y + 5, 7.8], 0.05, 12));
  return out;
}

export function habitat(cut: boolean, detail = 1, seed = "habitat", theme: Theme = "plain"): Piece[] {
  const base = contextOf(`${seed}`, "science", { cutaway: cut, detail, seed }, "command");
  const ctx = theme === "dawn" ? { ...base, livery: { ...base.livery, accent: "hull-dawn" as const } } : base;
  // the drum is built on the spine's axis from 0 to L and opens towards +Z; turn it a quarter so the cut faces starboard
  const out: Piece[] = [...place(drum(ctx, { R, L, top: "L", bottom: "L", panels: { wide: 2.8, tall: 1.9 }, hatches: 9, roundHatches: true, conduits: 7, trays: 3, vents: 5, ladders: 2, rings: [0.14, 0.3, 0.46, 0.62, 0.78, 0.9], digits: "03", junk: 90 }), { at: [0, Y0, 0], yaw: 90 })];
  if (cut) out.push(...inside(seed, theme));
  for (const [y, n, s0] of [[Y0 + 10, 12, 0.1], [Y0 + 24, 12, 0.4], [Y0 + 38, 12, 0.2]] as const) if (!cut) out.push(...portholes(y, n, s0));
  else out.push(...portholes(y, n, s0).filter((_, i) => Math.sin(s0 + (Math.PI * 2 * Math.floor(i / 3)) / n) < 0));
  void collar;
  out.push(...lampHalo("port", [-72, 270, 22]), ...lampHalo("strobe", [0, 276, 20]), ...lightPool({ o: [0, 276, 16], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, 14));
  return out;
}
