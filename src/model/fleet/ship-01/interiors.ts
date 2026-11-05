// Hanabusa's ring interiors at the painted bar (concepts for MODULES-433): trees of four species (trunks, branches, layered crowns and cones), houses with pitched and curved roofs, doors, chimneys and depth, landmarks (a vaulted theatre, a school with a tower, a market of awnings),
// a canal with banks, reeds and an arched bridge, people at scale, lamps and benches, soft dark contact patches under everything for ambient occlusion, and for the garden ring racks of trays with seedlings, feed pipes and workers with carts. Built in the ring's own frame at azimuth 0
// (x along the street, y along the axis, z outward: up is -z) and stamped round the ring. On demand, for the section view only. Pure: no three.js and no DOM.
import { box, hoop, place, prism, quad, rod, type Lathe, type MaterialName, type Piece, type Vec3 } from "./adapter.ts";
import { cutaway4, dims, geoOf, glass, ground, hydroHall, ringPieces, rings, STEP, townHall } from "./rings.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;
/** A deterministic hash in 0..1 for a pair of integers. */
const h01 = (a: number, b = 0): number => {
  const v = Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453;
  return v - Math.floor(v);
};

const bx = (m: MaterialName, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Piece => box(m, [(x0 + x1) / 2, y0, (z0 + z1) / 2], x1 - x0, Math.abs(z1 - z0), y1 - y0, 0, { only: "mesh", plain: true });
/** How fine the small round things are drawn: set for the duration of one interior by its level (spheres of 12 by 6 facets, or 7 by 3). */
let fineRound = true;
const sph = (m: MaterialName, c: Vec3, r: number): Lathe => {
  const n = fineRound ? 6 : 3;
  return { kind: "lathe", material: m, at: [c[0], c[2]], segs: fineRound ? 12 : 7, only: "mesh", profile: Array.from({ length: n + 1 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / n)), c[1] - r * Math.cos((Math.PI * i) / n)] as const) };
};
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
/** A triangle (a quad with its fourth corner at the third). */
const tri = (m: MaterialName, a: Vec3, b: Vec3, c: Vec3): Piece => quad(m, a, b, c, [c[0] + 0.005, c[1], c[2]], 0.04, { only: "mesh" });
/** A tree standing at (x, y) on ground z0, `h` tall: a flared trunk with branches and a crown of clustered masses (light on top, dark underneath), or a stack of cones, by species. */
export function tree(species: Species, x: number, y: number, z0: number, h: number, seed: number, coarse = false): Piece[] {
  const out: Piece[] = [];
  const top = (f: number): number => z0 - h * f;
  const s = Math.sqrt(h / 4);
  if (species === "spruce") {
    out.push(rod("bark", [x, y, z0], [x, y, top(0.3)], 0.12 * s, 6, { only: "mesh" }));
    for (let i = 0; i < (coarse ? 4 : 7); i++) out.push(...cone(i % 2 ? "shrub" : "leaf", [x, y, top(0.08 + (coarse ? 0.21 : 0.12) * i)], h * 0.21 * (1 - i * (coarse ? 0.2 : 0.12)), h * (coarse ? 0.35 : 0.24), coarse ? 7 : 10));
    return out;
  }
  if (species === "poplar") {
    out.push(rod("bark", [x, y, z0], [x, y, top(0.3)], 0.1 * s, 6, { only: "mesh" }));
    for (let i = 0; i < 4; i++) out.push(...cone(i % 2 ? "lawn-dark" : "leaf", [x, y, top(0.1 + 0.17 * i)], h * 0.15 * (1 - i * 0.12), h * 0.42, 10));
    return out;
  }
  out.push(rod("bark", [x, y, z0], [x, y, top(0.2)], 0.2 * s, 8, { only: "mesh" }), rod("bark", [x, y, top(0.16)], [x, y, top(0.46)], 0.14 * s, 8, { only: "mesh" }));
  for (const [dx, dy, f] of [[0.45, 0.25, 0.5], [-0.4, -0.3, 0.52], [0.1, -0.5, 0.48]] as const) out.push(rod("bark", [x, y, top(0.3)], [x + dx * s * 1.3, y + dy * s * 1.3, top(f)], 0.06 * s, 6, { only: "mesh" }));
  if (!coarse) for (const a of [0, 120, 240]) out.push(rod("bark", [x, y, z0], [x + 0.35 * s * Math.cos(deg(a)), y + 0.35 * s * Math.sin(deg(a)), z0 - 0.05], 0.07 * s, 5, { only: "mesh" }));
  const rr = h * (species === "fruit" ? 0.2 : 0.27);
  const light: MaterialName = species === "blossom" ? "hull-white" : "lawn";
  const mid: MaterialName = species === "blossom" ? "flower" : "leaf";
  const dark: MaterialName = species === "blossom" ? "hull-orange-worn" : "shrub";
  // masses: [dx, dy, height as a share of h, radius share, tone]
  const masses: [number, number, number, number, MaterialName][] = [[0, 0, 0.6, 1, mid], [0.7, 0.25, 0.5, 0.8, mid], [-0.65, -0.3, 0.52, 0.82, mid], [0.15, -0.75, 0.48, 0.74, mid], [-0.15, 0.7, 0.5, 0.72, mid], [0.25, 0.1, 0.78, 0.7, light], [-0.4, 0.2, 0.7, 0.55, light], [0.5, -0.4, 0.68, 0.5, light], [0.1, 0.1, 0.36, 0.8, dark], [-0.5, -0.1, 0.4, 0.55, dark], [0.55, 0.3, 0.38, 0.55, dark]];
  for (const [dx, dy, f, k, m] of coarse ? [masses[0], masses[1], masses[2], masses[5], masses[8]] : masses) out.push(sph(m, [x + dx * rr, y + dy * rr, top(f)], rr * k));
  if (species === "fruit") for (let i = 0; i < 5; i++) out.push(sph("lamp-red", [x + (h01(seed, i) - 0.5) * rr * 1.8, y + (h01(seed, i + 9) - 0.5) * rr * 1.8, top(0.46 + h01(seed, i + 5) * 0.2)], 0.1));
  return out;
}

/** A shrub: three or four clustered spheres, dark below and light above. */
const shrub = (x: number, y: number, z0: number, r: number, seed: number): Piece[] => [sph("shrub", [x, y, z0 - r * 0.6], r), sph(h01(seed) > 0.5 ? "leaf" : "lawn-dark", [x + r * 0.7, y + r * 0.3, z0 - r * 0.55], r * 0.75), sph("lawn", [x - r * 0.2, y - r * 0.4, z0 - r * 1.05], r * 0.7), sph("leaf", [x - r * 0.7, y + r * 0.3, z0 - r * 0.5], r * 0.65)];
/** A tuft of grass: a fan of blades, each a thin triangle leaning out. */
const tuft = (x: number, y: number, z0: number, seed: number, len = 0.4, m: MaterialName = "lawn"): Piece[] => Array.from({ length: 5 }, (_, i) => {
  const a = TAU * (i / 5 + h01(seed, i) * 0.15);
  const l = len * (0.7 + h01(seed, i + 3) * 0.6);
  return tri(i % 2 ? m : "lawn-dark", [x + 0.04 * Math.cos(a + 1.5), y + 0.04 * Math.sin(a + 1.5), z0], [x - 0.04 * Math.cos(a + 1.5), y - 0.04 * Math.sin(a + 1.5), z0], [x + 0.2 * l * Math.cos(a), y + 0.2 * l * Math.sin(a), z0 - l]);
});
/** A flower bed: soil with a row of small coloured cones. */
const flowers = (x0: number, x1: number, y: number, z0: number, seed: number, n: number): Piece[] => [bx("soil", x0, x1, y - 0.3, y + 0.3, z0 - 0.12, z0), ...Array.from({ length: n }, (_, q): Piece[] => cone((["flower", "hazard", "lamp-red", "hull-white"] as MaterialName[])[Math.floor(h01(seed, q) * 4)], [x0 + ((x1 - x0) * (q + 0.5)) / n, y + (h01(seed, q + 20) - 0.5) * 0.4, z0 - 0.12], 0.11, 0.3, 5)).flat()];
/** A low mound: a faceted dome of `rx` by `ry` metres, `h` high, centred at (cx, cy) on ground z0. */
function mound(m: MaterialName, cx: number, cy: number, rx: number, ry: number, h: number, z0: number, segs = 8, rings = 3): Piece[] {
  const out: Piece[] = [];
  const pt = (R: number, a: number): Vec3 => [cx + rx * R * Math.cos(a), cy + ry * R * Math.sin(a), z0 - h * (1 - R * R)];
  for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) {
    const R0 = 1 - j / rings;
    const R1 = 1 - (j + 1) / rings;
    const a0 = (TAU * i) / segs;
    const a1 = (TAU * (i + 1)) / segs;
    out.push(tri(m, pt(R0, a0), pt(R0, a1), pt(R1, a1)), ...(j < rings - 1 ? [tri(m, pt(R0, a0), pt(R1, a1), pt(R1, a0))] : []));
  }
  return out;
}

const CLOTHES: MaterialName[] = ["hull-blue", "hull-yellow", "hull-orange", "plant", "hull-white", "lamp-red", "fabric"];
/** A person 1.7 m tall at (x, y) on ground z0: legs, a body in a coloured top, arms, a head and, for a worker, a hat. */
export function person(x: number, y: number, z0: number, seed: number, hat = false): Piece[] {
  const c = CLOTHES[Math.floor(h01(seed) * CLOTHES.length)];
  const s = 0.9 + h01(seed, 3) * 0.2;
  const out: Piece[] = [rod("hull-grey-dark", [x - 0.1, y, z0], [x - 0.08, y, z0 - 0.85 * s], 0.09, 6, { only: "mesh" }), rod("hull-grey-dark", [x + 0.1, y, z0], [x + 0.08, y, z0 - 0.85 * s], 0.09, 6, { only: "mesh" }), rod(c, [x, y, z0 - 0.82 * s], [x, y, z0 - 1.45 * s], 0.2, 8, { only: "mesh" })];
  if (fineRound) out.push(rod(c, [x - 0.22, y, z0 - 1.4 * s], [x - 0.3, y, z0 - 0.95 * s], 0.06, 5, { only: "mesh" }), rod(c, [x + 0.22, y, z0 - 1.4 * s], [x + 0.3, y + 0.2, z0 - 1.0 * s], 0.06, 5, { only: "mesh" }));
  out.push(sph(h01(seed, 5) > 0.5 ? "wood" : "hull-orange-worn", [x, y, z0 - 1.6 * s], 0.12), sph("black", [x, y, z0 - 1.66 * s], 0.115));
  if (hat) out.push(rod("hull-white", [x - 0.22, y, z0 - 1.74 * s], [x + 0.22, y, z0 - 1.74 * s], 0.04, 6, { only: "mesh" }), sph("hull-white", [x, y, z0 - 1.7 * s], 0.13));
  return out;
}

const lamp = (x: number, y: number, z0: number): Piece[] => [rod("hull-grey", [x, y, z0], [x, y, z0 - 3.0], 0.05, 6, { only: "mesh" }), sph("lamp-amber", [x, y, z0 - 3.15], 0.2)];
const bench = (x: number, y: number, z0: number): Piece[] => [bx("wood", x - 0.9, x + 0.9, y - 0.25, y + 0.25, z0 - 0.5, z0 - 0.42), bx("wood", x - 0.9, x + 0.9, y + 0.22, y + 0.28, z0 - 0.95, z0 - 0.5), bx("hull-grey-dark", x - 0.8, x - 0.7, y - 0.2, y + 0.2, z0 - 0.42, z0), bx("hull-grey-dark", x + 0.7, x + 0.8, y - 0.2, y + 0.2, z0 - 0.42, z0)];

// ---------------------------------------------------------------------------------------------------------------------------------
// houses and landmarks

export type House = 0 | 1 | 2 | 3;
/** A house on a terrace: walls, a door with a step, framed windows in two rows, a chimney, and a roof of its own kind (terracotta gable, slate gable, a green flat roof with a pergola, a barrel vault). `face` is +1 when the street is on its +y side. */
export function house(kind: House, x: number, y0: number, depth: number, z0: number, face: 1 | -1, seed: number, coarse = false): Piece[] {
  const w = 5 - (kind === 3 ? 0.4 : 0);
  const wall = ["hull-white", "hull-yellow", "hull-white", "concrete"][kind] as MaterialName;
  const wh = 2.5;
  const y1 = y0 + depth;
  const front = face > 0 ? y1 : y0;
  const out: Piece[] = [bx(wall, x - w / 2, x + w / 2, y0, y1, z0 - wh, z0)];
  out.push(bx("hull-grey", x - w / 2 - 0.08, x + w / 2 + 0.08, y0 - 0.04, y1 + 0.04, z0 - 0.3, z0));
  const roofs: [MaterialName, MaterialName] = [["hull-orange-worn", "hull-blue", "plant", "hull-grey"][kind] as MaterialName, "hull-grey-dark"];
  if (kind === 0 || kind === 1) out.push(gable(roofs[0], x, w, y0, y1, z0 - wh, kind === 0 ? 1.7 : 2.2));
  else if (kind === 2) out.push(bx("plant", x - w / 2 - 0.1, x + w / 2 + 0.1, y0 - 0.1, y1 + 0.1, z0 - wh - 0.3, z0 - wh), ...[-1, 1].map((s) => rod("wood", [x + s * (w / 2 - 0.2), front, z0 - wh], [x + s * (w / 2 - 0.2), front, z0 - wh - 1.4], 0.06, 6, { only: "mesh" })), rod("wood", [x - w / 2, front, z0 - wh - 1.4], [x + w / 2, front, z0 - wh - 1.4], 0.06, 6, { only: "mesh" }));
  else out.push(vault(roofs[0], x, w, y0, y1, z0 - wh, 1.4));
  // the front: a door, two rows of windows, a step and a flower box
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  const door = (kind + Math.floor(seed * 5)) % 2 ? -0.9 : 0.9;
  out.push(bx("wood", x + door - 0.35, x + door + 0.35, ...fy(0.08), z0 - 1.9, z0));
  if (coarse) {
    const wx = door > 0 ? -1.2 : 1.2;
    out.push(bx("window", x + wx - 0.5, x + wx + 0.5, ...fy(0.1), z0 - 2.0, z0 - 1.0));
    return out;
  }
  out.push(bx("hull-grey", x + door - 0.55, x + door + 0.55, ...fy(0.4), z0 - 0.15, z0));
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
  const out: Piece[] = [bx("hull-white", x - w / 2, x + w / 2, y0, y0 + depth, z0 - 3.3, z0), vault("hull-grey", x, w, y0, y0 + depth, z0 - 3.3, 2.3), bx("hull-grey", x - w / 2 - 0.1, x + w / 2 + 0.1, y0 - 0.05, y0 + depth + 0.05, z0 - 0.4, z0)];
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
  const out: Piece[] = [bx("hull-yellow", x - 4.2, x + 4.2, y0, y0 + depth, z0 - 2.8, z0), gable("hull-orange-worn", x, 8.4, y0, y0 + depth, z0 - 2.8, 1.6)];
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
  const out: Piece[] = [bx("hull-white", x - 5, x + 5, y0, y0 + depth, z0 - 2.6, z0), vault("hull-grey", x, 10, y0, y0 + depth, z0 - 2.6, 1.0)];
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
  return [bx("hull-grey", x - 6, x + 6, y0, y0 + depth, z0 - 2.4, z0), vault("hull-white", x, 12, y0, y0 + depth, z0 - 2.4, 2.6), bx("window", x - 5, x + 5, ...fy(0.08), z0 - 2.3, z0 - 1.5), rod("hull-grey", [x - 5.5, front, z0 - 2.4], [x - 5.5, front, z0 - 5.4], 0.06, 6, { only: "mesh" }), rod("hull-grey", [x + 5.5, front, z0 - 2.4], [x + 5.5, front, z0 - 5.4], 0.06, 6, { only: "mesh" }), sph("flood", [x - 5.5, front, z0 - 5.5], 0.25), sph("flood", [x + 5.5, front, z0 - 5.5], 0.25)];
}

/** The clinic: a pale block with a pitched roof, a covered entrance and a lit cross. */
export function clinic(x: number, y0: number, depth: number, z0: number, face: 1 | -1): Piece[] {
  const front = face > 0 ? y0 + depth : y0;
  const fy = (d: number): [number, number] => (face > 0 ? [front, front + d] : [front - d, front]);
  return [bx("hull-white", x - 3.5, x + 3.5, y0, y0 + depth, z0 - 2.6, z0), gable("hull-blue", x, 7, y0, y0 + depth, z0 - 2.6, 1.3), bx("hull-white", x - 1.2, x + 1.2, ...fy(1.0), z0 - 2.2, z0 - 2.0), rod("hull-grey", [x - 1.1, face > 0 ? front + 0.95 : front - 0.95, z0], [x - 1.1, face > 0 ? front + 0.95 : front - 0.95, z0 - 2.0], 0.06, 6, { only: "mesh" }), rod("hull-grey", [x + 1.1, face > 0 ? front + 0.95 : front - 0.95, z0], [x + 1.1, face > 0 ? front + 0.95 : front - 0.95, z0 - 2.0], 0.06, 6, { only: "mesh" }), bx("lamp-blue", x - 0.15, x + 0.15, ...fy(0.15), z0 - 3.9, z0 - 2.9), bx("lamp-blue", x - 0.55, x + 0.55, ...fy(0.15), z0 - 3.55, z0 - 3.25), bx("window", x - 2.8, x - 1.6, ...fy(0.08), z0 - 1.9, z0 - 0.9), bx("window", x + 1.6, x + 2.8, ...fy(0.08), z0 - 1.9, z0 - 0.9)];
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the nave: lawns in mown stripes, banks, mounds, paths, water

export type Level = "coarse" | "fine";

/** The canal for one bay of the nave, `bay` metres long, at ground z0: reflective water, concrete edge, lawn banks rising away from it, reeds and every so often a bridge. */
function canal(z0: number, bay: number, i: number, level: Level): Piece[] {
  const out: Piece[] = [bx("water-clear", -bay / 2, bay / 2, -0.78, 0.78, z0 - 0.05, z0 - 0.04)];
  for (const s of [-1, 1]) {
    out.push(bx("concrete", -bay / 2, bay / 2, s > 0 ? 1.0 : -1.35, s > 0 ? 1.35 : -1.0, z0 - 0.4, z0 + 0.06));
    // the bank: lawn rising from the concrete edge to the nave's level, with a flat strip beyond it
    out.push(quad("lawn-dark", [-bay / 2, s * 1.35, z0 - 0.4], [bay / 2, s * 1.35, z0 - 0.4], [bay / 2, s * 2.4, z0 - 0.02], [-bay / 2, s * 2.4, z0 - 0.02], 0.05, { only: "mesh" }));
    const reeds = level === "fine" ? 7 : 3;
    for (let k = 0; k < reeds; k++) {
      const px = (h01(i, k + (s > 0 ? 0 : 5)) - 0.5) * bay;
      out.push(rod("plant", [px, s * 1.5, z0 - 0.3], [px + 0.1, s * 1.6, z0 - 1.0 - h01(i, k) * 0.6], 0.035, 5, { only: "mesh" }), rod("leaf", [px + 0.15, s * 1.5, z0 - 0.3], [px + 0.2, s * 1.55, z0 - 0.9 - h01(k, i) * 0.5], 0.03, 5, { only: "mesh" }));
    }
  }
  if (i % 11 === 5) {
    // a footbridge: a deck of five steps rising to the middle with rails and a lamp at each end
    for (let k = 0; k < 5; k++) out.push(bx("hull-white", -1.3, 1.3, -2.0 + k * 0.8, -1.2 + k * 0.8, z0 - 0.5 - (k === 2 ? 0.32 : k === 1 || k === 3 ? 0.18 : 0), z0 - 0.3));
    for (const sx of [-1.2, 1.2]) out.push(rod("hull-grey", [sx, -2.0, z0 - 0.9], [sx, -1.2, z0 - 1.0], 0.04, 6, { only: "mesh" }), rod("hull-grey", [sx, -1.2, z0 - 1.0], [sx, 1.2, z0 - 1.15], 0.04, 6, { only: "mesh" }), rod("hull-grey", [sx, 1.2, z0 - 1.15], [sx, 2.0, z0 - 1.0], 0.04, 6, { only: "mesh" }));
  }
  return out;
}

/** One bay of the living ring's nave: lawn in two mown stripes each side of the canal, a mound, a sand path along the terraces, tree rows of mixed species, shrubs, flower beds, lamps, benches, people. */
function nave(g: ReturnType<typeof geoOf>, i: number, level: Level): Piece[] {
  const rg = ground(g);
  const nv = dims(g).nave;
  const fine = level === "fine";
  const out: Piece[] = [...canal(rg, 6.4, i, level)];
  const kinds: Species[] = ["oak", "spruce", "blossom", "poplar", "oak", "fruit"];
  for (const s of [-1, 1]) {
    const lo = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
    out.push(bx("lawn", -3.2, 3.2, ...lo(2.4, 3.1), rg - 0.025, rg - 0.005), bx("lawn-dark", -3.2, 3.2, ...lo(3.1, 3.5), rg - 0.025, rg - 0.005), bx("sand", -3.2, 3.2, ...lo(3.5, 4.2), rg - 0.02, rg - 0.005), bx("lawn-dark", -3.2, 3.2, ...lo(4.2, nv - 0.02), rg - 0.025, rg - 0.005));
    if (i % 3 === (s > 0 ? 0 : 1)) out.push(...mound(i % 2 ? "lawn" : "meadow", (h01(i, s) - 0.5) * 2, s * 3.0, 2.2, 0.8, 0.5, rg));
    const k = kinds[Math.floor(h01(i, s + 3) * kinds.length)];
    const hgt = (k === "spruce" ? 5.5 : k === "poplar" ? 6.5 : 4.6) * (0.85 + h01(i, s) * 0.35);
    if (i % 2 === (s > 0 ? 0 : 1)) out.push(...tree(k, (h01(i, s + 7) - 0.5) * 2.0, s * (nv * 0.62 + h01(i, 4) * 0.5), rg, hgt, h01(i, s), !fine));
    if (i % 4 === (s > 0 ? 1 : 3)) out.push(...lamp(2.6, s * 2.5, rg));
    if (i % 9 === (s > 0 ? 2 : 6)) out.push(...bench(-1.5, s * 2.6, rg));
    if (i % 2 === (s > 0 ? 1 : 0)) out.push(...shrub((h01(i, s + 30) - 0.5) * 3, s * (4.35 + h01(i, 31) * 0.2), rg, 0.5 + h01(i, 32) * 0.3, i + s));
    if (i % 3 === 1) out.push(...flowers(-2.2, 2.2, s * 2.85, rg, i + s * 7, fine ? 14 : 6));
    if (fine) for (let q = 0; q < 6; q++) out.push(...tuft((h01(i, q + 40 + s) - 0.5) * 6, s * (1.6 + h01(i, q + 50) * 2.2), rg, i * 9 + q, 0.35, h01(i, q) > 0.5 ? "lawn" : "meadow"));
  }
  if (i % 3 === 0) out.push(...person((h01(i, 11) - 0.5) * 4, (h01(i, 12) > 0.5 ? 1 : -1) * 2.7, rg, i * 3 + 1));
  if (i % 5 === 2) out.push(...person(-1.6, 3.1, rg, i + 40), ...(fine ? person(-1.2, 3.2, rg, i + 41) : []));
  return out;
}

/** One bay of a terrace step: a house of one of four kinds with a hedge of shrubs on the tread edge, and people in front of it, by hash. */
function terrace(g: ReturnType<typeof geoOf>, s: 1 | -1, k: number, i: number, level: Level): Piece[] {
  const { nave: nv, tread } = dims(g);
  const rk = ground(g) - STEP * k;
  const e0 = nv + tread * (k - 1);
  const y0 = s > 0 ? e0 + 0.15 : -(e0 + tread - 0.15);
  const depth = tread - 0.3;
  const kind = Math.floor(h01(i, k + 5 * (s > 0 ? 1 : 0)) * 4) as House;
  const out = house(kind, 0, y0, depth, rk, s > 0 ? -1 : 1, h01(i, k), level === "coarse");
  const edge = s > 0 ? e0 + 0.08 : -(e0 + 0.08);
  if (h01(i, k + 15) > 0.3) out.push(...shrub((h01(i, k + 16) - 0.5) * 4, edge, rk, 0.35 + h01(i, k + 17) * 0.25, i + k));
  if (level === "fine" && h01(i, k + 25) > 0.5) out.push(...shrub((h01(i, k + 26) - 0.5) * 4, edge, rk, 0.3, i + k + 9));
  if (h01(i, k + 20) > 0.55) out.push(...person(0.3, s > 0 ? e0 - 0.2 : -(e0 - 0.2), rk + STEP * 0, i * 7 + k + (s > 0 ? 100 : 0)));
  if (h01(i, k + 30) > 0.7) out.push(...tree(h01(i, k + 31) > 0.5 ? "blossom" : "fruit", 1.9, s > 0 ? e0 + tread * 0.5 : -(e0 + tread * 0.5), rk, 3.0 + h01(i, k + 2), h01(i, 50), level === "coarse"));
  return out;
}

const LANDMARKS: { id: "theatre" | "market" | "sports" | "school" | "clinic"; az: number; s: 1 | -1; k: number }[] = [
  { id: "theatre", az: 64, s: 1, k: 1 },
  { id: "market", az: 78, s: -1, k: 1 },
  { id: "sports", az: 96, s: 1, k: 2 },
  { id: "school", az: 106, s: -1, k: 2 },
  { id: "clinic", az: 84, s: 1, k: 3 },
];

/** The living ring's town: bare floors and glass from the ring code, then the painted fill: nave bays and terrace bays stamped round the ring, the landmarks among them. `coarse` leaves out the grass tufts, half the flowers and reeds, and the second person of a pair. */
export function livingInterior(gap = 58, level: Level = "fine"): Piece[] {
  fineRound = level === "fine";
  try {
    return living(gap, level);
  } finally {
    fineRound = true;
  }
}

function living(gap: number, level: Level): Piece[] {
  const r = rings("bow").find((one) => one.use === "living")!;
  const g = geoOf({ ...r, y: 0 });
  const rg = ground(g);
  const { nave: nv, tread } = dims(g);
  const n = Math.round((TAU * rg) / 6.4);
  const out: Piece[] = [...glass(g, 0, gap), ...townHall(g, 0, "living", gap, true)];
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (az < gap || az > 360 - gap) continue;
    const bay: Piece[] = [...nave(g, i, level)];
    for (const s of [1, -1] as const) for (let k = 1; k <= 3; k++) {
      const mark = LANDMARKS.find((l) => l.s === s && l.k === k && Math.abs(az - l.az) < 180 / n + 0.01);
      const rk = rg - STEP * k;
      const e0 = nv + tread * (k - 1);
      const y0 = s > 0 ? e0 + 0.15 : -(e0 + tread - 0.15);
      const depth = tread - 0.3;
      const face = (s > 0 ? -1 : 1) as 1 | -1;
      if (mark) bay.push(...{ theatre, market, sports, school, clinic }[mark.id](0, y0, depth, rk, face));
      else if (!LANDMARKS.some((l) => l.s === s && l.k === k && Math.abs(az - l.az) < 3.2 * (360 / n))) bay.push(...terrace(g, s, k, i, level));
    }
    out.push(...place(bay, { at: [0, 0, 0], yaw: az }));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the garden ring

/** A leaf: a long thin triangle from a base leaning out and up, `len` long. */
const leaf = (m: MaterialName, x: number, y: number, z0: number, a: number, len: number): Piece => tri(m, [x + 0.035 * Math.cos(a + 1.57), y + 0.035 * Math.sin(a + 1.57), z0], [x - 0.035 * Math.cos(a + 1.57), y - 0.035 * Math.sin(a + 1.57), z0], [x + 0.5 * len * Math.cos(a), y + 0.5 * len * Math.sin(a), z0 - 0.85 * len]);

/**
 * One tread of crop, `bay` metres of it: a soil bed and rows of crop along the street, each row a long six-sided stem of green or gold by field, and (fine) clumps of real leaves and ears along each row. The rows run on from bay to bay,
 * and the same crop holds for ten bays, so the fields are long bands of gold and green.
 */
function crops(y0: number, y1: number, z0: number, bay: number, i: number, k: number, s: number, level: Level): Piece[] {
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  const out: Piece[] = [bx("soil", -bay / 2, bay / 2, lo, hi, z0 - 0.1, z0)];
  const rows = Math.max(2, Math.floor((hi - lo - 0.3) / 0.38));
  const band = Math.floor(i / 9);
  for (let r = 0; r < rows; r++) {
    const y = lo + 0.2 + ((hi - lo - 0.4) * (r + 0.5)) / rows;
    const gold = h01(band, k * 7 + (s > 0 ? 1 : 0) + Math.floor(r / 2) * 3) > 0.5;
    const hgt = gold ? 0.42 : 0.3;
    out.push(rod(gold ? "crop-gold" : "crop-green", [-bay / 2, y, z0 - hgt * 0.6], [bay / 2, y, z0 - hgt * 0.6], hgt * 0.55, 6, { only: "mesh" }));
    if (level === "fine") for (let q = 0; q < 4; q++) {
      const x = -bay / 2 + (bay * (q + 0.5)) / 4;
      const ears = gold ? 4 : 6;
      for (let e = 0; e < ears; e++) out.push(leaf(gold ? "crop-gold" : e % 2 ? "crop-green" : "leaf", x + (h01(i, r * 9 + q + e) - 0.5) * 0.3, y, z0 - hgt * 0.7, TAU * (e / ears) + h01(i, e), gold ? 0.75 : 0.55));
    }
  }
  return out;
}

/** The garden ring's hall: bare terraces and glass from the ring code, then long rows of golden and green crop on every tread, a lawn and a sand aisle in the nave, workers in hats with carts, and fruit trees. `coarse` keeps the rows as plain stems and the people to a third. */
export function gardenInterior(gap = 58, level: Level = "fine"): Piece[] {
  fineRound = level === "fine";
  try {
    return garden(gap, level);
  } finally {
    fineRound = true;
  }
}

function garden(gap: number, level: Level): Piece[] {
  const r = rings("bow").find((one) => one.use === "hydro")!;
  const g = geoOf({ ...r, y: 0 });
  const rg = ground(g);
  const { nave: nv, tread } = dims(g);
  const n = Math.round((TAU * rg) / 5.2);
  const fine = level === "fine";
  const out: Piece[] = [...glass(g, 0, gap), ...hydroHall(g, 0, gap, true).map((p): Piece => (p.kind === "lathe" && p.material === "hull-white" ? { ...p, material: (["meadow", "crop-gold", "crop-green"] as const)[Math.max(0, Math.min(2, Math.round((ground(g) - p.profile[0][0]) / STEP) - 1))] } : p))];
  for (let i = 0; i < n; i++) {
    const az = (360 * i) / n;
    if (az < gap || az > 360 - gap) continue;
    const bay: Piece[] = [];
    for (const s of [-1, 1]) {
      const lo = (a: number, b: number): [number, number] => (s > 0 ? [a, b] : [-b, -a]);
      bay.push(bx("meadow", -2.6, 2.6, ...lo(2.25, nv - 0.02), rg - 0.025, rg - 0.005), bx("lawn", -2.6, 2.6, ...lo(2.9, 3.2), rg - 0.03, rg - 0.005));
    }
    if (i % 5 === 1) bay.push(...tree("fruit", 0.5, (i % 2 ? 1 : -1) * (nv * 0.8), rg, 3.4, h01(i)));
    if (i % (fine ? 4 : 12) === 0) bay.push(...person((h01(i, 2) - 0.5) * 3, (h01(i, 3) > 0.5 ? 1 : -1) * 1.5, rg, i + 200, true));
    if (i % 12 === 3) bay.push(bx("hull-grey-dark", -0.8, 0.8, -0.4, 0.4, rg - 0.7, rg - 0.2), rod("hull-grey", [-0.6, -0.5, rg], [-0.6, -0.5, rg - 0.2], 0.1, 8, { only: "mesh" }), rod("hull-grey", [0.6, -0.5, rg], [0.6, -0.5, rg - 0.2], 0.1, 8, { only: "mesh" }), bx("crop-gold", -0.7, 0.7, -0.35, 0.35, rg - 1.0, rg - 0.7));
    for (const s of [1, -1] as const) for (let k = 1; k <= 3; k++) {
      const e0 = nv + tread * (k - 1);
      const rk = rg - STEP * k;
      bay.push(...crops(s > 0 ? e0 + 0.1 : -(e0 + tread - 0.1), s > 0 ? e0 + tread - 0.1 : -(e0 + 0.1), rk, 5.2, i, k, s, level));
      if (h01(i, k + (s > 0 ? 70 : 80)) > (fine ? 0.82 : 0.95)) bay.push(...person(1.8, s > 0 ? e0 + tread / 2 : -(e0 + tread / 2), rk, i * 5 + k + 300, true));
    }
    out.push(...place(bay, { at: [0, 0, 0], yaw: az }));
  }
  return out;
}

/** One ring opened for a look inside with its painted fill: the section's frames, the hub and the spokes from the cutaway, and the interior (whose glass and hall replace the cutaway's bare ones). */
export function interiorScene(use: "living" | "hydro", gap = 58, level: Level = "fine"): Piece[] {
  const r = rings().find((one) => one.use === use)!;
  const bare = ringPieces({ ...r, y: 0 }, gap).length;
  return [...cutaway4(use).slice(bare), ...(use === "living" ? livingInterior(gap, level) : gardenInterior(gap, level))];
}

void hoop;
void deg;
