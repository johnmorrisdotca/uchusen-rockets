// Kyotori V2's parts: each piece of the ships and the station as a row of the table below, with where it stands (joined, or the ships apart), its size and how to build its pieces at a level of detail. Every builder works in station metres (X across,
// Y from the tail up the axis, Z up); `local` moves a part's pieces so that its origin is its own base. Ship B is built in its own frame and turned half way about its axis so its outer side is -X. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { isCoarse, place, type Piece } from "./adapter.ts";
import { bay, bowLong, bowRunner, latchHalf } from "./hardware.ts";
import { crewPort, elevator, inlineDrive, mod, truss } from "./parts.ts";
import { CLUSTER_SLOTS, SHAFT_X } from "./cluster.ts";
import { housing, quarterPart, STATION, STUB_FACE, stationCore, wings, type WingState } from "./station.ts";
import { dockedCraft } from "../docked.ts";
import { dockedNow } from "../dockedState.ts";
import { dragonPieces, starshipPieces } from "./visitors.ts";
import { rolePieces, type Role } from "./roles.ts";
import { insulatedTank } from "./hardware.ts";
import { lampHalo } from "../lights.ts";
import { KIT, ibeam } from "./adapter.ts";
import { TOWER } from "./quarters.ts";

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

/** One ship of the four: its letter, which of the two kinds it is, its corner of the cluster, its turn about its own axis (so its seam faces its neighbour and its outer side faces out) and the wedge of angles its tank bouquet stands in. */
export interface ShipSpec {
  id: "a" | "b" | "c" | "d";
  type: "long" | "runner";
  slot: (typeof CLUSTER_SLOTS)[number];
  yaw: number;
  wedge: readonly [number, number];
  /** The turn of the joint frames that face the ship's neighbour across Z, and whether this ship carries the hooks there. */
  zturn: number;
  zhooks: boolean;
  /** What this ship of the class is for. */
  role: Role;
}
export const SHIPS: readonly ShipSpec[] = [
  { id: "a", type: "long", slot: CLUSTER_SLOTS[0], yaw: 0, wedge: [90, 180], zturn: 90, zhooks: true, role: "survey" },
  { id: "b", type: "runner", slot: CLUSTER_SLOTS[1], yaw: 180, wedge: [0, 90], zturn: 270, zhooks: true, role: "laboratory" },
  { id: "c", type: "long", slot: CLUSTER_SLOTS[2], yaw: 0, wedge: [0, 90], zturn: 270, zhooks: false, role: "astronomy" },
  { id: "d", type: "runner", slot: CLUSTER_SLOTS[3], yaw: 180, wedge: [90, 180], zturn: 90, zhooks: false, role: "crew" },
];

/** The tank bouquet: seven framed tanks in blankets in a quarter of the circle (the ship's outer faces only), so four ships fit side by side. */
function tanks(wedge: readonly [number, number]): Piece[] {
  const out: Piece[] = [];
  const [w0, w1] = wedge;
  const rings: [number, number[], number, number, number][] = [[90, [w0 + 15, w0 + 45, w0 + 75], 14, 4.5, 60], [98, [w0, w0 + 30, w0 + 60, w1], 25, 3.6, 44]];
  for (const [y0, angles, R, r, len] of rings) {
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
  build: (ship: ShipSpec) => Piece[];
}

const DRIVE_G: Group = { id: "drive", name: "Drive of coil rings", kind: "engine", y0: 0, height: 74, diameter: 24, note: "Twelve field coils flaring out of a reactor chamber, the field is the nozzle: no bell. Its exhaust is a narrow beam straight aft that the coils can steer three degrees outward, so four ships stand side by side and none fires into another.", build: () => [...inlineDrive(0, 11), ...lampHalo("nav-white", [0, 18, 0]), ...lampHalo("beacon", [0, 44, 0]), ...lampHalo("strobe", [0, 30, 6])] };
const TANKS_G: Group = { id: "tanks", name: "Tank bouquet", kind: "tank", y0: 90, height: 60, diameter: 58, note: "Seven framed tanks in insulation blankets, each with a valve cluster at its feed end, standing on the ship's outer faces only (a quarter of the circle) so that four ships fit together.", build: (sh) => tanks(sh.wedge) };
const JOINTS_G = (hooks: boolean): Group => ({ id: "joints", name: `Latch frames, ${hooks ? "hook" : "keeper"} half`, kind: "module", y0: 40, height: 270, diameter: 20, note: `Eight load-bearing frames on the seam to the neighbour across X: clamp hoops, box girders, a face plate with shear pins, ${hooks ? "a hooked latch and an umbilical tower" : "keeper lugs, sockets and an umbilical tower"}.`, build: (sh) => JOINTS.flatMap(([y, wa, wb]) => latchHalf(y, sh.type === "long" ? wa : wb, -SHAFT_X, hooks)) });
const ROLE_NOTE: Record<Role, [string, string]> = {
  survey: ["Sensor booms", "Two lattice booms 34 m out from the shaft, each ending in a lidar drum, a radar panel, a camera cluster and a star tracker: the survey and mapping ship's instruments."],
  laboratory: ["Sample labs and clean room", "Two laboratory modules and a refrigerated sample store on struts, a clean room with its airlock and a rack of sample cases: the laboratory ship's compartments."],
  astronomy: ["Second telescope", "A second telescope on its own lattice mast, a seven-segment mirror with a sun shield: the astronomy ship's instrument."],
  crew: ["Extra quarters and sick bay", "Two more habitat drums, a common area and a medical pod with a red-cross panel on struts: the crew and medical ship's compartments."],
};
const ROLE_G = (role: Role): Group => ({ id: "role", name: ROLE_NOTE[role][0], kind: "module", y0: 120, height: 130, diameter: 60, note: ROLE_NOTE[role][1], build: () => rolePieces(role) });

const SHIP_GROUPS: Record<"long" | "runner", Group[]> = {
  long: [
    DRIVE_G,
    { id: "shaft", name: "Truss shaft", kind: "module", y0: 74, height: 192, diameter: 14, note: "An open truss of L-class segments with the cable runs along it.", build: () => truss(74, 188) },
    TANKS_G,
    { id: "bay", name: "Payload bay and crew port", kind: "module", y0: 240, height: 62, diameter: 40, note: "A Shuttle-style bay of sectioned doors with radiators, latch gangs and drive units, an M dock inside, and an S-class crew-vehicle arm.", build: () => [...bay(262, 100), ...crewPort(240)] },
    { id: "elevator", name: "Glass elevator", kind: "module", y0: 150, height: 150, diameter: 6, note: "A lit glass tube on the shaft with cars at six stops.", build: () => elevator(150, 300) },
    { id: "bow", name: "Bow and docking snout", kind: "module", y0: 305, height: 36, diameter: 16, note: "An armoured prow with a lit window band and thruster quads, ending in an L collar and probe for the station's housing.", build: () => bowLong(305) },
  ],
  runner: [
    DRIVE_G,
    { id: "shaft", name: "Truss shaft", kind: "module", y0: 74, height: 144, diameter: 14, note: "An open truss of L-class segments.", build: () => truss(74, 144) },
    TANKS_G,
    { id: "crew", name: "Crew space and laboratory", kind: "module", y0: 212, height: 95, diameter: 20, note: "Two habitat drums, a common area, a laboratory, a navigation deck and a comms array on an adapter, and an S-class crew-vehicle arm.", build: () => [...stack(["adapter-l-m", "habitat-drum-crew", "common-area-m", "habitat-drum-crew", "lab-m", "deck-nav-m", "comms-array-m"], 218), ...crewPort(212)] },
    { id: "bow", name: "Bow and docking snout", kind: "module", y0: 305, height: 36, diameter: 16, note: "A rounded bridge with a glazed canopy, a sensor chin and two folded arms, ending in an L collar and probe.", build: () => bowRunner(305) },
  ],
};

/** Every part of the ships and the station, each once: the four ships (the first two also apart), the station's quarters whole and cut open, the wings in three states, the visitors. */
export function parts(): KyotoriPart[] {
  const out: KyotoriPart[] = [];
  for (const sh of SHIPS) for (const apart of sh.id === "a" || sh.id === "b" ? [false, true] : [false]) {
    const groups = [...SHIP_GROUPS[sh.type], ROLE_G(sh.role), JOINTS_G(sh.id === "a" || sh.id === "c")];
    for (const g of groups) {
      const dx = apart ? (sh.slot[0] > 0 ? APART.x : -APART.x) : 0;
      out.push({
        id: `${sh.id}-${g.id}${apart ? "-apart" : ""}`,
        name: `Ship ${sh.id.toUpperCase()}: ${g.name}${apart ? ", apart" : ""}`,
        kind: g.kind,
        y0: g.y0 + (apart ? APART.y : 0),
        place: { x: sh.slot[0] * SHAFT_X + dx, z: sh.slot[1] * SHAFT_X },
        height: g.height,
        diameter: g.diameter,
        note: g.note,
        pieces: (o) => {
          const raw = g.build(sh);
          const turned = sh.yaw ? place(raw, { at: [0, 0, 0], yaw: sh.yaw }) : raw;
          return local(turned, 0, g.y0, 0, o?.level);
        },
      });
    }
    if (!apart) out.push({
      id: `${sh.id}-jz`,
      name: `Ship ${sh.id.toUpperCase()}: latch frames across Z, ${sh.zhooks ? "hook" : "keeper"} half`,
      kind: "module",
      y0: 40,
      place: { x: sh.slot[0] * SHAFT_X, z: sh.slot[1] * SHAFT_X },
      height: 270,
      diameter: 20,
      note: `The same eight frames on the seam to the neighbour across Z, for the cluster of four ships.`,
      pieces: (o) => local(place(JOINTS.flatMap(([y, wa, wb]) => latchHalf(y, sh.type === "long" ? wa : wb, -SHAFT_X, sh.zhooks)), { at: [0, 0, 0], yaw: sh.zturn }), 0, 40, 0, o?.level),
    });
  }
  // the class variants: a ship alone, on the axis, built from parts the four share (k-drive, k-tanks, the two hulls, the bay, the lift, the bows, the crew space) and one role group of its own
  const alone: ShipSpec = { id: "a", type: "long", slot: [1, -1], yaw: 0, wedge: [90, 180], zturn: 90, zhooks: true, role: "survey" };
  const kinds: [string, Group, "long" | "runner"][] = [["k-drive", DRIVE_G, "long"], ["k-tanks", TANKS_G, "long"], ...SHIP_GROUPS.long.filter((g) => !["drive", "tanks"].includes(g.id)).map((g): [string, Group, "long" | "runner"] => [`k-${g.id}-long`, g, "long"]), ...SHIP_GROUPS.runner.filter((g) => !["drive", "tanks"].includes(g.id)).map((g): [string, Group, "long" | "runner"] => [`k-${g.id}-runner`, g, "runner"])];
  const seen = new Set<string>();
  for (const [id, g, type] of kinds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: `Class part: ${g.name}`, kind: g.kind, y0: g.y0, place: { x: 0, z: 0 }, height: g.height, diameter: g.diameter, note: g.note, pieces: (o) => local(g.build({ ...alone, type }), 0, g.y0, 0, o?.level) });
  }
  for (const role of ["survey", "laboratory", "astronomy", "crew"] as const) out.push({ id: `k-role-${role}`, name: `Class part: ${ROLE_NOTE[role][0]}`, kind: "module", y0: 120, place: { x: 0, z: 0 }, height: 130, diameter: 60, note: ROLE_NOTE[role][1], pieces: (o) => local(rolePieces(role), 0, 120, 0, o?.level) });
  out.push(
    { id: "s-core", name: "Station core: hub, arms, rim, stem and mirror", kind: "module", y0: 340, height: 112, diameter: 128, note: "A hub with airlocks, lift houses and ports; four arms; the slim rim; the stem; and the figured mirror with its backplane and sunshield.", place: { x: 0, z: 0 }, pieces: (o) => local(stationCore(), 0, 340, 0, o?.level) },
    { id: "s-housing", name: "Station housing", kind: "module", y0: 328, height: 24, diameter: 60, note: "Four docking bays for the ships (a 2x2 cluster, or two ships and two empty bays): L collars, twelve capture latches and four umbilical plates each, guide petals, approach lamps and floodlights.", place: { x: 0, z: 0 }, pieces: (o) => local(housing(335, SHAFT_X), 0, 328, 0, o?.level) },
    ...(["stowed", "flared", "full"] as const).map((state: WingState): KyotoriPart => ({ id: `s-wings-${state}`, name: `Solar wings, ${state}`, kind: "module", y0: 369, height: state === "full" ? 70 : 40, diameter: 60, note: `Four wings on diagonal masts in the ISS manner, ${state === "stowed" ? "folded in canisters" : state === "flared" ? "swung out with half the blanket let out" : "the mast extended and the blanket unfolded to double length"}; the blankets are one group for the Motion choice.`, place: { x: 0, z: 0 }, pieces: (o) => local(wings(state), 0, 369, 0, o?.level) })),
    { id: "s-visitors", name: "Visiting craft at the quarters' docks", kind: "module", y0: STUB_FACE - 60, height: 70, diameter: 140, note: "A Crew Dragon at the control quarter's dock (through an adapter from the H collar to its own port) and a Starship upper stage at the observatory quarter's, at true scale, as photographs show Dragon on the ISS. A docked choice replaces that pair.", place: { x: 0, z: 0 }, pieces: (o) => local(dockedNow.spec === null ? [...dragonPieces(0), ...starshipPieces(2)] : dockedCraft("fleet-kyotori"), 0, STUB_FACE - 60, 0, o?.level) },
  );
  STATION.kinds.forEach((kind, k) => {
    for (const cut of [false, true]) out.push({ id: `s-quarter-${kind}${cut ? "-cut" : ""}`, name: `${kind[0].toUpperCase()}${kind.slice(1)} quarter${cut ? ", cut open" : ""}`, kind: "module", y0: 340, height: 60, diameter: 80, note: `A tower of eight decks of furnished rooms on its arm, with a docking stub for large ships (H collar on a despun ring, facing aft as the ISS nodes' zenith and nadir ports do)${cut ? "; cut open to show the rooms" : ""}.`, place: { x: 0, z: 0 }, pieces: (o) => local(quarterPart(k, { cut, furnish: o?.level !== "coarse" }), 0, 340, 0, o?.level) });
  });
  void TOWER;
  return out;
}
