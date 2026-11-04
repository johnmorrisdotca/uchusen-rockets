// The main drive and thrust frame, station 0 to 58 m: two flush fusion-triggered nozzles with their throat rings, field coils, feed manifolds and a blast bulkhead behind them, and four smaller plasma verniers at the
// aft corners. The frame is a ring of plated slabs round the two bores; the funnel of its taper runs in to the engineering module. A cutaway leaves the starboard side open. Pure: no three.js and no DOM.
import { type Piece, collar, cub, prism, quad, rng, rod, seams, type Vec3 } from "./adapter.ts";
import { DRIVE } from "./dims.ts";
import { conduit, faceOf, frame, hatch, hazard, lamp, ladder, on, pt, rail, skin, SPINE, stencil, vent, WHITE } from "./faces.ts";
import { capsule, collarAt, nozzleProfile, nozzleRadiusAt, OPEN_STARBOARD, ringAt, tubeAt } from "./shapes.ts";

const HX = DRIVE.hx;
const HZ = DRIVE.hz;
const WALL = 41;
const TAPER = 34;
const H = DRIVE.chamberY;
const END: readonly [number, number] = [14, 13];

/** One magnetic nozzle at (x, 0): the bell wall and its liner, the throat rings, the field coils with their spars, the feed manifold and the chamber head. */
export function nozzle(x: number, cut: boolean, seed: string): Piece[] {
  const out: Piece[] = [];
  const wall = nozzleProfile(DRIVE.exitY, DRIVE.throatY, H, DRIVE.exitR, DRIVE.throatR, DRIVE.chamberR);
  const arc = cut && x > 0 ? OPEN_STARBOARD : undefined;
  const lathe = (material: "bell" | "bell-inside" | "engine-metal", profile: readonly (readonly [number, number])[], extra = {}): Piece => ({ kind: "lathe", material, at: [x, 0], segs: 40, profile, ...(arc ? { arc } : {}), ...extra });
  out.push(lathe("bell", wall.map(([r, y]) => [r + 0.9, y] as const), { body: true, outline: true }));
  out.push(lathe("bell-inside", wall.map(([r, y]) => [r + 0.1, y] as const)));
  // the liner: tiles lie in rings on the inside of the throat
  for (let y = DRIVE.exitY + 1; y < DRIVE.throatY; y += 2.6) out.push({ ...lathe("engine-metal", [[nozzleRadiusAt(wall, y) + 0.04, y], [nozzleRadiusAt(wall, y + 0.5) + 0.04, y + 0.5]]), only: "mesh" });
  // field coils: copper rings round the bell, a coil every 1.8 m, wider ones where the bell is wide
  for (let y = DRIVE.exitY + 1.5; y < DRIVE.throatY + 5; y += 1.8) {
    const r = nozzleRadiusAt(wall, y) + 0.9 + 0.5;
    out.push(ringAt("coil", x, 0, r, y, 0.5, arc ? { arc } : {}));
    out.push(ringAt("hull-grey-dark", x, 0, r + 0.25, y + 0.9, 0.12, arc ? { arc } : {}));
  }
  // spars: eight beams along the bell holding the coils, each with a clamp at every coil
  for (let k = 0; k < 8; k++) {
    const az = (Math.PI / 4) * k;
    if (arc && Math.sin(az) > 0.01) continue;
    const at = (y: number): Vec3 => [x + (nozzleRadiusAt(wall, y) + 2.1) * Math.sin(az), y, (nozzleRadiusAt(wall, y) + 2.1) * Math.cos(az)];
    out.push(rod("hull-grey-dark", at(DRIVE.exitY + 0.5), at(DRIVE.throatY + 5), 0.28, 6));
  }
  // throat rings: three steel collars at the narrowest part, each with bolts
  for (const [i, y] of [DRIVE.throatY - 3, DRIVE.throatY, DRIVE.throatY + 3].entries()) {
    out.push(collarAt("engine-pale", x, 0, DRIVE.throatR + 0.8, DRIVE.throatR + 2.2 + i * 0.4, y - 0.5, y + 0.5, arc ? { arc } : {}));
    out.push(ringAt("copper", x, 0, DRIVE.throatR + 2.7 + i * 0.4, y, 0.2, arc ? { arc } : {}));
  }
  // exit lip: a heavy ring with a hazard band and the shutter leaves that close over it in the stowed state
  out.push(collarAt("hull-orange", x, 0, DRIVE.exitR + 0.8, DRIVE.exitR + 2.6, DRIVE.exitY - 0.8, DRIVE.exitY + 0.6, arc ? { arc } : {}));
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24;
    if (arc && Math.sin(a) > 0) continue;
    const r = DRIVE.exitR + 1.7;
    out.push(cub(i % 2 ? "black" : "hazard", [x + r * Math.sin(a) - 0.5, x + r * Math.sin(a) + 0.5], [DRIVE.exitY - 0.9, DRIVE.exitY - 0.82], [r * Math.cos(a) - 0.5, r * Math.cos(a) + 0.5]));
  }
  // chamber head: the injector plate with its ring of feed stubs, and the manifold that carries fuel in from the spine
  out.push(tubeAt("hull-grey-dark", x, 0, DRIVE.chamberR + 1.1, H, H + 4, { segs: 24 }));
  for (let k = 0; k < 12; k++) {
    const a = (Math.PI * 2 * k) / 12;
    if (arc && Math.sin(a) > 0) continue;
    const p0: Vec3 = [x + (DRIVE.chamberR + 1) * Math.sin(a), H + 3, (DRIVE.chamberR + 1) * Math.cos(a)];
    out.push(rod("coolant", p0, [x + (DRIVE.chamberR + 3.3) * Math.sin(a), H + 4.5, (DRIVE.chamberR + 3.3) * Math.cos(a)], 0.34, 6), rod("copper", [p0[0], H + 0.5, p0[2]], [p0[0], H + 3, p0[2]], 0.22, 6));
  }
  out.push(ringAt("coolant", x, 0, DRIVE.chamberR + 3.3, H + 4.5, 0.45, arc ? { arc } : {}), ringAt("coolant", x, 0, DRIVE.chamberR + 2.4, H + 1.5, 0.38, arc ? { arc } : {}));
  // gimbals: two actuators at right angles, each a cylinder and a rod on a clevis
  for (const az of [Math.PI / 2, Math.PI]) {
    if (arc && Math.sin(az) > 0.01) continue;
    const base: Vec3 = [x + 15.5 * Math.sin(az), H + 4.5, 15.5 * Math.cos(az)];
    const tip: Vec3 = [x + (DRIVE.chamberR + 1.6) * Math.sin(az), H - 4, (DRIVE.chamberR + 1.6) * Math.cos(az)];
    out.push(rod("hull-grey-dark", base, [(base[0] + tip[0]) / 2, H, (base[2] + tip[2]) / 2], 0.7, 8), rod("engine-pale", [(base[0] + tip[0]) / 2, H, (base[2] + tip[2]) / 2], tip, 0.35, 8), rod("lamp-amber", [base[0], base[1], base[2]], [base[0], base[1] + 0.5, base[2]], 0.3, 6));
  }
  void seed;
  return out;
}

/** A vernier: a small bell with three coils, a feed line, a gimbal box and a pod. */
export function vernier(x: number, z: number): Piece[] {
  const v = DRIVE.vernier;
  const wall = nozzleProfile(0.2, 4.2, 8, v.r, 0.7, 1.2, 6);
  const out: Piece[] = [{ kind: "lathe", material: "bell", at: [x, z], segs: 20, profile: wall.map(([r, y]) => [r + 0.12, y] as const), body: true, outline: true }, { kind: "lathe", material: "bell-inside", at: [x, z], segs: 20, profile: wall }];
  for (const y of [1.2, 2.4, 3.6]) out.push(ringAt("coil", x, z, nozzleRadiusAt(wall, y) + 0.3, y, 0.16));
  out.push(cub("hull-grey-dark", [x - 2.4, x + 2.4], [3.6, 8.2], [z - 2.4, z + 2.4]), cub("hull-orange", [x - 2.6, x + 2.6], [8.2, 8.6], [z - 2.6, z + 2.6]));
  out.push(rod("coolant", [x, 8.4, z], [x * 0.6, 12, z * 0.7], 0.22, 6), cub("lamp-amber", [x - 0.3, x + 0.3], [-0.05, 0.1], [z + 1.2, z + 1.8]));
  return out;
}

/** The plated slopes of the taper from the frame's back to the spine: four quads, each in a grid of raised tiles. */
function taper(seed: string, detail: number): Piece[] {
  const out: Piece[] = [];
  const corner = (sx: number, sz: number, back: boolean): Vec3 => (back ? [sx * END[0], 58, sz * END[1]] : [sx * HX, TAPER, sz * HZ]);
  const sides: [Vec3, Vec3, Vec3, Vec3, Vec3][] = [
    [corner(-1, 1, false), corner(1, 1, false), corner(1, 1, true), corner(-1, 1, true), [0, 0.3, 1]],
    [corner(-1, -1, false), corner(1, -1, false), corner(1, -1, true), corner(-1, -1, true), [0, 0.3, -1]],
    [corner(1, -1, false), corner(1, 1, false), corner(1, 1, true), corner(1, -1, true), [1, 0.4, 0]],
    [corner(-1, -1, false), corner(-1, 1, false), corner(-1, 1, true), corner(-1, -1, true), [-1, 0.4, 0]],
  ];
  const random = rng(`${seed}/taper`);
  sides.forEach(([a, b, c, d, out3], s) => {
    out.push(quad("hull-grey-dark", a, b, c, d, 0.5, { only: undefined }));
    const cols = Math.max(2, Math.round((s < 2 ? 9 : 5) * Math.sqrt(detail)));
    const rows = Math.max(1, Math.round(4 * Math.sqrt(detail)));
    const lerp = (p: Vec3, q: Vec3, t: number): Vec3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const f = (u: number, v: number): Vec3 => lerp(lerp(a, b, u), lerp(d, c, u), v);
        const g = 0.04;
        const [u0, u1, v0, v1] = [i / cols + g, (i + 1) / cols - g, j / rows + g, (j + 1) / rows - g];
        const pts = [f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)];
        const n = Math.hypot(...out3);
        const lift = 0.3;
        const moved = pts.map((p) => [p[0] + (out3[0] / n) * lift, p[1] + (out3[1] / n) * lift, p[2] + (out3[2] / n) * lift] as Vec3);
        const roll = random();
        out.push(quad(roll < 0.12 ? "hull-orange-worn" : roll < 0.4 ? "hull-white-worn" : roll < 0.7 ? "hull-white" : "hull-grey", moved[0], moved[1], moved[2], moved[3], 0.2));
      }
  });
  return out;
}

/** The aft frame and its taper. */
export function driveFrame(cut: boolean, detail = 1, seed = "drive"): Piece[] {
  const out: Piece[] = [];
  const nx = DRIVE.nozzleX;
  const rim = 7;
  // the frame: top and bottom slabs, the two side slabs and the web between the bores, from the aft face to the taper
  out.push(prism("hull-grey-dark", [[-HX + rim, HZ - 7], [HX - rim, HZ - 7], [HX - rim, HZ], [-HX + rim, HZ]], 0, TAPER, { only: undefined }));
  out.push(prism("hull-grey-dark", [[-HX + rim, -HZ], [HX - rim, -HZ], [HX - rim, -HZ + 7], [-HX + rim, -HZ + 7]], 0, TAPER, { only: undefined }));
  out.push(prism("hull-grey-dark", [[-HX, -HZ + rim], [-HX + 7, -HZ + rim], [-HX + 7, HZ - rim], [-HX, HZ - rim]], 0, TAPER, { only: undefined }));
  if (!cut) out.push(prism("hull-grey-dark", [[HX - 7, -HZ + rim], [HX, -HZ + rim], [HX, HZ - rim], [HX - 7, HZ - rim]], 0, TAPER, { only: undefined }));
  // the corners, cut at 45 degrees
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) if (!(cut && sx > 0)) out.push(prism("hull-grey-dark", [[sx * (HX - rim), sz * HZ], [sx * HX, sz * (HZ - rim)], [sx * HX, sz * (HZ - 7)], [sx * (HX - 7), sz * (HZ - 7)], [sx * (HX - 7), sz * HZ]].map(([x, z]) => [x, z] as [number, number]), 0, TAPER, { only: undefined }));
  out.push(cub("hull-grey-dark", [-3, 3], [0, TAPER], [-HZ, HZ], { only: undefined }));
  out.push(cub("hull-grey-dark", [-HX, HX], [TAPER - 1, TAPER + 0.5], [-HZ, HZ], { only: undefined }));
  // the bores: a socket of tube round each throat
  for (const sx of [-1, 1]) out.push(tubeAt("hull-grey", sx * nx, 0, DRIVE.exitR + 3.6, 0, 18, { segs: 40, only: undefined, ...(cut && sx > 0 ? { arc: OPEN_STARBOARD } : {}) }));
  out.push(...nozzle(-nx, cut, seed), ...nozzle(nx, cut, seed));
  // the blast bulkhead: a slab behind the bores, ribbed, with a hazard band
  out.push(cub("panel-dark", [-30, 30], [WALL, WALL + 2.4], [-16, 16], { only: undefined }));
  const bulk = { n: "y" as const, sign: 1 as const, at: WALL + 2.4, a: [-16, 16] as const, b: [-30, 30] as const };
  for (let b = -26; b < 28; b += 6) out.push(on(bulk, 0, b, 30, 0.6, 0, 0.5, "hull-grey-dark"));
  for (let a = -12; a < 14; a += 8) out.push(on(bulk, a, 0, 0.7, 56, 0, 0.45, "hull-grey"));
  for (const b of [-27, 27]) out.push(...hazard(bulk, b, -16, 16, 1.2, 1.8));
  // the aft face: plating round the bores, a frame on each bore, shutters in the orange of removable shields
  const aft = { n: "y" as const, sign: -1 as const, at: 0, a: [-HZ, HZ] as const, b: [-HX, HX] as const };
  out.push(...skin(aft, WHITE, seed, { detail, cell: [4, 4], raise: 0.3, blocks: 0.25, skip: (a, b) => Math.hypot(b - nx, a) < DRIVE.exitR + 3.4 || Math.hypot(b + nx, a) < DRIVE.exitR + 3.4 }));
  for (const sx of [-1, 1]) {
    out.push(...frame(aft, 0, sx * nx, DRIVE.exitR * 2 + 7.2, DRIVE.exitR * 2 + 7.2, 1.2, 1.2, "hull-orange"));
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      out.push(...lamp(aft, (DRIVE.exitR + 4.4) * Math.cos(a), sx * nx + (DRIVE.exitR + 4.4) * Math.sin(a), i % 2 ? "amber" : "blue", 0.22));
    }
  }
  for (const [x, z] of [[-DRIVE.vernier.x, DRIVE.vernier.z], [DRIVE.vernier.x, DRIVE.vernier.z], [-DRIVE.vernier.x, -DRIVE.vernier.z], [DRIVE.vernier.x, -DRIVE.vernier.z]] as const) out.push(...vernier(x, z));
  // the four flanks: plating, heat-sink louvres, hatches, rails, conduits, ladders and our own stencils
  const top = faceOf({ x: [-HX, HX], y: [0, TAPER], z: [-HZ, HZ] }, "z", 1);
  const bottom = faceOf({ x: [-HX, HX], y: [0, TAPER], z: [-HZ, HZ] }, "z", -1);
  const stbd = faceOf({ x: [-HX, HX], y: [0, TAPER], z: [-HZ, HZ] }, "x", 1);
  const port = faceOf({ x: [-HX, HX], y: [0, TAPER], z: [-HZ, HZ] }, "x", -1);
  const faces = cut ? [top, bottom, port] : [top, bottom, stbd, port];
  for (const f of faces) out.push(...skin(f, WHITE, seed, { detail, cell: f.n === "z" ? [5, 4.5] : [5, 3.5], raise: 0.28, blocks: 0.22 }));
  for (const f of [top, bottom]) {
    for (const x of [-38, -29, -20, 20, 29, 38]) out.push(...vent(f, x, 8, 6, 3.2, 8));
    out.push(...conduit(f, 16, -42, 42, { count: 4, seed }), ...conduit(f, 28, -42, 42, { count: 3, seed }), ...rail(f, 36, -43, 43));
    out.push(...hatch(f, -8, 22, 2.4), ...hatch(f, 8, 22, 1.6), ...stencil(f, f === top ? "03" : "30", 0, 4, 3));
  }
  for (const f of [stbd, port]) {
    out.push(...hatch(f, 12, 6, 2), ...hatch(f, 26, -6, 2), ...conduit(f, 0, 3, TAPER - 3, { count: 3, seed }), ...ladder(f, 12, 4, TAPER - 4), ...rail(f, -14, 3, TAPER - 3));
  }
  out.push(...taper(seed, detail));
  // the spine collar where the frame meets engineering
  out.push(...collar("L", 58, 1));
  out.push(seams("feature", [[[-HX, 0, HZ], [HX, 0, HZ], [HX, TAPER, HZ], [-HX, TAPER, HZ], [-HX, 0, HZ]], [[-HX, 0, -HZ], [HX, 0, -HZ], [HX, TAPER, -HZ], [-HX, TAPER, -HZ], [-HX, 0, -HZ]]]));
  void [SPINE, capsule, collarAt, pt];
  return out;
}
