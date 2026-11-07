// The still hull and the two rotating propellant booms of ISV Hanabusa: about 589 m of large real modules, and the cross-frames, hub drums and the axial lift. Pure: no three.js and no DOM.
import { moving } from "../motion.ts";
import { BUILDERS, box, ibeam, KIT, place, type KitModule, type Lathe, type Piece } from "./adapter.ts";
import { DRIVE, mnThruster } from "./drive.ts";
import { SPIN } from "./spin.ts";
import { liftTube } from "./wheelparts.ts";

const deg = (a: number): number => (a * Math.PI) / 180;

export function stackOf(list: readonly (string | KitModule)[], y0: number, detail: number): { pieces: Piece[]; end: number; at: Map<string, number> } {
  let y = y0;
  const pieces: Piece[] = [];
  const at = new Map<string, number>();
  list.forEach((one, i) => {
    const m = typeof one === "string" ? KIT[one] : one;
    pieces.push(...place(m.pieces({ seed: `h${i}`, detail: m.length >= 30 ? detail * 0.8 : detail }), { at: [0, y, 0] }));
    at.set(`${i}`, y);
    y += m.length;
  });
  return { pieces, end: y, at };
}

export const TANK = BUILDERS.tank("hull-tank", "Main propellant tank", 13, 40, "L", "L", 2400, 24000, "");
export const FARM = BUILDERS.habitatDrum("hull-farm", "Farm drum", 12, 34, 1200, true);
export const HAB = BUILDERS.habitatDrum("hull-hab", "Habitat drum", 12, 34, 1200, false);
export const BOOM_TANK = BUILDERS.tank("boom-tank", "Boom tank", 5, 24, "M", "M", 70, 520, "");

/** The still hull from the tail to the bow, each module with the id it has as a part and the name it has on the sheets. */
export const SPINE: readonly { id: string; name: string; module: KitModule }[] = [
  { id: "drive", name: "Main drive: magnetic-nozzle array", module: DRIVE },
  { id: "reactor", name: "Fusion reactor", module: KIT["reactor-fusion"] },
  { id: "tank-1", name: "Propellant tank 1", module: TANK },
  { id: "tank-2", name: "Propellant tank 2", module: TANK },
  { id: "tank-3", name: "Propellant tank 3", module: TANK },
  { id: "tank-4", name: "Propellant tank 4", module: TANK },
  { id: "drum-habitat-1", name: "Habitat drum, aft", module: HAB },
  { id: "drum-farm-1", name: "Farm drum, aft", module: FARM },
  { id: "tank-5", name: "Propellant tank 5", module: TANK },
  { id: "tank-6", name: "Propellant tank 6", module: TANK },
  { id: "drum-farm-2", name: "Farm drum, mid", module: FARM },
  { id: "tank-7", name: "Propellant tank 7", module: TANK },
  { id: "drum-habitat-2", name: "Habitat drum, fore", module: HAB },
  { id: "tank-8", name: "Propellant tank 8", module: TANK },
  { id: "node", name: "Docking hub node", module: KIT["node-four"] },
  { id: "adapter", name: "Adapter L to M", module: KIT["adapter-l-m"] },
  { id: "crew-drum", name: "Crew drum", module: KIT["habitat-drum-crew"] },
  { id: "common-area", name: "Common area", module: KIT["common-area-m"] },
  { id: "lab", name: "Laboratory", module: KIT["lab-m"] },
  { id: "survey-pod", name: "Mission pod, survey", module: KIT["pod-survey-m"] },
  { id: "solarium", name: "Solarium", module: KIT["solarium-m"] },
  { id: "nav-deck", name: "Navigation deck", module: KIT["deck-nav-m"] },
  { id: "dome", name: "Observation dome", module: KIT["dome-observation-m"] },
];

/** Where each spine module stands: its base on the keel, in metres from the tail. */
export const SPINE_Y: Readonly<Record<string, number>> = (() => {
  let y = 0;
  const out: Record<string, number> = {};
  for (const one of SPINE) {
    out[one.id] = y;
    y += one.module.length;
  }
  out.end = y;
  return out;
})();

/** The still hull: the spine modules stacked, the wheels' hubs turning round it. */
export function hull(): Piece[] {
  return stackOf(SPINE.map((one) => one.module), 0, 0.45).pieces;
}

/** One rotating propellant boom: seventeen tanks in a column beside the keel, with three small magnetic-nozzle trim thrusters at its tail. */
export function boomPieces(sx: number, detail = 0.3): Piece[] {
  const out: Piece[] = [...stackOf(Array.from({ length: 17 }, () => BOOM_TANK), 100, detail).pieces];
  for (let k = 0; k < 3; k++) {
    const a = deg(120 * k);
    out.push(...place(mnThruster(0.45), { at: [6.8 * Math.sin(a), 100, 6.8 * Math.cos(a)] }));
  }
  return moving(place(out, { at: [sx * SPIN.boomX, 0, 0] }), { name: "spin", pivot: [0, 0, 0], axis: [0, 1, 0] });
}

/** The hubs the wheels turn on: a drum on a bearing round the keel at each wheel, with cross-beams to the booms, and the axial glazed lift down the keel with a lit car at each wheel and at the docking node. */
export function hubPieces(): Piece[] {
  const out: Piece[] = [];
  const ys = [...SPIN.close.ys, SPIN.industrial.y];
  for (const y of ys) {
    const drum: Piece[] = [{ kind: "lathe", material: "hull-white", at: [0, 0], segs: 48, body: true, outline: true, profile: [[SPIN.hubR, y - 8], [SPIN.hubR, y + 8]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, only: "mesh", profile: [[SPIN.hubR, y - 8], [SPIN.hubR + 1.3, y - 8], [SPIN.hubR + 1.3, y + 8], [SPIN.hubR, y + 8]] } as Lathe];
    for (const sx of [-1, 1]) for (const dz of [-1, 1]) drum.push(...ibeam("hull-grey", [sx * (SPIN.hubR - 1), y + dz * 7, 0], [sx * (SPIN.boomX - 4.5), y + dz * 7, 0], 1.6, 1.0, [0, 0, 1]));
    out.push(...moving(drum, { name: y === SPIN.industrial.y ? "spin-wheel" : "spin", pivot: [0, y, 0], axis: [0, 1, 0] }));
  }
  const top = SPINE_Y.node + 4;
  out.push(...liftTube([0, 130, 13.5], [0, top, 13.5], "glass-clear", 2.2, [], 0));
  const stops = [...ys, top - 4];
  stops.forEach((y, k) => {
    const car = [box("hull-white", [0, y - 1.2, 13.5], 2.6, 2.6, 2.4, 0, { only: "mesh", plain: true }), box("window", [0, y - 0.9, 13.5], 2.7, 2.7, 1.1, 0, { only: "mesh", plain: true }), box("lamp-amber", [0, y + 1.2, 13.5], 0.8, 0.8, 0.3, 0, { only: "mesh", plain: true })];
    out.push(...moving(car, { name: k === stops.length - 1 ? "keel-lift-node" : `keel-lift-${k}`, pivot: [0, y, 13.5], axis: [0, 1, 0] }));
  });
  return out;
}

/** Both booms and the hubs: the rotating framework of the wheels. */
export function booms(): Piece[] {
  return [...boomPieces(-1), ...boomPieces(1), ...hubPieces()];
}
