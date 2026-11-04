// The swappable mission pod: one 120 m module on a dorsal keyed collar between the two upper tanks, the one part of the ship that changes with the mission while the frame stays the same. Two variants stand in
// the same mount: a survey pod (laboratories, sensor masts and a sample hangar) and a settlement pod (round-windowed habitat decks, a greenhouse and two docking ports). Both take the same three clamp arms, the
// same 12 m standard collar and the same service umbilical. The pod lies along y at z = 62 over the spine; its local frame has its mount at (0, 0, 0).
import { beam, box, collar, cyl, dish, drum, forDrawing, hatch, hazard, lights, mast, onHull, pipe, plating, PLATE, revolve, ring, rng, span, stencil, facesOf, vent, type Piece } from "./adapter.ts";

export const POD = { y: 480, z: 62, length: 120, radius: 15 } as const;

/** What both variants share: the keyed collar, the three clamp arms to the spine, the umbilical, and the pod's cylindrical hull with its end domes. */
export function common(seed: number, tone: "hull-orange" | "hull-white"): Piece[] {
  const r = rng(seed);
  const out: Piece[] = [];
  const R = POD.radius;
  out.push({ kind: "lathe", material: "hull-grey", at: [0, 0], segs: 28, body: true, outline: true, rings: [10, 110], profile: [[0.001, 0], [R * 0.7, 2], [R, 8], [R, POD.length - 8], [R * 0.7, POD.length - 2], [0.001, POD.length]] });
  // the pod lies on its side, so its axis is y and its up is +z; the mount is the underside, at z = -R, 3 clamp arms to the spine's dorsal face at z = 18 - 62
  for (const y of [14, 60, 106]) {
    out.push(beam("hull-orange", [-R * 0.8, y, -R * 0.55], [-9, y, -POD.z + 20], 3, 3, true), beam("hull-orange", [R * 0.8, y, -R * 0.55], [9, y, -POD.z + 20], 3, 3, true));
    out.push(box("hull-yellow", [0, y, -R - 0.5], [8, 3, 1.6]), ring("engine-pale", [0, 0], 0.01, 0.02, 0, 0.01, 4));
  }
  out.push(span("dark", -12, 12, 0, POD.length, -POD.z + 17, -POD.z + 20, true));
  // the keyed collar: a standard 12 m collar facing the spine, with its key lug, and an umbilical bundle
  out.push(...collar([0, -POD.z + 20], 0, 1, 6).map((p) => p).slice(0, 0));
  out.push(box("coolant", [-3, 40, -R - 1], [2.4, 80, 1.6]), box("hull-orange", [3, 40, -R - 1], [2.4, 80, 1.6]), box("black", [0, 20, -R - 1.8], [8, 3, 1.2]));
  // hull bands, plating, panels and stencils
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * 2 * Math.PI;
    for (const [y0, y1] of [[10, 50], [54, 94]] as const) if (!r.chance(0.08)) out.push(onHull(r.pick([tone, "hull-grey", "hull-grey", "hull-grey-dark", "hull-white"]), [0, 0], a, R, (y0 + y1) / 2, 5.4, y1 - y0 - 1, 0.35 + 0.25 * r.next()));
  }
  out.push(ring(tone, [0, 0], R, R + 0.6, 6, 12, 28), ring(tone, [0, 0], R, R + 0.6, POD.length - 12, POD.length - 6, 28), ring("hull-yellow", [0, 0], R, R + 0.5, 56, 58, 28));
  void drum; void forDrawing; void hatch; void hazard; void lights; void mast; void pipe; void plating; void PLATE; void revolve; void stencil; void facesOf; void vent; void cyl; void dish;
  return out;
}

/** The survey pod: three laboratory decks with a window strip, a sample hangar door, sensor masts, dishes, and a telescope barrel on the bow end. */
export function podSurvey(): Piece[] {
  const out = common(2100, "hull-white");
  const R = POD.radius;
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * 2 * Math.PI + 0.1;
    if (Math.cos(a) < 0.1 && Math.sin(a) !== 0) continue;
    out.push(onHull("glass", [0, 0], a, R + 0.3, 30, 4, 3, 0.3), onHull("lamp-blue", [0, 0], a, R + 0.5, 30, 3, 0.8, 0.2), onHull("glass", [0, 0], a, R + 0.3, 74, 4, 3, 0.3));
  }
  // a sample hangar door on the outboard side, hazard frame
  out.push(onHull("dark", [0, 0], Math.PI / 2, R, 82, 14, 22, 1.2), onHull("hull-yellow", [0, 0], Math.PI / 2, R + 1, 82, 12, 20, 0.5), onHull("hull-orange", [0, 0], Math.PI / 2, R + 1.4, 82, 10, 18, 0.4));
  // sensor masts, dishes, a telescope barrel at the bow end (+y), spectrometer drum
  for (const [x, y] of [[-7, 30], [7, 44], [0, 90]] as const) out.push(beam("engine-metal", [x, y, R], [x, y, R + 14], 0.8, 0.8), box("lamp-red", [x, y, R + 14.4], [1.6, 1.6, 1.6]), box("engine-metal", [x, y, R + 11], [6, 0.6, 0.6]));
  out.push(...dish([-8, 66], R + 3, 7), ...dish([8, 96], R + 3, 6));
  out.push(drum("engine-pale", [0, 0], 6, POD.length, POD.length + 26, 24), ring("copper", [0, 0], 6, 7, POD.length + 10, POD.length + 14, 24), ring("dark", [0, 0], 0.01, 6.4, POD.length + 26, POD.length + 28, 24), ring("dark", [0, 0], 6.4, 8, POD.length + 24, POD.length + 26, 24));
  out.push(box("lamp-blue", [0, 32, -3], [1, 1, 1]));
  return out;
}

/** The settlement pod: two decks of round windows, a glazed greenhouse band, two docking ports on the bow end and a ring of clamp lights. */
export function podSettlement(): Piece[] {
  const out = common(2101, "hull-white");
  const R = POD.radius;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * 2 * Math.PI;
    for (const y of [20, 34, 76, 90]) out.push(onHull("dark", [0, 0], a, R + 0.2, y, 3.4, 3.4, 0.4), onHull("glass", [0, 0], a, R + 0.5, y, 2.4, 2.4, 0.3), onHull("lamp-blue", [0, 0], a, R + 0.7, y, 1.6, 0.5, 0.2));
  }
  out.push({ kind: "lathe", material: "glass", at: [0, 0], segs: 28, only: "mesh", profile: [[R + 0.8, 44], [R + 0.8, 66]] }, { kind: "lathe", material: "plant", at: [0, 0], segs: 28, only: "mesh", profile: [[R - 3, 44], [R - 3, 66]] });
  for (let y = 46; y < 66; y += 4) out.push(ring("engine-metal", [0, 0], R + 0.7, R + 1.5, y, y + 0.8, 28));
  out.push(...collar([-6, 0], POD.length, 1, 5), ...collar([6, 0], POD.length, 1, 5));
  out.push(box("dark", [0, POD.length + 4, 0], [22, 8, 12]), box("hull-yellow", [0, POD.length + 8.3, 0], [18, 0.6, 8]));
  return out;
}

/** The tanker pod: a pressurised barrel with two outboard propellant spheres, a transfer manifold and a hose reel, for carrying fuel to another ship or a station. */
export function podTanker(): Piece[] {
  const out = common(2102, "hull-white");
  const R = POD.radius;
  for (const sx of [-1, 1]) for (const y of [34, 86]) {
    out.push(revolve("hull-grey", [sx * (R + 9), 0], Array.from({ length: 9 }, (_, i) => [9 * Math.sin((i / 8) * Math.PI), y - 9 * Math.cos((i / 8) * Math.PI)] as const), 20));
    out.push(ring("engine-pale", [sx * (R + 9), 0], 8.9, 9.6, y - 0.8, y + 0.8, 20), beam("engine-metal", [sx * R * 0.9, y, 0], [sx * (R + 4), y, 0], 2, 2));
    out.push(...mastPair(sx, y));
  }
  out.push(pipe("coolant", [-R - 9, 20, 0], [R + 9, 20, 0], 1.4, 8), pipe("hull-orange", [-R - 9, 100, 0], [R + 9, 100, 0], 1.4, 8));
  out.push(drum("dark", [0, 0], 4, POD.length, POD.length + 14, 16), ring("hull-yellow", [0, 0], 4, 6, POD.length + 4, POD.length + 8, 16), ...collar([0, 0], POD.length + 14, 1, 5));
  return out;
}

function mastPair(sx: number, y: number): Piece[] {
  return [pipe("coolant", [sx * (POD.radius + 9), y + 9, 0], [sx * (POD.radius + 9), y + 16, 0], 0.8, 8), box("hull-yellow", [sx * (POD.radius + 9), y + 17, 0], [2.4, 2, 2.4])];
}

/** The cargo pod: a frame holding six small containers round a barrel, with twist-lock plates, a crane rail and a hatch door at each end. */
export function podCargo(): Piece[] {
  const out = common(2103, "hull-white");
  const R = POD.radius;
  const r = rng(2104);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 2 * Math.PI + Math.PI / 6;
    const x = (R + 6) * Math.sin(a);
    const z = (R + 6) * Math.cos(a);
    for (const y of [32, 82]) {
      out.push(box(r.pick(["hull-orange", "hull-grey", "hull-white", "coolant", "blanket"]), [x, y, z], [9, 40, 9]));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) out.push(box("dark", [x + sx * 4, y + sy * 19, z + sz(sx)], [1.6, 1.6, 1.6]));
      out.push(box("hull-yellow", [x, y - 20.4, z], [6, 0.8, 6]), beam("hull-grey", [x * 0.55, y - 20, z * 0.55], [x, y - 20, z], 1.2, 1.2));
    }
  }
  out.push(span("hull-yellow", -0.4, 0.4, 6, POD.length - 6, R + 11, R + 11.8), ...collar([0, 0], POD.length, 1, 5));
  return out;
}
const sz = (sx: number): number => sx * 2;
