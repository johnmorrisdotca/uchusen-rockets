// Kyotori's docking plan (LESSONS 31): the ports are DATA first (`PORTS`: name, collar class, where, which way, what it stands on, who may use it, whether it has a walkway), and the pieces are drawn from the same numbers elsewhere. The two ships dock into
// the station's housing at its stern on L collars; each quarter of the station has an H-class stub at its flank for large ships, on a despun bearing so that a ship docks at rest while the quarter turns behind the ring; four S ports on the hub's forward shoulder take
// small craft and crew vehicles; each ship has an S-class crew-vehicle arm and the long ship an M-class dock in its bay. The positions are in station metres (X across, Y from the tail up the axis, Z up). Pure: no three.js and no DOM.
import { COLLARS } from "../collars.ts";
import { BAYS, STATION, STUB, STUB_FACE } from "./station.ts";
import { SHAFT_X } from "./cluster.ts";

export interface DockPort {
  id: string;
  name: string;
  collar: "S" | "M" | "L" | "H";
  /** Where the ring's face is, and the way a docked craft's nose points (a unit vector). */
  at: readonly [number, number, number];
  dir: readonly [number, number, number];
  /** What it stands on, and whether that turns (a quarter's stub sits on a despun bearing, so the ring does not). */
  mount: string;
  turns: boolean;
  despun: boolean;
  allows: readonly string[];
  walkway: boolean;
  /** Inside a ship (the bay's dock): not counted against the outside ports. */
  internal?: boolean;
  /** The biggest craft it takes: radius and length along `dir`, metres. */
  craft: { radius: number; length: number };
  /** Package craft a person may put here. Absent: nothing drawn is allowed. */
  models?: readonly ("dragon" | "soyuz" | "orion" | "starship")[];
}

const deg = (a: number): number => (a * Math.PI) / 180;

export const PORTS: readonly DockPort[] = [
  ...STATION.kinds.map((kind, k): DockPort => ({ id: `quarter-${kind}`, name: `${kind[0].toUpperCase()}${kind.slice(1)} quarter dock`, collar: "H", at: [STUB.radius * Math.sin(deg(90 * k)), STUB_FACE, STUB.radius * Math.cos(deg(90 * k))], dir: [0, 1, 0], mount: `${kind} quarter's despun docking ring`, turns: false, despun: true, allows: ["Miyamoto class", "Ariake class", "Hanabusa's small craft", "crew vehicles", "Starship upper stage", "ships A, B, C, D in the quadrant arrangement"], walkway: true, craft: { radius: 22, length: 400 }, models: ["dragon", "starship"] })),
  ...BAYS.map(([sx, sz], i): DockPort => ({ id: `housing-${"abcd"[i]}`, name: `Stern housing, bay ${"ABCD"[i]}`, collar: "L", at: [sx * SHAFT_X, 335, sz * SHAFT_X], dir: [0, 1, 0], mount: "the station's housing at its stern (still)", turns: false, despun: false, allows: ["a ship of the class (A, B, C or D)"], walkway: true, craft: { radius: 9, length: 340 } })),
  ...[45, 135, 225, 315].map((a, i): DockPort => ({ id: `hub-${i}`, name: `Hub small-craft port ${i + 1}`, collar: "S", at: [0.62 * STATION.hubR * Math.sin(deg(a)), STATION.y + STATION.hubHalf + 3.9, 0.62 * STATION.hubR * Math.cos(deg(a))], dir: [0, -1, 0], mount: "the hub's forward shoulder (still)", turns: false, despun: false, allows: ["crew vehicles", "small craft"], walkway: true, craft: { radius: 3.5, length: 30 }, models: ["dragon"] })),
  { id: "ship-a-crew", name: "Ship A crew-vehicle arm", collar: "S", at: [SHAFT_X + 16, 240, -SHAFT_X], dir: [0, -1, 0], mount: "ship A's truss (still)", turns: false, despun: false, allows: ["crew vehicles"], walkway: false, craft: { radius: 3.5, length: 30 }, models: ["dragon"] },
  { id: "ship-b-crew", name: "Ship B crew-vehicle arm", collar: "S", at: [-SHAFT_X - 16, 212, -SHAFT_X], dir: [0, -1, 0], mount: "ship B's truss (still)", turns: false, despun: false, allows: ["crew vehicles"], walkway: false, craft: { radius: 3.5, length: 30 }, models: ["dragon"] },
  { id: "ship-a-bay", name: "Ship A payload bay dock", collar: "M", at: [SHAFT_X, 262.4, -SHAFT_X], dir: [0, 1, 0], mount: "ship A's bay bulkhead (still)", turns: false, despun: false, allows: ["small craft", "probes"], walkway: false, internal: true, craft: { radius: 5, length: 36 } },
];

/** The ports whose docked craft would overlap: parallel ports whose axes are nearer than the sum of the craft radii, over lengths that share a stretch of the axis. None is allowed. */
export function clearance(): [string, string][] {
  const bad: [string, string][] = [];
  for (let i = 0; i < PORTS.length; i++) for (let j = i + 1; j < PORTS.length; j++) {
    const a = PORTS[i];
    const b = PORTS[j];
    if (a.internal || b.internal) continue;
    if (Math.abs(a.dir[1] * b.dir[1]) < 0.99) continue;
    const lateral = Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]);
    const span = (p: DockPort): [number, number] => (p.dir[1] < 0 ? [p.at[1], p.at[1] + p.craft.length] : [p.at[1] - p.craft.length, p.at[1]]);
    const [a0, a1] = span(a);
    const [b0, b1] = span(b);
    if (lateral < a.craft.radius + b.craft.radius && a0 < b1 && b0 < a1) bad.push([a.id, b.id]);
  }
  return bad;
}

/** A port's collar ring, in metres: the standard's own size. */
export const ringOf = (port: DockPort): number => COLLARS[port.collar].outer;
