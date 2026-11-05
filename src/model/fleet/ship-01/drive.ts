// The drive of ISV Hanabusa: no chemical bells but magnetic-nozzle thrusters, a plasma chamber ringed with field coils and a flare of separate coil rings on struts. A ring of twelve, six inside them and one on the axis make the main
// drive; three small ones at each boom's tail trim and spin the booms up. Pure: no three.js and no DOM.
import { hoop, isCoarse, place, rod, type KitModule, type Lathe, type Piece } from "./adapter.ts";

const deg = (a: number): number => (a * Math.PI) / 180;

/** One magnetic-nozzle thruster, exhaust towards -Y from its mounting plane at y = 0: a plasma chamber ringed with field coils, a nozzle that is not a bell but a flare of separate coil rings held on struts, and its feed line. `s` scales it. */
export function mnThruster(s: number): Piece[] {
  const out: Piece[] = [{ kind: "lathe", material: "hull-white", segs: 20, only: "mesh", body: true, profile: [[0.01, 6.4 * s], [0.7 * s, 6.2 * s], [1.0 * s, 5.8 * s], [1.0 * s, 0.2 * s], [0.8 * s, 0] ] } as Lathe];
  for (let i = 0; i < 6; i++) out.push(hoop("coil", 1.3 * s, (0.9 + i * 0.85) * s, 0.2 * s, 28, 8));
  const rings = [1.5, 1.95, 2.45, 3.0, 3.6];
  rings.forEach((r, i) => out.push(hoop("coil-lit", r * s, -(0.7 + i * 0.95) * s, 0.17 * s, 36, 8)));
  for (const a of [0, 90, 180, 270]) {
    const c = Math.cos(deg(a));
    const n = Math.sin(deg(a));
    out.push(rod("hull-grey", [1.0 * s * c, 0.2 * s, 1.0 * s * n], [3.6 * s * c, -4.5 * s, 3.6 * s * n], 0.07 * s, 6, { only: "mesh" }));
  }
  out.push(rod("copper", [0.6 * s, 5.8 * s, 0], [1.6 * s, 7.5 * s, 0], 0.14 * s, 8, { only: "mesh" }), hoop("hull-grey", 1.05 * s, 5.2 * s, 0.25 * s, 24, 8));
  return out;
}

/** The main drive of the keel: a ring of twelve magnetic-nozzle thrusters round the tail, six inside them and one on the axis, on a thrust ring; above them a stack of fusion field coils. */
export function drivePieces(): Piece[] {
  const out: Piece[] = [{ kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, body: true, outline: true, profile: [[0.01, 0], [17.5, 0], [17.5, 1.4], [0.01, 1.4]] } as Lathe];
  for (let k = 0; k < 12; k++) {
    const a = deg(30 * k);
    out.push(...place(mnThruster(1.2), { at: [17 * Math.sin(a), 0, 17 * Math.cos(a)] }));
  }
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k + 30);
    out.push(...place(mnThruster(1.0), { at: [8.4 * Math.sin(a), 0, 8.4 * Math.cos(a)] }));
  }
  out.push(...mnThruster(1.0));
  // the coil stack round the reactor feed, and the radial beams of the thrust ring
  out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 40, body: true, outline: true, profile: [[10, 1.4], [10, 11.6]] } as Lathe);
  for (let i = 0; i < 7; i++) out.push(hoop("coil", 10.6, 2.4 + i * 1.4, 0.55, 48, 10));
  for (let k = 0; k < 12; k++) out.push(...place([rod("hull-grey", [0, 0.7, 2], [0, 0.7, 17], 0.55, 8, { only: "mesh" })], { at: [0, 0, 0], yaw: 30 * k + 15 }));
  return out;
}
export const DRIVE: KitModule = {
  id: "mn-drive",
  name: "Main drive: magnetic-nozzle array",
  kind: "engine",
  note: "Nineteen magnetic-nozzle thrusters on a thrust ring, a stack of seven fusion field coils above them: no bell, the field is the nozzle.",
  mass: 1800,
  propellant: 0,
  length: 11.6,
  width: 40,
  depth: 40,
  top: "L",
  ports: [],
  ancestor: "The plasma chambers and magnetic nozzles of the VASIMR and Project Daedalus studies, ringed with the field coils of fusion experiments.",
  inside: false,
  livery: "industrial",
  pieces: (options) => (options?.level === "coarse" ? drivePieces().filter(isCoarse) : drivePieces()),
};

