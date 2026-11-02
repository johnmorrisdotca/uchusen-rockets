// The small shapes a rocket is put together from, so a new rocket is a table of numbers. Each returns plain pieces: the mesh and the drawing are made from them as for any other part. Pure.
import { deg } from "../framing.ts";
import { merlin } from "./falcon.ts";
import type { MaterialName } from "./materials.ts";
import { type Lathe, type Piece, type Plate, pointOf, radial, strut, type Vec3 } from "./pieces.ts";

type Extra = Partial<Omit<Lathe, "kind" | "material" | "profile">>;

/** A straight tube from y0 to y1. */
export const tube = (material: MaterialName, r: number, y0: number, y1: number, extra: Extra = {}): Lathe => ({ kind: "lathe", material, segs: 40, body: true, outline: true, profile: [[r, y0], [r, y1]], ...extra });

/** A cone or a step between two radii. */
export const taper = (material: MaterialName, r0: number, y0: number, r1: number, y1: number, extra: Extra = {}): Lathe => ({ kind: "lathe", material, segs: 40, body: true, outline: true, profile: [[r0, y0], [r1, y1]], ...extra });

/** A rounded nose from a radius at y0 to a point at y1. `blunt` above 1 is fuller at the shoulder, below 1 is sharper. */
export function nose(material: MaterialName, r: number, y0: number, y1: number, blunt = 1.7, extra: Extra = {}): Lathe {
  const steps = 10;
  const profile: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    profile.push([r * Math.sqrt(Math.max(0, 1 - t ** (2 * blunt))), y0 + (y1 - y0) * t]);
  }
  profile[steps] = [0.001, y1];
  return { kind: "lathe", material, segs: 40, body: true, outline: true, profile, ...extra };
}

/** A flat dark floor closing a tube from below. */
export const floor = (r: number, y: number, material: MaterialName = "soot"): Lathe => ({ kind: "lathe", material, segs: 32, under: true, profile: [[0, y], [r, y]] });

/** Stripes down a hull: `width` degrees wide, each centred on one of `azimuths`, just proud of it. */
export const stripes = (material: MaterialName, r: number, y0: number, y1: number, azimuths: readonly number[], width: number): Lathe[] =>
  azimuths.map((az) => ({ kind: "lathe", material, segs: 72, body: true, profile: [[r * 1.012, y0], [r * 1.012, y1]], arc: () => [deg(az - width / 2), deg(az + width / 2)] }));

/** Engines in a ring, the first at `start` degrees. */
export function engineRing(count: number, ringRadius: number, y: number, exit: number, length: number, start = 0): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const a = deg(start + (i * 360) / count);
    out.push(...merlin([ringRadius * Math.sin(a), ringRadius * Math.cos(a)], y, exit, length));
  }
  return out;
}

/** A long box up the side of a hull at `az` degrees: a raceway or a cable tunnel. */
export const raceway = (material: MaterialName, r: number, y0: number, y1: number, az: number, width = 0.2, depth = 0.1): Plate => {
  const f = radial(deg(az));
  return strut(material, pointOf(f, r + depth / 2, y0), pointOf(f, r + depth / 2, y1), width, depth, { plain: false });
};

/** Fins on a hull, each a flat outline given as [out from the hull, y] points. */
export const fins = (material: MaterialName, r: number, azimuths: readonly number[], outline: readonly (readonly [number, number])[], thickness = 0.1): Plate[] =>
  azimuths.map((az) => ({ kind: "plate", material, frame: radial(deg(az)), outline: outline.map(([out, y]) => [r + out, y] as const), thickness }));

/** A straight strut between two points given in cylinder terms: [radius, y, azimuth in degrees]. */
export function brace(material: MaterialName, a: readonly [number, number, number], b: readonly [number, number, number], width = 0.1): Plate {
  const at = ([r, y, az]: readonly [number, number, number]): Vec3 => [r * Math.sin(deg(az)), y, r * Math.cos(deg(az))];
  return strut(material, at(a), at(b), width, width);
}

/** An open skirt: a tube seen from outside and from inside, so an engine under it shows from below. */
export const skirt = (material: MaterialName, r: number, y0: number, y1: number, extra: Extra = {}): Piece[] => [tube(material, r, y0, y1, extra), { kind: "lathe", material: "soot", segs: 32, under: true, only: "mesh", profile: [[r * 0.97, y1], [r * 0.97, y0]] }];

/** A cone over an engine, off the axis: a fairing at the foot of a stage. */
export const pod = (material: MaterialName, at: readonly [number, number], r0: number, y0: number, r1: number, y1: number, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at, segs: 14, profile: [[r0, y0], [r1, y1]], ...extra });

/** A fairing: straight from the joint, then a rounded nose, with the seam where its halves meet. */
export function fairingShell(material: MaterialName, r: number, height: number, straight: number, blunt = 1.4, jointRadius = r): Piece[] {
  const shell = nose(material, r, straight, height, blunt);
  const seam = (a: number): Vec3[] => shell.profile.map(([x, y]) => [(x * 1.005) * Math.sin(a), y, (x * 1.005) * Math.cos(a)] as Vec3);
  return [
    { ...shell, profile: [[jointRadius, 0], ...shell.profile], rings: [straight] },
    floor(jointRadius, 0),
    { kind: "lines", weight: "feature", paths: [seam(deg(90)), seam(deg(-90))] },
  ];
}

/** Legs folded against a hull, as dark ribs from the foot up. */
export const foldedLegs = (material: MaterialName, r: number, azimuths: readonly number[], foot: number, top: number, width: number): Plate[] =>
  azimuths.map((az) => {
    const f = radial(deg(az));
    return strut(material, pointOf(f, r + 0.1, foot), pointOf(f, r + 0.1, top), width, 0.3, { plain: false });
  });

/** Pieces turned round the Y axis by `turn` degrees, then moved along the ground. For putting a whole structure in its place on a map. A lathe's arc and lean are left as they are, so they are for pieces with neither. */
export function moved(pieces: readonly Piece[], x: number, z: number, turn = 0): Piece[] {
  const c = Math.cos(deg(turn));
  const s = Math.sin(deg(turn));
  const spin = ([a, b, d]: readonly [number, number, number]): Vec3 => [a * c + d * s, b, -a * s + d * c];
  const at = (p: readonly [number, number, number]): Vec3 => {
    const [a, b, d] = spin(p);
    return [a + x, b, d + z];
  };
  return pieces.map((piece): Piece => {
    if (piece.kind === "plate") return { ...piece, frame: { o: at(piece.frame.o), u: spin(piece.frame.u), v: spin(piece.frame.v), w: spin(piece.frame.w) } };
    if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map(at)) };
    const [a0, d0] = piece.at ?? [0, 0];
    const [a, , d] = at([a0, 0, d0]);
    return { ...piece, at: [a, d] };
  });
}

/** A box on the ground, `wide` by `deep` and turned `turn` degrees, from y0 to y1. */
export function slab(material: MaterialName, x: number, z: number, wide: number, deep: number, turn: number, y0: number, y1: number, plain = true): Plate {
  const c = Math.cos(deg(turn));
  const s = Math.sin(deg(turn));
  return { kind: "plate", material, frame: { o: [x, (y0 + y1) / 2, z], u: [c, 0, s], v: [-s, 0, c], w: [0, 1, 0] }, outline: [[-wide / 2, -deep / 2], [wide / 2, -deep / 2], [wide / 2, deep / 2], [-wide / 2, deep / 2]], thickness: y1 - y0, plain };
}

/** A road on the ground, from point to point. */
export const road = (material: MaterialName, points: readonly (readonly [number, number])[], width: number, y: number): Plate[] =>
  points.slice(1).map((b, i) => {
    const a = points[i];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    return slab(material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.hypot(dx, dz) + width, width, (Math.atan2(dz, dx) * 180) / Math.PI, y, y + 0.2);
  });
