// Emiake's three folding arrays: port, centre and starboard. At rest every panel lies along the hull. Open, each gore is a filled radiator panel, 160 m out, and the three hubs run from 240 m to 1,200 m, clear of the gallery. The four ridge panels stay. Pure: no three.js and no DOM.
import type { Piece, Plate, Vec3 } from "../../pieces.ts";
import { rod } from "./adapter.ts";

/** Metres. Hubs at 400, 720 and 1,040: with an 80 m panel the run is 240 m to 1,200 m, aft of the gallery at 1,236. */
export const FOLD = {
  z: 28,
  reach: 160,
  half: 40,
  hubs: [
    { slot: "fin-port", key: "port", name: "Port folding array", x: -48, y: 400, axis: [0, 0, 1] as Vec3 },
    { slot: "fin-centre", key: "centre", name: "Centre folding array", x: 0, y: 720, axis: [1, 0, 0] as Vec3 },
    { slot: "fin-starboard", key: "starboard", name: "Starboard folding array", x: 48, y: 1040, axis: [0, 0, 1] as Vec3 },
  ] as const,
  /** Four panels along each hub, so the wing is a row of panels and not a burst of spokes. */
  along: [-120, -40, 40, 120] as const,
  leaves: [
    { slot: "fin-leaf-1", x: 0, y: 370, degrees: 35 },
    { slot: "fin-leaf-2", x: 0, y: 420, degrees: -35 },
    { slot: "fin-leaf-3", x: 0, y: 700, degrees: 35 },
    { slot: "fin-leaf-4", x: 0, y: 760, degrees: -35 },
  ] as const,
  leafLen: 40,
  leafH: 70,
} as const;

const FAN_NOTE = "A radiator panel lies along the hull at rest and swings out to 160 m. The three wings, port, centre and starboard, run from 240 m to 1,200 m. Each panel is a filled grid in a frame. Drawn faster than a real deployment.";
const LEAF_NOTE = "A hinged panel on the ridge leans along the hull and back, and stays face-on from the side. Drawn faster than a real fold.";

export interface FoldSpec {
  group: string;
  degrees: number;
  phase: number;
  note: string;
}

type Hub = (typeof FOLD.hubs)[number];

/** Every group the stowed ship tags, and the angle it opens to. */
export const EMIAKE_FOLDS: readonly FoldSpec[] = [
  ...FOLD.hubs.flatMap((hub) => FOLD.along.map((_, i) => ({ group: `fan-${hub.key}-${i}`, degrees: hub.key === "starboard" ? 80 : -80, phase: i * 0.04, note: FAN_NOTE }))),
  ...FOLD.leaves.map((leaf, i) => ({ group: `leaf-${i + 1}`, degrees: leaf.degrees, phase: i * 0.06, note: LEAF_NOTE })),
];

type Tagger = (pieces: readonly Piece[], name: string, pivot: Vec3, axis: Vec3) => Piece[];
type Frame = { u: Vec3; v: Vec3; w: Vec3 };

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

function spin(p: Vec3, axis: Vec3, degrees: number): Vec3 {
  const c = Math.cos(rad(degrees));
  const s = Math.sin(rad(degrees));
  if (axis[0] === 1) return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  if (axis[1] === 1) return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

const turnPlate = (plate: Plate, axis: Vec3, degrees: number): Plate => ({
  ...plate,
  frame: { o: plate.frame.o, u: spin(plate.frame.u, axis, degrees), v: spin(plate.frame.v, axis, degrees), w: spin(plate.frame.w, axis, degrees) },
});

/** Flat on the hull: the 160 m reach points aft and the width lies across, so a stowed wing does not stand out. */
function restFrame(): Frame {
  return { u: [1, 0, 0], v: [0, -1, 0], w: [0, 0, 1] };
}

const unit = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Open. The width runs along the ship. The reach is up and out, about half and half, so the side view and the end view each see a face and a span, not an edge.
 */
function openFrame(hub: Hub, index: number): Frame {
  const spread = (index - 1.5) * 0.04;
  // The centre panels fan past the hull, two to port and two to starboard. Their run along the ship does not meet the outer wings, so the end view shows three wings.
  const across = hub.key === "centre" ? (index - 1.5) * 0.8 : (hub.key === "port" ? -1 : 1) * 0.7;
  const v = unit([across, spread, hub.key === "centre" ? 0.96 : 0.7]);
  const u = unit(cross(v, [1, 0, 0]));
  return { u, v, w: unit(cross(u, v)) };
}

/** One filled panel: a radiator plate, a cell grid, and a frame. */
function panelPlate(at: Vec3, frame: Frame): Plate {
  const { reach, half } = FOLD;
  const ribs: (readonly [readonly [number, number], readonly [number, number]])[] = [];
  for (let c = 1; c < 4; c += 1) {
    const x = -half + (c * 2 * half) / 4;
    ribs.push([[x, 4], [x, reach - 4]]);
  }
  for (let r = 1; r < 7; r += 1) {
    const y = (r * reach) / 7;
    ribs.push([[-half + 2, y], [half - 2, y]]);
  }
  return {
    kind: "plate",
    material: "radiator",
    frame: { o: at, u: frame.u, v: frame.v, w: frame.w },
    outline: [[-half, 3], [half, 3], [half, reach], [-half, reach]],
    thickness: 0.4,
    ribs,
  };
}

const atCorner = (o: Vec3, frame: Frame, x: number, y: number): Vec3 => [
  o[0] + frame.u[0] * x + frame.v[0] * y,
  o[1] + frame.u[1] * x + frame.v[1] * y,
  o[2] + frame.u[2] * x + frame.v[2] * y,
];

/** The frame around one panel, hull grey, so the edge reads when the face is foreshortened. */
function frameRods(o: Vec3, frame: Frame): Piece[] {
  const { reach, half } = FOLD;
  const corners: [number, number][] = [[-half, 3], [half, 3], [half, reach], [-half, reach]];
  return corners.map((corner, i) => {
    const next = corners[(i + 1) % corners.length]!;
    return rod("hull-grey", atCorner(o, frame, corner[0], corner[1]), atCorner(o, frame, next[0], next[1]), 0.9, 8);
  });
}

/** The panels of one wing. Stowed, they stack on the hub. Open, they sit in a row along the ship. */
export function fanPieces(hub: Hub, deployed: boolean, tag: Tagger): Piece[] {
  const z = hub.key === "centre" ? 32 : 14;
  const pieces: Piece[] = [];
  FOLD.along.forEach((dy, i) => {
    const y = deployed ? hub.y + dy : hub.y;
    const at: Vec3 = [hub.x, y, z];
    const frame = deployed ? openFrame(hub, i) : restFrame();
    const plate = panelPlate(at, frame);
    const swung = deployed ? plate : tag([plate], `fan-${hub.key}-${i}`, [hub.x, hub.y, z], hub.axis)[0]!;
    pieces.push(swung, ...frameRods(at, frame));
  });
  const pin = rod("engine-metal", [hub.x - 6, hub.y, z], [hub.x + 6, hub.y, z], 1.2, 10);
  return [...pieces, pin];
}

function leafPlate(hinge: Vec3): Plate {
  const half = FOLD.leafLen / 2;
  return {
    kind: "plate",
    material: "hull-grey",
    frame: { o: hinge, u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] },
    outline: [[-half, 0], [half, 0], [half, FOLD.leafH], [-half, FOLD.leafH]],
    thickness: 0.35,
    ribs: [[[-half + 2, 1], [half - 2, 1]], [[0, 1], [0, FOLD.leafH - 1]]],
  };
}

/** One ridge panel and its hinge. Stowed, it stands up and is tagged; open, it leans along the hull and the side view still sees its face. */
export function leafPieces(x: number, y: number, index: number, degrees: number, deployed: boolean, tag: Tagger): Piece[] {
  const hinge: Vec3 = [x, y, FOLD.z];
  const plate = leafPlate(hinge);
  const swung = !deployed ? tag([plate], `leaf-${index}`, hinge, [1, 0, 0])[0]! : turnPlate(plate, [1, 0, 0], degrees);
  const half = FOLD.leafLen / 2;
  const pin = rod("hull-yellow", [x, y - half, FOLD.z], [x, y + half, FOLD.z], 0.45, 8);
  const edge = (side: number) => rod("hull-grey", [x, y + side * half, FOLD.z], [x, y + side * half, FOLD.z + FOLD.leafH], 0.3, 6);
  const top = rod("hull-grey", [x, y - half, FOLD.z + FOLD.leafH], [x, y + half, FOLD.z + FOLD.leafH], 0.3, 6);
  const rib = rod("hull-grey", [x, y, FOLD.z + 2], [x, y, FOLD.z + FOLD.leafH - 2], 0.18, 6);
  const stay = (dy: number) => rod("hull-grey-dark", [x, y + dy, FOLD.z], [x, y + dy, FOLD.z + 12], 0.4, 6);
  const extras = [pin, edge(-1), edge(1), top, rib, stay(-8), stay(8)];
  const dressed = deployed ? extras.map((piece) => (piece.kind === "plate" ? turnPlate(piece, [1, 0, 0], degrees) : piece)) : extras;
  return [swung, ...dressed];
}
