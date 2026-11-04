// Three layouts of the spin-gravity wheels of ISV Hanabusa (concepts): the same still keel and the same two rotating booms, with the wheels drawn three ways. Every repeated part (ribs, windows, spokes, beads) is one template stamped
// at many poses, so the wheels cost vertices and no draw calls. Concepts only. Pure: no three.js and no DOM.
import { ball, BUILDERS, hoop, ibeam, KIT, place, ringOf, rod, roundStrut, stamp, type KitModule, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";

export interface WheelLayout {
  id: string;
  name: string;
  idea: string;
  ancestors: string;
  pieces: () => Piece[];
}

const TAU = 2 * Math.PI;
/** Wheel radius (centre line of the rim), the spacing of the wheels and their heights up the keel, metres. */
const R = 225;
const Y3 = [255, 285, 315] as const;
const Y4 = 130;
const HUB = 17;
const BOOM_X = 27;

/** The numbers of a wheel: rpm for 1 g at its rim, and g at a given rpm. */
export const rpmFor = (radius: number, g = 1): number => (Math.sqrt((g * 9.80665) / radius) * 60) / TAU;
export const gAt = (radius: number, rpm: number): number => ((rpm * TAU) / 60) ** 2 * radius / 9.80665;

function stackOf(ids: readonly (string | KitModule)[], y0: number, detail: number): { pieces: Piece[]; end: number } {
  let y = y0;
  const pieces: Piece[] = [];
  ids.forEach((one, i) => {
    const m = typeof one === "string" ? KIT[one] : one;
    pieces.push(...place(m.pieces({ seed: `k${y0}/${i}`, detail }), { at: [0, y, 0] }));
    y += m.length;
  });
  return { pieces, end: y };
}

/** The still keel: engines, reactor, truss through the wheels, the docking hub, then crew, lab and sensor sections to the bow. */
function keel(): Piece[] {
  const out: Piece[] = [];
  const tail = stackOf(["engine-fusion-7", "reactor-fusion", "truss-l-24", "truss-l-24", "truss-l-24"], 0, 0.55);
  const spin = stackOf(Array.from({ length: 12 }, () => "truss-l-24"), tail.end, 0.3);
  const bow = stackOf(["node-four", "adapter-l-m", "habitat-drum-crew", "common-area-m", "lab-m", "pod-survey-m", "eva-lock-m", "solarium-m", "truss-m-12", "truss-m-12", "truss-m-12", "truss-m-12", "comms-array-m", "deck-nav-m", "dome-observation-m", "mast-sensor-40"], spin.end, 0.5);
  out.push(...tail.pieces, ...spin.pieces, ...bow.pieces);
  return out;
}

/** The two propellant booms, turning round the keel with the wheels: twelve tanks each, with cross-frames to the hubs. */
function booms(): Piece[] {
  const out: Piece[] = [];
  const tanks = Array.from({ length: 12 }, () => "tank-cryo-24");
  for (const sx of [-1, 1]) out.push(...place(stackOf(tanks, 98, 0.3).pieces, { at: [sx * BOOM_X, 0, 0] }));
  for (const y of [...Y3, Y4]) {
    // the hub: a drum on a bearing round the keel, and cross-beams to the booms
    out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 40, body: true, outline: true, profile: [[HUB, y - 7], [HUB, y + 7]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 40, profile: [[HUB, y - 7], [HUB + 1.2, y - 7], [HUB + 1.2, y + 7], [HUB, y + 7]], only: "mesh" } as Lathe);
    for (const sx of [-1, 1]) for (const dz of [-1, 1]) out.push(...ibeam("hull-grey", [sx * (HUB - 2), y + dz * 6, 0], [sx * (BOOM_X - 5), y + dz * 6, 0], 1.6, 1.0, [0, 0, 1]));
  }
  for (const y of [110, 150, 190, 230, 345, 375]) for (const sx of [-1, 1]) out.push(...ibeam("hull-grey", [sx * 8, y, 0], [sx * (BOOM_X - 5), y, 0], 1.4, 0.9, [0, 0, 1]));
  return out;
}

/** A round tube (a spoke) from the hub out to a rim with a lit elevator shaft: two guide rails and a car at each end of the run. */
function spoke(angle: number, y: number, r0: number, r1: number, radius: number): Piece[] {
  const a: Vec3 = [r0 * Math.sin(angle), y, r0 * Math.cos(angle)];
  const b: Vec3 = [r1 * Math.sin(angle), y, r1 * Math.cos(angle)];
  const out: Piece[] = [rod("hull-white", a, b, radius, 14, { only: "mesh" }), rod("hull-grey-dark", a, b, radius + 0.35, 6, { only: "mesh" })];
  for (const t of [0.25, 0.6]) {
    const p: Vec3 = [a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t];
    const q: Vec3 = [p[0] + Math.sin(angle) * 5, y, p[2] + Math.cos(angle) * 5];
    out.push(rod("window", [p[0], y + radius + 0.2, p[2]], [q[0], y + radius + 0.2, q[2]], radius * 0.45, 8, { only: "mesh" }));
  }
  return out;
}

const poses = (n: number, y: number, start = 0): Pose[] => Array.from({ length: n }, (_, i) => ({ at: [0, y, 0] as Vec3, yaw: start + (360 * i) / n }));

/** A strip of the cross-section of a torus: a thin band on the tube between two angles (0 is the outer face, positive up). */
const band = (material: MaterialName, major: number, y: number, minor: number, t0: number, t1: number, segs = 192, lift = 0.1): Lathe => ({
  kind: "lathe",
  material,
  segs,
  only: "mesh",
  profile: Array.from({ length: 5 }, (_, i) => [major + (minor + lift) * Math.cos(t0 + ((t1 - t0) * i) / 4), y + (minor + lift) * Math.sin(t0 + ((t1 - t0) * i) / 4)] as const),
});

/** A frame rib round a tube at azimuth 0: a thin slice of a larger torus, to be stamped at many azimuths. */
const rib = (major: number, minor: number, width: number, material: MaterialName = "hull-grey-dark"): Lathe => hoop(material, major, 0, minor + 0.5, 400, 18, { arc: () => [-width, width] });

/** A sphere of 24 by 12 facets. */
const sphere = (material: MaterialName, at: Vec3, r: number): Lathe => ({ kind: "lathe", material, at: [at[0], at[2]], segs: 24, only: "mesh", profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / 12)), at[1] - r * Math.cos((Math.PI * i) / 12)] as const) });

/** The kinds of wheel: what each of the four is for. */
type Kind = "garden" | "living" | "research" | "industrial";
const KINDS: readonly { kind: Kind; y: number }[] = [{ kind: "garden", y: Y3[0] }, { kind: "living", y: Y3[1] }, { kind: "research", y: Y3[2] }, { kind: "industrial", y: Y4 }];

// ----------------------------------------------------------------------------------------------------------------------------------
// W1: slim tori on spokes

function slimWheel(kind: Kind, y: number): Piece[] {
  const minor = { garden: 15, living: 12, research: 10, industrial: 8 }[kind];
  const out: Piece[] = [];
  const skin: MaterialName = kind === "garden" ? "glass-clear" : kind === "industrial" ? "hull-grey" : "hull-white";
  out.push(hoop(skin, R, y, minor, 192, 28, { body: true, outline: true }));
  if (kind === "garden") {
    out.push(hoop("plant", R, y - minor * 0.45, minor * 0.62, 192, 14, { only: "mesh" }), hoop("grow-lamp", R, y + minor * 0.8, 0.9, 192, 8, { only: "mesh" }), hoop("grow-lamp", R - minor * 0.55, y + minor * 0.7, 0.6, 192, 8, { only: "mesh" }), hoop("grow-lamp", R + minor * 0.55, y + minor * 0.7, 0.6, 192, 8, { only: "mesh" }));
  } else {
    for (const [t0, t1] of [[-0.42, -0.2], [-0.1, 0.12], [0.22, 0.44]] as const) out.push(band("window", R, y, minor, t0, t1));
    out.push(band("window", R, y, minor, Math.PI - 0.44, Math.PI - 0.1, 192, 0.1));
  }
  out.push(...stamp([rib(R, minor, 0.012, "hull-grey")], poses(72, y).map((p) => ({ ...p, at: [0, y, 0] as Vec3 }))));
  out.push(...stamp([rib(R, minor, 0.02, "hull-orange-worn")], poses(8, y, 3.75)));
  for (let k = 0; k < 6; k++) out.push(...spoke(deg(60 * k), y, HUB, R - minor, kind === "garden" ? 3.4 : 3));
  return out;
}

const deg = (a: number): number => (a * Math.PI) / 180;

function slimWheels(): Piece[] {
  return KINDS.flatMap(({ kind, y }) => slimWheel(kind, y));
}

// ----------------------------------------------------------------------------------------------------------------------------------
// W2: the three wheels as one wide tyre: broad bands with light wells between, on bicycle-wheel spokes

const tyre = (major: number, y: number, wide: number, high: number, c: number): [number, number][] => [
  [major - high / 2 + c, y - wide / 2], [major + high / 2 - c, y - wide / 2], [major + high / 2, y - wide / 2 + c], [major + high / 2, y + wide / 2 - c], [major + high / 2 - c, y + wide / 2], [major - high / 2 + c, y + wide / 2], [major - high / 2, y + wide / 2 - c], [major - high / 2, y - wide / 2 + c], [major - high / 2 + c, y - wide / 2],
];

function tyreWheel(kind: Kind, y: number): Piece[] {
  const wide = kind === "industrial" ? 18 : 26;
  const high = kind === "garden" ? 22 : 18;
  const out: Piece[] = [];
  const skin: MaterialName = kind === "garden" ? "glass-clear" : kind === "industrial" ? "hull-grey" : "hull-white";
  out.push({ kind: "lathe", material: skin, segs: 192, body: true, outline: true, profile: tyre(R, y, wide, high, 4) } as Lathe);
  const outer = R + high / 2;
  if (kind === "garden") out.push({ kind: "lathe", material: "plant", segs: 192, only: "mesh", profile: [[R - high / 2 + 1, y - wide / 2 + 1.5], [R - high / 2 + 1, y + wide / 2 - 1.5]] } as Lathe, { kind: "lathe", material: "grow-lamp", segs: 192, only: "mesh", profile: [[R - high / 2 + 1.2, y + wide / 2 - 3], [R - high / 2 + 1.2, y + wide / 2 - 2]] } as Lathe);
  else for (let k = 0; k < 5; k++) out.push({ kind: "lathe", material: "window", segs: 192, only: "mesh", profile: [[outer + 0.1, y - wide / 2 + 4 + k * ((wide - 8) / 4)], [outer + 0.1, y - wide / 2 + 4.9 + k * ((wide - 8) / 4)]] } as Lathe);
  const ribShape: Lathe = { kind: "lathe", material: "hull-grey-dark", segs: 400, only: "mesh", arc: () => [-0.008, 0.008], profile: [[outer - 3, y - wide / 2], [outer + 0.5, y - wide / 2 + 0.5], [outer + 0.5, y + wide / 2 - 0.5], [outer - 3, y + wide / 2]] };
  out.push(...stamp([place([ribShape], { at: [0, -y, 0] })[0]], poses(128, y)));
  // bicycle-wheel spokes: a cable from the hub flange to the tyre, top and bottom, crossing
  for (let k = 0; k < 24; k++) {
    const a = deg(15 * k);
    for (const s of [-1, 1]) out.push(rod("hull-grey", [HUB * Math.sin(a), y + s * 6, HUB * Math.cos(a)], [(R - high / 2) * Math.sin(a + 0.12), y + s * (wide / 2 - 3), (R - high / 2) * Math.cos(a + 0.12)], 0.45, 6, { only: "mesh" }));
  }
  for (let k = 0; k < 6; k++) out.push(...spoke(deg(60 * k), y, HUB, R - high / 2, 3.6));
  return out;
}

function tyreWheels(): Piece[] {
  return KINDS.flatMap(({ kind, y }) => tyreWheel(kind, y));
}

// ----------------------------------------------------------------------------------------------------------------------------------
// W3: a string of pressure modules joined by round nodes, as the ISS and Gateway are

function beadWheel(kind: Kind, y: number): Piece[] {
  const minor = { garden: 15, living: 12, research: 10, industrial: 8 }[kind];
  const n = kind === "industrial" ? 10 : 12;
  const step = 360 / n;
  const out: Piece[] = [];
  const skin: MaterialName = kind === "garden" ? "glass-clear" : kind === "industrial" ? "hull-grey" : "hull-white";
  const half = deg(step / 2 - 2.2);
  const bead: Piece[] = [hoop(skin, R, 0, minor, 200, 24, { arc: () => [-half, half], body: true, outline: true })];
  if (kind === "garden") bead.push(hoop("plant", R, -minor * 0.45, minor * 0.62, 200, 12, { arc: () => [-half, half], only: "mesh" }), hoop("grow-lamp", R, minor * 0.8, 0.9, 200, 8, { arc: () => [-half, half], only: "mesh" }));
  else for (const [t0, t1] of [[-0.42, -0.2], [-0.1, 0.12], [0.22, 0.44]] as const) bead.push({ ...band("window", R, 0, minor, t0, t1, 200), arc: () => [-half * 0.9, half * 0.9] } as Lathe);
  bead.push(hoop("hull-grey-dark", R, 0, minor + 0.35, 200, 18, { arc: () => [-0.012, 0.012] }), hoop("hull-grey-dark", R, 0, minor + 0.35, 200, 18, { arc: () => [-half * 0.6 - 0.012, -half * 0.6 + 0.012] }), hoop("hull-grey-dark", R, 0, minor + 0.35, 200, 18, { arc: () => [half * 0.6 - 0.012, half * 0.6 + 0.012] }));
  out.push(...stamp(bead, poses(n, y)));
  for (let k = 0; k < n; k++) {
    const a = deg(step * k + step / 2);
    out.push(sphere("hull-white", [R * Math.sin(a), y, R * Math.cos(a)], minor + 2.2), ...[0, 1].map((s): Piece => ({ kind: "lathe", material: "hull-grey-dark", at: [R * Math.sin(a), R * Math.cos(a)], segs: 20, only: "mesh", profile: [[minor + 2.6, y - 1 + s * 2], [minor + 2.6, y + 0.3 + s * 2]] } as Lathe)));
    if (k % 2 === 0) out.push(...spoke(a, y, HUB, R - minor - 2, kind === "garden" ? 3.4 : 3));
  }
  return out;
}

function beadWheels(): Piece[] {
  return KINDS.flatMap(({ kind, y }) => beadWheel(kind, y));
}

export const LAYOUTS = (): WheelLayout[] => [
  {
    id: "w1",
    name: "W1. Slim wheels",
    idea: "Four slim tori on six round spokes each, turning with the two propellant booms round the still keel: garden (glazed), living, research, and an industrial wheel set apart. Von Braun's wheel, three of them.",
    ancestors: "Von Braun's wheel station (1952); NASA Nautilus-X centrifuge study; ISS truss and Node 1 hub; Gateway.",
    pieces: () => [...keel(), ...booms(), ...slimWheels()],
  },
  {
    id: "w2",
    name: "W2. One wide tyre",
    idea: "The three wheels sit so close that they read as one broad tyre in three bands, the garden band glazed, on bicycle-wheel cable spokes with six elevator tubes; the fourth, industrial band stands apart. Stanford torus proportions.",
    ancestors: "Stanford torus study (1975, NASA Ames and Stanford); Bernal sphere and O'Neill cylinder studies; the ISS's cable-stayed truss.",
    pieces: () => [...keel(), ...booms(), ...tyreWheels()],
  },
  {
    id: "w3",
    name: "W3. Strings of modules",
    idea: "Each wheel is a ring of twelve pressure modules joined by round nodes, the way the ISS is built from cylinders and nodes: a bead necklace that could be built, one module at a time, from the hub outward.",
    ancestors: "ISS modules and nodes (Destiny, Harmony, Unity); NASA Gateway; Nautilus-X; the Mars Transfer Vehicle habitat drums.",
    pieces: () => [...keel(), ...booms(), ...beadWheels()],
  },
];

void BUILDERS;
void ringOf;
void ball;
void roundStrut;
