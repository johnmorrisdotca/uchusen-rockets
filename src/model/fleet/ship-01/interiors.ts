// Hanabusa's ring interiors at the painted bar (concepts for MODULES-433): trees of four species (trunks, branches, layered crowns and cones), houses with pitched and curved roofs, doors, chimneys and depth, landmarks (a vaulted theatre, a school with a tower, a market of awnings),
// a canal with banks, reeds and an arched bridge, people at scale, lamps and benches, soft dark contact patches under everything for ambient occlusion, and for the garden ring racks of trays with seedlings, feed pipes and workers with carts. Built in the ring's own frame at azimuth 0
// (x along the street, y along the axis, z outward: up is -z) and stamped round the ring. On demand, for the section view only. Pure: no three.js and no DOM.
import { box, hoop, place, prism, quad, rod, type Lathe, type MaterialName, type Piece, type Vec3 } from "./adapter.ts";
import { dims, geoOf, glass, ground, hydroHall, rings, STEP, townHall } from "./rings.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;
/** A deterministic hash in 0..1 for a pair of integers. */
const h01 = (a: number, b = 0): number => {
  const v = Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453;
  return v - Math.floor(v);
};

const bx = (m: MaterialName, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Piece => box(m, [(x0 + x1) / 2, y0, (z0 + z1) / 2], x1 - x0, Math.abs(z1 - z0), y1 - y0, 0, { only: "mesh", plain: true });
const sph = (m: MaterialName, c: Vec3, r: number): Lathe => ({ kind: "lathe", material: m, at: [c[0], c[2]], segs: 12, only: "mesh", profile: Array.from({ length: 7 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / 6)), c[1] - r * Math.cos((Math.PI * i) / 6)] as const) });
/** A cone standing up (-z) from a base circle of radius `r` at `c` to a tip `h` above it, eight triangles. */
function cone(m: MaterialName, c: Vec3, r: number, h: number, sides = 8): Piece[] {
  const tip: Vec3 = [c[0], c[1], c[2] - h];
  const pt = (i: number): Vec3 => [c[0] + r * Math.cos((TAU * i) / sides), c[1] + r * Math.sin((TAU * i) / sides), c[2]];
  return Array.from({ length: sides }, (_, i) => quad(m, pt(i), pt(i + 1), tip, [tip[0] + 0.01, tip[1], tip[2]], 0.05, { only: "mesh" }));
}
/** A pitched roof over a wall top at `z`, ridge along the axis: a triangle in (x, z), `over` wider than the wall on each side. */
const gable = (m: MaterialName, cx: number, w: number, y0: number, y1: number, z: number, h: number, over = 0.35): Piece => prism(m, [[cx - w / 2 - over, z], [cx + w / 2 + over, z], [cx, z - h]], y0 - over, y1 + over);
/** A barrel vault: an arc in (x, z), ridge along the axis. */
const vault = (m: MaterialName, cx: number, w: number, y0: number, y1: number, z: number, h: number): Piece => prism(m, [[cx - w / 2, z], ...Array.from({ length: 9 }, (_, i) => [cx - (w / 2) * Math.cos((Math.PI * i) / 8), z - h * Math.sin((Math.PI * i) / 8)] as [number, number]).slice(1, 8), [cx + w / 2, z]], y0, y1);

// ---------------------------------------------------------------------------------------------------------------------------------
// trees, people, small things

type Species = "spruce" | "oak" | "poplar" | "blossom" | "fruit";
/** A tree standing at (x, y) on ground z0, `h` tall: a trunk with branches and a layered crown or a stack of cones, by species. */
export function tree(species: Species, x: number, y: number, z0: number, h: number, seed: number): Piece[] {
  const out: Piece[] = [bx("soot", x - 0.9 * h * 0.18, x + 0.9 * h * 0.18, y - 0.9 * h * 0.18, y + 0.9 * h * 0.18, z0 - 0.04, z0 - 0.01)];
  const top = (f: number): number => z0 - h * f;
  if (species === "spruce") {
    out.push(rod("wood", [x, y, z0], [x, y, top(0.25)], 0.1 * Math.sqrt(h / 4), 6, { only: "mesh" }));
    for (let i = 0; i < 6; i++) out.push(...cone(i % 2 ? "plant" : "leaf", [x, y, top(0.1 + 0.13 * i)], h * 0.2 * (1 - i * 0.14), h * 0.26, 9));
    return out;
  }
  if (species === "poplar") {
    out.push(rod("wood", [x, y, z0], [x, y, top(0.3)], 0.09 * Math.sqrt(h / 4), 6, { only: "mesh" }));
    for (let i = 0; i < 3; i++) out.push(...cone(i % 2 ? "leaf" : "plant", [x, y, top(0.12 + 0.2 * i)], h * 0.15 * (1 - i * 0.15), h * 0.5, 9));
    return out;
  }
  const s = Math.sqrt(h / 4);
  out.push(rod("wood", [x, y, z0], [x, y, top(0.42)], 0.15 * s, 8, { only: "mesh" }), rod("wood", [x, y, top(0.28)], [x + 0.35 * s, y + 0.2 * s, top(0.48)], 0.08 * s, 6, { only: "mesh" }), rod("wood", [x, y, top(0.3)], [x - 0.3 * s, y - 0.3 * s, top(0.5)], 0.07 * s, 6, { only: "mesh" }));
  const crowns: MaterialName[] = species === "blossom" ? ["hull-white", "hull-orange-worn", "hull-white"] : species === "fruit" ? ["leaf", "plant", "leaf"] : ["leaf", "plant", "leaf"];
  const rr = h * (species === "fruit" ? 0.2 : 0.26);
  const spots: [number, number, number, number][] = [[0, 0, 0.62, 1], [0.65, 0.2, 0.52, 0.78], [-0.6, -0.3, 0.55, 0.8], [0.1, -0.7, 0.5, 0.72], [-0.1, 0.65, 0.5, 0.7]];
  spots.forEach(([dx, dy, f, k], i) => out.push(sph(crowns[(i + Math.floor(seed * 3)) % 3], [x + dx * rr, y + dy * rr, top(f)], rr * k)));
  if (species === "fruit") for (let i = 0; i < 4; i++) out.push(sph("lamp-red", [x + (h01(seed, i) - 0.5) * rr * 1.6, y + (h01(seed, i + 9) - 0.5) * rr * 1.6, top(0.52 + h01(seed, i + 5) * 0.2)], 0.09));
  return out;
}

const CLOTHES: MaterialName[] = ["hull-blue", "hull-yellow", "hull-orange", "plant", "hull-white", "lamp-red", "fabric"];
/** A person 1.7 m tall at (x, y) on ground z0: legs, a body in a coloured top, arms, a head and, for a worker, a hat. */
export function person(x: number, y: number, z0: number, seed: number, hat = false): Piece[] {
  const c = CLOTHES[Math.floor(h01(seed) * CLOTHES.length)];
  const s = 0.9 + h01(seed, 3) * 0.2;
  const out: Piece[] = [bx("soot", x - 0.3, x + 0.3, y - 0.3, y + 0.3, z0 - 0.03, z0 - 0.005), rod("hull-grey-dark", [x - 0.1, y, z0], [x - 0.08, y, z0 - 0.85 * s], 0.09, 6, { only: "mesh" }), rod("hull-grey-dark", [x + 0.1, y, z0], [x + 0.08, y, z0 - 0.85 * s], 0.09, 6, { only: "mesh" }), rod(c, [x, y, z0 - 0.82 * s], [x, y, z0 - 1.45 * s], 0.2, 8, { only: "mesh" })];
  out.push(rod(c, [x - 0.22, y, z0 - 1.4 * s], [x - 0.3, y, z0 - 0.95 * s], 0.06, 5, { only: "mesh" }), rod(c, [x + 0.22, y, z0 - 1.4 * s], [x + 0.3, y + 0.2, z0 - 1.0 * s], 0.06, 5, { only: "mesh" }), sph(h01(seed, 5) > 0.5 ? "wood" : "hull-orange-worn", [x, y, z0 - 1.6 * s], 0.12), sph("black", [x, y, z0 - 1.66 * s], 0.115));
  if (hat) out.push(rod("hull-white", [x - 0.22, y, z0 - 1.74 * s], [x + 0.22, y, z0 - 1.74 * s], 0.04, 6, { only: "mesh" }), sph("hull-white", [x, y, z0 - 1.7 * s], 0.13));
  return out;
}

const lamp = (x: number, y: number, z0: number): Piece[] => [rod("hull-grey", [x, y, z0], [x, y, z0 - 3.0], 0.05, 6, { only: "mesh" }), sph("lamp-amber", [x, y, z0 - 3.15], 0.2), bx("soot", x - 0.25, x + 0.25, y - 0.25, y + 0.25, z0 - 0.03, z0 - 0.005)];
const bench = (x: number, y: number, z0: number): Piece[] => [bx("wood", x - 0.9, x + 0.9, y - 0.25, y + 0.25, z0 - 0.5, z0 - 0.42), bx("wood", x - 0.9, x + 0.9, y + 0.22, y + 0.28, z0 - 0.95, z0 - 0.5), bx("hull-grey-dark", x - 0.8, x - 0.7, y - 0.2, y + 0.2, z0 - 0.42, z0), bx("hull-grey-dark", x + 0.7, x + 0.8, y - 0.2, y + 0.2, z0 - 0.42, z0)];

// ---------------------------------------------------------------------------------------------------------------------------------
// houses and landmarks

export type House = 0 | 1 | 2 | 3;
/** A house on a terrace: walls, a door with a step, framed windows in two rows, a chimney, and a roof of its own kind (terracotta gable, slate gable, a green flat roof with a pergola, a barrel vault). `face` is +1 when the street is on its +y side. */
export function house(kind: House, x: number, y0: number, depth: number, z0: number, face: 1 | -1, seed: number): Piece[] {
  const w = 5 - (kind === 3 ? 0.4 : 0);
  const wall = ["hull-white", "hull-yellow", "hull-white", "concrete"][kind] as MaterialName;
  const wh = 2.5;
  const y1 = y0 + depth;
  const front = face > 0 ? y1 : y0;
  const out: Piece[] = [bx("soot", x - w / 2 - 0.4, x + w / 2 + 0.4, y0 - 0.2, y1 + 0.2, z0 - 0.03, z0 - 0.005), bx(wall, x - w / 2, x + w / 2, y0, y1, z0 - wh, z0)];
  out.push(bx("hull-grey", x - w / 2 - 0.08, x + w / 2 + 0.08, y0 - 0.04, y1 + 0.04, z0 - 0.3, z0));
  const roofs: [MaterialName, MaterialName] = [["hull-orange-worn", "hull-blue", "plant", "hull-grey"][kind] as MaterialName, "hull-grey-dark"];
  if (kind === 0 || kind === 1) out.push(gable(roofs[0], x, w, y0, y1, z0 - wh, kind === 0 ? 1.7 : 2.2));
  else if (kind === 2) out.push(bx("plant", x - w / 2 - 0.1, x + w / 2 + 0.1, y0 - 0.1, y1 + 0.1, z0 - wh - 0.3, z0 - wh), ...[-1, 1].map((s) => rod("wood", [x + s * (w / 2 - 0.2), front, z0 - wh], [x + s * (w / 2 - 0.2), front, z0 - wh - 1.4], 0.06, 6, { only: "mesh" })), rod("wood", [x - w / 2, front, z0 - wh - 1.4], [x + w / 2, front, z0 - wh - 1.4], 0.06, 6, { only: "mesh" }));
  else out.push(vault(roofs[0], x, w, y0, y1, z0 - wh, 1.4));
  // the front: a door, two rows of windows, a step and a flower box
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  const door = (kind + Math.floor(seed * 5)) % 2 ? -0.9 : 0.9;
  out.push(bx("wood", x + door - 0.35, x + door + 0.35, ...fy(0.08), z0 - 1.9, z0), bx("hull-grey", x + door - 0.55, x + door + 0.55, ...fy(0.4), z0 - 0.15, z0));
  for (const wx of [door > 0 ? -0.95 : 0.95, door > 0 ? -1.7 : 1.7]) {
    for (const [zt, zb] of [[1.15, 0.45], [2.15, 1.45]] as const) if (!(Math.abs(wx - door) < 0.8)) out.push(bx("hull-white", x + wx - 0.34, x + wx + 0.34, ...fy(0.08), z0 - zt - 0.06, z0 - zb + 0.06), bx("window", x + wx - 0.28, x + wx + 0.28, ...fy(0.1), z0 - zt, z0 - zb));
  }
  out.push(bx("plant", x + (door > 0 ? -1.4 : 1.4) - 0.5, x + (door > 0 ? -1.4 : 1.4) + 0.5, ...fy(0.35), z0 - 0.75, z0 - 0.55));
  if (kind < 2) out.push(bx("concrete", x + w / 2 - 0.7, x + w / 2 - 0.3, y0 + 0.4, y0 + 0.8, z0 - wh - 1.7, z0 - wh - 0.4));
  return out;
}

/** The theatre: a wide hall under a barrel vault, a portico of four columns and a pediment, a marquee of lamps. */
export function theatre(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const w = 10;
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  const out: Piece[] = [bx("soot", x - w / 2 - 0.5, x + w / 2 + 0.5, y0 - 0.3, y0 + depth + 0.3, z0 - 0.03, z0 - 0.005), bx("hull-white", x - w / 2, x + w / 2, y0, y0 + depth, z0 - 3.3, z0), vault("hull-grey", x, w, y0, y0 + depth, z0 - 3.3, 2.3), bx("hull-grey", x - w / 2 - 0.1, x + w / 2 + 0.1, y0 - 0.05, y0 + depth + 0.05, z0 - 0.4, z0)];
  for (let i = 0; i < 4; i++) out.push(rod("hull-white", [x - 3.3 + i * 2.2, face > 0 ? front + 0.5 : front - 0.5, z0], [x - 3.3 + i * 2.2, face > 0 ? front + 0.5 : front - 0.5, z0 - 3.3], 0.22, 10, { only: "mesh" }));
  out.push(bx("hull-white", x - 3.8, x + 3.8, ...fy(0.9), z0 - 3.6, z0 - 3.3), prism("hull-white", [[x - 3.8, z0 - 3.6], [x + 3.8, z0 - 3.6], [x, z0 - 4.7]], face > 0 ? front : front - 0.9, face > 0 ? front + 0.9 : front));
  for (let i = 0; i < 9; i++) out.push(sph("lamp-amber", [x - 3.6 + i * 0.9, face > 0 ? front + 0.95 : front - 0.95, z0 - 3.0], 0.1));
  out.push(bx("window", x - 3, x + 3, ...fy(0.1), z0 - 2.9, z0 - 1.0), bx("wood", x - 0.5, x + 0.5, ...fy(0.12), z0 - 2.1, z0));
  return out;
}

/** The school: a long block with a bell tower and a pyramid roof, a clock face and a flag. */
export function school(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  const out: Piece[] = [bx("soot", x - 5, x + 5, y0 - 0.3, y0 + depth + 0.3, z0 - 0.03, z0 - 0.005), bx("hull-yellow", x - 4.2, x + 4.2, y0, y0 + depth, z0 - 2.8, z0), gable("hull-orange-worn", x, 8.4, y0, y0 + depth, z0 - 2.8, 1.6)];
  out.push(bx("hull-yellow", x - 1, x + 1, y0 - 0.1, y0 + depth + 0.1, z0 - 6.2, z0 - 2.7), ...cone("hull-blue", [x, (y0 + y0 + depth) / 2, z0 - 6.2], 1.5, 2.2, 4));
  out.push(sph("hull-white", [x, face > 0 ? front + 0.12 : front - 0.12, z0 - 5.0], 0.5), rod("hull-grey", [x, (y0 + y0 + depth) / 2, z0 - 8.3], [x, (y0 + y0 + depth) / 2, z0 - 9.6], 0.04, 5, { only: "mesh" }), bx("lamp-red", x, x + 0.9, (y0 + y0 + depth) / 2 - 0.02, (y0 + y0 + depth) / 2 + 0.02, z0 - 9.6, z0 - 9.0));
  for (const wx of [-3.2, -2.1, 2.1, 3.2]) out.push(bx("hull-white", x + wx - 0.4, x + wx + 0.4, ...fy(0.08), z0 - 2.2, z0 - 0.9), bx("window", x + wx - 0.33, x + wx + 0.33, ...fy(0.1), z0 - 2.12, z0 - 0.98));
  out.push(bx("wood", x - 0.45, x + 0.45, ...fy(0.1), z0 - 1.9, z0));
  return out;
}

/** The market: a row of five arched stalls under striped awnings of orange and white, crates and a table. */
export function market(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  const out: Piece[] = [bx("soot", x - 5.5, x + 5.5, y0 - 0.6, y0 + depth + 1.2, z0 - 0.03, z0 - 0.005), bx("hull-white", x - 5, x + 5, y0, y0 + depth, z0 - 2.6, z0), vault("hull-grey", x, 10, y0, y0 + depth, z0 - 2.6, 1.0)];
  for (let i = 0; i < 5; i++) {
    const cx = x - 4 + i * 2;
    const [a0, a1] = face > 0 ? [front, front + 1.1] : [front - 1.1, front];
    out.push(prism(i % 2 ? "hull-white" : "hull-orange", [[cx - 0.95, z0 - 2.4], [cx + 0.95, z0 - 2.4], [cx + 0.95, z0 - 2.1], [cx - 0.95, z0 - 1.9]], a0, a1), bx("hull-grey-dark", cx - 0.95, cx + 0.95, ...fy(0.06), z0 - 1.6, z0 - 0.8), bx("wood", cx - 0.5, cx + 0.5, ...fy(0.6), z0 - 0.7, z0 - 0.62), bx(i % 2 ? "plant" : "hull-orange-worn", cx - 0.4, cx + 0.4, ...fy(0.5), z0 - 0.95, z0 - 0.7));
    for (const s of [-0.9, 0.9]) out.push(rod("hull-grey", [cx + s, face > 0 ? front + 1.05 : front - 1.05, z0], [cx + s, face > 0 ? front + 1.05 : front - 1.05, z0 - 2.1], 0.05, 6, { only: "mesh" }));
  }
  return out;
}

/** The sports hall: a long low barrel vault with a glazed clerestory and floodlights. */
export function sports(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  return [bx("soot", x - 6.5, x + 6.5, y0 - 0.3, y0 + depth + 0.3, z0 - 0.03, z0 - 0.005), bx("hull-grey", x - 6, x + 6, y0, y0 + depth, z0 - 2.4, z0), vault("hull-white", x, 12, y0, y0 + depth, z0 - 2.4, 2.6), bx("window", x - 5, x + 5, ...fy(0.08), z0 - 2.3, z0 - 1.5), rod("hull-grey", [x - 5.5, front, z0 - 2.4], [x - 5.5, front, z0 - 5.4], 0.06, 6, { only: "mesh" }), rod("hull-grey", [x + 5.5, front, z0 - 2.4], [x + 5.5, front, z0 - 5.4], 0.06, 6, { only: "mesh" }), sph("flood", [x - 5.5, front, z0 - 5.5], 0.25), sph("flood", [x + 5.5, front, z0 - 5.5], 0.25)];
}

/** The clinic: a pale block with a pitched roof, a covered entrance and a lit cross. */
export function clinic(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  return [bx("soot", x - 4, x + 4, y0 - 0.3, y0 + depth + 0.5, z0 - 0.03, z0 - 0.005), bx("hull-white", x - 3.5, x + 3.5, y0, y0 + depth, z0 - 2.6, z0), gable("hull-blue", x, 7, y0, y0 + depth, z0 - 2.6, 1.3), bx("hull-white", x - 1.2, x + 1.2, ...fy(1.0), z0 - 2.2, z0 - 2.0), rod("hull-grey", [x - 1.1, face > 0 ? front + 0.95 : front - 0.95, z0], [x - 1.1, face > 0 ? front + 0.95 : front - 0.95, z0 - 2.0], 0.06, 6, { only: "mesh" }), rod("hull-grey", [x + 1.1, face > 0 ? front + 0.95 : front - 0.95, z0], [x + 1.1, face > 0 ? front + 0.95 : front - 0.95, z0 - 2.0], 0.06, 6, { only: "mesh" }), bx("lamp-blue", x - 0.15, x + 0.15, ...fy(0.15), z0 - 3.9, z0 - 2.9), bx("lamp-blue", x - 0.55, x + 0.55, ...fy(0.15), z0 - 3.55, z0 - 3.25), bx("window", x - 2.8, x - 1.6, ...fy(0.08), z0 - 1.9, z0 - 0.9), bx("window", x + 1.6, x + 2.8, ...fy(0.08), z0 - 1.9, z0 - 0.9)];
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the nave

/** The canal's banks and reeds, and every so often a bridge: pieces for one bay of the nave, `bay` metres long, at ground z0. */
function canal(z0: number, bay: number, i: number): Piece[] {
  const out: Piece[] = [];
  for (const s of [-1, 1]) {
    out.push(bx("concrete", -bay / 2, bay / 2, s > 0 ? 1.0 : -1.35, s > 0 ? 1.35 : -1.0, z0 - 0.4, z0 + 0.06), bx("soot", -bay / 2, bay / 2, s > 0 ? 0.7 : -1.0, s > 0 ? 1.0 : -0.7, z0 - 0.02, z0 + 0.005));
    for (let k = 0; k < 3; k++) {
      const px = (h01(i, k + (s > 0 ? 0 : 5)) - 0.5) * bay;
      out.push(rod("plant", [px, s * 1.5, z0], [px + 0.1, s * 1.6, z0 - 0.7 - h01(i, k) * 0.5], 0.03, 5, { only: "mesh" }), rod("leaf", [px + 0.15, s * 1.5, z0], [px + 0.2, s * 1.55, z0 - 0.5 - h01(k, i) * 0.4], 0.03, 5, { only: "mesh" }));
    }
  }
  if (i % 11 === 5) {
    // a footbridge: a deck of five steps rising to the middle with rails and a lamp at each end
    for (let k = 0; k < 5; k++) out.push(bx("hull-white", -1.3, 1.3, -2.0 + k * 0.8, -1.2 + k * 0.8, z0 - 0.5 - (k === 2 ? 0.32 : k === 1 || k === 3 ? 0.18 : 0), z0 - 0.3));
    for (const sx of [-1.2, 1.2]) out.push(rod("hull-grey", [sx, -2.0, z0 - 0.9], [sx, -1.2, z0 - 1.0], 0.04, 6, { only: "mesh" }), rod("hull-grey", [sx, -1.2, z0 - 1.0], [sx, 1.2, z0 - 1.15], 0.04, 6, { only: "mesh" }), rod("hull-grey", [sx, 1.2, z0 - 1.15], [sx, 2.0, z0 - 1.0], 0.04, 6, { only: "mesh" }));
  }
  return out;
}

/** One bay of the living ring's nave: tree rows of mixed species, lamps, benches, flower beds, people. */
function nave(g: ReturnType<typeof geoOf>, i: number): Piece[] {
  const rg = ground(g);
  const nv = dims(g).nave;
  const out: Piece[] = [...canal(rg, 6.4, i)];
  const kinds: Species[] = ["oak", "spruce", "blossom", "poplar", "oak", "fruit"];
  for (const s of [-1, 1]) {
    const k = kinds[Math.floor(h01(i, s + 3) * kinds.length)];
    const hgt = (k === "spruce" ? 5.5 : k === "poplar" ? 6.5 : 4.6) * (0.85 + h01(i, s) * 0.35);
    if (i % 2 === (s > 0 ? 0 : 1)) out.push(...tree(k, (h01(i, s + 7) - 0.5) * 2.0, s * (nv * 0.62 + h01(i, 4) * 0.5), rg, hgt, h01(i, s)));
    if (i % 4 === (s > 0 ? 1 : 3)) out.push(...lamp(2.6, s * 2.5, rg));
    if (i % 9 === (s > 0 ? 2 : 6)) out.push(...bench(-1.5, s * 2.6, rg));
    if (i % 3 === 1) out.push(bx("plant", -2.2, 2.2, s * 2.9 - 0.3, s * 2.9 + 0.3, rg - 0.35, rg), ...Array.from({ length: 5 }, (_, q) => sph(CLOTHES[Math.floor(h01(i, q + s * 9) * 5)], [-1.8 + q * 0.9, s * 2.9, rg - 0.42], 0.1)));
  }
  if (i % 3 === 0) out.push(...person((h01(i, 11) - 0.5) * 4, (h01(i, 12) > 0.5 ? 1 : -1) * 2.7, rg, i * 3 + 1));
  if (i % 5 === 2) out.push(...person(-1.6, 3.1, rg, i + 40), ...person(-1.2, 3.2, rg, i + 41));
  return out;
}

/** One bay of a terrace step: a house of one of four kinds and the people, hedge and steps in front of it, by hash. */
function terrace(g: ReturnType<typeof geoOf>, s: 1 | -1, k: number, i: number): Piece[] {
  const { nave: nv, tread } = dims(g);
  const rk = ground(g) - STEP * k;
  const e0 = nv + tread * (k - 1);
  const y0 = s > 0 ? e0 + 0.15 : -(e0 + tread - 0.15);
  const depth = tread - 0.3;
  const kind = Math.floor(h01(i, k + 5 * (s > 0 ? 1 : 0)) * 4) as House;
  const out = house(kind, 0, y0, depth, rk, s > 0 ? -1 : 1, h01(i, k));
  if (h01(i, k + 20) > 0.55) out.push(...person(0.3, s > 0 ? e0 - 0.2 : -(e0 - 0.2), rk + STEP * 0, i * 7 + k + (s > 0 ? 100 : 0)));
  if (h01(i, k + 30) > 0.7) out.push(...tree(h01(i, k + 31) > 0.5 ? "blossom" : "fruit", 1.9, s > 0 ? e0 + tread * 0.5 : -(e0 + tread * 0.5), rk, 3.0 + h01(i, k + 2), h01(i, 50)));
  return out;
}

const LANDMARKS: { id: "theatre" | "market" | "sports" | "school" | "clinic"; az: number; s: 1 | -1; k: number }[] = [
  { id: "theatre", az: 64, s: 1, k: 1 },
  { id: "market", az: 78, s: -1, k: 1 },
  { id: "sports", az: 96, s: 1, k: 2 },
  { id: "school", az: 106, s: -1, k: 2 },
  { id: "clinic", az: 84, s: 1, k: 3 },
];

/** The living ring's town: bare floors and glass from the ring code, then the painted fill: nave bays and terrace bays stamped round the ring, the landmarks among them. */
export function livingInterior(gap = 58): Piece[] {
  const r = rings("bow").find((one) => one.use === "living")!;
  const g = geoOf({ ...r, y: 0 });
  const rg = ground(g);
  const { nave: nv, tread } = dims(g);
  const n = Math.round((TAU * rg) / 6.4);
  const out: Piece[] = [...glass(g, 0, gap), ...townHall(g, 0, "living", gap, true)];
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (az < gap || az > 360 - gap) continue;
    const bay: Piece[] = [...nave(g, i)];
    for (const s of [1, -1] as const) for (let k = 1; k <= 3; k++) {
      const mark = LANDMARKS.find((l) => l.s === s && l.k === k && Math.abs(az - l.az) < 180 / n + 0.01);
      const rk = rg - STEP * k;
      const e0 = nv + tread * (k - 1);
      const y0 = s > 0 ? e0 + 0.15 : -(e0 + tread - 0.15);
      const depth = tread - 0.3;
      const face = (s > 0 ? -1 : 1) as 1 | -1;
      if (mark) bay.push(...{ theatre, market, sports, school, clinic }[mark.id](0, y0, depth, rk, face));
      else if (!LANDMARKS.some((l) => l.s === s && l.k === k && Math.abs(az - l.az) < 3.2 * (360 / n))) bay.push(...terrace(g, s, k, i));
    }
    out.push(...place(bay, { at: [0, 0, 0], yaw: az }));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the garden ring

/** A rack of trays on a terrace tread: two shelves of trays of soil with seedlings, a water pipe along each shelf and risers from it, a bar of grow-lamp over each. */
function rack(x0: number, y0: number, y1: number, z0: number, i: number, k: number): Piece[] {
  const out: Piece[] = [bx("soot", x0 - 2.6, x0 + 2.6, y0 - 0.2, y1 + 0.2, z0 - 0.03, z0 - 0.005)];
  for (const px of [-2.4, 2.4]) for (const py of [y0 + 0.1, y1 - 0.1]) out.push(rod("hull-grey", [x0 + px, py, z0], [x0 + px, py, z0 - 2.6], 0.05, 6, { only: "mesh" }));
  [0.9, 1.9].forEach((hgt, shelf) => {
    out.push(bx("hull-white", x0 - 2.5, x0 + 2.5, y0, y1, z0 - hgt - 0.06, z0 - hgt), bx("soil", x0 - 2.3, x0 + 2.3, y0 + 0.1, y1 - 0.1, z0 - hgt - 0.2, z0 - hgt - 0.06));
    for (let q = 0; q < 7; q++) {
      const px = x0 - 2.0 + q * 0.66;
      const py = (y0 + y1) / 2 + (h01(i, q + shelf * 7 + k * 3) - 0.5) * (y1 - y0 - 0.5);
      const grown = 0.25 + h01(i, q + 40 + shelf) * 0.35;
      out.push(rod("plant", [px, py, z0 - hgt - 0.18], [px, py, z0 - hgt - 0.18 - grown], 0.03, 5, { only: "mesh" }), sph(q % 3 ? "leaf" : "plant", [px, py, z0 - hgt - 0.2 - grown], 0.11 + h01(i, q) * 0.08));
    }
    out.push(rod(shelf ? "hull-blue" : "coolant", [x0 - 2.5, y1 - 0.04, z0 - hgt + 0.05], [x0 + 2.5, y1 - 0.04, z0 - hgt + 0.05], 0.05, 8, { only: "mesh" }), bx("grow-lamp", x0 - 2.2, x0 + 2.2, y0 + 0.2, y1 - 0.2, z0 - hgt - 0.97, z0 - hgt - 0.9));
  });
  out.push(rod("pipe-steel", [x0 + 2.5, y1 - 0.04, z0 - 0.9 + 0.05], [x0 + 2.5, y1 - 0.04, z0 - 1.9 + 0.05], 0.06, 8, { only: "mesh" }));
  return out;
}

/** The garden ring's hall: bare terraces and glass from the ring code, then racks on every tread, a water channel, workers in hats with carts, and fruit trees in the nave. */
export function gardenInterior(gap = 58): Piece[] {
  const r = rings("bow").find((one) => one.use === "hydro")!;
  const g = geoOf({ ...r, y: 0 });
  const rg = ground(g);
  const { nave: nv, tread } = dims(g);
  const n = Math.round((TAU * rg) / 5.2);
  const out: Piece[] = [...glass(g, 0, gap), ...hydroHall(g, 0, gap, true)];
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (az < gap || az > 360 - gap) continue;
    const bay: Piece[] = [bx("soot", -2.6, 2.6, -1.4, 1.4, rg - 0.03, rg - 0.005)];
    if (i % 5 === 1) bay.push(...tree("fruit", 0.5, (i % 2 ? 1 : -1) * (nv * 0.6), rg, 3.6, h01(i)));
    if (i % 4 === 0) bay.push(...person((h01(i, 2) - 0.5) * 3, (h01(i, 3) > 0.5 ? 1 : -1) * 1.8, rg, i + 200, true));
    if (i % 12 === 3) bay.push(bx("hull-grey-dark", -0.8, 0.8, -0.4, 0.4, rg - 0.7, rg - 0.2), rod("hull-grey", [-0.6, -0.5, rg], [-0.6, -0.5, rg - 0.2], 0.1, 8, { only: "mesh" }), rod("hull-grey", [0.6, -0.5, rg], [0.6, -0.5, rg - 0.2], 0.1, 8, { only: "mesh" }), bx("plant", -0.7, 0.7, -0.35, 0.35, rg - 1.0, rg - 0.7));
    for (const s of [1, -1] as const) for (let k = 1; k <= 3; k++) {
      const e0 = nv + tread * (k - 1);
      const rk = rg - STEP * k;
      bay.push(...rack(0, s > 0 ? e0 + 0.15 : -(e0 + tread - 0.15), s > 0 ? e0 + tread - 0.15 : -(e0 + 0.15), rk, i, k));
      if (h01(i, k + (s > 0 ? 70 : 80)) > 0.82) bay.push(...person(1.8, s > 0 ? e0 + tread / 2 : -(e0 + tread / 2), rk, i * 5 + k + 300, true));
    }
    out.push(...place(bay, { at: [0, 0, 0], yaw: az }));
  }
  return out;
}

void hoop;
void deg;
