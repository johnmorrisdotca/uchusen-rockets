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

/** A body of revolution: `profile` is [radius, y] points going up the outside (going the other way faces inward). */
export interface Lathe {
  kind: "lathe";
  material: MaterialName;
  profile: readonly (readonly [number, number])[];
  at?: readonly [number, number];
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
}

/** Lines only, in the part's own space. */
export interface Lines {
  kind: "lines";
  weight: "feature" | "weld";
  paths: readonly (readonly Vec3[])[];
  only?: "mesh" | "drawing";
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

export interface PartMesh {
  faces: Map<MaterialName, Buffers>;
  feature: LineBuffers;
  weld: LineBuffers;
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
        out.positions.push(cx + r * sa, y, cz + r * ca);
        out.normals.push(normal[0] * sa, normal[1], normal[0] * ca);
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
    path.push([cx + r * Math.sin(a), y, cz + r * Math.cos(a)]);
  }
  return path;
}

function plateFaces(mesh: PartMesh, piece: Plate): void {
  const { frame, outline, thickness } = piece;
  const half = thickness / 2;
  const n = outline.length;
  const addFan = (material: MaterialName, c: number, normal: Vec3, reverse: boolean) => {
    const out = buffersOf(mesh, material);
    const base = out.positions.length / 3;
    for (const [a, b] of outline) {
      out.positions.push(...pointOf(frame, a, b, c));
      out.normals.push(...normal);
      out.uvs.push(0, 0);
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
  addFan(piece.top ?? piece.material, half, frame.w, ccw !== right);
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
  const mesh: PartMesh = { faces: new Map(), feature: { positions: [], indices: [] }, weld: { positions: [], indices: [] } };
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

/** The box a part's triangles fill. */
export function boundsOf(mesh: PartMesh): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of mesh.faces.values())
    for (let i = 0; i < b.positions.length; i += 3)
      for (let c = 0; c < 3; c++) {
        if (b.positions[i + c] < min[c]) min[c] = b.positions[i + c];
        if (b.positions[i + c] > max[c]) max[c] = b.positions[i + c];
      }
  return { min, max };
}
