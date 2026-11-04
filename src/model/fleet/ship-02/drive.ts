// The drive raft at the stern: a thrust bulkhead, eight fusion torch nozzles in two rows of four, four vernier clusters at the corners, heat sinks and service gantries. Each nozzle has a throat collar,
// field coils, support ribs, feed lines from the reactor hall, a chamber with magnet drums and a ring of shutter leaves round its lip.
import { PLATE, closeDetail, around, beam, box, cyl, facesOf, hatch, onFace, pipe, plating, revolve, ring, rng, span, stencil, type Piece, vent, hazard, lights, mast, polar } from "./adapter.ts";
import { DRIVE } from "./dims.ts";
import type { Lathe, Vec3 } from "./adapter.ts";

/** A bell's radius at a height above its exit: wide at the lip, narrow at the throat. */
const bellR = (y: number, exit: number, throat: number, length: number) => throat + (exit - throat) * (1 - y / length) ** 0.62;

/** One fusion torch nozzle: its exit plane is at y, it points down the axis (to -y). */
export function nozzle(x: number, z: number, y: number, exit: number, throat: number, length: number, segs = 36): Piece[] {
  const at: [number, number] = [x, z];
  const out: Piece[] = [];
  const profile: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * length;
    profile.push([bellR(t, exit, throat, length), y + t]);
  }
  out.push({ kind: "lathe", material: "bell", at, segs, outline: true, under: true, profile } satisfies Lathe);
  out.push({ kind: "lathe", material: "bell-inside", at, segs, under: true, only: "mesh", profile: profile.map(([r, yy]) => [r * 0.965, yy + 0.02] as const) });
  // the lip, and a ring of cooling manifold under it
  out.push(ring("engine-pale", at, exit * 0.97, exit * 1.06, y, y + exit * 0.06, segs), ring("engine-metal", at, exit * 0.9, exit * 0.99, y + exit * 0.16, y + exit * 0.24, 36, {}));
  // field coils up the bell: copper rings, each with a clamp band
  for (let i = 1; i <= 7; i++) {
    const t = (i / 8) * length * 0.95;
    const rr = bellR(t, exit, throat, length);
    out.push(ring("copper", at, rr + 0.8, rr + 3.2, y + t - 2.2, y + t + 2.2, Math.round(segs * 0.78)), ring("dark", at, rr + 0.4, rr + 0.9, y + t - 3.2, y + t + 3.2, Math.round(segs * 0.78)));
  }
  // support ribs along the bell
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI + Math.PI / 8;
    const [x0, z0] = polar(a, bellR(2, exit, throat, length) + 1.4, at);
    const [x1, z1] = polar(a, bellR(length * 0.9, exit, throat, length) + 1.4, at);
    out.push(beam("engine-metal", [x0, y + 2, z0], [x1, y + length * 0.9, z1], 1.3, 1.9));
  }
  // the throat collar, the injector ring and the chamber above
  const top = y + length;
  out.push(ring("engine-pale", at, throat * 1.1, throat * 2.1, top - 3, top + 2, Math.round(segs * 0.78)), ring("dark", at, throat * 0.8, throat * 2.5, top + 2, top + 5, Math.round(segs * 0.78)));
  out.push(cyl("engine-pale", at, throat * 2.6, top + 5, top + 34, Math.round(segs * 0.78)));
  for (const dy of [9, 18, 27]) out.push(ring("copper", at, throat * 2.6, throat * 2.6 + 3.2, top + dy, top + dy + 4.5, Math.round(segs * 0.78)));
  out.push(ring("engine-metal", at, throat * 2.3, throat * 3.4, top + 34, top + 38, Math.round(segs * 0.78)));
  // four feed lines from the hall above down to the injector ring, and the gimbal actuators
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * 2 * Math.PI + Math.PI / 4;
    const [x0, z0] = polar(a, throat * 3.1, at);
    const [x1, z1] = polar(a, throat * 3.4, at);
    out.push(pipe(k % 2 ? "coolant" : "hull-white", [x0, top + 36, z0], [x1, top + 56, z1], 1.5, 8));
    out.push(pipe("hull-orange", [x1, top + 56, z1], [x1 + (x1 - x) * 0.6, top + 56, z1 + (z1 - z) * 0.6], 1.3, 8));
    const [xa, za] = polar(a + 0.4, throat * 2.6, at);
    out.push(beam("engine-metal", [xa, top + 6, za], [xa * 1.0 + (xa - x) * 1.6, top + 36, za + (za - z) * 1.6], 1.4, 1.4));
  }
  // shutter leaves round the lip, open: twelve, each tilted away from the plume
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 2 * Math.PI;
    const rr = exit * 1.08;
    const f = { o: [x + rr * Math.sin(a), y - 1, z + rr * Math.cos(a)] as Vec3, u: [Math.sin(a), 0, Math.cos(a)] as Vec3, v: [0, 1, 0] as Vec3, w: [Math.cos(a), 0, -Math.sin(a)] as Vec3 };
    out.push({ kind: "plate", material: k % 2 ? "hull-orange" : "hull-grey", frame: f, outline: [[0, 0], [exit * 0.34, -exit * 0.12], [exit * 0.34, exit * 0.04], [0, exit * 0.2]], thickness: exit * 0.2, plain: true, only: "mesh" });
  }
  return out;
}

/** A vernier cluster: three small nozzles on a plate, for steering and docking. */
export function vernier(x: number, z: number, y: number): Piece[] {
  const out: Piece[] = [box("dark", [x, y + 40, z], [30, 26, 24], true)];
  for (const [dx, dz] of [[-8, 0], [8, 0], [0, 8]] as const) out.push(...nozzle(x + dx, z + dz, y, 5.5, 1.9, 34, 18));
  out.push(...hatch(facesOf([x, y + 40, z], [30, 26, 24], ["x+"])[0], 0, 0, 5, 7, "dark", "hull-orange"));
  return out;
}

/** The four vernier clusters at the raft's corners, their own part: the ship's manoeuvring engines. */
export function vernierPieces(): Piece[] {
  const out: Piece[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(...vernier(sx * 160, sz * 52, 0));
  return out;
}

/** The eight main torch nozzles, their own part. */
export function driveEngines(): Piece[] {
  const out: Piece[] = [];
  for (const x of DRIVE.columns) for (const z of DRIVE.rows) out.push(...nozzle(x, z, 0, DRIVE.exit, DRIVE.throat, DRIVE.length));
  return out;
}

export function drivePieces(): Piece[] {
  const r = rng(2003);
  const out: Piece[] = [];
  const topY = DRIVE.length + 4;
  // the raft: blast bulkhead, side walls, the spars between the nozzle columns
  const y0 = 150;
  const y1 = 172;
  out.push(span("dark", -170, 170, y0, y1, -60, 60, true));
  out.push(span("hull-grey", -170, 170, 96, y0, 56, 60, true), span("hull-grey", -170, 170, 96, y0, -60, -56, true), span("hull-grey", -170, -166, 96, y0, -60, 60, true), span("hull-grey", 166, 170, 96, y0, -60, 60, true));
  for (const x of [-140, -70, 0, 70, 140]) out.push(span("engine-metal", x - 3, x + 3, 100, y0, -58, 58, true));
  out.push(span("engine-metal", -168, 168, 120, 126, -3, 3, true));
  // thrust pillars, from the bulkhead down to each nozzle chamber's head, and braces
  for (const x of DRIVE.columns) for (const z of DRIVE.rows) {
    out.push(cyl("dark", [x, z], 17, 140, y0, 24));
    for (const sx of [-1, 1]) out.push(beam("hull-grey", [x + sx * 17, 150, z], [x + sx * 26, 130, z + (z > 0 ? 12 : -12)], 3, 3));
  }
  // faces: plating dorsal and ventral, the stern-facing underside, the sides
  const dims: Vec3 = [340, y1 - 96, 120];
  const faces = facesOf([0, (96 + y1) / 2, 0], dims, ["z+", "z-", "x+", "x-", "y+"]);
  for (const f of faces) {
    out.push(...plating(f, r, PLATE, f.k === 2 ? 10 : 9, f.k === 2 ? 6 : 7, { thick: 0.6, skip: 0.05, fine: 0.9 }));
    out.push(...closeDetail(f, r, { label: f.k === 2 ? (f.s > 0 ? "DORSAL" : "VENTRAL") : f.k === 0 ? (f.s > 0 ? "STBD" : "PORT") : "AFT" }));
  }
  const dorsal = faces[0];
  const ventral = faces[1];
  // heat sinks: louvre banks on top and bottom, dark with a lit edge
  for (const f of [dorsal, ventral]) {
    for (let i = 0; i < 10; i++) {
      const ta = -150 + i * 33.3;
      out.push(onFace("dark", f, ta, 4, 26, 52, 3, 0.6, true));
      for (let s = 0; s < 8; s++) out.push(onFace("engine-metal", f, ta, -18 + s * 6, 24, 1.1, 5, 0.6));
      out.push(onFace("hull-yellow", f, ta, 31, 26, 1.2, 3.4, 0.6));
    }
    out.push(...hazard(f, 0, 38, 300, 2.4, 40));
    out.push(...stencil(f, "DRIVE 02", -90, -30, 5, "hull-white"), ...stencil(f, "HEAT-SINK", 70, -30, 3.6, "hull-yellow"));
  }
  // hatches and vents on the side walls, stencils
  for (const f of [faces[2], faces[3]]) {
    for (const ta of [-30, 0, 30]) out.push(...hatch(f, ta, 4, 5, 7, "dark", "hull-orange"));
    out.push(...vent(f, -42, -6, 9, 7, 5), ...vent(f, 42, -6, 9, 7, 5));
    out.push(...stencil(f, f.s > 0 ? "S" : "P", 0, 26, 6, "hull-white"));
  }
  // service gantry: a catwalk ring at y = 104 and two cranes on the dorsal face
  for (const x of [-140, -70, 0, 70, 140]) out.push(span("hull-yellow", x - 1, x + 1, 104, 105, -62, 62));
  for (const z of [-62, 62]) out.push(span("hull-yellow", -172, 172, 104, 105.2, z - 0.5, z + 0.5), span("dark", -172, 172, 98, 100, z - 1, z + 1));
  for (const sx of [-1, 1]) {
    out.push(span("hull-orange", sx * 120 - 3, sx * 120 + 3, y1, y1 + 30, -3, 3, true), beam("hull-orange", [sx * 120, y1 + 30, 0], [sx * 120 - sx * 50, y1 + 52, 0], 3, 4, true));
    out.push(box("hull-yellow", [sx * 120 - sx * 52, y1 + 52, 0], [4, 4, 4]));
  }
  // aerials and lights on the dorsal rim, a stern docking collar and marker lights down the sides
  out.push(...mast([-160, y1, 56], [-160, y1 + 40, 56]), ...mast([160, y1, -56], [160, y1 + 38, -56]));
  out.push(...lights(dorsal, -160, 52, 160, 52, 14, 1.6, "lamp-red"));
  void topY;
  void around;
  void revolve;
  return out;
}
