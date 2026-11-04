// The four fuel tanks: 80 m across and 440 m long, domed at both ends, in the corners of the cross round the spine. Banded insulation, cradle rings braced to the spine, a feed manifold facing the
// spine, vent stacks on the domes, valve houses, access hatches and service lettering. The inside of all four (the propellant, baffles and pumps) is a separate part so a cutaway can open them.
import { beam, box, cyl, onFace, onHull, pipe, polar, revolve, ring, rng, stencil, type Face, type Piece, type Vec3 } from "./adapter.ts";
import { SPINE, TANK } from "./dims.ts";

const R = TANK.radius;
const H = 440;

/** The outline of a tank from its tail dome up to its forward dome. */
const outline = (r: number, h: number): [number, number][] => {
  const pts: [number, number][] = [];
  const dome = TANK.bodyFrom;
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    pts.push([r * Math.sin(t), dome - dome * Math.cos(t) * (r / R)]);
  }
  pts[0] = [0.001, 0];
  pts.push([r, TANK.bodyTo]);
  for (let i = 1; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    pts.push([r * Math.cos(t), TANK.bodyTo + dome * Math.sin(t) * (r / R)]);
  }
  pts[pts.length - 1] = [0.001, h];
  return pts;
};

/** A tank standing at the origin of its own frame; `toward` is the angle from +z towards +x that points at the spine. */
export function tank(toward: number, seed: number, label: string, sz: 1 | -1): Piece[] {
  const r = rng(seed);
  const out: Piece[] = [];
  out.push(revolve("hull-grey", [0, 0], outline(R, H), 40, { outline: true, only: undefined, rings: [20, 420], welds: [140, 300] }));
  // the wall as real separate shells, outside to inside (src/model/fleet/ship-02/specs.ts, HULL_STACK_TANK): skin, insulation, micrometeoroid shell, structural shell and liner, each its own ring with a hair's gap
  {
    let rr = R;
    for (const [m, t] of [["hull-white", 0.02], ["blanket", 0.3], ["hull-grey", 0.5], ["hull-grey", 1.4], ["engine-pale", 0.1]] as const) {
      out.push(ring(m, [0, 0], rr - t, rr - 0.02, TANK.bodyFrom, TANK.bodyTo, 40));
      rr -= t + 0.06;
    }
  }
  // insulation blankets: bands of cream and orange panels part of the way round, in three tiers
  const tiers: [number, number, "blanket" | "hull-white" | "hull-orange"][] = [[30, 130, "hull-white"], [130, 170, "hull-orange"], [170, 290, "hull-white"], [290, 330, "hull-orange"], [330, 410, "hull-white"]];
  for (const [y0, y1, m] of tiers) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 2 * Math.PI;
    if (Math.abs(((a - toward + Math.PI * 3) % (2 * Math.PI)) - Math.PI) < 0.45) continue;
    out.push(onHull(m, [0, 0], a, R, (y0 + y1) / 2, 12.2, y1 - y0 - 0.8, 0.5 + 0.25 * r.next()));
  }
  // cradle rings, each braced to the spine by four struts
  const sp = polar(toward, Math.hypot(TANK.offset, TANK.offset));
  for (const y of [50, 160, 270, 380]) {
    out.push(ring("engine-metal", [0, 0], R + 0.4, R + 3.6, y - 3, y + 3, 40, { outline: true, only: undefined }));
    for (let k = 0; k < 6; k++) {
      const a = toward + (k - 2.5) * 0.28;
      const [x0, z0] = polar(a, R + 3);
      out.push(box("dark", [x0, y, z0], [4, 7, 4]));
    }
    for (const dz of [-1, 1]) for (const dx of [-1, 1]) {
      const a = toward + dz * 0.5;
      const [x0, z0] = polar(a, R + 3);
      const t = polar(toward, 1);
      const c: Vec3 = [sp[0] + dx * SPINE.half * 0.85 * t[1] + dz * SPINE.half * 0.85 * t[0], y, sp[1] - dx * SPINE.half * 0.85 * t[0] + dz * SPINE.half * 0.85 * t[1]];
      out.push(beam("hull-grey", [x0, y, z0], c, 3.4, 3.4, false));
    }
  }
  // the feed manifold facing the spine: a trunk and two lines, with valve houses and clamps
  const [mx, mz] = polar(toward, R + 2.6);
  out.push(pipe("coolant", [mx, 16, mz], [mx, 424, mz], 1.9, 10));
  for (const d of [-1, 1]) {
    const [x1, z1] = polar(toward + d * 0.09, R + 2.2);
    out.push(pipe(d > 0 ? "hull-white" : "hull-orange", [x1, 16, z1], [x1, 424, z1], 1.2, 8));
  }
  for (let y = 30; y < 420; y += 30) {
    out.push(onHull("dark", [0, 0], toward, R + 1.8, y, 6, 5, 3.2), onHull("hull-yellow", [0, 0], toward, R + 4.2, y, 3, 2, 1.2));
    out.push(onHull("black", [0, 0], toward + 0.09, R + 1.2, y + 7, 3.4, 1.6, 1), onHull("black", [0, 0], toward - 0.09, R + 1.2, y + 7, 3.4, 1.6, 1));
  }
  // vent stacks, relief valves and sensor domes on both domes
  for (const [y, d] of [[H - 6, 1], [6, -1]] as const) {
    for (let k = 0; k < 4; k++) {
      const [x, z] = polar((k / 4) * 2 * Math.PI + 0.4, 12);
      out.push(pipe("engine-pale", [x, y, z], [x, y + d * 11, z], 1.6, 8), pipe("dark", [x, y + d * 11, z], [x, y + d * 13, z], 2.2, 8));
    }
    out.push(cyl("dark", [0, 0], 5, y, y + d * 8, 16), cyl("engine-pale", [0, 0], 3, y + d * 8, y + d * 14, 12));
  }
  // access hatches round the barrel and hazard bands at the tiers' joints, markings
  for (let i = 0; i < 12; i++) {
    const a = toward + Math.PI + (r.next() - 0.5) * 2.6;
    const y = 50 + i * 30 + r.next() * 8;
    out.push(onHull("dark", [0, 0], a, R - 0.1, y, 6.4, 8.4, 0.9), onHull(i % 3 === 0 ? "hull-yellow" : "hull-orange", [0, 0], a, R + 0.8, y, 5, 7, 0.5), onHull("dark", [0, 0], a, R + 1.3, y, 0.5, 4, 0.5));
  }
  for (const y of [130, 170, 290, 330]) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * 2 * Math.PI;
      if (k % 2 === 0) out.push(onHull("hull-yellow", [0, 0], a, R + 0.3, y, 6.4, 3, 0.4), onHull("black", [0, 0], a + 0.0, R + 0.3, y, 0.1, 0.1, 0.1));
      else out.push(onHull("black", [0, 0], a, R + 0.3, y, 6.4, 3, 0.4));
    }
  }
  // lettering on the outboard flat: the tank's number big, its service tag small, and a gauge of level marks beside them
  const ang = sz > 0 ? 0 : Math.PI;
  for (const y of [110, 310]) {
    const f: Face = { c: [R * Math.sin(ang), y, R * Math.cos(ang) + sz * 0.8], k: 2, s: sz as 1 | -1, a: 11, b: 14 };
    out.push(onFace("dark", f, 0, 0, 24, 30, 1.6, 0, false), ...stencil(f, label, 0, 5, 9, "hull-white", 1.7), ...stencil(f, "PROP", 0, -9, 3.6, "hull-yellow", 1.7));
    for (let i = 0; i < 6; i++) out.push(onFace("hull-white", f, -9, -12 + i * 4.4, i % 2 ? 2.6 : 4.4, 0.5, 0.4, 1.7));
  }
  return out;
}

/** The propellant and the works inside all four tanks, in the frame of the whole cross: filled to 90%, with anti-slosh rings, a central standpipe and the pump deck. */
export function tankInside(): Piece[] {
  const out: Piece[] = [];
  const r = rng(2005);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const at: [number, number] = [sx * TANK.offset, sz * TANK.offset];
    out.push(revolve("fuel", at, [[0.001, 6], [R - 1.4, 6], [R - 1.4, 366], [0.001, 366]], 36));
    for (let y = 30; y < 420; y += 36) out.push(ring("engine-metal", at, R - 7, R - 1.2, y, y + 1.6, 36));
    out.push(pipe("coolant", [at[0], 6, at[1]], [at[0], 424, at[1]], 2.6, 12));
    for (let k = 0; k < 4; k++) {
      const [x, z] = polar((k / 4) * 2 * Math.PI, 8, at);
      out.push(cyl("dark", [x, z], 2.8, 6, 20, 12), beam("hull-grey", [x, 20, z], [at[0], 40, at[1]], 1, 1));
    }
    for (let y = 60; y < 420; y += 60) for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 2 * Math.PI + r.next();
      const [x, z] = polar(a, R - 3, at);
      out.push(box("engine-pale", [x, y, z], [1.2, 14, 1.2]));
    }
  }
  return out;
}
