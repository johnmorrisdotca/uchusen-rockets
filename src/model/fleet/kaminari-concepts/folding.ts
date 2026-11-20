// Emiake's folding arrays. Three fans of gores on the dorsal ridge, and four hinged panels between them. A gore is drawn stacked (its rest pose) and swings about the ship's cross axis, so the side view shows it open. A panel swings down toward the flank. Pure: no three.js and no DOM.
import type { Piece, Plate, Vec3 } from "../../pieces.ts";
import { rod } from "./adapter.ts";

/** Metres. The fans run from y 240 to y 1200, the longest span that stays aft of the gallery at y 1236. A 1,190 m run would cover it. */
export const FOLD = {
  z: 30,
  radius: 160,
  hubs: [
    { slot: "fin-port", key: "aft", name: "Aft folding array", y: 400 },
    { slot: "fin-centre", key: "mid", name: "Mid folding array", y: 720 },
    { slot: "fin-starboard", key: "fwd", name: "Forward folding array", y: 1040 },
  ] as const,
  /** Five gores, stacked on the ridge at rest, spread this far to either side when open. */
  open: [-72, -36, 0, 36, 72] as const,
  goreHalf: 8,
  leaves: [
    { slot: "fin-leaf-1", y: 480, degrees: 70 },
    { slot: "fin-leaf-2", y: 640, degrees: -70 },
    { slot: "fin-leaf-3", y: 800, degrees: 70 },
    { slot: "fin-leaf-4", y: 960, degrees: -70 },
  ] as const,
  leafLen: 90,
  leafH: 48,
} as const;

const FAN_NOTE = "A gore of a folding array swings out about the hub on the ship's cross axis and back. At rest the gores are stacked, a thin fin; open, they spread 72 degrees to either side, and the side view shows the fold. Drawn faster than a real deployment.";
const LEAF_NOTE = "A hinged panel on the ridge swings down toward the flank and back, one after the next: an accordion between the arrays. Drawn faster than a real fold.";

export interface FoldSpec {
  group: string;
  degrees: number;
  phase: number;
  note: string;
}

/** Every group the stowed ship tags, and the angle it opens to. */
export const EMIAKE_FOLDS: readonly FoldSpec[] = [
  ...FOLD.hubs.flatMap((hub) =>
    FOLD.open.flatMap((degrees, i) => (degrees === 0 ? [] : [{ group: `fan-${hub.key}-${i}`, degrees, phase: i * 0.03, note: FAN_NOTE }])),
  ),
  ...FOLD.leaves.map((leaf, i) => ({ group: `leaf-${i + 1}`, degrees: leaf.degrees, phase: i * 0.06, note: LEAF_NOTE })),
];

type Tagger = (pieces: readonly Piece[], name: string, pivot: Vec3, axis: Vec3) => Piece[];

const dirX = (p: Vec3, degrees: number): Vec3 => {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

const dirY = (p: Vec3, degrees: number): Vec3 => {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

const turnPlate = (plate: Plate, o: Vec3, u: Vec3, v: Vec3, w: Vec3): Plate => ({ ...plate, frame: { o, u, v, w } });

/** One gore, a narrow sector standing up the ridge. `u` is along the ship, `v` is up. */
function gorePlate(hub: Vec3, index: number): Plate {
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
    material: index % 2 === 0 ? "radiator" : "radiator-hot",
    frame: { o: hub, u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] },
    outline,
    thickness: 0.4,
    ribs: [rib(-half * 0.5), rib(0), rib(half * 0.5)],
  };
}

/** The five gores of one fan, the hinge pin and the yellow fold line. Stowed gores are tagged; the open pose is baked. */
export function fanPieces(y: number, key: string, deployed: boolean, tag: Tagger): Piece[] {
  const hub: Vec3 = [0, y, FOLD.z];
  const gores = FOLD.open.map((degrees, i) => {
    const plate = gorePlate(hub, i);
    if (degrees === 0) return plate;
    if (!deployed) return tag([plate], `fan-${key}-${i}`, hub, [1, 0, 0])[0]!;
    return turnPlate(plate, hub, dirX(plate.frame.u, degrees), dirX(plate.frame.v, degrees), plate.frame.w);
  });
  const pin = rod("engine-metal", [-4, y, FOLD.z], [4, y, FOLD.z], 1.2, 10);
  const mark = rod("hull-yellow", [0, y, FOLD.z], [0, y, FOLD.z + FOLD.radius], 0.35, 8);
  const spine = rod("hull-grey", [0, y, FOLD.z + 6], [0, y, FOLD.z + FOLD.radius - 6], 0.28, 6);
  return [...gores, pin, mark, spine];
}

function leafPlate(hinge: Vec3, index: number): Plate {
  const half = FOLD.leafLen / 2;
  return {
    kind: "plate",
    material: index % 2 === 0 ? "radiator" : "hull-grey",
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

/** One accordion panel and its hinge. Stowed, it stands on the ridge and is tagged; open, it is baked down toward the flank. */
export function leafPieces(y: number, index: number, degrees: number, deployed: boolean, tag: Tagger): Piece[] {
  const hinge: Vec3 = [0, y, FOLD.z];
  const plate = leafPlate(hinge, index);
  const swung = !deployed ? tag([plate], `leaf-${index}`, hinge, [0, 1, 0])[0]! : turnPlate(plate, hinge, dirY(plate.frame.u, degrees), dirY(plate.frame.v, degrees), dirY(plate.frame.w, degrees));
  const half = FOLD.leafLen / 2;
  const z0 = FOLD.z;
  const z1 = FOLD.z + FOLD.leafH;
  const pin = rod("hull-yellow", [0, y - half, z0], [0, y + half, z0], 0.45, 8);
  const edge = (side: number) => rod("hull-grey", [0, y + side * half, z0], [0, y + side * half, z1], 0.3, 6);
  const top = rod("hull-grey", [0, y - half, z1], [0, y + half, z1], 0.3, 6);
  const rib = rod("copper", [0, y, z0 + 2], [0, y, z1 - 2], 0.18, 6);
  const stay = (x: number, dy: number) => rod("hull-grey-dark", [x, y + dy, z0], [0, y + dy, z0 + 18], 0.4, 6);
  return [swung, pin, edge(-1), edge(1), top, rib, stay(-6, -12), stay(6, 12)];
}
