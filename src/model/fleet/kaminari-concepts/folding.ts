// Emiake's three folding arrays: port, centre and starboard, the old sail places. At rest every gore lies along the hull. Open, the centre wing stands up off the roof and the outer two swing out to the flanks. Four panels on the ridge lean with them and stay face-on from the side. The gores are the ship's radiator white. Pure: no three.js and no DOM.
import type { Piece, Plate, Vec3 } from "../../pieces.ts";
import { rod } from "./adapter.ts";

/** Metres. One station, aft of the gallery at y 1236. The outer tips, 110 m out from x ±48, stay inside the 410 m beam. */
export const FOLD = {
  y: 560,
  z: 28,
  radius: 110,
  hubs: [
    { slot: "fin-port", key: "port", name: "Port folding array", x: -48, axis: [0, 0, 1] as Vec3, turn: -90 },
    { slot: "fin-centre", key: "centre", name: "Centre folding array", x: 0, axis: [1, 0, 0] as Vec3, turn: -90 },
    { slot: "fin-starboard", key: "starboard", name: "Starboard folding array", x: 48, axis: [0, 0, 1] as Vec3, turn: 90 },
  ] as const,
  /** Five gores. Added to `turn`, so the open fan is centred on straight out and spreads 72 degrees to either side. */
  open: [-72, -36, 0, 36, 72] as const,
  goreHalf: 8,
  leaves: [
    { slot: "fin-leaf-1", x: 0, y: 370, degrees: 35 },
    { slot: "fin-leaf-2", x: 0, y: 420, degrees: -35 },
    { slot: "fin-leaf-3", x: 0, y: 700, degrees: 35 },
    { slot: "fin-leaf-4", x: 0, y: 760, degrees: -35 },
  ] as const,
  leafLen: 40,
  leafH: 70,
} as const;

const FAN_NOTE = "A gore lies along the hull at rest and swings out from it. The centre wing stands up off the roof; the port and starboard wings swing out to the flanks, 72 degrees to either side. Drawn faster than a real deployment.";
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
  ...FOLD.hubs.flatMap((hub) => FOLD.open.map((spread, i) => ({ group: `fan-${hub.key}-${i}`, degrees: hub.turn + spread, phase: i * 0.03, note: FAN_NOTE }))),
  ...FOLD.leaves.map((leaf, i) => ({ group: `leaf-${i + 1}`, degrees: leaf.degrees, phase: i * 0.06, note: LEAF_NOTE })),
];

type Tagger = (pieces: readonly Piece[], name: string, pivot: Vec3, axis: Vec3) => Piece[];

const rad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Rotate about the hinge: X for the centre wing and the panels, Z for the outer wings. */
function spin(p: Vec3, axis: Vec3, degrees: number): Vec3 {
  const c = Math.cos(rad(degrees));
  const s = Math.sin(rad(degrees));
  if (axis[0] === 1) return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

const turnPlate = (plate: Plate, axis: Vec3, degrees: number): Plate => ({
  ...plate,
  frame: {
    o: plate.frame.o,
    u: spin(plate.frame.u, axis, degrees),
    v: spin(plate.frame.v, axis, degrees),
    w: spin(plate.frame.w, axis, degrees),
  },
});

/** The rest pose: the radius points aft, along the hull, and the plate lies on it. */
function restFrame(hub: Hub): { u: Vec3; v: Vec3; w: Vec3 } {
  if (hub.key === "centre") return { u: [1, 0, 0], v: [0, -1, 0], w: [0, 0, 1] };
  if (hub.key === "port") return { u: [0, 0, -1], v: [0, -1, 0], w: [-1, 0, 0] };
  return { u: [0, 0, 1], v: [0, -1, 0], w: [1, 0, 0] };
}

/** One gore of the ship's radiator white. The outline's long axis is the radius. */
function gorePlate(hub: Vec3, frame: { u: Vec3; v: Vec3; w: Vec3 }): Plate {
  const steps = 5;
  const half = (FOLD.goreHalf * Math.PI) / 180;
  const outline: [number, number][] = [[0, 2]];
  for (let i = 0; i <= steps; i += 1) {
    const a = -half + (2 * half * i) / steps;
    outline.push([FOLD.radius * Math.sin(a), FOLD.radius * Math.cos(a)]);
  }
  const rib = (a: number): readonly [readonly [number, number], readonly [number, number]] => [
    [0, 2],
    [FOLD.radius * Math.sin(a), FOLD.radius * Math.cos(a)],
  ];
  return {
    kind: "plate",
    material: "radiator",
    frame: { o: hub, u: frame.u, v: frame.v, w: frame.w },
    outline,
    thickness: 0.4,
    ribs: [rib(-half * 0.5), rib(0), rib(half * 0.5)],
  };
}

const along = (hub: Vec3, frame: { v: Vec3 }, near: number, far: number): [Vec3, Vec3] => [
  [hub[0] + frame.v[0] * near, hub[1] + frame.v[1] * near, hub[2] + frame.v[2] * near],
  [hub[0] + frame.v[0] * far, hub[1] + frame.v[1] * far, hub[2] + frame.v[2] * far],
];

/** The five gores of one wing, the hinge pin and the yellow fold line. Stowed gores are tagged; the open pose is baked. */
export function fanPieces(hub: Hub, deployed: boolean, tag: Tagger): Piece[] {
  const at: Vec3 = [hub.x, FOLD.y, FOLD.z];
  const frame = restFrame(hub);
  const gores = FOLD.open.map((spread, i) => {
    const plate = gorePlate(at, frame);
    const degrees = hub.turn + spread;
    if (!deployed) return tag([plate], `fan-${hub.key}-${i}`, at, hub.axis)[0]!;
    return turnPlate(plate, hub.axis, degrees);
  });
  const pin = hub.key === "centre" ? rod("engine-metal", [hub.x - 4, FOLD.y, FOLD.z], [hub.x + 4, FOLD.y, FOLD.z], 1.2, 10) : rod("engine-metal", [hub.x, FOLD.y, FOLD.z - 4], [hub.x, FOLD.y, FOLD.z + 4], 1.2, 10);
  const [a, b] = along(at, frame, 6, FOLD.radius - 4);
  const mark = rod("hull-yellow", a, b, 0.35, 8);
  const spine = rod("hull-grey", a, b, 0.28, 6);
  const dressed = deployed ? [mark, spine].map((piece) => (piece.kind === "plate" ? turnPlate(piece, hub.axis, hub.turn) : piece)) : [mark, spine];
  return [...gores, pin, ...dressed];
}

function leafPlate(hinge: Vec3): Plate {
  const half = FOLD.leafLen / 2;
  return {
    kind: "plate",
    material: "hull-grey",
    frame: { o: hinge, u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] },
    outline: [
      [-half, 0],
      [half, 0],
      [half, FOLD.leafH],
      [-half, FOLD.leafH],
    ],
    thickness: 0.35,
    ribs: [
      [
        [-half + 2, 1],
        [half - 2, 1],
      ],
      [
        [0, 1],
        [0, FOLD.leafH - 1],
      ],
    ],
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
