// Finds the point already seen near a new one, for welding the vertices of a mesh. Rounding each coordinate to a grid splits two points that sit either side of a rounding edge however close they are; this looks in the cells around a point as well, so any two points within the tolerance on every axis are one. Pure.

/** Points kept in a grid of cells one tolerance wide. */
export class PointIndex {
  private readonly tolerance: number;
  private readonly origin: readonly [number, number, number];
  private readonly cells = new Map<number, number[]>();
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];
  private readonly zs: number[] = [];

  /**
   * @param tolerance The most two points may differ by on each axis and still be one point.
   * @param origin A corner no point is below, so the cells count up from zero.
   */
  constructor(tolerance: number, origin: readonly [number, number, number]) {
    if (!(tolerance > 0)) throw new Error("PointIndex needs a tolerance above zero");
    this.tolerance = tolerance;
    this.origin = origin;
  }

  /** How many points were added. */
  get size(): number {
    return this.xs.length;
  }

  /** The cell a coordinate falls in, with one cell of margin below so a neighbour's cell is never negative. */
  private cell(value: number, axis: number): number {
    return Math.floor((value - (this.origin[axis] as number)) / this.tolerance) + 1;
  }

  /** One number for a cell, exact while the cells count to under 131,072 along an axis. Past that two cells may share a number, which only adds candidates, as `find` checks every one's distance. */
  private key(cx: number, cy: number, cz: number): number {
    return (cx * 262_144 + cy) * 262_144 + cz;
  }

  /**
   * The first point added within the tolerance of this one on every axis that `accept` also takes, or undefined where there is none.
   * @param accept A further test on a candidate's number, for what is not a position (a normal, a picture coordinate).
   */
  find(x: number, y: number, z: number, accept: (id: number) => boolean = () => true): number | undefined {
    const [cx, cy, cz] = [this.cell(x, 0), this.cell(y, 1), this.cell(z, 2)];
    let best: number | undefined;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const id of this.cells.get(this.key(cx + dx, cy + dy, cz + dz)) ?? [])
            if (
              (best === undefined || id < best) &&
              Math.abs((this.xs[id] as number) - x) <= this.tolerance &&
              Math.abs((this.ys[id] as number) - y) <= this.tolerance &&
              Math.abs((this.zs[id] as number) - z) <= this.tolerance &&
              accept(id)
            )
              best = id;
    return best;
  }

  /** Adds a point and returns its number, counting up from zero. */
  add(x: number, y: number, z: number): number {
    const id = this.xs.length;
    this.xs.push(x);
    this.ys.push(y);
    this.zs.push(z);
    const key = this.key(this.cell(x, 0), this.cell(y, 1), this.cell(z, 2));
    const list = this.cells.get(key);
    if (list) list.push(id);
    else this.cells.set(key, [id]);
    return id;
  }
}
