// The two hangar shoulders: starboard aft (104 to 204 m, the rescue bay with its gantry, maintenance racks, a pressure vestibule and a rescue cutter on its cradle) and port forward (222 to 318 m, the survey bay with its drones
// on racks, an access bridge and emergency shutters). Each is a rectangular shoulder braced to the spine, its outer wall open to a bay door with orange shutter leaves. A cutaway opens the face towards the spine and, on the
// starboard shoulder, the outer wall. Pure: no three.js and no DOM.
import { beam, cub, HULL_STACKS, type Lathe, type Piece, prism, rng, rod } from "./adapter.ts";
import { HANGAR } from "./dims.ts";
import { dressedFace, pipe, wallShells } from "./hulls.ts";
import { along, conduit, type Face, faceOf, frame, hazard, ladder, lamp, on, rail, stencil, WHITE } from "./faces.ts";

type Side = "starboard" | "port";

/** A small craft on a cradle: a hull of chamfered prisms, a canopy, two engine bells and skids. Its nose points along +Y. */
export function cutter(cx: number, cy: number, cz: number, length: number, wide: number): Piece[] {
  const out: Piece[] = [];
  const hy = length / 2;
  const hw = wide / 2;
  const hull = (m: "hull-white" | "hull-white-worn" | "hull-grey" | "hull-orange", y0: number, y1: number, w: number, z0: number, z1: number) =>
    prism(m, [[cx - w, cz + z0], [cx + w, cz + z0], [cx + w, cz + z1], [cx - w, cz + z1]], cy + y0, cy + y1, { only: "mesh" });
  out.push(hull("hull-white", -hy, hy * 0.35, hw, 0, 3.4), hull("hull-white-worn", hy * 0.35, hy * 0.78, hw * 0.7, 0.4, 3), hull("hull-grey", hy * 0.78, hy, hw * 0.34, 0.9, 2.4));
  out.push(cub("glass", [cx - hw * 0.5, cx + hw * 0.5], [cy + hy * 0.3, cy + hy * 0.62], [cz + 3, cz + 3.9]), cub("hull-grey-dark", [cx - hw * 0.56, cx + hw * 0.56], [cy + hy * 0.26, cy + hy * 0.66], [cz + 2.9, cz + 3.1]));
  out.push(cub("hull-orange", [cx - hw - 0.2, cx + hw + 0.2], [cy - hy * 0.6, cy - hy * 0.1], [cz + 1.2, cz + 1.6]), cub("hazard", [cx - hw, cx + hw], [cy - hy, cy - hy + 0.4], [cz + 0.2, cz + 0.6]));
  for (const s of [-1, 1]) {
    const bell: Lathe = { kind: "lathe", material: "bell", at: [cx + s * hw * 0.5, cz + 1.6], segs: 14, profile: [[1.1, cy - hy - 2.4], [0.5, cy - hy - 0.6], [0.6, cy - hy]], only: "mesh" };
    out.push(bell, cub("hull-grey-dark", [cx + s * hw - 0.8, cx + s * hw + 0.8], [cy - hy * 0.7, cy + hy * 0.2], [cz - 0.5, cz + 0.1]), ...[cy - hy * 0.5, cy + hy * 0.1].map((y) => rod("hull-grey", [cx + s * hw * 0.8, y, cz + 0.1], [cx + s * hw * 0.8, y, cz + 1.2], 0.14, 6)));
    out.push(cub("lamp-blue", [cx + s * hw - 0.1, cx + s * hw + 0.1], [cy + hy * 0.5, cy + hy * 0.54], [cz + 1.8, cz + 2]));
  }
  return out;
}

/** A drone: a core box with four booms and rotors-ish discs, on a rack shelf. */
export function drone(cx: number, cy: number, cz: number): Piece[] {
  const out: Piece[] = [cub("hull-white", [cx - 1.4, cx + 1.4], [cy - 1.4, cy + 1.4], [cz, cz + 1.2]), cub("glass", [cx - 0.6, cx + 0.6], [cy + 1.4, cy + 1.8], [cz + 0.3, cz + 0.9])];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) out.push(rod("hull-grey-dark", [cx, cy, cz + 0.6], [cx + sx * 2.8, cy + sy * 2.8, cz + 0.6], 0.12, 6), cub("hull-orange", [cx + sx * 2.8 - 0.6, cx + sx * 2.8 + 0.6], [cy + sy * 2.8 - 0.6, cy + sy * 2.8 + 0.6], [cz + 0.6, cz + 0.8]));
  return out;
}

/** The inside: deck, ceiling rails and a gantry crane, racks, a vestibule, lights, the rescue cutter or the drones. */
function inside(side: Side, seed: string): Piece[] {
  const h = HANGAR[side];
  const [y0, y1] = h.y;
  const [x0, x1] = h.x;
  const [z0, z1] = h.z;
  const cx = h.centre;
  const cy = (y0 + y1) / 2;
  const out: Piece[] = [];
  const random = rng(`${seed}/inside`);
  // the deck: plates with a hazard border and numbered bays, and lights set in it
  out.push(cub("deck", [x0 + 1.4, x1 - 1.4], [y0 + 1.4, y1 - 1.4], [z0 + 1.4, z0 + 1.7], { only: undefined }));
  for (let y = y0 + 4; y < y1 - 3; y += 4) out.push(cub("hull-grey-dark", [x0 + 1.4, x1 - 1.4], [y, y + 0.1], [z0 + 1.7, z0 + 1.78]));
  for (const x of [cx - 8, cx + 8]) out.push(cub("hazard", [x - 0.25, x + 0.25], [y0 + 4, y1 - 4], [z0 + 1.7, z0 + 1.76]));
  for (let y = y0 + 6; y < y1 - 4; y += 6) for (const x of [x0 + 3, x1 - 3]) out.push(cub("lamp-blue", [x - 0.2, x + 0.2], [y - 0.2, y + 0.2], [z0 + 1.7, z0 + 1.8]));
  // the ceiling: two rails along the bay, a gantry bridge across them with a trolley, hook and cable
  const rz = z1 - 3.4;
  for (const x of [x0 + 5, x1 - 5]) out.push(beam("hull-yellow", [x, y0 + 3, rz], [x, y1 - 3, rz], 0.7, 0.6), beam("hull-grey-dark", [x, y0 + 3, rz + 0.6], [x, y1 - 3, rz + 0.6], 0.3, 0.8));
  const gy = cy + (side === "starboard" ? 6 : -4);
  out.push(beam("hull-orange", [x0 + 5, gy, rz - 0.8], [x1 - 5, gy, rz - 0.8], 1.6, 1.4), beam("hull-grey-dark", [x0 + 5, gy - 1.4, rz - 0.3], [x1 - 5, gy - 1.4, rz - 0.3], 0.4, 0.4), cub("hull-yellow", [cx - 1.6, cx + 1.6], [gy - 1.6, gy + 1.6], [rz - 2.3, rz - 1.4]), rod("hull-grey-dark", [cx, gy, rz - 2.3], [cx, gy, z0 + 6], 0.08, 6), cub("hazard", [cx - 0.5, cx + 0.5], [gy - 0.5, gy + 0.5], [z0 + 5.4, z0 + 6.2]));
  // ceiling lamps: a strip of eight, and the sprinkler pipe
  for (let k = 0; k < 8; k++) out.push(cub("lamp-amber", [cx - 0.4, cx + 0.4], [y0 + 6 + k * ((y1 - y0 - 12) / 7) - 0.8, y0 + 6 + k * ((y1 - y0 - 12) / 7) + 0.8], [z1 - 1.5, z1 - 1.4]));
  out.push(...pipe([x0 + 3, y0 + 2, z1 - 2], [x0 + 3, y1 - 2, z1 - 2], 0.22, "lamp-red"));
  // racks against the wall that faces the spine: shelves with crates and spares, a ladder and a service door
  const wall = side === "starboard" ? x0 + 1.4 : x1 - 1.4;
  const into = side === "starboard" ? 1 : -1;
  for (let y = y0 + 4; y < y1 - 6; y += 7) {
    for (let t = 0; t < 4; t++) out.push(cub("hull-grey-dark", into === 1 ? [wall, wall + 2.2] : [wall - 2.2, wall], [y, y + 5.4], [z0 + 3 + t * 5, z0 + 3.25 + t * 5]));
    for (let t = 0; t < 4; t++) for (let k = 0; k < 3; k++) if (random() < 0.8) out.push(cub(random() < 0.5 ? "hull-orange-worn" : random() < 0.5 ? "hull-yellow" : "hull-white-worn", into === 1 ? [wall + 0.2, wall + 1.9] : [wall - 1.9, wall - 0.2], [y + 0.2 + k * 1.75, y + 1.7 + k * 1.75], [z0 + 3.25 + t * 5, z0 + 4.4 + t * 5 + random() * 1.8]));
    out.push(cub("hull-grey", into === 1 ? [wall, wall + 0.2] : [wall - 0.2, wall], [y, y + 5.4], [z0 + 3, z1 - 3]));
  }
  // the pressure vestibule at the aft end: a box with two doors, a hazard frame and a status lamp
  out.push(cub("hull-white-worn", [cx - 6, cx + 6], [y0 + 1.5, y0 + 6], [z0 + 1.7, z0 + 9]), cub("hull-grey-dark", [cx - 3, cx + 3], [y0 + 6, y0 + 6.2], [z0 + 1.9, z0 + 7.6]), cub("hazard", [cx - 3.3, cx + 3.3], [y0 + 6.2, y0 + 6.35], [z0 + 7.6, z0 + 8.1]), cub("lamp-blue", [cx - 0.3, cx + 0.3], [y0 + 6.2, y0 + 6.4], [z0 + 8.3, z0 + 8.7]));
  if (side === "starboard") out.push(...cutter(cx, cy - 10, z0 + 3.1, 32, 14), ...[-1, 1].flatMap((s) => [beam("hull-yellow", [cx + s * 7.4, cy - 24, z0 + 1.8], [cx + s * 7.4, cy + 4, z0 + 1.8], 0.8, 1.2), cub("hull-grey-dark", [cx + s * 7.4 - 0.9, cx + s * 7.4 + 0.9], [cy - 16, cy - 15], [z0 + 1.8, z0 + 3.2]), cub("hull-grey-dark", [cx + s * 7.4 - 0.9, cx + s * 7.4 + 0.9], [cy - 2, cy - 1], [z0 + 1.8, z0 + 3.2])]));
  else
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) out.push(cub("hull-grey-dark", [cx - 7 + c * 8, cx - 1 + c * 8], [y0 + 10 + r * 22, y0 + 24 + r * 22], [z0 + 1.7, z0 + 2.1]), ...drone(cx - 4 + c * 8, y0 + 17 + r * 22, z0 + 2.1), ...drone(cx - 4 + c * 8, y0 + 12 + r * 22, z0 + 8));
  return out;
}

/** One hangar shoulder, built where it stands in the ship. */
export function hangar(side: Side, cut: boolean, detail = 1, seed = `hangar-${side}`): Piece[] {
  const h = HANGAR[side];
  const [y0, y1] = h.y;
  const [x0, x1] = h.x;
  const [z0, z1] = h.z;
  const sgn = side === "starboard" ? 1 : -1;
  const T = 1.4;
  const out: Piece[] = [];
  const o = { seed, scheme: WHITE, detail, density: 0.3 };
  const openLow = z0 + 5;
  const openHigh = z1 - 7;
  const openY: [number, number] = [y0 + 12, y1 - 12];
  const outer = side === "starboard" ? x1 : x0;
  // the structural shell as slabs: floor, roof, end walls, the inner wall, and the outer wall in four strips round the bay door
  const slab = (xr: [number, number], yr: [number, number], zr: [number, number]) => cub("hull-grey-dark", xr, yr, zr, { only: undefined });
  out.push(slab([x0, x1], [y0, y1], [z0, z0 + T]), slab([x0, x1], [y0, y1], [z1 - T, z1]), slab([x0, x1], [y0, y0 + T], [z0, z1]), slab([x0, x1], [y1 - T, y1], [z0, z1]));
  if (!cut || side === "port") out.push(slab(side === "starboard" ? [x0, x0 + T] : [x1 - T, x1], [y0, y1], [z0, z1]));
  const strip = (xr: [number, number], yr: [number, number], zr: [number, number]) => out.push(slab(xr, yr, zr));
  const wallX: [number, number] = side === "starboard" ? [outer - T, outer] : [outer, outer + T];
  if (!(cut && side === "starboard")) {
    strip(wallX, [y0, y1], [z0, openLow]);
    strip(wallX, [y0, y1], [openHigh, z1]);
    strip(wallX, [y0, openY[0]], [openLow, openHigh]);
    strip(wallX, [openY[1], y1], [openLow, openHigh]);
  }
  // plating on every outward face: the roof and floor, the two end walls, the outer wall's strips, and the inner wall
  const box = { x: [x0, x1], y: [y0, y1], z: [z0, z1] } as const;
  const dorsal = faceOf(box, "z", 1);
  const ventral = faceOf(box, "z", -1);
  const fore = faceOf(box, "y", 1);
  const aft = faceOf(box, "y", -1);
  out.push(...dressedFace(dorsal, { ...o, kinds: ["hatch", "vent", "stub", "sensor", "greeble", "number", "lamps"] }), ...dressedFace(ventral, { ...o, kinds: ["vent", "hatch", "greeble", "stub"] }));
  out.push(...dressedFace(fore, { ...o, density: 0.25 }), ...dressedFace(aft, { ...o, density: 0.25 }));
  const outerFace = (yr: readonly [number, number], zr: readonly [number, number]): Face => ({ n: "x", sign: sgn as 1 | -1, at: outer, a: yr, b: zr });
  if (!(cut && side === "starboard")) {
    out.push(...dressedFace(outerFace([y0, y1], [z0, openLow]), { ...o, density: 0.4, slot: [8, 4] }), ...dressedFace(outerFace([y0, y1], [openHigh, z1]), { ...o, density: 0.4, slot: [8, 5] }));
    out.push(...dressedFace(outerFace([y0, openY[0]], [openLow, openHigh]), { ...o, density: 0.4 }), ...dressedFace(outerFace([openY[1], y1], [openLow, openHigh]), { ...o, density: 0.4 }));
    // the bay door's frame in grey, a hazard band along its sill and lintel, and its orange shutter leaves partly drawn
    const door = outerFace(openY, [openLow, openHigh]);
    out.push(...frame(door, (openY[0] + openY[1]) / 2, (openLow + openHigh) / 2, openY[1] - openY[0], openHigh - openLow, 1.1, 0.7, "hull-grey"), ...hazard(door, openLow - 0.3, openY[0], openY[1], 0.5, 1.2), ...hazard(door, openHigh + 0.3, openY[0], openY[1], 0.5, 1.2));
    const leaves = 5;
    const lw = (openY[1] - openY[0]) / leaves;
    const drawn = side === "starboard" ? 2 : 5;
    for (let k = 0; k < leaves; k++) {
      const a0 = openY[0] + k * lw;
      if (k >= leaves - drawn) out.push(on(door, a0 + lw / 2, (openLow + openHigh) / 2, lw - 0.2, openHigh - openLow, 0.1, 0.7 + (k % 2) * 0.3, k % 2 ? "hull-orange" : "hull-orange-worn"), ...hazard(door, openHigh - 0.5, a0 + 0.3, a0 + lw - 0.3, 0.3, 0.6), on(door, a0 + lw / 2, (openLow + openHigh) / 2, 0.3, openHigh - openLow - 0.4, 0.8, 1.1, "hull-grey-dark"));
    }
    out.push(...stencil(door, side === "starboard" ? "104" : "222", openY[0] - 3, openLow - 1.4, 1.6), ...conduit(door, openHigh + 2.1, openY[0], openY[1], { count: 3, seed }), ...ladder(along(door), openY[1] + 3, openLow, openHigh), ...lamp(door, openY[0] - 1.5, openHigh, "amber"), ...lamp(door, openY[1] + 1.5, openHigh, "blue"));
    // a rail outside the sill, on posts
    out.push(...rail(door, openLow - 1.4, openY[0] - 2, openY[1] + 2));
  } else {
    // the layers of the floor and the roof show at the cut
    out.push(...wallShells(HULL_STACKS.command, { axis: "z", sign: -1, at: z0, y: [y0, y1], across: [x0, x1], step: 0.25 }));
    out.push(...wallShells(HULL_STACKS.command, { axis: "z", sign: 1, at: z1, y: [y0, y1], across: [x0, x1], step: 0.25 }));
  }
  // the inner face: facing the spine, with the braces that tie the shoulder to it
  const innerFace: Face = { n: "x", sign: (side === "starboard" ? -1 : 1) as 1 | -1, at: side === "starboard" ? x0 : x1, a: [y0, y1], b: [z0, z1] };
  if (!(cut && side === "port")) out.push(...dressedFace(innerFace, { ...o, density: 0.25 }));
  for (let y = y0 + 10; y < y1 - 6; y += 22) for (const z of [z0 + 4, z1 - 4]) out.push(beam("hull-grey", [side === "starboard" ? x0 : x1, y, z], [sgn * 8.6, y + (side === "starboard" ? -8 : 8), z * 0.3], 1.6, 1.2), cub("hull-yellow", sgn === 1 ? [x0 - 0.5, x0 + 0.3] : [x1 - 0.3, x1 + 0.5], [y - 0.7, y + 0.7], [z - 0.7, z + 0.7]));
  // the inside, always: it is what shows through the bay door
  out.push(...inside(side, seed));
  return out;
}
