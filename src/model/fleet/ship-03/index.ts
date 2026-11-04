// Waymark's parts: each module of the ship as a row of the table below, with where it stands, its joints and how to build its pieces at a level of detail. Every builder works in ship metres (X across the beam, Y from the
// tail, Z dorsal); `local` moves a part's pieces so its origin is the middle of its base on the spine, as every part of the package has it. The registry and the data read this table and nothing else. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { type Piece, place } from "./adapter.ts";
import { bow } from "./bow.ts";
import { command } from "./command.ts";
import { HANGAR, RADIATOR, STATION } from "./dims.ts";
import { driveFrame } from "./drive.ts";
import { engineering } from "./engineering.ts";
import { hangar } from "./hangar.ts";
import { habitat } from "./habitat.ts";
import { pod, type PodKind } from "./pod.ts";
import { radiators } from "./radiators.ts";
import { fuelSection } from "./tanks.ts";

/** How much small detail to build, 0.25 to 1: coarse first, fine as the viewer comes near. */
export const LEVELS = [0.25, 0.6, 1] as const;

export interface BuildOptions {
  detail?: number;
}

export interface WaymarkPart {
  /** The slot, and the id after `fleet-ship-03-`. */
  id: string;
  name: string;
  kind: PartKind;
  /** Where it stands in the ship: its base on the spine (y), and across (x) and up (z) for a part that is placed, not stacked. */
  y0: number;
  place?: { x: number; z: number };
  /** The size as built, metres: along the spine, and the widest across. */
  height: number;
  diameter: number;
  /** Stacked parts mate at the spine collars (a 12 m class L collar). */
  top?: boolean;
  bottom?: boolean;
  /** What it is, in a line. */
  note: string;
  /** The pieces, in the part's own metres. */
  pieces: (options?: BuildOptions) => Piece[];
}

const local = (pieces: Piece[], x: number, y: number, z: number): Piece[] => place(pieces, { at: [-x, -y, -z] });
const COLLAR_L = 12;

const stack = (id: string, name: string, kind: PartKind, [y0, y1]: readonly [number, number], width: number, depth: number, note: string, build: (cut: boolean, detail: number) => Piece[], cut: boolean, first = false, last = false): WaymarkPart => ({
  id: cut ? `${id}-cutaway` : id,
  name: cut ? `${name}, cutaway` : name,
  kind,
  y0,
  height: y1 - y0,
  diameter: Math.max(width, depth),
  ...(first ? {} : { bottom: true }),
  ...(last ? {} : { top: true }),
  note,
  pieces: (o) => local(build(cut, o?.detail ?? 1), 0, y0, 0),
});

const shoulder = (side: "starboard" | "port", cut: boolean): WaymarkPart => {
  const h = HANGAR[side];
  return {
    id: `hangar-${side}${cut ? "-cutaway" : ""}`,
    name: `${side === "starboard" ? "Starboard rescue hangar" : "Port survey hangar"}${cut ? ", cutaway" : ""}`,
    kind: "module",
    y0: h.y[0],
    place: { x: h.centre, z: 0 },
    height: h.y[1] - h.y[0],
    diameter: h.x[1] - h.x[0],
    note: side === "starboard" ? "The aft shoulder: a rescue bay with a gantry, racks, a pressure vestibule and a cutter, opening to starboard." : "The forward shoulder: a survey bay with drones on racks, an access bridge and emergency shutters, opening to port.",
    pieces: (o) => local(hangar(side, cut, o?.detail ?? 1), h.centre, h.y[0], 0),
  };
};

const missionPod = (kind: PodKind): WaymarkPart => ({
  id: `pod-${kind}`,
  name: kind === "relay" ? "Mission pod, relay" : "Mission pod, relief",
  kind: "module",
  y0: 174,
  place: { x: 0, z: 0 },
  height: 60,
  diameter: 28,
  note: kind === "relay" ? "A communications bay under a tower of dishes and phased arrays, on the keyed dorsal collar." : "Six relief and equipment containers under a gantry, on the keyed dorsal collar.",
  pieces: (o) => local(pod(kind, o?.detail ?? 1), 0, 174, 0),
});

const bank = (which: "dorsal" | "ventral", open: boolean): WaymarkPart => ({
  id: `radiators-${which}-${open ? "deployed" : "stowed"}`,
  name: `Radiator bank, ${which}, ${open ? "deployed" : "stowed"}`,
  kind: "module",
  y0: RADIATOR.y[0],
  place: { x: 0, z: 0 },
  height: RADIATOR.y[1] - RADIATOR.y[0],
  diameter: open ? 125 : 25,
  note: open ? "Four leaves of 25 by 60 m on a mast, clear of the hangar corridors and the exhaust." : "Four leaves folded into a box on the habitation hull's rails.",
  pieces: (o) => local(radiators(which, open, o?.detail ?? 1), 0, RADIATOR.y[0], 0),
});

/** The stacked modules, tail to bow, in their plain and their cut form. */
export const STACK = (cut: boolean): WaymarkPart[] => [
  stack("drive", "Main drive and thrust frame", "engine", STATION.drive, 90, 46, "Two flush fusion-triggered nozzles with throat rings, field coils and feed manifolds, a blast bulkhead and four plasma verniers.", driveFrame, cut, true),
  stack("engineering", "Engineering and isolators", "module", STATION.engineering, 28, 26, "Reactor chambers, a locked-out service corridor, two isolated auxiliary power units, the emergency battery room and the breakers.", engineering, cut),
  stack("fuel-aft", "Aft fuel section", "tank", STATION.fuelAft, 62, 44, "The spine and the aft pair of propellant barrels, with a header tank slung under it.", (c, d) => fuelSection("aft", c, d), cut),
  stack("fuel-fore", "Fore fuel section", "tank", STATION.fuelFore, 62, 66, "The spine and the fore pair of barrels, the keyed dorsal collar's base and the ventral keel with its dock.", (c, d) => fuelSection("fore", c, d), cut),
  stack("habitat", "Habitation and medical", "module", STATION.habitat, 26, 28, "Four decks across the beam: triage and quarantine, crew bunks, mess and hydroponics, water and air recycling.", habitat, cut),
  stack("command", "Armoured command citadel", "module", STATION.command, 42, 32, "An operations ring round a communications core, a navigation desk, a medical link and two escape passages, behind armour.", command, cut),
  stack("bow", "Bow defence and navigation", "module", STATION.bow, 36, 40, "Three staggered shield layers, ranging apertures, optical heads and two debris-intercept mounts.", bow, cut, false, true),
];

/** Every part of the ship, each once. */
export function parts(): WaymarkPart[] {
  const out: WaymarkPart[] = [...STACK(false), ...STACK(true)];
  for (const cut of [false, true]) out.push(shoulder("starboard", cut), shoulder("port", cut));
  out.push(missionPod("relay"), missionPod("relief"));
  for (const which of ["dorsal", "ventral"] as const) out.push(bank(which, false), bank(which, true));
  return out;
}

export { COLLAR_L };
