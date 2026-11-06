// Hanabusa's parts: each module of the ship as a row of the table below, with where it stands, its joints and how to build its pieces at a level of detail. The spine's modules stack on the keel's collars; the booms, hubs, rings and wheel are
// placed. Every builder works in ship metres (X across, Y from the tail, Z dorsal); `local` moves a part's pieces so its origin is the middle of its base on the spine, or its own place, as every part of the package has it. Pure: no three.js and no DOM.
import type { PartKind } from "../../../parts.ts";
import { COLLARS, isCoarse, place, type Piece } from "./adapter.ts";
import { moving } from "../motion.ts";
import { dockedCraft } from "../docked.ts";
import { DOCK, dockingPieces } from "./docking.ts";
import { boomPieces, hubPieces, SPINE, SPINE_Y } from "./hull.ts";
import { industrialWheel } from "./wheelparts.ts";
import { type Order, ringPieces, rings, sectionPieces } from "./rings.ts";
import { ANCESTORS } from "./specs.ts";
import { SPIN } from "./spin.ts";
import { lampHalo } from "../lights.ts";

/** How much small detail to build, 0.25 to 1: coarse first, fine as the viewer comes near. */
export const LEVELS = [0.25, 0.6, 1] as const;

export interface BuildOptions {
  detail?: number;
  /** `coarse`: only the pieces the kit's `isCoarse` keeps, for a first picture in a moment; `fine` (the default): all of them. */
  level?: "coarse" | "fine";
}

export interface HanabusaPart {
  /** The slot, and the id after `fleet-ship-01-`. */
  id: string;
  name: string;
  kind: PartKind;
  /** Where it stands: its base on the spine (y), and across (x) and up (z) for a part that is placed, not stacked. */
  y0: number;
  place?: { x: number; z: number };
  /** The size as built, metres: along the spine, and the widest across. */
  height: number;
  diameter: number;
  /** The collar classes at its ends when it stacks on the spine. */
  top?: string;
  bottom?: string;
  note: string;
  pieces: (options?: BuildOptions) => Piece[];
}

/** A drawing stays under 80 KB for the whole ship: of a module's drawing pieces only its body outline stays in the drawing, and everything else is for the mesh. */
const thin = (pieces: Piece[]): Piece[] => pieces.map((piece) => (piece.kind === "lathe" && !piece.body && piece.only !== "mesh" ? { ...piece, only: "mesh" as const } : piece.kind === "lathe" && piece.body ? { ...piece, welds: undefined, rings: piece.rings ? piece.rings.filter((_, i) => i % 3 === 0) : undefined } : piece.kind === "lines" ? { ...piece, only: "mesh" as never } : piece));

const local = (pieces: Piece[], x: number, y: number, z: number, level?: "coarse" | "fine"): Piece[] => {
  const moved = place(pieces, { at: [-x, -y, -z] });
  return level === "coarse" ? moved.filter(isCoarse) : moved;
};

const KIND: Readonly<Record<string, PartKind>> = { engine: "engine", tank: "tank", habitat: "module", lab: "module", sensor: "module", reactor: "module", node: "module", adapter: "adapter" };
const ANCESTOR_OF = (id: string): string => (id === "drive" ? ANCESTORS.drive : id === "reactor" ? ANCESTORS.reactor : id.startsWith("tank") ? ANCESTORS.tanks : id === "node" ? ANCESTORS.node : id === "dome" || id === "nav-deck" ? ANCESTORS.dome : ANCESTORS.drums);

/** The spine's parts, tail to bow. */
const spine = (): HanabusaPart[] =>
  SPINE.map((one, i) => ({
    id: one.id,
    name: one.name,
    kind: KIND[one.module.kind] ?? "module",
    y0: SPINE_Y[one.id],
    height: one.module.length,
    diameter: Math.max(one.module.width, one.module.depth),
    ...(one.module.top ? { top: one.module.top } : {}),
    ...(one.module.bottom ? { bottom: one.module.bottom } : {}),
    note: `${one.module.note || one.name} Descends from ${ANCESTOR_OF(one.id)}.`,
    pieces: (o) => {
      const detail = (o?.detail ?? 0.45) * (one.module.length >= 30 ? 0.8 : 1);
      const made = one.module.pieces({ seed: `h${i}`, detail, ...(o?.level ? { level: o.level } : {}) });
      return thin(o?.level === "coarse" ? made.filter(isCoarse) : made);
    },
  }));

const boom = (sx: number): HanabusaPart => ({
  id: sx < 0 ? "boom-port" : "boom-starboard",
  name: sx < 0 ? "Port propellant boom" : "Starboard propellant boom",
  kind: "module",
  y0: 100,
  place: { x: sx * SPIN.boomX, z: 0 },
  height: 17 * 24,
  diameter: 12,
  note: `${sx < 0 ? "Port" : "Starboard"}: seventeen propellant tanks in a column that turns with the rings, with three small magnetic-nozzle trim thrusters at its tail. Descends from ${ANCESTORS.booms}.`,
  pieces: (o) => local([...thin(boomPieces(sx, 0.3 * (o?.detail ?? 1))), { kind: "lathe", material: "hull-white", segs: 24, only: "drawing", body: true, outline: true, at: [sx * SPIN.boomX, 0], profile: [[5, 100], [5, 508]], rings: Array.from({ length: 16 }, (_, k) => 124 + 24 * k) } as Piece, ...lampHalo(sx < 0 ? "port" : "starboard", [sx * SPIN.boomX, 240, 8]), ...lampHalo(sx < 0 ? "beacon" : "nav-white", [sx * SPIN.boomX, 420, 8])], sx * SPIN.boomX, 100, 0, o?.level),
});

const hubs = (): HanabusaPart => ({
  id: "hubs",
  name: "Hubs, bearings and the axial lift",
  kind: "module",
  y0: 128,
  place: { x: 0, z: 0 },
  height: SPINE_Y.node + 4 - 128,
  diameter: 60,
  note: `A drum on a bearing round the keel at each wheel with cross-beams to the booms, and a glazed lift tube down the keel with a lit car at each wheel. Descends from ${ANCESTORS.lift}.`,
  pieces: (o) => local(hubPieces(), 0, 128, 0, o?.level),
});

const docks = (): HanabusaPart => ({
  id: "docks",
  name: "Docking crown and Starship berth",
  kind: "module",
  y0: DOCK.berth.y0 - 0.5,
  place: { x: 0, z: 0 },
  height: DOCK.shield.y0 + DOCK.shield.stay + DOCK.shield.depth - (DOCK.berth.y0 - 0.5),
  diameter: 2 * DOCK.shield.radius + 4,
  note: `On the still keel at the bow, outside the hull and beyond the tops of the turning booms: three arms with an S-class crew port, an S-class visitor port and an M-class small-craft berth with an empty cradle, a berth along the keel with saddles, stays, a hard-dock collar and umbilicals for a Starship upper stage, pressurised walkways from every berth to the keel's lift, and the bow dust shield ahead of them. Descends from ${ANCESTORS.node} and the ISS's visiting-vehicle berths.`,
  pieces: (o) => local([...dockingPieces(), ...dockedCraft("fleet-ship-01")], 0, DOCK.berth.y0 - 0.5, 0, o?.level),
});

const ring = (order: Order, use: "garden" | "research" | "living"): HanabusaPart => {
  const r = rings(order).find((one) => one.use === (use === "garden" ? "hydro" : use))!;
  return {
    id: `ring-${use}${order === "aft" ? "-aft" : ""}`,
    name: `${r.name[0].toUpperCase()}${r.name.slice(1)} ring${order === "aft" ? ", smallest at the stern" : ""}`,
    kind: "module",
    y0: r.y - r.depth / 2,
    place: { x: 0, z: 0 },
    height: r.depth,
    diameter: r.rOut * 2 + 3,
    note: `A glazed ring ${r.rOut} m in radius and ${r.depth} m deep: ${use === "garden" ? "hydroponic terraces under LED grow-lamps" : use === "living" ? "a street with a canal, tree rows and three steps of homes up each side wall" : "terraces of laboratories under a glass roof"}, a solar skirt round the outer edge and six glazed spoke lifts to the hub. Descends from ${ANCESTORS.rings}; the hall from ${ANCESTORS.halls}.`,
    pieces: (o) => local(moving(ringPieces(r), { name: "spin", pivot: [0, r.y, 0], axis: [0, 1, 0] }), 0, r.y - r.depth / 2, 0, o?.level),
  };
};

const wheel = (): HanabusaPart => ({
  id: "wheel-industrial",
  name: "Industrial wheel",
  kind: "module",
  y0: SPIN.industrial.y - 11,
  place: { x: 0, z: 0 },
  height: SPIN.industrial.wide,
  diameter: SPIN.industrial.rOut * 2 + 3,
  note: `A closed wheel ${SPIN.industrial.rOut} m in radius set apart: yard, workshops, quarantine and stores, on six round spokes with lit lifts. Descends from ${ANCESTORS.rings}.`,
  pieces: (o) => local(moving(industrialWheel("ring"), { name: "spin-wheel", pivot: [0, SPIN.industrial.y, 0], axis: [0, 1, 0] }), 0, SPIN.industrial.y - 11, 0, o?.level),
});

const section = (): HanabusaPart => {
  const r = rings("bow").find((one) => one.use === "living")!;
  return {
    id: "ring-living-section",
    name: "Living ring, section view",
    kind: "module",
    y0: r.y - r.depth / 2,
    place: { x: 0, z: 0 },
    height: r.depth,
    diameter: r.rOut * 2 + 3,
    note: `The living ring opened for a section view, drawn flat in the line look: the glass cut away over a hundred and sixteen degrees, the section lines of the floor, the terraces and the canal at each cut, and no furnishing. Descends from ${ANCESTORS.halls}.`,
    pieces: (o) => local(sectionPieces(r), 0, r.y - r.depth / 2, 0, o?.level),
  };
};

/** Every part of the ship, each once. */
export function parts(): HanabusaPart[] {
  return [...spine(), boom(-1), boom(1), hubs(), docks(), ring("bow", "garden"), ring("bow", "research"), ring("bow", "living"), ring("aft", "garden"), ring("aft", "research"), ring("aft", "living"), wheel(), section()];
}

export { COLLARS };
