// The repair drone's saucer: a layered, bevelled white shell with a red stripe round its rim, a raised and domed top deck, panel seams, hatches, vents, bolts, handrails and its running lights. All plain pieces, drawn by
// this package's code. The frame is the drone's natural one (the rim at y = 0, front towards +Z); the caller lifts it. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { add, block, bolt, boltRing, cross, cyl, fine, mul, panel, pipe, rng, unit, vents } from "./shapes.ts";

type Prof = readonly (readonly [number, number])[];

/** The outside of each tier, from the rim inwards, in [radius, y]. */
export const RIM: Prof = [[0.5, -0.04], [0.512, -0.028], [0.512, 0.024], [0.498, 0.04], [0.48, 0.044]];
export const TIER_MID: Prof = [[0.474, 0.048], [0.47, 0.056], [0.44, 0.092], [0.43, 0.098], [0.405, 0.1]];
export const TIER_TOP: Prof = [[0.4, 0.104], [0.395, 0.112], [0.36, 0.135], [0.3, 0.152], [0.22, 0.165], [0.12, 0.172], [0, 0.175]];

/** The height of a tier's surface at a radius, and its normal in the (radius, y) plane, outward and up. */
function surface(profile: Prof, r: number): { y: number; nr: number; ny: number } {
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    if (r <= Math.max(r0, r1) + 1e-9 && r >= Math.min(r0, r1) - 1e-9) {
      const l = Math.hypot(r1 - r0, y1 - y0) || 1;
      const t = r1 === r0 ? 0 : (r - r0) / (r1 - r0);
      return { y: y0 + (y1 - y0) * t, nr: (y1 - y0) / l, ny: -(r1 - r0) / l };
    }
  }
  return { y: profile[profile.length - 1][1], nr: 0, ny: 1 };
}

/** A frame on a tier's surface at an azimuth (radians from +Z towards +X) and radius: its point, the outward normal and two directions across the surface (circle and slope), so cross(a, b) is the normal. */
export function onTier(profile: Prof, az: number, r: number): { p: Vec3; n: Vec3; a: Vec3; b: Vec3 } {
  const s = surface(profile, r);
  const er: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  const ec: Vec3 = [Math.cos(az), 0, -Math.sin(az)];
  const n = unit(add(mul(er, s.nr), [0, s.ny, 0]));
  let b = unit(cross(n, ec));
  const a = ec;
  if (cross(a, b)[0] * n[0] + cross(a, b)[1] * n[1] + cross(a, b)[2] * n[2] < 0) b = mul(b, -1);
  return { p: add(mul(er, r), [0, s.y, 0]), n, a, b };
}

/** The point on the rim's cylinder at an azimuth and height. */
const onRim = (az: number, y: number, r = 0.512): { p: Vec3; n: Vec3; a: Vec3; b: Vec3 } => {
  const er: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  const ec: Vec3 = [Math.cos(az), 0, -Math.sin(az)];
  return { p: add(mul(er, r), [0, y, 0]), n: er, a: ec, b: [0, 1, 0] };
};

const DEG = Math.PI / 180;
/** Where the front lens and its pods are, so the hatches keep clear of them, and the rear block. */
const clear = (az: number, r: number): boolean => {
  const x = r * Math.sin(az);
  const z = r * Math.cos(az);
  if (z > 0.2 && Math.abs(x) < 0.3) return false;
  if (z < -0.02 && Math.abs(x) < 0.25 && r < 0.4) return false;
  return true;
};

export function shellPieces(): Piece[] {
  const out: Piece[] = [];
  const random = rng(7);
  // the soffit under the rim, the rim, its red stripe, the two raised tiers and the grooves that part them
  out.push({ kind: "lathe", material: "hull-grey-dark", segs: 72, under: true, profile: [[0.34, -0.04], [0.5, -0.04]] });
  out.push({ kind: "lathe", material: "hull-white", segs: 72, body: true, outline: true, profile: RIM });
  out.push({ kind: "lathe", material: "red", segs: 72, profile: [[0.5145, -0.014], [0.5145, 0.014]] });
  out.push({ kind: "lathe", material: "red", segs: 72, profile: [[0.512, 0.014], [0.5145, 0.014]] });
  out.push({ kind: "lathe", material: "red", segs: 72, profile: [[0.5145, -0.014], [0.512, -0.014]] });
  out.push({ kind: "lathe", material: "panel-dark", segs: 72, profile: [[0.4785, 0.044], [0.4785, 0.049], [0.474, 0.049]] });
  out.push({ kind: "lathe", material: "hull-white", segs: 72, body: true, outline: true, profile: TIER_MID });
  out.push({ kind: "lathe", material: "panel-dark", segs: 72, profile: [[0.4045, 0.1], [0.4045, 0.1045], [0.4, 0.1045]] });
  out.push({ kind: "lathe", material: "hull-white", segs: 72, body: true, outline: true, profile: TIER_TOP });
  // a second skin of dark, a thin sunk band, between the mid tier's slope and its top edge
  out.push({ kind: "lathe", material: "panel-dark", segs: 72, profile: [[0.4352, 0.0935], [0.4332, 0.0975]] });
  // the white shell's under-edge, a dark seal where it meets the soffit
  out.push({ kind: "lathe", material: "black", segs: 72, profile: [[0.4965, -0.0405], [0.5, -0.0405], [0.5, -0.04]] });

  // seams: thin dark strips running down the slope of the mid tier and the top tier, and a ring of bolts along each groove
  for (let i = 0; i < 32; i++) {
    const az = (i / 32) * 2 * Math.PI;
    const t = onTier(TIER_MID, az, 0.452);
    out.push(block("panel-dark", add(t.p, mul(t.n, 0.0007)), { u: t.a, v: t.b }, [0.0035, 0.056, 0.0016], 0.001));
  }
  for (let i = 0; i < 20; i++) {
    const az = ((i + 0.5) / 20) * 2 * Math.PI;
    if (!clear(az, 0.3)) continue;
    const t = onTier(TIER_TOP, az, 0.31);
    out.push(block("panel-dark", add(t.p, mul(t.n, 0.0007)), { u: t.a, v: t.b }, [0.003, 0.08, 0.0016], 0.001));
  }
  for (let i = 0; i < 64; i++) {
    const az = (i / 64) * 2 * Math.PI;
    const t = onTier(RIM, az, 0.489);
    out.push(bolt(t.p, t.n, 0.0035, 0.0026, "engine-metal", 6));
    if (clear(az, 0.41)) {
      const u = onTier(TIER_MID, az, 0.414);
      out.push(bolt(add(u.p, mul(u.n, -0.0005)), u.n, 0.0032, 0.0024, "engine-metal", 6));
    }
  }

  // hatches on the top tier in rings, each with a frame, a handle and four bolts, kept clear of what stands on the deck
  const keepOut: [number, number, number][] = [[0, 0.12, 0.065], [0.13, 0.03, 0.05], [-0.13, 0.03, 0.05], [0.205, 0.24, 0.05], [-0.205, 0.24, 0.05]];
  for (const az of [70 * DEG, -70 * DEG, 135 * DEG, -135 * DEG]) for (let k = 0; k <= 6; k++) {
    const a = az + (k / 6 - 0.5) * 0.7;
    const r = az > 100 * DEG || az < -100 * DEG ? 0.3 : 0.27;
    keepOut.push([Math.sin(a) * r, Math.cos(a) * r, 0.04]);
  }
  for (const a of [48 * DEG, -48 * DEG]) keepOut.push([Math.sin(a) * 0.27, Math.cos(a) * 0.27, 0.08]);
  for (const [ri, r] of [0.12, 0.185, 0.25, 0.315].entries()) {
    const n = Math.round((2 * Math.PI * r) / 0.085);
    for (let i = 0; i < n; i++) {
      const az = ((i + (ri % 2) * 0.5) / n) * 2 * Math.PI;
      const x = r * Math.sin(az);
      const z = r * Math.cos(az);
      if (!clear(az, r) || keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
      const roll = random();
      if (roll < 0.2) continue;
      const t = onTier(TIER_TOP, az, r);
      const w = 0.028 + random() * 0.028;
      const h = 0.022 + random() * 0.02;
      const c = add(t.p, mul(t.n, 0.0025));
      out.push(panel("hull-grey", c, { u: t.a, v: t.b }, [w + 0.008, h + 0.008], 0.005));
      out.push(panel("hull-white-worn", add(c, mul(t.n, 0.003)), { u: t.a, v: t.b }, [w, h], 0.004));
      if (roll < 0.7) out.push(block("engine-metal", add(c, mul(t.n, 0.0085)), { u: t.a, v: t.b }, [w * 0.4, 0.004, 0.003], 0.001));
      else out.push(...vents(add(c, add(mul(t.a, -w * 0.3), mul(t.n, 0.0065))), t.a, t.n, 4, w * 0.2, [0.005, h * 0.7], "soot"));
      for (const sa of [-1, 1]) for (const sb of [-1, 1]) out.push(bolt(add(c, add(mul(t.a, sa * (w / 2 + 0.002)), mul(t.b, sb * (h / 2 + 0.002)))), t.n, 0.0026, 0.007, "engine-metal", 6));
    }
  }
  for (let i = 0; i < 14; i++) {
    const az = ((i + 0.5) / 14) * 2 * Math.PI;
    if (!clear(az, 0.45) || Math.abs(Math.sin(az)) > 0.97) continue;
    const t = onTier(TIER_MID, az, 0.452);
    out.push(...vents(add(t.p, mul(t.a, -0.024)), t.a, t.n, 5, 0.012, [0.005, 0.034], "soot"));
  }

  // rim: access hatches, quarter-turn latches and two running lights
  for (let i = 0; i < 16; i++) {
    const az = ((i + 0.5) / 16) * 2 * Math.PI + 0.08;
    const t = onRim(az, 0.005);
    if (Math.abs(Math.sin(az)) > 0.55 && Math.cos(az) > 0.5) continue;
    out.push(panel("hull-white-worn", add(t.p, mul(t.n, 0.0018)), { u: t.a, v: t.b }, [0.09, 0.022], 0.0036));
    out.push(...[-1, 1].map((s) => bolt(add(t.p, add(mul(t.a, s * 0.036), mul(t.n, 0.0036))), t.n, 0.003, 0.003, "engine-metal", 6)));
    out.push(block("hull-grey", add(t.p, add(mul(t.a, 0.0), mul(t.n, 0.0042))), { u: t.a, v: t.b }, [0.014, 0.006, 0.003], 0.001));
  }
  const port = onRim(-90 * DEG, 0.005);
  const star = onRim(90 * DEG, 0.005);
  out.push(cyl("nav-red", port.p, add(port.p, mul(port.n, 0.012)), 0.008, 12));
  out.push(cyl("nav-green", star.p, add(star.p, mul(star.n, 0.012)), 0.008, 12));
  for (const l of [port, star]) out.push(...boltRing(add(l.p, mul(l.n, 0.001)), l.n, 0.0115, 6, 0.0025, 0.003));

  // handrails on the top deck: a bar on two posts, blue, in two arcs, and a short rail beside the rear block
  const rail = (az: number, r: number, span: number): Piece[] => {
    const pts: Vec3[] = [];
    for (let k = 0; k <= 5; k++) {
      const a = az + (k / 5 - 0.5) * span;
      const t = onTier(TIER_TOP, a, r);
      pts.push(add(t.p, mul(t.n, 0.022)));
    }
    const parts: Piece[] = [...pipe("blue", pts, 0.0048, 10)];
    for (const k of [0, 5]) {
      const a = az + (k / 5 - 0.5) * span;
      const t = onTier(TIER_TOP, a, r);
      parts.push(cyl("engine-pale", t.p, add(t.p, mul(t.n, 0.022)), 0.0042, 8));
    }
    return parts;
  };
  out.push(...rail(70 * DEG, 0.27, 0.7), ...rail(-70 * DEG, 0.27, 0.7), ...rail(135 * DEG, 0.3, 0.5), ...rail(-135 * DEG, 0.3, 0.5));
  out.push(...deckDetail());
  return out;
}

/** Louvred grilles, a sensor dome, a ring of lights and conduits on the top deck, and a stencilled hazard strip by each pod. */
function deckDetail(): Piece[] {
  const out: Piece[] = [];
  // two big louvred grilles on the top deck, forward of the antennas
  for (const s of [-1, 1]) {
    const t = onTier(TIER_TOP, s * 28 * DEG + (s > 0 ? 0.35 : -0.35) + 0 , 0.27);
    const c = add(t.p, mul(t.n, 0.003));
    out.push(panel("hull-grey", c, { u: t.a, v: t.b }, [0.1, 0.06], 0.006));
    out.push(panel("black", add(c, mul(t.n, 0.004)), { u: t.a, v: t.b }, [0.085, 0.046], 0.003));
    out.push(...vents(add(c, add(mul(t.b, -0.021), mul(t.n, 0.0055))), t.b, t.n, 8, 0.006, [0.08, 0.0032], "engine-pale", 0.003));
    for (const sa of [-1, 1]) out.push(...[-1, 1].map((sb) => bolt(add(c, add(mul(t.a, sa * 0.047), mul(t.b, sb * 0.027))), t.n, 0.003, 0.008, "engine-metal", 6)));
  }
  // a glass sensor dome on a short drum, centre top, a little forward
  const d = onTier(TIER_TOP, 0, 0.12);
  out.push(cyl("hull-grey", d.p, add(d.p, [0, 0.018, 0]), 0.034, 24));
  out.push(cyl("black", add(d.p, [0, 0.016, 0]), add(d.p, [0, 0.026, 0]), 0.027, 24));
  out.push({ kind: "lathe", material: "glass", segs: 20, profile: [[0.024, d.p[1] + 0.026], [0.0215, d.p[1] + 0.034], [0.0145, d.p[1] + 0.0405], [0.006, d.p[1] + 0.0435], [0, d.p[1] + 0.044]] });
  out.push(...boltRing(add(d.p, [0, 0.014, 0]), [0, 1, 0], 0.031, 8, 0.003, 0.006));
  // a ring of small lights on the mid tier's top edge
  for (let i = 0; i < 12; i++) {
    const az = ((i + 0.5) / 12) * 2 * Math.PI;
    if (!clear(az, 0.43)) continue;
    const t = onTier(TIER_MID, az, 0.428);
    out.push(cyl(i % 4 === 0 ? "lamp-amber" : "lamp-blue", add(t.p, mul(t.n, -0.001)), add(t.p, mul(t.n, 0.006)), 0.0042, 8));
  }
  // conduits from each antenna's foot to the rear block
  for (const s of [-1, 1]) {
    const a = onTier(TIER_TOP, 0, 0.1);
    void a;
    const from: Vec3 = [s * 0.13, 0.172, 0.03];
    const route: Vec3[] = [from, [s * 0.15, 0.167, -0.03], [s * 0.17, 0.158, -0.1], [s * 0.18, 0.15, -0.16]];
    out.push(...pipe("pipe-steel", route.map((p) => add(p, [0, 0.01, 0])), 0.0045, 10));
    for (const p of route.slice(1)) out.push(block("hull-grey", add(p, [0, 0.004, 0]), { u: [1, 0, 0], v: [0, 0, 1] }, [0.016, 0.008, 0.006], 0.0016));
  }
  // hazard strips on the shell beside each pod
  for (const s of [-1, 1]) {
    const t = onTier(TIER_MID, s * 52 * DEG, 0.45);
    for (let i = 0; i < 5; i++) out.push(fine(block(i % 2 ? "black" : "hazard", add(add(t.p, mul(t.a, (i - 2) * 0.013)), mul(t.n, 0.0012)), { u: t.a, v: t.b }, [0.0075, 0.05, 0.0018], 0.0006)));
  }
  return out;
}
