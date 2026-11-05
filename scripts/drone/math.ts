// Small linear algebra for placing NASA's parts on the drone: a 3 x 3 matrix and a shift, the frame-to-frame fit and the principal axis of a cloud of points. The parts are data from outside; these only move them.
export type V3 = [number, number, number];
/** A point goes to `r` times it plus `t`; `r` is row-major. */
export interface Xf {
  r: number[];
  t: V3;
}

export const IDENTITY: Xf = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

export function apply(x: Xf, p: V3): V3 {
  const r = x.r;
  return [r[0] * p[0] + r[1] * p[1] + r[2] * p[2] + x.t[0], r[3] * p[0] + r[4] * p[1] + r[5] * p[2] + x.t[1], r[6] * p[0] + r[7] * p[1] + r[8] * p[2] + x.t[2]];
}

function inverse3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C || 1;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** A normal goes by the inverse transpose, so a squeezed part is still lit right. */
export function applyNormal(x: Xf, n: V3): V3 {
  const inv = inverse3(x.r);
  return norm([inv[0] * n[0] + inv[3] * n[1] + inv[6] * n[2], inv[1] * n[0] + inv[4] * n[1] + inv[7] * n[2], inv[2] * n[0] + inv[5] * n[1] + inv[8] * n[2]]);
}

/** An orthonormal basis from a first direction and a rough second one. */
export function basis(a: V3, b: V3): [V3, V3, V3] {
  const e1 = norm(a);
  const e2 = norm(sub(b, scale(e1, dot(b, e1))));
  return [e1, e2, cross(e1, e2)];
}

/**
 * The move that takes a part's frame to the drone's: the source point `so` goes to `to`, the source direction `sa` to `da`, and `sb` (roughly) to `db`. `k` scales along the three destination directions.
 */
export function fit(so: V3, sa: V3, sb: V3, to: V3, da: V3, db: V3, k: number | V3): Xf {
  const S = basis(sa, sb);
  const D = basis(da, db);
  const s: V3 = typeof k === "number" ? [k, k, k] : k;
  // r = D diag(s) S^T
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let m = 0; m < 3; m++) r[i * 3 + j] += D[m][i] * s[m] * S[m][j];
  const moved: V3 = [r[0] * so[0] + r[1] * so[1] + r[2] * so[2], r[3] * so[0] + r[4] * so[1] + r[5] * so[2], r[6] * so[0] + r[7] * so[1] + r[8] * so[2]];
  return { r, t: sub(to, moved) };
}

export interface Cloud {
  centre: V3;
  /** The long axis, unit. */
  axis: V3;
  /** The second axis, unit. */
  second: V3;
  /** The extent along each axis, from the centre. */
  lo: number;
  hi: number;
  /** The extent across the long axis, the greatest. */
  width: number;
}

/** The principal axes of a set of points by power iteration on their covariance. */
export function pca(points: readonly V3[]): Cloud {
  const n = points.length || 1;
  const c: V3 = [0, 0, 0];
  for (const p of points) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of points) {
    const d = sub(p, c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i * 3 + j] += (d[i] * d[j]) / n;
  }
  const power = (m: number[], seed: V3): V3 => {
    let v = norm(seed);
    for (let it = 0; it < 60; it++) v = norm([m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]);
    return v;
  };
  const a1 = power(cov, [1, 0.37, 0.21]);
  const l1 = dot(a1, [cov[0] * a1[0] + cov[1] * a1[1] + cov[2] * a1[2], cov[3] * a1[0] + cov[4] * a1[1] + cov[5] * a1[2], cov[6] * a1[0] + cov[7] * a1[1] + cov[8] * a1[2]]);
  const deflated = cov.map((v, i) => v - l1 * a1[Math.floor(i / 3)] * a1[i % 3]);
  const a2 = power(deflated, [0.3, 1, 0.5]);
  let lo = Infinity;
  let hi = -Infinity;
  let width = 0;
  for (const p of points) {
    const d = sub(p, c);
    const t = dot(d, a1);
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
    width = Math.max(width, Math.hypot(...sub(d, scale(a1, t))));
  }
  return { centre: c, axis: a1, second: a2, lo, hi, width };
}
