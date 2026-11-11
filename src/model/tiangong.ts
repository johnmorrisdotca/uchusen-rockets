// The Tiangong space station (天宮) in this package's own shapes, from the sourced lengths and widths: no licensed model is used and none is copied. It stands with the Tianhe core upright and the Wentian and Mengtian
// laboratories across the hub at its top, so the three together are a T; the real station has no up. A Shenzhou stands on the hub's forward port and a Tianzhou under the core's aft port.
// What no source gives is judged from photographs and is a choice of this drawing, not a figure: where each of the core's sections ends, the hub's width, the ports, the laboratories' steps, the solar wings' width
// (except Wentian's 27 m and about 110 m²) and the colours. The two laboratories lie on their sides, so each is a prism of flat facets.
import { blank, type Figure } from "../data/types.ts";
import { MENGTIAN_LONG, SHENZHOU_LONG, TIANHE_LONG, TIANZHOU_LONG, WENTIAN_LONG } from "../data/tiangong.ts";
import { tube, taper } from "./kit.ts";
import type { MaterialName } from "./materials.ts";
import type { Piece, Plate, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild, StackPart } from "./stacks.ts";

const HULL_R = 2.1;
const HUB_R = 1.5;
/** Height of the hub's side ports above the core's aft end. */
const HUB_Y = 14.7;
const PORT_R = 0.8;
/** Where a laboratory's docking end stands, from the hub's axis. */
const SIDE = 1.9;
const SIDES = 12;

const TIANHE = TIANHE_LONG.value ?? 0;
const LAB = WENTIAN_LONG.value ?? 0;
const SHENZHOU = SHENZHOU_LONG.value ?? 0;
const TIANZHOU = TIANZHOU_LONG.value ?? 0;
/** Wentian's wings, each 27 m long (Xinhua), about 110 m² each: 4.1 m wide. The same size is drawn for Mengtian, whose article gives a wingspan over 55 m too. */
const WING = 27;
const WING_W = 4.1;

type V3 = readonly [number, number, number];
const sub = (a: V3, b: V3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * A drum lying along X: flat facets from one end to the other, `r0` wide at `x0` and `r1` at `x1`, its axis at height `y` and depth `z`. A cone when the radii differ. Its outside faces outward.
 */
function drumX(material: MaterialName, x0: number, r0: number, x1: number, r1: number, y: number, z: number, extra: Partial<Plate> = {}): Plate[] {
  const out: Plate[] = [];
  const half = Math.PI / SIDES;
  for (let k = 0; k < SIDES; k += 1) {
    const theta = 2 * half * (k + 0.5);
    const n: V3 = [0, Math.cos(theta), Math.sin(theta)];
    const a0 = r0 * Math.cos(half);
    const a1 = r1 * Math.cos(half);
    const p0: Vec3 = [x0, y + a0 * n[1], z + a0 * n[2]];
    const p1: Vec3 = [x1, y + a1 * n[1], z + a1 * n[2]];
    const u = unit(sub(p1, p0));
    let v: Vec3 = [0, -n[2], n[1]];
    if (dot(cross(u, v), n) < 0) v = [0, n[2], -n[1]];
    const w = cross(u, v);
    const length = Math.hypot(...sub(p1, p0));
    const hw0 = r0 * Math.sin(half);
    const hw1 = r1 * Math.sin(half);
    out.push({ kind: "plate", material, frame: { o: p0, u, v, w }, outline: [[0, -hw0], [length, -hw1], [length, hw1], [0, hw0]], thickness: 0.08, plain: true, ...extra });
  }
  return out;
}

/** A flat end on a drum lying along X: a polygon, facing +X or -X. */
function capX(material: MaterialName, x: number, r: number, y: number, z: number, face: 1 | -1): Plate {
  const outline: [number, number][] = [];
  for (let k = 0; k < SIDES; k += 1) {
    const a = (2 * Math.PI * k) / SIDES;
    outline.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const frame = face === 1 ? { o: [x, y, z] as Vec3, u: [0, 1, 0] as Vec3, v: [0, 0, 1] as Vec3, w: [1, 0, 0] as Vec3 } : { o: [x, y, z] as Vec3, u: [0, 0, 1] as Vec3, v: [0, 1, 0] as Vec3, w: [-1, 0, 0] as Vec3 };
  return { kind: "plate", material, frame, outline, thickness: 0.06, plain: true };
}

/** A solar wing in the plane of X and Y, standing at `x`, from `y0` to `y1`, with its boom and its cell lines. */
function wingXY(x: number, y0: number, y1: number, width: number): Piece[] {
  const length = y1 - y0;
  const cells = Math.max(2, Math.round(length / 1.5));
  const ribs: [[number, number], [number, number]][] = [[[0, 0], [0, length]]];
  for (let i = 1; i < cells; i += 1) ribs.push([[-width / 2, (length * i) / cells], [width / 2, (length * i) / cells]]);
  return [
    { kind: "plate", material: "solar", top: "solar", frame: { o: [x, y0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-width / 2, 0], [width / 2, 0], [width / 2, length], [-width / 2, length]], thickness: 0.08, ribs },
    strut("steel", [x, y0, 0.12], [x, y1, 0.12], 0.14, 0.14),
  ];
}

/** A solar wing in the plane of Z and Y, going out along `side` (+1 or -1 along Z) from `z0`, `length` long, `width` tall, centred at height `y`. */
function wingZY(side: 1 | -1, z0: number, length: number, width: number, y: number): Piece[] {
  const cells = Math.max(2, Math.round(length / 1.5));
  const ribs: [[number, number], [number, number]][] = [[[0, 0], [length, 0]]];
  for (let i = 1; i < cells; i += 1) ribs.push([[(length * i) / cells, -width / 2], [(length * i) / cells, width / 2]]);
  const frame = side === 1 ? { o: [0, y, z0] as Vec3, u: [0, 0, 1] as Vec3, v: [0, 1, 0] as Vec3, w: [-1, 0, 0] as Vec3 } : { o: [0, y, -z0] as Vec3, u: [0, 0, -1] as Vec3, v: [0, 1, 0] as Vec3, w: [1, 0, 0] as Vec3 };
  return [
    { kind: "plate", material: "solar", top: "solar", frame, outline: [[0, -width / 2], [length, -width / 2], [length, width / 2], [0, width / 2]], thickness: 0.08, ribs },
    strut("steel", [0.12, y, side * z0], [0.12, y, side * (z0 + length)], 0.14, 0.14),
  ];
}

// ------------------------------------------------------------------------------------------------ Tianhe, its hub and its wings

/** Where the living quarters end and the docking hub begins, up the core: judged from photographs. The core and its hub together are the sourced 16.6 m. */
const CORE_TOP = 13.0;
const HUB_LONG = TIANHE - CORE_TOP;
/** The hub's side ports, up the hub from its base. */
const HUB_AT = HUB_Y - CORE_TOP;

/** The core without its hub, upright: the aft port, the service section and the living quarters. Where the sections end is judged; the width, 4.2 m, is sourced. */
const tianhe = (): Piece[] => [
  tube("engine-metal", 0.55, 0, 0.4),
  taper("white", 0.9, 0.4, 1.4, 0.9),
  tube("white", 1.4, 0.9, 5.0, { rings: [2.2, 3.6], welds: [4.4] }),
  taper("white", 1.4, 5.0, HULL_R, 5.8),
  tube("white", HULL_R, 5.8, CORE_TOP, { rings: [7.6, 9.4, 11.2], welds: [8.5, 10.3] }),
];

/** The docking hub on its own: a short drum with its forward port and the two side ports where the laboratories dock. */
const hub = (): Piece[] => [
  taper("engine-pale", HULL_R, 0, HUB_R, 0.4),
  tube("engine-pale", HUB_R, 0.4, 3.0, { rings: [1.0, 2.4] }),
  taper("engine-metal", HUB_R, 3.0, 0.8, 3.45),
  tube("engine-metal", 0.8, 3.45, HUB_LONG),
  ...drumX("engine-metal", 1.3, PORT_R, SIDE, PORT_R, HUB_AT, 0),
  ...drumX("engine-metal", -1.3, PORT_R, -SIDE, PORT_R, HUB_AT, 0),
];

/** The core's two solar wings, out along the depth so the laboratories' wings stay in their own plane. Their width and length are judged. */
const tianheWings = (): Piece[] => [...wingZY(1, HULL_R, 12, 4.6, 2.3), ...wingZY(-1, HULL_R, 12, 4.6, 2.3)];

// ------------------------------------------------------------------------------------------------ Wentian and Mengtian

/**
 * A laboratory lying across the top: from its docking end, a port ring, the long working cabin, a step down, the airlock cabin and the cap. `side` is +1 for Wentian, whose x runs to the right, and -1 for Mengtian.
 * The cabins' lengths are judged; the whole is 17.9 m.
 */
const laboratory = (side: 1 | -1, airlock: boolean): Piece[] => {
  const x = (d: number) => side * d;
  const Y = HULL_R;
  const out: Piece[] = [
    ...drumX("engine-metal", x(0), PORT_R, x(0.4), PORT_R, Y, 0),
    ...drumX("white", x(0.4), HULL_R, x(12.4), HULL_R, Y, 0),
    ...drumX("engine-pale", x(12.4), HULL_R, x(13.2), 1.5, Y, 0),
    ...drumX("steel", x(13.2), 1.5, x(16.9), 1.5, Y, 0),
    ...drumX("engine-pale", x(16.9), 1.5, x(LAB), 0.9, Y, 0),
    capX("engine-metal", x(LAB), 0.9, Y, 0, side),
    capX("engine-metal", x(0), PORT_R, Y, 0, side === 1 ? -1 : 1),
  ];
  if (airlock) {
    // the payload airlock, a box on the working cabin's side toward the viewer
    out.push({ kind: "plate", material: "steel", frame: { o: [x(6.4), Y, HULL_R + 0.7], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-1.5, -0.9], [1.5, -0.9], [1.5, 0.9], [-1.5, 0.9]], thickness: 1.4, plain: false });
  }
  return out;
};

/** Where a laboratory's wings stand on their own: its axis is this high, so the wings, which run up and down from it, start at the part's base. */
const WINGS_AXIS = HULL_R + WING;
const WINGS_X = 8.9;

/** A laboratory's two long wings, up and down from the middle of its working cabin: 27 m each (Xinhua), about 110 m² each. */
const laboratoryWings = (side: 1 | -1): Piece[] => [
  ...wingXY(side * WINGS_X, WINGS_AXIS + HULL_R, WINGS_AXIS + HULL_R + WING, WING_W),
  ...wingXY(side * WINGS_X, WINGS_AXIS - HULL_R - WING, WINGS_AXIS - HULL_R, WING_W),
];

// ------------------------------------------------------------------------------------------------ Shenzhou and Tianzhou

/** Shenzhou, docking end at y = 0: the probe, the orbital module, the return capsule, the service module and its engine. The three modules' lengths are the article's; the rest of the 9.25 m is the probe and the engine. */
const shenzhou = (): Piece[] => {
  const out: Piece[] = [
    tube("engine-metal", 0.6, 0, 0.45),
    taper("engine-pale", 0.6, 0.45, 1.125, 0.9),
    tube("hull-white", 1.125, 0.9, 3.25, { rings: [2.1] }),
    taper("hull-white", 1.0, 3.25, 1.26, 5.75),
    tube("white", 1.25, 5.75, 6.65, { welds: [6.2] }),
    taper("white", 1.25, 6.65, 1.4, 7.2),
    tube("white", 1.4, 7.2, 8.69, { rings: [7.9] }),
    taper("bell", 0.7, 8.69, 0.5, SHENZHOU),
  ];
  // wings of the service module: 17 m across with the module, so 7.1 m each side of its 2.8 m width
  out.push(...wingZY(1, 1.4, 7.1, 2.2, 7.95), ...wingZY(-1, 1.4, 7.1, 2.2, 7.95));
  return out;
};

/** Tianzhou, engine end at y = 0 and docking end up: the engine, the propulsion section, the cargo cabin 3.35 m across and the port. The sections' lengths are judged; the whole is 10.6 m and the wings span 14.9 m. */
const tianzhou = (): Piece[] => {
  const out: Piece[] = [
    taper("bell", 0.5, 0, 0.9, 0.5),
    tube("white", 1.4, 0.5, 4.2, { rings: [1.6, 3.0], welds: [2.3] }),
    taper("white", 1.4, 4.2, 1.675, 4.9),
    tube("hull-white", 1.675, 4.9, 10.0, { rings: [6.6, 8.3], welds: [5.7, 7.5, 9.1] }),
    taper("engine-pale", 1.675, 10.0, 0.6, 10.45),
    tube("engine-metal", 0.6, 10.45, TIANZHOU),
  ];
  out.push(...wingZY(1, 1.675, 5.775, 2.4, 2.4), ...wingZY(-1, 1.675, 5.775, 2.4, 2.4));
  return out;
};

// ------------------------------------------------------------------------------------------------ the parts

const SHENZHOU_SPAN: Figure = { value: 17, source: "wikipedia-shenzhou", note: "55 ft 9 in, the service module's solar arrays." };
const TIANZHOU_SPAN: Figure = { value: 14.9, source: "wikipedia-tianzhou", note: "49 feet, the solar array span." };

const MODULE_WIDTH: Figure = { value: 4.2, source: "wikipedia-tiangong", note: "14 feet, for each of the three modules." };
const NOT_A_FIGURE: Figure = blank("Judged from photographs; no source read here gives it.");
const WINGS_TIANHE_WIDE = (HULL_R + 12) * 2;
const WINGS_LAB_WIDE = (WINGS_X + WING_W / 2) * 2;
const AT = (x: number, y: number): StackPart["place"] => ({ x, z: 0, y });

const TIANHE_PART: StackPart = { slot: "tianhe", kind: "module", name: "Tianhe core module 天和, without its hub", height: CORE_TOP, diameter: HULL_R * 2, sourcedDiameter: MODULE_WIDTH, alsoTrueTo: ["tiangong-docked"], pieces: tianhe };
const HUB_PART: StackPart = { slot: "docking-hub", kind: "module", name: "Tiangong docking hub", height: HUB_LONG, diameter: HULL_R * 2, place: AT(0, CORE_TOP), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: hub };
const WENTIAN_PART: StackPart = { slot: "wentian", kind: "module", name: "Wentian laboratory module 問天", height: HULL_R * 2, diameter: LAB * 2, place: AT(SIDE, HUB_Y - HULL_R), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: () => laboratory(1, false) };
const MENGTIAN_PART: StackPart = { slot: "mengtian", kind: "module", name: "Mengtian laboratory module 夢天", height: HULL_R * 2, diameter: (MENGTIAN_LONG.value ?? LAB) * 2, place: AT(-SIDE, HUB_Y - HULL_R), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: () => laboratory(-1, true) };
const TIANHE_WINGS_PART: StackPart = { slot: "tianhe-wings", kind: "module", name: "Tianhe solar wings", height: 4.6, diameter: WINGS_TIANHE_WIDE, place: AT(0, 9.4 - 2.3), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: tianheWings };
const WENTIAN_WINGS_PART: StackPart = { slot: "wentian-wings", kind: "module", name: "Wentian solar wings", height: WINGS_AXIS * 2, diameter: WINGS_LAB_WIDE, place: AT(SIDE, HUB_Y - WINGS_AXIS), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: () => laboratoryWings(1) };
const MENGTIAN_WINGS_PART: StackPart = { slot: "mengtian-wings", kind: "module", name: "Mengtian solar wings", height: WINGS_AXIS * 2, diameter: WINGS_LAB_WIDE, place: AT(-SIDE, HUB_Y - WINGS_AXIS), sourcedDiameter: NOT_A_FIGURE, alsoTrueTo: ["tiangong-docked"], pieces: () => laboratoryWings(-1) };
const SHENZHOU_PART: StackPart = { slot: "shenzhou", kind: "spacecraft", name: "Shenzhou crew ship 神舟", height: SHENZHOU, diameter: 17, place: AT(0, TIANHE), sourcedDiameter: SHENZHOU_SPAN, pieces: shenzhou };
const TIANZHOU_PART: StackPart = { slot: "tianzhou", kind: "spacecraft", name: "Tianzhou cargo ship 天舟", height: TIANZHOU, diameter: 14.9, place: AT(0, -TIANZHOU), sourcedDiameter: TIANZHOU_SPAN, pieces: tianzhou };

/** The station's own parts, in the order the variants list them. Each is a part on its own, so a builder can use the hub or one laboratory alone. */
const STATION_PARTS: readonly StackPart[] = [TIANHE_PART, HUB_PART, WENTIAN_PART, MENGTIAN_PART, TIANHE_WINGS_PART, WENTIAN_WINGS_PART, MENGTIAN_WINGS_PART];

const DRAWN =
  "This package's own code, from the sourced lengths and widths of the modules, the hub-and-arms layout read from the pages named in its data and the 27 m of Wentian's wings; no licensed model, picture or code is used. Where each section ends, the hub, the ports, the other wings' widths and the colours are judged from photographs. No flag, mark or lettering is drawn.";

/** A piece moved by (dx, dy, dz): the same shape somewhere else. */
const shifted = (piece: Piece, dx: number, dy: number, dz: number): Piece => {
  if (piece.kind === "plate") return { ...piece, frame: { ...piece.frame, o: [piece.frame.o[0] + dx, piece.frame.o[1] + dy, piece.frame.o[2] + dz] } };
  if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map(([x, y, z]): Vec3 => [x + dx, y + dy, z + dz])) };
  const [ax, az] = piece.at ?? [0, 0];
  return {
    ...piece,
    at: [ax + dx, az + dz],
    profile: piece.profile.map(([r, y]) => [r, y + dy] as const),
    ...(piece.welds ? { welds: piece.welds.map((y) => y + dy) } : {}),
    ...(piece.rings ? { rings: piece.rings.map((y) => y + dy) } : {}),
  };
};

/** The whole station in one piece for the detailed model's line looks: every part where it stands together, the lowest point lifted to y = 0 as the model is. */
const whole = (): Piece[] => {
  const parts = [...STATION_PARTS, SHENZHOU_PART, TIANZHOU_PART];
  const out = parts.flatMap((part) => part.pieces().map((piece) => shifted(piece, part.place?.x ?? 0, part.place?.y ?? 0, part.place?.z ?? 0)));
  return out.map((piece) => shifted(piece, 0, TIANZHOU, 0));
};

/** The painted look of the detailed variant: the model of the Sketchfab user w29572227, credited, as one piece 39 m across. */
const STATION_PART: StackPart = {
  slot: "station",
  kind: "module",
  name: "Tiangong space station 天宮",
  height: 44.65,
  diameter: 39,
  painted: { file: "tiangong-station.glb", credit: "w29572227-tiangong" },
  pieces: whole,
};

export const TIANGONG_BUILDS: readonly StackBuild[] = [
  { rocket: "tiangong", variant: "tiangong", drawnFrom: DRAWN, parts: STATION_PARTS },
  // the station's own parts are the first variant's, shared by the second through its partIds; only the visiting craft are its own
  { rocket: "tiangong", variant: "tiangong-docked", drawnFrom: DRAWN, parts: [SHENZHOU_PART, TIANZHOU_PART] },
  {
    rocket: "tiangong",
    variant: "tiangong-detailed",
    drawnFrom: "The painted look is a model by the Sketchfab user w29572227 (CC BY 4.0), cut down, with its flag's picture removed. The line looks are this package's own plain shapes, from the sourced lengths and widths, laid out as the station's other two variants are. No flag, mark or lettering is drawn.",
    parts: [STATION_PART],
  },
];
