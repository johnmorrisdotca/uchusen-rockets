// The yard's working structure: a box truss, a lattice in place of a slab, a jointed boom and a crane. Sized so a member reads beside a 1.8 km ship. Pure.
import type { Piece } from "../../pieces.ts";
import { DRAGON_DRAWS, capsule, trunk } from "../../falcon.ts";
import { dronePieces } from "../drone/index.ts";
import { ball, beam, cub, hoop, iBeam, pipeRun, place, rod, strut } from "../kaminari-concepts/adapter.ts";
import { scalePieces } from "../kaminari-concepts/scale.ts";

type V3 = [number, number, number];

const UP: V3 = [0, 0, 1];

/** A lamp on each face of a joint: a white point outside and an amber point inside, plus a small warm pool. */
function jointLamp(at: V3): Piece[] {
  return [
    ball("strobe", [at[0], at[1], at[2] + 8], 4),
    ball("lamp-amber", [at[0], at[1], at[2] - 8], 4),
    cub("flood", [at[0] - 7, at[0] + 7], [at[1] - 5, at[1] + 5], [at[2] - 1, at[2] + 1]),
  ];
}

/** Four long chords and a frame every bay, so a line of the yard is a truss and not a single rod. */
export function boxTruss(x: number, z: number, y0: number, y1: number, half = 26): Piece[] {
  const out: Piece[] = [];
  const corners: V3[] = [[x - half, 0, z - half], [x + half, 0, z - half], [x + half, 0, z + half], [x - half, 0, z + half]];
  for (const c of corners) out.push(...iBeam("hull-grey", [c[0], y0, c[2]], [c[0], y1, c[2]], UP, 18, 14));
  for (let y = y0; y <= y1; y += 140) {
    out.push(...iBeam("hull-grey-dark", [x - half, y, z - half], [x + half, y, z - half], UP, 12, 9));
    out.push(...iBeam("hull-grey-dark", [x + half, y, z - half], [x + half, y, z + half], UP, 12, 9));
    out.push(...iBeam("hull-grey-dark", [x + half, y, z + half], [x - half, y, z + half], UP, 12, 9));
    out.push(...iBeam("hull-grey-dark", [x - half, y, z + half], [x - half, y, z - half], UP, 12, 9));
    const y2 = Math.min(y + 140, y1);
    out.push(...strut("hull-grey", [x - half, y, z + half], [x + half, y2, z + half], 4));
    out.push(...strut("hull-grey", [x - half, y, z - half], [x - half, y2, z + half], 4));
    for (const c of corners) out.push(...jointLamp([c[0], y, c[2]]));
  }
  return out;
}

/** An open lattice in a horizontal plane: ribs, a walkway, a cable and a cluster of floods. No solid panel. */
export function lattice(x0: number, x1: number, y0: number, y1: number, z: number): Piece[] {
  const out: Piece[] = [];
  for (let y = y0; y <= y1; y += 90) out.push(...iBeam("hull-grey", [x0, y, z], [x1, y, z], UP, 14, 10));
  for (let x = x0; x <= x1; x += 90) out.push(...iBeam("hull-grey-dark", [x, y0, z], [x, y1, z], UP, 12, 8));
  for (let y = y0; y < y1; y += 180) out.push(...strut("hull-grey", [x0, y, z], [x1, Math.min(y + 90, y1), z], 3.5));
  const mid = (x0 + x1) / 2;
  out.push(cub("hull-grey", [mid - 7, mid + 7], [y0, y1], [z - 3, z]));
  out.push(...pipeRun([[x0 + 16, y0, z - 10], [x1 - 16, y0, z - 10], [x1 - 16, y1, z - 10]], 2.4, "coolant"));
  for (let y = y0; y <= y1; y += 180) for (let x = x0; x <= x1; x += 180) out.push(...jointLamp([x, y, z]));
  for (let y = y0 + 50; y < y1; y += 260) {
    out.push(cub("flood", [mid - 22, mid - 8], [y, y + 10], [z - 22, z - 10]));
    out.push(cub("flood", [mid + 8, mid + 22], [y, y + 10], [z - 22, z - 10]));
    out.push(cub("flood", [mid - 5, mid + 5], [y + 14, y + 22], [z - 28, z - 14]));
  }
  return out;
}

/** The same lattice standing as a wall. */
export function latticeWall(x: number, y0: number, y1: number, z0: number, z1: number): Piece[] {
  const out: Piece[] = [];
  const up: V3 = [1, 0, 0];
  for (let y = y0; y <= y1; y += 90) out.push(...iBeam("hull-grey", [x, y, z0], [x, y, z1], up, 14, 10));
  for (let z = z0; z <= z1; z += 70) out.push(...iBeam("hull-grey-dark", [x, y0, z], [x, y1, z], up, 12, 8));
  for (let y = y0; y < y1; y += 180) out.push(...strut("hull-grey", [x, y, z0], [x, Math.min(y + 90, y1), z1], 3.5));
  out.push(...pipeRun([[x, y0, z0 + 8], [x, y1, z0 + 8]], 2.4, "hull-orange"));
  return out;
}

/** A Canadarm on a rail: thick segments, a ball at the shoulder, the elbow and the wrist, and a claw holding a part. */
export function boom(shoulder: V3, elbow: V3, wrist: V3, held: "tank" | "crate"): Piece[] {
  const claw: V3 = [wrist[0] + Math.sign(wrist[0] - shoulder[0] || 1) * 40, wrist[1] - 6, wrist[2] - 8];
  const out: Piece[] = [
    ball("engine-metal", shoulder, 26),
    ball("strobe", [shoulder[0], shoulder[1] + 8, shoulder[2] + 32], 5),
    ball("lamp-amber", [elbow[0], elbow[1] + 8, elbow[2] + 28], 5),
    ...iBeam("hull-white", shoulder, elbow, UP, 40, 28),
    ball("engine-metal", elbow, 20),
    ...iBeam("hull-white", elbow, wrist, UP, 30, 22),
    ball("hull-grey-dark", wrist, 16),
    ...strut("hull-grey", wrist, claw, 7),
    ...strut("hull-grey-dark", claw, [claw[0] + 16, claw[1] + 22, claw[2] + 12], 5),
    ...strut("hull-grey-dark", claw, [claw[0] + 16, claw[1] - 20, claw[2] - 12], 5),
  ];
  if (held === "tank") out.push(rod("hull-white", claw, [claw[0], claw[1] + 48, claw[2]], 12, 12));
  else out.push(cub("hull-grey", [claw[0] - 16, claw[0] + 16], [claw[1] - 12, claw[1] + 28], [claw[2] - 14, claw[2] + 14]));
  return out;
}

/** Booms riding one rail, several along the slot, each holding something. */
export function boomsOnRail(x: number, z: number, y0: number, y1: number, reach: number): Piece[] {
  const out: Piece[] = [...iBeam("hull-grey", [x, y0, z], [x, y1, z], UP, 22, 16)];
  let n = 0;
  for (let y = y0 + 80; y < y1 - 40; y += 300) {
    const shoulder: V3 = [x, y, z];
    const elbow: V3 = [x + reach * 0.55, y + 60, z - 24];
    const wrist: V3 = [x + reach, y + 8, z - 50];
    out.push(...boom(shoulder, elbow, wrist, n % 2 === 0 ? "tank" : "crate"));
    n += 1;
  }
  return out;
}

/** A rectangular mouth at the near end, thick enough to frame the slot in the wide view. */
export function mouth(x0: number, x1: number, z0: number, z1: number, y: number): Piece[] {
  const up: V3 = [1, 0, 0];
  return [
    ...iBeam("hull-white", [x0, y, z0], [x1, y, z0], UP, 34, 24),
    ...iBeam("hull-white", [x0, y, z1], [x1, y, z1], UP, 34, 24),
    ...iBeam("hull-white", [x0, y, z0], [x0, y, z1], up, 34, 24),
    ...iBeam("hull-white", [x1, y, z0], [x1, y, z1], up, 34, 24),
    ...jointLamp([x0, y, z0]),
    ...jointLamp([x1, y, z0]),
    ...jointLamp([x0, y, z1]),
    ...jointLamp([x1, y, z1]),
    ...jointLamp([(x0 + x1) / 2, y, z1]),
  ];
}

let droneParked: Piece[] | null = null;
const oneDrone = (): Piece[] => (droneParked ??= scalePieces(dronePieces(true), 8));

let dragonParked: Piece[] | null = null;
const oneDragon = (): Piece[] => {
  if (dragonParked) return dragonParked;
  const drawn = DRAGON_DRAWS["dragon-2"];
  dragonParked = [...trunk(drawn), ...place(capsule(drawn), { at: [0, drawn.trunk - drawn.nest, 0] })];
  return dragonParked;
};

/** A marked pad: an outline and a lamp on each corner, and nothing else. */
function pad(x0: number, x1: number, y0: number, y1: number, z: number): Piece[] {
  const out: Piece[] = [
    rod("hull-grey-dark", [x0, y0, z], [x1, y0, z], 1.2, 6),
    rod("hull-grey-dark", [x1, y0, z], [x1, y1, z], 1.2, 6),
    rod("hull-grey-dark", [x1, y1, z], [x0, y1, z], 1.2, 6),
    rod("hull-grey-dark", [x0, y1, z], [x0, y0, z], 1.2, 6),
  ];
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const) out.push(ball("lamp-amber", [x, y, z + 4], 1.4));
  return out;
}

/** Drone rows and a few real small ships, each on a marked pad. Lamps are on the pad corners only. */
export function parking(x0: number, y0: number, z0: number): Piece[] {
  const out: Piece[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const x = x0 + col * 22;
      const y = y0 + row * 22;
      out.push(...pad(x - 8, x + 8, y - 8, y + 8, z0));
      out.push(...place(oneDrone(), { at: [x, y, z0 + 1] }));
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = x0 + 200;
    const y = y0 + i * 40;
    out.push(...pad(x - 8, x + 8, y, y + 28, z0));
    out.push(...place(oneDragon(), { at: [x, y + 2, z0] }));
  }
  out.push(...pad(x0, x0 + 150, y0 + 110, y0 + 220, z0));
  out.push(...pad(x0 + 170, x0 + 300, y0 + 110, y0 + 240, z0));
  return out;
}

/** A viewing room. Z is up. The low-x face is open toward the slot, so a camera inside looks out at the ship. */
function booth(x: number, y: number, z: number): Piece[] {
  const dx = 44;
  const dy = 36;
  const dz = 22;
  return [
    cub("hull-grey", [x, x + dx], [y, y + dy], [z, z + 2]),
    cub("hull-grey", [x, x + dx], [y, y + dy], [z + dz - 2, z + dz]),
    cub("hull-white", [x + dx - 2, x + dx], [y, y + dy], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y, y + 2], [z, z + dz]),
    cub("hull-white", [x, x + dx], [y + dy - 2, y + dy], [z, z + dz]),
    cub("window", [x - 1, x + 1], [y + 2, y + dy - 2], [z + dz - 4, z + dz - 2]),
  ];
}

/** A rectangular hangar, an elevator along the yard, four viewing booths and two visitor ports joined to the elevator by a walkway. */
export function visitors(side: number, slotX: number): Piece[] {
  const out: Piece[] = [];
  const y0 = 160;
  const y1 = 820;
  const z0 = -50;
  const z1 = 90;
  const wide = 240;
  out.push(...latticeWall(side, y0, y1, z0, z1));
  out.push(...latticeWall(side + wide, y0, y1, z0, z1));
  out.push(...lattice(side, side + wide, y0, y1, z1));
  out.push(...lattice(side, side + wide, y0, y1, z0));
  out.push(...iBeam("hull-white", [side - 30, 30, 48], [side - 30, 1970, 48], UP, 14, 8));
  out.push(cub("hull-white", [side - 48, side - 12], [640, 690], [24, 78]));
  out.push(...cabinWindows(side - 30, 648, 76));
  out.push(cub("hull-white", [side - 48, side - 12], [1500, 1550], [24, 78]));
  out.push(...cabinWindows(side - 30, 1508, 76));
  out.push(...booth(side - 80, 40, 70));
  out.push(...booth(side - 80, 420, 160));
  out.push(...booth(slotX + 150, 940, 24));
  out.push(...booth(side - 80, 1860, 70));
  for (const y of [120, 1860]) {
    out.push(...place([hoop("hull-white", 32, y, 4, 28, 8)], { at: [side + 80, 0, z0 - 40] }));
    out.push(...iBeam("hull-white", [side - 30, y, 48], [side + 80, y, z0 - 40], UP, 10, 7));
  }
  return out;
}

/** A bridge crane across the slot, with a hoist and floods on the bridge. */
export function crane(y: number, x0: number, x1: number, z: number): Piece[] {
  const mid = (x0 + x1) / 2;
  const up: V3 = [1, 0, 0];
  return [
    ...iBeam("hull-grey", [x0, y, z - 160], [x0, y, z], up, 24, 16),
    ...iBeam("hull-grey", [x1, y, z - 160], [x1, y, z], up, 24, 16),
    beam("hull-white", [x0, y, z], [x1, y, z], 28, 16),
    ...iBeam("hull-grey-dark", [mid, y, z], [mid, y, z - 90], up, 12, 8),
    cub("hull-grey", [mid - 14, mid + 14], [y - 10, y + 10], [z - 100, z - 78]),
    cub("flood", [mid - 30, mid - 12], [y - 6, y + 6], [z - 8, z + 8]),
    cub("flood", [mid + 12, mid + 30], [y - 6, y + 6], [z - 8, z + 8]),
  ];
}

/** A hatch platform under floodlights: a deck, a dark hatch, and the lights that pick it out. */
export function hatchDeck(x: number, y: number, z: number): Piece[] {
  return [
    cub("hull-grey", [x - 36, x + 36], [y, y + 10], [z, z + 48]),
    cub("hull-grey-dark", [x - 12, x + 12], [y + 10, y + 16], [z + 14, z + 34]),
    ...iBeam("hull-grey", [x - 36, y + 5, z], [x - 36, y + 5, z + 48], [1, 0, 0], 8, 6),
    ...iBeam("hull-grey", [x + 36, y + 5, z], [x + 36, y + 5, z + 48], [1, 0, 0], 8, 6),
    cub("flood", [x - 30, x - 14], [y + 18, y + 28], [z + 2, z + 12]),
    cub("flood", [x + 14, x + 30], [y + 18, y + 28], [z + 2, z + 12]),
    cub("flood", [x - 6, x + 6], [y + 22, y + 32], [z + 36, z + 48]),
  ];
}

/** Small windows on a pressurised module, a few metres each, so the close view reads as a cabin. */
export function cabinWindows(x: number, y: number, z: number): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < 5; i++) out.push(cub("window", [x - 5, x + 5], [y + i * 9, y + 5 + i * 9], [z, z + 2]));
  return out;
}
