// One yard of three bays side by side: a long hall, an open spine and a gantry dock, crossed by one elevator. The ships are placed by the picture script.
import type { Piece } from "../../pieces.ts";
import { cub, hoop, iBeam, place } from "../kaminari-concepts/adapter.ts";
import { boomsOnRail, boxTruss, crane, hatchDeck, lattice, latticeWall, mouth, parking } from "./structure.ts";

type V3 = [number, number, number];
const UP: V3 = [0, 0, 1];

/** Where each bay's ship stands, and where the hub lounge's camera sits. */
export const BAYS = {
  hall: { shipAt: [0, 160, 0] as const, length: 2000 },
  spine: { shipAt: [760, 180, 0] as const, length: 980 },
  dock: { shipAt: [1520, 180, 20] as const, length: 1280 },
  lounge: { eye: [-150, 168, 78] as const, at: [400, 168, 40] as const },
};

/** A pressurised lounge. Z is up. The high-x face is open, so a camera inside looks across the bays. */
function lounge(x: number, y: number, z: number): Piece[] {
  const dx = 70;
  const dy = 28;
  const dz = 22;
  return [
    cub("hull-grey", [x, x + dx], [y, y + dy], [z, z + 2]),
    cub("hull-grey", [x, x + dx], [y, y + dy], [z + dz - 2, z + dz]),
    cub("hull-white", [x, x + 2], [y, y + dy], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y, y + 2], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y + dy - 2, y + dy], [z, z + dz]),
    cub("window", [x + dx - 1, x + dx + 1], [y + 3, y + dy - 3], [z + dz - 5, z + dz - 3]),
  ];
}

/** The hall bay: a ring and a ribbed lattice over a long slot. */
function hallBay(): Piece[] {
  const span = 220;
  const out: Piece[] = [];
  for (const [x, z] of [[-span, -180], [span, -180], [span, 180], [-span, 180]] as const) out.push(...boxTruss(x, z, 0, BAYS.hall.length));
  out.push(hoop("hull-white", 190, 240, 14, 40, 10));
  out.push(...lattice(-span + 30, span - 30, 80, BAYS.hall.length - 60, 170));
  out.push(...latticeWall(-span, 80, BAYS.hall.length - 60, -140, 140));
  return out;
}

/** The spine bay: open rails, booms and a mouth, shifted out along x. */
function spineBay(): Piece[] {
  const x = BAYS.spine.shipAt[0];
  const len = BAYS.spine.length;
  const out: Piece[] = [];
  for (const [dx, z] of [[-200, -150], [200, -150], [200, 150], [-200, 150]] as const) out.push(...boxTruss(x + dx, z, 0, len));
  out.push(...mouth(x - 160, x + 160, -140, 140, 40));
  out.push(...boomsOnRail(x - 200, 150, 40, len - 40, 110));
  out.push(...boomsOnRail(x + 200, -150, 40, len - 40, -110));
  out.push(...crane(420, x - 180, x + 180, 200));
  return out;
}

/** The dock bay: gantries over an open side and a hatch. */
function dockBay(): Piece[] {
  const x = BAYS.dock.shipAt[0];
  const len = BAYS.dock.length;
  const out: Piece[] = [];
  for (const dx of [-200, 0, 200]) out.push(...boxTruss(x + dx, -160, 0, len));
  out.push(...latticeWall(x - 200, 40, len - 40, -140, 60));
  out.push(...latticeWall(x + 200, 40, len - 40, -140, 60));
  for (const y of [280, 640, 1000]) out.push(...crane(y, x - 200, x + 200, 190));
  out.push(...hatchDeck(x, 80, -140));
  return out;
}

/** One elevator spine across the three bays, two visitor ports, a hangar and a parking field. */
function shared(): Piece[] {
  const y = 150;
  const z = 48;
  const out: Piece[] = [...iBeam("hull-white", [-280, y, z], [1860, y, z], UP, 16, 10)];
  out.push(cub("hull-white", [200, 248], [y - 16, y + 16], [z - 18, z + 22]));
  out.push(cub("hull-white", [900, 948], [y - 16, y + 16], [z - 18, z + 22]));
  out.push(...lounge(-200, y - 14, z + 8));
  out.push(...lounge(BAYS.hall.shipAt[0] - 40, 620, 150));
  out.push(...lounge(BAYS.spine.shipAt[0] - 40, 460, 150));
  out.push(...lounge(BAYS.dock.shipAt[0] - 40, 520, 150));
  for (const x of [-40, 1700]) {
    out.push(...place([hoop("hull-white", 28, y, 4, 24, 8)], { at: [x, 0, z - 70] }));
    out.push(...iBeam("hull-white", [x, y, z], [x, y, z - 70], UP, 10, 7));
  }
  const hx = 1860;
  out.push(...latticeWall(hx, 200, 860, -40, 90));
  out.push(...latticeWall(hx + 220, 200, 860, -40, 90));
  out.push(...lattice(hx, hx + 220, 200, 860, 90));
  out.push(...parking(240, -260, -30));
  return out;
}

/** The three bays, the crossing elevator, the lounges, the hangar and the parking field. */
export function multiBay(): Piece[] {
  return [...hallBay(), ...spineBay(), ...dockBay(), ...shared()];
}
