// The kit's modules: engine assemblies, thruster pods, fuel tanks, cargo containers and bays, habitat rings and drums, laboratories, sensor masts, reactors, radiator arrays, docking nodes, trusses, adapters and
// shields. Each is a function from a few numbers to pieces, so a ship picks sizes. Pure: no three.js and no DOM.
import { deg } from "../../framing.ts";
import type { Lathe, Piece, Vec3 } from "../pieces.ts";
import { type CollarClass, COLLARS, collar } from "./collars.ts";
import { annulus, antenna, beam, box, cableTray, channel, disc, foilBand, framedPanel, glazing, hatch, hazardBand, hoop, horn, iBeam, ladder, lamps, type LiveryName, observationDome, panel, patch, pipeRing, pipeRun, place, porthole, post, radiator, ringOf, rng, rod, room, seams, separationJoint, stamp, stencil, strut, tileShield } from "./detail.ts";
import { lightPool } from "./lights.ts";
import { type Ctx, contextOf, CUT, decks, drum, some, straight } from "./hull.ts";
import { ANCESTORS } from "./ancestors.ts";
import type { HullStackName } from "./layers.ts";
import { isCoarse } from "./levels.ts";
import { SIZES } from "./sizes.ts";
import type { KitModule, ModuleKind, ModuleOptions, Port } from "./types.ts";

interface Def {
  id: string;
  name: string;
  kind: ModuleKind;
  note: string;
  mass: number;
  propellant?: number;
  length: number;
  width: number;
  depth?: number;
  top?: CollarClass;
  bottom?: CollarClass;
  ports?: readonly Port[];
  inside?: boolean;
  slot?: string;
  /** The detail level when the caller does not choose: a module with a great deal of it keeps within the mesh limit of a part. */
  detail?: number;
  livery: LiveryName;
  build: (ctx: Ctx, options: ModuleOptions) => Piece[];
}

const define = (d: Def): KitModule => ({
  id: d.id,
  name: d.name,
  kind: d.kind,
  note: d.note,
  mass: d.mass,
  propellant: d.propellant ?? 0,
  length: d.length,
  width: SIZES[d.id]?.[0] ?? d.width,
  depth: SIZES[d.id]?.[1] ?? d.depth ?? d.width,
  ...(d.top ? { top: d.top } : {}),
  ...(d.bottom ? { bottom: d.bottom } : {}),
  ports: d.ports ?? [],
  inside: d.inside ?? false,
  ancestor: ANCESTORS[d.id] ?? "",
  ...(d.slot ? { slot: d.slot } : {}),
  livery: d.livery,
  pieces: (options = {}) => {
    const built = d.build(contextOf(d.id, d.livery, { ...options, detail: options.detail ?? d.detail ?? 0.85 }, HULL_OF[d.kind]), options);
    const joint = options.separation && d.bottom && options.level !== "coarse" ? separationJoint(COLLARS[d.bottom].outer / 2, 0, options.separation === true ? {} : options.separation) : [];
    const all = options.cutaway && options.cutYaw ? place(built, { at: [0, 0, 0], yaw: options.cutYaw }) : built;
    if (joint.length) all.push(...joint);
    return options.level === "coarse" ? all.filter(isCoarse) : all;
  },
});

const TAU = 2 * Math.PI;

/** The hull layers each kind of module shows in its cutaway, unless the ship says otherwise. */
const HULL_OF: Readonly<Record<ModuleKind, HullStackName>> = { engine: "transport", thruster: "explorer", tank: "tanker", cargo: "transport", habitat: "liner", lab: "explorer", sensor: "explorer", reactor: "transport", radiator: "transport", node: "transport", truss: "transport", adapter: "transport", shield: "command" };

// ---------------------------------------------------------------------------------------------------------------------------------
// engines

interface NozzleSpec {
  at: readonly [number, number];
  exit: number;
  length: number;
}

/** The radius of the bell's wall at a fraction `t` of its length from the mouth (0) to the throat (1): a bell contour, flaring hard near the throat and nearly straight at the mouth. */
const bellRadius = (e: number, t: number): number => e * (0.2 + 0.8 * Math.pow(1 - t, 0.55));

/**
 * One regeneratively cooled magnetic nozzle, in the manner of Raptor and the RS-25: a bell contour with a fluted, tube-wall jacket over its upper two thirds and a dark radiation-cooled skirt below, coolant manifolds with
 * feed lines, a throat ring, a combustion chamber wrapped in gold foil with an injector head and propellant ports, a turbopump on its own volute with its discharge and turbine lines, a gimbal bearing and two actuators with
 * clevis ends, and the glowing field coils. Its mouth is at y = 0 and its injector at y = `length` + 1; the pipes are round with flanges and bends.
 */
function nozzle(ctx: Ctx, n: NozzleSpec, plateY: number): Piece[] {
  const [x, z] = n.at;
  const at: readonly [number, number] = [x, z];
  const e = n.exit;
  const l = n.length;
  const fine = ctx.detail >= 0.7;
  const mid = ctx.detail >= 0.55;
  const out: Piece[] = [];
  const segs = fine ? 40 : mid ? 32 : 20;
  const stations = fine ? 14 : mid ? 11 : 7;
  const t = Array.from({ length: stations }, (_, i) => i / (stations - 1));
  const profile = t.map((f) => [bellRadius(e, f), l * f] as const);
  const wallAt = (y: number): number => bellRadius(e, Math.min(1, Math.max(0, y / l)));
  // the bell: dark metal outside and a darker inside; the first station is the mouth, which is where the flame starts
  out.push({ kind: "lathe", material: "bell", at, segs, under: true, outline: true, profile, rings: [0.001, l * 0.45, l * 0.82] });
  out.push({ kind: "lathe", material: "bell-inside", at, segs, under: true, profile: [[e * 0.15, l - 0.1], ...t.slice().reverse().slice(1).map((f) => [bellRadius(e, f) * 0.985, l * f] as const)] });
  out.push({ kind: "lathe", material: "lamp-blue", at, segs: 10, only: "mesh", under: true, profile: [[0.001, l - 0.12], [e * 0.15, l - 0.12]] });
  // the regeneratively cooled jacket: tube walls round the upper two thirds of the bell, fluted so each tube catches the light on its own
  const j0 = 0.38;
  const jacket = t.filter((f) => f >= j0).map((f) => [bellRadius(e, f) + 0.045, l * f] as const);
  out.push({ kind: "lathe", material: "pipe-steel", at, segs: fine ? 80 : mid ? 64 : 40, only: "mesh", under: true, profile: jacket, flutes: fine ? 20 : mid ? 16 : 10, flute: Math.max(0.05, e * 0.045) });
  // the lip of the mouth, a stiffening band, and the manifold rings where the coolant enters and leaves, with their bolts
  out.push({ kind: "lathe", material: "hull-grey", at, segs, only: "mesh", under: true, profile: [[e * 1.0, 0], [e * 1.06, 0], [e * 1.06, 0.18], [e * 1.0, 0.18]] });
  if (mid) out.push({ kind: "lathe", material: "hull-grey-dark", at, segs, only: "mesh", under: true, profile: [[wallAt(l * 0.2) + 0.01, l * 0.2 - 0.1], [wallAt(l * 0.2) + 0.11, l * 0.2 - 0.07], [wallAt(l * 0.2) + 0.11, l * 0.2 + 0.07], [wallAt(l * 0.2) + 0.01, l * 0.2 + 0.1]] });
  const inlet = l * j0;
  const outlet = l * 0.9;
  for (const [y, material] of [[inlet, "copper"], [outlet, "pipe-steel"]] as const) {
    const r = wallAt(y) + 0.16 + e * 0.02;
    out.push(hoop(material, r, y, Math.max(0.1, e * 0.07), segs, mid ? 6 : 5, { at, under: true }));
    if (mid) out.push({ kind: "lathe", material: "hull-grey-dark", at, segs, only: "mesh", under: true, profile: [[r + 0.02, y - e * 0.13], [r + 0.02, y + e * 0.13]] });
    if (fine) out.push(...ringOf(8, r, y).map((p) => rod("hull-grey", [x + p.at[0] * 0.98, y, z + p.at[2] * 0.98], [x + p.at[0] * 1.07, y, z + p.at[2] * 1.07], 0.06, 6)));
  }
  // the throat ring and the combustion chamber above it, in gold foil, with an injector dome and propellant ports
  out.push({ kind: "lathe", material: "hull-grey-dark", at, segs: 24, only: "mesh", profile: [[e * 0.2, l], [e * 0.4, l + 0.1], [e * 0.4, l + 0.2]], welds: [l + 0.1] });
  out.push(...foilBand("kapton", e * 0.425, l + 0.22, l + 0.78, 0, 2 * Math.PI, ctx.seed + at.join(","), fine ? Math.max(0.16, e * 0.1) : Math.max(0.3, e * 0.16), 0.025).map((p) => place([p], { at: [x, 0, z] })[0]));
  out.push({ kind: "lathe", material: "hull-grey", at, segs: 24, only: "mesh", profile: [[e * 0.44, l + 0.78], [e * 0.44, l + 0.86], [e * 0.34, l + 0.95], [e * 0.2, l + 1.0]] });
  if (mid) out.push(hoop("coolant", e * 0.46, l + 0.82, 0.05, 20, 5, { at }));
  const toward = (deg0: number, radius: number, y: number): Vec3 => [x + radius * Math.sin(deg(deg0)), y, z + radius * Math.cos(deg(deg0))];
  // the turbopump stands beside the chamber on the nozzle's outer side, with its volute, its inlet line to the plate, its discharge to the inlet manifold and a hot line from the chamber
  const out0 = Math.atan2(x, z) * (180 / Math.PI);
  const px = out0 + 25;
  const pump = toward(px, e * 0.78, l * 0.76);
  out.push(post("hull-grey-dark", [pump[0], pump[2]], e * 0.2, l * 0.76, e * 0.2, l + 0.7, 12), post("hull-grey", [pump[0], pump[2]], e * 0.26, l * 0.76 + 0.3, e * 0.26, l * 0.76 + 0.9, 12));
  if (mid) out.push(post("pipe-steel", [pump[0], pump[2]], e * 0.22, l * 0.76 + 0.08, e * 0.22, l * 0.76 + 0.3, 12), post("hull-grey-dark", [pump[0], pump[2]], e * 0.14, l * 0.76 + 0.9, e * 0.14, l + 0.92, 12), hoop("hull-grey", e * 0.3, l * 0.76 + 0.6, 0.05, 20, 5, { at: [pump[0], pump[2]] }), hoop("kapton", e * 0.205, l + 0.4, 0.04, 14, 4, { at: [pump[0], pump[2]] }));
  if (mid) {
    out.push(...pipeRun([toward(px, e * 0.84, l + 0.6), toward(px, e * 0.62, l + 0.6), toward(px + 6, e * 0.5, l + 0.6)], Math.max(0.08, e * 0.045), "pipe-steel", { ends: ["flange", "bulkhead"], band: "coolant", flangeEvery: 99, bracketEvery: 99 }));
    out.push(...pipeRun([toward(px, e * 0.62, l * 0.76 + 0.45), toward(px - 25, e * 0.8, l * 0.76 + 0.45), toward(px - 25, e * 0.8, inlet)], Math.max(0.07, e * 0.04), "copper", { ends: ["flange", "flange"], flangeEvery: 99, bracketEvery: 99 }));
  }
  if (fine) {
    out.push(...pipeRun([toward(px, e * 0.62, l + 0.5), toward(px - 70, e * 0.5, l + 0.5), toward(px - 70, e * 0.4, l + 0.2)], Math.max(0.06, e * 0.032), "hull-grey", { ends: ["cap", "flange"], flangeEvery: 99, bracketEvery: 99 }));
    out.push(...pipeRun([toward(px + 70, e * 0.44, l + 0.7), toward(px + 70, e * 0.62, l + 0.7), toward(px + 120, e * 0.8, outlet)], Math.max(0.06, e * 0.032), "coolant", { ends: ["flange", "flange"], flangeEvery: 99, bracketEvery: 99 }));
  }
  // propellant ports: two big flanged inlets on the injector dome
  for (const a of mid ? [px + 150, px - 150] : [px + 150]) out.push(...pipeRun([toward(a, e * 0.42, l + 0.5), toward(a, e * 0.7, l + 0.5)], Math.max(0.09, e * 0.05), "pipe-steel", { ends: ["flange", "cap"], flangeEvery: 99, bracketEvery: 99 }));
  // the plate's feed lines
  for (let k = 0; k < (fine ? 3 : 2); k++) {
    const a = 40 + 120 * k + out0 * 0.3;
    out.push(post("copper", [x + e * 0.34 * Math.sin(deg(a)), z + e * 0.34 * Math.cos(deg(a))], 0.07, l + 1.0, 0.07, plateY, 8), post("hull-grey-dark", [x + e * 0.34 * Math.sin(deg(a)), z + e * 0.34 * Math.cos(deg(a))], 0.11, plateY - 0.25, 0.11, plateY - 0.1, 10));
  }
  // the gimbal: a bearing ring and ball under the plate, and two actuators, each a cylinder with a piston and clevis ends
  out.push(hoop("hull-grey-dark", e * 0.48, plateY - 0.12, 0.1, mid ? 24 : 16, mid ? 6 : 5, { at }), { kind: "lathe", material: "hull-grey-dark", at, segs: 16, only: "mesh", profile: [[e * 0.3, plateY - 0.05], [e * 0.34, plateY - 0.4]] });
  for (const a of [30, 120]) {
    const top: Vec3 = [x + e * 0.5 * Math.sin(deg(a)), plateY, z + e * 0.5 * Math.cos(deg(a))];
    const low: Vec3 = [x + e * 0.62 * Math.sin(deg(a)), l * 0.62, z + e * 0.62 * Math.cos(deg(a))];
    const mid: Vec3 = [top[0] + (low[0] - top[0]) * 0.58, top[1] + (low[1] - top[1]) * 0.58, top[2] + (low[2] - top[2]) * 0.58];
    out.push(rod("hull-grey-dark", top, mid, Math.max(0.09, e * 0.05), 12), rod("pipe-steel", mid, low, Math.max(0.04, e * 0.022), 8), rod("hull-grey", [mid[0] + (top[0] - mid[0]) * 0.1, mid[1] + (top[1] - mid[1]) * 0.1, mid[2] + (top[2] - mid[2]) * 0.1], [mid[0] + (top[0] - mid[0]) * 0.04, mid[1] + (top[1] - mid[1]) * 0.04, mid[2] + (top[2] - mid[2]) * 0.04], Math.max(0.11, e * 0.06), 12), box("hull-grey-dark", [top[0], top[1] - 0.12, top[2]], 0.26, 0.16, 0.24, a), box("hull-grey-dark", [low[0], low[1] - 0.1, low[2]], 0.24, 0.16, 0.22, a));
  }
  // the field coils round the bell: they glow when the engines are lit
  const coilYs = (fine ? [0.3, 0.55, 0.78] : [0.38, 0.7]).map((f) => l * f);
  for (const y of coilYs) out.push(hoop("coil-lit", wallAt(y) + 0.24 + e * 0.04, y, 0.075 * (e / 1.8 + 0.5), fine ? 28 : mid ? 20 : 14, fine ? 6 : 5, { at, under: true }));
  // coolant tubes wound on the skirt's lower part
  if (mid) for (const f of fine ? [0.12, 0.3] : [0.22]) out.push(hoop("coolant", wallAt(l * f) + 0.1, l * f, 0.035, fine ? 24 : 12, 5, { at, under: true }));
  return out;
}

/** The place of each nozzle of a cluster. */
function clusterAt(count: number): { at: [number, number]; exitK: number }[] {
  if (count === 1) return [{ at: [0, 0], exitK: 1 }];
  if (count === 3) return ringAt(3, 0, 0.5);
  if (count === 4) return ringAt(4, 45, 0.47);
  return [{ at: [0, 0], exitK: 0.305 }, ...ringAt(6, 0, 0.64)];
}

const ringAt = (n: number, start: number, k: number): { at: [number, number]; exitK: number }[] => Array.from({ length: n }, (_, i) => ({ at: [k * 6 * Math.sin(deg(start + (360 * i) / n)), k * 6 * Math.cos(deg(start + (360 * i) / n))] as [number, number], exitK: 0.285 }));

function engineCluster(count: 1 | 3 | 4 | 7, id: string, name: string, mass: number): KitModule {
  const R = 5.9;
  const exit = count === 1 ? 3.6 : count === 3 ? 2.5 : count === 4 ? 2.3 : 1.8;
  const nl = count === 1 ? 7.5 : 5.6;
  const plateY = nl + 1.0;
  const length = plateY + 0.8 + 4.2;
  return define({
    id,
    name,
    kind: "engine",
    note: `Fusion engine cluster: ${count} magnetic nozzle${count > 1 ? "s" : ""} under one thrust plate and thrust frame, ending in a heavy collar.`,
    mass,
    length,
    width: 2 * (R + 1.1) + 2.2,
    depth: 2 * (R + 1.1) + 2.2,
    top: "L",
    inside: false,
    detail: count >= 7 ? 0.4 : count >= 4 ? 0.5 : count >= 3 ? 0.6 : 0.8,
    livery: "industrial",
    build: (ctx) => {
      const out: Piece[] = [];
      for (const c of clusterAt(count)) out.push(...nozzle(ctx, { at: c.at, exit, length: nl }, plateY));
      // the thrust plate: a disc with a rim, bolts and sectors
      out.push({ kind: "lathe", material: "hull-grey-dark", segs: 48, body: true, outline: true, profile: [[0.01, plateY], [R - 0.2, plateY], [R, plateY + 0.15], [R, plateY + 0.8], [0.01, plateY + 0.8]], welds: [plateY + 0.4] });
      out.push(...stamp([box("hull-grey", [0, plateY - 0.25, R - 0.9], 1.6, 0.7, 0.3)], ringOf(some(ctx, 16), 0, 0)));
      out.push(hoop("copper", R - 0.7, plateY - 0.02, 0.12, 32, 5), hoop("hull-grey", R * 0.55, plateY - 0.02, 0.1, 32, 5));
      // the thrust frame above: a drum of plating on struts
      const top = plateY + 0.8;
      out.push(...drum(ctx, { R: 6, L: length - top, top: "L", panels: { wide: 2.2, tall: 1.4 }, hatches: 4, roundHatches: true, conduits: 5, trays: 3, vents: 6, ladders: 1, digits: "01", junk: 90, hazard: true, rings: [0.5] }).map((p) => place([p], { at: [0, top, 0] })[0]));
      // struts from the plate to the frame: eight pairs, in an X, with a ring between
      for (let k = 0; k < 8; k++) {
        const a = deg(22.5 + 45 * k);
        const lo: Vec3 = [(R - 0.1) * Math.sin(a), plateY + 0.8, (R - 0.1) * Math.cos(a)];
        const hi: Vec3 = [(R + 0.55) * Math.sin(a + 0.16), plateY + 3.4, (R + 0.55) * Math.cos(a + 0.16)];
        out.push(rod("hull-grey", lo, hi, 0.16, 6), rod("hull-grey", [lo[0] * 1.0, lo[1], lo[2] * 1.0], [(R + 0.55) * Math.sin(a - 0.16), plateY + 3.4, (R + 0.55) * Math.cos(a - 0.16)], 0.16, 6));
      }
      out.push(hoop("hull-grey-dark", R + 0.55, plateY + 3.4, 0.2, 32, 5));
      // radiator wings: four
      for (let k = 0; k < 4; k++) out.push(...radiator({ r0: R + 0.1, az: deg(45 + 90 * k), y: plateY + 2.5, reach: 2.6, height: 2.6, seed: `${id}/${k}`, panels: 2 }));
      out.push(...lamps(ringOf(8, R - 0.2, plateY + 0.95, 22.5).map((p) => ({ at: p.at, colour: "amber" as const, size: 0.1 }))));
      return out;
    },
  });
}

/** A small thruster pod: one nozzle with its bottle, fins and a collar on top, to stand on a port. */
const thrusterPod = define({
  id: "thruster-pod-s",
  name: "Fusion thruster pod",
  kind: "thruster",
  note: "A single magnetic nozzle on a compact reactor bottle with two radiator fins; stands on an S port for side thrust or braking.",
  mass: 48,
  length: 8.4,
  width: 6.6,
  top: "S",
  livery: "industrial",
  build: (ctx) => {
    const out: Piece[] = [];
    out.push(...nozzle(ctx, { at: [0, 0], exit: 1.2, length: 3.4 }, 4.4));
    out.push(...drum(ctx, { R: 1.5, L: 4.0, top: "S", panels: { wide: 1.2, tall: 0.9 }, hatches: 2, conduits: 3, trays: 1, vents: 2, ladders: 0, digits: "3", junk: 18, rings: [0.5] }).map((p) => place([p], { at: [0, 4.4, 0] })[0]));
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 28, outline: true, profile: [[1.5, 4.4], [1.5, 4.5], [0.1, 4.5]] });
    for (const a of [0, 180]) out.push(...radiator({ r0: 1.45, az: deg(a + 90), y: 6.4, reach: 1.9, height: 2.0, seed: `pod/${a}`, panels: 2 }));
    return out;
  },
});

/** A ring of attitude thrusters: eight blocks round a short collar ring. */
const rcsRing = define({
  id: "rcs-ring-m",
  name: "Attitude thruster ring",
  kind: "thruster",
  note: "Eight cold-plasma thruster blocks round a stiff ring, with their propellant bottles; turns and trims a ship.",
  mass: 22,
  length: 2.8,
  width: 8.6,
  top: "M",
  bottom: "M",
  livery: "industrial",
  build: (ctx) => {
    const out: Piece[] = drum(ctx, { R: 3.0, L: 2.8, top: "M", bottom: "M", panels: { wide: 1.8, tall: 1.0 }, hatches: 2, conduits: 2, trays: 1, vents: 2, ladders: 0, digits: "5", junk: 16, hazard: false });
    for (let k = 0; k < 8; k++) {
      const a = (360 * k) / 8;
      const x = 3.7 * Math.sin(deg(a));
      const z = 3.7 * Math.cos(deg(a));
      out.push(box("hull-grey-dark", [x, 0.5, z], 1.0, 1.0, 1.8, a));
      out.push({ kind: "lathe", material: "bell", at: [x, z], segs: 12, profile: [[0.34, 0.5], [0.22, 1.1], [0.14, 1.6]], under: true });
      out.push({ kind: "lathe", material: "bell", at: [x, z], segs: 12, profile: [[0.34, 2.3], [0.22, 1.9], [0.14, 1.5]] });
      out.push(rod("hull-grey", [3.0 * Math.sin(deg(a)), 1.4, 3.0 * Math.cos(deg(a))], [x, 1.4, z], 0.12, 6));
      out.push(rod("copper", [x, 0.5, z], [x, 2.3, z], 0.06, 6));
    }
    return out;
  },
});

// ---------------------------------------------------------------------------------------------------------------------------------
// tanks

function tank(id: string, name: string, R: number, L: number, top: CollarClass, bottom: CollarClass, mass: number, propellant: number, note: string): KitModule {
  return define({
    id,
    name,
    kind: "tank",
    note,
    mass,
    propellant,
    length: L,
    width: 2 * R + 2.2,
    top,
    bottom,
    inside: true,
    detail: 0.7,
    livery: "industrial",
    build: (ctx) => {
      const out = drum(ctx, { R, L, top, bottom, panels: { wide: 3.0, tall: 2.2 }, hatches: 3, conduits: 5, trays: 3, vents: 4, ladders: 2, digits: "11", rings: [0.2, 0.4, 0.6, 0.8] });
      // frost on the cold dome ends and a manifold with valves
      const [y0, y1] = straight({ R, L, top, bottom });
      out.push(...pipeRing("hull-grey", R + 0.15, (y0 + y1) / 2, 0.16));
      for (let k = 0; k < some(ctx, 4); k++) {
        const a = deg(20 + 90 * k);
        const y = y0 + (y1 - y0) * (0.2 + 0.2 * k);
        const f = patch(R + 0.1, a, y);
        const out1: Vec3 = [f.o[0] + f.w[0] * 0.9, y, f.o[2] + f.w[2] * 0.9];
        const out2: Vec3 = [out1[0] + f.u[0] * 1.6, y, out1[2] + f.u[2] * 1.6];
        out.push(...pipeRun([f.o, out1, [out2[0] + f.u[0] * 0.6, y, out2[2] + f.u[2] * 0.6]], 0.14, "pipe-steel", { support: [-f.w[0], 0, -f.w[2]], band: k % 2 ? "coolant" : "copper", ends: ["bulkhead", k % 2 ? "valve" : "cap"], bracketEvery: 1.1 }));
      }
      if (ctx.cutaway) {
        const level = y0 + (y1 - y0) * 0.68;
        out.push({ kind: "lathe", material: "fuel", segs: 48, only: "mesh", profile: [[R - ctx.depth - 0.1, y0 + 0.2], [R - ctx.depth - 0.1, level]], arc: () => CUT });
        out.push({ kind: "lathe", material: "fuel", segs: 48, only: "mesh", profile: [[0.01, level], [R - ctx.depth - 0.1, level]] });
        out.push({ kind: "lathe", material: "frost", segs: 48, only: "mesh", profile: [[0.01, y0 + 0.2], [R - ctx.depth - 0.1, y0 + 0.2]] });
        // baffles: rings with holes, and a feed column
        for (let k = 1; k < 5; k++) out.push(annulus("hull-grey", 1.6, R - ctx.depth - 0.05, y0 + ((y1 - y0) * k) / 5, y0 + ((y1 - y0) * k) / 5 + 0.14, 40, { only: "mesh" }));
        out.push(post("hull-grey-dark", [0, 0], 1.0, y0, 1.0, y1, 20), post("copper", [0, 0], 0.5, y0 - 0.1, 0.5, y1 + 0.1, 12));
        for (let k = 0; k < 6; k++) out.push(rod("hull-grey", [1.0 * Math.sin(deg(k * 60)), y0 + 1, 1.0 * Math.cos(deg(k * 60))], [(R - ctx.depth - 0.1) * Math.sin(deg(k * 60)), y0 + 1.6, (R - ctx.depth - 0.1) * Math.cos(deg(k * 60))], 0.1, 6));
      }
      return out;
    },
  });
}

/** Four spherical tanks held in a frame, with their manifold: the kit's high-pressure store. */
const sphereFarm = define({
  id: "tank-spheres-4",
  name: "Sphere tank farm",
  kind: "tank",
  note: "Four spherical high-pressure tanks in a girder frame round a service core; stores reaction mass, helium and coolant.",
  mass: 210,
  propellant: 640,
  length: 14.0,
  width: 14.0,
  top: "L",
  bottom: "L",
  ports: [],
  inside: true,
  livery: "industrial",
  build: (ctx) => {
    const R = 5.9;
    const out: Piece[] = [];
    out.push(...drum(ctx, { R: 1.9, L: 14, panels: { wide: 1.4, tall: 1.4 }, hatches: 2, conduits: 3, trays: 0, vents: 0, ladders: 1, digits: "12", junk: 16, hazard: false }).filter((p) => !(p.kind === "lathe" && p.body)));
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 28, body: true, outline: true, profile: [[1.9, 0], [1.9, 14]], welds: [3.5, 7, 10.5] });
    out.push(...collar("L", 0, -1), ...collar("L", 14, 1));
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, body: true, outline: true, profile: [[R, 0.0], [R, 0.4], [1.9, 0.4]] });
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, body: true, outline: true, profile: [[R, 13.6], [R, 14], [1.9, 13.6]] });
    const sphere = (r: number, y: number, x: number, z: number, material: "hull-white" | "hull-white-worn" | "frost"): Lathe => ({
      kind: "lathe",
      material,
      at: [x, z],
      segs: 28,
      body: true,
      outline: true,
      profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / 12)), y - r * Math.cos((Math.PI * i) / 12)] as const),
      welds: [y],
      rings: [y - r * 0.5, y + r * 0.5],
    });
    for (let k = 0; k < 4; k++) {
      const a = deg(45 + 90 * k);
      const x = 3.6 * Math.sin(a);
      const z = 3.6 * Math.cos(a);
      out.push(sphere(2.9, 7, x, z, k % 2 ? "hull-white-worn" : "hull-white"));
      out.push({ kind: "lathe", material: "hull-grey-dark", at: [x, z], segs: 24, only: "mesh", profile: [[3.0, 6.9], [3.0, 7.1]] });
      for (let g = 0; g < 4; g++) {
        const b = a + deg(90 * g + 45);
        out.push(rod("hull-grey", [x + 2.5 * Math.sin(b), 4.9, z + 2.5 * Math.cos(b)], [x + 2.2 * Math.sin(b), 0.4, z + 2.2 * Math.cos(b)], 0.12, 6), rod("hull-grey", [x + 2.5 * Math.sin(b), 9.1, z + 2.5 * Math.cos(b)], [x + 2.2 * Math.sin(b), 13.6, z + 2.2 * Math.cos(b)], 0.12, 6));
      }
      out.push(rod("copper", [x * 0.5, 7, z * 0.5], [x * 0.9, 7, z * 0.9], 0.13, 8), post("hull-grey", [x, z], 0.4, 9.8, 0.4, 10.6, 10), post("lamp-red", [x, z], 0.22, 10.6, 0.22, 10.9, 8));
    }
    for (const y of [3.4, 7, 10.6]) out.push(hoop("hull-grey", 3.6 * Math.SQRT2 + 0.6, y, 0.14, 32, 5));
    out.push(...stencil("12", 1.95, 0.4, 7, 1.0, "black"));
    return out;
  },
});

// ---------------------------------------------------------------------------------------------------------------------------------
// cargo

/** A standard container: 6 by 6 metres across and `L` long, with an M collar at each end so it stands on a spine or a cradle. */
function container(id: string, name: string, L: number, cold: boolean, mass: number): KitModule {
  const W = 6;
  return define({
    id,
    name,
    kind: "cargo",
    note: cold ? "A refrigerated container: the standard 6 m box with a cooling unit and a cold-chain marking." : "The standard heavy cargo container: a corrugated 6 m box with corner castings, door locks and M collars at both ends.",
    mass,
    length: L,
    width: W,
    top: "M",
    bottom: "M",
    inside: true,
    livery: "transport",
    build: (ctx) => {
      const random = rng(`${ctx.seed}/box`);
      const out: Piece[] = [];
      const h = W / 2;
      // the box: the shell in dark steel, then corrugation and panels in the livery
      out.push(box(ctx.livery.under, [0, 0.25, 0], W - 0.3, W - 0.3, L - 0.5));
      const sides: { n: Vec3; t: Vec3 }[] = [{ n: [1, 0, 0], t: [0, 0, 1] }, { n: [-1, 0, 0], t: [0, 0, -1] }, { n: [0, 0, 1], t: [-1, 0, 0] }, { n: [0, 0, -1], t: [1, 0, 0] }];
      const open = ctx.cutaway;
      for (const [si, s] of sides.entries()) {
        if (open && si === 2) continue;
        const o: Vec3 = [s.n[0] * h, 0, s.n[2] * h];
        const rows = Math.max(3, Math.round(L / 1.6));
        const ribs = Math.max(8, Math.round(W / (0.5 / ctx.detail)));
        for (let r = 0; r < rows; r++) {
          const y0 = 0.45 + ((L - 0.9) * r) / rows;
          const hgt = (L - 0.9) / rows - 0.06;
          const mat = random() < 0.55 ? ctx.livery.main : random() < 0.5 ? ctx.livery.mainWorn : ctx.livery.block;
          out.push(box(mat, [o[0] + s.n[0] * 0.04, y0, o[2] + s.n[2] * 0.04], Math.abs(s.t[0]) * (W - 1.0) + Math.abs(s.t[2]) * 0.06 + 0.0 * ribs, Math.abs(s.t[2]) * (W - 1.0) + Math.abs(s.t[0]) * 0.06, hgt));
        }
        // vertical corrugation ribs
        for (let i = 0; i < ribs; i++) {
          const k = ((i + 0.5) / ribs - 0.5) * (W - 1.2);
          out.push(beam("hull-grey", [o[0] + s.n[0] * 0.09 + s.t[0] * k, 0.5, o[2] + s.n[2] * 0.09 + s.t[2] * k], [o[0] + s.n[0] * 0.09 + s.t[0] * k, L - 0.5, o[2] + s.n[2] * 0.09 + s.t[2] * k], 0.07 + Math.abs(s.n[0]) * 0.0, 0.07));
        }
        // markings: a warning chevron band and the box's number, our own
      }
      // corner castings and the frame's rails
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        for (const y of [0.25, L - 0.25]) out.push(box("hull-grey-dark", [sx * (h - 0.25), y - 0.25, sz * (h - 0.25)], 0.5, 0.5, 0.5));
        out.push(beam("hull-grey-dark", [sx * (h - 0.1), 0.2, sz * (h - 0.1)], [sx * (h - 0.1), L - 0.2, sz * (h - 0.1)], 0.2, 0.2));
      }
      for (const y of [0.3, L - 0.3]) for (const [a, b] of [[-1, 1], [1, 1]] as const) out.push(beam("hull-grey-dark", [a * h * 0.99, y, -b * h * 0.99], [a * h * 0.99, y, b * h * 0.99], 0.14, 0.14), beam("hull-grey-dark", [-b * h * 0.99, y, a * h * 0.99], [b * h * 0.99, y, a * h * 0.99], 0.14, 0.14));
      // door seam, lock rods and hinges on the front (+Z) face
      const doorZ = h + 0.06;
      for (const dx of [-1.8, -0.6, 0.6, 1.8]) out.push(rod("hull-grey", [dx, 0.7, doorZ + 0.04], [dx, L - 0.7, doorZ + 0.04], 0.04, 6), box("hull-grey-dark", [dx, 1.4, doorZ + 0.04], 0.2, 0.12, 0.3), box("hull-grey-dark", [dx, L - 1.7, doorZ + 0.04], 0.2, 0.12, 0.3));
      out.push(beam("black", [0, 0.6, doorZ + 0.03], [0, L - 0.6, doorZ + 0.03], 0.05, 0.03));
      for (let i = 0; i < some(ctx, 6); i++) out.push(box(random() < 0.5 ? "hazard" : "lamp-amber", [(random() - 0.5) * 4.4, 0.8 + random() * (L - 2), h + 0.075], 0.34, 0.03, 0.34));
      if (cold) {
        // a cooling unit on the front face and louvres
        out.push(box("hull-grey-dark", [0, L * 0.5, h + 0.12], 2.8, 0.6, 2.6), box("panel-dark", [0, L * 0.5 + 0.2, h + 0.44], 2.4, 0.04, 2.0), post("hull-grey", [0.0, h + 0.5], 0.7, L * 0.5 + 0.9, 0.7, L * 0.5 + 1.0, 14));
        for (let i = 0; i < 6; i++) out.push(box("hull-grey", [0, L * 0.5 - 0.9 + i * 0.3, h + 0.5], 2.2, 0.03, 0.05));
        out.push(box("frost", [-2.0, L - 2.2, h + 0.1], 1.0, 0.06, 1.0));
      }
      if (open) {
        // the inside: pallets of freight in racks
        for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) out.push(box(random() < 0.5 ? "hull-orange" : "hull-yellow", [-2.1 + k * 1.4, 0.5 + j * (L / 3.1), 0.0], 1.2, 2.4, L / 3.1 - 0.2 + 0.0), box("hull-grey", [-2.1 + k * 1.4, 0.4 + j * (L / 3.1), 0.0], 1.3, 2.5, 0.08));
      }
      out.push(...collar("M", 0, -1), ...collar("M", L, 1));
      return out;
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// habitation

function habitatRing(id: string, name: string, major: number, mass: number): KitModule {
  const tube = 2.7;
  const hubR = 3.0;
  const L = 16;
  const yc = L / 2;
  const reach = major + tube + 1.0;
  return define({
    id,
    name,
    kind: "habitat",
    note: "A rotating habitat ring on a hub with six spokes, window bands, airlocks and a bearing ring; the hub is a standard M spine segment.",
    mass,
    length: L,
    width: 2 * reach,
    top: "M",
    bottom: "M",
    inside: true,
    detail: 0.25,
    livery: "science",
    build: (ctx) => {
      const random = rng(`${ctx.seed}/ring`);
      const out: Piece[] = [];
      out.push(...drum(ctx, { R: hubR, L, top: "M", bottom: "M", panels: { wide: 1.9, tall: 1.5 }, hatches: 3, roundHatches: true, conduits: 3, trays: 2, vents: 3, ladders: 1, digits: "09", junk: 40, rings: [0.2, 0.8] }));
      // the bearing: a thick collar round the hub where the spokes join
      out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, body: true, outline: true, profile: [[hubR + 0.05, yc - 1.6], [hubR + 0.9, yc - 1.3], [hubR + 0.9, yc + 1.3], [hubR + 0.05, yc + 1.6]], welds: [yc] });
      out.push(hoop("copper", hubR + 0.95, yc - 0.5, 0.09, 32, 5), hoop("copper", hubR + 0.95, yc + 0.5, 0.09, 32, 5));
      // the ring: a rounded-box tube
      const rIn = major - tube;
      const rOut = major + tube;
      const hy = tube * 0.95;
      const cut = ctx.cutaway;
      const prof: [number, number][] = cut
        ? [[rIn, yc - 0.05], [rIn + 0.4, yc - hy], [rOut - 0.4, yc - hy], [rOut, yc - 0.05]]
        : [[rIn + 0.4, yc - hy], [rOut - 0.4, yc - hy], [rOut, yc - hy + 0.4], [rOut, yc + hy - 0.4], [rOut - 0.4, yc + hy], [rIn + 0.4, yc + hy], [rIn, yc + hy - 0.4], [rIn, yc - hy + 0.4], [rIn + 0.4, yc - hy]];
      out.push({ kind: "lathe", material: ctx.livery.under, segs: 72, body: true, outline: true, profile: prof, welds: [yc - hy + 0.4, yc + hy - 0.4] });
      out.push(...pipeRing("copper", rOut, yc - hy + 0.5, 0.12, 96), ...pipeRing("copper", rOut, yc + hy - 0.5, 0.12, 96));
      // the roof and the floor of the ring are plated too: radial seams and bands of fixings, so no broad face is bare, in the line looks as much as the painted one
      if (!cut) for (const sign of [1, -1]) {
        const y = yc + sign * (hy + 0.015);
        const r0 = rIn + 0.4;
        const r1 = rOut - 0.4;
        const around = (r: number): Vec3[] => Array.from({ length: 73 }, (_, k) => [r * Math.sin((TAU * k) / 72), y, r * Math.cos((TAU * k) / 72)] as Vec3);
        out.push({ kind: "lines", weight: "feature", paths: [0, 1, 2, 3, 4].map((k) => around(r0 + ((r1 - r0) * k) / 4)) });
        out.push({ kind: "lines", weight: "weld", paths: Array.from({ length: 48 }, (_, k) => [[r0 * Math.sin((TAU * k) / 48), y, r0 * Math.cos((TAU * k) / 48)], [r1 * Math.sin((TAU * k) / 48), y, r1 * Math.cos((TAU * k) / 48)]] as Vec3[]) });
        out.push({ kind: "lines", weight: "weld", paths: Array.from({ length: 48 }, (_, k) => [[(r0 + (r1 - r0) * 0.25) * Math.sin((TAU * (k + 0.5)) / 48), y, (r0 + (r1 - r0) * 0.25) * Math.cos((TAU * (k + 0.5)) / 48)], [(r0 + (r1 - r0) * 0.5) * Math.sin((TAU * (k + 0.5)) / 48), y, (r0 + (r1 - r0) * 0.5) * Math.cos((TAU * (k + 0.5)) / 48)]] as Vec3[]) });
      }
      // plating and a window band round the outside
      const panelsTop = cut ? yc - 0.2 : yc + hy - 0.7;
      out.push(...drum(ctx, { R: rOut, L: panelsTop - (yc - hy + 0.7), panels: { wide: 3.4, tall: 1.2 }, hatches: 0, conduits: 0, trays: 0, vents: 0, ladders: 0, digits: "09", junk: 0, hazard: false, rings: [] }).filter((p) => p.kind === "plate").map((p) => place([p], { at: [0, yc - hy + 0.7, 0] })[0]));
      const windows = some(ctx, 72);
      const winH = hy * 0.55;
      for (let i = 0; i < windows; i++) {
        const a = (TAU * (i + 0.5)) / windows;
        const wide = (TAU * rOut) / windows - 0.35;
        out.push(...glazing(rOut + 0.01, a, yc, wide, winH + 0.3, 0.1));
      }
      // airlocks on the outside, ladders, handrails
      for (let k = 0; k < 6; k++) out.push(...hatch({ r: rOut + 0.04, az: deg(30 + 60 * k + 12), y: yc - hy + 1.0, size: 1.4, round: true }));
      for (let k = 0; k < 3; k++) out.push(...cableTray(rOut + 0.05, deg(40 + 120 * k), yc - hy + 0.8, yc + hy - 0.8, 0.5, ctx.seed));
      for (const k of [0, 120, 240]) out.push(...hazardBand(rOut, yc - hy + 0.35, yc - hy + 0.7, 6, [deg(k + 20), deg(k + 50)]), ...hazardBand(rOut, yc + hy - 0.7, yc + hy - 0.35, 6, [deg(k + 80), deg(k + 110)]));
      out.push(...stencil("09", rOut + 0.05, deg(80), yc - hy + 0.6 + hy, 1.4, "black"));
      // the spokes: six, each a pair of beams with conduits between and a lift car
      for (let k = 0; k < 6; k++) {
        const a = deg(60 * k + 15);
        const s: Vec3 = [Math.sin(a), 0, Math.cos(a)];
        const lo: Vec3 = [s[0] * (hubR + 0.9), yc, s[2] * (hubR + 0.9)];
        const hi: Vec3 = [s[0] * (rIn + 0.2), yc, s[2] * (rIn + 0.2)];
        const side: Vec3 = [s[2], 0, -s[0]];
        for (const d of [-0.6, 0.6]) {
          out.push(beam("hull-grey-dark", [lo[0] + side[0] * d, yc - 1.0, lo[2] + side[2] * d], [hi[0] + side[0] * d, yc - 1.0, hi[2] + side[2] * d], 0.3, 0.3), beam("hull-grey-dark", [lo[0] + side[0] * d, yc + 1.0, lo[2] + side[2] * d], [hi[0] + side[0] * d, yc + 1.0, hi[2] + side[2] * d], 0.3, 0.3));
          // lattice between the beams
          const n = 7;
          for (let q = 0; q < n; q++) {
            const t0 = q / n;
            const t1 = (q + 1) / n;
            const p0: Vec3 = [lo[0] + (hi[0] - lo[0]) * t0 + side[0] * d, yc + (q % 2 ? 1.0 : -1.0), lo[2] + (hi[2] - lo[2]) * t0 + side[2] * d];
            const p1: Vec3 = [lo[0] + (hi[0] - lo[0]) * t1 + side[0] * d, yc + (q % 2 ? -1.0 : 1.0), lo[2] + (hi[2] - lo[2]) * t1 + side[2] * d];
            out.push(rod("hull-grey", p0, p1, 0.07, 6));
          }
        }
        out.push(rod("copper", [lo[0] + side[0] * 0.1, yc - 0.3, lo[2] + side[2] * 0.1], [hi[0] + side[0] * 0.1, yc - 0.3, hi[2] + side[2] * 0.1], 0.1, 6), rod("lamp-red", [lo[0] - side[0] * 0.1, yc + 0.3, lo[2] - side[2] * 0.1], [hi[0] - side[0] * 0.1, yc + 0.3, hi[2] - side[2] * 0.1], 0.07, 6));
        // a lift car on the spoke
        const t = 0.35 + random() * 0.3;
        out.push(box("hull-yellow", [lo[0] + (hi[0] - lo[0]) * t - side[0] * 0.0, yc - 0.6, lo[2] + (hi[2] - lo[2]) * t], 1.1, 1.1, 1.2, (a * 180) / Math.PI));
      }
      if (cut) {
        // inside the open ring: a floor, rooms, bunks, consoles
        out.push({ kind: "lathe", material: "deck", segs: 96, only: "mesh", profile: [[rIn + 0.4, yc - hy + 0.9], [rOut - 0.4, yc - hy + 0.9]] });
        out.push({ kind: "lathe", material: "hull-white", segs: 96, only: "mesh", profile: [[rIn + 0.45, yc - hy + 0.9], [rIn + 0.45, yc + 0.2]] });
        out.push({ kind: "lathe", material: "hull-white", segs: 96, only: "mesh", profile: [[rOut - 0.5, yc - hy + 0.9], [rOut - 0.5, yc + 0.2]] });
        const rooms = some(ctx, 36);
        for (let i = 0; i < rooms; i++) {
          const a = (TAU * i) / rooms;
          const dir: Vec3 = [Math.sin(a), 0, Math.cos(a)];
          const w = (TAU * major) / rooms;
          out.push(box("hull-white", [dir[0] * major + dir[2] * 0, yc - hy + 0.9, dir[2] * major], 0.08, rOut - rIn - 1.1, 1.5, (a * 180) / Math.PI + 90));
          const yaw = (a * 180) / Math.PI;
          const kind = i % 4;
          const at: Vec3 = [dir[0] * (major - 0.8), yc - hy + 0.9, dir[2] * (major - 0.8)];
          if (kind === 0) out.push(box("hull-blue", at, w * 0.6, 0.9, 0.5, yaw + 90), box("hull-blue", [at[0], at[1] + 0.8, at[2]], w * 0.6, 0.9, 0.5, yaw + 90));
          else if (kind === 1) out.push(box("panel-dark", at, w * 0.5, 0.7, 0.9, yaw + 90), box("lamp-blue", [at[0], at[1] + 0.9, at[2]], w * 0.4, 0.04, 0.4, yaw + 90));
          else if (kind === 2) out.push(box("plant", at, w * 0.7, 1.0, 0.6, yaw + 90), box("lamp-blue", [at[0], at[1] + 1.7, at[2]], w * 0.7, 0.3, 0.05, yaw + 90));
          else out.push(box("hull-grey", at, w * 0.5, 0.9, 0.9, yaw + 90), box("hull-yellow", [at[0] + dir[0] * 0.9, at[1], at[2] + dir[2] * 0.9], w * 0.3, 0.5, 0.5, yaw + 90));
        }
      }
      return out;
    },
  });
}

/** A pressurised drum: crew or passenger quarters, or farms with glass bands. */
function habitatDrum(id: string, name: string, R: number, L: number, mass: number, farm: boolean): KitModule {
  return define({
    id,
    name,
    kind: "habitat",
    note: farm ? "A hydroponic farm drum: glass bands over grow racks under blue lamps, water loops and an airlock, between two heavy collars." : "A crew and passenger drum: bunk decks, galley, medical bay and airlocks behind windowed plating, between two heavy collars.",
    mass,
    length: L,
    width: 2 * R + 2.0,
    top: R >= 6 ? "L" : "M",
    bottom: R >= 6 ? "L" : "M",
    inside: true,
    detail: R >= 6 ? 0.5 : 0.75,
    livery: farm ? "transport" : "science",
    build: (ctx) => {
      const top = R >= 6 ? "L" : "M";
      const out = drum(ctx, { R, L, top, bottom: top, panels: { wide: 2.6, tall: 1.8 }, hatches: 5, roundHatches: true, conduits: 4, trays: 3, vents: 4, ladders: 2, digits: farm ? "14" : "15", rings: [0.25, 0.5, 0.75] });
      const [y0, y1] = straight({ R, L, top, bottom: top });
      const bands = Math.max(2, Math.floor((y1 - y0) / 3.6));
      const open = ctx.cutaway;
      const az: readonly [number, number] = open ? CUT : [0, TAU];
      for (let b = 0; b < bands; b++) {
        const y = y0 + ((y1 - y0) * (b + 0.5)) / bands;
        const n = some(ctx, Math.round((TAU * R) / 2.2));
        for (let i = 0; i < n; i++) {
          const a = az[0] + ((az[1] - az[0]) * (i + 0.5)) / n;
          const wide = ((az[1] - az[0]) * R) / n - 0.3;
          out.push(...glazing(R + 0.012, a, y, wide, farm ? 1.7 : 1.0, 0.08, farm ? "plant" : "window"));
        }
      }
      if (open) out.push(...decks(ctx, R, y0 + 0.1, y1 - 0.1, farm ? 3.6 : 3.2, farm ? "farm" : "bunks"));
      return out;
    },
  });
}

/** A laboratory module: a drum with sensor windows, a sample airlock, a robot arm, instrument pods and a small dish. */
const lab = define({
  id: "lab-m",
  name: "Laboratory module",
  kind: "lab",
  note: "A survey laboratory: sample airlock, a robot arm on rails, instrument pods, spectrometer ports and a small dish, between two M collars.",
  mass: 96,
  length: 14.0,
  width: 12.6,
  top: "M",
  bottom: "M",
  inside: true,
  livery: "science",
  build: (ctx) => {
    const R = 3.0;
    const out = drum(ctx, { R, L: 14, top: "M", bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 4, roundHatches: true, conduits: 3, trays: 2, vents: 4, ladders: 1, digits: "16", junk: 50, rings: [0.2, 0.5, 0.8] });
    for (let k = 0; k < 3; k++) {
      const a = deg(25 + 120 * k);
      const y = 4 + 3.4 * k;
      // an instrument pod: a box with a lens on a short arm
      const p: Vec3 = [(R + 0.9) * Math.sin(a), y, (R + 0.9) * Math.cos(a)];
      out.push(rod("hull-grey", [R * Math.sin(a), y, R * Math.cos(a)], p, 0.18, 8), box("hull-white", [p[0], y - 0.6, p[2]], 1.5, 1.5, 1.2, (a * 180) / Math.PI));
      out.push(...horn("hull-grey-dark", [p[0], y, p[2]], [p[0] + Math.sin(a) * 1.2, y, p[2] + Math.cos(a) * 1.2], [0.5, 0.42, 0.32], 12), rod("glass", [p[0] + Math.sin(a) * 1.2, y, p[2] + Math.cos(a) * 1.2], [p[0] + Math.sin(a) * 1.3, y, p[2] + Math.cos(a) * 1.3], 0.3, 12));
    }
    // a robot arm on a rail up the hull
    const rail = deg(-70);
    out.push(rod("hull-grey-dark", [(R + 0.4) * Math.sin(rail), 2, (R + 0.4) * Math.cos(rail)], [(R + 0.4) * Math.sin(rail), 12, (R + 0.4) * Math.cos(rail)], 0.1, 6), box("hull-yellow", [(R + 0.7) * Math.sin(rail), 6, (R + 0.7) * Math.cos(rail)], 0.8, 0.8, 0.8));
    const base: Vec3 = [(R + 1.1) * Math.sin(rail), 6.8, (R + 1.1) * Math.cos(rail)];
    const elbow: Vec3 = [base[0] + 1.6 * Math.sin(rail + 0.5), 8.3, base[2] + 1.6 * Math.cos(rail + 0.5)];
    const hand: Vec3 = [elbow[0] + 1.4 * Math.sin(rail + 0.9), 7.4, elbow[2] + 1.4 * Math.cos(rail + 0.9)];
    out.push(rod("hull-yellow", base, elbow, 0.14, 8), rod("hull-yellow", elbow, hand, 0.11, 8), rod("hull-grey-dark", elbow, [elbow[0], elbow[1] + 0.3, elbow[2]], 0.2, 8), rod("hull-grey", hand, [hand[0] + 0.3, hand[1] - 0.3, hand[2]], 0.07, 6), rod("hull-grey", hand, [hand[0] - 0.3, hand[1] - 0.3, hand[2]], 0.07, 6));
    if (ctx.cutaway) out.push(...decks(ctx, R, 0.9, 13.1, 2.4, "bench"));
    return out;
  },
});

// ---------------------------------------------------------------------------------------------------------------------------------
// sensors, reactors, radiators, nodes, trusses, adapters, shields

/** A sensor mast: a lattice tower on an M collar with platforms, dishes, phased arrays, horns, an optics head and beacons. */
const sensorMast = define({
  id: "mast-sensor-40",
  name: "Sensor mast",
  kind: "sensor",
  note: "A 40 m lattice mast: three platforms with deep-space dishes, phased arrays, a long-baseline optics head, horns and beacons; stands on an M collar.",
  mass: 38,
  length: 40,
  width: 16,
  bottom: "M",
  livery: "command",
  build: (ctx) => {
    const random = rng(`${ctx.seed}/mast`);
    const out: Piece[] = [...collar("M", 0, -1)];
    out.push(...drum(ctx, { R: 3, L: 4, bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 2, conduits: 2, trays: 1, vents: 2, ladders: 0, digits: "20", junk: 24, hazard: true }).filter((p) => !(p.kind === "plate" && false)));
    // four longerons, tapering, with braces
    const levels = [4, 9, 14, 19, 24, 29, 34];
    const half = (y: number) => 1.9 - ((y - 4) / 36) * 1.1;
    for (let i = 0; i + 1 < levels.length; i++) {
      const [ya, yb] = [levels[i], levels[i + 1]];
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        out.push(rod("hull-grey", [sx * half(ya), ya, sz * half(ya)], [sx * half(yb), yb, sz * half(yb)], 0.15, 6));
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const s = i % 2 ? 1 : -1;
        const side = (y: number, k: number): Vec3 => [dx !== 0 ? dx * half(y) : k * half(y), y, dz !== 0 ? dz * half(y) : k * half(y)];
        out.push(rod("hull-grey-dark", side(ya, -s), side(yb, s), 0.08, 5));
        out.push(rod("hull-grey-dark", side(ya, s), side(yb, -s), 0.08, 5));
      }
      out.push(...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => rod("hull-grey-dark", [sx * half(yb), yb, sz * half(yb)], [-sx * half(yb), yb, sz * half(yb)], 0.07, 5)));
      out.push(rod("hull-grey-dark", [half(yb), yb, half(yb)], [-half(yb), yb, -half(yb)], 0.06, 5), rod("hull-grey-dark", [-half(yb), yb, half(yb)], [half(yb), yb, -half(yb)], 0.06, 5));
    }
    // a cable tray and a ladder up one face
    out.push(rod("copper", [half(4) + 0.15, 4, 0], [half(34) + 0.15, 34, 0], 0.08, 6), rod("lamp-blue", [half(4) + 0.3, 4, 0.2], [half(34) + 0.3, 34, 0.2], 0.05, 5));
    for (let y = 5; y < 34; y += 0.6) out.push(rod("hull-yellow", [-half(y) - 0.3, y, -0.3], [-half(y) - 0.3, y, 0.3], 0.025, 5));
    out.push(rod("hull-yellow", [-half(4) - 0.3, 4, -0.3], [-half(34) - 0.3, 34, -0.3], 0.03, 5), rod("hull-yellow", [-half(4) - 0.3, 4, 0.3], [-half(34) - 0.3, 34, 0.3], 0.03, 5));
    // platforms: 12-sided decks with rails, each carrying instruments
    const platform = (y: number, w: number): Piece[] => [
      disc("hull-grey-dark", [0, 0], w, y, 0.18, 12),
      hoop("hull-yellow", w, y + 1.0, 0.04, 24, 4),
      ...Array.from({ length: 12 }, (_, k) => rod("hull-yellow", [w * Math.sin(deg(30 * k)), y + 0.18, w * Math.cos(deg(30 * k))], [w * Math.sin(deg(30 * k)), y + 1.0, w * Math.cos(deg(30 * k))], 0.03, 4)),
    ];
    out.push(...platform(14, 2.6), ...platform(24, 2.2), ...platform(34, 1.9));
    // dishes: three, of different sizes, on the platforms, pointing out and up
    out.push(...antenna("dish", [2.0, 14.2, 0.0], [0.8, 0.5, 0.2], 5.2, ctx.seed));
    out.push(...antenna("dish", [-1.7, 24.2, -1.0], [-0.5, 0.6, -0.6], 4.2, ctx.seed));
    out.push(...antenna("dish", [1.0, 34.2, 1.3], [0.4, 0.7, 0.6], 3.2, ctx.seed));
    // phased arrays on the four faces
    for (let k = 0; k < 4; k++) {
      const a = deg(45 + 90 * k);
      out.push(...antenna("phased", [2.1 * Math.sin(a), 19.5, 2.1 * Math.cos(a)], [Math.sin(a), 0.1, Math.cos(a)], 2.4, `${ctx.seed}/${k}`));
    }
    // horns and yagis and whips
    out.push(...antenna("horn", [0, 36, 0.0], [0.3, 1, 0.1], 2.6), ...antenna("yagi", [-1.3, 29.2, 1.1], [-0.6, 0.5, 0.6], 3.6), ...antenna("yagi", [1.4, 29.2, -1.0], [0.6, 0.5, -0.6], 3.2));
    for (let k = 0; k < 6; k++) out.push(...antenna("whip", [1.2 * Math.sin(deg(60 * k)), 34.2, 1.2 * Math.cos(deg(60 * k))], [0, 1, 0], 2.0 + random() * 2.2));
    // the optics head: a sphere on a gimbal fork on top
    out.push({ kind: "lathe", material: "hull-white", segs: 28, body: true, outline: true, profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, 1.5 * Math.sin((Math.PI * i) / 12)), 36.8 - 1.5 * Math.cos((Math.PI * i) / 12)] as const), rings: [36.8], welds: [37.8] });
    out.push(rod("hull-grey-dark", [-1.9, 34.8, 0], [-1.9, 38.2, 0], 0.2, 8), rod("hull-grey-dark", [1.9, 34.8, 0], [1.9, 38.2, 0], 0.2, 8), rod("hull-grey-dark", [-1.9, 34.8, 0], [1.9, 34.8, 0], 0.2, 8));
    out.push(...horn("hull-grey-dark", [0, 36.8, 1.2], [0, 36.8, 2.8], [1.0, 0.84, 0.66], 16), rod("glass", [0, 36.8, 2.8], [0, 36.8, 2.9], 0.64, 16));
    out.push(post("lamp-red", [0, 0], 0.18, 38.4, 0.001, 40, 8));
    out.push(...lamps([{ at: [1.9, 24.1, 1.9], colour: "red", size: 0.14 }, { at: [-1.9, 24.1, -1.9], colour: "red", size: 0.14 }, { at: [2.4, 14.1, -2.4], colour: "amber", size: 0.14 }]));
    out.push(seams("feature", [levels.map((y) => [half(y), y, half(y)] as Vec3)]));
    return out;
  },
});

/** A reactor module: a shielded drum with a toroidal coil, coolant rings, a pump deck, and — opened — the plasma core. */
const reactor = define({
  id: "reactor-fusion",
  name: "Fusion reactor module",
  kind: "reactor",
  note: "A compact fusion reactor: shield drum, toroidal field coil, coolant loops and pumps, with an isolation collar at each end; opened, the plasma core shows.",
  mass: 420,
  length: 14,
  width: 14,
  top: "L",
  bottom: "L",
  inside: true,
  detail: 0.6,
  livery: "industrial",
  build: (ctx) => {
    const R = 6;
    const out = drum(ctx, { R, L: 14, top: "L", bottom: "L", panels: { wide: 2.6, tall: 1.8 }, hatches: 4, roundHatches: true, conduits: 6, trays: 3, vents: 6, ladders: 1, digits: "30", rings: [0.35, 0.65] });
    // heat exchangers: four finned canisters on the outside
    for (let k = 0; k < 4; k++) {
      const a = deg(45 + 90 * k + 90);
      const x = (R + 1.3) * Math.sin(a);
      const z = (R + 1.3) * Math.cos(a);
      if (ctx.cutaway && Math.abs(Math.sin(a / 2 - 0.0)) < 0.5 && Math.cos(a) > 0.3) continue;
      out.push({ kind: "lathe", material: "hull-white-worn", at: [x, z], segs: 20, body: true, outline: true, profile: [[1.0, 2.0], [1.2, 2.3], [1.2, 11.7], [1.0, 12.0]], welds: [4, 8, 10] });
      for (let f = 0; f < some(ctx, 9); f++) out.push({ kind: "lathe", material: "hull-grey", at: [x, z], segs: 14, only: "mesh", profile: [[1.25, 2.6 + f * 0.95], [1.48, 2.6 + f * 0.95], [1.48, 2.72 + f * 0.95], [1.25, 2.72 + f * 0.95]] });
      out.push(...pipeRun([[x, 12, z], [x, 12.8, z], [(R - 0.1) * Math.sin(a), 12.8, (R - 0.1) * Math.cos(a)]], 0.16, "coolant", { support: [0, -1, 0], sides: 10, flangeEvery: 99, bracketEvery: 99 }), ...pipeRun([[x, 2, z], [x, 1.2, z], [(R - 0.1) * Math.sin(a), 1.2, (R - 0.1) * Math.cos(a)]], 0.16, "coolant", { support: [0, 1, 0], sides: 10, flangeEvery: 99, bracketEvery: 99 }));
    }
    // a pump deck: boxes and valve wheels round the foot
    out.push(hoop("coil", R + 0.18, 7.0, 0.2, 32, 5));
    if (ctx.cutaway) {
      // the torus coil, the plasma ring and the central column
      out.push(hoop("coil", 3.0, 7, 1.0, 32, 5), hoop("core", 3.0, 7, 0.38, 32, 5), hoop("hull-grey", 3.0, 7, 1.12, 32, 5, { arc: () => [deg(-180), deg(-60)] }));
      for (let k = 0; k < 18; k++) out.push(hoop("copper", 3.0, 7, 1.13, 4, 4, { arc: () => [deg(k * 20), deg(k * 20 + 6)] }));
      out.push(post("hull-grey-dark", [0, 0], 1.0, 1.6, 1.0, 12.4, 20), post("core", [0, 0], 0.4, 3.0, 0.4, 11, 12));
      out.push({ kind: "lathe", material: "hull-white", segs: 56, only: "mesh", profile: [[R - ctx.depth - 0.1, 1.6], [R - ctx.depth - 0.1, 12.4]], arc: () => CUT });
      for (let k = 0; k < 8; k++) out.push(rod("hull-grey", [1.0 * Math.sin(deg(k * 45)), 5.0, 1.0 * Math.cos(deg(k * 45))], [3.0 * Math.sin(deg(k * 45)), 6.2, 3.0 * Math.cos(deg(k * 45))], 0.12, 6), rod("hull-grey", [1.0 * Math.sin(deg(k * 45)), 9.0, 1.0 * Math.cos(deg(k * 45))], [3.0 * Math.sin(deg(k * 45)), 7.8, 3.0 * Math.cos(deg(k * 45))], 0.12, 6));
      for (let k = 0; k < 6; k++) out.push(box("hull-grey-dark", [(R - 1.4) * Math.sin(deg(k * 20 - 50)), 1.5, (R - 1.4) * Math.cos(deg(k * 20 - 50))], 1.0, 1.0, 1.1, k * 20 - 50), post("lamp-amber", [(R - 1.4) * Math.sin(deg(k * 20 - 50)), (R - 1.4) * Math.cos(deg(k * 20 - 50))], 0.12, 2.6, 0.12, 2.8, 8));
    }
    return out;
  },
});

/** A radiator array: a hub drum with six wings, each stowed against the hull or deployed. */
function radiatorArray(id: string, name: string, deployed: boolean, mass: number): KitModule {
  const R = 3;
  const L = 12;
  const reach = 9;
  return define({
    id,
    name,
    kind: "radiator",
    note: deployed ? "A hub with six radiator wings spread: hinged panels with copper coolant pipes, manifolds and boom struts." : "The same hub with its six wings folded flat against the hull in closed boxes, latched for burns.",
    mass,
    length: L,
    width: deployed ? 2 * (R + reach) + 1 : 2 * (R + 1.5),
    top: "M",
    bottom: "M",
    detail: deployed ? 0.6 : 0.85,
    livery: "industrial",
    build: (ctx) => {
      const out = drum(ctx, { R, L, top: "M", bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 2, conduits: 3, trays: 1, vents: 2, ladders: 0, digits: "40", rings: [0.5] });
      for (let k = 0; k < 6; k++) out.push(...radiator({ r0: R + 0.05, az: deg(30 + 60 * k), y: L / 2, reach: deployed ? reach : 3, height: deployed ? 9.5 : 8, seed: `${ctx.seed}/${k}`, stowed: !deployed, panels: deployed ? 4 : 3 }));
      return out;
    },
  });
}

/** A docking node: a hub drum with ports looking up on a ring round it, so modules can stand parallel to the spine. */
function dockingNode(id: string, name: string, count: number, cls: CollarClass, mass: number): KitModule {
  const ringR = count === 2 ? 5.5 : 6.2;
  const L = 8;
  const ports: Port[] = Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, collar: cls, at: [ringR * Math.sin(deg((360 * i) / count + 45)), L, ringR * Math.cos(deg((360 * i) / count + 45))] as Vec3 }));
  return define({
    id,
    name,
    kind: "node",
    note: `A docking node: an L-collar hub with ${count} ${cls}-class ports on arms round it, each with its own pressure door, so ${count} modules stand parallel to the spine; a service lift and a gantry round the hub.`,
    mass,
    length: L,
    width: 2 * (ringR + COLLARS[cls].outer / 2) + 1,
    top: "L",
    bottom: "L",
    ports,
    livery: "industrial",
    build: (ctx) => {
      const out = drum(ctx, { R: 6, L, top: "L", bottom: "L", panels: { wide: 2.4, tall: 1.6 }, hatches: 4, roundHatches: true, conduits: 4, trays: 2, vents: 4, ladders: 1, digits: "50", junk: 60, rings: [0.5] });
      for (const p of ports) {
        const a = Math.atan2(p.at[0], p.at[2]);
        const rr = Math.hypot(p.at[0], p.at[2]);
        // the arm: two beams from the hub out to a cradle, a cradle ring, the port's collar facing up, lamps
        for (const d of [-0.9, 0.9]) out.push(beam("hull-grey-dark", [6 * Math.sin(a) + d * Math.cos(a), L - 1.5, 6 * Math.cos(a) - d * Math.sin(a)], [rr * Math.sin(a) + d * Math.cos(a), L - 1.5, rr * Math.cos(a) - d * Math.sin(a)], 0.5, 0.6), rod("hull-grey", [6 * Math.sin(a) + d * Math.cos(a), L - 0.3, 6 * Math.cos(a) - d * Math.sin(a)], [rr * Math.sin(a) + d * Math.cos(a), L - 1.5, rr * Math.cos(a) - d * Math.sin(a)], 0.14, 6));
        out.push(...place([{ kind: "lathe", material: "hull-grey-dark", segs: 28, outline: true, profile: [[COLLARS[cls].outer / 2, -0.8], [COLLARS[cls].outer / 2, 0]] } as Lathe, ...collar(cls, 0, 1)], { at: [p.at[0], L, p.at[2]] }));
        out.push(...lamps([{ at: [p.at[0] + Math.sin(a) * COLLARS[cls].outer * 0.5, L - 0.5, p.at[2] + Math.cos(a) * COLLARS[cls].outer * 0.5], colour: "blue", size: 0.14 }, { at: [p.at[0], L - 0.45, p.at[2]], colour: "flood", size: 0.16 }]));
        out.push(lightPool({ o: [p.at[0], L - 0.12, p.at[2]], u: [Math.cos(a), 0, -Math.sin(a)], v: [-Math.sin(a), 0, -Math.cos(a)], w: [0, 1, 0] }, COLLARS[cls].outer * 0.35));
      }
      return out;
    },
  });
}

/** A truss: an open spine segment with four longerons, bays and a cable run, so long ships have a real skeleton between modules. */
function truss(id: string, name: string, L: number, cls: CollarClass, mass: number): KitModule {
  const R = COLLARS[cls].outer / 2;
  return define({
    id,
    name,
    kind: "truss",
    note: `An open truss segment ${L} m long: four longerons, braced bays, hoops and a cable run, with ${cls} collars at both ends.`,
    mass,
    length: L,
    width: COLLARS[cls].outer + 1.4,
    top: cls,
    bottom: cls,
    livery: "industrial",
    build: () => {
      const out: Piece[] = [...collar(cls, 0, -1), ...collar(cls, L, 1)];
      const h = R * 0.72;
      const bays = Math.max(3, Math.round(L / (R * 1.4)));
      const dy = (L - 1.2) / bays;
      const lm = (sx: number, sz: number, y: number): Vec3 => [sx * h, y, sz * h];
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) out.push(...iBeam("hull-grey-dark", lm(sx, sz, 0.6), lm(sx, sz, L - 0.6), [sx, 0, sz], R * 0.16, R * 0.12));
      for (let b = 0; b <= bays; b++) {
        const y = 0.6 + b * dy;
        out.push(hoop("hull-grey", h * Math.SQRT2, y, R * 0.04, 28, 5));
        for (const [sx, sz, tx, tz] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]] as const) out.push(...channel("hull-grey", lm(sx, sz, y), lm(tx, tz, y), [0, 1, 0], R * 0.09, R * 0.06));
        if (b < bays) for (const [sx, sz, tx, tz] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]] as const) out.push(...strut("hull-grey", lm(sx, sz, y), lm(b % 2 ? sx : tx, b % 2 ? sz : tz, y + dy), R * 0.035, 10));
        if (b < bays) for (const [sx, sz] of [[1, 1], [-1, 1]] as const) out.push(rod("hull-grey-dark", lm(sx, sz, y), lm(-sx, sz, y + dy), R * 0.03, 4));
      }
      // central cable core and conduits
      out.push(post("hull-grey-dark", [0, 0], R * 0.22, 0.6, R * 0.22, L - 0.6, 14, { body: true }));
      for (let k = 0; k < 6; k++) out.push(post(k % 2 ? "copper" : "lamp-red", [R * 0.3 * Math.sin(deg(60 * k)), R * 0.3 * Math.cos(deg(60 * k))], R * 0.04, 0.6, R * 0.04, L - 0.6, 6));
      for (let b = 0; b < bays; b += 2) out.push(box("hull-grey-dark", [R * 0.3, 0.6 + b * dy + dy * 0.4, 0], R * 0.4, R * 0.3, dy * 0.3), box("lamp-amber", [R * 0.5, 0.6 + b * dy + dy * 0.45, 0], R * 0.06, R * 0.06, R * 0.06));
      return out;
    },
  });
}

/** An adapter: a cone from one collar class to the next, with a stiffening ring and bolt band. */
function adapter(id: string, from: CollarClass, to: CollarClass, mass: number): KitModule {
  const R0 = COLLARS[from].outer / 2;
  const R1 = COLLARS[to].outer / 2;
  const L = Math.max(2.4, Math.abs(R0 - R1) * 1.1);
  return define({
    id,
    name: `Adapter ${from} to ${to}`,
    kind: "adapter",
    note: `A conical adapter from a ${from} collar (${COLLARS[from].outer} m) at the bottom to a ${to} collar (${COLLARS[to].outer} m) at the top.`,
    mass,
    length: L,
    width: Math.max(R0, R1) * 2 + 0.6,
    top: to,
    bottom: from,
    livery: "industrial",
    build: (ctx) => {
      const out: Piece[] = [{ kind: "lathe", material: "hull-grey-dark", segs: 48, body: true, outline: true, profile: [[R0, 0.2], [R1, L - 0.2]], welds: [L * 0.5] }, ...collar(from, 0, -1), ...collar(to, L, 1)];
      const random = rng(`${ctx.seed}/adapter`);
      const rings = 3;
      for (let k = 0; k < rings; k++) {
        const t = (k + 1) / (rings + 1);
        const r = R0 + (R1 - R0) * t;
        out.push(hoop("hull-grey", r + 0.05, L * t, 0.08, 32, 5));
      }
      const ribs = 12;
      for (let k = 0; k < ribs; k++) {
        const a = (TAU * k) / ribs;
        out.push(rod("hull-grey", [(R0 + 0.06) * Math.sin(a), 0.25, (R0 + 0.06) * Math.cos(a)], [(R1 + 0.06) * Math.sin(a), L - 0.25, (R1 + 0.06) * Math.cos(a)], 0.07, 5));
      }
      out.push(...pipeRing("copper", R0 + 0.1, 0.9, 0.1, 32), ...pipeRing("hull-grey", R1 + 0.1, L - 0.9, 0.1, 32), ...hazardBand(R0, 0.3, 0.7, 24), ...hazardBand(R1, L - 0.7, L - 0.3, 24));
      for (let k = 0; k < 6; k++) out.push(rod(k % 2 ? "copper" : "lamp-blue", [(R0 + 0.12) * Math.sin(deg(30 + 60 * k)), 0.9, (R0 + 0.12) * Math.cos(deg(30 + 60 * k))], [(R1 + 0.12) * Math.sin(deg(30 + 60 * k)), L - 0.9, (R1 + 0.12) * Math.cos(deg(30 + 60 * k))], 0.05, 5));
      for (let k = 0; k < 4; k++) out.push(...hatch({ r: R0 + (R1 - R0) * 0.5, az: deg(45 + 90 * k), y: L / 2, size: 0.9, round: k % 2 === 0 }).map((q) => q));
      for (let k = 0; k < some(ctx, 8); k++) {
        const a = random() * TAU;
        const t = 0.25 + random() * 0.5;
        const r = R0 + (R1 - R0) * t;
        out.push(box("hull-grey", [r * Math.sin(a), L * t, r * Math.cos(a)], 0.5, 0.3, 0.3, (a * 180) / Math.PI), ...lamps([{ at: [(r + 0.1) * Math.sin(a), L * t + 0.1, (r + 0.1) * Math.cos(a)], colour: "amber", size: 0.08 }]));
      }
      return out;
    },
  });
}

/** A forward shield: a heavy dome of tile layers over a stiff skirt, with deflector rings and sensors, to take dust at near-light speed. */
const shield = define({
  id: "shield-forward",
  name: "Forward particle shield",
  kind: "shield",
  note: "A forward dust and radiation shield: three layers of ceramic tile on a stiff skirt, with deflector rings, a bumper lattice and sensor heads; fits on an L collar.",
  mass: 640,
  length: 11,
  width: 13.4,
  bottom: "L",
  livery: "command",
  build: (ctx) => {
    const out: Piece[] = [...collar("L", 0, -1)];
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, body: true, outline: true, profile: [[6, 0.2], [6.5, 1.1], [6.5, 3.2], [6.0, 4.0]], welds: [2.2] });
    out.push(...tileShield([[6.0, 4.0], [5.6, 6.2], [4.4, 8.2], [2.8, 9.8], [0.9, 10.7], [0.001, 11.0]], ctx.seed, 56, 28));
    for (const y of [4.0, 6.2, 8.2]) out.push(hoop("hull-grey", y === 4 ? 6.05 : y === 6.2 ? 5.65 : 4.45, y, 0.14, 32, 5));
    // bumper lattice: standoff rods in front of the tile
    for (let k = 0; k < 24; k++) {
      const a = deg(15 * k);
      out.push(rod("hull-grey", [5.9 * Math.sin(a), 4.1, 5.9 * Math.cos(a)], [5.9 * 0.9 * Math.sin(a), 6.4, 5.9 * 0.9 * Math.cos(a)], 0.05, 4), rod("hull-grey", [5.4 * Math.sin(a), 6.3, 5.4 * Math.cos(a)], [4.2 * Math.sin(a), 8.3, 4.2 * Math.cos(a)], 0.05, 4));
    }
    // skirt: panels, hatches, lamps, sensors
    out.push(...drum(ctx, { R: 6.5, L: 3.4, panels: { wide: 2.0, tall: 1.2 }, hatches: 2, conduits: 3, trays: 0, vents: 3, ladders: 0, digits: "60", junk: 28, hazard: false, rings: [0.5] }).filter((p) => !(p.kind === "lathe" && (p.body || p.under === undefined && p.material === "hull-grey-dark")) && !(p.kind === "lathe" && p.material === "black" && false)).map((p) => place([p], { at: [0, 0.2, 0] })[0]));
    for (let k = 0; k < 4; k++) {
      const a = deg(45 + 90 * k);
      out.push(...horn("hull-grey-dark", [5.2 * Math.sin(a), 7.0, 5.2 * Math.cos(a)], [5.6 * Math.sin(a), 8.0, 5.6 * Math.cos(a)], [0.35, 0.3, 0.25], 10), rod("glass", [5.6 * Math.sin(a), 8.0, 5.6 * Math.cos(a)], [5.7 * Math.sin(a), 8.1, 5.7 * Math.cos(a)], 0.22, 10));
    }
    out.push(...lamps(ringOf(12, 6.3, 3.3, 0).map((p) => ({ at: p.at, colour: "blue" as const, size: 0.12 }))));
    return out;
  },
});


// ---------------------------------------------------------------------------------------------------------------------------------
// the named sections of a crewed ship: header tank, navigation deck, comms array, common area, storage, EVA lock, mission pods

type Furniture = "bunks" | "bench" | "farm" | "cargo" | "bridge";

/** A pressurised bay on M collars, with a band of windows and a stencilled number, and decks inside when opened. */
function bay(o: { id: string; name: string; note: string; R: number; L: number; mass: number; furniture: Furniture; digits: string; glass: "glass" | "plant" | "none"; livery: LiveryName; spacing?: number; slot?: string; extra?: (ctx: Ctx, y0: number, y1: number) => Piece[] }): KitModule {
  return define({
    id: o.id,
    name: o.name,
    kind: "habitat",
    note: o.note,
    mass: o.mass,
    length: o.L,
    width: 2 * o.R + 2.0,
    top: "M",
    bottom: "M",
    inside: true,
    ...(o.slot ? { slot: o.slot } : {}),
    livery: o.livery,
    build: (ctx) => {
      const out = drum(ctx, { R: o.R, L: o.L, top: "M", bottom: "M", panels: { wide: 2.0, tall: 1.5 }, hatches: 4, roundHatches: true, conduits: 3, trays: 2, vents: 3, ladders: 1, digits: o.digits, rings: [0.25, 0.5, 0.75] });
      const [y0, y1] = straight({ R: o.R, L: o.L, top: "M", bottom: "M" });
      const az: readonly [number, number] = ctx.cutaway ? CUT : [0, TAU];
      if (o.glass !== "none") {
        const bands = Math.max(1, Math.floor((y1 - y0) / 4));
        for (let b = 0; b < bands; b++) {
          const y = y0 + ((y1 - y0) * (b + 0.5)) / bands;
          const n = some(ctx, Math.round((TAU * o.R) / 2.0));
          for (let i = 0; i < n; i++) {
            const a = az[0] + ((az[1] - az[0]) * (i + 0.5)) / n;
            const wide = ((az[1] - az[0]) * o.R) / n - 0.3;
            out.push(...glazing(o.R + 0.012, a, y, wide, 1.2, 0.08, o.glass === "glass" ? "window" : o.glass === "plant" ? "plant" : "window"));
          }
        }
      }
      out.push(...(o.extra?.(ctx, y0, y1) ?? []));
      if (ctx.cutaway) out.push(...decks(ctx, o.R, y0 + 0.1, y1 - 0.1, o.spacing ?? 3.2, o.furniture));
      return out;
    },
  });
}

/** An array of dishes and phased panels on arms round a drum. */
const commsArray = define({
  id: "comms-array-m",
  name: "Communications array",
  kind: "sensor",
  note: "A comms drum: four deep-space dishes on arms, phased panels, horns and whips, with the transmitter deck inside; M collars.",
  mass: 74,
  length: 10,
  width: 20,
  top: "M",
  bottom: "M",
  inside: true,
  livery: "command",
  build: (ctx) => {
    const R = 3;
    const out = drum(ctx, { R, L: 10, top: "M", bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 3, roundHatches: true, conduits: 3, trays: 2, vents: 3, ladders: 1, digits: "21", junk: 40, rings: [0.3, 0.7] });
    for (let k = 0; k < 4; k++) {
      const a = deg(45 + 90 * k);
      const s: Vec3 = [Math.sin(a), 0, Math.cos(a)];
      const root: Vec3 = [s[0] * R, 5, s[2] * R];
      const hub: Vec3 = [s[0] * (R + 3.2), 6.6, s[2] * (R + 3.2)];
      out.push(beam("hull-grey-dark", root, hub, 0.35, 0.35), rod("hull-grey", [s[0] * R, 3.4, s[2] * R], hub, 0.12, 6), ...antenna("dish", hub, [s[0] * 0.8, 0.6, s[2] * 0.8], 4.6, `${ctx.seed}/${k}`));
      out.push(...antenna("phased", [s[0] * (R + 0.2), 8.8, s[2] * (R + 0.2)], [s[0], 0.15, s[2]], 1.8, `${ctx.seed}/p${k}`), ...antenna("whip", [s[0] * (R + 0.1), 8.6, s[2] * (R + 0.1)], [s[0] * 0.7, 0.7, s[2] * 0.7], 1.0 + k * 0.1));
    }
    out.push(...antenna("horn", [R + 0.1, 7.6, 0], [1, 0, 0], 1.4));
    if (ctx.cutaway) out.push(...decks(ctx, R, 0.9, 9.1, 2.8, "bridge"));
    return out;
  },
});

/** An EVA lock: a short drum with two big round hatches, a suit room, handrails, tether rings and floodlights. */
const evaLock = define({
  id: "eva-lock-m",
  name: "EVA lock",
  kind: "habitat",
  note: "The way out: two heavy round hatches, a suit room with racks, handrails and tether rings on the hull, floodlights; M collars.",
  mass: 52,
  length: 8,
  width: 8,
  top: "M",
  bottom: "M",
  inside: true,
  livery: "science",
  build: (ctx) => {
    const R = 3;
    const out = drum(ctx, { R, L: 8, top: "M", bottom: "M", panels: { wide: 1.6, tall: 1.3 }, hatches: 2, roundHatches: true, conduits: 2, trays: 1, vents: 2, ladders: 0, digits: "22", junk: 24, rings: [0.5] });
    for (const a of [deg(-20), deg(20)]) out.push(...hatch({ r: R + 0.05, az: a, y: 4, size: 2.4, round: true }));
    for (let k = 0; k < 6; k++) out.push(rod("hull-yellow", [(R + 0.08) * Math.sin(deg(60 * k + 10)), 1.2, (R + 0.08) * Math.cos(deg(60 * k + 10))], [(R + 0.08) * Math.sin(deg(60 * k + 10)), 6.8, (R + 0.08) * Math.cos(deg(60 * k + 10))], 0.04, 5), hoop("hull-yellow", R + 0.45, 1.4 + k, 0.03, 12, 4, { arc: () => [deg(60 * k + 4), deg(60 * k + 16)] }));
    for (let k = 0; k < 8; k++) out.push(hoop("hull-grey-dark", R + 0.2, 1.2 + (k % 4) * 1.6, 0.07, 10, 4, { arc: () => [deg(90 * (k % 4) + 30), deg(90 * (k % 4) + 44)] }));
    for (const a of [deg(-45), deg(45)]) out.push(rod("hull-grey", [(R + 0.1) * Math.sin(a), 6.2, (R + 0.1) * Math.cos(a)], [(R + 0.9) * Math.sin(a), 6.8, (R + 0.9) * Math.cos(a)], 0.08, 6), ...horn("hull-white", [(R + 0.9) * Math.sin(a), 6.8, (R + 0.9) * Math.cos(a)], [(R + 1.5) * Math.sin(a), 7.0, (R + 1.5) * Math.cos(a)], [0.3, 0.45], 10), ...lamps([{ at: [(R + 1.5) * Math.sin(a), 7.0, (R + 1.5) * Math.cos(a)], colour: "amber", size: 0.2 }]));
    if (ctx.cutaway) {
      out.push(...decks(ctx, R, 0.9, 7.1, 3.1, "bench"));
      for (let k = 0; k < 6; k++) out.push(box("hull-white", [(R - 1.7) * Math.sin(deg(-60 + 24 * k)), 1.0, (R - 1.7) * Math.cos(deg(-60 + 24 * k))], 0.7, 0.5, 2.0, -60 + 24 * k), box("hull-orange", [(R - 1.7) * Math.sin(deg(-60 + 24 * k)), 1.4, (R - 1.7) * Math.cos(deg(-60 + 24 * k))], 0.55, 0.4, 1.0, -60 + 24 * k));
    }
    return out;
  },
});

/** The observation dome: a lounge drum crowned with an armoured glass dome and six shutter petals, a descendant of the ISS Cupola, with a ring of armoured portholes on its hull, some shuttered. */
const domeLounge = define({
  id: "dome-observation-m",
  name: "Observation dome",
  kind: "habitat",
  note: "A crowning lounge: a drum with a ring of armoured portholes with burn shutters, and an armoured glass dome with six shutter petals, a descendant of the ISS Cupola; an M collar below and nothing above.",
  mass: 74,
  length: 12.2,
  width: 10,
  bottom: "M",
  inside: true,
  livery: "science",
  build: (ctx) => {
    const R = 4.4;
    const L = 9;
    const out = drum(ctx, { R, L, bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 2, conduits: 2, trays: 1, vents: 2, ladders: 1, digits: "26", junk: 20, rings: [0.5], hazard: true });
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, body: true, outline: true, profile: [[R, L], [R * 0.74, L + 0.15], [R * 0.74, L + 0.3]] });
    out.push(...observationDome([0, L + 0.3, 0], R * 0.72, "open"));
    // armoured portholes round the hull in two rows, the lower row's shutters closed as for a burn
    for (let k = 0; k < some(ctx, 12); k++) out.push(...porthole(R + 0.05, deg(15 + 30 * k), 5.6, 0.42, k % 3 === 0 ? "closed" : "open"));
    for (let k = 0; k < some(ctx, 8); k++) out.push(...porthole(R + 0.05, deg(40 + 45 * k), 3.6, 0.36, k % 4 === 0 ? "closed" : "open"));
    if (ctx.cutaway) {
      out.push(...decks(ctx, R, 0.9, L - 0.2, 4.0, "bench"));
      out.push(...place(room("lounge", ctx.seed), { at: [0, L - 0.1, -1.0], yaw: 180 }));
    }
    return out;
  },
});

/** The solarium: a glazed garden hall between two plated ends, with mullions, hoops, armoured shutters, planters, trees, a pool, benches and rows of grow-lamps that glow when the engines are lit. */
const solariumModule = define({
  id: "solarium-m",
  name: "Solarium",
  kind: "habitat",
  note: "A glazed garden hall for plants and people: a long glass drum between plated ends, mullioned and hooped, with armoured shutters that close against a burn, planters, trees, a pool and grow-lamps; M collars.",
  mass: 210,
  length: 20,
  width: 16,
  top: "M",
  bottom: "M",
  inside: true,
  livery: "science",
  build: (ctx) => {
    const R = 7.4;
    const y0 = 2.4;
    const y1 = 17.6;
    const out: Piece[] = [];
    const ends = (y: number, top: boolean) => drum(ctx, { R, L: 2.4, ...(top ? { top: "M" as const } : { bottom: "M" as const }), panels: { wide: 2.2, tall: 1.3 }, hatches: 2, conduits: 2, trays: 1, vents: 2, ladders: 0, digits: top ? "28" : "27", junk: 12, rings: [0.5], hazard: false }).map((p) => place([p], { at: [0, y, 0] })[0]);
    out.push(...ends(0, false), ...ends(17.6, true));
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 56, only: "mesh", profile: [[R, y0], [R * 0.2, y0]] }, { kind: "lathe", material: "hull-grey-dark", segs: 56, only: "mesh", profile: [[R, y1], [R * 0.2, y1]] });
    const arc = ctx.cutaway ? CUT : ([0, TAU] as const);
    out.push({ kind: "lathe", material: "glass-clear", segs: 72, body: true, outline: true, profile: [[R - 0.05, y0], [R - 0.05, y1]], arc: () => arc });
    const mullions = some(ctx, 36);
    for (let k = 0; k < mullions; k++) {
      const a = arc[0] + ((arc[1] - arc[0]) * (k + (ctx.cutaway ? 0.5 : 0))) / mullions;
      out.push(rod(k % 3 === 0 ? "pipe-steel" : "hull-grey", [R * Math.sin(a), y0, R * Math.cos(a)], [R * Math.sin(a), y1, R * Math.cos(a)], 0.09, 8));
    }
    for (const y of [y0 + 0.05, 5.8, 9.2, 12.6, y1 - 0.05]) out.push(hoop("hull-grey", R + 0.02, y, 0.1, 72, 6, { arc: () => arc }));
    // armoured shutters: panels that fold along the mullions, stowed on most bays and closed on a few
    for (let k = 0; k < some(ctx, 12); k++) {
      const a = deg(15 + 30 * k) + (ctx.cutaway ? 0 : 0);
      const closed = k % 4 === 1;
      if (ctx.cutaway && (a < CUT[0] || a > CUT[1])) continue;
      for (const [ya, yb] of closed ? [[y0 + 0.2, 9.8], [9.8, y1 - 0.2]] : [[y1 - 1.6, y1 - 0.2]]) out.push(...framedPanel("hull-grey", "hull-white-worn", R + 0.1, a, (ya + yb) / 2, 2.8, yb - ya - 0.1, 0.12, true));
    }
    // inside: the floor, planters, trees, a pool, benches and grow-lamps
    const random = rng(`${ctx.seed}/solarium`);
    out.push({ kind: "lathe", material: "deck", segs: 56, only: "mesh", profile: [[0.01, y0 + 0.06], [R - 0.3, y0 + 0.06]] });
    out.push({ kind: "lathe", material: "soil", segs: 40, only: "mesh", profile: [[0.01, y0 + 0.3], [R * 0.35, y0 + 0.3]] }, annulus("hull-grey", R * 0.35, R * 0.4, y0, y0 + 0.45, 40, { only: "mesh" }), { kind: "lathe", material: "water", segs: 24, only: "mesh", profile: [[0.01, y0 + 0.24], [R * 0.16, y0 + 0.24]] }, annulus("hull-white", R * 0.16, R * 0.2, y0, y0 + 0.4, 24, { only: "mesh" }));
    for (let k = 0; k < some(ctx, 14); k++) {
      const a = (TAU * (k + random() * 0.4)) / some(ctx, 14);
      const rr = R * (0.45 + random() * 0.45);
      const x = rr * Math.sin(a);
      const z = rr * Math.cos(a);
      const tall = 3.5 + random() * 6;
      out.push(post("wood", [x, z], 0.22, y0 + 0.06, 0.12, y0 + tall * 0.7, 8), ...horn("leaf", [x, y0 + tall * 0.45, z], [x, y0 + tall, z], [1.9 + random(), 2.2, 1.6, 0.9, 0.3], 10));
    }
    for (let k = 0; k < some(ctx, 10); k++) {
      const a = (TAU * (k + 0.5)) / some(ctx, 10);
      out.push(box("hull-grey", [(R - 1.1) * Math.sin(a), y0 + 0.06, (R - 1.1) * Math.cos(a)], 2.8, 1.1, 0.6, (a * 180) / Math.PI), box("soil", [(R - 1.1) * Math.sin(a), y0 + 0.66, (R - 1.1) * Math.cos(a)], 2.6, 0.9, 0.04), box("leaf", [(R - 1.1) * Math.sin(a), y0 + 0.7, (R - 1.1) * Math.cos(a)], 2.4, 0.8, 0.5, (a * 180) / Math.PI), box("wood", [(R * 0.6) * Math.sin(a + 0.15), y0 + 0.06, (R * 0.6) * Math.cos(a + 0.15)], 1.6, 0.4, 0.45, (a * 180) / Math.PI));
    }
    for (const rr of [R * 0.3, R * 0.55, R * 0.8]) out.push(hoop("grow-lamp", rr, y1 - 1.0, 0.16, 48, 6), ...Array.from({ length: 6 }, (_, k) => rod("hull-grey", [rr * Math.sin((k * TAU) / 6), y1 - 1.0, rr * Math.cos((k * TAU) / 6)], [rr * Math.sin((k * TAU) / 6), y1, rr * Math.cos((k * TAU) / 6)], 0.04, 6)));
    out.push(post("pipe-steel", [0, 0], 0.5, y0, 0.5, y1, 14), ...ladder(0.5, 0, y0 + 0.4, y1 - 0.4, 0.5));
    return out;
  },
});

/** A mission pod: a pod-sized drum on M collars that swaps for another of its slot; `survey` carries sample drones and a sensor boom, `medical` a rescue bay and a winch. */
function missionPod(kind: "survey" | "medical"): KitModule {
  const survey = kind === "survey";
  return define({
    id: `pod-${kind}-m`,
    name: survey ? "Mission pod, survey" : "Mission pod, medical and rescue",
    kind: "lab",
    note: survey ? "The swappable pod for survey work: six drone cradles, a sample hopper, a sensor boom and a spectrometer deck; M collars, the same size as the medical pod." : "The swappable pod for rescue and care: a stretcher bay, a decontamination lock, an outside winch and a surgery; M collars, the same size as the survey pod.",
    mass: 88,
    length: 10,
    width: 10.4,
    top: "M",
    bottom: "M",
    inside: true,
    slot: "mission-pod",
    livery: survey ? "science" : "transport",
    build: (ctx) => {
      const R = 3.2;
      const out = drum(ctx, { R, L: 10, top: "M", bottom: "M", panels: { wide: 1.8, tall: 1.4 }, hatches: 3, roundHatches: true, conduits: 3, trays: 2, vents: 3, ladders: 1, digits: survey ? "31" : "32", junk: 40, rings: [0.25, 0.5, 0.75] });
      if (survey) {
        for (let k = 0; k < 6; k++) {
          const a = deg(30 + 60 * k);
          const c: Vec3 = [(R + 0.9) * Math.sin(a), 3.2 + (k % 2) * 3, (R + 0.9) * Math.cos(a)];
          out.push(box("hull-grey-dark", [c[0], c[1] - 0.6, c[2]], 1.5, 1.5, 1.2, (a * 180) / Math.PI), rod("hull-white", [c[0], c[1] + 0.3, c[2]], [c[0] + Math.sin(a) * 0.6, c[1] + 0.3, c[2] + Math.cos(a) * 0.6], 0.35, 8), ...horn("hull-grey", [c[0], c[1] + 0.3, c[2]], [c[0] + Math.sin(a) * 0.9, c[1] + 0.3, c[2] + Math.cos(a) * 0.9], [0.25, 0.2], 8), rod("hull-yellow", [c[0] - Math.cos(a) * 0.7, c[1] - 0.6, c[2] + Math.sin(a) * 0.7], [c[0] + Math.cos(a) * 0.7, c[1] - 0.6, c[2] - Math.sin(a) * 0.7], 0.05, 5));
        }
        out.push(beam("hull-grey-dark", [R * 0.7, 5, 0.0], [R + 2.6, 5.4, 0], 0.22, 0.22), ...antenna("yagi", [R + 2.6, 5.4, 0], [1, 0.1, 0], 2.8, ctx.seed), ...horn("hull-grey-dark", [R + 2.6, 5.4, 0.0], [R + 3.4, 5.4, 0.0], [0.5, 0.35], 10));
      } else {
        for (const a of [deg(25), deg(155), deg(205), deg(335)]) out.push(panel("lamp-red", R + 0.01, a, 5.5, 1.5, 0.45, 0.08), panel("lamp-red", R + 0.01, a, 5.5, 0.45, 1.5, 0.08), panel("hull-white", R + 0.005, a, 5.5, 2.2, 2.2, 0.05));
        const crane: Vec3 = [(R + 0.4) * Math.sin(deg(-40)), 8.6, (R + 0.4) * Math.cos(deg(-40))];
        out.push(box("hull-grey-dark", [crane[0], 7.4, crane[2]], 1.0, 1.0, 1.2), rod("hull-yellow", [crane[0], 8.6, crane[2]], [crane[0] - 1.8, 10.0, crane[2] + 1.8], 0.14, 8), rod("hull-grey", [crane[0] - 1.8, 10.0, crane[2] + 1.8], [crane[0] - 1.8, 7.4, crane[2] + 1.8], 0.03, 4), box("hull-orange", [crane[0] - 1.8, 6.8, crane[2] + 1.8], 0.8, 2.0, 0.5));
      }
      if (ctx.cutaway) out.push(...decks(ctx, R, 0.9, 9.1, 2.9, survey ? "bench" : "bunks"));
      return out;
    },
  });
}


// ---------------------------------------------------------------------------------------------------------------------------------
// the catalogue

const list: KitModule[] = [
  engineCluster(1, "engine-fusion-1", "Fusion engine, single", 360),
  engineCluster(3, "engine-fusion-3", "Fusion engine cluster, 3", 780),
  engineCluster(4, "engine-fusion-4", "Fusion engine cluster, 4", 960),
  engineCluster(7, "engine-fusion-7", "Fusion engine cluster, 7", 1500),
  thrusterPod,
  rcsRing,
  tank("tank-cryo-12", "Cryogenic fuel tank, 12 m", 6, 12, "L", "L", 160, 2100, "A cryogenic propellant tank: plated drum with manifold, valves and baffles; opened, it shows the liquid level, baffles and feed column."),
  tank("tank-cryo-24", "Cryogenic fuel tank, 24 m", 6, 24, "L", "L", 290, 4300, "The long cryogenic tank: the same drum twice as long, for the heavy ships' fuel."),
  tank("tank-slim-18", "Slim fuel tank, 18 m", 2.7, 18, "M", "M", 70, 520, "A slim propellant tank on M collars, for strapping alongside the spine."),
  sphereFarm,
  container("container-12", "Heavy cargo container", 12, false, 38),
  container("container-12-cold", "Refrigerated container", 12, true, 44),
  define({
    id: "cargo-bay-4",
    name: "Cargo bay frame",
    kind: "cargo",
    note: "A girder cradle holding four containers parallel to the spine on M ports, with clamps, a gantry rail and a loading crane.",
    mass: 150,
    length: 15,
    width: 22,
    top: "L",
    bottom: "L",
    ports: [0, 1, 2, 3].map((i) => ({ id: `bay${i + 1}`, collar: "M" as const, at: [7 * Math.sin(deg(45 + 90 * i)), 1.5, 7 * Math.cos(deg(45 + 90 * i))] as Vec3 })),
    livery: "transport",
    build: (ctx) => {
      const out: Piece[] = drum(ctx, { R: 6, L: 15, top: "L", bottom: "L", panels: { wide: 2.4, tall: 1.6 }, hatches: 4, roundHatches: true, conduits: 5, trays: 3, vents: 4, ladders: 2, digits: "70", junk: 60, rings: [0.1, 0.5, 0.9] });
      for (let i = 0; i < 4; i++) {
        const a = deg(45 + 90 * i);
        const cx = 7 * Math.sin(a);
        const cz = 7 * Math.cos(a);
        // a cradle: base plate, four clamp towers, struts to the hull
        out.push(box("hull-grey-dark", [cx, 0.8, cz], 6.8, 6.8, 0.7, (a * 180) / Math.PI));
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          const px = cx + (sx * 3.2 * Math.cos(a) + sz * 3.2 * Math.sin(a));
          const pz = cz + (-sx * 3.2 * Math.sin(a) + sz * 3.2 * Math.cos(a));
          out.push(box("hull-white-worn", [px, 1.5, pz], 0.6, 0.6, 1.4), box("hazard", [px, 2.5, pz], 0.62, 0.62, 0.18), box("hull-grey", [px, 2.9, pz], 0.8, 0.8, 0.3), rod("hull-grey", [px, 2.9, pz], [px * 0.98, 14, pz * 0.98], 0.07, 5));
        }
        out.push(beam("hull-grey-dark", [6 * Math.sin(a), 1.2, 6 * Math.cos(a)], [cx, 1.2, cz], 1.1, 0.5), beam("hull-grey-dark", [6 * Math.sin(a), 13.8, 6 * Math.cos(a)], [cx, 13.8, cz], 1.1, 0.5), beam("hull-grey-dark", [6 * Math.sin(a), 7.5, 6 * Math.cos(a)], [cx, 7.5, cz], 0.5, 0.5));
        out.push(hoop("hull-grey", 3.55, 14.0, 0.08, 20, 4, { at: [cx, cz] }));
      }
      out.push(hoop("hull-yellow", 11.6, 14.8, 0.1, 32, 5), ...Array.from({ length: 16 }, (_, k) => rod("hull-yellow", [11.6 * Math.sin(deg(22.5 * k)), 14.4, 11.6 * Math.cos(deg(22.5 * k))], [11.6 * Math.sin(deg(22.5 * k)), 14.8, 11.6 * Math.cos(deg(22.5 * k))], 0.05, 4)));
      return out;
    },
  }),
  habitatRing("habitat-ring-16", "Habitat ring, 16 m", 16, 520),
  habitatRing("habitat-ring-30", "Habitat ring, 30 m", 30, 1800),
  habitatDrum("habitat-drum-crew", "Crew habitat drum", 4.8, 18, 190, false),
  habitatDrum("habitat-drum-large", "Passenger habitat drum", 6, 24, 340, false),
  habitatDrum("farm-drum", "Farm drum", 6, 18, 260, true),
  lab,
  bay({ id: "deck-nav-m", name: "Navigation deck", note: "The bridge drum: a ring of big windows, helm, navigation and sensor consoles in tiers, and the chart table; M collars.", R: 4.6, L: 10, mass: 120, furniture: "bridge", digits: "23", glass: "glass", livery: "command", spacing: 3.1 }),
  bay({ id: "common-area-m", name: "Common area", note: "A shared hall: a galley, tables, a lounge, a gym and big windows, one deck high with a gallery; M collars.", R: 4.8, L: 12, mass: 130, furniture: "bench", digits: "24", glass: "glass", livery: "science", spacing: 3.6 }),
  bay({ id: "store-drum-m", name: "Stores drum", note: "Stores: racked crates of food, spares and water behind sealed hatches; M collars.", R: 4.4, L: 14, mass: 98, furniture: "cargo", digits: "25", glass: "none", livery: "transport", spacing: 3.4 }),
  commsArray,
  evaLock,
  domeLounge,
  solariumModule,
  tank("tank-header-9", "Header tank, 9 m", 3, 9, "M", "M", 24, 160, "A small reserve tank for each propellant, high on the spine so the feed lines run downhill: a header tank, with its own valves and level gauge."),
  missionPod("survey"),
  missionPod("medical"),
  sensorMast,
  reactor,
  radiatorArray("radiator-stowed", "Radiator array, stowed", false, 70),
  radiatorArray("radiator-deployed", "Radiator array, deployed", true, 70),
  dockingNode("node-two", "Docking node, 2 ports", 2, "M", 85),
  dockingNode("node-four", "Docking node, 4 ports", 4, "M", 120),
  truss("truss-m-12", "Truss segment, M, 12 m", 12, "M", 18),
  truss("truss-l-24", "Truss segment, L, 24 m", 24, "L", 64),
  adapter("adapter-m-l", "M", "L", 14),
  adapter("adapter-l-m", "L", "M", 14),
  shield,
];

/**
 * Every module of the fleet kit, by id: name, mass and size in metres, collars, ports and how to draw it.
 *
 * @example
 * ```ts
 * import { KIT } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(KIT).length, KIT["engine-fusion-7"].mass);
 * ```
 */
export const KIT: Readonly<Record<string, KitModule>> = Object.fromEntries(list.map((m) => [m.id, m]));

/**
 * The kit's builders, for a ship that needs a module of its own size: a 40 m container, an 80 m tank, a 165 m ring, a 24 m truss bay. Each takes the numbers a module is made from and gives a `KitModule` with the same collars,
 * detail and cutaway; the ship adds it to its list by putting it in its own table, or by `shipParts`.
 *
 * @example
 * ```ts
 * import { BUILDERS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const container40 = BUILDERS.container("my-container-40", "Container, 40 m", 40, false, 400);
 * console.log(container40.length, container40.pieces({ detail: 0.4 }).length > 100);
 * ```
 */
export const BUILDERS = { container, tank, habitatRing, habitatDrum, truss, radiatorArray, engineCluster, adapter, dockingNode, bay, missionPod } as const;
