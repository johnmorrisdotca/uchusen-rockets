// One yard of three bays side by side: a long hall, an open spine and a gantry dock, crossed by one elevator. The ships are placed by the picture script.
import type { Piece } from "../../pieces.ts";
import { dronePieces } from "../drone/index.ts";
import { cub, hoop, iBeam, place, rod } from "../kaminari-concepts/adapter.ts";
import { scalePieces } from "../kaminari-concepts/scale.ts";
import { boomsOnRail, boxTruss, crane, hatchDeck, lattice, latticeWall, parking } from "./structure.ts";

type V3 = [number, number, number];
const UP: V3 = [0, 0, 1];

/** Where each bay's ship stands, and where the hub lounge and the latch are looked at. */
export const BAYS = {
  hall: { shipAt: [0, 160, 0] as const, length: 2000 },
  spine: { shipAt: [760, 180, 0] as const, length: 980, backbone: 540 },
  dock: { shipAt: [1520, 180, 20] as const, length: 1280 },
  loose: { shipAt: [-720, 180, 0] as const, backbone: -540 },
  lounge: { eye: [593, 252, 34.5] as const, at: [920, 520, 8] as const },
  latch: { eye: [490, -48, 22] as const, at: [540, 18, 0] as const },
};

/** A drone at work, large enough to read beside a ship in a bay's close shot. */
function crew(at: V3, yaw = 0): Piece[] {
  return place(scalePieces(dronePieces(true), 18), { at, yaw });
}

/** An observation lounge. Z is up. The high-x face is a long window. Seats, a rail at 1 m and ceiling lights are people-scale. */
function observation(x: number, y: number, z: number): Piece[] {
  const dx = 14;
  const dy = 56;
  const dz = 12;
  const out: Piece[] = [
    cub("hull-grey", [x, x + dx], [y, y + dy], [z, z + 0.35]),
    cub("hull-grey", [x, x + dx], [y, y + dy], [z + dz - 0.4, z + dz]),
    cub("hull-white", [x, x + 0.4], [y, y + dy], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y, y + 0.4], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y + dy - 0.4, y + dy], [z, z + dz]),
    cub("glass-clear", [x + dx - 0.3, x + dx + 0.3], [y + 2, y + dy - 2], [z + 1.2, z + dz - 0.8]),
    cub("window", [x + dx - 0.55, x + dx + 0.55], [y + 1.5, y + dy - 1.5], [z + 0.9, z + 1.5]),
    cub("window", [x + dx - 0.55, x + dx + 0.55], [y + 1.5, y + dy - 1.5], [z + dz - 1.3, z + dz - 0.6]),
    cub("flood", [x + dx + 0.4, x + dx + 2.2], [y + 4, y + dy - 4], [z + 1.4, z + 2.2]),
  ];
  for (let yy = y + 8; yy < y + dy - 2; yy += 8) out.push(cub("hull-white", [x + dx - 0.5, x + dx + 0.5], [yy, yy + 0.4], [z + 1.2, z + dz - 0.8]));
  const railX = x + dx - 1.6;
  out.push(rod("hull-grey-dark", [railX, y + 2, z + 1], [railX, y + dy - 2, z + 1], 0.08, 6));
  for (let yy = y + 2; yy <= y + dy - 2; yy += 4) out.push(rod("hull-grey-dark", [railX, yy, z + 0.35], [railX, yy, z + 1], 0.06, 6));
  for (let yy = y + 6; yy < y + dy - 6; yy += 4) {
    out.push(cub("hull-grey-dark", [x + 1.8, x + 3.1], [yy, yy + 0.7], [z + 0.35, z + 0.9]));
    out.push(cub("hull-white", [x + 1.8, x + 3.1], [yy + 0.5, yy + 0.75], [z + 0.9, z + 1.45]));
    out.push(cub("hull-grey-dark", [x + 4.8, x + 6.4], [yy, yy + 0.7], [z + 0.35, z + 0.9]));
    out.push(cub("hull-white", [x + 4.8, x + 6.4], [yy + 0.5, yy + 0.75], [z + 0.9, z + 1.5]));
  }
  for (let yy = y + 6; yy < y + dy; yy += 10) {
    out.push(cub("lamp-amber", [x + 4, x + 6.2], [yy, yy + 1.4], [z + dz - 1.2, z + dz - 0.5]));
    out.push(cub("flood", [x + 8, x + 11], [yy, yy + 0.8], [z + dz - 1, z + dz - 0.45]));
  }
  return out;
}

/** The hall bay: a ring and a ribbed lattice over a long slot. */
function hallBay(): Piece[] {
  const span = 220;
  const out: Piece[] = [];
  for (const [x, z] of [[-span, -180], [span, -180], [span, 180], [-span, 180]] as const) out.push(...boxTruss(x, z, 0, BAYS.hall.length));
  out.push(hoop("hull-white", 190, 240, 14, 40, 10));
  out.push(...lattice(-span + 30, span - 30, 80, 260, 170));
  out.push(...lattice(-span + 30, span - 30, 1620, BAYS.hall.length - 60, 170));
  out.push(...latticeWall(-span, 80, BAYS.hall.length - 60, -140, 140));
  out.push(...crew([70, 520, 90]), ...crew([-40, 760, 60], 40));
  return out;
}

/** One latch, used by every spine. The port is the hub's ring; the plug is the spine's end. */
function latchPort(x: number, y: number, z: number): Piece[] {
  const dogs: Piece[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const px = x + Math.cos(a) * 24;
    const pz = z + Math.sin(a) * 24;
    dogs.push(cub("lamp-amber", [px - 3.5, px + 3.5], [y - 3, y + 7], [pz - 3.5, pz + 3.5]));
  }
  return [
    ...place([hoop("hull-white", 26, y, 4, 32, 8)], { at: [x, 0, z] }),
    ...dogs,
    cub("hull-grey-dark", [x - 8, x + 8], [y - 10, y - 6], [z - 8, z + 8]),
    ...iBeam("hull-grey", [x, y - 48, z], [x, y - 6, z], UP, 18, 14),
  ];
}

/** The plug that seats in {@link latchPort}. The neck runs toward +Y, into the backbone. */
function latchPlug(x: number, y: number, z: number): Piece[] {
  const dogs: Piece[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const px = x + Math.cos(a) * 18;
    const pz = z + Math.sin(a) * 18;
    dogs.push(cub("hull-orange", [px - 2.5, px + 2.5], [y - 2, y + 6], [pz - 2.5, pz + 2.5]));
  }
  return [
    ...place([hoop("engine-metal", 18, y, 3, 28, 8)], { at: [x, 0, z] }),
    ...dogs,
    ...iBeam("hull-white", [x, y, z], [x, y + 36, z], UP, 16, 12),
  ];
}

/** An open backbone and its arms. Nothing stands on the far side of the ship, so a drone can reach every face. */
function openSpine(x: number, y0: number, reach: number): Piece[] {
  const len = BAYS.spine.length;
  return [
    ...latchPlug(x, y0, 0),
    ...boxTruss(x, 0, y0 + 30, y0 + len, 16),
    ...boomsOnRail(x, 0, y0 + 50, y0 + len - 40, reach),
  ];
}

/** Bay 2, latched to the hub, plus a second port of the same latch left empty. */
function spineBay(): Piece[] {
  const x = BAYS.spine.backbone;
  return [
    ...openSpine(x, 4, 150),
    ...latchPort(x, 0, 0),
    ...latchPort(400, 0, 0),
    ...iBeam("hull-white", [400, -40, 0], [x, -40, 0], UP, 16, 12),
    ...crew([700, 360, 70], 20),
    ...crew([820, 560, 40], -30),
  ];
}

/** The same spine, unlatched, with its own plug, parked off the hub. */
function looseSpine(): Piece[] {
  return openSpine(BAYS.loose.backbone, 4, -150);
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
  out.push(...crew([1640, 460, 90]), ...crew([1680, 300, 120], 25), ...crew([1480, 720, 50], 15));
  return out;
}

/** One elevator spine across the three bays, two visitor ports, a hangar and a parking field. */
function shared(): Piece[] {
  const y = 150;
  const z = 48;
  const out: Piece[] = [...iBeam("hull-white", [-280, y, z], [1860, y, z], UP, 16, 10)];
  out.push(cub("hull-white", [200, 248], [y - 16, y + 16], [z - 18, z + 22]));
  out.push(cub("window", [206, 242], [y + 12, y + 17], [z - 2, z + 14]));
  out.push(cub("hull-white", [900, 948], [y - 16, y + 16], [z - 18, z + 22]));
  out.push(cub("window", [906, 942], [y + 12, y + 17], [z - 2, z + 14]));
  out.push(...observation(-280, 480, 40));
  out.push(...observation(588, 240, 30));
  out.push(...observation(1360, 400, 36));
  for (const x of [-40, 1700]) {
    out.push(...place([hoop("hull-white", 28, y, 4, 24, 8)], { at: [x, 0, z - 70] }));
    out.push(...iBeam("hull-white", [x, y, z], [x, y, z - 70], UP, 10, 7));
  }
  out.push(...iBeam("hull-white", [1712, 30, z - 70], [1712, y, z - 56], UP, 6, 4));
  const hx = 1860;
  out.push(...latticeWall(hx, 200, 860, -40, 90));
  out.push(...latticeWall(hx + 220, 200, 860, -40, 90));
  out.push(...lattice(hx, hx + 220, 200, 860, 90));
  out.push(...parking(240, -260, -30));
  return out;
}

/** The three bays, the crossing elevator, the lounges, the hangar and the parking field. */
export function multiBay(): Piece[] {
  return [...hallBay(), ...spineBay(), ...looseSpine(), ...dockBay(), ...shared()];
}
