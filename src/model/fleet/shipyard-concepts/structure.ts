// The yard's working structure: a box truss, a lattice in place of a slab, a jointed boom and a crane. Sized so a member reads beside a 1.8 km ship. Pure.
import type { Piece } from "../../pieces.ts";
import { ball, beam, cub, iBeam, pipeRun, rod, strut } from "../kaminari-concepts/adapter.ts";

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

/** Rows of drone stalls, a few craft and visiting-ship berths, and three empty pads marked off for stores. */
export function parking(x0: number, y0: number, z0: number): Piece[] {
  const out: Piece[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      const x = x0 + col * 26;
      const y = y0 + row * 30;
      out.push(rod("hull-grey", [x - 8, y, z0], [x - 8, y, z0 + 16], 2.2, 6));
      out.push(rod("hull-grey", [x + 8, y, z0], [x + 8, y, z0 + 16], 2.2, 6));
      out.push(cub("lamp-amber", [x - 3, x + 3], [y + 1, y + 7], [z0 + 14, z0 + 18]));
      out.push(ball("hull-white", [x, y + 4, z0 + 8], 5));
      if (col % 3 === 0) out.push(cub("flood", [x - 6, x + 6], [y - 2, y + 6], [z0 - 0.6, z0 + 0.4]));
    }
  }
  for (let i = 0; i < 6; i++) {
    const y = y0 + i * 48;
    const x = x0 + 340;
    out.push(rod("hull-grey", [x, y, z0], [x + 40, y, z0], 3, 6));
    out.push(rod("hull-white", [x + 16, y + 6, z0 + 8], [x + 16, y + 36, z0 + 8], 5, 8));
    out.push(cub("nav-green", [x + 36, x + 42], [y + 40, y + 46], [z0 + 6, z0 + 12]));
    out.push(cub("nav-red", [x - 2, x + 4], [y, y + 6], [z0 + 6, z0 + 12]));
    out.push(cub("flood", [x + 10, x + 22], [y + 16, y + 24], [z0 + 16, z0 + 22]));
  }
  for (let i = 0; i < 4; i++) {
    const y = y0 + i * 90;
    const x = x0 + 430;
    out.push(rod("hull-grey", [x, y, z0], [x, y + 70, z0], 4, 8));
    out.push(rod("hull-white", [x + 22, y + 8, z0 + 10], [x + 22, y + 62, z0 + 10], 8, 10));
    out.push(cub("nav-green", [x - 6, x], [y + 64, y + 72], [z0 + 6, z0 + 12]));
    out.push(cub("flood", [x + 6, x + 16], [y + 30, y + 40], [z0 + 18, z0 + 26]));
  }
  for (let k = 0; k < 8; k++) {
    const y = y0 - 36 - k * 26;
    out.push(cub("nav-green", [x0 - 16, x0 - 8], [y, y + 6], [z0 + 4, z0 + 12]));
    out.push(cub("nav-red", [x0 + 300, x0 + 308], [y, y + 6], [z0 + 4, z0 + 12]));
  }
  const pads: readonly (readonly [number, number, number, number])[] = [
    [x0, x0 + 180, y0 + 270, y0 + 400],
    [x0 + 210, x0 + 390, y0 + 270, y0 + 400],
    [x0 + 420, x0 + 620, y0 + 270, y0 + 430],
  ];
  for (const [xa, xb, ya, yb] of pads) {
    out.push(rod("hull-grey-dark", [xa, ya, z0], [xb, ya, z0], 2.4, 6));
    out.push(rod("hull-grey-dark", [xb, ya, z0], [xb, yb, z0], 2.4, 6));
    out.push(rod("hull-grey-dark", [xb, yb, z0], [xa, yb, z0], 2.4, 6));
    out.push(rod("hull-grey-dark", [xa, yb, z0], [xa, ya, z0], 2.4, 6));
    for (const [px, py] of [[xa, ya], [xb, ya], [xa, yb], [xb, yb]] as const) {
      out.push(rod("hull-grey", [px, py, z0], [px, py, z0 + 30], 3.2, 6));
      out.push(ball("lamp-amber", [px, py, z0 + 32], 5));
    }
  }
  out.push(ball("hull-grey", [x0 + 250, y0 + 330, z0 + 16], 14));
  out.push(ball("hull-grey", [x0 + 300, y0 + 360, z0 + 16], 14));
  out.push(cub("hull-grey", [x0 + 470, x0 + 476], [y0 + 320, y0 + 350], [z0 + 2, z0 + 24]));
  out.push(cub("hull-grey", [x0 + 494, x0 + 500], [y0 + 320, y0 + 350], [z0 + 2, z0 + 24]));
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
