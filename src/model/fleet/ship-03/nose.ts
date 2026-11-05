// Miyamoto's rounded nose, station 350 to 380 m: the three staggered, spaced shield layers of the bow, but as round drums with rounded shoulders under a domed front, and every round surface covered in gold solar cells (a raised
// plate each, in rows that follow the curve). The orange removable shield stays as a rim round the front of each layer; the steerable ranging apertures, the optical heads, the side apertures and the two debris-intercept mounts
// stand where they stood on the square bow. Ariake keeps the square bow (`bow.ts`). A cutaway opens the starboard side to the crush cells. Pure: no three.js and no DOM.
import { collar, cub, type Lathe, type MaterialName, type Piece, rng, rod } from "./adapter.ts";
import { STATION } from "./dims.ts";
import { lightPool } from "../lights.ts";
import { frame, lamp, on, stencil } from "./faces.ts";
import { hexClad } from "./hex.ts";
import { OPEN_STARBOARD, ringAt, tubeAt } from "./shapes.ts";

const [Y0] = STATION.bow;
/** The radius of each round layer, the metres of it, and where each stands: tail to nose. */
const LAYERS = [
  { r: 19, y: [Y0, Y0 + 11.5] as const },
  { r: 15.5, y: [Y0 + 12.2, Y0 + 20.5] as const },
  { r: 11.5, y: [Y0 + 21.2, Y0 + 24] as const },
] as const;
const DOME = { y: Y0 + 24, r: 11.5, rise: 6 } as const;
/** The cells: gold, a little varied, the bright of the field coils and the foil of the kapton. */
const CELLS: readonly (readonly [number, MaterialName])[] = [[0.2, "coil"], [0.7, "gold"], [1, "kapton"]];

/** The dome's height above its base at a radius. */
const domeY = (r: number): number => DOME.y + DOME.rise * Math.sqrt(Math.max(0, 1 - (r / DOME.r) ** 2));
/** A layer's outline from its tail face to its rounded front shoulder. */
const drum = (i: number): [number, number][] => {
  const { r, y } = LAYERS[i];
  return [[0.001, y[0]], [r - 1.4, y[0]], [r, y[0] + 1.4], [r, y[1] - 2.2], [r - 0.5, y[1] - 1], [r - 1.8, y[1]], [0.001, y[1]]];
};
const profileRadius = (profile: readonly (readonly [number, number])[], y: number): number => {
  const k = profile.findIndex(([, py], i) => i + 1 < profile.length && y >= Math.min(py, profile[i + 1][1]) && y <= Math.max(py, profile[i + 1][1]));
  if (k < 0) return 0;
  const [r0, y0] = profile[k];
  const [r1, y1] = profile[k + 1];
  return y1 === y0 ? Math.max(r0, r1) : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
};

export function noseRounded(cut: boolean, detail = 1, seed = "bow", marks = "452"): Piece[] {
  const out: Piece[] = [];
  const random = rng(`${seed}/nose`);
  const arc = cut ? { arc: OPEN_STARBOARD } : {};
  // the layers: a dark round core with a rounded shoulder, an orange removable rim round its front, bolts, and gold cells over its side
  LAYERS.forEach((layer, i) => {
    const { r, y } = layer;
    const profile = drum(i);
    out.push({ kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, profile, body: true, outline: true, ...arc } as Lathe);
    out.push(ringAt("hull-orange", 0, 0, r - 0.5, y[1] - 1.2, 0.5, arc), ringAt("hull-grey", 0, 0, r + 0.1, y[0] + 1.6, 0.35, arc));
    for (let k = 0; k < 32; k++) {
      const a = (Math.PI * 2 * k) / 32;
      if (cut && Math.sin(a) > 0) continue;
      out.push(cub("hull-grey-dark", [(r - 0.3) * Math.sin(a) - 0.16, (r - 0.3) * Math.sin(a) + 0.16], [y[1] - 0.5, y[1] - 0.1], [(r - 0.3) * Math.cos(a) - 0.16, (r - 0.3) * Math.cos(a) + 0.16]));
    }
    // the cells, clear of the mounts and apertures that stand on this layer
    const gaps = i === 0 ? [[Math.PI / 2, 0.2], [(3 * Math.PI) / 2, 0.2]] : i === 1 ? [[0, 0.3], [Math.PI, 0.3]] : [];
    const arcs = (): [number, number][] => {
      const cuts = [...gaps].sort((p, q) => p[0] - q[0]);
      const ranges: [number, number][] = [];
      let from = 0;
      for (const [c, w] of cuts) {
        if (c - w > from) ranges.push([from, c - w]);
        from = c + w;
      }
      ranges.push([from, 2 * Math.PI]);
      return cut ? ranges.map(([a0, a1]) => [Math.max(a0, Math.PI), a1] as [number, number]).filter(([a0, a1]) => a1 > a0) : ranges;
    };
    out.push(...hexClad({ radius: (yy) => profileRadius(profile, yy) + 0.02, y0: y[0] + 1.8, y1: y[1] - 2.4, at: [0, 0], tile: 1, cells: { w: detail < 0.5 ? 2.2 : 1.5, h: detail < 0.5 ? 2.2 : 1.5 }, raise: 0.12, tones: CELLS, arcs }, `${seed}/layer${i}`));
  });
  // the dome: a round front on the last layer, in cells, with the instruments set in it
  const dome: [number, number][] = [[0.001, DOME.y], ...Array.from({ length: 8 }, (_, k) => [DOME.r * Math.cos(((k + 1) / 8) * (Math.PI / 2)) || 0.001, DOME.y + DOME.rise * Math.sin(((k + 1) / 8) * (Math.PI / 2))] as [number, number])];
  const domeProfile = [[DOME.r - 0.01, DOME.y], ...dome.slice(1)] as [number, number][];
  out.push({ kind: "lathe", material: "hull-grey-dark", at: [0, 0], segs: 48, profile: domeProfile, body: true, outline: true, ...arc } as Lathe);
  const holes: [number, number][] = [[-5, 4], [5, 4], [-5, -4], [5, -4]];
  out.push(...hexClad({ radius: (yy) => profileRadius(domeProfile, yy) + 0.02, y0: DOME.y + 0.7, y1: DOME.y + DOME.rise - 0.6, at: [0, 0], tile: 1, cells: { w: 1.5, h: 1.5 }, raise: 0.12, tones: CELLS, arcs: () => (cut ? [[Math.PI, 2 * Math.PI]] : [[0, 2 * Math.PI]]) }, `${seed}/dome`).filter((p) => p.kind !== "plate" || !holes.some(([x, z]) => Math.hypot(p.frame.o[0] - x, p.frame.o[2] - z) < 3.2)));
  // the front: four steerable ranging apertures, six retracted optical heads, a nav light row, all on the dome
  for (const [x, z] of holes) {
    const yy = domeY(Math.hypot(x, z)) - 0.15;
    out.push(ringAt("hull-grey", x, z, 1.6, yy, 0.3), ringAt("hull-orange", x, z, 2.2, yy - 0.1, 0.18), tubeAt("glass", x, z, 1.1, yy - 0.2, yy + 0.4, { segs: 14 }), tubeAt("bell-inside", x + 0.2, z, 0.5, yy + 0.4, yy + 0.7, { segs: 10 }));
    out.push(cub("hull-grey-dark", [x - 0.2, x + 0.2], [yy - 0.4, yy + 0.2], [z + 1.7, z + 2.4]), cub("lamp-amber", [x - 0.15, x + 0.15], [yy, yy + 0.2], [z - 2.4, z - 2]));
  }
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI * 2 * k) / 6 + 0.3;
    const x = 7.4 * Math.sin(a);
    const z = 7.4 * Math.cos(a);
    if (cut && x > 0) continue;
    const yy = domeY(7.4);
    out.push(tubeAt("hull-grey-dark", x, z, 0.9, yy - 0.2, yy + 0.1, { segs: 10 }), tubeAt("glass", x, z, 0.55, yy + 0.1, yy + 0.45, { segs: 10 }));
  }
  out.push(...[-1, 1].flatMap((s) => (cut && s > 0 ? [] : lamp({ n: "y", sign: 1, at: DOME.y + DOME.rise - 0.3, a: [-3, 3], b: [-3, 3] }, s * 2, 0, "amber", 0.2))));
  // side apertures: two on each flank of the first layer, each a recessed lens in a frame on a flat pad, so a damaged front still leaves the ship its eyes
  const r0 = LAYERS[0].r;
  for (const s of [-1, 1] as const) {
    if (cut && s === 1) continue;
    out.push(cub("hull-grey-dark", s === 1 ? [r0 - 0.4, r0 + 0.35] : [-r0 - 0.35, -r0 + 0.4], [Y0 + 1.5, Y0 + 12], [-2.6, 2.6]));
    const f = { n: "x" as const, sign: s, at: s * (r0 + 0.35), a: [Y0, Y0 + 12] as const, b: [-3, 3] as const };
    for (const y of [Y0 + 4, Y0 + 9]) out.push(...frame(f, y, 0, 2.2, 2.2, 0.4, 0.4, "hull-grey-dark"), on(f, y, 0, 2, 2, 0, 0.1, "glass"), on(f, y, 0, 0.7, 0.7, 0.1, 0.4, "lamp-blue"));
  }
  // the two debris-intercept mounts: a turret on the dorsal and the ventral side of the middle layer, a pair of barrels each, and a service hatch
  const r1 = LAYERS[1].r;
  const y1 = LAYERS[1].y;
  for (const s of [1, -1] as const) {
    const z = s * r1;
    out.push(cub("hull-grey-dark", [-2.6, 2.6], [y1[0] + 1, y1[1] - 1.6], [z - s * 0.6, z + s * 1.4]), cub("hull-orange", [-2.4, 2.4], [y1[0] + 1.2, y1[1] - 1.8], [z + s * 1.4, z + s * 1.8]));
    for (const x of [-1, 1]) out.push(rod("hull-grey", [x, y1[0] + 2, z + s * 2.6], [x, y1[1] + 2.4, z + s * 2.6], 0.34, 8), rod("bell-inside", [x, y1[1] + 2.4, z + s * 2.6], [x, y1[1] + 2.55, z + s * 2.6], 0.22, 8), ringAt("hull-grey-dark", x, z + s * 2.6, 0.45, y1[0] + 4, 0.1));
    out.push(cub("hull-grey-dark", [-1.8, 1.8], [y1[0] + 1.6, y1[0] + 3.4], [z + s * 1.8, z + s * 2.8]));
  }
  // spacer struts between layers: eight round columns each, with a clevis at each end
  for (const i of [0, 1]) {
    const a = LAYERS[i].y[1];
    const b = LAYERS[i + 1].y[0];
    const rr = LAYERS[i + 1].r - 2.2;
    for (let k = 0; k < 8; k++) {
      const an = (Math.PI * 2 * k) / 8 + 0.2;
      if (cut && Math.sin(an) > 0) continue;
      const x = rr * Math.sin(an);
      const z = rr * Math.cos(an);
      out.push(rod("hull-grey", [x, a - 0.2, z], [x, b + 0.2, z], 0.45, 8), rod("hull-grey-dark", [x, a - 0.2, z], [x, a + 0.35, z], 0.7, 8), rod("hull-grey-dark", [x, b - 0.35, z], [x, b + 0.2, z], 0.7, 8));
    }
  }
  if (cut) {
    // the crush cells inside the starboard half: ring walls and radial webs of the first two layers
    for (const [i, rings] of [[0, [6, 11, 15]], [1, [5, 10]]] as const) for (const rr of rings) out.push(...[tubeAt("hull-white-worn", 0, 0, rr, LAYERS[i].y[0] + 0.4, LAYERS[i].y[1] - 0.4, { segs: 36, arc: OPEN_STARBOARD })]);
    for (let k = 0; k < 8; k++) {
      const an = Math.PI + (Math.PI * (k + 0.5)) / 8;
      for (const i of [0, 1]) out.push(rod(random() < 0.5 ? "hull-orange-worn" : "foam", [0, (LAYERS[i].y[0] + LAYERS[i].y[1]) / 2, 0], [(LAYERS[i].r - 1.5) * Math.sin(an), (LAYERS[i].y[0] + LAYERS[i].y[1]) / 2, (LAYERS[i].r - 1.5) * Math.cos(an)], 0.14, 6));
    }
  }
  out.push(cub("hull-white-worn", [-r0 - 0.9, -r0 + 0.3], [Y0 + 3, Y0 + 9], [-7, 0]), ...stencil({ n: "x", sign: -1, at: -r0 - 0.9, a: [Y0, Y0 + 12], b: [-7, 0] }, marks, Y0 + 6, -3.5, 2.2));
  out.push(cub("flood", [-r0 - 1.2, -r0 - 0.95], [Y0 + 9.4, Y0 + 10.1], [-4.4, -3.5]));
  out.push(lightPool({ o: [-r0 - 0.82, Y0 + 6, -3.5], u: [0, 1, 0], v: [0, 0, 1], w: [-1, 0, 0] }, 2.6));
  out.push(...collar("L", Y0, -1));
  return out;
}
