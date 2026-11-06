// The shapes a part is made of, in metres, and what they become: triangles for a mesh and lines for the line looks. A part is plain data, so one description gives one mesh and one drawing that can never
// disagree. Pure: no three.js. Angles are radians round the Y axis from +Z (the windward side) towards +X.
import type { Vec3 } from "../framing.ts";
import type { MaterialName } from "./materials.ts";

export type { Vec3 };

export interface Frame {
  o: Vec3;
  u: Vec3;
  v: Vec3;
  w: Vec3;
}

/**
 * A piece that a flight can turn: the name of the group it belongs to (every piece with the same name and pivot turns together), the point it turns about and the axis it turns round, in the part's own metres.
 * A positive angle turns it right-handed about the axis. The piece is drawn where its group is at rest, which is the angle 0.
 */
export interface Move {
  name: string;
  pivot: Vec3;
  axis: Vec3;
}

/** A body of revolution: `profile` is [radius, y] points going up the outside (going the other way faces inward). */
export interface Lathe {
  kind: "lathe";
  material: MaterialName;
  profile: readonly (readonly [number, number])[];
  at?: readonly [number, number];
  /** Its axis leans: this far along x and z for each metre up. */
  lean?: readonly [number, number];
  segs: number;
  /** The part of the circle it covers at a height, as [from, to] radians; left out: all of it. */
  arc?: (y: number) => readonly [number, number];
  /** Heights with a ring of weld line. */
  welds?: readonly number[];
  /** Heights with a ring of feature line. */
  rings?: readonly number[];
  /** Texture coordinates for the painted look. */
  uv?: boolean;
  /** A shell the drawing skips, because a hull's outline already covers it. */
  only?: "mesh" | "drawing";
  /** It hangs under the body: drawn over the body from below and behind it from above. */
  under?: boolean;
  /** Part of the main body: a drawing draws these first and treats them as the depth others compare with. */
  body?: boolean;
  /** Its outline is drawn in a drawing. */
  outline?: boolean;
  /** Its surface is fluted, `flutes` ridges round it each `flute` metres deep (the tubes of a regeneratively cooled nozzle, the ribs of a sleeve). Needs four segments for each flute. */
  flutes?: number;
  flute?: number;
  move?: Move;
}

/** A flat outline with a thickness, in a frame: `outline` is [u, v] points, going round; it stands from -thickness/2 to +thickness/2 along w. Convex, or it is drawn as its hull. */
export interface Plate {
  kind: "plate";
  material: MaterialName;
  /** The material of the +w face, when it differs. */
  top?: MaterialName;
  frame: Frame;
  outline: readonly (readonly [number, number])[];
  thickness: number;
  /** Lines on its +w and -w faces, as [u, v] pairs. */
  ribs?: readonly (readonly [readonly [number, number], readonly [number, number]])[];
  only?: "mesh" | "drawing";
  /** No feature lines of its own. */
  plain?: boolean;
  /** Only its +w face, with no back and no edge walls: a sheet, such as foil or the skin of a blanket. */
  sheet?: boolean;
  /** Its +w face stuffed into pillows: a rectangular outline in `nu` by `nv` cells, each standing `bulge` metres proud at its middle, with a crease where two meet. */
  quilt?: { nu: number; nv: number; bulge: number };
  /** A rectangular outline with a raised frame `margin` wide round a field sunk `depth` below it (a quilt, when it has one, fills the field). */
  inset?: { margin: number; depth: number };
  /** Loose flat triangles in the frame's [u, v, w] coordinates, wound counter-clockwise seen from the front, each lit on its own: crinkled foil. The outline only bounds them. */
  facets?: readonly (readonly [Vec3, Vec3, Vec3])[];
  move?: Move;
}

/** Lines only, in the part's own space. */
export interface Lines {
  kind: "lines";
  weight: "feature" | "weld";
  paths: readonly (readonly Vec3[])[];
  only?: "mesh" | "drawing";
  move?: Move;
}

export type Piece = Lathe | Plate | Lines;

/** A frame standing on the axis: u points outwards at `az` radians, v is up, w is along the circle. */
export function radial(az: number, y = 0, atRadius = 0): Frame {
  const u: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  return { o: [u[0] * atRadius, y, u[2] * atRadius], u, v: [0, 1, 0], w: [u[2], 0, -u[0]] };
}

/** A frame lying flat: u outwards at `az`, v along the circle, w up. */
export function flat(az: number, y: number, atRadius = 0): Frame {
  const u: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  return { o: [u[0] * atRadius, y, u[2] * atRadius], u, v: [-u[2], 0, u[0]], w: [0, 1, 0] };
}

export const pointOf = (f: Frame, a: number, b: number, c = 0): Vec3 => [f.o[0] + f.u[0] * a + f.v[0] * b + f.w[0] * c, f.o[1] + f.u[1] * a + f.v[1] * b + f.w[1] * c, f.o[2] + f.u[2] * a + f.v[2] * b + f.w[2] * c];

/** A long thin box from a to b, its width along `side`. */
export function strut(material: MaterialName, a: Vec3, b: Vec3, width: number, depth: number, extra: Partial<Plate> = {}): Plate {
  const along: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(...along) || 1;
  const u: Vec3 = [along[0] / length, along[1] / length, along[2] / length];
  // any direction across it, keeping the same one for the same struts
  const seed: Vec3 = Math.abs(u[1]) > 0.9 ? [Math.hypot(a[0], a[2]) > 1e-6 ? a[0] : 1, 0, a[2]] : [0, 1, 0];
  const raw: Vec3 = [u[1] * seed[2] - u[2] * seed[1], u[2] * seed[0] - u[0] * seed[2], u[0] * seed[1] - u[1] * seed[0]];
  const l = Math.hypot(...raw) || 1;
  const v: Vec3 = [raw[0] / l, raw[1] / l, raw[2] / l];
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return { kind: "plate", material, frame: { o: a, u, v, w }, outline: [[0, -width / 2], [length, -width / 2], [length, width / 2], [0, width / 2]], thickness: depth, plain: true, ...extra };
}

/** A radius on a profile at a height. */
export function radiusAt(profile: readonly (readonly [number, number])[], y: number): number {
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1)) return y1 === y0 ? Math.max(r0, r1) : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------------------------

export interface Buffers {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
  hasUv: boolean;
}

export interface LineBuffers {
  positions: number[];
  indices: number[];
}

/** The mesh of one moving group, its points relative to its pivot, so the group turns about its own origin. */
export interface MoveMesh {
  /** The group's name, and a node name of its own: `grid-fins~0`, `grid-fins~1`. */
  name: string;
  id: string;
  pivot: Vec3;
  axis: Vec3;
  mesh: PartMesh;
}

export interface PartMesh {
  faces: Map<MaterialName, Buffers>;
  feature: LineBuffers;
  weld: LineBuffers;
  /** What a flight can turn, apart from the rest. Empty for a part with no moving group. */
  moves: MoveMesh[];
}

const newBuffers = (): Buffers => ({ positions: [], normals: [], uvs: [], indices: [], hasUv: false });

function buffersOf(mesh: PartMesh, material: MaterialName): Buffers {
  let b = mesh.faces.get(material);
  if (!b) {
    b = newBuffers();
    mesh.faces.set(material, b);
  }
  return b;
}

/** A lathe's triangles. Each segment has its own vertices where the profile turns sharply and shares them where it runs smoothly. */
function latheFaces(mesh: PartMesh, piece: Lathe): void {
  const out = buffersOf(mesh, piece.material);
  const [cx, cz] = piece.at ?? [0, 0];
  const { profile, segs, arc } = piece;
  if (piece.uv) out.hasUv = true;
  const normalOf = (i: number): [number, number] => {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    const l = Math.hypot(r1 - r0, y1 - y0) || 1;
    return [(y1 - y0) / l, -(r1 - r0) / l];
  };
  const SMOOTH = Math.cos((40 * Math.PI) / 180);
  // the span round the circle: the widest of the stations, so vertex counts agree
  const spans = profile.map(([, y]) => (arc ? arc(y)[1] - arc(y)[0] : 2 * Math.PI));
  const span = Math.max(...spans);
  const n = Math.max(2, Math.ceil((segs * span) / (2 * Math.PI)));
  for (let s = 0; s + 1 < profile.length; s++) {
    const nHere = normalOf(s);
    const smoothWith = (other: number): [number, number] => {
      if (other < 0 || other + 1 >= profile.length) return nHere;
      const nb = normalOf(other);
      if (nHere[0] * nb[0] + nHere[1] * nb[1] < SMOOTH) return nHere;
      const l = Math.hypot(nHere[0] + nb[0], nHere[1] + nb[1]) || 1;
      return [(nHere[0] + nb[0]) / l, (nHere[1] + nb[1]) / l];
    };
    const base = out.positions.length / 3;
    for (const [station, normal] of [
      [s, smoothWith(s - 1)],
      [s + 1, smoothWith(s + 1)],
    ] as const) {
      const [r, y] = profile[station];
      const [a0, a1] = arc ? arc(y) : [0, 2 * Math.PI];
      for (let j = 0; j <= n; j++) {
        const a = a0 + ((a1 - a0) * j) / n;
        const sa = Math.sin(a);
        const ca = Math.cos(a);
        if (piece.flutes && piece.flute) {
          // ridges round the surface: the radius swings by `flute` and the normal leans along the circle where it climbs
          const wave = Math.cos(piece.flutes * a);
          const lean = (-piece.flute * piece.flutes * Math.sin(piece.flutes * a)) / Math.max(r, 0.05);
          const rr = r + piece.flute * 0.5 * wave;
          const tangent: [number, number] = [ca, -sa];
          const nx = normal[0] * sa + tangent[0] * lean;
          const nz = normal[0] * ca + tangent[1] * lean;
          const l = Math.hypot(nx, normal[1], nz) || 1;
          out.positions.push(cx + rr * sa + (piece.lean?.[0] ?? 0) * y, y, cz + rr * ca + (piece.lean?.[1] ?? 0) * y);
          out.normals.push(nx / l, normal[1] / l, nz / l);
        } else {
          out.positions.push(cx + r * sa + (piece.lean?.[0] ?? 0) * y, y, cz + r * ca + (piece.lean?.[1] ?? 0) * y);
          out.normals.push(normal[0] * sa, normal[1], normal[0] * ca);
        }
        // u: round the hull; v: height over a hundred metres, so one picture repeats the same on every part
        // an arc that starts on the far side of the windward line is shifted a half turn, so it stays between 0 and 1
        out.uvs.push(a / (2 * Math.PI) + (a0 < 0 ? 0.5 : 0), y / 100);
      }
    }
    const row = n + 1;
    for (let j = 0; j < n; j++) {
      const a = base + j;
      const b = base + j + 1;
      const c = base + row + j;
      const d = base + row + j + 1;
      // going up the outside faces outward
      out.indices.push(a, b, d, a, d, c);
    }
  }
}

const addPath = (lines: LineBuffers, path: readonly Vec3[]): void => {
  const base = lines.positions.length / 3;
  for (const p of path) lines.positions.push(p[0], p[1], p[2]);
  for (let i = 0; i + 1 < path.length; i++) lines.indices.push(base + i, base + i + 1);
};

/** A ring just proud of the surface at a height, so it is not lost in it. */
export function ringPath(piece: Lathe, y: number, lift = 0.012): Vec3[] {
  const [cx, cz] = piece.at ?? [0, 0];
  const r = radiusAt(piece.profile, y) + lift;
  const [a0, a1] = piece.arc ? piece.arc(y) : [0, 2 * Math.PI];
  const n = Math.max(2, Math.ceil((piece.segs * (a1 - a0)) / (2 * Math.PI)));
  const path: Vec3[] = [];
  for (let j = 0; j <= n; j++) {
    const a = a0 + ((a1 - a0) * j) / n;
    path.push([cx + r * Math.sin(a) + (piece.lean?.[0] ?? 0) * y, y, cz + r * Math.cos(a) + (piece.lean?.[1] ?? 0) * y]);
  }
  return path;
}

const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const diff3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** One triangle with a normal at each corner, wound so its front faces the way the first normal does. */
function addTriangle(out: Buffers, points: readonly [Vec3, Vec3, Vec3], normals: readonly [Vec3, Vec3, Vec3]): void {
  const base = out.positions.length / 3;
  for (let i = 0; i < 3; i++) {
    out.positions.push(...points[i]);
    out.normals.push(...normals[i]);
    out.uvs.push(0, 0);
  }
  const face = cross3(diff3(points[1], points[0]), diff3(points[2], points[0]));
  if (dot3(face, normals[0]) >= 0) out.indices.push(base, base + 1, base + 2);
  else out.indices.push(base, base + 2, base + 1);
}

/** A flat four-cornered face with one normal. */
function addQuad(out: Buffers, a: Vec3, b: Vec3, c: Vec3, d: Vec3, normal: Vec3): void {
  addTriangle(out, [a, b, c], [normal, normal, normal]);
  addTriangle(out, [a, c, d], [normal, normal, normal]);
}

/** The +w face of a rectangular plate: a raised frame round a sunk field, a quilt of pillows, or both. */
function relief(mesh: PartMesh, piece: Plate, half: number): void {
  const { frame, outline } = piece;
  const field = buffersOf(mesh, piece.top ?? piece.material);
  const out = buffersOf(mesh, piece.material);
  const us = outline.map(([a]) => a);
  const vs = outline.map(([, b]) => b);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const at = (a: number, b: number, c: number): Vec3 => pointOf(frame, a, b, c);
  const up = frame.w;
  const inset = piece.inset;
  const m = inset ? Math.min(inset.margin, (u1 - u0) / 2 - 0.001, (v1 - v0) / 2 - 0.001) : 0;
  let floor = half;
  if (inset) {
    floor = half - inset.depth;
    const [i0, i1, j0, j1] = [u0 + m, u1 - m, v0 + m, v1 - m];
    addQuad(out, at(u0, v0, half), at(u1, v0, half), at(u1, j0, half), at(u0, j0, half), up);
    addQuad(out, at(u0, j1, half), at(u1, j1, half), at(u1, v1, half), at(u0, v1, half), up);
    addQuad(out, at(u0, j0, half), at(i0, j0, half), at(i0, j1, half), at(u0, j1, half), up);
    addQuad(out, at(i1, j0, half), at(u1, j0, half), at(u1, j1, half), at(i1, j1, half), up);
    const wall = (p: Vec3, q: Vec3, inward: Vec3): void => addQuad(field, p, q, [q[0] - up[0] * inset.depth, q[1] - up[1] * inset.depth, q[2] - up[2] * inset.depth], [p[0] - up[0] * inset.depth, p[1] - up[1] * inset.depth, p[2] - up[2] * inset.depth], inward);
    wall(at(i0, j0, half), at(i1, j0, half), frame.v);
    wall(at(i1, j1, half), at(i0, j1, half), [-frame.v[0], -frame.v[1], -frame.v[2]]);
    wall(at(i0, j1, half), at(i0, j0, half), frame.u);
    wall(at(i1, j0, half), at(i1, j1, half), [-frame.u[0], -frame.u[1], -frame.u[2]]);
  }
  const [f0, f1, g0, g1] = [u0 + m, u1 - m, v0 + m, v1 - m];
  const quilt = piece.quilt;
  if (!quilt) {
    addQuad(field, at(f0, g0, floor), at(f1, g0, floor), at(f1, g1, floor), at(f0, g1, floor), up);
    return;
  }
  const cu = (f1 - f0) / quilt.nu;
  const cv = (g1 - g0) / quilt.nv;
  const lean = 1.7;
  for (let i = 0; i < quilt.nu; i++)
    for (let j = 0; j < quilt.nv; j++) {
      const grid: { p: Vec3; n: Vec3 }[][] = [];
      for (let a = 0; a < 3; a++) {
        grid.push([]);
        for (let b = 0; b < 3; b++) {
          const fu = a / 2;
          const fv = b / 2;
          const h = quilt.bulge * Math.sin(Math.PI * fu) * Math.sin(Math.PI * fv);
          const du = ((quilt.bulge * Math.PI) / cu) * Math.cos(Math.PI * fu) * Math.sin(Math.PI * fv) * lean;
          const dv = ((quilt.bulge * Math.PI) / cv) * Math.sin(Math.PI * fu) * Math.cos(Math.PI * fv) * lean;
          const n = unit3([frame.w[0] - frame.u[0] * du - frame.v[0] * dv, frame.w[1] - frame.u[1] * du - frame.v[1] * dv, frame.w[2] - frame.u[2] * du - frame.v[2] * dv]);
          grid[a].push({ p: at(f0 + (i + fu) * cu, g0 + (j + fv) * cv, floor + h), n });
        }
      }
      const base = field.positions.length / 3;
      for (const column of grid)
        for (const { p, n } of column) {
          field.positions.push(...p);
          field.normals.push(...n);
          field.uvs.push(0, 0);
        }
      // the nine points are numbered column by column: the middle is 4, and the ring round it goes 0 3 6 7 8 5 2 1
      const ring = [0, 3, 6, 7, 8, 5, 2, 1];
      for (let k = 0; k < 8; k++) {
        const [a, b, c] = [base + 4, base + ring[k], base + ring[(k + 1) % 8]];
        const pa = grid[1][1].p;
        const face = cross3(diff3(grid[Math.floor(ring[k] / 3)][ring[k] % 3].p, pa), diff3(grid[Math.floor(ring[(k + 1) % 8] / 3)][ring[(k + 1) % 8] % 3].p, pa));
        if (dot3(face, up) >= 0) field.indices.push(a, b, c);
        else field.indices.push(a, c, b);
      }
    }
}

/** The lines of a quilted or framed face, so the line looks read it as the painted look does: the inner rim of a frame, the creases between pillows. */
function reliefLines(mesh: PartMesh, piece: Plate, half: number): void {
  const { frame, outline } = piece;
  const us = outline.map(([a]) => a);
  const vs = outline.map(([, b]) => b);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const m = piece.inset ? Math.min(piece.inset.margin, (u1 - u0) / 2 - 0.001, (v1 - v0) / 2 - 0.001) : 0;
  const [f0, f1, g0, g1] = [u0 + m, u1 - m, v0 + m, v1 - m];
  const lift = 0.006;
  if (piece.inset) {
    addPath(mesh.feature, [[f0, g0], [f1, g0], [f1, g1], [f0, g1], [f0, g0]].map(([a, b]) => pointOf(frame, a, b, half + lift)));
    const floor = half - piece.inset.depth + lift;
    addPath(mesh.weld, [[f0, g0], [f1, g0], [f1, g1], [f0, g1], [f0, g0]].map(([a, b]) => pointOf(frame, a, b, floor)));
  }
  const quilt = piece.quilt;
  if (quilt) {
    const level = (piece.inset ? half - piece.inset.depth : half) + lift;
    for (let i = 1; i < quilt.nu; i++) addPath(mesh.weld, [pointOf(frame, f0 + ((f1 - f0) * i) / quilt.nu, g0, level), pointOf(frame, f0 + ((f1 - f0) * i) / quilt.nu, g1, level)]);
    for (let j = 1; j < quilt.nv; j++) addPath(mesh.weld, [pointOf(frame, f0, g0 + ((g1 - g0) * j) / quilt.nv, level), pointOf(frame, f1, g0 + ((g1 - g0) * j) / quilt.nv, level)]);
  }
}

function plateFaces(mesh: PartMesh, piece: Plate): void {
  const { frame, outline, thickness } = piece;
  const half = thickness / 2;
  const n = outline.length;
  if (piece.facets) {
    const out = buffersOf(mesh, piece.material);
    const gold = piece.material === "cell-gold";
    let u0 = 0;
    let u1 = 1;
    let v0 = 0;
    let v1 = 1;
    if (gold) {
      u0 = Infinity;
      u1 = -Infinity;
      v0 = Infinity;
      v1 = -Infinity;
      for (const tri of piece.facets) for (const p of tri) {
        if (p[0] < u0) u0 = p[0];
        if (p[0] > u1) u1 = p[0];
        if (p[1] < v0) v0 = p[1];
        if (p[1] > v1) v1 = p[1];
      }
      out.hasUv = true;
    }
    const du = u1 - u0 || 1;
    const dv = v1 - v0 || 1;
    for (const [a, b, c] of piece.facets) {
      const p = [pointOf(frame, ...a), pointOf(frame, ...b), pointOf(frame, ...c)] as const;
      const normal = unit3(cross3(diff3(p[1], p[0]), diff3(p[2], p[0])));
      const base = out.positions.length / 3;
      for (let i = 0; i < 3; i++) {
        out.positions.push(...p[i]);
        out.normals.push(...normal);
        out.uvs.push(gold ? ( [a, b, c][i][0] - u0) / du : 0, gold ? ([a, b, c][i][1] - v0) / dv : 0);
      }
      if (dot3(normal, normal) >= 0) out.indices.push(base, base + 1, base + 2);
    }
    return;
  }
  const addFan = (material: MaterialName, c: number, normal: Vec3, reverse: boolean) => {
    const out = buffersOf(mesh, material);
    const base = out.positions.length / 3;
    let u0 = 0;
    let u1 = 1;
    let v0 = 0;
    let v1 = 1;
    if (material === "cell-gold") {
      u0 = Infinity;
      u1 = -Infinity;
      v0 = Infinity;
      v1 = -Infinity;
      for (const [a, b] of outline) {
        if (a < u0) u0 = a;
        if (a > u1) u1 = a;
        if (b < v0) v0 = b;
        if (b > v1) v1 = b;
      }
      out.hasUv = true;
    }
    const du = u1 - u0 || 1;
    const dv = v1 - v0 || 1;
    for (const [a, b] of outline) {
      out.positions.push(...pointOf(frame, a, b, c));
      out.normals.push(...normal);
      out.uvs.push(material === "cell-gold" ? (a - u0) / du : 0, material === "cell-gold" ? (b - v0) / dv : 0);
    }
    for (let i = 1; i + 1 < n; i++) {
      if (reverse) out.indices.push(base, base + i + 1, base + i);
      else out.indices.push(base, base + i, base + i + 1);
    }
  };
  // the turn of the outline: which way round decides which face is outward
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [a0, b0] = outline[i];
    const [a1, b1] = outline[(i + 1) % n];
    area += a0 * b1 - a1 * b0;
  }
  const ccw = area > 0;
  // u x v against w: a frame may be either hand
  const hand = frame.u[1] * frame.v[2] - frame.u[2] * frame.v[1];
  const hand2 = frame.u[2] * frame.v[0] - frame.u[0] * frame.v[2];
  const hand3 = frame.u[0] * frame.v[1] - frame.u[1] * frame.v[0];
  const right = hand * frame.w[0] + hand2 * frame.w[1] + hand3 * frame.w[2] > 0;
  if (piece.quilt || piece.inset) relief(mesh, piece, half);
  else addFan(piece.top ?? piece.material, half, frame.w, ccw !== right);
  if (piece.sheet) return;
  addFan(piece.material, -half, [-frame.w[0], -frame.w[1], -frame.w[2]], ccw === right);
  const out = buffersOf(mesh, piece.material);
  for (let i = 0; i < n; i++) {
    const [a0, b0] = outline[i];
    const [a1, b1] = outline[(i + 1) % n];
    const du = a1 - a0;
    const dv = b1 - b0;
    const sign = ccw ? 1 : -1;
    const nu = dv * sign;
    const nv = -du * sign;
    const l = Math.hypot(nu, nv) || 1;
    const normal: Vec3 = [(frame.u[0] * nu + frame.v[0] * nv) / l, (frame.u[1] * nu + frame.v[1] * nv) / l, (frame.u[2] * nu + frame.v[2] * nv) / l];
    const base = out.positions.length / 3;
    for (const p of [pointOf(frame, a0, b0, -half), pointOf(frame, a1, b1, -half), pointOf(frame, a1, b1, half), pointOf(frame, a0, b0, half)]) {
      out.positions.push(...p);
      out.normals.push(...normal);
      out.uvs.push(0, 0);
    }
    if (right) out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else out.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
}

/** The triangles and lines of a part. */
export function meshOf(pieces: readonly Piece[]): PartMesh {
  const mesh = meshOfFixed(pieces.filter((piece) => !piece.move));
  for (const group of moveGroups(pieces)) {
    const part = meshOfFixed(group.pieces);
    const shift = (positions: number[]) => {
      for (let i = 0; i < positions.length; i += 3) for (let c = 0; c < 3; c++) positions[i + c] -= group.pivot[c];
    };
    for (const buffers of part.faces.values()) shift(buffers.positions);
    shift(part.feature.positions);
    shift(part.weld.positions);
    mesh.moves.push({ name: group.name, id: group.id, pivot: group.pivot, axis: group.axis, mesh: part });
  }
  return mesh;
}

/** The groups a flight can turn: the pieces with a `move`, by name and pivot, in the order they come, each with a node name of its own. */
export function moveGroups(pieces: readonly Piece[]): { name: string; id: string; pivot: Vec3; axis: Vec3; pieces: Piece[] }[] {
  const groups: { name: string; id: string; pivot: Vec3; axis: Vec3; pieces: Piece[]; key: string }[] = [];
  const counts = new Map<string, number>();
  for (const piece of pieces) {
    if (!piece.move) continue;
    const key = `${piece.move.name}@${piece.move.pivot.join(",")}`;
    let group = groups.find((one) => one.key === key);
    if (!group) {
      const n = counts.get(piece.move.name) ?? 0;
      counts.set(piece.move.name, n + 1);
      group = { name: piece.move.name, id: `${piece.move.name}~${n}`, pivot: piece.move.pivot, axis: piece.move.axis, pieces: [], key };
      groups.push(group);
    }
    group.pieces.push(piece);
  }
  return groups.map((group) => ({ name: group.name, id: group.id, pivot: group.pivot, axis: group.axis, pieces: group.pieces }));
}

function meshOfFixed(pieces: readonly Piece[]): PartMesh {
  const mesh: PartMesh = { faces: new Map(), feature: { positions: [], indices: [] }, weld: { positions: [], indices: [] }, moves: [] };
  for (const piece of pieces) {
    if (piece.only === "drawing") continue;
    if (piece.kind === "lathe") {
      latheFaces(mesh, piece);
      for (const y of piece.rings ?? []) addPath(mesh.feature, ringPath(piece, y));
      for (const y of piece.welds ?? []) addPath(mesh.weld, ringPath(piece, y));
    } else if (piece.kind === "plate") {
      plateFaces(mesh, piece);
      if (!piece.plain) {
        const half = piece.thickness / 2 + 0.006;
        for (const c of [half, -half]) addPath(mesh.feature, [...piece.outline, piece.outline[0]].map(([a, b]) => pointOf(piece.frame, a, b, c)));
        for (const [p, q] of piece.ribs ?? []) for (const c of [half, -half]) addPath(mesh.weld, [pointOf(piece.frame, p[0], p[1], c), pointOf(piece.frame, q[0], q[1], c)]);
        if (piece.quilt || piece.inset) reliefLines(mesh, piece, half);
      }
    } else {
      for (const path of piece.paths) addPath(piece.weight === "feature" ? mesh.feature : mesh.weld, path);
    }
  }
  return mesh;
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

/**
 * The box a part's pieces fill, worked from the pieces and not from a mesh, so a part with a very large number of pieces can be measured without building its triangles. A lathe counts as its full circle (its mesh is a polygon inside
 * that circle, so this is never smaller than the mesh's box and at most a percent or two larger).
 */
export function boundsOfPieces(pieces: readonly Piece[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const add = (x: number, y: number, z: number) => {
    if (x < min[0]) min[0] = x;
    if (x > max[0]) max[0] = x;
    if (y < min[1]) min[1] = y;
    if (y > max[1]) max[1] = y;
    if (z < min[2]) min[2] = z;
    if (z > max[2]) max[2] = z;
  };
  for (const piece of pieces) {
    if (piece.only === "drawing") continue;
    if (piece.kind === "plate") {
      const half = piece.thickness / 2;
      for (const [a, b] of piece.outline) for (const c of [-half, half]) add(...pointOf(piece.frame, a, b, c));
    } else if (piece.kind === "lathe") {
      const [cx, cz] = piece.at ?? [0, 0];
      for (const [r, y] of piece.profile) {
        const lx = (piece.lean?.[0] ?? 0) * y;
        const lz = (piece.lean?.[1] ?? 0) * y;
        add(cx + lx - r, y, cz + lz - r);
        add(cx + lx + r, y, cz + lz + r);
      }
    } else for (const path of piece.paths) for (const p of path) add(p[0], p[1], p[2]);
  }
  return { min, max };
}

/** The box a part's triangles fill. */
export function boundsOf(mesh: PartMesh): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  const sweep = (from: PartMesh, offset: Vec3) => {
    for (const b of from.faces.values())
      for (let i = 0; i < b.positions.length; i += 3)
        for (let c = 0; c < 3; c++) {
          const value = b.positions[i + c] + offset[c];
          if (value < min[c]) min[c] = value;
          if (value > max[c]) max[c] = value;
        }
  };
  sweep(mesh, [0, 0, 0]);
  for (const group of mesh.moves) sweep(group.mesh, group.pivot);
  return { min, max };
}
