// Where each ship carries its name and its registry. The rows are the ship's own stations: a large lock-up on both sides, smaller registries near the stern, the docks, the airlocks and the hangar doors, and one on the upper face. Pure: no three.js and no DOM.
import type { Piece } from "../pieces.ts";
import { DOCK } from "./ship-01/docking.ts";
import { HABITAT, SPINE, STATION as KAMINARI, TANK } from "./ship-02/dims.ts";
import { HANGAR, STATION as MIYAMOTO } from "./ship-03/dims.ts";
import { FLEET_MARKS, REGISTRY_PLACEHOLDER, conceptStyle, lower, lockup } from "./markingSets.ts";
import { marking, markingWidth, type FlatPlace, type MarkingPlace, type RoundPlace, stripeMarking } from "./marking.ts";

/**
 * One place a ship carries its lettering. `place.height` is the registry's cap height in metres. `main` is the name and the registry; `repeat` is the registry alone.
 *
 * @example
 * ```ts
 * import { HULL_MARKS, type HullMark } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const main: HullMark = HULL_MARKS.kaminari.filter((mark) => mark.role === "main")[0];
 * console.log(main.side, main.place.height > 1);
 * ```
 */
export interface HullMark {
  id: string;
  side: "port" | "starboard" | "dorsal";
  role: "main" | "repeat";
  /** How far the white field stands out of the hull, in metres. */
  raise: number;
  place: MarkingPlace;
}

const round = (radius: number, y: number, az: number, axis: readonly [number, number], height: number, sides = 40): RoundPlace => ({ radius, y, az, height, axis, run: "up", align: "middle", sides });

/** A plate just off a flat face. `out` is +1 when the face looks toward +X. */
const flat = (x: number, y: number, z: number, height: number, out: 1 | -1): FlatPlace => ({
  at: [x, y, z],
  right: [0, out, 0],
  up: [0, 0, 1],
  height,
  align: "middle",
});

const tankAz = (sx: number, sz: number) => Math.atan2(-sx, -sz) + Math.PI;

/** Kaminari's two dorsal tanks, port and starboard, in the ship's own metres. */
const kaminariTanks = [
  { side: "starboard" as const, sx: 1, sz: 1 },
  { side: "port" as const, sx: -1, sz: 1 },
];

const kaminari = (): HullMark[] => {
  const out: HullMark[] = [];
  for (const tank of kaminariTanks) {
    const axis = [tank.sx * TANK.offset, tank.sz * TANK.offset] as const;
    const face = tankAz(tank.sx, tank.sz);
    const y = (local: number) => KAMINARI.tank.y + local;
    out.push(
      { id: `${tank.side}-main`, side: tank.side, role: "main", raise: 1.1, place: round(TANK.radius + 1.2, y(230), face, axis, 7.6) },
      { id: `${tank.side}-stern`, side: tank.side, role: "repeat", raise: 0.6, place: round(TANK.radius + 1.2, y(55), face, axis, 2.4) },
      { id: `${tank.side}-dorsal`, side: "dorsal", role: "repeat", raise: 0.8, place: round(TANK.radius + 1.2, y(230), 0, axis, 4) },
    );
  }
  const collarX = SPINE.half + 134 + 8;
  for (const sx of [1, -1] as const) for (const local of [26, 92]) {
    const side = sx > 0 ? "starboard" : "port";
    out.push({ id: `${side}-dock-${local}`, side, role: "repeat", raise: 0.08, place: flat(sx * collarX, KAMINARI.dock.y + local + 3, 0, 1.6, sx) });
  }
  for (const sx of [1, -1] as const) {
    const side = sx > 0 ? "starboard" : "port";
    out.push({ id: `${side}-hangar`, side, role: "repeat", raise: 0.08, place: flat(sx * 64, KAMINARI.dock.y + 8, 57, 2, sx) });
    const airX = sx * (HABITAT.radius + HABITAT.tube / 2 + 4);
    out.push({ id: `${side}-airlock`, side, role: "repeat", raise: 0.08, place: flat(airX, KAMINARI.habitatA.y + 18, 0, 1.4, sx) });
  }
  return out;
};

/** Miyamoto's habitat drum, and Ariake's, which is the same drum. */
const drum = (extra: HullMark[]): HullMark[] => {
  const y = 276;
  const radius = 14.2;
  const axis = [0, 0] as const;
  return [
    { id: "starboard-main", side: "starboard", role: "main", raise: 0.7, place: round(radius, y, Math.PI / 2, axis, 3.9, 56) },
    { id: "port-main", side: "port", role: "main", raise: 0.7, place: round(radius, y, -Math.PI / 2, axis, 3.9, 56) },
    { id: "dorsal", side: "dorsal", role: "repeat", raise: 0.5, place: round(radius, y, 0, axis, 2.2, 56) },
    { id: "starboard-stern", side: "starboard", role: "repeat", raise: 0.4, place: round(radius, MIYAMOTO.habitat[0] + 8, Math.PI / 2, axis, 1.4, 56) },
    { id: "port-stern", side: "port", role: "repeat", raise: 0.4, place: round(radius, MIYAMOTO.habitat[0] + 8, -Math.PI / 2, axis, 1.4, 56) },
    ...extra,
  ];
};

const hangar = (side: "port" | "starboard", y: readonly [number, number]): HullMark => {
  const box = HANGAR[side];
  const out = side === "starboard" ? 1 : -1;
  return { id: `${side}-hangar-${y[0]}`, side, role: "repeat", raise: 0.08, place: flat(out * (Math.abs(box.x[out > 0 ? 1 : 0]) + 0.4), (y[0] + y[1]) / 2, (box.z[0] + box.z[1]) / 2, 1.6, out) };
};

const booms = (): HullMark[] => {
  const out: HullMark[] = [];
  for (const sx of [1, -1] as const) {
    const side = sx > 0 ? "starboard" : "port";
    const axis = [sx * 21.5, 0] as const;
    const az = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    out.push(
      { id: `${side}-main`, side, role: "main", raise: 0.25, place: round(5.4, 300, az, axis, 2.2, 24) },
      { id: `${side}-stern`, side, role: "repeat", raise: 0.15, place: round(5.4, 130, az, axis, 0.9, 24) },
      { id: `${side}-dock`, side, role: "repeat", raise: 0.06, place: flat(sx * DOCK.reach, DOCK.face, 0, 0.8, sx) },
    );
  }
  out.push({ id: "dorsal", side: "dorsal", role: "repeat", raise: 0.2, place: round(5.4, 300, 0, [21.5, 0], 1.4, 24) });
  return out;
};

/**
 * The lettering places of each ship, in that ship's own metres. Every ship has a main lock-up on both sides, repeats along the hull, and a registry on the upper face.
 *
 * @example
 * ```ts
 * import { HULL_MARKS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(HULL_MARKS.kaminari.some((mark) => mark.side === "dorsal"));
 * ```
 */
export const HULL_MARKS: Readonly<Record<string, readonly HullMark[]>> = {
  kaminari: kaminari(),
  miyamoto: drum([hangar("starboard", HANGAR.starboard.y), hangar("port", HANGAR.port.y)]),
  ariake: drum([
    hangar("starboard", HANGAR.starboard.y),
    hangar("port", HANGAR.port.y),
    hangar("starboard", [222, 318]),
    hangar("port", [104, 204]),
  ]),
  hanabusa: booms(),
};

/**
 * The pieces of one ship's lettering, in the ship's own metres, ready to stand on the hull.
 *
 * @param ship A ship in `HULL_MARKS`.
 * @returns The pieces.
 * @example
 * ```ts
 * import { hullMarkings } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(hullMarkings("kaminari").length > 100);
 * ```
 */
export function hullMarkings(ship: string): Piece[] {
  const rows = HULL_MARKS[ship];
  if (!rows) throw new Error(`"${ship}" has no hull markings.`);
  const named = FLEET_MARKS.ships[ship];
  if (!named) throw new Error(`"${ship}" has no lettering.`);
  const registry = named.registry ?? REGISTRY_PLACEHOLDER;
  const name = `${named.prefix} ${named.name}`;
  const out: Piece[] = [];
  for (const row of rows) {
    const style = { ...conceptStyle("goldman"), field: { material: "hull-white" as const, pad: row.role === "main" ? 1.1 : 0.55, raise: row.raise } };
    if (row.role === "repeat") {
      out.push(...marking(registry, row.place, style));
      continue;
    }
    out.push(...lockup(registry, name, row.place, style, undefined, 0.36));
    const width = markingWidth(registry, row.place.height, style);
    const stripe = { ...lower(row.place, -(row.place.height / 2 + row.place.height * 0.16)), height: Math.max(0.12, row.place.height * 0.05) };
    out.push(...stripeMarking(stripe, width, "red", { onField: row.raise, lines: false }));
  }
  return out;
}
