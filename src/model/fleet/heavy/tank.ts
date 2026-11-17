// The heavy propellant tank: a drum with domed ends, banded insulation, cradle rings, a feed manifold, vent stacks on the domes, valve houses, access hatches and service lettering; and, for a cutaway, the propellant, baffle rings and pumps inside. It is
// the tank ISV Kaminari (SPX-207) carries, 80 m across and 440 m long, drawn from its radius and length in metres. Every fitting is the reference one (the 40 m radius tank's) times `radius / 40`; every station along the barrel is the reference station
// moved in proportion to the barrel between the domes, and the counts of rings, hatches and valve houses follow the barrel, so a longer tank has more of them and a wider one has bigger ones. At the reference size every number is Kaminari's. Pure.
import { beam, box, cyl, onFace, onHull, pipe, polar, revolve, ring, rng, stencil, type Face, type Piece, type Vec3 } from "../solids.ts";

/** The tank the numbers below were drawn for, in metres. */
export const TANK_REF = { radius: 40, length: 440 } as const;

/** What a heavy tank may be, in metres: radius 8 to 60, length 4 radii to 600. */
export const TANK_LIMITS = { radius: [8, 60], length: [4, 600] } as const;

/** Throws a RangeError naming the limit when a tank is outside what the part can be. */
export function checkTank(radius: number, length: number): void {
  if (!(radius >= TANK_LIMITS.radius[0] && radius <= TANK_LIMITS.radius[1])) throw new RangeError(`A heavy tank is ${TANK_LIMITS.radius[0]} to ${TANK_LIMITS.radius[1]} m in radius, not ${radius}.`);
  if (!(length >= 4 * radius && length <= TANK_LIMITS.length[1])) throw new RangeError(`A heavy tank is 4 radii (${4 * radius} m here) to ${TANK_LIMITS.length[1]} m long, not ${length}.`);
}

/** Where the tank is braced: the distance from its axis to the spine it is tied to, and the spine's half width. */
export interface TankBrace {
  distance: number;
  half: number;
}

/** What a tank is made from, besides its size. */
export interface TankOptions {
  /** The angle from +z towards +x that points at the spine: the feed manifold and the cradle braces face it. */
  toward?: number;
  /** The seed of the generator. */
  seed?: number;
  /** The tank's number, in lettering on its outboard flat. */
  label?: string;
  /** Which way the lettered flat faces: +1 for +z, -1 for -z. */
  sz?: 1 | -1;
  /** The spine the cradle rings are braced to. Left out: no braces. */
  brace?: TankBrace;
}

/** The numbers every part of the tank is placed from. */
function frame(radius: number, length: number) {
  const s = radius / TANK_REF.radius;
  const dome = radius / 2;
  const bodyFrom = dome;
  const bodyTo = length - dome;
  const barrel = (bodyTo - bodyFrom) / 400;
  /** A station of the reference tank (its barrel runs 20 to 420) on this one. */
  const Y = (y: number): number => bodyFrom + (y - 20) * barrel;
  /** `n` stations from `a` to `b` of the reference tank, the count following the barrel, on this one. */
  const along = (ref: number, a: number, b: number): number[] => {
    const n = Math.max(2, Math.round(ref * barrel));
    return Array.from({ length: n }, (_, i) => Y(a + (i * (b - a)) / (n - 1)));
  };
  return { s, k: (v: number): number => v * s, dome, bodyFrom, bodyTo, barrel, Y, along };
}

/** The outline of a tank from its tail dome up to its forward dome. */
function outline(radius: number, length: number, dome: number, bodyTo: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    pts.push([radius * Math.sin(t), dome - dome * Math.cos(t)]);
  }
  pts[0] = [0.001, 0];
  pts.push([radius, bodyTo]);
  for (let i = 1; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    pts.push([radius * Math.cos(t), bodyTo + dome * Math.sin(t)]);
  }
  pts[pts.length - 1] = [0.001, length];
  return pts;
}

/** A tank standing on the origin: its axis up Y from its tail at y = 0 to its nose at y = `length`. */
export function tankPieces(size: { radius: number; length: number }, o: TankOptions = {}): Piece[] {
  checkTank(size.radius, size.length);
  const R = size.radius;
  const H = size.length;
  const { k, bodyFrom, bodyTo, barrel, Y, along } = frame(R, H);
  const toward = o.toward ?? 0;
  const sz = o.sz ?? 1;
  const r = rng(o.seed ?? 1);
  const out: Piece[] = [];
  out.push(revolve("hull-grey", [0, 0], outline(R, H, bodyFrom, bodyTo), 40, { outline: true, only: undefined, rings: [bodyFrom, bodyTo], welds: [Y(140), Y(300)] }));
  // the wall as real separate shells, outside to inside: skin, insulation, micrometeoroid shell, structural shell and liner, each its own ring with a hair's gap
  {
    let rr = R;
    for (const [m, t] of [["hull-white", 0.02], ["blanket", 0.3], ["hull-grey", 0.5], ["hull-grey", 1.4], ["engine-pale", 0.1]] as const) {
      out.push(ring(m, [0, 0], rr - t, rr - 0.02, bodyFrom, bodyTo, 40));
      rr -= t + 0.06;
    }
  }
  // insulation blankets: bands of cream and orange panels part of the way round, in three tiers
  const tiers: [number, number, "blanket" | "hull-white" | "hull-orange"][] = [[30, 130, "hull-white"], [130, 170, "hull-orange"], [170, 290, "hull-white"], [290, 330, "hull-orange"], [330, 410, "hull-white"]];
  for (const [y0, y1, m] of tiers) for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 2 * Math.PI;
    if (Math.abs(((a - toward + Math.PI * 3) % (2 * Math.PI)) - Math.PI) < 0.45) continue;
    out.push(onHull(m, [0, 0], a, R, (Y(y0) + Y(y1)) / 2, k(12.2), Y(y1) - Y(y0) - k(0.8), k(0.5) + k(0.25) * r.next()));
  }
  // cradle rings, each braced to the spine by four struts when there is a spine
  const brace = o.brace;
  const sp = brace ? polar(toward, brace.distance) : [0, 0];
  for (const y of along(4, 50, 380)) {
    out.push(ring("engine-metal", [0, 0], R + k(0.4), R + k(3.6), y - k(3), y + k(3), 40, { outline: true, only: undefined }));
    for (let i = 0; i < 6; i++) {
      const a = toward + (i - 2.5) * 0.28;
      const [x0, z0] = polar(a, R + k(3));
      out.push(box("dark", [x0, y, z0], [k(4), k(7), k(4)]));
    }
    if (!brace) continue;
    for (const dz of [-1, 1]) for (const dx of [-1, 1]) {
      const a = toward + dz * 0.5;
      const [x0, z0] = polar(a, R + k(3));
      const t = polar(toward, 1);
      const c: Vec3 = [sp[0] + dx * brace.half * 0.85 * t[1] + dz * brace.half * 0.85 * t[0], y, sp[1] - dx * brace.half * 0.85 * t[0] + dz * brace.half * 0.85 * t[1]];
      out.push(beam("hull-grey", [x0, y, z0], c, k(3.4), k(3.4), false));
    }
  }
  // the feed manifold facing the spine: a trunk and two lines, with valve houses and clamps
  const [mx, mz] = polar(toward, R + k(2.6));
  out.push(pipe("coolant", [mx, k(16), mz], [mx, H - k(16), mz], k(1.9), 10));
  for (const d of [-1, 1]) {
    const [x1, z1] = polar(toward + d * 0.09, R + k(2.2));
    out.push(pipe(d > 0 ? "hull-white" : "hull-orange", [x1, k(16), z1], [x1, H - k(16), z1], k(1.2), 8));
  }
  for (const y of along(13, 30, 390)) {
    out.push(onHull("dark", [0, 0], toward, R + k(1.8), y, k(6), k(5), k(3.2)), onHull("hull-yellow", [0, 0], toward, R + k(4.2), y, k(3), k(2), k(1.2)));
    out.push(onHull("black", [0, 0], toward + 0.09, R + k(1.2), y + k(7), k(3.4), k(1.6), k(1)), onHull("black", [0, 0], toward - 0.09, R + k(1.2), y + k(7), k(3.4), k(1.6), k(1)));
  }
  // vent stacks, relief valves and sensor domes on both domes
  for (const [y, d] of [[H - k(6), 1], [k(6), -1]] as const) {
    for (let i = 0; i < 4; i++) {
      const [x, z] = polar((i / 4) * 2 * Math.PI + 0.4, k(12));
      out.push(pipe("engine-pale", [x, y, z], [x, y + d * k(11), z], k(1.6), 8), pipe("dark", [x, y + d * k(11), z], [x, y + d * k(13), z], k(2.2), 8));
    }
    out.push(cyl("dark", [0, 0], k(5), y, y + d * k(8), 16), cyl("engine-pale", [0, 0], k(3), y + d * k(8), y + d * k(14), 12));
  }
  // access hatches round the barrel and hazard bands at the tiers' joints, markings
  for (const [i, y0] of along(12, 50, 380).entries()) {
    const a = toward + Math.PI + (r.next() - 0.5) * 2.6;
    const y = y0 + r.next() * 8 * barrel;
    out.push(onHull("dark", [0, 0], a, R - k(0.1), y, k(6.4), k(8.4), k(0.9)), onHull(i % 3 === 0 ? "hull-yellow" : "hull-orange", [0, 0], a, R + k(0.8), y, k(5), k(7), k(0.5)), onHull("dark", [0, 0], a, R + k(1.3), y, k(0.5), k(4), k(0.5)));
  }
  for (const y of [130, 170, 290, 330].map(Y)) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * Math.PI;
      if (i % 2 === 0) out.push(onHull("hull-yellow", [0, 0], a, R + k(0.3), y, k(6.4), k(3), k(0.4)), onHull("black", [0, 0], a + 0.0, R + k(0.3), y, k(0.1), k(0.1), k(0.1)));
      else out.push(onHull("black", [0, 0], a, R + k(0.3), y, k(6.4), k(3), k(0.4)));
    }
  }
  // lettering on the outboard flat: the tank's number big, its service tag small, and a gauge of level marks beside them
  const ang = sz > 0 ? 0 : Math.PI;
  for (const y of [110, 310].map(Y)) {
    const f: Face = { c: [R * Math.sin(ang), y, R * Math.cos(ang) + sz * k(0.8)], k: 2, s: sz, a: k(11), b: k(14) };
    out.push(onFace("dark", f, 0, 0, k(24), k(30), k(1.6), 0, false), ...stencil(f, o.label ?? "T1", 0, k(5), k(9), "hull-white", k(1.7)), ...stencil(f, "PROP", 0, -k(9), k(3.6), "hull-yellow", k(1.7)));
    for (let i = 0; i < 6; i++) out.push(onFace("hull-white", f, -k(9), -k(12) + i * k(4.4), i % 2 ? k(2.6) : k(4.4), k(0.5), k(0.4), k(1.7)));
  }
  return out;
}

/**
 * The propellant and the works inside a tank standing at `at` (x, z) on the ship's frame: filled to 90 per cent, with anti-slosh rings, a central standpipe, the pump deck and the baffles. `r` is the generator the boxes of a ship share.
 */
export function tankInsidePieces(size: { radius: number; length: number }, at: readonly [number, number], r: ReturnType<typeof rng>): Piece[] {
  checkTank(size.radius, size.length);
  const R = size.radius;
  const H = size.length;
  const { k, Y, along, barrel } = frame(R, H);
  const out: Piece[] = [];
  out.push(revolve("fuel", at, [[0.001, k(6)], [R - k(1.4), k(6)], [R - k(1.4), Y(366)], [0.001, Y(366)]], 36));
  for (const y of along(11, 30, 390)) out.push(ring("engine-metal", at, R - k(7), R - k(1.2), y, y + k(1.6), 36));
  out.push(pipe("coolant", [at[0], k(6), at[1]], [at[0], H - k(16), at[1]], k(2.6), 12));
  for (let i = 0; i < 4; i++) {
    const [x, z] = polar((i / 4) * 2 * Math.PI, k(8), at);
    out.push(cyl("dark", [x, z], k(2.8), k(6), k(20), 12), beam("hull-grey", [x, k(20), z], [at[0], k(40), at[1]], k(1), k(1)));
  }
  for (const y of along(6, 60, 360)) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 2 * Math.PI + r.next();
    const [x, z] = polar(a, R - k(3), at);
    out.push(box("engine-pale", [x, y, z], [k(1.2), k(14) * barrel, k(1.2)]));
  }
  return out;
}
