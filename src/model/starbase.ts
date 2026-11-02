// Starbase from the map: places and outlines from OpenStreetMap (a handful of named places, in metres from tower 1, x to the east and z to the south), the road and the coast too. What stands on them is plain geometry with no lettering or logo. Nothing here is announced or from a concept picture. Few pieces, merged by material in one mesh per part, so a whole town is a few dozen draws.
import { blank } from "../data/types.ts";
import { moved, nose, road, slab, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild, StackPart } from "./stacks.ts";
import { mount, tower, TOWER_X } from "./tower.ts";

// tower 1 is the origin. Each row: x, z, wide, deep, turn in degrees, as measured
const TOWER_2: readonly [number, number] = [-333, -101];
const TOWER_TURN = 35;
const FARM = { x: -24, z: -116, wide: 314, deep: 78, turn: 13 };
const BUNKER = { x: -197, z: -195, wide: 51, deep: 20, turn: 12, tall: 4.1 };
const BAYS = [
  { x: -3362, z: 1081, wide: 54, deep: 38, turn: 44 },
  { x: -3390, z: 984, wide: 38, deep: 54, turn: 44 },
];
const BAY_TALL = 100;
const FACTORY = { x: -3170, z: 931, wide: 293, deep: 327, turn: 44, tall: 16.3 };
const SANCHEZ = { x: -3586, z: 1368, wide: 523, deep: 345, turn: -46 };
const SIGN: readonly [number, number] = [-3455, 1445];
const VILLAGE: readonly [number, number] = [-2825, 516];
const HALL: readonly [number, number] = [-2688, 364];
const HIGHWAY: readonly (readonly [number, number])[] = [[-3799, 1822], [-3008, 1030], [-2855, 826], [-2546, 516], [-1863, 351], [-1233, 124], [-640, -104], [-333, -236], [-70, -186], [182, -127]];
const COAST_X = 430;
const BOOSTER_H = 72.3;
const SHIP_H = 52.1;
const R = 4.5;

interface Span {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** The land from a coast to the west, the beach, and a little sea. Only what the span reaches. */
function ground(span: Span): Piece[] {
  const land = Math.min(span.x1, COAST_X - 70);
  const midZ = (span.z0 + span.z1) / 2;
  const deep = span.z1 - span.z0;
  const out: Piece[] = [slab("ground", (span.x0 + land) / 2, midZ, land - span.x0, deep, 0, -0.6, 0.02)];
  if (span.x1 > land) {
    const beach = Math.min(span.x1, COAST_X);
    out.push(slab("sand", (land + beach) / 2, midZ, beach - land, deep, 0, -0.6, 0.02));
    if (span.x1 > beach) out.push(slab("water", (beach + span.x1) / 2, midZ, span.x1 - beach, deep, 0, -0.6, -0.1));
  }
  const inside = HIGHWAY.filter(([x, z]) => x >= span.x0 && x <= span.x1 && z >= span.z0 && z <= span.z1);
  if (inside.length > 1) out.push(...road("concrete", inside, 12, 0));
  return out;
}

/** The tower and its mount as they stand at one place. */
const pad = (x: number, z: number): Piece[] => moved([...tower(), ...mount()], x - TOWER_X * Math.cos((TOWER_TURN * Math.PI) / 180), z + TOWER_X * Math.sin((TOWER_TURN * Math.PI) / 180), TOWER_TURN);

function tankFarm(): Piece[] {
  const out: Piece[] = [slab("concrete", FARM.x, FARM.z, FARM.wide, FARM.deep, FARM.turn, 0, 0.3)];
  const tanks = 22;
  for (let i = 0; i < tanks; i++) {
    const along = -FARM.wide / 2 + 10 + ((FARM.wide - 20) * i) / (tanks - 1);
    const a = (FARM.turn * Math.PI) / 180;
    out.push(slab("white", FARM.x + along * Math.cos(a), FARM.z + along * Math.sin(a), 6, 48, FARM.turn, 0.3, 7.1));
  }
  out.push(slab("dark", BUNKER.x, BUNKER.z, BUNKER.wide, BUNKER.deep, BUNKER.turn, 0, BUNKER.tall));
  return out;
}

/** A plain rocket at Block 3's sizes, standing at a place: booster, ship or both. */
function plainRocket(x: number, z: number, y: number, booster: boolean, ship: boolean): Piece[] {
  const at: [number, number] = [x, z];
  const seg = { segs: 16, at };
  const out: Piece[] = [];
  if (booster) out.push(tube("steel", R, y, y + BOOSTER_H, { ...seg, rings: [y + BOOSTER_H - 0.02] }));
  const base = booster ? y + BOOSTER_H : y;
  if (ship) {
    out.push(tube("steel", R, base, base + SHIP_H - 17, seg));
    out.push(nose("steel", R, base + SHIP_H - 17, base + SHIP_H, 1.05, seg));
    for (const side of [1, -1]) out.push(slab("fin-dark", x + side * (R + 1.6), z, 3.2, 1, 0, base + 2, base + 12));
  }
  return out;
}

const onPad = (): Piece[] => plainRocket(TOWER_X * -Math.cos((TOWER_TURN * Math.PI) / 180), TOWER_X * Math.sin((TOWER_TURN * Math.PI) / 180), 21, true, true);

const megaBays = (): Piece[] => BAYS.map((bay) => slab("fin-dark", bay.x, bay.z, bay.wide, bay.deep, bay.turn, 0, BAY_TALL, false));

const starfactory = (): Piece[] => [slab("white", FACTORY.x, FACTORY.z, FACTORY.wide, FACTORY.deep, FACTORY.turn, 0, FACTORY.tall, false)];

function garden(): Piece[] {
  const a = (SANCHEZ.turn * Math.PI) / 180;
  const row = (along: number, across: number): [number, number] => [SANCHEZ.x + along * Math.cos(a) - across * Math.sin(a), SANCHEZ.z + along * Math.sin(a) + across * Math.cos(a)];
  const out: Piece[] = [slab("concrete", SANCHEZ.x, SANCHEZ.z, SANCHEZ.wide, SANCHEZ.deep, SANCHEZ.turn, 0, 0.3)];
  [-90, -50, -10].forEach((along) => out.push(...plainRocket(...row(along, 40), 0.3, true, false)));
  [30, 70, 110].forEach((along) => out.push(...plainRocket(...row(along, 40), 0.3, false, true)));
  return out;
}

const sign = (): Piece[] => [slab("dark", SIGN[0], SIGN[1], 40, 2, -46, 0, 5, false)];

function village(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < 14; i++) out.push(slab(i % 3 ? "white" : "concrete", VILLAGE[0] + 32 * (i % 7) - 90, VILLAGE[1] + 34 * Math.floor(i / 7) - 20, 14, 10, -40, 0, 6));
  out.push(slab("concrete", HALL[0], HALL[1], 30, 20, -40, 0, 9));
  return out;
}

const NONE = blank("No source read here gives it.");
const FROM = "This package's code: places, outlines and the heights the map tags from OpenStreetMap, under its licence, read 2026-11-02. A building is one plain box. Nothing announced, and no logo or lettering.";
const part = (slot: string, name: string, height: number, wide: number, pieces: () => Piece[]): StackPart => ({ slot, kind: "site", name, height, diameter: wide, place: { x: 0, z: 0 }, sourcedDiameter: NONE, pieces });

const LAUNCH: Span = { x0: -620, x1: 640, z0: -420, z1: 200 };
const BUILD: Span = { x0: -3900, x1: -2950, z0: 700, z1: 1700 };
const CITY: Span = { x0: -3950, x1: 640, z0: -420, z1: 1800 };

const pads = () => part("pads", "Two towers and their mounts", 149.4, 360, () => [...pad(0, 0), ...pad(TOWER_2[0], TOWER_2[1])]);
const farm = () => part("tank-farm", "The tank farm", 7.1, FARM.wide, tankFarm);
const rocketThere = () => part("on-pad", "A plain rocket at Block 3's size, on the first pad", 145.4, R * 2, onPad);
const bays = () => part("mega-bays", "The Mega Bays", BAY_TALL, 200, megaBays);
const factoryPart = () => part("starfactory", "Starfactory, its outer outline", FACTORY.tall, FACTORY.deep, starfactory);
const gardenPart = () => part("garden", "The rocket garden on the Sanchez site", BOOSTER_H, SANCHEZ.wide, garden);
const signPart = () => part("sign", "A plain board at the sign's place", 5, 40, sign);

export const STARBASE_BUILDS: readonly StackBuild[] = [
  { rocket: "starbase", variant: "launch-site", drawnFrom: FROM, parts: [part("ground", "The ground, the beach and the road", 0.2, 1260, () => ground(LAUNCH)), pads(), farm(), rocketThere()] },
  { rocket: "starbase", variant: "build-site", drawnFrom: FROM, parts: [part("ground", "The ground and the road", 0.2, 950, () => ground(BUILD)), bays(), factoryPart(), gardenPart(), signPart()] },
  { rocket: "starbase", variant: "city", drawnFrom: FROM, parts: [part("ground", "The ground, the beach and the road", 0.2, 4590, () => ground(CITY)), pads(), farm(), rocketThere(), bays(), factoryPart(), gardenPart(), signPart(), part("village", "A few plain houses at the village", 9, 300, village)] },
];
