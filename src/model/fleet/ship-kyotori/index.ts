// Kyotori V2's parts: each piece of the ships and the station as a row of the table below, with where it stands (joined, or the ships apart), its size and how to build its pieces at a level of detail. Every builder works in station metres (X across,
// Y from the tail up the axis, Z up); `local` moves a part's pieces so that its origin is its own base. Ship B is built in its own frame and turned half way about its axis so its outer side is -X. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { isCoarse, place, type Piece } from "./adapter.ts";
import { bay, bowLong, bowRunner, latchHalf } from "./hardware.ts";
import { crewPort, elevator, inlineDrive, mod, truss } from "./parts.ts";
import { housing, quarterPart, STATION, stationCore, wings } from "./station.ts";
import { SHAFT_X } from "./v2.ts";
import { insulatedTank } from "./hardware.ts";
import { KIT, ibeam } from "./adapter.ts";

export const LEVELS = [0.25, 0.6, 1] as const;
export interface BuildOptions {
  detail?: number;
  level?: "coarse" | "fine";
}
export interface KyotoriPart {
  id: string;
  name: string;
  kind: PartKind;
  y0: number;
  place: { x: number; z: number };
  height: number;
  diameter: number;
  note: string;
  pieces: (options?: BuildOptions) => Piece[];
}

const deg = (a: number): number => (a * Math.PI) / 180;
/** How far the ships move when they part: out along X and back along the axis. */
export const APART = { x: 56, y: -50 } as const;

const local = (pieces: Piece[], x: number, y: number, z: number, level?: "coarse" | "fine"): Piece[] => {
  const moved = place(pieces, { at: [-x, -y, -z] });
  return level === "coarse" ? moved.filter(isCoarse) : moved;
};

function tanks(): Piece[] {
  const out: Piece[] = [];
  for (const [y0, angles, R, r, len] of [[90, [30, 90, 150], 14, 4.5, 60], [98, [0, 60, 120, 180], 25, 3.6, 44]] as const) {
    const tank = insulatedTank(r, len);
    for (const d of angles) {
      const a = deg(d);
      out.push(...place(tank, { at: [R * Math.sin(a), y0, R * Math.cos(a)] }));
      for (const f of [0.1, 0.5, 0.9]) out.push(...ibeam("hull-grey", [6.6 * Math.sin(a), y0 + len * f, 6.6 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
    }
  }
  return out;
}
const stack = (ids: readonly string[], y0: number): Piece[] => {
  const out: Piece[] = [];
  let y = y0;
  for (const id of ids) {
    out.push(...mod(id, y));
    y += KIT[id].length;
  }
  return out;
};
const JOINTS: readonly (readonly [number, number, number])[] = [[50, 7, 7], [78, 7, 7], [112, 6.4, 6.4], [160, 6.4, 6.4], [208, 6.4, 8], [244, 6.4, 8], [276, 9.4, 8], [298, 9.4, 8]];

interface Group {
  id: string;
  name: string;
  kind: PartKind;
  y0: number;
  height: number;
  diameter: number;
  note: string;
  build: (level?: "coarse" | "fine") => Piece[];
}

const SHIP: Record<"a" | "b", Group[]> = {
  a: [
    { id: "drive", name: "Drive of coil rings", kind: "engine", y0: 0, height: 74, diameter: 24, note: "Twelve field coils flaring out of a reactor chamber, the field is the nozzle: no bell.", build: () => inlineDrive(0, 11) },
    { id: "shaft", name: "Truss shaft", kind: "module", y0: 74, height: 192, diameter: 14, note: "An open truss of L-class segments with the cable runs along it.", build: () => truss(74, 188) },
    { id: "tanks", name: "Tank bouquet", kind: "tank", y0: 90, height: 60, diameter: 58, note: "Seven framed tanks in insulation blankets on the outer side, each with a valve cluster at its feed end.", build: tanks },
    { id: "bay", name: "Payload bay and crew port", kind: "module", y0: 240, height: 62, diameter: 40, note: "A Shuttle-style bay of sectioned doors with radiators, latch gangs and drive units, an M dock inside, and an S-class crew-vehicle arm.", build: () => [...bay(262, 100), ...crewPort(240)] },
    { id: "elevator", name: "Glass elevator", kind: "module", y0: 150, height: 150, diameter: 6, note: "A lit glass tube on the outer side of the shaft with cars at six stops.", build: () => elevator(150, 300) },
    { id: "bow", name: "Bow and docking snout", kind: "module", y0: 305, height: 36, diameter: 16, note: "An armoured prow with a lit window band and thruster quads, ending in an L collar and probe for the station's housing.", build: () => bowLong(305) },
    { id: "joints", name: "Latch frames, hook half", kind: "module", y0: 40, height: 270, diameter: 20, note: "Eight load-bearing frames: clamp hoops, box girders, a face plate with shear pins, a hooked latch and an umbilical tower.", build: () => JOINTS.flatMap(([y, wa]) => latchHalf(y, wa, -SHAFT_X, true)) },
  ],
  b: [
    { id: "drive", name: "Drive of coil rings", kind: "engine", y0: 0, height: 74, diameter: 24, note: "Twelve field coils flaring out of a reactor chamber, the field is the nozzle: no bell.", build: () => inlineDrive(0, 11) },
    { id: "shaft", name: "Truss shaft", kind: "module", y0: 74, height: 144, diameter: 14, note: "An open truss of L-class segments.", build: () => truss(74, 144) },
    { id: "tanks", name: "Tank bouquet", kind: "tank", y0: 90, height: 60, diameter: 58, note: "Seven framed tanks in insulation blankets on the outer side.", build: tanks },
    { id: "crew", name: "Crew space and laboratory", kind: "module", y0: 212, height: 95, diameter: 20, note: "Two habitat drums, a common area, a laboratory, a navigation deck and a comms array on an adapter, and an S-class crew-vehicle arm.", build: () => [...stack(["adapter-l-m", "habitat-drum-crew", "common-area-m", "habitat-drum-crew", "lab-m", "deck-nav-m", "comms-array-m"], 218), ...crewPort(212)] },
    { id: "bow", name: "Bow and docking snout", kind: "module", y0: 305, height: 36, diameter: 16, note: "A rounded bridge with a glazed canopy, a sensor chin and two folded arms, ending in an L collar and probe.", build: () => bowRunner(305) },
    { id: "joints", name: "Latch frames, keeper half", kind: "module", y0: 40, height: 270, diameter: 20, note: "The other halves of the eight frames: keeper lugs, sockets and umbilical towers.", build: () => JOINTS.flatMap(([y, , wb]) => latchHalf(y, wb, -SHAFT_X, false)) },
  ],
};

/** Every part of the ships and the station, each once: the ships joined and apart, the station's quarters whole and cut open, the wings stowed and deployed. */
export function parts(): KyotoriPart[] {
  const out: KyotoriPart[] = [];
  for (const s of ["a", "b"] as const) for (const apart of [false, true]) for (const g of SHIP[s]) {
    const x = (s === "a" ? 1 : -1) * (SHAFT_X + (apart ? APART.x : 0));
    const dy = apart ? APART.y : 0;
    out.push({
      id: `${s}-${g.id}${apart ? "-apart" : ""}`,
      name: `Ship ${s.toUpperCase()}: ${g.name}${apart ? ", apart" : ""}`,
      kind: g.kind,
      y0: g.y0 + dy,
      place: { x, z: 0 },
      height: g.height,
      diameter: g.diameter,
      note: g.note,
      pieces: (o) => {
        const raw = g.build(o?.level);
        const turned = s === "b" ? place(raw, { at: [0, 0, 0], yaw: 180 }) : raw;
        return local(turned, 0, g.y0, 0, o?.level);
      },
    });
  }
  out.push(
    { id: "c-core", name: "Station core: hub, arms, rim, stem and mirror", kind: "module", y0: 340, height: 112, diameter: 128, note: "A hub with airlocks, lift houses and ports; four arms; the slim rim; the stem; and the figured mirror with its backplane and sunshield.", place: { x: 0, z: 0 }, pieces: (o) => local(stationCore(), 0, 340, 0, o?.level) },
    { id: "c-housing", name: "Station housing", kind: "module", y0: 328, height: 24, diameter: 60, note: "Two docking bays for the ships: L collars, twelve capture latches and four umbilical plates each, guide petals, approach lamps and floodlights.", place: { x: 0, z: 0 }, pieces: (o) => local(housing(335, SHAFT_X), 0, 328, 0, o?.level) },
    ...(["stowed", "deployed"] as const).map((state): KyotoriPart => ({ id: `c-wings-${state}`, name: `Solar wings, ${state}`, kind: "module", y0: 369, height: state === "deployed" ? 48 : 20, diameter: 60, note: `Four wings on diagonal masts in the ISS manner, ${state}; the blankets are one group for the Motion choice.`, place: { x: 0, z: 0 }, pieces: (o) => local(wings(state), 0, 369, 0, o?.level) })),
  );
  STATION.kinds.forEach((kind, k) => {
    for (const cut of [false, true]) out.push({ id: `c-quarter-${kind}${cut ? "-cut" : ""}`, name: `${kind[0].toUpperCase()}${kind.slice(1)} quarter${cut ? ", cut open" : ""}`, kind: "module", y0: 340, height: 60, diameter: 80, note: `A tower of eight decks of furnished rooms on its arm, with a docking stub for large ships (H collar on a despun ring)${cut ? "; cut open to show the rooms" : ""}.`, place: { x: 0, z: 0 }, pieces: (o) => local(quarterPart(k, { cut, furnish: o?.level !== "coarse" }), 0, 340, 0, o?.level) });
  });
  return out;
}
