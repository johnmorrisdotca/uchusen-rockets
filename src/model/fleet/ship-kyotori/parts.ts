// ISV Kyotori's building blocks, for the three silhouette concepts of Explorer A (the Raceme): an in-line drive of stacked coil rings, whorls of tanks round an open truss stem, a payload barrel with Space Shuttle-style clamshell doors, a spinning four-arm ring
// with a pod at the end of each arm, a glass elevator along the outside, a docking arm, and a JWST-style segmented mirror on a boom with a sunshield. Every repeated part is one template stamped at many poses. Concepts only. Pure: no three.js and no DOM.
import { BUILDERS, box, collar, cub, hoop, ibeam, KIT, place, prism, rod, roundStrut, stamp, type KitModule, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { stackOf } from "../ship-01/hull.ts";
import { liftTube } from "../ship-01/wheelparts.ts";
import { gAt, rpmFor } from "../ship-01/spin.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;

/** The stem is the kit's L-class open truss, 12.7 m across; the pieces stand on y from `y0`. */
export const STEM_R = 6.35;
export const truss = (y0: number, length: number): Piece[] => stackOf(Array.from({ length: Math.ceil(length / 24) }, () => "truss-l-24"), y0, 0.3).pieces;
export const mod = (id: string | KitModule, y: number, detail = 0.4): Piece[] => place((typeof id === "string" ? KIT[id] : id).pieces({ detail }), { at: [0, y, 0] });

/** The in-line drive, 60 m: a reactor chamber, a throat and twelve coil rings flaring out to the tail, each ring a field coil, on six long struts and a thrust ring. No bell: the field is the nozzle. */
export function inlineDrive(y0 = 0, flare = 15): Piece[] {
  const out: Piece[] = [];
  out.push({ kind: "lathe", material: "hull-white", segs: 36, body: true, outline: true, profile: [[7, y0 + 38], [7, y0 + 60]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", segs: 36, only: "mesh", profile: [[3.2, y0 + 20], [5.2, y0 + 30], [7, y0 + 38]] } as Lathe);
  const ringAt = (i: number): [number, number] => [y0 + 3 + i * 3.1, flare - (i * (flare - 6)) / 11];
  for (let i = 0; i < 12; i++) {
    const [y, r] = ringAt(i);
    out.push(hoop(i < 3 ? "coil-lit" : "coil", r, y, 0.75, 56, 10), hoop("hull-grey-dark", r + 0.9, y, 0.18, 56, 6));
  }
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k + 30);
    const [y0r, r0] = ringAt(0);
    const [y1r, r1] = ringAt(11);
    out.push(rod("hull-grey", [r0 * Math.sin(a), y0r, r0 * Math.cos(a)], [r1 * Math.sin(a), y1r, r1 * Math.cos(a)], 0.35, 8, { only: "mesh" }), rod("hull-grey-dark", [r1 * Math.sin(a), y1r, r1 * Math.cos(a)], [7 * Math.sin(a), y0 + 38, 7 * Math.cos(a)], 0.4, 8, { only: "mesh" }));
  }
  out.push(hoop("hull-grey-dark", 7.4, y0 + 38, 0.8, 40, 10), hoop("hull-grey-dark", 7.4, y0 + 60, 0.5, 40, 8), ...mod("reactor-fusion", y0 + 60, 0.4));
  return out;
}

/** A whorl of tanks round the stem, like the florets of a flower: a hub ring on the truss, six I-beam spokes, and `n` tanks of radius `r` and length `len` standing round it at radius `R`. */
export function whorl(y0: number, n: number, R: number, r: number, len: number, start = 0): Piece[] {
  const out: Piece[] = [hoop("hull-grey-dark", 8.2, y0 + len * 0.15, 0.5, 40, 8), hoop("hull-grey-dark", 8.2, y0 + len * 0.85, 0.5, 40, 8)];
  const tank = BUILDERS.tank(`tank-${r}-${len}`, "Propellant tank", r, len, "M", "M", 90, 600, "");
  const made = tank.pieces({ detail: 0.22 });
  for (let k = 0; k < n; k++) {
    const a = deg(start + (360 * k) / n);
    const at: Vec3 = [R * Math.sin(a), y0, R * Math.cos(a)];
    out.push(...place(made, { at }));
    for (const f of [0.15, 0.85]) out.push(...ibeam("hull-grey", [8.4 * Math.sin(a), y0 + len * f, 8.4 * Math.cos(a)], [(R - r) * Math.sin(a), y0 + len * f, (R - r) * Math.cos(a)], 1.0, 0.6, [0, 1, 0]));
  }
  return out;
}

/** The payload barrel, 40 m: a drum of radius 9 with its two clamshell doors swung open to the +X side on vertical hinges as the Space Shuttle's open on its keel, a cradle ring and rails on the floor, a robot arm of round struts with ball joints, and an M-class dock at the aft bulkhead. */
export function payloadBay(y0: number, open = 100): Piece[] {
  const R = 9;
  const L = 40;
  const gap = 1.05;
  const out: Piece[] = [];
  const shell = (a0: number, a1: number, material: MaterialName = "hull-white"): Lathe => ({ kind: "lathe", material, segs: 72, body: true, outline: true, arc: () => [a0, a1], profile: [[R, y0], [R, y0 + L]] });
  out.push(shell(TAU / 4 + gap, (5 * TAU) / 4 - gap));
  out.push(hoop("hull-grey-dark", R, y0, 0.5, 72, 8), hoop("hull-grey-dark", R, y0 + L, 0.5, 72, 8));
  for (let i = 1; i < 8; i++) out.push(hoop("hull-grey", R + 0.05, y0 + (L * i) / 8, 0.18, 72, 6, { arc: () => [TAU / 4 + gap, (5 * TAU) / 4 - gap] }));
  // the two doors: each a shell of 60 degrees, turned about the vertical hinge line at its edge by `open` degrees outward
  for (const s of [-1, 1]) {
    const hingeA = TAU / 4 + s * gap;
    const door = shell(s > 0 ? hingeA - 1.05 : hingeA, s > 0 ? hingeA : hingeA + 1.05, "hull-white-worn");
    const H: Vec3 = [R * Math.sin(hingeA), 0, R * Math.cos(hingeA)];
    out.push(...place(place([door, hoop("hull-grey", R + 0.05, y0 + L / 2, 0.2, 72, 6, { arc: () => (s > 0 ? [hingeA - 1.05, hingeA] : [hingeA, hingeA + 1.05]) })], { at: [-H[0], 0, -H[2]] }), { at: H, yaw: s * open }));
  }
  // the inside: a cradle ring, rails on the floor, a latch bridge, an M-class dock at the aft bulkhead and a robot arm
  out.push(hoop("hull-grey", R - 1.2, y0 + L * 0.45, 0.45, 56, 8, { arc: () => [-1.2, 1.2] }));
  out.push(cub("hull-yellow", [-2.6, -2.4], [y0 + 2, y0 + L - 2], [-R + 1.3, -R + 1.6]), cub("hull-yellow", [2.4, 2.6], [y0 + 2, y0 + L - 2], [-R + 1.3, -R + 1.6]));
  for (let i = 0; i < 9; i++) out.push(cub("hull-grey-dark", [-3.2, 3.2], [y0 + 3 + i * 4.2, y0 + 3.4 + i * 4.2], [-R + 1.1, -R + 1.5]));
  out.push(...place(collar("M", 0, 1), { at: [0, y0 + 0.4, 0] }), ...place(collar("M", 0, -1), { at: [0, y0 + L - 0.4, 0] }));
  const arm: Vec3[] = [[-6.2, y0 + 3, -R + 2.4], [-6.2, y0 + 14, -2.5], [-2, y0 + 22, 3], [3, y0 + 32, 3]];
  for (let i = 0; i + 1 < arm.length; i++) out.push(...roundStrut("hull-white", arm[i], arm[i + 1], 0.55));
  out.push(box("hull-grey-dark", [3, y0 + 32, 3], 1.2, 1.2, 0.6, 0, { only: "mesh", plain: true }));
  return out;
}

/** The four-arm ring: a hub drum on a bearing round the stem, four round arms (each a tube of three floors), a torus of radius `R` with window bands, and at each arm's end a pod from the kit: a bridge, a laboratory, engineering and an observation dome. It turns at the rpm for 1 g at its rim. */
export function ring(y: number, R: number): Piece[] {
  const out: Piece[] = [{ kind: "lathe", material: "hull-white", segs: 48, body: true, outline: true, profile: [[15, y - 8], [15, y + 8]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", segs: 48, only: "mesh", profile: [[15, y - 8], [16.3, y - 8], [16.3, y + 8], [15, y + 8]] } as Lathe];
  const minor = 8.5;
  out.push(hoop("hull-white", R, y, minor, 160, 24, { body: true, outline: true }));
  for (const [t0, t1] of [[-0.55, -0.35], [-0.12, 0.12], [0.35, 0.55]]) out.push({ kind: "lathe", material: "window", segs: 160, only: "mesh", profile: Array.from({ length: 5 }, (_, i) => [R + (minor + 0.12) * Math.cos(t0 + ((t1 - t0) * i) / 4), y + (minor + 0.12) * Math.sin(t0 + ((t1 - t0) * i) / 4)] as const) } as Lathe);
  const rib = hoop("hull-grey", R, 0, minor + 0.4, 220, 18, { arc: () => [-0.012, 0.012] });
  out.push(...stamp([rib], Array.from({ length: 48 }, (_, i): Pose => ({ at: [0, y, 0], yaw: (360 * i) / 48 }))));
  const pods: [string, number][] = [["deck-nav-m", 0], ["lab-m", 90], ["reactor-fusion", 180], ["dome-observation-m", 270]];
  for (const [id, az] of pods) {
    const a = deg(az);
    out.push(rod("hull-white", [15 * Math.sin(a), y, 15 * Math.cos(a)], [(R - minor) * Math.sin(a), y, (R - minor) * Math.cos(a)], 3.4, 16, { only: "mesh" }), rod("hull-white-worn", [15 * Math.sin(a), y, 15 * Math.cos(a)], [(R - minor) * Math.sin(a), y, (R - minor) * Math.cos(a)], 3.7, 8, { only: "mesh" }));
    const m = KIT[id];
    out.push(...place(m.pieces({ detail: 0.4 }), { at: [(R + minor + 1) * Math.sin(a), y - m.length / 2, (R + minor + 1) * Math.cos(a)] }));
  }
  return out;
}
export const ringNumbers = (R: number): { rpm: number; g: number } => ({ rpm: rpmFor(R, 1), g: gAt(R, rpmFor(R, 1)) });

/** The glass elevator: a lit tube on the outside of the stem at 45 degrees, with cars at six stops. */
export function elevator(y0: number, y1: number): Piece[] {
  const r = 10;
  const out = liftTube([r * Math.sin(deg(45)), y0, r * Math.cos(deg(45))], [r * Math.sin(deg(45)), y1, r * Math.cos(deg(45))], "glass-clear", 1.8, [], 0);
  const stops = 6;
  for (let i = 0; i < stops; i++) {
    const y = y0 + ((y1 - y0) * (i + 0.5)) / stops;
    out.push(box("hull-white", [r * Math.sin(deg(45)), y - 1.4, r * Math.cos(deg(45))], 2.6, 2.6, 3, 0, { only: "mesh", plain: true }), box("window", [r * Math.sin(deg(45)), y - 1.1, r * Math.cos(deg(45))], 2.7, 2.7, 1.4, 0, { only: "mesh", plain: true }), box("lamp-amber", [r * Math.sin(deg(45)), y + 1.6, r * Math.cos(deg(45))], 0.8, 0.8, 0.3, 0, { only: "mesh", plain: true }));
    out.push(...ibeam("hull-grey", [STEM_R * 0.8, y, STEM_R * 0.8], [r * Math.sin(deg(45)) - 1.3, y, r * Math.cos(deg(45)) - 1.3], 0.8, 0.5, [0, 1, 0]));
  }
  return out;
}

/** The crew port: an S-class arm on the stem with its IDSS-style ring, facing down the stem. */
export function crewPort(y: number): Piece[] {
  const reach = 16;
  const out: Piece[] = [];
  for (const dy of [-3.2, 3.2]) out.push(...ibeam("hull-grey", [STEM_R, y + dy, 0], [reach, y + dy, 0], 1.0, 0.7, [0, 0, 1]));
  out.push(...place(collar("S", 0, -1), { at: [reach, y, 0] }), box("hull-white", [reach, y, 0], 4.2, 4.2, 2.2, 0, { only: "mesh", plain: true }), box("lamp-blue", [reach, y - 0.3, 2.4], 0.3, 0.3, 0.3, 0, { only: "mesh", plain: true }));
  return out;
}

const HEX = [0, 1, 2, 3, 4, 5].map((i) => [Math.cos(deg(60 * i)), Math.sin(deg(60 * i))] as const);
/** One hexagonal mirror segment of circumradius `rho` facing +Y, its gold face over a dark backing and three actuators. */
export function segment(rho: number): Piece[] {
  const outline = HEX.map(([x, z]) => [x * rho, z * rho] as [number, number]);
  const back = HEX.map(([x, z]) => [x * rho * 0.97, z * rho * 0.97] as [number, number]);
  return [prism("hull-grey-dark", back, -0.9, -0.1), prism("kapton", outline, -0.1, 0.12), ...[0, 2, 4].map((i) => rod("hull-grey", [HEX[i][0] * rho * 0.5, -0.1, HEX[i][1] * rho * 0.5], [HEX[i][0] * rho * 0.5, -1.4, HEX[i][1] * rho * 0.5], 0.12, 6, { only: "mesh" }))];
};
const SEG = 3.6;
/** The centres of the hexagonal segments: a hex grid of pitch `rho * sqrt(3)`, the ones inside an ellipse of half widths `ax` and `az`, the middle one left out as the telescope's own. */
export function hexCentres(ax: number, az: number, hole = true, seg = SEG): [number, number][] {
  const s = seg * Math.sqrt(3);
  const out: [number, number][] = [];
  for (let r = -8; r <= 8; r++) for (let q = -10; q <= 10; q++) {
    const x = s * (q + r / 2);
    const z = ((s * Math.sqrt(3)) / 2) * r;
    if ((x / ax) ** 2 + (z / az) ** 2 <= 1.0001 && !(hole && q === 0 && r === 0)) out.push([x, z]);
  }
  return out;
}

/** The telescope: a mast of open truss from `y0`, then the mirror (a hex grid inside an ellipse; round for a disc, wide for wings), a secondary on a three-legged tripod, a dark backplane and a five-layer diamond sunshield behind it. */
export function telescope(y0: number, mastLen: number, ax: number, az: number, seg = SEG): { pieces: Piece[]; top: number } {
  const out: Piece[] = [];
  const stack = stackOf(Array.from({ length: Math.ceil(mastLen / 12) }, () => "truss-m-12"), y0, 0.3);
  out.push(...stack.pieces);
  const y = stack.end + 4;
  // the sunshield, five layers a metre apart, a diamond wider than the mirror
  for (let i = 0; i < 5; i++) out.push(prism(seg === SEG ? "foil" : "steel", [[-ax * 1.25, 0], [0, -az * 1.9], [ax * 1.25, 0], [0, az * 1.9]], y - 4 - i * 0.9, y - 3.88 - i * 0.9), ...(seg === SEG ? [prism("kapton", [[-ax * 1.25 + 1, 0], [0, -az * 1.9 + 1], [ax * 1.25 - 1, 0], [0, az * 1.9 - 1]], y - 3.88 - i * 0.9, y - 3.86 - i * 0.9)] : []));
  const cs = hexCentres(ax, az, true, seg);
  const sg = segment(seg * 0.98);
  if (seg !== SEG) out.push(prism("hull-grey-dark", HEX.map(([x, z]) => [x * ax * 1.12, z * az * 1.12] as [number, number]), y - 1.3, y - 0.95));
  out.push(...stamp(sg, cs.map(([x, z]): Pose => ({ at: [x, y + 0.5 * Math.hypot(x, z) * 0.02, z], yaw: 0 }))));
  out.push(prism("hull-grey-dark", [[-ax - 3, -2], [ax + 3, -2], [ax + 3, 2], [-ax - 3, 2]], y - 1.4, y - 1.0), prism("hull-grey-dark", [[-2, -az - 3], [2, -az - 3], [2, az + 3], [-2, az + 3]], y - 1.4, y - 1.0));
  const top = y + Math.max(ax, az) * 1.1;
  for (let k = 0; k < 3; k++) {
    const a = deg(90 + 120 * k);
    out.push(...roundStrut("hull-grey", [az * 0.9 * Math.sin(a) * 0.8, y, az * 0.9 * Math.cos(a) * 0.8], [0, top, 0], 0.22));
  }
  out.push({ kind: "lathe", material: "hull-white", segs: 24, only: "mesh", body: true, profile: [[1.4, top - 0.8], [1.4, top + 0.6]] } as Lathe, rod("hull-grey", [0, y, 0], [0, y + 3, 0], 0.4, 8, { only: "mesh" }));
  return { pieces: out, top: top + 1 };
}
