// The shared docking choice. A ship records its ports; `docked="dragon@crew-s,starship@starship"` mates the package's own craft to those ports, at true scale, one craft to a port. A craft the port does not list is left off. Pure: no three.js and no DOM.
import { AS_SOYUZ_LONG } from "../../data/apollosoyuz.ts";
import { soyuzPieces } from "../apollosoyuz.ts";
import { capsule, DRAGON_DRAWS, trunk } from "../falcon.ts";
import { boundsOfPieces, type Piece, type Vec3 } from "../pieces.ts";
import { orionDocked, ORION_DOCKED_LENGTH } from "../sls.ts";
import { shipPieces, STARSHIP_DRAWS } from "../starship.ts";
import { place } from "./detail.ts";
import { dockedNow } from "./dockedState.ts";
import { DOCK, PORTS as HANABUSA } from "./ship-01/docking.ts";
import { PORTS as KYOTORI } from "./ship-kyotori/docking.ts";

export type CraftId = "dragon" | "soyuz" | "orion" | "starship";

export interface DockFace {
  id: string;
  name: string;
  at: readonly [number, number, number];
  dir: readonly [number, number, number];
  models?: readonly CraftId[];
  /** Where the craft's own origin sits, when it lies alongside instead of meeting the collar nose-first. */
  seat?: readonly [number, number, number];
}

const LABELS: Readonly<Record<CraftId, string>> = { dragon: "Dragon", soyuz: "Soyuz", orion: "Orion", starship: "Starship" };

const FACES: Readonly<Record<string, readonly DockFace[]>> = {
  "fleet-ship-01": HANABUSA,
  "fleet-kyotori": KYOTORI,
};

/** The ports of a ship that a person can put a craft on, in the order the ship records them. */
export function dockMenu(rocket: string): { id: string; name: string; craft: { id: CraftId; label: string }[] }[] {
  return (FACES[rocket] ?? []).filter((port) => (port.models?.length ?? 0) > 0).map((port) => ({ id: port.id, name: port.name, craft: (port.models ?? []).map((id) => ({ id, label: LABELS[id] })) }));
}

/** The craft a ship's own pictures already show, as a `docked` value. Empty when the berths are drawn empty. */
export function dockPlan(rocket: string): string {
  if (rocket === "fleet-kyotori") return "dragon@quarter-control,starship@quarter-observatory";
  return "";
}

interface Made {
  pieces: Piece[];
  /** Local Y of the face that meets the collar. */
  nose: number;
}

const made = (id: CraftId): Made => {
  if (id === "dragon") {
    const d = DRAGON_DRAWS["dragon-2"];
    const nose = d.trunk + d.capsule - d.nest;
    return { nose, pieces: [...trunk(d), ...place(capsule(d), { at: [0, d.trunk - d.nest, 0] })] };
  }
  if (id === "soyuz") {
    const nose = AS_SOYUZ_LONG.value ?? 0;
    return { nose, pieces: soyuzPieces() };
  }
  if (id === "orion") return { nose: ORION_DOCKED_LENGTH, pieces: orionDocked() };
  const draw = STARSHIP_DRAWS.v3;
  return { nose: draw.shipHeight, pieces: shipPieces(draw) };
};

/** Turn a craft end for end, so a nose that was at `nose` sits at local Y 0. */
function noseDown(pieces: readonly Piece[], nose: number): Piece[] {
  const y = (v: number) => nose - v;
  return pieces.map((piece): Piece => {
    if (piece.kind === "lathe") return { ...piece, profile: piece.profile.map(([r, h]) => [r, y(h)] as [number, number]).reverse() };
    if (piece.kind === "plate") {
      const o = piece.frame.o;
      return { ...piece, frame: { ...piece.frame, o: [o[0], y(o[1]), o[2]], v: [piece.frame.v[0], -piece.frame.v[1], piece.frame.v[2]] } };
    }
    if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map((p) => [p[0], y(p[1]), p[2]] as Vec3)) };
    return piece;
  });
}

/** The craft named in `spec` (`dragon@crew-s,starship@starship`), mated, in ship metres. Empty when nothing was asked or nothing named is allowed. The last craft named for a port is the one that stays. */
export function dockedCraft(rocket: string, spec: string | null = dockedNow.spec): Piece[] {
  if (spec === null || spec === "") return [];
  const ports = FACES[rocket] ?? [];
  const chosen = new Map<string, CraftId>();
  for (const pair of spec.split(",")) {
    const [craft, port] = pair.split("@");
    if (craft !== "dragon" && craft !== "soyuz" && craft !== "orion" && craft !== "starship") continue;
    const face = ports.find((one) => one.id === port);
    if (!face?.models?.includes(craft)) continue;
    chosen.set(port, craft);
  }
  const out: Piece[] = [];
  for (const [port, craft] of chosen) {
    const face = ports.find((one) => one.id === port) as DockFace;
    const model = made(craft);
    if (face.seat) {
      out.push(...place(model.pieces, { at: [face.seat[0], face.seat[1], face.seat[2]] }));
      continue;
    }
    const down = face.dir[1] < 0;
    const pieces = down ? noseDown(model.pieces, model.nose) : model.pieces;
    const origin: Vec3 = down ? [face.at[0], face.at[1], face.at[2]] : [face.at[0], face.at[1] - model.nose, face.at[2]];
    out.push(...place(pieces, { at: origin }));
  }
  return out;
}

/** The highest and lowest point of the craft mated by `spec`, or none when it mates nothing. */
export function dockedReach(rocket: string, spec: string): { min: Vec3; max: Vec3 } | null {
  const pieces = dockedCraft(rocket, spec);
  if (pieces.length === 0) return null;
  return boundsOfPieces(pieces);
}

/** Hanabusa's crew port, for the tests that check a nose meets the collar. */
export const CREW_PORT_Y = DOCK.face;
