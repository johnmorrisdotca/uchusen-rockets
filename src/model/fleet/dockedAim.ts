// A docked craft whose nose does not lie along the keel. The package's craft are built nose-up; this turns that mesh so the nose points along `dir` and the nose meets the collar. The keel-aligned ports stay as lathes. Pure: no three.js and no DOM.
import type { MaterialName } from "../materials.ts";
import { meshOf, type Piece, type Vec3 } from "../pieces.ts";

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A map that sends local +Y onto `dir`. */
function spinAboutY(dir: Vec3): (p: Vec3) => Vec3 {
  const d = unit(dir);
  if (d[1] > 0.999) return (p) => [p[0], p[1], p[2]];
  if (d[1] < -0.999) return (p) => [p[0], -p[1], -p[2]];
  const kl = Math.hypot(d[2], d[0]) || 1;
  const k: Vec3 = [d[2] / kl, 0, -d[0] / kl];
  const c = d[1];
  const s = Math.sqrt(Math.max(0, 1 - c * c));
  const oc = 1 - c;
  return (p) => {
    const along = dot(k, p);
    const cx = cross(k, p);
    return [p[0] * c + cx[0] * s + k[0] * along * oc, p[1] * c + cx[1] * s + k[1] * along * oc, p[2] * c + cx[2] * s + k[2] * along * oc];
  };
}

/**
 * The craft turned so its nose, `nose` metres up its own axis, points along `dir` and sits on `at`. The body hangs back from the nose, away from the collar.
 *
 * @param pieces The craft, nose-up, in its own metres.
 * @param nose Local Y of the face that meets the collar.
 * @param at The collar face, in ship metres.
 * @param dir The way the nose points.
 */
export function aimCraft(pieces: readonly Piece[], nose: number, at: readonly [number, number, number], dir: readonly [number, number, number]): Piece[] {
  const spin = spinAboutY(dir as Vec3);
  const noseAt = spin([0, nose, 0]);
  const shift: Vec3 = [at[0] - noseAt[0], at[1] - noseAt[1], at[2] - noseAt[2]];
  const mesh = meshOf(pieces);
  const out: Piece[] = [];
  for (const [material, buffers] of mesh.faces) {
    const facets: [Vec3, Vec3, Vec3][] = [];
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    const put = (index: number): Vec3 => {
      const i = index * 3;
      const spun = spin([buffers.positions[i], buffers.positions[i + 1], buffers.positions[i + 2]]);
      const p: Vec3 = [spun[0] + shift[0], spun[1] + shift[1], spun[2] + shift[2]];
      for (let c = 0; c < 3; c++) {
        if (p[c] < min[c]) min[c] = p[c];
        if (p[c] > max[c]) max[c] = p[c];
      }
      return p;
    };
    for (let t = 0; t + 2 < buffers.indices.length; t += 3) facets.push([put(buffers.indices[t]), put(buffers.indices[t + 1]), put(buffers.indices[t + 2])]);
    if (facets.length === 0 || !Number.isFinite(min[0])) continue;
    const centre: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const hx = (max[0] - min[0]) / 2;
    const hy = (max[1] - min[1]) / 2;
    const hz = (max[2] - min[2]) / 2;
    const rel = facets.map(([a, b, c]) => [sub(a, centre), sub(b, centre), sub(c, centre)] as [Vec3, Vec3, Vec3]);
    out.push({ kind: "plate", material: material as MaterialName, plain: true, only: "mesh", frame: { o: centre, u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]], thickness: Math.max(hz * 2, 0.02), facets: rel });
  }
  return out;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
