// Kaminari's two arrays. A blanket pays out from a mast each side of the tail. A ring of trapezoid panels pays out from a hub at the bow. Each panel is built stacked on the one inside it; a slide moves it out, so the stack is the folded array and the paid-out stack is the open one. The cells are one picture on the sheet, not extra draws. Pure: no three.js and no DOM.
import type { Motion } from "../motion.ts";
import type { Move, Piece, Plate, Vec3 } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { cub, disc, place } from "./adapter.ts";

/** Blanket: twelve panels of 52 m, stacked into 52 m and paid out to 624 m, 120 m wide. One wing each side, about 1.3 km from tip to tip. */
export const BLANKET = { y: 620, root: 20, len: 52, panels: 12, half: 60 } as const;
/** The wings sit above the tanks and the cargo, on the dorsal edge of the truss. */
const MOUNT_Z = 46;
/** Three pairs spread along the truss, with a few hundred metres of bare truss between them. The quiver, the cargo and the carousel fill the sides, so the wings stand above that. */
export const BLANKET_STATIONS = [
  { id: "a", y: 620 },
  { id: "b", y: 980 },
  { id: "c", y: 1340 },
] as const;
/** Ring: twelve petals, six segments of 70 m, a 28 m hub, so the open ring is 900 m across. The wedges are built at the hub and slide out. */
export const RING = { y: 1660, hub: 28, len: 70, petals: 12, segments: 6, half: 4 } as const;

const tag = (pieces: readonly Piece[], move: Move): Piece[] => pieces.map((piece) => ({ ...piece, move }));

/** A flat cell blanket facing +Z: one sheet, a white frame, and the cells as one repeating picture. */
function blanketFace(x0: number, x1: number, y0: number, y1: number, z: number): Plate {
  return cub("hull-white", [Math.min(x0, x1), Math.max(x0, x1)], [y0, y1], [z, z + 0.16], {
    plain: false,
    sheet: true,
    top: "cell-gold",
    inset: { margin: 0.8, depth: 0.04 },
  });
}

/** A box truss behind the sheet: two longerons and a frame each bay, so the blanket hangs on structure. */
function mast(x0: number, x1: number, y: number, half: number, z: number): Piece[] {
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  const back: [number, number] = [z - 1.5, z - 0.45];
  const out: Piece[] = [
    cub("hull-grey", [lo, hi], [y - half + 0.6, y - half + 1.8], back, { plain: false }),
    cub("hull-grey", [lo, hi], [y + half - 1.8, y + half - 0.6], back, { plain: false }),
  ];
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const x = lo + ((hi - lo) * i) / bays;
    out.push(cub("hull-grey", [x - 0.4, x + 0.4], [y - half + 0.6, y + half - 0.6], back, { plain: false }));
  }
  return out;
}

/** The box the folded wing stacks into, and the yoke that holds it off the rotary joint. */
function canister(sign: number, y: number, half: number): Piece[] {
  const outer = sign * BLANKET.root;
  const inner = sign * (BLANKET.root - 9);
  const lo = Math.min(inner, outer);
  const hi = Math.max(inner, outer);
  const yoke = sign * 12;
  return [
    cub("hull-grey", [lo, hi], [y - half, y + half], [MOUNT_Z - 2.2, MOUNT_Z + 2.2], { plain: true }),
    cub("hull-grey", [Math.min(yoke, lo), Math.max(yoke, lo)], [y - half + 3, y - half + 6], [MOUNT_Z - 0.8, MOUNT_Z + 0.8], { plain: false }),
    cub("hull-grey", [Math.min(yoke, lo), Math.max(yoke, lo)], [y + half - 6, y + half - 3], [MOUNT_Z - 0.8, MOUNT_Z + 0.8], { plain: false }),
  ];
}

/** One blanket panel: one cell sheet, 120 m wide, and the truss behind it. A lamp only on the outermost panel, so the wing is not a row of lights. */
function blanketPanel(sign: number, y: number, len: number, half: number, stack: number, tip: boolean): Piece[] {
  const x0 = sign * BLANKET.root;
  const x1 = sign * (BLANKET.root + len);
  const face = blanketFace(x0, x1, y - half, y + half, stack);
  const lamps = tip ? lampHalo("nav-white", [sign * (BLANKET.root + len), y, stack + 0.2], 3) : [];
  return [face, ...mast(x0, x1, y, half, stack), ...lamps];
}

/** A short orange block, big enough to read at the ship's first picture: a rotary joint or a gimbal. */
function knuckle(x: readonly [number, number], y: readonly [number, number], z: readonly [number, number]): Plate {
  return cub("hull-orange", x, y, z, { plain: true });
}

/** One pair, in ship coordinates. The pair turns on a joint at the hull; each wing turns on a gimbal at its root; panel 0 stays and each later panel slides out. */
export function blanketPair(id: string, y: number): Piece[] {
  const { len, panels, half } = BLANKET;
  const alpha = `blanket-${id}-alpha`;
  const pivot: Vec3 = [0, y, MOUNT_Z];
  const about: Vec3 = [0, 1, 0];
  const out: Piece[] = [cub("hull-grey", [-2.2, 2.2], [y - 4, y + 4], [12, MOUNT_Z - 1.6], { plain: true })];
  out.push(...tag([knuckle([-3.2, 3.2], [y - 5, y + 5], [MOUNT_Z - 3, MOUNT_Z + 3]), cub("hull-grey", [-BLANKET.root, BLANKET.root], [y - 2, y + 2], [MOUNT_Z - 1.6, MOUNT_Z + 1.6], { plain: true })], { name: alpha, pivot, axis: about }));
  for (const sign of [1, -1] as const) {
    const side = sign > 0 ? "s" : "p";
    const beta = `blanket-${id}-${side}-beta`;
    const root: Vec3 = [sign * BLANKET.root, y, MOUNT_Z];
    const twist: Vec3 = [sign, 0, 0];
    out.push(...tag(canister(sign, y, half), { name: alpha, pivot, axis: about }));
    for (let k = 0; k < panels; k++) {
      const pieces = blanketPanel(sign, y, len, half, MOUNT_Z + k * 0.42, k === panels - 1);
      if (k === 0) {
        const gimbal = knuckle([sign * BLANKET.root - 2.4, sign * BLANKET.root + 2.4], [y - 3.2, y + 3.2], [MOUNT_Z - 2.6, MOUNT_Z + 2.6]);
        out.push(...tag([gimbal, ...pieces], { name: beta, pivot: root, axis: twist, under: alpha }));
      } else out.push(...tag(pieces, { name: `blanket-${id}-${side}-${k}`, pivot: root, axis: twist, under: beta }));
    }
  }
  return out;
}

/** All three pairs. */
export function blanketPieces(): Piece[] {
  return BLANKET_STATIONS.flatMap((station) => blanketPair(station.id, station.y));
}

/** One gold cell tile lying in the ship's horizontal plane, so a three-quarter view sees the cells. */
function ringTile(x0: number, x1: number, halfW: number, y: number): Plate {
  const sx = x1 - x0;
  const sz = halfW * 2;
  return {
    kind: "plate",
    material: "hull-white",
    top: "cell-gold",
    frame: { o: [(x0 + x1) / 2, y, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
    outline: [[-sx / 2, -sz / 2], [sx / 2, -sz / 2], [sx / 2, sz / 2], [-sx / 2, sz / 2]],
    thickness: 0.16,
    sheet: true,
    plain: false,
    only: "mesh",
    inset: { margin: 0.5, depth: 0.04 },
  };
}

/** A petal segment: strips that widen with the radius they reach when paid out, on a box spar. Built at the hub; the slide carries it out. */
function ringSegment(s: number, y: number, hub: number, len: number, petals: number, lamp: boolean): Piece[] {
  const strips = 3;
  const open0 = hub + s * len;
  const out: Piece[] = [cub("hull-grey", [hub, hub + len], [y - 1.3, y - 0.35], [-0.7, 0.7], { plain: false })];
  for (let i = 0; i < strips; i++) {
    const f0 = i / strips;
    const f1 = (i + 1) / strips;
    const radius = open0 + ((f0 + f1) / 2) * len;
    const halfW = radius * Math.tan(Math.PI / petals) * 0.92;
    out.push(ringTile(hub + f0 * len, hub + f1 * len, halfW, y));
  }
  if (lamp) out.push(...lampHalo("nav-white", [hub + len, y + 0.2, 0], 3));
  return out;
}

/** The ring, in ship coordinates. The whole ring tilts on one mast joint; each petal turns on its own gimbal; segment 0 stays and the outer segments slide out. */
export function ringPieces(): Piece[] {
  const { y, hub, len, petals, segments } = RING;
  const at: Vec3 = [0, y, 0];
  const tilt = "ring-tilt";
  const out: Piece[] = tag(
    [knuckle([-3.2, 3.2], [y - 2.4, y + 2.4], [-3.2, 3.2]), disc("hull-grey", [0, 0], hub * 0.7, y - 0.4, 0.5, 24), cub("hull-grey", [-hub, hub], [y - 0.2, y + 0.5], [-4, 4], { plain: true })],
    { name: tilt, pivot: at, axis: [1, 0, 0] },
  );
  for (let p = 0; p < petals; p++) {
    const petal = `ring-petal-${p}`;
    for (let s = 0; s < segments; s++) {
      const pieces = ringSegment(s, y + s * 0.3, hub, len, petals, s === segments - 1 && p % 3 === 0);
      const gimbal = s === 0 ? [knuckle([hub - 1.4, hub + 2.6], [y - 1.8, y + 1.8], [-1.8, 1.8])] : [];
      const move: Move = s === 0 ? { name: petal, pivot: [hub, y, 0], axis: [1, 0, 0], under: tilt } : { name: `ring-${p}-${s}`, pivot: [hub, y, 0], axis: [1, 0, 0], under: petal };
      out.push(...place(tag([...pieces, ...gimbal], move), { at: [0, 0, 0], yaw: (360 * p) / petals }));
    }
  }
  return out;
}

const note = "A solar panel pays out along its mast and comes back. Folded, the panels sit in one stack; open, they tile. Drawn faster than a real wing.";
const trackNote = "The joint turns so the cells face the sun, the way the station's rotary joints and gimbals do.";

const track = (group: string, face: Vec3): Motion => ({ ship: "fleet-kaminari", group, kind: "track", face, note: trackNote });

/** The slides and the sun joints for the two arrays. Panel 0 and segment 0 are the gimbals, so they are not slides. */
export const ARRAY_MOTIONS: readonly Motion[] = [
  ...BLANKET_STATIONS.flatMap((station) => [
    track(`blanket-${station.id}-alpha`, [0, 0, 1]),
    track(`blanket-${station.id}-s-beta`, [0, 0, 1]),
    track(`blanket-${station.id}-p-beta`, [0, 0, 1]),
    ...[1, -1].flatMap((sign) => Array.from({ length: BLANKET.panels - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `blanket-${station.id}-${sign > 0 ? "s" : "p"}-${i + 1}`, kind: "slide", travel: (i + 1) * BLANKET.len, period: 48, note }))),
  ]),
  track("ring-tilt", [0, 1, 0]),
  ...Array.from({ length: RING.petals }, (_, p) => track(`ring-petal-${p}`, [0, 1, 0])),
  ...Array.from({ length: RING.petals }, (_, p) => Array.from({ length: RING.segments - 1 }, (_, i): Motion => ({ ship: "fleet-kaminari", group: `ring-${p}-${i + 1}`, kind: "slide", travel: (i + 1) * RING.len, period: 48, note }))).flat(),
];
