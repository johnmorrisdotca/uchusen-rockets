// Hanabusa's spin-gravity wheels, third round of concepts: thick glazed wheels (56 m radius, 26 m deep, six floors of streets and parks inside), spaced far apart so daylight reaches every level, with glazed spoke lifts, a
// still hull of real large modules, and an industrial wheel of 112 m radius. Two layouts: W1, a continuous glazed ring, and W3, a string of glazed pressure modules joined by round nodes. Every repeated part is one template stamped
// at many poses. Concepts only. Pure: no three.js and no DOM.
import { BUILDERS, box, hoop, horn, KIT, place, rod, type KitModule, type Lathe, type MaterialName, type Piece, type Pose, type Vec3, ibeam } from "./adapter.ts";
import { gAt, rpmFor } from "./wheels.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;

/** The wheels' numbers, computed here and nowhere else. */
export const SPIN = {
  close: { count: 3, rOut: 56, depth: 26, wide: 26, ys: [330, 405, 480] as const, spacing: 75, rpm1g: rpmFor(56, 1), rpmHalf: rpmFor(56, 0.5), gAt4: gAt(56, 4) },
  industrial: { rOut: 112, depth: 22, wide: 22, y: 150, rpm1g: rpmFor(112, 1), rpmHalf: rpmFor(112, 0.5) },
  hubR: 15.5,
  boomX: 21.5,
};
/** W4, stepped rings: three rings of rising radius on one shared bearing (graded gravity), with the alternative of one bearing and rpm each. */
export const SPIN4 = {
  rings: [
    { use: "hydro" as const, name: "garden and hydroponics", rOut: 48, depth: 20, y: 330 },
    { use: "research" as const, name: "research", rOut: 62, depth: 24, y: 405 },
    { use: "living" as const, name: "living", rOut: 76, depth: 26, y: 480 },
  ],
  /** The shared rotation: the living ring, the biggest, at 1 g. */
  sharedRpm: rpmFor(76, 1),
  /** The alternative: each ring on its own bearing at the rpm that gives it 1 g. */
  ownRpm: [48, 62, 76].map((r) => rpmFor(r, 1)),
};
export const specLines4 = (): string[] => [
  `Chosen (a), graded gravity on one shared bearing at ${SPIN4.sharedRpm.toFixed(2)} rpm: ${SPIN4.rings.map((r) => `${r.name} ring, radius ${r.rOut} m, ${gAt(r.rOut, SPIN4.sharedRpm).toFixed(2)} g`).join("; ")}.`,
  `Alternative (b), each ring on its own bearing so all three reach 1.00 g: ${SPIN4.rings.map((r, i) => `${r.name} ${SPIN4.ownRpm[i].toFixed(2)} rpm`).join("; ")} (the smallest is over the 4 rpm comfort limit, which is why (a) was chosen).`,
];
export const specLines = (): string[] => [
  `Close wheels (garden, living, research): radius ${SPIN.close.rOut} m (${SPIN.close.rOut * 2} m across), ${SPIN.close.depth} m deep, six floors; ${SPIN.close.rpm1g.toFixed(2)} rpm = 1.00 g at the rim (the upper comfort limit), or ${SPIN.close.rpmHalf.toFixed(2)} rpm = 0.50 g; ${SPIN.close.spacing} m apart.`,
  `Industrial wheel: radius ${SPIN.industrial.rOut} m (${SPIN.industrial.rOut * 2} m across), ${SPIN.industrial.rpm1g.toFixed(2)} rpm = 1.00 g at the rim, ${SPIN.industrial.rpmHalf.toFixed(2)} rpm = 0.50 g.`,
];

export interface Layout3 {
  id: string;
  name: string;
  idea: string;
  ancestors: string;
  pieces: () => Piece[];
}

type Style = "ring" | "beads";
interface Geo {
  rOut: number;
  depth: number;
  wide: number;
  style: Style;
  /** Corner radius of the ring's section. */
  c: number;
}
const rIn = (g: Geo): number => g.rOut - g.depth;

/** Half the width of the section at radius r, less a metre of wall: how far a floor reaches across. */
function reach(g: Geo, r: number): number {
  if (g.style === "beads") {
    const m = g.depth / 2;
    return Math.sqrt(Math.max(0, m * m - (r - (g.rOut - m)) ** 2)) - 0.8;
  }
  const o = g.rOut - g.c;
  const i = rIn(g) + g.c;
  let h = g.wide / 2;
  if (r > o) h = g.wide / 2 - g.c + Math.sqrt(Math.max(0, g.c * g.c - (r - o) ** 2));
  else if (r < i) h = g.wide / 2 - g.c + Math.sqrt(Math.max(0, g.c * g.c - (i - r) ** 2));
  return h - 1;
}

/** The rounded section of a ring as a closed profile going up the outside. */
function roundSection(g: Geo, y: number, grow = 0): [number, number][] {
  const out: [number, number][] = [];
  const ro = g.rOut + grow;
  const ri = rIn(g) - grow;
  const w = g.wide / 2 + grow;
  const c = g.c;
  const arc = (cx: number, cy: number, a0: number): void => {
    for (let k = 0; k <= 6; k++) {
      const a = deg(a0 + (90 * k) / 6);
      out.push([cx + c * Math.cos(a), cy + c * Math.sin(a)]);
    }
  };
  arc(ro - c, y - w + c, -90);
  arc(ro - c, y + w - c, 0);
  arc(ri + c, y + w - c, 90);
  arc(ri + c, y - w + c, 180);
  out.push(out[0]);
  return out;
}

const poses = (n: number, y: number, start = 0): Pose[] => Array.from({ length: n }, (_, i) => ({ at: [0, y, 0] as Vec3, yaw: start + (360 * i) / n }));

const sphere = (material: MaterialName, at: Vec3, r: number): Lathe => ({ kind: "lathe", material, at: [at[0], at[2]], segs: 24, only: "mesh", profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / 12)), at[1] - r * Math.cos((Math.PI * i) / 12)] as const) });

type Use = "garden" | "living" | "research" | "hydro";

/** One cylindrical band at radius r from axial a to b. */
const bandAt = (material: MaterialName, r: number, a: number, b: number, segs = 120, arc?: (y: number) => readonly [number, number]): Lathe => ({ kind: "lathe", material, segs, only: "mesh", profile: [[r, a], [r, b]], ...(arc ? { arc } : {}) });

/** What is inside one wheel: six floors, each a street with parks either side, light strips under the floor above, and houses, labs or trees along it. Stamped round the ring, so it costs vertices and no draw calls. */
function interior(g: Geo, y: number, use: Use, town?: Town, gap?: number): Piece[] {
  const out: Piece[] = [];
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  const shut = (az: number): boolean => !gap || (az >= gap && az <= 360 - gap);
  const floors = [2.2, 6.2, 10.2, 14.2, 18.2, 22.2].map((d) => g.rOut - d);
  floors.forEach((rf, k) => {
    const h = reach(g, rf);
    if (h < 3 || rf < rIn(g) + 1.5) return;
    const town2 = use !== "garden" && use !== "hydro" && k % 2 === 0;
    const hall = town2 ? "concrete" : "plant";
    // the floor: a street down the middle, parks either side
    out.push(bandAt("deck", rf, y - 3, y + 3, 144, arc), bandAt(hall, rf, y - h, y - 3, 144, arc), bandAt(hall, rf, y + 3, y + h, 144, arc), bandAt("hull-grey-dark", rf - 0.12, y - h, y + h, 144, arc));
    // the lit facade at each side wall of the floor: a row of windows seen through the glass from the side
    for (const sd of [-1, 1]) {
      const ring = (material: MaterialName, r0: number, r1: number, yy: number): Lathe => ({ kind: "lathe", material, segs: 144, only: "mesh", profile: [[r0, yy], [r1, yy]], ...(arc ? { arc } : {}) });
      out.push(ring("window", rf - 3.5, rf - 0.5, y + sd * (h - 0.1)), ring("hull-grey", rf - 0.5, rf, y + sd * (h - 0.12)));
      const post: Lathe = { kind: "lathe", material: "hull-white", segs: 400, only: "mesh", arc: () => [-0.006, 0.006], profile: [[rf - 3.5, sd * (h - 0.1)], [rf - 0.5, sd * (h - 0.1)]] };
      out.push(...Array.from({ length: 36 }, (_, i) => (shut(10 * i) ? place([post], { at: [0, y, 0], yaw: 10 * i }) : [])).flat());
    }
    // the light under the floor above: three strips of white LED, or grow-lamp pink over the crops
    for (const dy of [-0.6 * h, 0, 0.6 * h]) out.push(bandAt(use === "hydro" || k % 3 === 2 ? "grow-lamp" : "flood", rf - 3.6, y + dy - 0.35, y + dy + 0.35, 144, arc));
    const n = Math.max(24, Math.round((TAU * rf) / 6.4));
    const park = use === "garden" || k % 2 === 1;
    const list: Pose[] = [];
    for (let i = 0; i < n; i++) {
      const az = (360 * i) / n;
      if (g.style === "beads" && !onBead(az)) continue;
      if (!shut(az)) continue;
      if (town?.skips.some((one) => one.k === k && Math.abs(angleDiff(az, one.az)) < one.half)) continue;
      list.push({ at: [0, y, 0], yaw: az });
    }
    const variants = [0, 1, 2].map((v) => cluster(use, park, rf, h, v, k));
    list.forEach((pose, i) => out.push(...place(variants[i % 3], pose)));
    if (town) for (const one of town.landmarks.filter((l) => l.k === k)) out.push(...place(one.build(rf, h), { at: [0, y, 0], yaw: one.az }));
  });
  return out;
}

const angleDiff = (a: number, b: number): number => ((((a - b) % 360) + 540) % 360) - 180;

/** The places of a town, set at an azimuth on a floor: each builds its pieces in the pose's frame (x along the street, y across, z outward). */
interface Town {
  skips: { k: number; az: number; half: number }[];
  landmarks: { k: number; az: number; id: string; build: (rf: number, h: number) => Piece[] }[];
}

const BEADS = 12;
const onBead = (az: number): boolean => {
  const step = 360 / BEADS;
  const d = Math.abs(((az % step) + step) % step - step / 2);
  return d < step / 2 - 3.4;
};

/** Houses, labs or trees at one place along a floor, in the pose's frame: x along the street's length (round the wheel), y across it (axial), z outward. */
function cluster(use: Use, park: boolean, rf: number, h: number, v: number, k: number): Piece[] {
  const out: Piece[] = [];
  const side = (s: number): void => {
    const yc = s * (2.6 + (h - 2.6) * 0.5);
    const len = (h - 2.6) * 0.78;
    if (use === "hydro") {
      // hydroponic racks: a steel frame, three shelves of crop and a bar of grow-lamp over each
      const len2 = (h - 2.6) * 0.8;
      out.push(box("hull-grey-dark", [0, yc - len2 / 2, rf - 3.0], 5.6, 3.0, len2, 0, { only: "mesh", plain: true }));
      for (const d of [0.7, 1.55, 2.4]) out.push(box("plant", [0, yc - len2 / 2 + 0.2, rf - d], 5.2, 0.5, len2 - 0.4, 0, { only: "mesh", plain: true }), box("grow-lamp", [0, yc - len2 / 2 + 0.2, rf - d - 0.45], 5.0, 0.12, len2 - 0.4, 0, { only: "mesh", plain: true }));
    } else if (park || use === "garden") {
      // trees and a bench-like planter
      for (const [dx, dy, sz] of [[-1.4, -0.3, 1], [1.2, 0.35, 0.8], [0, 0.0, 0.6]] as const) {
        const ty = yc + dy * len * 0.5;
        const tall = (1.9 + 0.5 * ((v + k) % 3)) * sz;
        out.push(rod("wood", [dx, ty, rf - 0.1], [dx, ty, rf - 1.2], 0.14, 6, { only: "mesh" }), ...horn(v % 2 ? "leaf" : "plant", [dx, ty, rf - 1.0], [dx, ty, rf - 1.0 - tall], [1.1 * sz, 0.7 * sz], 8, { only: "mesh" }));
      }
    } else if (use === "living") {
      const hgt = 2.4 + 0.4 * ((v + k) % 3);
      out.push(box("hull-white", [0, yc - len / 2, rf - hgt / 2], 4.6, hgt, len, 0, { only: "mesh", plain: true }), box("hull-grey", [0, yc - len / 2, rf - hgt - 0.05], 4.8, 0.15, len + 0.2, 0, { only: "mesh", plain: true }));
      const face = yc - s * (len / 2);
      out.push(box("window", [0, face - 0.05 - (s > 0 ? 0 : 0), rf - hgt / 2 - 0.2], 3.8, hgt * 0.55, 0.12, 0, { only: "mesh", plain: true }));
      out.push(box("window", [0, face - 0.05, rf - hgt * 0.78], 3.8, 0.5, 0.12, 0, { only: "mesh", plain: true }));
    } else {
      const hgt = 3.1 + 0.3 * ((v + k) % 3);
      out.push(box("hull-white", [0, yc - len / 2, rf - hgt / 2], 5.6, hgt, len, 0, { only: "mesh", plain: true }), box("hull-grey-dark", [0, yc - len / 2, rf - hgt - 0.05], 5.8, 0.2, len + 0.2, 0, { only: "mesh", plain: true }));
      const face = yc - s * (len / 2);
      out.push(box("lamp-blue", [0, face - 0.05, rf - hgt / 2 - 0.1], 4.8, hgt * 0.6, 0.12, 0, { only: "mesh", plain: true }));
    }
    // a street lamp at the kerb
    out.push(rod("hull-grey", [2.4, s * 2.3, rf], [2.4, s * 2.3, rf - 2.5], 0.07, 6, { only: "mesh" }), box("lamp-amber", [2.4, s * 2.3 - 0.2, rf - 2.75], 0.4, 0.4, 0.4, 0, { only: "mesh", plain: true }));
  };
  side(-1);
  side(1);
  return out;
}

/** The shell, the frame ribs, the solar skirt: the outside of one close wheel. */
function shell(g: Geo, y: number): Piece[] {
  const out: Piece[] = [];
  if (g.style === "ring") {
    out.push({ kind: "lathe", material: "glass-clear", segs: 192, body: true, outline: true, profile: roundSection(g, y) } as Lathe);
    // frame ribs round the section, every 7.5 degrees, and the two rim rails
    const rib: Lathe = { kind: "lathe", material: "hull-grey", segs: 400, only: "mesh", arc: () => [-0.010, 0.010], profile: roundSection(g, 0, 0.45) };
    out.push(...poses(48, y).map((p) => place([rib], p)).flat());
    for (const s of [-1, 1]) out.push(hoop("hull-grey", g.rOut - 4, y + s * (g.wide / 2 - 0.2), 0.7, 192, 8), hoop("hull-grey", rIn(g) + 3, y + s * (g.wide / 2 - 0.2), 0.7, 192, 8));
  } else {
    const step = 360 / BEADS;
    const half = deg(step / 2 - 2.6);
    const m = g.depth / 2;
    const rc = g.rOut - m;
    const bead: Piece[] = [hoop("glass-clear", rc, 0, m, 200, 28, { arc: () => [-half, half], body: true, outline: true })];
    for (const f of [-half * 0.62, 0, half * 0.62]) bead.push(hoop("hull-grey", rc, 0, m + 0.4, 200, 24, { arc: () => [f - 0.012, f + 0.012] }));
    out.push(...poses(BEADS, y).map((p) => place(bead, p)).flat());
    for (let k = 0; k < BEADS; k++) {
      const a = deg(step * k + step / 2);
      out.push(sphere("hull-white", [rc * Math.sin(a), y, rc * Math.cos(a)], m + 2.4), sphere("hull-grey", [rc * Math.sin(a), y, rc * Math.cos(a)], m + 2.45));
      // a port on the node's outer face and one facing the hub
      out.push(rod("hull-grey-dark", [(rc + m + 1.5) * Math.sin(a), y, (rc + m + 1.5) * Math.cos(a)], [(rc + m + 3.4) * Math.sin(a), y, (rc + m + 3.4) * Math.cos(a)], 2.4, 14, { only: "mesh" }));
    }
  }
  return out;
}

/** The solar skirt round the outer edge: a band of cells on a frame, with ribs, standing 1.4 m off the rim. */
function solar(g: Geo, y: number): Piece[] {
  const out: Piece[] = [];
  const r = g.rOut + 1.4;
  const half = g.wide / 2 - 4;
  if (g.style === "ring") {
    out.push({ kind: "lathe", material: "solar", segs: 192, only: "mesh", profile: [[r, y - half], [r, y + half]] } as Lathe, hoop("hull-grey", r, y - half, 0.4, 192, 8), hoop("hull-grey", r, y + half, 0.4, 192, 8));
    const rib: Lathe = { kind: "lathe", material: "hull-grey", segs: 400, only: "mesh", arc: () => [-0.006, 0.006], profile: [[g.rOut, -half], [r + 0.15, -half], [r + 0.15, half], [g.rOut, half]] };
    out.push(...poses(96, y).map((p) => place([rib], p)).flat());
  } else {
    const step = 360 / BEADS;
    const half2 = deg(step / 2 - 4);
    const panel: Lathe = { kind: "lathe", material: "solar", segs: 40, only: "mesh", arc: () => [-half2, half2], profile: [[r, -half], [r, half]] };
    out.push(...poses(BEADS, y).map((p) => place([panel], p)).flat());
  }
  return out;
}

/** A glazed lift tube with its lit cars, from a to b: the elevator the wheel's people ride. */
function liftTube(a: Vec3, b: Vec3, glassMaterial: MaterialName, radius: number, cars: readonly number[], angle: number): Piece[] {
  const out: Piece[] = [rod(glassMaterial, a, b, radius, 14, { only: "mesh" }), rod("hull-grey", [a[0], a[1] + radius * 0.2, a[2]], [b[0], b[1] + radius * 0.2, b[2]], radius * 0.12, 6, { only: "mesh" })];
  for (const f of cars) {
    const p: Vec3 = [a[0] + (b[0] - a[0]) * f, a[1], a[2] + (b[2] - a[2]) * f];
    out.push(box("hull-white", [p[0], p[1] - radius * 0.55, p[2]], radius * 1.0, radius * 1.5, radius * 1.1, (angle * 180) / Math.PI + 90, { only: "mesh", plain: true }), box("window", [p[0], p[1] - radius * 0.3, p[2]], radius * 1.05, radius * 1.55, radius * 0.5, (angle * 180) / Math.PI + 90, { only: "mesh", plain: true }), box("lamp-amber", [p[0], p[1] + radius * 0.55, p[2]], radius * 0.4, radius * 0.4, radius * 0.18, 0, { only: "mesh", plain: true }));
  }
  return out;
}

/** One close wheel and its hub, with six glazed spokes. */
function closeWheel(style: Style, y: number, use: Use, geo?: Geo): Piece[] {
  const g: Geo = geo ?? { rOut: SPIN.close.rOut, depth: SPIN.close.depth, wide: SPIN.close.wide, style, c: 8 };
  const out: Piece[] = [...shell(g, y), ...interior(g, y, use), ...solar(g, y)];
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    out.push(...liftTube([SPIN.hubR * Math.sin(a), y, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), y, (rIn(g) + 1) * Math.cos(a)], "glass-clear", 3.4, [0.3, 0.7], a));
  }
  return out;
}

/** The industrial wheel: opaque, with a deep section, lit window rows, hazard bands and six round spokes. */
function industrialWheel(style: Style): Piece[] {
  const g: Geo = { rOut: SPIN.industrial.rOut, depth: SPIN.industrial.depth, wide: SPIN.industrial.wide, style, c: 6 };
  const y = SPIN.industrial.y;
  const out: Piece[] = [];
  if (style === "ring") {
    out.push({ kind: "lathe", material: "hull-white", segs: 256, body: true, outline: true, profile: roundSection(g, y) } as Lathe);
    for (let k = 0; k < 4; k++) out.push(bandAt("window", g.rOut + 0.1, y - 7 + k * 4.6, y - 7 + k * 4.6 + 1.1, 256));
    const rib: Lathe = { kind: "lathe", material: "hull-grey-dark", segs: 500, only: "mesh", arc: () => [-0.004, 0.004], profile: roundSection(g, 0, 0.4) };
    out.push(...poses(96, y).map((p) => place([rib], p)).flat());
    out.push(...Array.from({ length: 16 }, (_, k) => place([bandAt("hull-orange", g.rOut + 0.2, -6, 6, 20, () => [-0.03, 0.03])], { at: [0, y, 0], yaw: 22.5 * k })).flat());
  } else {
    const n = 10;
    const m = g.depth / 2;
    const rc = g.rOut - m;
    const half = deg(180 / n - 2.2);
    const bead: Piece[] = [hoop("hull-white", rc, 0, m, 120, 24, { arc: () => [-half, half], body: true, outline: true }), { ...hoop("window", rc, 0, m, 120, 24, { arc: () => [-half * 0.9, half * 0.9] }), profile: Array.from({ length: 5 }, (_, i) => [rc + (m + 0.1) * Math.cos(-0.3 + (0.6 * i) / 4), (m + 0.1) * Math.sin(-0.3 + (0.6 * i) / 4)] as const) } as Lathe];
    out.push(...poses(n, y).map((p) => place(bead, p)).flat());
    for (let k = 0; k < n; k++) {
      const a = deg((360 / n) * k + 180 / n);
      out.push(sphere("hull-white", [rc * Math.sin(a), y, rc * Math.cos(a)], m + 2));
    }
  }
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    out.push(...liftTube([SPIN.hubR * Math.sin(a), y, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), y, (rIn(g) + 1) * Math.cos(a)], "hull-white", 3.6, [0.25, 0.5, 0.75], a));
  }
  return out;
}

function stackOf(list: readonly (string | KitModule)[], y0: number, detail: number): { pieces: Piece[]; end: number; at: Map<string, number> } {
  let y = y0;
  const pieces: Piece[] = [];
  const at = new Map<string, number>();
  list.forEach((one, i) => {
    const m = typeof one === "string" ? KIT[one] : one;
    pieces.push(...place(m.pieces({ seed: `h${i}`, detail: m.length >= 30 ? detail * 0.8 : detail }), { at: [0, y, 0] }));
    at.set(`${i}`, y);
    y += m.length;
  });
  return { pieces, end: y, at };
}

const TANK = BUILDERS.tank("hull-tank", "Main propellant tank", 13, 40, "L", "L", 2400, 24000, "");
const FARM = BUILDERS.habitatDrum("hull-farm", "Farm drum", 12, 34, 1200, true);
const HAB = BUILDERS.habitatDrum("hull-hab", "Habitat drum", 12, 34, 1200, false);
const BOOM_TANK = BUILDERS.tank("boom-tank", "Boom tank", 5, 24, "M", "M", 70, 520, "");

/** One magnetic-nozzle thruster, exhaust towards -Y from its mounting plane at y = 0: a plasma chamber ringed with field coils, a nozzle that is not a bell but a flare of separate coil rings held on struts, and its feed line. `s` scales it. */
function mnThruster(s: number): Piece[] {
  const out: Piece[] = [{ kind: "lathe", material: "hull-white", segs: 20, only: "mesh", body: true, profile: [[0.01, 6.4 * s], [0.7 * s, 6.2 * s], [1.0 * s, 5.8 * s], [1.0 * s, 0.2 * s], [0.8 * s, 0] ] } as Lathe];
  for (let i = 0; i < 6; i++) out.push(hoop("coil", 1.3 * s, (0.9 + i * 0.85) * s, 0.2 * s, 28, 8));
  const rings = [1.5, 1.95, 2.45, 3.0, 3.6];
  rings.forEach((r, i) => out.push(hoop("coil-lit", r * s, -(0.7 + i * 0.95) * s, 0.17 * s, 36, 8)));
  for (const a of [0, 90, 180, 270]) {
    const c = Math.cos(deg(a));
    const n = Math.sin(deg(a));
    out.push(rod("hull-grey", [1.0 * s * c, 0.2 * s, 1.0 * s * n], [3.6 * s * c, -4.5 * s, 3.6 * s * n], 0.07 * s, 6, { only: "mesh" }));
  }
  out.push(rod("copper", [0.6 * s, 5.8 * s, 0], [1.6 * s, 7.5 * s, 0], 0.14 * s, 8, { only: "mesh" }), hoop("hull-grey", 1.05 * s, 5.2 * s, 0.25 * s, 24, 8));
  return out;
}

/** The main drive of the keel: a ring of twelve magnetic-nozzle thrusters round the tail, six inside them and one on the axis, on a thrust ring; above them a stack of fusion field coils. */
function drivePieces(): Piece[] {
  const out: Piece[] = [{ kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, body: true, outline: true, profile: [[0.01, 0], [17.5, 0], [17.5, 1.4], [0.01, 1.4]] } as Lathe];
  for (let k = 0; k < 12; k++) {
    const a = deg(30 * k);
    out.push(...place(mnThruster(1.2), { at: [17 * Math.sin(a), 0, 17 * Math.cos(a)] }));
  }
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k + 30);
    out.push(...place(mnThruster(1.0), { at: [8.4 * Math.sin(a), 0, 8.4 * Math.cos(a)] }));
  }
  out.push(...mnThruster(1.0));
  // the coil stack round the reactor feed, and the radial beams of the thrust ring
  out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 40, body: true, outline: true, profile: [[10, 1.4], [10, 11.6]] } as Lathe);
  for (let i = 0; i < 7; i++) out.push(hoop("coil", 10.6, 2.4 + i * 1.4, 0.55, 48, 10));
  for (let k = 0; k < 12; k++) out.push(...place([rod("hull-grey", [0, 0.7, 2], [0, 0.7, 17], 0.55, 8, { only: "mesh" })], { at: [0, 0, 0], yaw: 30 * k + 15 }));
  return out;
}
const DRIVE = { id: "mn-drive", length: 11.6, pieces: () => drivePieces() } as unknown as KitModule;

/** The still hull: engines, reactor, large propellant tanks, farm and habitat drums, the docking hub and the bow sections: about 600 m of real modules, the wheels' hubs turning round it. */
function hull(): Piece[] {
  const list: (string | KitModule)[] = [DRIVE, "reactor-fusion", TANK, TANK, TANK, TANK, HAB, FARM, TANK, TANK, FARM, TANK, HAB, TANK, "node-four", "adapter-l-m", "habitat-drum-crew", "common-area-m", "lab-m", "pod-survey-m", "solarium-m", "deck-nav-m", "dome-observation-m"];
  return stackOf(list, 0, 0.45).pieces;
}

/** The two propellant booms, turning with the wheels, and the cross-frames to each hub; and the axial lift between the hubs and the docking node. */
function booms(): Piece[] {
  const out: Piece[] = [];
  const tanks = Array.from({ length: 17 }, () => BOOM_TANK);
  for (const sx of [-1, 1]) {
    out.push(...place(stackOf(tanks, 100, 0.3).pieces, { at: [sx * SPIN.boomX, 0, 0] }));
    // flank pods on each boom: three small magnetic-nozzle thrusters at its tail, for trim and spin-up
    for (const [y0, flip] of [[100, false]] as const) for (let k = 0; k < 3; k++) {
      const a = deg(120 * k + (flip ? 60 : 0));
      out.push(...place(mnThruster(0.45), { at: [sx * SPIN.boomX + 6.8 * Math.sin(a), y0, 6.8 * Math.cos(a)] }));
    }
  }
  const ys = [...SPIN.close.ys, SPIN.industrial.y];
  for (const y of ys) {
    out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 48, body: true, outline: true, profile: [[SPIN.hubR, y - 8], [SPIN.hubR, y + 8]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, only: "mesh", profile: [[SPIN.hubR, y - 8], [SPIN.hubR + 1.3, y - 8], [SPIN.hubR + 1.3, y + 8], [SPIN.hubR, y + 8]] } as Lathe);
    for (const sx of [-1, 1]) for (const dz of [-1, 1]) out.push(...ibeam("hull-grey", [sx * (SPIN.hubR - 1), y + dz * 7, 0], [sx * (SPIN.boomX - 4.5), y + dz * 7, 0], 1.6, 1.0, [0, 0, 1]));
  }
  // the axial lift: a glazed tube along the keel with a lit car at each wheel and one at the hub node
  out.push(...liftTube([0, 130, 13.5], [0, 500, 13.5], "glass-clear", 2.2, [], 0));
  for (const y of [...ys, 495]) out.push(box("hull-white", [0, y - 1.2, 13.5], 2.6, 2.6, 2.4, 0, { only: "mesh", plain: true }), box("window", [0, y - 0.9, 13.5], 2.7, 2.7, 1.1, 0, { only: "mesh", plain: true }), box("lamp-amber", [0, y + 1.2, 13.5], 0.8, 0.8, 0.3, 0, { only: "mesh", plain: true }));
  return out;
}

const USES: readonly Use[] = ["garden", "living", "research"];

function assemble(style: Style): Piece[] {
  return [...hull(), ...booms(), ...industrialWheel(style), ...SPIN.close.ys.flatMap((y, i) => closeWheel(style, y, USES[i]))];
}

/** The places of the town in the cutaway: each its own floor and azimuth. */
export const TOWN_PLACES = [
  { id: "theatre", name: "Theatre", k: 0, az: 66 },
  { id: "sports", name: "Sports hall", k: 0, az: 92 },
  { id: "apartments", name: "Apartments", k: 0, az: 118 },
  { id: "park", name: "Park and pond", k: 1, az: 90 },
  { id: "medical", name: "Medical", k: 2, az: 68 },
  { id: "labs", name: "Laboratories", k: 2, az: 96 },
  { id: "terraces", name: "Terraces and trees", k: 3, az: 84 },
  { id: "homes", name: "Homes", k: 4, az: 84 },
] as const;

const faceWindows = (rf: number, x0: number, y: number, cols: number, rows: number, hgt: number, dir: number): Piece[] => {
  const out: Piece[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) out.push(box("window", [x0 + (i - (cols - 1) / 2) * 1.5, y + dir * 0.05, rf - 0.5 - j * (hgt / rows) - 0.3], 1.0, hgt / rows - 0.5, 0.12, 0, { only: "mesh", plain: true }));
  return out;
};

const PLACES: Record<string, (rf: number, h: number) => Piece[]> = {
  theatre: (rf, h) => {
    const len = Math.min(14, h * 1.5);
    return [
      box("hull-white", [0, -len / 2, rf - 3.0], 13, 3.0, len, 0, { only: "mesh", plain: true }),
      box("hull-grey", [-3.5, -len / 2 + 1, rf - 3.7], 6, 3.7, len * 0.4, 0, { only: "mesh", plain: true }),
      box("lamp-amber", [0, -len / 2 - 0.1, rf - 2.2], 10, 0.5, 0.2, 0, { only: "mesh", plain: true }),
      ...faceWindows(rf, 0, -len / 2, 4, 1, 2, -1),
      box("hull-grey-dark", [0, -len / 2 - 1.2, rf - 0.6], 12, 0.3, 1.6, 0, { only: "mesh", plain: true }),
    ];
  },
  sports: (rf, h) => {
    const len = Math.min(13, h * 1.4);
    return [
      box("hull-grey", [0, -len / 2, rf - 3.4], 18, 3.4, len, 0, { only: "mesh", plain: true }),
      box("window", [0, -len / 2 + 1.5, rf - 3.45], 14, 0.12, len - 3, 0, { only: "mesh", plain: true }),
      box("flood", [-5, -len / 2 - 0.1, rf - 2.4], 0.4, 0.4, 0.2, 0, { only: "mesh", plain: true }),
      box("flood", [5, -len / 2 - 0.1, rf - 2.4], 0.4, 0.4, 0.2, 0, { only: "mesh", plain: true }),
      box("concrete", [0, -len / 2 - 3.6, rf - 0.05], 16, 0.06, 3.4, 0, { only: "mesh", plain: true }),
      box("hull-white", [0, -len / 2 - 3.6, rf - 0.1], 0.12, 0.06, 3.4, 0, { only: "mesh", plain: true }),
    ];
  },
  apartments: (rf) => {
    const out: Piece[] = [];
    for (const x of [-6, 0, 6]) for (const s of [-1, 1]) {
      out.push(box("hull-white", [x, s > 0 ? 3.0 : -9, rf - 3.4], 5, 3.4, 6, 0, { only: "mesh", plain: true }));
      out.push(...faceWindows(rf, x, s > 0 ? 3.0 : -3.0, 3, 3, 2.9, s));
    }
    return out;
  },
  park: (rf) => [bandAt("water", rf + 0.03, -5, 5, 40, () => [-7 / rf, 7 / rf]), ...[-1, 1].map((s) => box("wood", [0, s * 5.6 - 0.4, rf - 0.5], 4, 0.5, 0.8, 0, { only: "mesh", plain: true }))],
  medical: (rf, h) => {
    const len = Math.min(12, h * 1.3);
    return [
      box("hull-white", [0, -len / 2, rf - 3.2], 10, 3.2, len, 0, { only: "mesh", plain: true }),
      box("lamp-blue", [0, -len / 2 - 0.1, rf - 1.6], 3.0, 0.9, 0.14, 0, { only: "mesh", plain: true }),
      box("lamp-blue", [0, -len / 2 - 0.1, rf - 2.5], 0.9, 2.3, 0.14, 0, { only: "mesh", plain: true }),
      ...faceWindows(rf, -3.5, -len / 2, 2, 2, 2, -1),
      ...faceWindows(rf, 3.5, -len / 2, 2, 2, 2, -1),
    ];
  },
  labs: (rf, h) => {
    const out: Piece[] = [];
    for (const [x, y0] of [[-5, -9], [0, -2], [5, -9]] as const) out.push(box("glass-clear", [x, y0, rf - 3.2], 4.6, 3.2, 6, 0, { only: "mesh" }), box("lamp-blue", [x, y0 + 1, rf - 2.2], 3.2, 0.9, 4, 0, { only: "mesh", plain: true }), ...horn("hull-white", [x, y0 + 3, rf - 3.2], [x, y0 + 3, rf - 3.5], [0.8], 10, { only: "mesh" }));
    void h;
    return out;
  },
};

/** The cut face of a section: a dark panel in the shape of the ring's section, a slab for every floor, and a lit room at every floor on both sides of the street, seen from the opening. `side` is +1 for the face at +open (looking towards -x). */
function sectionFace(g: Geo, y: number, az: number, side: number): Piece[] {
  const pieces: Piece[] = [];
  [2.2, 6.2, 10.2, 14.2, 18.2, 22.2].forEach((d) => {
    const rf = g.rOut - d;
    const h = reach(g, rf);
    if (h < 3 || rf < rIn(g) + 1.5) return;
    pieces.push(box("hull-grey", [0.2 * side, -h, rf - 0.25], 0.8, 0.6, 2 * h, 0, { only: "mesh", plain: true }), box("lamp-amber", [0.2 * side, -h - 0.02, rf - 0.5], 0.9, 0.12, 0.12, 0, { only: "mesh", plain: true }));
  });
  return place(pieces, { at: [0, y, 0], yaw: az });
}

/** The faces the camera sees from the mouth of the cut ring: windows, a marquee, floodlights, a medical sign, on the side of each place that faces round the ring. */
const FRONT: Record<string, (rf: number, h: number) => Piece[]> = {
  theatre: (rf, h) => { const len = Math.min(14, h * 1.5); return [box("window", [-6.55, -len / 2 + 1.5, rf - 2.6], 0.12, 1.9, len - 3, 0, { only: "mesh", plain: true }), box("lamp-amber", [-6.6, -4, rf - 0.9], 0.16, 0.5, 8, 0, { only: "mesh", plain: true })]; },
  sports: (rf, h) => { const len = Math.min(13, h * 1.4); return [box("window", [-9.05, -len / 2 + 1.5, rf - 2.8], 0.12, 2.2, len - 3, 0, { only: "mesh", plain: true }), box("flood", [-9.1, -len / 2 + 0.6, rf - 3.3], 0.3, 0.3, 0.5, 0, { only: "mesh", plain: true }), box("flood", [-9.1, len / 2 - 1.1, rf - 3.3], 0.3, 0.3, 0.5, 0, { only: "mesh", plain: true })]; },
  apartments: (rf) => Array.from({ length: 12 }, (_, i) => box("window", [-8.55, 3.3 + (i % 3) * 1.9, rf - 0.9 - Math.floor(i / 3) * 0.75], 0.12, 0.5, 1.2, 0, { only: "mesh", plain: true })).concat(Array.from({ length: 12 }, (_, i) => box("window", [-8.55, -8.7 + (i % 3) * 1.9, rf - 0.9 - Math.floor(i / 3) * 0.75], 0.12, 0.5, 1.2, 0, { only: "mesh", plain: true }))),
  medical: (rf, h) => { const len = Math.min(12, h * 1.3); return [box("lamp-blue", [-5.1, -1.6, rf - 1.7], 0.14, 0.9, 3.2, 0, { only: "mesh", plain: true }), box("lamp-blue", [-5.1, -0.5, rf - 2.9], 0.14, 2.4, 1.0, 0, { only: "mesh", plain: true }), box("window", [-5.05, -len / 2 + 1, rf - 2.6], 0.12, 1.2, 2.4, 0, { only: "mesh", plain: true }), box("window", [-5.05, len / 2 - 3.4, rf - 2.6], 0.12, 1.2, 2.4, 0, { only: "mesh", plain: true })]; },
  labs: (rf) => [box("lamp-blue", [-7.4, -8, rf - 2.4], 0.14, 1.4, 4.4, 0, { only: "mesh", plain: true }), box("lamp-blue", [-7.4, -1, rf - 2.4], 0.14, 1.4, 4.4, 0, { only: "mesh", plain: true })],
};

/** One close wheel opened on +Z for a look at its town: floors, streets, parks, theatre, sports hall, apartments, medical, labs, with its hub, spokes and a stretch of keel. */
export function cutaway(style: Style, rOut: number = SPIN.close.rOut, depth: number = SPIN.close.depth): Piece[] {
  const g: Geo = { rOut, depth, wide: depth, style, c: 8 };
  const y = 0;
  const open = 58;
  const town: Town = {
    skips: TOWN_PLACES.map((p) => ({ k: p.k, az: p.az, half: p.id === "park" ? 15 : 11 })),
    landmarks: TOWN_PLACES.filter((p) => PLACES[p.id]).map((p) => ({ k: p.k, az: p.az, id: p.id, build: (rf: number, h: number) => [...PLACES[p.id](rf, h), ...(FRONT[p.id]?.(rf, h) ?? [])] })),
  };
  const out: Piece[] = [...interior(g, y, "living", town, open)];
  const closed = (a: number): boolean => a >= open && a <= 360 - open;
  if (style === "ring") {
    out.push({ kind: "lathe", material: "glass-clear", segs: 192, body: true, outline: true, arc: () => [deg(open), TAU - deg(open)], profile: roundSection(g, y) } as Lathe);
    const rib: Lathe = { kind: "lathe", material: "hull-grey", segs: 400, only: "mesh", arc: () => [-0.010, 0.010], profile: roundSection(g, 0, 0.45) };
    for (let i = 0; i < 48; i++) if (closed((360 * i) / 48)) out.push(...place([rib], { at: [0, y, 0], yaw: (360 * i) / 48 }));
    for (const a of [open, 360 - open]) out.push(...place([{ ...rib, arc: () => [-0.03, 0.03], material: "hull-orange" } as Lathe], { at: [0, y, 0], yaw: a }));
  } else {
    const step = 360 / BEADS;
    const half = deg(step / 2 - 2.6);
    const m = g.depth / 2;
    const rc = g.rOut - m;
    const bead: Piece[] = [hoop("glass-clear", rc, 0, m, 200, 28, { arc: () => [-half, half], body: true, outline: true })];
    for (let k = 0; k < BEADS; k++) {
      const a = step * k;
      if (a > open - step / 2 && a < 360 - open + step / 2) out.push(...place(bead, { at: [0, y, 0], yaw: a }), sphere("glass-clear", [rc * Math.sin(deg(a + step / 2)), y, rc * Math.cos(deg(a + step / 2))], m + 2.4));
    }
  }
  out.push(...sectionFace(g, y, open, 1), ...sectionFace(g, y, 360 - open, -1));
  out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 48, body: true, outline: true, profile: [[SPIN.hubR, y - 8], [SPIN.hubR, y + 8]] } as Lathe);
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    out.push(...liftTube([SPIN.hubR * Math.sin(a), y, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), y, (rIn(g) + 1) * Math.cos(a)], "glass-clear", 3.4, [0.3, 0.7], a));
  }
  for (const dy of [-36, -12, 12]) out.push(...place(KIT["truss-l-24"].pieces({ detail: 0.4 }), { at: [0, dy, 0] }));
  return out;
}

/** The floor radius a town place stands at, for its label. */
export const placeRadius = (id: string, rOut: number = SPIN.close.rOut): number => rOut - 2.2 - 4 * (TOWN_PLACES.find((one) => one.id === id)?.k ?? 0);

// ----------------------------------------------------------------------------------------------------------------------------------
// W4: three stepped rings

/** The three rings of W4: smallest, bigger, biggest, each deeper than the one before, on one shared bearing. */
function stepped(): Piece[] {
  const out: Piece[] = [...hull(), ...booms(), ...industrialWheel("ring")];
  SPIN4.rings.forEach((r) => out.push(...closeWheel("ring", r.y, r.use, { rOut: r.rOut, depth: r.depth, wide: r.depth, style: "ring", c: 8 })));
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------------------
// the inflatable habitat module: stowed and inflated

/** A BEAM- or LIFE-like inflatable habitat module standing along +Y from `at`: stowed, a small drum with straps; inflated, a big soft-sided hull on restraint bands round a rigid core. */
export function inflatable(inflated: boolean, at: Vec3): Piece[] {
  const out: Piece[] = [];
  const L = inflated ? 22 : 9;
  const R = inflated ? 9 : 3.1;
  const prof = (rs: (t: number) => number, n = 16): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [Math.max(0.01, rs(i / n)), (L * i) / n] as [number, number]);
  const body: [number, number][] = inflated ? prof((t) => 3.4 + (R - 3.4) * Math.pow(Math.sin(Math.PI * Math.min(0.97, Math.max(0.03, t))), 0.55)) : prof(() => R);
  out.push({ kind: "lathe", material: inflated ? "fabric" : "hull-white", at: [at[0], at[2]], segs: 48, body: true, outline: true, profile: body.map(([r, y]) => [r, y + at[1]] as const) } as Lathe);
  // the rigid core, the end bulkheads, the straps and the ports
  out.push({ kind: "lathe", material: "hull-grey", at: [at[0], at[2]], segs: 32, only: "mesh", profile: [[2.6, at[1]], [2.6, at[1] + L]] } as Lathe);
  for (const y of [0.15, L - 0.15]) out.push({ kind: "lathe", material: "hull-grey-dark", at: [at[0], at[2]], segs: 32, only: "mesh", profile: [[0.01, at[1] + y], [3.5, at[1] + y], [3.5, at[1] + y + 0.3], [0.01, at[1] + y + 0.3]] } as Lathe);
  const stations = inflated ? 7 : 4;
  for (let i = 1; i <= stations; i++) {
    const y = (L * i) / (stations + 1);
    const r = body.reduce((best, p) => (Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best))[0];
    out.push(hoop("hull-grey", r + 0.05, at[1] + y, inflated ? 0.3 : 0.14, 48, 8, { at: [at[0], at[2]] }));
  }
  for (const a of [0, 90, 180, 270]) out.push(...place([rod("hull-grey", [0, 0.3, R * 0.97], [0, L - 0.3, R * 0.97], 0.12, 6, { only: "mesh" })], { at: [at[0], at[1], at[2]], yaw: a }));
  out.push(...place([box("lamp-amber", [0, L * 0.5, R + 0.02], 0.6, 0.3, 0.6, 0, { only: "mesh", plain: true })], { at: [at[0], at[1], at[2]], yaw: 45 }));
  return out;
}

/** The docking node with a stowed module on one port and an inflated one on the opposite port. */
export function inflatableScene(): Piece[] {
  const node = KIT["node-four"];
  const p1 = node.ports[0].at;
  const p3 = node.ports[2].at;
  return [...place(KIT["truss-l-24"].pieces({ detail: 0.5 }), { at: [0, -24, 0] }), ...place(node.pieces({ detail: 0.7 }), { at: [0, 0, 0] }), ...inflatable(false, p1), ...inflatable(true, p3)];
}

export const LAYOUTS3 = (): Layout3[] => [
  {
    id: "w1",
    name: "W1. Glazed rings",
    idea: "Each close wheel is one continuous glazed ring, 56 m radius and 26 m deep, with six floors of streets, parks and houses lit from within, a solar skirt round its outer edge and six glazed spoke lifts to the hub. The wheels stand 75 m apart so daylight reaches every level. A closed industrial wheel of 112 m radius stands apart.",
    ancestors: "Von Braun's wheel (1952); the Stanford torus study (1975); NASA's Nautilus-X centrifuge; the ISS truss and Node hubs.",
    pieces: () => assemble("ring"),
  },
  {
    id: "w3",
    name: "W3. Strings of glazed modules",
    idea: "Each close wheel is a ring of twelve glazed pressure modules joined by round nodes (docking ports on each), as the ISS is built from cylinders and nodes; same size, floors, spokes, solar skirt and spacing as W1. A closed industrial wheel of ten modules stands apart.",
    ancestors: "ISS modules and nodes (Destiny, Harmony, Unity); NASA Gateway; the Nautilus-X centrifuge; Mars transfer vehicle habitat drums.",
    pieces: () => assemble("beads"),
  },
  {
    id: "w4",
    name: "W4. Stepped rings",
    idea: `Three glazed rings step up in size, 48 m, 62 m and 76 m radius, on one bearing: looking down the axis you see all three, so every ring has open sky above it and nobody lives above or below anyone. Hydroponic garden ring smallest at ${gAt(48, SPIN4.sharedRpm).toFixed(2)} g, research at ${gAt(62, SPIN4.sharedRpm).toFixed(2)} g, living largest at ${gAt(76, SPIN4.sharedRpm).toFixed(2)} g on ${SPIN4.sharedRpm.toFixed(2)} rpm (graded gravity). Solar skirts, glazed spoke lifts and the closed industrial wheel as before.`,
    ancestors: "Stanford torus study; NASA Nautilus-X; O'Neill's nested-habitat studies; the ISS hub and Node berthing ports.",
    pieces: stepped,
  },
];
