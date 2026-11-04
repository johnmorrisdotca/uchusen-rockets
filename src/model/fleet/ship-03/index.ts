// Miyamoto's parts: each module of the ship as a row of the table below, with where it stands, its joints and how to build its pieces at a level of detail. Every builder works in ship metres (X across the beam, Y from the
// tail, Z dorsal); `local` moves a part's pieces so its origin is the middle of its base on the spine, as every part of the package has it. The registry and the data read this table and nothing else. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { isCoarse, type Piece, place } from "./adapter.ts";
import { bowLivery, citadelLivery, driveLivery, habitatLivery, hangarLivery } from "./ariake.ts";
import { bow } from "./bow.ts";
import { command } from "./command.ts";
import { type BayId, BAYS, bayBox, RADIATOR, SHADOW_COLLAR, STATION } from "./dims.ts";
import { driveFrame, noCollar, shadowCollar } from "./drive.ts";
import { engineering } from "./engineering.ts";
import { ANCESTORS, SHIPS } from "./specs.ts";
import { BAY_OF, hangar } from "./hangar.ts";
import { habitat } from "./habitat.ts";
import { pod, type PodKind } from "./pod.ts";
import { radiators } from "./radiators.ts";
import { fuelSection } from "./tanks.ts";

/** How much small detail to build, 0.25 to 1: coarse first, fine as the viewer comes near. */
export const LEVELS = [0.25, 0.6, 1] as const;

export interface BuildOptions {
  detail?: number;
  /** `coarse`: only the pieces the kit's `isCoarse` keeps, for a first picture in a moment; `fine` (the default): all of them. */
  level?: "coarse" | "fine";
}

export interface MiyamotoPart {
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

const local = (pieces: Piece[], x: number, y: number, z: number, level?: "coarse" | "fine"): Piece[] => {
  const moved = place(pieces, { at: [-x, -y, -z] });
  return level === "coarse" ? moved.filter(isCoarse) : moved;
};
const COLLAR_L = 12;

const stack = (id: string, name: string, kind: PartKind, [y0, y1]: readonly [number, number], width: number, depth: number, note: string, build: (cut: boolean, detail: number) => Piece[], cut: boolean, first = false, last = false): MiyamotoPart => ({
  id: cut ? `${id}-cutaway` : id,
  name: cut ? `${name}, cutaway` : name,
  kind,
  y0,
  height: y1 - y0,
  diameter: Math.max(width, depth),
  ...(first ? {} : { bottom: true }),
  ...(last ? {} : { top: true }),
  note: note.includes("Descends from") ? note : `${note} Descends from ${ANCESTORS[id.replace("-ariake", "")]}.`,
  pieces: (o) => local(build(cut, o?.detail ?? 1), 0, y0, 0, o?.level),
});

const BAY_NOTE = { rescue: "a rescue bay with a gantry, racks, a pressure vestibule, a cradle with clamp arms for an ATC (Auxiliary Transfer Craft) rescue cutter and guide rails to the door", survey: "a survey bay with three cradles, an access bridge and emergency shutters" } as const;

/** One hangar box. Miyamoto has two (starboard aft, port fore); Ariake has all four, and her four carry her pinstripes. */
const shoulder = (bay: BayId, cut: boolean, ariake = false): MiyamotoPart => {
  const { side, kind } = BAYS[bay];
  const h = bayBox(bay);
  const stationed = bay !== BAY_OF[side];
  const id = `hangar-${stationed ? bay : side}${ariake ? "-ariake" : ""}${cut ? "-cutaway" : ""}`;
  const where = side === "starboard" ? "Starboard" : "Port";
  const fore = h.y[0] > 200 ? "fore" : "aft";
  return {
    id,
    name: `${stationed ? `${where} ${fore}` : where} ${kind} hangar${ariake ? ", Ariake" : ""}${cut ? ", cutaway" : ""}`,
    kind: "module",
    y0: h.y[0],
    place: { x: h.centre, z: 0 },
    height: h.y[1] - h.y[0],
    diameter: h.x[1] - h.x[0],
    note: `The ${fore} shoulder on the ${side} side: ${BAY_NOTE[kind]}, opening to ${side}. Descends from ${ANCESTORS[`hangar-${side}`]}.`,
    pieces: (o) => local([...hangar(ariake || stationed ? bay : side, cut, o?.detail ?? 1, ariake ? `hangar-${stationed ? bay : side}-ariake` : stationed ? `hangar-${bay}` : undefined), ...(ariake ? hangarLivery(bay) : [])], h.centre, h.y[0], 0, o?.level),
  };
};

const missionPod = (kind: PodKind): MiyamotoPart => ({
  id: `pod-${kind}`,
  name: kind === "relay" ? "Mission pod, relay" : kind === "relief" ? "Mission pod, relief" : "Mission pod, survey",
  kind: "module",
  y0: 174,
  place: { x: 0, z: 0 },
  height: 60,
  diameter: 28,
  note: `${kind === "relay" ? "A communications bay under a tower of dishes and phased arrays, on the keyed dorsal collar." : kind === "relief" ? "Six relief and equipment containers under a gantry, on the keyed dorsal collar." : "A survey bay on the keyed dorsal collar: a telescope in a yoke, a rack of six probes, a radar dish, a lidar drum, a magnetometer boom and two instrument containers."} Descends from ${ANCESTORS.pod}.`,
  pieces: (o) => local(pod(kind, o?.detail ?? 1), 0, 174, 0, o?.level),
});

const bank = (which: "dorsal" | "ventral", open: boolean): MiyamotoPart => ({
  id: `radiators-${which}-${open ? "deployed" : "stowed"}`,
  name: `Radiator bank, ${which}, ${open ? "deployed" : "stowed"}`,
  kind: "module",
  y0: RADIATOR.y[0],
  place: { x: 0, z: 0 },
  height: RADIATOR.y[1] - RADIATOR.y[0],
  diameter: open ? 125 : 25,
  note: `${open ? "Four leaves of 25 by 60 m on a mast, clear of the hangar corridors and the exhaust." : "Four leaves folded into a box on the habitation hull's rails."} Descends from ${ANCESTORS.radiators}.`,
  pieces: (o) => local(radiators(which, open, o?.detail ?? 1), 0, RADIATOR.y[0], 0, o?.level),
});

/** The stacked modules, tail to bow, in their plain and their cut form. */
export const STACK = (cut: boolean): MiyamotoPart[] => [
  stack("drive", "Main drive and thrust frame", "engine", STATION.drive, 90, 46, "Two flush fusion-triggered nozzles with throat rings, field coils and feed manifolds, a blast bulkhead and four plasma verniers.", driveFrame, cut, true),
  stack("engineering", "Engineering and isolators", "module", STATION.engineering, 28, 26, "Reactor chambers, a locked-out service corridor, two isolated auxiliary power units, the emergency battery room and the breakers.", engineering, cut),
  stack("fuel-aft", "Aft fuel section", "tank", STATION.fuelAft, 62, 44, "The spine and the aft pair of propellant barrels, with a header tank slung under it.", (c, d) => fuelSection("aft", c, d), cut),
  stack("fuel-fore", "Fore fuel section", "tank", STATION.fuelFore, 62, 66, "The spine and the fore pair of barrels, the keyed dorsal collar's base and the ventral keel with its dock.", (c, d) => fuelSection("fore", c, d), cut),
  stack("habitat", "Habitation and medical", "module", STATION.habitat, 26, 28, "Four decks across the beam: triage and quarantine, crew bunks, mess and hydroponics, water and air recycling.", habitat, cut),
  stack("command", "Armoured command citadel", "module", STATION.command, 42, 32, "An operations ring round a communications core, a navigation desk, a medical link and two escape passages, behind armour.", command, cut),
  stack("bow", "Bow defence and navigation", "module", STATION.bow, 36, 40, "Three staggered shield layers, ranging apertures, optical heads and two debris-intercept mounts.", bow, cut, false, true),
];

/** The shadow-shield collar, or none: two parts for one slot, so the viewer can swap them. Ariake's is clad in near-black hexagonal tiles in place of the white and gold bands. */
const collarPart = (kind: "plain" | "none" | "ariake"): MiyamotoPart => ({
  id: kind === "none" ? "collar-none" : kind === "ariake" ? "shield-collar-ariake" : "shield-collar",
  name: kind === "none" ? "Drive collar, none (bare neck)" : kind === "ariake" ? "Shadow-shield collar, Ariake" : "Shadow-shield collar",
  kind: "module",
  y0: SHADOW_COLLAR.y,
  place: { x: 0, z: 0 },
  height: kind === "none" ? 1 : SHADOW_COLLAR.length,
  diameter: kind === "none" ? 24 : SHADOW_COLLAR.r * 2,
  note: kind === "none" ? `The drive's neck meets the hull at a plain flange ring, as the neck of a bare engine section does in ${ANCESTORS.collar}. Descends from ${ANCESTORS.collar}.` : kind === "ariake" ? `A round cone clad in rows of raised near-black hexagonal tiles, with the orange removable panels left as on Miyamoto's. Descends from ${ANCESTORS.collar}.` : `A round ceramic-tile cone that steps from the engines to the hull. Descends from ${ANCESTORS.collar}.`,
  pieces: (o) => (kind === "none" ? noCollar() : local(shadowCollar(false, o?.detail ?? 1, kind === "ariake" ? "shield-collar-ariake" : undefined, kind === "ariake"), 0, SHADOW_COLLAR.y, 0, o?.level)),
});

/** The parts that differ for the sister ship: the drive and the bow carry its registry marks and its dawn-gold pinstripes, the habitation drum and the hangars its pinstripes (and the drum a warm interior), the citadel its refit. */
const sister = (): MiyamotoPart[] => [
  stack("drive-ariake", "Main drive and shrouds, Ariake", "engine", STATION.drive, 90, 46, `The sister ship's drive: the shrouds clad in rows of raised near-black hexagonal tiles in place of Miyamoto's white and gold bands, with the nozzle lips and the service windows left bare, and a pair of dawn-gold pinstripes on the neck. Descends from ${ANCESTORS.drive}.`, (c, d) => [...driveFrame(c, d, "drive-ariake", true), ...driveLivery()], false, true),
  stack("drive-ariake", "Main drive and shrouds, Ariake", "engine", STATION.drive, 90, 46, `The sister ship's drive: the shrouds clad in rows of raised near-black hexagonal tiles in place of Miyamoto's white and gold bands, with the nozzle lips and the service windows left bare, and a pair of dawn-gold pinstripes on the neck. Descends from ${ANCESTORS.drive}.`, (c, d) => [...driveFrame(c, d, "drive-ariake", true), ...driveLivery()], true, true),
  stack("habitat-ariake", "Habitation and medical, Ariake", "module", STATION.habitat, 26, 28, "The sister ship's habitation drum: two dawn-gold bands with their pinstripes, and rooms in warm wood and dawn-gold in place of blue.", (c, d) => [...habitat(c, d, "habitat-ariake", "dawn"), ...habitatLivery(false)], false),
  stack("habitat-ariake", "Habitation and medical, Ariake", "module", STATION.habitat, 26, 28, "The sister ship's habitation drum: two dawn-gold bands with their pinstripes, and rooms in warm wood and dawn-gold in place of blue.", (c, d) => [...habitat(c, d, "habitat-ariake", "dawn"), ...habitatLivery(true)], true),
  stack("command-ariake", "Armoured command citadel, Ariake", "module", STATION.command, 42, 32, "The sister ship's citadel after its refit: a lattice sensor mast aft of the dome, a solarium on each side of it, and dawn-gold pinstripes and bands.", (c, d) => [...command(c, d, "command-ariake", true), ...citadelLivery()], false),
  stack("bow-ariake", "Bow defence and navigation, Ariake", "module", STATION.bow, 36, 40, `The sister ship's bow, with its hull marks 186 and a dawn-gold pinstripe on each shield layer. Descends from ${ANCESTORS.bow}.`, (c, d) => [...bow(c, d, "bow-ariake", SHIPS.ariake.marks), ...bowLivery()], false, false, true),
  shoulder("starboard-aft", false, true),
  shoulder("port-fore", false, true),
  shoulder("starboard-fore", false, true),
  shoulder("port-aft", false, true),
];

/** Every part of the ship, each once. */
export function parts(): MiyamotoPart[] {
  const out: MiyamotoPart[] = [...STACK(false), ...STACK(true)];
  for (const cut of [false, true]) out.push(shoulder("starboard-aft", cut), shoulder("port-fore", cut));
  out.push(...sister(), collarPart("plain"), collarPart("none"), collarPart("ariake"), missionPod("relay"), missionPod("relief"), missionPod("survey"));
  for (const which of ["dorsal", "ventral"] as const) out.push(bank(which, false), bank(which, true));
  return out;
}

export { COLLAR_L };
