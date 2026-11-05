// Flat polygons for lettering: the signed area, the grown outline of a letter (a bolder weight), a line with fewer points, and the triangles of a shape with holes. A ring is a flat list of x, y numbers.
// Pure: no three.js and no DOM.

/** A closed ring as a flat list of x, y numbers. */
export type Ring = readonly number[];

/** The triangles of a flat shape: its points as a flat list of x, y, and three indices to the points for each triangle. */
export interface Triangles {
  points: number[];
  indices: number[];
}

/** The signed area of a ring: positive when it runs anticlockwise, with y up. */
export function areaOf(ring: Ring): number {
  let sum = 0;
  const n = ring.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += ring[i * 2] * ring[j * 2 + 1] - ring[j * 2] * ring[i * 2 + 1];
  }
  return sum / 2;
}

/** Whether a point is inside a ring (even-odd). */
export function contains(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  const n = ring.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2];
    const yi = ring[i * 2 + 1];
    const xj = ring[j * 2];
    const yj = ring[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A ring turned to run anticlockwise (`ccw` true) or clockwise. */
export function wound(ring: Ring, ccw: boolean): number[] {
  if (areaOf(ring) > 0 === ccw) return ring.slice();
  const out: number[] = [];
  for (let i = ring.length / 2 - 1; i >= 0; i--) out.push(ring[i * 2], ring[i * 2 + 1]);
  return out;
}

/**
 * A ring grown outwards by `by` (inwards when negative): every corner moves along the bisector of its two edges, a sharp corner no further than three times `by`.
 *
 * @param ring An anticlockwise ring grows outwards for a positive `by`; a clockwise one (a hole) shrinks.
 */
export function grown(ring: Ring, by: number): number[] {
  const n = ring.length / 2;
  const ccw = areaOf(ring) > 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = (i + n - 1) % n;
    const q = (i + 1) % n;
    const ax = ring[i * 2] - ring[p * 2];
    const ay = ring[i * 2 + 1] - ring[p * 2 + 1];
    const bx = ring[q * 2] - ring[i * 2];
    const by2 = ring[q * 2 + 1] - ring[i * 2 + 1];
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by2) || 1;
    // the outward normal of an anticlockwise ring is the edge turned a quarter turn to the right
    const sign = ccw ? 1 : -1;
    const n1x = (ay / la) * sign;
    const n1y = (-ax / la) * sign;
    const n2x = (by2 / lb) * sign;
    const n2y = (-bx / lb) * sign;
    const mx = n1x + n2x;
    const my = n1y + n2y;
    const dot = n1x * n2x + n1y * n2y;
    // the bisector scaled so each edge moves by `by`, a sharp corner held to three times that
    const reach = Math.min(3, Math.sqrt(2 / Math.max(1e-6, 1 + dot)));
    const len = Math.hypot(mx, my) || 1;
    out.push(ring[i * 2] + (mx / len) * by * reach, ring[i * 2 + 1] + (my / len) * by * reach);
  }
  return out;
}

/** A ring with the points that lie within `tolerance` of the line between their neighbours taken out (Douglas-Peucker). */
export function simplified(ring: Ring, tolerance: number): number[] {
  const n = ring.length / 2;
  if (n <= 4 || tolerance <= 0) return ring.slice();
  const keep = new Uint8Array(n);
  // split at the two points furthest apart along x, so the ring becomes two open runs
  let a = 0;
  let b = 0;
  for (let i = 1; i < n; i++) {
    if (ring[i * 2] < ring[a * 2]) a = i;
    if (ring[i * 2] > ring[b * 2]) b = i;
  }
  if (a === b) b = (a + Math.floor(n / 2)) % n;
  keep[a] = 1;
  keep[b] = 1;
  const run = (from: number, to: number) => {
    const stack: [number, number][] = [[from, to]];
    while (stack.length) {
      const [s, e] = stack.pop() as [number, number];
      const count = (e - s + n) % n;
      if (count < 2) continue;
      const x0 = ring[s * 2];
      const y0 = ring[s * 2 + 1];
      const dx = ring[e * 2] - x0;
      const dy = ring[e * 2 + 1] - y0;
      const l = Math.hypot(dx, dy);
      let worst = -1;
      let far = -1;
      for (let k = 1; k < count; k++) {
        const i = (s + k) % n;
        const d = l < 1e-12 ? Math.hypot(ring[i * 2] - x0, ring[i * 2 + 1] - y0) : Math.abs(dy * (ring[i * 2] - x0) - dx * (ring[i * 2 + 1] - y0)) / l;
        if (d > worst) {
          worst = d;
          far = i;
        }
      }
      if (worst > tolerance) {
        keep[far] = 1;
        stack.push([s, far], [far, e]);
      }
    }
  };
  run(a, b);
  run(b, a);
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i * 2], ring[i * 2 + 1]);
  return out.length >= 6 ? out : ring.slice();
}

const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Whether a point is inside a triangle or on its edge. */
function inTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, px: number, py: number): boolean {
  return cross(ax, ay, bx, by, px, py) >= 0 && cross(bx, by, cx, cy, px, py) >= 0 && cross(cx, cy, ax, ay, px, py) >= 0;
}

/** Whether the direction from point `i` of an anticlockwise ring towards (bx, by) runs into the ring's inside: a point where the ring touches itself has several, and only one faces the way a cut needs to go. */
function faces(poly: readonly number[], i: number, bx: number, by: number): boolean {
  const n = poly.length / 2;
  const p = (i + n - 1) % n;
  const q = (i + 1) % n;
  const ax = poly[i * 2];
  const ay = poly[i * 2 + 1];
  const toNext = cross(ax, ay, poly[q * 2], poly[q * 2 + 1], bx, by) >= 0;
  const fromPrev = cross(ax, ay, bx, by, poly[p * 2], poly[p * 2 + 1]) >= 0;
  return cross(poly[p * 2], poly[p * 2 + 1], ax, ay, poly[q * 2], poly[q * 2 + 1]) > 0 ? toNext && fromPrev : toNext || fromPrev;
}

/** Joins each hole to the outline with a cut, giving one ring that touches itself along the cuts. The outline runs anticlockwise and the holes clockwise. */
function joined(outer: number[], holes: number[][]): number[] {
  let poly = outer.slice();
  const order = holes
    .map((hole) => {
      let m = 0;
      for (let i = 1; i < hole.length / 2; i++) if (hole[i * 2] > hole[m * 2] || (hole[i * 2] === hole[m * 2] && hole[i * 2 + 1] < hole[m * 2 + 1])) m = i;
      return { hole, m };
    })
    .sort((p, q) => q.hole[q.m * 2] - p.hole[p.m * 2]);
  for (const { hole, m } of order) {
    const mx = hole[m * 2];
    const my = hole[m * 2 + 1];
    const n = poly.length / 2;
    // the nearest edge the ray from the hole's rightmost point meets
    let best = Infinity;
    let at = -1;
    let ix = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = poly[i * 2];
      const y1 = poly[i * 2 + 1];
      const x2 = poly[j * 2];
      const y2 = poly[j * 2 + 1];
      if ((y1 > my && y2 > my) || (y1 < my && y2 < my) || y1 === y2) continue;
      const x = x1 + ((my - y1) * (x2 - x1)) / (y2 - y1);
      if (x >= mx - 1e-12 && x - mx < best) {
        best = x - mx;
        ix = x;
        at = x1 > x2 ? i : j;
      }
    }
    if (at < 0) continue;
    // a point of the outline inside the triangle (hole point, hit, edge end) blocks the cut: take the one that leaves at the smallest angle
    let pick = at;
    const px = poly[at * 2];
    const py = poly[at * 2 + 1];
    if (!(Math.abs(px - ix) < 1e-12 && Math.abs(py - my) < 1e-12)) {
      let bestTan = Infinity;
      for (let i = 0; i < n; i++) {
        const x = poly[i * 2];
        const y = poly[i * 2 + 1];
        if (x < mx || i === at) continue;
        const tri = my < py ? inTriangle(mx, my, ix, my, px, py, x, y) : inTriangle(ix, my, mx, my, px, py, x, y);
        if (!tri) continue;
        const tan = Math.abs(my - y) / Math.max(1e-12, x - mx);
        if (tan < bestTan || (tan === bestTan && x < poly[pick * 2])) {
          bestTan = tan;
          pick = i;
        }
      }
    }
    // the same place may be on the ring more than once: take the copy whose corner faces the hole
    const copies: number[] = [];
    for (let i = 0; i < n; i++) if (poly[i * 2] === poly[pick * 2] && poly[i * 2 + 1] === poly[pick * 2 + 1]) copies.push(i);
    pick = copies.find((i) => faces(poly, i, mx, my)) ?? pick;
    const next: number[] = [];
    for (let i = 0; i <= pick; i++) next.push(poly[i * 2], poly[i * 2 + 1]);
    const h = hole.length / 2;
    for (let k = 0; k <= h; k++) {
      const i = (m + k) % h;
      next.push(hole[i * 2], hole[i * 2 + 1]);
    }
    next.push(poly[pick * 2], poly[pick * 2 + 1]);
    for (let i = pick + 1; i < n; i++) next.push(poly[i * 2], poly[i * 2 + 1]);
    poly = next;
  }
  return poly;
}

/** The triangles of one ring that may touch itself (a shape with its holes cut in). Ear clipping: a corner is clipped when it turns left and no reflex point stands in its triangle. */
function clipEars(poly: number[]): Triangles {
  const points = poly.slice();
  const indices: number[] = [];
  const live: number[] = Array.from({ length: poly.length / 2 }, (_, i) => i);
  const x = (i: number) => points[i * 2];
  const y = (i: number) => points[i * 2 + 1];
  const EPS = 1e-12;
  let guard = live.length * live.length + 10;
  while (live.length > 3 && guard-- > 0) {
    const n = live.length;
    let clipped = false;
    for (let k = 0; k < n && !clipped; k++) {
      const a = live[(k + n - 1) % n];
      const b = live[k];
      const c = live[(k + 1) % n];
      if (cross(x(a), y(a), x(b), y(b), x(c), y(c)) <= EPS) continue;
      // only a reflex or straight point can stand in an empty corner's triangle: a convex one would bring a reflex one with it
      let blocked = false;
      for (let m = 0; m < n && !blocked; m++) {
        const p = live[m];
        if (p === a || p === b || p === c || (x(p) === x(a) && y(p) === y(a))) continue;
        if (!inTriangle(x(a), y(a), x(b), y(b), x(c), y(c), x(p), y(p))) continue;
        const before = live[(m + n - 1) % n];
        const after = live[(m + 1) % n];
        blocked = cross(x(before), y(before), x(p), y(p), x(after), y(after)) <= EPS;
      }
      if (blocked) continue;
      indices.push(a, b, c);
      live.splice(k, 1);
      clipped = true;
    }
    if (clipped) continue;
    // no ear: drop a point that adds no area, or give up on the rest
    const flat = live.findIndex((b, k) => {
      const a = live[(k + n - 1) % n];
      const c = live[(k + 1) % n];
      return Math.abs(cross(x(a), y(a), x(b), y(b), x(c), y(c))) <= EPS;
    });
    if (flat < 0) break;
    live.splice(flat, 1);
  }
  if (live.length === 3 && cross(x(live[0]), y(live[0]), x(live[1]), y(live[1]), x(live[2]), y(live[2])) > EPS) indices.push(live[0], live[1], live[2]);
  return { points, indices };
}

/**
 * The triangles of a flat shape: an outline and the holes cut out of it. Each triangle runs anticlockwise.
 *
 * @param outer The outline, either way round.
 * @param holes The holes, either way round.
 * @returns Points and the indices of each triangle (three to a triangle).
 */
export function triangulate(outer: Ring, holes: readonly Ring[] = []): Triangles {
  return clipEars(joined(wound(outer, true), holes.map((hole) => wound(hole, false))));
}

/** The area the triangles cover. */
export function coverage(t: Triangles): number {
  let sum = 0;
  for (let i = 0; i < t.indices.length; i += 3) {
    const [a, b, c] = [t.indices[i], t.indices[i + 1], t.indices[i + 2]];
    sum += cross(t.points[a * 2], t.points[a * 2 + 1], t.points[b * 2], t.points[b * 2 + 1], t.points[c * 2], t.points[c * 2 + 1]) / 2;
  }
  return sum;
}
