// The main drive, station 0 to 58 m: two DCD nozzles with their throat rings, field coils, feed manifolds and chamber heads, each in its own round shroud that narrows aft so the nozzle lips stand out past it. The shroud is
// enclosed, with service windows in places that show the field coils, the throat rings and the feed lines; a neck carries the feed lines on to the hull, and four plasma verniers stand at the aft corners. The shadow-shield collar that
// steps from the engines to the hull is its own part (`shadowCollar`), swappable with none. A cutaway leaves the starboard side open. Pure: no three.js and no DOM.
import { collar, cub, pipeRun, type Lathe, type Piece, quad, rng, rod, roundStrut, tileShield, type Vec3 } from "./adapter.ts";
import { lampHalo, lightPool, sternLamp } from "../lights.ts";
import { DRIVE, SHADOW_COLLAR, SHROUD } from "./dims.ts";
import { hexClad } from "./hex.ts";
import { collarAt, nozzleProfile, nozzleRadiusAt, OPEN_STARBOARD, ringAt, tubeAt } from "./shapes.ts";

const H = DRIVE.chamberY;

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

/** The radius of the shroud at a height: a smooth rise from its aft lip to the fore end, so it narrows aft. */
const shroudAt = (y: number): number => SHROUD.rAft + (SHROUD.rFore - SHROUD.rAft) * Math.sin(((y - SHROUD.start) / (SHROUD.end - SHROUD.start)) * (Math.PI / 2)) ** 1.3;

/** The arcs of a circle left when some windows are cut out of it: each window is a centre and a width, in degrees round from +Z towards +X. */
function arcsLeft(windows: readonly (readonly [number, number])[]): [number, number][] {
  const cuts = windows.map(([c, w]) => [((c - w / 2 + 360) % 360), ((c + w / 2 + 360) % 360)] as const).sort((p, q) => p[0] - q[0]);
  const deg = (v: number) => (v * Math.PI) / 180;
  if (!cuts.length) return [[0, 2 * Math.PI]];
  const out: [number, number][] = [];
  let from = cuts[cuts.length - 1][1];
  for (const [a, b] of cuts) {
    const start = from;
    const end = a < start ? a + 360 : a;
    if (end > start) out.push([deg(start), deg(end)]);
    from = b;
  }
  return out;
}

/** The shroud of one nozzle: faceted bands in white blanket and gold foil, ring frames and round stringers between, windows cut in some bands. `side` is the nozzle's side (+1 starboard) and the way its outer window faces. */
function shroud(x: number, side: 1 | -1, cut: boolean, detail: number, seed: string, hex: boolean): Piece[] {
  const out: Piece[] = [];
  const random = rng(`${seed}/shroud/${side}`);
  const open = cut && side === 1;
  const outward = side === 1 ? 90 : 270;
  // the windows by band: the coils from the side, the throat rings and feed lines from above and below, the chamber heads from above
  const bands: { y: [number, number]; material: "hull-white" | "gold" | "hull-white-worn"; windows: [number, number][] }[] = [
    { y: [7, 13], material: "hull-white", windows: [] },
    { y: [13, 19], material: "gold", windows: [[outward, 84]] },
    { y: [19, 25], material: "hull-white-worn", windows: [[0, 56], [180, 56]] },
    { y: [25, 31], material: "gold", windows: [[outward, 70]] },
    { y: [31, 36], material: "hull-white", windows: [[0, 64]] },
  ];
  for (const band of bands) {
    const ys = Array.from({ length: 4 }, (_, i) => band.y[0] + ((band.y[1] - band.y[0]) * i) / 3);
    const profile = ys.map((y) => [shroudAt(y) + 0.5, y] as const);
    const arcs = open ? [[Math.PI, 2 * Math.PI] as [number, number]] : arcsLeft(band.windows);
    for (const [a0, a1] of arcs) out.push({ kind: "lathe", material: hex ? "tile" : band.material, at: [x, 0], segs: hex ? 48 : 16, profile, arc: () => [a0, a1], body: true, outline: true });
    // a window's frame: an axial bar at each edge and a flange ring at each end
    for (const [c, w] of band.windows) {
      if (open) continue;
      for (const e of [c - w / 2, c + w / 2]) {
        const a = (e * Math.PI) / 180;
        const p = (y: number): Vec3 => [x + (shroudAt(y) + 0.7) * Math.sin(a), y, (shroudAt(y) + 0.7) * Math.cos(a)];
        out.push(rod("hull-grey-dark", p(band.y[0]), p(band.y[1]), 0.28, 8));
      }
    }
  }
  // Ariake: the bands are clad in rows of raised near-black hexagonal tiles, clear of the ring frames and the window frames
  if (hex) {
    const rings = [7.1, 13, 19, 25, 31, 36];
    out.push(...hexClad({ radius: (y) => shroudAt(y) + 0.5, y0: 7.4, y1: 35.8, at: [x, 0], tile: detail < 0.5 ? 1.5 : 1.05, arcs: (y) => {
      if (rings.some((r) => Math.abs(y - r) < 1)) return [];
      if (open) return [[Math.PI, 2 * Math.PI]];
      const band = bands.find((b) => y >= b.y[0] && y < b.y[1]);
      return arcsLeft(band?.windows ?? []).map(([a0, a1]) => [a0 + 0.07, a1 - 0.07] as [number, number]).filter(([a0, a1]) => a1 > a0);
    } }, `${seed}/${side}`));
  }
  // ring frames between the bands, standing proud, with a row of bolts
  for (const y of [7.1, 13, 19, 25, 31, 36]) {
    out.push(ringAt("hull-grey", x, 0, shroudAt(y) + 0.5, y, 0.5, open ? { arc: () => [Math.PI, 2 * Math.PI] } : {}));
    if (detail > 0.5) for (let k = 0; k < 24; k++) {
      const a = (Math.PI * 2 * k) / 24;
      if (open && Math.sin(a) > 0) continue;
      out.push(rod("hull-grey-dark", [x + (shroudAt(y) + 0.95) * Math.sin(a), y - 0.15, (shroudAt(y) + 0.95) * Math.cos(a)], [x + (shroudAt(y) + 0.95) * Math.sin(a), y + 0.15, (shroudAt(y) + 0.95) * Math.cos(a)], 0.14, 6));
    }
  }
  // stringers: round rods along the shroud between the windows, every twenty degrees
  for (let a = 5; a < 360 && !hex; a += 20 / Math.max(0.3, detail)) {
    const r = (a * Math.PI) / 180;
    if (open && Math.sin(r) > 0) continue;
    if (Math.abs(((a - outward + 540) % 360) - 180) < 52 || a < 32 || a > 328 || Math.abs(a - 180) < 32) continue;
    out.push(rod(random() < 0.3 ? "hull-grey" : "hull-grey-dark", [x + (shroudAt(7) + 0.7) * Math.sin(r), 7, (shroudAt(7) + 0.7) * Math.cos(r)], [x + (shroudAt(36) + 0.7) * Math.sin(r), 36, (shroudAt(36) + 0.7) * Math.cos(r)], 0.2, 8));
  }
  // the fore end: a flat cap, and the aft lip where the shroud ends and the nozzle's own lip stands past it
  out.push({ kind: "lathe", material: "hull-grey-dark", at: [x, 0], segs: 16, profile: [[0.001, 36], [shroudAt(36) + 0.5, 36]], ...(open ? { arc: () => [Math.PI, 2 * Math.PI] as const } : {}) });
  out.push(ringAt("hull-orange", x, 0, shroudAt(7) + 0.2, 7, 0.45, open ? { arc: () => [Math.PI, 2 * Math.PI] } : {}));
  return out;
}

/** The main drive: both nozzles in their shrouds, the neck to the hull with the feed lines, and the verniers. */
export function driveFrame(cut: boolean, detail = 1, seed = "drive", hex = false): Piece[] {
  const out: Piece[] = [];
  const nx = DRIVE.nozzleX;
  out.push(...nozzle(-nx, cut, seed), ...nozzle(nx, cut, seed), ...shroud(-nx, -1, cut, detail, seed, hex), ...shroud(nx, 1, cut, detail, seed, hex));
  // a web between the shrouds where they meet, so the two read as one body: a faceted lens of white blanket
  out.push({ kind: "lathe", material: hex ? "tile" : "hull-white", at: [0, 0], segs: 8, profile: [[0.001, 14], [4.6, 18], [5.2, 26], [4.6, 34], [0.001, 36]], ...(cut ? { arc: () => [Math.PI, 2 * Math.PI] as const } : {}) });
  // the neck: a round tube from the shrouds to the engineering module, with the feed lines running along it in round pipes with bends, flanges and clamps
  out.push(tubeAt("hull-grey-dark", 0, 0, 9.5, 36, 58, { segs: 20, body: true, outline: true }), ...ringsOn(9.5, [40, 46, 52], 0.35));
  for (const [sx, mat] of [[-1, "coolant"], [1, "copper"]] as const) {
    out.push(...pipeRun(mat, [[sx * (nx - 6), 34, 14], [sx * 11, 40, 11.5], [sx * 11, 56, 11.5]], 0.5, { clampEvery: 5, bracket: [0, 0, -1] }));
    out.push(...pipeRun(sx < 0 ? "copper" : "coolant", [[sx * (nx - 6), 34, -14], [sx * 11, 40, -11.5], [sx * 11, 56, -11.5]], 0.5, { clampEvery: 5, bracket: [0, 0, 1] }));
  }
  // the verniers at the aft corners, each held to its shroud by two round struts
  for (const [x, z] of [[-DRIVE.vernier.x, DRIVE.vernier.z], [DRIVE.vernier.x, DRIVE.vernier.z], [-DRIVE.vernier.x, -DRIVE.vernier.z], [DRIVE.vernier.x, -DRIVE.vernier.z]] as const) {
    out.push(...vernier(x, z));
    const sx = Math.sign(x);
    for (const dy of [3, 7]) out.push(...roundStrut("hull-grey-dark", [x, dy + 4, z * 0.8], [sx * nx + sx * Math.hypot(shroudAt(11) - 2, 0) * 0.9, 11, z * 0.45], 0.4));
  }
  out.push(...collar("L", 58, 1));
  out.push(...sternLamp([0, 14, -(SHROUD.rAft + 1)]), ...lampHalo("nav-white", [0, 14, -(SHROUD.rAft + 1)]), ...lightPool({ o: [0, 22, -(SHROUD.rAft + 0.4)], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, -1] }, 12));
  return out;
}

/** Rings of structure round a tube. */
function ringsOn(r: number, ys: readonly number[], minor: number): Piece[] {
  return ys.map((y): Lathe => ringAt("hull-grey", 0, 0, r + minor, y, minor));
}

/** The shadow-shield collar: a round ceramic-tile cone that steps from the engines to the hull, as the shadow shields of the nuclear-thermal studies do, with ring frames, a row of bolts and struts to the shrouds. Its own part: swap it for none. */
export function shadowCollar(cut: boolean, detail = 1, seed = "shield-collar", hex = false): Piece[] {
  const { y, length, r } = SHADOW_COLLAR;
  const profile: [number, number][] = [[r, y], [r, y + 3], [r - 3, y + 6], [r * 0.7, y + 13], [r * 0.46, y + 19], [14, y + length]];
  const shield = hex ? hexShield(profile, seed, detail) : tileShield(profile, seed, 24, 20);
  const out: Piece[] = cut ? shield.map((p) => (p.kind === "lathe" ? { ...p, arc: () => [Math.PI, 2 * Math.PI] as const } : p)).filter((p) => p.kind !== "plate" || p.frame.o[0] <= 0.5) : shield;
  for (const yy of [y + 3, y + 6, y + 13, y + 19]) out.push(ringAt("hull-grey", 0, 0, (profile.find(([, py]) => py === yy)?.[0] ?? r) + 0.4, yy, 0.45, cut ? { arc: () => [Math.PI, 2 * Math.PI] } : {}));
  for (let k = 0; k < 32 * Math.min(1, detail + 0.3); k++) {
    const a = (Math.PI * 2 * k) / 32;
    if (cut && Math.sin(a) > 0) continue;
    out.push(rod("hull-grey-dark", [r * Math.sin(a), y + 0.4, r * Math.cos(a)], [r * Math.sin(a), y + 1.4, r * Math.cos(a)], 0.3, 8));
  }
  // the cone's dress: removable orange shield panels and gold foil in rows, hatches, lamps, a hazard band, a number, and round pipes with bends from the shrouds to the neck
  const rows: [number, number, "hull-orange" | "gold" | "hull-white"][] = [[y + 7, y + 11, "hull-orange"], [y + 14, y + 18, "gold"], [y + 19.5, y + 21.5, "hull-white"]];
  const at = (yy: number, a: number, lift: number): Vec3 => {
    const f = (yy - y) / length;
    const seg = profile.findIndex(([, py], i) => i + 1 < profile.length && yy >= py && yy <= profile[i + 1][1]);
    const [r0, y0] = profile[Math.max(0, seg)];
    const [r1, y1] = profile[Math.min(profile.length - 1, Math.max(0, seg) + 1)];
    const rr = (y1 === y0 ? r0 : r0 + ((r1 - r0) * (yy - y0)) / (y1 - y0)) + lift;
    void f;
    return [rr * Math.sin(a), yy, rr * Math.cos(a)];
  };
  rows.filter((_, ri) => !hex || ri === 0).forEach(([ya, yb, mat], ri) => {
    const n = 20 - ri * 2;
    for (let k = 0; k < n; k++) {
      const a0 = (Math.PI * 2 * (k + 0.08)) / n;
      const a1 = (Math.PI * 2 * (k + 0.92)) / n;
      if (cut && Math.sin((a0 + a1) / 2) > 0) continue;
      out.push(quad(k % 5 === 4 ? "hull-orange-worn" : mat, at(ya, a0, 0.25), at(ya, a1, 0.25), at(yb, a1, 0.25), at(yb, a0, 0.25), 0.22), cub("hull-grey-dark", [at((ya + yb) / 2, (a0 + a1) / 2, 0.45)[0] - 0.3, at((ya + yb) / 2, (a0 + a1) / 2, 0.45)[0] + 0.3], [(ya + yb) / 2 - 0.2, (ya + yb) / 2 + 0.2], [at((ya + yb) / 2, (a0 + a1) / 2, 0.45)[2] - 0.3, at((ya + yb) / 2, (a0 + a1) / 2, 0.45)[2] + 0.3]));
    }
  });
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8 + 0.2;
    if (cut && Math.sin(a) > 0) continue;
    const p = at(y + 4.5, a, 0.3);
    out.push(rod("hazard", at(y + 4.1, a, 0.2), at(y + 4.9, a, 0.2), 0.4, 8), cub("lamp-amber", [p[0] - 0.2, p[0] + 0.2], [p[1] - 0.2, p[1] + 0.2], [p[2] - 0.2, p[2] + 0.2]), cub("panel-dark", [at(y + 2, a, 0.1)[0] - 0.7, at(y + 2, a, 0.1)[0] + 0.7], [y + 1.4, y + 2.6], [at(y + 2, a, 0.1)[2] - 0.7, at(y + 2, a, 0.1)[2] + 0.7]));
  }
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI * 2 * k) / 6 + 0.5;
    if (cut && Math.sin(a) > 0) continue;
    out.push(...pipeRun(k % 2 ? "coolant" : "copper", [at(y + 11, a, 0.9), at(y + 14, a + 0.1, 1.6), at(y + 20, a + 0.1, 1.3)], 0.3, { clampEvery: 4 }));
  }
  // struts from the collar's face to the two shrouds, round, with ball joints
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(...roundStrut("hull-grey-dark", [sx * 14, y + 1, sz * 14], [sx * (DRIVE.nozzleX - 6), y - 2.5, sz * 12], 0.45));
  return out;
}

/** The bare joint when the collar is swapped for none: a flange ring where the neck meets the hull, so the part is never empty. */
export function noCollar(): Piece[] {
  return [ringAt("hull-grey", 0, 0, 11, 0.5, 0.5), ringAt("hull-grey-dark", 0, 0, 11, 1, 0.3), ...Array.from({ length: 16 }, (_, k) => rod("hull-grey-dark", [11.6 * Math.sin((Math.PI * 2 * k) / 16), 0.2, 11.6 * Math.cos((Math.PI * 2 * k) / 16)], [11.6 * Math.sin((Math.PI * 2 * k) / 16), 1.1, 11.6 * Math.cos((Math.PI * 2 * k) / 16)], 0.2, 6)), cub("lamp-amber", [-0.3, 0.3], [0, 0.4], [11.6, 12.2])];
}

/** The shield of Ariake's collar: the dark cone, then rows of raised hexagonal tiles over it, clear of the ring frames, the hazard band, the hatches and the orange panel row (which stay as they are on Miyamoto). */
function hexShield(profile: readonly (readonly [number, number])[], seed: string, detail: number): Piece[] {
  const { y } = SHADOW_COLLAR;
  const radius = (yy: number): number => {
    const i = profile.findIndex(([, py], k) => k + 1 < profile.length && yy >= py && yy <= profile[k + 1][1]);
    const [r0, y0] = profile[Math.max(0, i)];
    const [r1, y1] = profile[Math.min(profile.length - 1, Math.max(0, i) + 1)];
    return y1 === y0 ? r0 : r0 + ((r1 - r0) * (yy - y0)) / (y1 - y0);
  };
  const body: Piece = { kind: "lathe", material: "tile", segs: 48, body: true, outline: true, profile, rings: profile.slice(1, -1).map(([, py]) => py) };
  const clear = [y + 3, y + 6, y + 13, y + 19].map((r) => [r - 0.8, r + 0.8] as const);
  const dressed = [[y + 1, y + 3], [y + 3.9, y + 5.1], [y + 6.6, y + 11.4]] as const;
  const skip = (yy: number): boolean => clear.some(([a, b]) => yy > a && yy < b) || dressed.some(([a, b]) => yy > a && yy < b);
  return [body, ...hexClad({ radius, y0: y + 1.6, y1: y + SHADOW_COLLAR.length - 0.4, at: [0, 0], tile: detail < 0.5 ? 1.7 : 1.2, arcs: (yy) => (skip(yy) ? [] : [[0, 2 * Math.PI]]) }, seed)];
}
