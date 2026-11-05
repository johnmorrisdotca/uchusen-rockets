// The two hangar shoulders: starboard aft (104 to 204 m) and port forward (222 to 318 m). Each box holds two Starship bodies side by side, a Super Heavy and a ship, on cradles, with a matching pair of empty clamp saddles on the outside. A cutaway opens the face towards the spine and, on the
// starboard shoulder, the outer wall. Pure: no three.js and no DOM.
import { moving } from "../motion.ts";
import { cub, HULL_STACKS, ibeam, type Piece, pipeRun, rng, rod, roundStrut } from "./adapter.ts";
import { type BayId, BAYS, bayBox } from "./dims.ts";
import { dressedFace, pipe, wallShells } from "./hulls.ts";
import { along, bolts, conduit, type Face, faceOf, frame, hazard, ladder, lamp, on, pt, rail, stencil, WHITE } from "./faces.ts";
import { exteriorSaddles, starshipBay } from "./service.ts";

type Side = "starboard" | "port";

/** Miyamoto's two shoulders by their side. */
export const BAY_OF: Readonly<Record<Side, BayId>> = { starboard: "starboard-aft", port: "port-fore" };

const span = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);

/** The inside: deck, ceiling rails and a gantry crane, racks, a vestibule, lights, and the hardware that holds, guides and services a craft. No craft is drawn: the bay is empty. */
function inside(bay: BayId, seed: string): Piece[] {
  const side = BAYS[bay].side;
  const rescue = BAYS[bay].kind === "rescue";
  const h = bayBox(bay);
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
  for (const x of [x0 + 5, x1 - 5]) out.push(...ibeam("hull-yellow", [x, y0 + 3, rz], [x, y1 - 3, rz], 1.0, 0.6, [0, 0, 1]));
  const gy = cy + (rescue ? 6 : -4);
  out.push(...ibeam("hull-yellow", [x0 + 5, gy, rz - 0.8], [x1 - 5, gy, rz - 0.8], 1.6, 0.9, [0, 0, 1]), ...roundStrut("hull-grey-dark", [x0 + 5, gy - 1.4, rz - 0.3], [x1 - 5, gy - 1.4, rz - 0.3], 0.18), cub("hull-yellow", [cx - 1.6, cx + 1.6], [gy - 1.6, gy + 1.6], [rz - 2.3, rz - 1.4]), rod("hull-grey-dark", [cx, gy, rz - 2.3], [cx, gy, z0 + 6], 0.08, 6), cub("hazard", [cx - 0.5, cx + 0.5], [gy - 0.5, gy + 0.5], [z0 + 5.4, z0 + 6.2]));
  // ceiling lamps: a strip of eight, and the sprinkler pipe
  for (let k = 0; k < 8; k++) out.push(cub("lamp-amber", [cx - 0.4, cx + 0.4], [y0 + 6 + k * ((y1 - y0 - 12) / 7) - 0.8, y0 + 6 + k * ((y1 - y0 - 12) / 7) + 0.8], [z1 - 1.5, z1 - 1.4]));
  out.push(...pipe([x0 + 3, y0 + 2, z1 - 2], [x0 + 3, y1 - 2, z1 - 2], 0.22, "lamp-red"));
  // racks against the wall that faces the spine: steel uprights in bays seven metres wide, shelf boards with a front lip, standard cases in three neutral colours with labels and handles, a strap across each shelf and a net of straps down each bay
  const wall = side === "starboard" ? x0 + 1.4 : x1 - 1.4;
  const face = side === "starboard" ? 1 : -1; // +1: the shelves stand out of the wall towards +X
  const depth = 2.2;
  const tiers = 8;
  const pitch = (z1 - z0 - 7) / tiers;
  const cases = ["hull-white-worn", "hull-grey", "hull-blue"] as const;
  const net = (d: number, ya: number, yb: number, za: number, zb: number, r: number): Piece => cub("black", span(wall + face * d, wall + face * (d + r)), [ya, yb], [za, zb]);
  for (let y = y0 + 4; y < y1 - 6; y += 7) {
    for (const uy of [y, y + 3.5, y + 7]) out.push(cub("hull-grey-dark", span(wall + face * 0.1, wall + face * (depth + 0.2)), [uy - 0.12, uy + 0.12], [z0 + 2.4, z1 - 3]), rod("hull-grey", [wall + face * (depth + 0.3), uy, z0 + 2.4], [wall + face * (depth + 0.3), uy, z1 - 3], 0.09, 8));
    for (let t = 0; t < tiers; t++) {
      const zs = z0 + 2.6 + t * pitch;
      out.push(cub("hull-white-worn", span(wall, wall + face * depth), [y, y + 7], [zs, zs + 0.18]), cub("hull-grey", span(wall + face * depth, wall + face * (depth + 0.12)), [y, y + 7], [zs, zs + 0.5]));
      for (let k = 0; k < 3; k++) {
        if (random() < 0.08) continue;
        const kind = cases[Math.floor(random() * 3)];
        const tall = 1.4 + random() * (pitch - 1.9);
        const ya = y + 0.15 + k * 2.3;
        const front = wall + face * (depth - 0.15);
        out.push(cub(kind, span(wall + face * 0.2, front), [ya, ya + 2.1], [zs + 0.18, zs + 0.18 + tall]), cub("hull-grey-dark", span(front, front + face * 0.04), [ya + 0.06, ya + 2.04], [zs + 0.18 + tall * 0.5 - 0.04, zs + 0.18 + tall * 0.5 + 0.04]), cub("hull-white", span(front, front + face * 0.05), [ya + 0.25, ya + 1.1], [zs + 0.18 + tall - 0.62, zs + 0.18 + tall - 0.18]), cub("black", span(front + face * 0.05, front + face * 0.08), [ya + 0.3, ya + 1.05], [zs + 0.18 + tall - 0.5, zs + 0.18 + tall - 0.4]), cub("hull-grey-dark", span(front, front + face * 0.1), [ya + 1.3, ya + 1.9], [zs + 0.18 + tall - 0.45, zs + 0.18 + tall - 0.3]));
      }
      out.push(net(depth + 0.12, y + 0.05, y + 6.95, zs + 0.55, zs + 0.7, 0.05));
    }
    for (let k = 0; k < 6; k++) out.push(net(depth + 0.12, y + 0.5 + k * 1.2, y + 0.58 + k * 1.2, z0 + 2.6, z0 + 2.6 + tiers * pitch, 0.04));
  }
  // the pressure vestibule at the aft end: a box with two doors, a hazard frame and a status lamp
  out.push(cub("hull-white-worn", [cx - 6, cx + 6], [y0 + 1.5, y0 + 6], [z0 + 1.7, z0 + 9]), cub("hull-grey-dark", [cx - 3, cx + 3], [y0 + 6, y0 + 6.2], [z0 + 1.9, z0 + 7.6]), cub("hazard", [cx - 3.3, cx + 3.3], [y0 + 6.2, y0 + 6.35], [z0 + 7.6, z0 + 8.1]), cub("lamp-blue", [cx - 0.3, cx + 0.3], [y0 + 6.2, y0 + 6.4], [z0 + 8.3, z0 + 8.7]));
  out.push(...bayHardware(bay, seed));
  return out;
}

/** One hangar shoulder, built where it stands in the ship. */
export function hangar(which: Side | BayId, cut: boolean, detail = 1, seed?: string): Piece[] {
  const bay: BayId = which === "starboard" || which === "port" ? BAY_OF[which] : which;
  const side = BAYS[bay].side;
  const rescue = BAYS[bay].kind === "rescue";
  seed ??= `hangar-${which}`;
  const h = bayBox(bay);
  const [y0, y1] = h.y;
  const [x0, x1] = h.x;
  const [z0, z1] = h.z;
  const sgn = side === "starboard" ? 1 : -1;
  const T = 1.4;
  const out: Piece[] = [];
  const o = { seed, scheme: WHITE, detail, density: 0.34, blanket: true };
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
    out.push(...frame(door, (openY[0] + openY[1]) / 2, (openLow + openHigh) / 2, openY[1] - openY[0], openHigh - openLow, 2.1, 1.3, "hull-grey"), ...frame(door, (openY[0] + openY[1]) / 2, (openLow + openHigh) / 2, openY[1] - openY[0] + 0.8, openHigh - openLow + 0.8, 0.5, 1.6, "hull-grey-dark"), ...hazard(door, openLow - 0.3, openY[0], openY[1], 0.5, 1.2), ...hazard(door, openHigh + 0.3, openY[0], openY[1], 0.5, 1.2));
    // the door's own hardware: a heavy I-beam track along the lintel and along the sill that the leaves run on, bolt rows on the frame, and a gusset at each corner
    const dn = door.sign as number;
    for (const z of [openHigh + 0.2, openLow - 0.2]) out.push(...ibeam("hull-grey", pt(door, openY[0] - 0.4, z, 0.9), pt(door, openY[1] + 0.4, z, 0.9), 0.9, 0.6, [dn, 0, 0]));
    for (const z of [openLow - 1.5, openHigh + 1.5]) out.push(...bolts(door, z, openY[0] - 1.5, openY[1] + 1.5, 1.6, 0.18));
    for (const e of [openY[0] - 1.5, openY[1] + 1.5]) out.push(...bolts(along(door), e, openLow - 1.5, openHigh + 1.5, 1.6, 0.18));
    for (const ea of [openY[0] - 0.9, openY[1] + 0.9]) for (const eb of [openLow - 0.9, openHigh + 0.9]) out.push(cub("hull-grey-dark", span(door.at + dn * 0.7, door.at + dn * 1.9), [ea - 0.9, ea + 0.9], [eb - 0.9, eb + 0.9]), rod("hull-yellow", pt(door, ea, eb, 1.9), pt(door, ea, eb, 2.0), 0.35, 12));
    const leaves = 5;
    const lw = (openY[1] - openY[0]) / leaves;
    const drawn = rescue ? 2 : 5;
    for (let k = 0; k < leaves; k++) {
      const a0 = openY[0] + k * lw;
      if (k >= leaves - drawn) {
        const from = out.length;
        const mid = (openLow + openHigh) / 2;
        const high = openHigh - openLow;
        const lift = 0.7 + (k % 2) * 0.3;
        // the leaf: a grey frame on the rails, in which the removable orange panels sit in a grid with a seam between each; hinges, actuators, rollers, stencils and a lamp
        out.push(on(door, a0 + lw / 2, mid, lw - 0.2, high, 0.1, 0.5, "hull-grey-dark"));
        // the leaf is a roll-up shutter drawn into a stack: horizontal slats of removable orange panel, each with a stiffening rib and a guide shoe in the tracks at its ends; the leaf's leading edge is hazard striped
        const slats = 14;
        const sh = (high - 0.9) / slats;
        for (let r = 0; r < slats; r++) {
          const pz = openLow + 0.45 + sh * (r + 0.5);
          const lit = (r + k) % 5 === 0;
          out.push(on(door, a0 + lw / 2, pz, lw - 0.9, sh - 0.14, 0.5, 0.74 + (r % 2) * 0.05, lit ? "hull-orange-worn" : "hull-orange"), rod("hull-grey-dark", pt(door, a0 + 0.55, pz, 0.78), pt(door, a0 + lw - 0.55, pz, 0.78), 0.05, 8), cub("hull-grey-dark", [door.at + (door.sign as number) * 0.5, door.at + (door.sign as number) * 0.9].sort((p2, q2) => p2 - q2) as [number, number], [a0 + 0.12, a0 + 0.55], [pz - 0.12, pz + 0.12]));
        }
        for (const e of [a0 + 0.2, a0 + lw - 0.2]) out.push(...ibeam("hull-grey-dark", pt(door, e, openLow + 0.2, lift + 0.2), pt(door, e, openHigh - 0.2, lift + 0.2), 0.7, 0.45, [door.sign as number, 0, 0]));
        for (const z of [openLow + high / 2]) out.push(...ibeam("hull-grey", pt(door, a0 + 0.2, z, lift + 0.2), pt(door, a0 + lw - 0.2, z, lift + 0.2), 0.55, 0.4, [door.sign as number, 0, 0]));
        // hinges: three barrels on the rail edge with a knuckle bracket each; actuators: two hydraulic cylinders from the lintel to the leaf with a piston rod and a clevis at each end
        for (const z of [openLow + 1.2, mid, openHigh - 1.2]) out.push(rod("hull-grey", pt(door, a0 + 0.1, z - 0.7, 0.6), pt(door, a0 + 0.1, z + 0.7, 0.6), 0.28, 12), rod("hull-grey-dark", pt(door, a0 + 0.1, z, 0.2), pt(door, a0 + 0.1, z, 0.6), 0.1, 8));
        for (const s of [-1, 1]) {
          const base = pt(door, a0 + lw / 2 + s * 1.2, openHigh + 0.4, 0.9);
          const tip = pt(door, a0 + lw / 2 + s * 1.2, openHigh - 2.5, lift + 0.2);
          const mid3: [number, number, number] = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2];
          out.push(rod("hull-grey-dark", base, mid3, 0.34, 12), rod("engine-pale", mid3, tip, 0.17, 12), rod("hull-grey", base, [base[0], base[1] + 0.05, base[2]], 0.5, 12), rod("hull-yellow", tip, [tip[0], tip[1], tip[2] + 0.01], 0.3, 12));
        }
        out.push(...hazard(along(door), a0 + lw - 0.4, openLow + 0.3, openHigh - 0.3, 0.5, 0.9), ...lamp(door, a0 + lw / 2, openHigh - 0.9, "amber", 0.2), ...stencil(door, `${51 + k}`, a0 + lw / 2, mid, 1.6));
        // the leaf swings up about the lintel when the door moves
        out.splice(from, out.length - from, ...moving(out.slice(from), { name: `door-leaf-${k}`, pivot: pt(door, a0 + lw / 2, openHigh, 0.5), axis: [0, -(door.sign as number), 0] }));
      }
    }
    // the opening seam: where the drawn leaves stop there is a dark gap, a tall hazard-striped leading edge on the first leaf, a column of lamps at each end of it and a limit switch on the track
    const lead = openY[0] + (leaves - drawn) * lw;
    out.push(on(door, lead - 0.15, (openLow + openHigh) / 2, 0.3, openHigh - openLow, 0.3, 0.95, "black"), ...Array.from({ length: Math.floor(openHigh - openLow - 0.4) }, (_, i) => cub(i % 2 ? "black" : "hazard", span(door.at + dn * 0.2, door.at + dn * 1.15), [lead - 0.05, lead + 0.75], [openLow + 0.2 + i, openLow + 1.2 + i])), cub("hull-grey-dark", span(door.at + dn * 0.9, door.at + dn * 1.5), [lead - 0.8, lead - 0.2], [openHigh - 0.4, openHigh + 0.4]), ...lamp(door, lead - 0.5, openHigh - 1.2, "red", 0.3), ...lamp(door, lead - 0.5, openLow + 1.2, "red", 0.3), ...lamp(door, lead - 0.5, (openLow + openHigh) / 2, "amber", 0.3));
    // the roller housing above the door: a heavy drum with end flanges and a motor, and a row of frame lights down both jambs and along the lintel
    out.push(rod("hull-grey-dark", pt(door, openY[0], openHigh + 1.0, 1.4), pt(door, openY[1], openHigh + 1.0, 1.4), 1.3, 20), rod("hull-grey", pt(door, openY[0] - 0.2, openHigh + 1.0, 1.4), pt(door, openY[0] + 0.5, openHigh + 1.0, 1.4), 1.7, 20), rod("hull-grey", pt(door, openY[1] - 0.5, openHigh + 1.0, 1.4), pt(door, openY[1] + 0.2, openHigh + 1.0, 1.4), 1.7, 20), cub("hull-grey-dark", [door.at + (door.sign as number) * 0.8, door.at + (door.sign as number) * 2.6].sort((p2, q2) => p2 - q2) as [number, number], [openY[0] - 2.4, openY[0]], [openHigh + 0.2, openHigh + 1.8]));
    for (let k = 0; k < 10; k++) out.push(...lamp(door, openY[0] + 1 + k * ((openY[1] - openY[0] - 2) / 9), openHigh + 0.4, k % 3 === 0 ? "blue" : "amber", 0.26));
    for (const e of [openY[0] - 0.5, openY[1] + 0.5]) for (let k = 0; k < 5; k++) out.push(...lamp(door, e, openLow + 1 + k * ((openHigh - openLow - 2) / 4), "amber", 0.26));
    out.push(...stencil(door, String(y0), openY[0] - 3, openLow - 1.4, 1.6), ...conduit(door, openHigh + 2.1, openY[0], openY[1], { count: 3, seed }), ...ladder(along(door), openY[1] + 3, openLow, openHigh), ...lamp(door, openY[0] - 1.5, openHigh, "amber"), ...lamp(door, openY[1] + 1.5, openHigh, "blue"));
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
  for (let y = y0 + 10; y < y1 - 6; y += 22) for (const z of [z0 + 4, z1 - 4]) out.push(...roundStrut("hull-grey-dark", [side === "starboard" ? x0 : x1, y, z], [sgn * 8.6, y + (side === "starboard" ? -8 : 8), z * 0.3], 0.55), cub("hull-yellow", sgn === 1 ? [x0 - 0.5, x0 + 0.3] : [x1 - 0.3, x1 + 0.5], [y - 0.7, y + 0.7], [z - 0.7, z + 0.7]));
  // the inside, always: it is what shows through the bay door
  out.push(...inside(bay, seed), ...exteriorSaddles(bay));
  return out;
}

/** A cradle: two long I-beams and cross beams on feet, a clamp arm on each side at the ends and the middle (a column, a hydraulic cylinder and a jaw with a pad), and hazard-striped chocks. No craft in it. */
export function cradle(cx: number, cy: number, len: number, wide: number, floor: number): Piece[] {
  const half = wide / 2;
  const out: Piece[] = [];
  // the cradle: two long I-beams and cross beams on feet, with a pad at each clamp
  for (const x of [cx - half, cx + half]) out.push(...ibeam("hull-grey", [x, cy - len / 2, floor + 0.7], [x, cy + len / 2, floor + 0.7], 1.0, 0.7, [0, 0, 1]));
  for (let k = 0; k <= 4; k++) out.push(...ibeam("hull-grey-dark", [cx - half, cy - len / 2 + (k * len) / 4, floor + 0.7], [cx + half, cy - len / 2 + (k * len) / 4, floor + 0.7], 0.8, 0.5, [0, 0, 1]));
  for (const x of [cx - half, cx + half]) for (const y of [cy - len / 2, cy + len / 2]) out.push(cub("hull-grey-dark", [x - 0.7, x + 0.7], [y - 0.7, y + 0.7], [floor, floor + 0.3]), rod("hull-grey", [x, y, floor + 0.3], [x, y, floor + 0.2], 0.6, 12));
  // the clamp arms: a column on each side at the ends and the middle, a hydraulic cylinder to a jaw that closes over where the hull would lie, a pad on the jaw and a lamp
  for (const side2 of [-1, 1]) for (const dy of [-len / 2 + 2, 0, len / 2 - 2]) {
    const bx = cx + side2 * (half + 0.9);
    const by = cy + dy;
    const top: [number, number, number] = [bx - side2 * 1.6, by, floor + 4.2];
    out.push(...roundStrut("hull-grey-dark", [bx, by, floor + 0.7], [bx, by, floor + 3.6], 0.35), ...roundStrut("engine-pale", [bx + side2 * 1.8, by, floor + 0.7], [bx + side2 * 0.4, by, floor + 3.2], 0.2), rod("hull-grey-dark", [bx, by, floor + 3.6], top, 0.3, 12), cub("black", [top[0] - 0.9, top[0] + 0.9], [top[1] - 1.1, top[1] + 1.1], [top[2] - 0.35, top[2] + 0.05]), cub("lamp-amber", [bx - 0.2, bx + 0.2], [by - 0.2, by + 0.2], [floor + 3.7, floor + 3.95]));
  }
  // chocks at the foot of each cradle, hazard-striped
  for (const x of [cx - half - 2.2, cx + half + 2.2]) out.push(cub("hazard", [x - 0.5, x + 0.5], [cy - 1, cy + 1], [floor, floor + 0.5]));
  return out;
}

/** The hardware of an empty bay: cradles with clamp arms and chocks, guide rails from each cradle out through the door, deck markings, a fuel and service umbilical boom with its hoses, and floodlights. Round tubes and I-beams. */
function bayHardware(bay: BayId, seed: string): Piece[] {
  const side = BAYS[bay].side;
  const h = bayBox(bay);
  const [y0, y1] = h.y;
  const [z0, z1] = h.z;
  const cx = h.centre;
  const floor = z0 + 1.7;
  const toDoor = side === "starboard" ? 1 : -1;
  const wallX = side === "starboard" ? h.x[0] + 1.4 : h.x[1] - 1.4;
  const out: Piece[] = [...starshipBay(bay)];
  const by0 = (y0 + y1) / 2;
  const bz = floor + 7.2;
  out.push(cub("hull-grey-dark", [wallX - 0.4, wallX + 0.4 * toDoor + toDoor * 2.4].sort((p, q) => p - q) as [number, number], [by0 - 1.4, by0 + 1.4], [floor, bz + 1]), rod("hull-grey", [wallX + toDoor * 1.4, by0, bz], [wallX + toDoor * 1.4, by0, bz + 0.6], 1.1, 14));
  const tip = wallX + toDoor * 14;
  out.push(...ibeam("hull-yellow", [wallX + toDoor * 1.4, by0, bz + 0.2], [tip, by0, bz + 0.2], 1.0, 0.7, [0, 0, 1]), ...roundStrut("hull-grey-dark", [wallX + toDoor * 1.4, by0, bz - 1.6], [wallX + toDoor * 9, by0, bz + 0.1], 0.3));
  const loops: [Parameters<typeof pipeRun>[0], number][] = [["fuel", -0.8], ["coolant", 0], ["copper", 0.8]];
  for (const [mat, dy] of loops) out.push(...pipeRun(mat, [[tip - toDoor * 0.5, by0 + dy, bz], [tip, by0 + dy, bz - 2], [tip + toDoor * 1.4, by0 + dy, bz - 4.5], [tip + toDoor * 1.4, by0 + dy, floor + 3.6]], 0.2, { clampEvery: 2.2 }));
  out.push(cub("hull-grey-dark", [tip + toDoor * 1.4 - 0.8, tip + toDoor * 1.4 + 0.8], [by0 - 1.5, by0 + 1.5], [floor + 2.8, floor + 3.8]), cub("lamp-amber", [tip + toDoor * 1.4 - 0.3, tip + toDoor * 1.4 + 0.3], [by0 - 1.5, by0 + 1.5], [floor + 3.8, floor + 3.95]));
  // the hose reel on the pylon: a drum with flanges
  out.push(rod("hull-grey", [wallX + toDoor * 1, by0 - 1.3, bz - 3], [wallX + toDoor * 1, by0 + 1.3, bz - 3], 1.4, 16), rod("hull-grey-dark", [wallX + toDoor * 1, by0 - 1.5, bz - 3], [wallX + toDoor * 1, by0 - 1.3, bz - 3], 1.9, 16), rod("hull-grey-dark", [wallX + toDoor * 1, by0 + 1.3, bz - 3], [wallX + toDoor * 1, by0 + 1.5, bz - 3], 1.9, 16));
  // floodlights on the ceiling beams: eight round housings with lenses, brackets and a guard ring, pointing down at the cradles
  const lz = z1 - 3.4 - 1;
  for (let k = 0; k < 8; k++) {
    const fy = y0 + 8 + k * ((y1 - y0 - 16) / 7);
    for (const fx of [cx - 5, cx + 5]) if ((k + (fx > cx ? 1 : 0)) % 2 === 0) out.push(rod("hull-grey-dark", [fx, fy, lz + 0.8], [fx, fy, lz + 0.2], 0.12, 8), rod("hull-grey-dark", [fx, fy, lz + 0.2], [fx, fy, lz - 0.7], 0.55, 14), rod("lamp-amber", [fx, fy, lz - 0.7], [fx, fy, lz - 0.85], 0.45, 14), rod("hull-grey", [fx, fy, lz - 0.6], [fx, fy, lz - 0.7], 0.7, 14));
  }
  void seed;
  return out;
}
