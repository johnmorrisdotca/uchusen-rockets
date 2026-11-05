// The shared body builder: a drum of the fleet's plating with collars at its ends, hatches, conduits, pipe rings, trays, vents, ladders, hazard bands, lamps, a stencilled number and scattered machinery. Most modules
// are a drum with something added. Pure: no three.js and no DOM.
import { deg } from "../../framing.ts";
import type { MaterialName } from "../materials.ts";
import type { Lathe, Piece, Vec3 } from "../pieces.ts";
import { type CollarClass, COLLARS, collar } from "./collars.ts";
import { annulus, beam, box, cableTray, conduitRun, floodlight, foilBand, greebles, hatch, hazardBand, hullPanels, ladder, lamps, type Livery, LIVERY, type LiveryName, navLight, patch, pipeRing, post, rng, ringOf, sagOf, stencil, vent } from "./detail.ts";
import { beaconLamp, sternLamp } from "./lights.ts";
import { HULL_STACKS, type HullStack, type HullStackName, layerShells, stackDepth } from "./layers.ts";
import type { ModuleOptions } from "./types.ts";

/** What a module is built with: its options settled. */
export interface Ctx {
  detail: number;
  cutaway: boolean;
  livery: Livery;
  liveryName: LiveryName;
  seed: string;
  /** The hull layers a cutaway shows, and how thick they are in metres. */
  stack: HullStack;
  depth: number;
  /** Only the hull and the collars: the first, coarse level. */
  coarse: boolean;
}

/** Settles a module's options. */
export function contextOf(id: string, own: LiveryName, options: ModuleOptions = {}, hull: HullStackName = "transport"): Ctx {
  const stack = HULL_STACKS[options.hull ?? hull];
  const detail = Math.max(0.25, Math.min(1, options.detail ?? 1));
  const liveryName = options.livery ?? own;
  return { detail, cutaway: options.cutaway ?? false, livery: LIVERY[liveryName], liveryName, seed: `${id}/${options.seed ?? ""}`, stack, depth: stackDepth(stack), coarse: options.level === "coarse" };
}

/** A count scaled by the detail level, at least 1 if it was more than 0. */
export const some = (ctx: Ctx, n: number): number => (n <= 0 ? 0 : Math.max(1, Math.round(n * ctx.detail)));

/** The part of the circle a cutaway leaves: the hull is open on the windward side. */
export const CUT: readonly [number, number] = [deg(58), deg(302)];

export interface DrumSpec {
  R: number;
  L: number;
  top?: CollarClass;
  bottom?: CollarClass;
  /** Rows of plating and their size. `false`: no plating (a module with its own skin). */
  panels?: { wide: number; tall: number } | false;
  hatches?: number;
  roundHatches?: boolean;
  conduits?: number;
  trays?: number;
  vents?: number;
  ladders?: number;
  /** Heights of structural rings with a pipe ring on each, as fractions of the straight length. */
  rings?: readonly number[];
  digits?: string;
  junk?: number;
  /** Hazard bands at the foot and head of the straight part. */
  hazard?: boolean;
  /** The material of the structure under the plating. */
  under?: MaterialName;
}

const span0 = (az: readonly [number, number]): number => az[1] - az[0];

/** The radius of the end cone's far end: where the drum meets a collar. */
const collarRadius = (c: CollarClass | undefined): number => (c ? COLLARS[c].outer / 2 : 0);

/** How long the cone from the hull to a collar is. */
export const shoulder = (R: number, c: CollarClass | undefined): number => (c && R > collarRadius(c) + 0.05 ? Math.max(0.5, (R - collarRadius(c)) * 0.8) : 0);

/** The straight part of a drum: from y0 to y1. */
export function straight(spec: DrumSpec): [number, number] {
  return [shoulder(spec.R, spec.bottom), spec.L - shoulder(spec.R, spec.top)];
}

/** A drum: the hull, its collars, and all its detail. */
export function drum(ctx: Ctx, spec: DrumSpec): Piece[] {
  const { R, L } = spec;
  const random = rng(`${ctx.seed}/drum`);
  const [y0, y1] = straight(spec);
  const open = ctx.cutaway;
  const az: readonly [number, number] = open ? CUT : [0, 2 * Math.PI];
  const out: Piece[] = [];
  const under = spec.under ?? ctx.livery.under;
  const profile: [number, number][] = [];
  if (spec.bottom && y0 > 0) profile.push([collarRadius(spec.bottom), 0]);
  profile.push([R, y0], [R, y1]);
  if (spec.top && y1 < L) profile.push([collarRadius(spec.top), L]);
  if (!spec.bottom) profile[0] = [R, 0];
  if (!spec.top) profile[profile.length - 1] = [R, L];
  const ringYs = (spec.rings ?? [0.25, 0.5, 0.75]).map((f) => y0 + (y1 - y0) * f);
  const shell: Lathe = { kind: "lathe", material: under, segs: 56, body: true, outline: true, profile, welds: [y0, y1, ...ringYs], ...(open ? { arc: () => az, outline: false } : {}) };
  out.push(shell);
  if (open) out.push(...layerShells(R, y0, y1, ctx.stack, az));
  if (spec.bottom) out.push(...collar(spec.bottom, 0, -1));
  if (spec.top) out.push(...collar(spec.top, L, 1));
  if (ctx.coarse) return out;
  // the shoulders: a stiffening ring and a row of fixings where the hull steps to the collar
  for (const [yy, end] of [[y0, spec.bottom], [y1, spec.top]] as const) if (end && Math.abs(yy - (yy === y0 ? 0 : L)) > 0.3) out.push(...pipeRing("hull-grey-dark", R, yy, 0.1));
  const span = az[1] - az[0];
  const spot = (i: number, n: number) => az[0] + span * ((i + 0.5 + (random() - 0.5) * 0.3) / n);
  const mid = (a: number, b: number) => a + (b - a) * (0.15 + random() * 0.7);
  // what stands on the hull is placed first, and the plating leaves room for it: a flat panel on a curved hull stands proud at its edges by its sag, so a rail, a ring or a pipe stands clear of that
  const panelSize = spec.panels === false ? null : (spec.panels ?? { wide: 2.4, tall: 1.6 });
  const proud = 0.22 + (panelSize ? sagOf(R, panelSize.wide / Math.sqrt(ctx.detail)) : 0);
  const nHatch = some(ctx, spec.hatches ?? 4);
  const hatches = Array.from({ length: nHatch }, (_, i) => ({ az: spot(i, nHatch), y: mid(y0, y1), size: 0.9 + random() * 0.6 }));
  const nConduit = some(ctx, spec.conduits ?? 3);
  const conduits = Array.from({ length: nConduit }, (_, i) => ({ az: spot(i, nConduit) + 0.05, count: 2 + Math.floor(random() * 3), pipe: 0.06 + random() * 0.05 }));
  const nTray = some(ctx, spec.trays ?? 2);
  const trays = Array.from({ length: nTray }, (_, i) => spot(i, nTray) + 0.12);
  const nVent = some(ctx, spec.vents ?? 3);
  const vents = Array.from({ length: nVent }, (_, i) => ({ az: spot(i, nVent) - 0.08, y: mid(y0, y1) }));
  const nLadder = some(ctx, spec.ladders ?? 1);
  const ladders = Array.from({ length: nLadder }, (_, i) => spot(i, nLadder) + 0.2);
  const stencilAt = az[0] + span * (open ? 0.5 : 0.62);
  const strip = (a: number, wide: number) => ({ az: a, y: (y0 + y1) / 2, wide, tall: y1 - y0 });
  const clear = [...hatches.map((h) => ({ az: h.az, y: h.y, wide: h.size * 1.3, tall: h.size * 1.3 })), ...conduits.map((c) => strip(c.az, c.count * c.pipe * 3 + 0.3)), ...trays.map((a) => strip(a, 0.6)), ...vents.map((v) => ({ az: v.az, y: v.y, wide: 1.2, tall: 0.8 })), ...ladders.map((a) => strip(a, 0.6)), { az: stencilAt, y: (y0 + y1) / 2, wide: Math.min(1.6, R * 0.4) * 0.8, tall: Math.min(1.6, R * 0.4) * 1.3 }];
  if (panelSize) out.push(...hullPanels({ r: R, y0: y0 + 0.15, y1: y1 - 0.15, az: open ? az : undefined, livery: ctx.livery, seed: ctx.seed, wide: panelSize.wide / Math.sqrt(ctx.detail), tall: panelSize.tall / Math.sqrt(ctx.detail), raise: 0.09, clear }));
  // crinkled foil cuffs where the hull steps down to a collar: multi-layer insulation wrapped round the joint, as on a real service module
  if (R >= 2) for (const [yy, end, low] of [[y0, spec.bottom, true], [y1, spec.top, false]] as const) if (end) out.push(...foilBand(ctx.livery.foil ?? "foil", R + 0.07, low ? yy + 0.08 : yy - 0.56, low ? yy + 0.6 : yy - 0.04, az[0], az[1], ctx.seed, Math.max(0.3, R * 0.07), 0.035));
  // stringers up the hull stand well proud of the plating, so a close view has depth and the key light throws shadows between them: each is a T-rail, a web with a flange along its top
  const stringers = some(ctx, Math.max(12, Math.round(R * 3.2)));
  for (let i = 0; i < stringers; i++) {
    const a = az[0] + (span0(az) * (i + 0.5)) / stringers;
    const f = patch(R, a, 0);
    const at = (lift: number, y: number): Vec3 => [f.o[0] + f.w[0] * lift, y, f.o[2] + f.w[2] * lift];
    const material = i % 3 === 0 ? "pipe-steel" : "hull-grey";
    out.push(beam(material, at((proud + 0.12) / 2, y0 + 0.3), at((proud + 0.12) / 2, y1 - 0.3), 0.05, proud + 0.1), beam(material, at(proud + 0.12, y0 + 0.3), at(proud + 0.12, y1 - 0.3), 0.2, 0.05));
  }
  for (const y of [y0 + 0.1, ...ringYs, y1 - 0.1]) out.push(annulus("hull-grey-dark", R + 0.02, R + proud + 0.1, y - 0.1, y + 0.1, 40, { only: "mesh", ...(open ? { arc: () => az } : {}) }));
  for (const y of ringYs) out.push(...pipeRing(random() < 0.25 ? "coolant" : "pipe-steel", R + proud, y, 0.1, 48));
  for (const h of hatches) out.push(...hatch({ r: R + 0.04, az: h.az, y: h.y, size: h.size, round: spec.roundHatches ? hatches.indexOf(h) % 2 === 0 : false }));
  for (const c of conduits) out.push(...conduitRun({ r: R + 0.05, az: c.az, y0: y0 + 0.3, y1: y1 - 0.3, count: c.count, pipe: c.pipe, seed: ctx.seed }));
  for (const a of trays) out.push(...cableTray(R + 0.05, a, y0 + 0.5, y1 - 0.5, 0.45, ctx.seed));
  for (const v of vents) out.push(...vent(R + 0.04, v.az, v.y, 1.1, 0.7, 6));
  for (const a of ladders) out.push(...ladder(R + 0.05, a, y0 + 0.4, Math.min(y1 - 0.4, y0 + 7)));
  // hazard stencils: a few short stripes by the shoulders, where a person works, not a ring of yellow round the whole hull
  if (spec.hazard !== false) for (const k of [0.12, 0.45, 0.8]) out.push(...hazardBand(R, y0, y0 + 0.36, 5, [az[0] + span * k, az[0] + span * k + deg(26)]), ...hazardBand(R, y1 - 0.36, y1, 5, [az[0] + span * (k + 0.1), az[0] + span * (k + 0.1) + deg(26)]));
  out.push(...greebles({ r: R + 0.14, y0: y0 + 0.2, y1: y1 - 0.2, az, count: some(ctx, spec.junk ?? Math.round(R * (y1 - y0) * 0.35)), seed: ctx.seed, livery: ctx.livery }));
  out.push(...stencil(spec.digits ?? "07", R + 0.045, az[0] + span * (open ? 0.5 : 0.62), y0 + (y1 - y0) * 0.5, Math.min(1.6, R * 0.4), "black"));
  // navigation lamps at the shoulders
  const lampRing = (y: number, colour: "amber" | "red") => ringOf(4, R + proud * 0.6, y, 45).map((p) => ({ at: p.at, colour, size: 0.14 }));
  if (!open) {
    out.push(...lamps([...lampRing(y1 - 0.5, "amber"), ...lampRing(y0 + 0.5, "red")]));
    // red to port, green to starboard, a white strobe and a slow red beacon on top, a white stern light, and floodlights over the joint
    out.push(...navLight("port", R + proud * 0.8, deg(270), y1 - 1.0), ...navLight("starboard", R + proud * 0.8, deg(90), y1 - 1.0), ...navLight("strobe", R + proud * 0.8, 0, y1 - 1.0));
    out.push(...beaconLamp([0, y1 - 0.35, R + proud * 0.8], 0.12), ...sternLamp([0, y0 + 0.35, -(R + proud * 0.8)], 0.12));
    for (const a of [deg(150), deg(210)]) out.push(...floodlight(R + proud * 0.8, a, y1 - 1.3, 0.3));
  }
  return out;
}

/** Decks across a drum: discs at a spacing with a hatch shaft through the middle, then walls, doors and furniture in rooms, set so the open side shows them. For the inside of a cutaway. */
export function decks(ctx: Ctx, R: number, y0: number, y1: number, spacing: number, furniture: "bunks" | "bench" | "farm" | "cargo" | "bridge"): Piece[] {
  const random = rng(`${ctx.seed}/decks`);
  const out: Piece[] = [];
  const wall = R - ctx.depth - 0.05;
  const n = Math.max(1, Math.floor((y1 - y0) / spacing));
  const gap = (y1 - y0) / n;
  for (let d = 0; d <= n; d++) {
    const y = y0 + d * gap;
    out.push({ kind: "lathe", material: "deck", segs: 40, only: "mesh", profile: [[0.01, y], [wall, y]] });
    out.push({ kind: "lathe", material: "hull-grey-dark", segs: 40, only: "mesh", profile: [[wall, y - 0.12], [wall, y + 0.04]] });
    if (d === n) continue;
    const room = y + 0.04;
    const height = gap * 0.8;
    // walls across the room, facing the open side, with a door in each
    const rows = Math.max(1, Math.round(wall / 3.4));
    for (let k = 0; k < rows; k++) {
      const z = -wall * 0.8 + (1.6 * wall * (k + 0.5)) / rows;
      const half = Math.sqrt(Math.max(0.5, wall * wall - z * z)) - 0.3;
      const door = (random() - 0.5) * half;
      for (const [a, b] of [[-half, door - 0.6], [door + 0.6, half]] as const) if (b - a > 0.4) out.push(box("hull-white", [(a + b) / 2, room, z], b - a, 0.08, height));
      out.push(box("hull-grey-dark", [door, room + height - 0.05, z], 1.4, 0.1, 0.1), box("lamp-amber", [door, room + height + 0.0, z + 0.07], 0.12, 0.05, 0.12));
    }
    const items = Math.max(4, Math.round(wall * 1.6 * ctx.detail));
    for (let i = 0; i < items; i++) {
      const a = (random() - 0.5) * 2.4;
      const r = wall * (0.25 + random() * 0.65);
      const at: Vec3 = [r * Math.sin(a), room, r * Math.cos(a)];
      const yaw = random() < 0.5 ? 0 : 90;
      if (furniture === "bunks") out.push(box("hull-blue", at, 2.0, 0.9, 0.5, yaw), box("hull-white", [at[0], room + 0.5, at[2]], 1.9, 0.85, 0.12, yaw), box("hull-blue", [at[0], room + 1.1, at[2]], 2.0, 0.9, 0.5, yaw));
      else if (furniture === "bench") out.push(box("hull-grey", at, 2.2, 0.9, 0.9, yaw), box("hull-white", [at[0], room + 0.9, at[2]], 2.2, 0.9, 0.06, yaw), box("lamp-blue", [at[0], room + 1.1, at[2]], 0.6, 0.05, 0.4, yaw));
      else if (furniture === "farm") out.push(box("hull-grey", at, 2.4, 1.0, 0.6, yaw), box("plant", [at[0], room + 0.6, at[2]], 2.3, 0.9, 0.4, yaw), box("lamp-blue", [at[0], room + 1.9, at[2]], 2.4, 0.4, 0.06, yaw));
      else if (furniture === "cargo") out.push(box(random() < 0.5 ? "hull-orange" : "hull-yellow", at, 1.6, 1.2, 1.2, yaw));
      else out.push(box("panel-dark", at, 1.6, 0.8, 0.9, yaw), box("lamp-blue", [at[0], room + 0.9, at[2]], 1.2, 0.04, 0.5, yaw));
    }
  }
  // the hatch shaft down the middle
  out.push(post("hull-grey-dark", [0, 0], 0.7, y0, 0.7, y1, 12), post("hull-white", [0, 0], 0.62, y0, 0.62, y1, 12));
  return out;
}
