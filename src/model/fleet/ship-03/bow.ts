// Bow defence and navigation, station 350 to 380 m: a short blunt stack of three staggered, spaced shield layers in the orange of removable shields, each narrower than the one behind, with spacer struts between them; steerable
// ranging apertures and retracted optical heads on the front; two debris-intercept mounts; side apertures that keep working if the front is damaged. A cutaway opens the starboard side to the crush cells. Pure: no three.js and no DOM.
import { chamfered, collar, cub, designation, type Piece, prism, rng, rod } from "./adapter.ts";
import { BOW_LAYERS, STATION } from "./dims.ts";
import { dressedFace } from "./hulls.ts";
import { beaconLamp, lampHalo, lightPool } from "../lights.ts";
import { marking } from "../marking.ts";
import { conceptStyle } from "../markingSets.ts";
import { frame, lamp, on, SHUTTER } from "./faces.ts";
import { ringAt, tubeAt } from "./shapes.ts";

const [Y0] = STATION.bow;

/** One layer's extent: its gaps are shaved off so a layer stands clear of the next. */
const layerY = (i: number): [number, number] => [BOW_LAYERS[i].y[0] + (i > 0 ? 0.7 : 0), BOW_LAYERS[i].y[1] - 0.5];

export function bow(cut: boolean, detail = 1, seed = "bow", marks = "452"): Piece[] {
  const out: Piece[] = [];
  const random = rng(`${seed}/bow`);
  BOW_LAYERS.forEach((layer, i) => {
    const [y0, y1] = layerY(i);
    const { hx, hz } = layer;
    const o = { seed: `${seed}${i}`, scheme: SHUTTER, detail, density: 0.3, cell: [2.4, 2.4] as const, raise: 0.3, kinds: ["hatch", "lamps", "bolts", "hazard", "greeble", "number"] as const };
    const outline = chamfered(hx, hz, 6 + i * 2);
    if (cut) {
      // starboard half only: the layer cut at x = 0, so its crush cells show
      out.push(prism("hull-grey-dark", outline.map(([x, z]) => [Math.min(x, 0), z] as [number, number]), y0, y1, { only: undefined }));
      for (let x = 0.6; x < hx - 0.3; x += 1.8) out.push(cub(i === 1 ? "hull-white-worn" : "hull-orange-worn", [x, x + 0.14], [y0 + 0.4, y1 - 0.4], [-hz + 0.8, hz - 0.8]));
      for (let z = -hz + 1.4; z < hz - 0.6; z += 1.8) out.push(cub("hull-grey", [0.2, hx - 0.8], [y0 + 0.4, y1 - 0.4], [z, z + 0.14]));
      for (const z of [-hz + 0.8, hz - 0.8]) out.push(cub("foam", [0.2, hx - 0.8], [y0 + 0.5, y1 - 0.5], [z - 0.3, z + 0.3]));
      out.push(prism("hull-orange", outline.map(([x, z]) => [Math.min(x, 0) * 1, z] as [number, number]), y1 - 0.3, y1, { only: undefined }));
    } else {
      out.push(prism("hull-grey-dark", outline, y0, y1, { only: undefined }));
    }
    const faces = [
      { n: "y" as const, sign: 1 as const, at: y1, a: [-hz + 3 + i, hz - 3 - i] as const, b: [-hx + 3 + i, hx - 3 - i] as const },
      { n: "x" as const, sign: -1 as const, at: -hx, a: [y0, y1] as const, b: [-hz + 3 + i, hz - 3 - i] as const },
      { n: "z" as const, sign: 1 as const, at: hz, a: [-hx + 3 + i, hx - 3 - i] as const, b: [y0, y1] as const },
      { n: "z" as const, sign: -1 as const, at: -hz, a: [-hx + 3 + i, hx - 3 - i] as const, b: [y0, y1] as const },
      ...(cut ? [] : [{ n: "x" as const, sign: 1 as const, at: hx, a: [y0, y1] as const, b: [-hz + 3 + i, hz - 3 - i] as const }]),
    ];
    for (const face of faces) {
      if (face.n === "y") {
        // the fore face is a mosaic of tiles in rows, each tile its own raised plate: the replaceable shield tiles
        const tw = 2.6;
        const th = 2.2;
        for (let b = face.b[0]; b < face.b[1] - 0.3; b += tw) for (let a = face.a[0]; a < face.a[1] - 0.3; a += th) out.push(cub(random() < 0.18 ? "hull-orange-worn" : random() < 0.3 ? "hull-white-worn" : "hull-orange", [b + 0.07, Math.min(b + tw, face.b[1]) - 0.07], [face.at, face.at + 0.28 + random() * 0.12], [a + 0.07, Math.min(a + th, face.a[1]) - 0.07]));
      } else out.push(...dressedFace(face, o));
    }
    // a ring of bolts round the layer's front edge
    for (let x = -hx + 1.2; x < hx - 1; x += 2.2) for (const z of [-hz + 0.9, hz - 0.9]) out.push(cub("hull-grey-dark", [x - 0.16, x + 0.16], [y1, y1 + 0.4], [z - 0.16, z + 0.16]));
  });
  // spacer struts between layers: eight columns each, with a clevis at each end
  for (const i of [0, 1]) {
    const a = layerY(i)[1];
    const b = layerY(i + 1)[0];
    const hx = BOW_LAYERS[i + 1].hx;
    const hz = BOW_LAYERS[i + 1].hz;
    for (const x of [-hx + 3, -hx / 3, hx / 3, hx - 3]) for (const z of [-hz + 3, hz - 3]) out.push(rod("hull-grey", [x, a, z], [x, b, z], 0.45, 8), rod("hull-grey-dark", [x, a, z], [x, a + 0.35, z], 0.7, 8), rod("hull-grey-dark", [x, b - 0.35, z], [x, b, z], 0.7, 8));
  }
  // the front: four steerable ranging apertures (a gimbal ring, a tilted lens), six retracted optical heads in recesses, a nav light row
  const yF = layerY(2)[1] + 0.35;
  const lay = BOW_LAYERS[2];
  for (const [x, z] of [[-5, 4], [5, 4], [-5, -4], [5, -4]] as const) {
    // the outer tube is the tip of the bow, so the coarse level keeps it and the hull stays the same length
    out.push(ringAt("hull-grey", x, z, 1.6, yF, 0.3), ringAt("hull-orange", x, z, 2.2, yF - 0.1, 0.18), tubeAt("glass", x, z, 1.1, yF - 0.2, yF + 0.4, { segs: 14 }), tubeAt("bell-inside", x + 0.2, z, 0.5, yF + 0.4, yF + 0.7, { segs: 10, outline: true }));
    out.push(cub("hull-grey-dark", [x - 0.2, x + 0.2], [yF - 0.4, yF + 0.2], [z + 1.7, z + 2.4]), cub("lamp-amber", [x - 0.15, x + 0.15], [yF, yF + 0.2], [z - 2.4, z - 2]));
  }
  for (let k = 0; k < 6; k++) {
    const x = -lay.hx + 2.5 + k * 3.6;
    out.push(tubeAt("hull-grey-dark", x, 0, 0.9, yF - 0.1, yF + 0.1, { segs: 10 }), tubeAt("glass", x, 0, 0.55, yF + 0.1, yF + 0.45, { segs: 10 }));
  }
  out.push(...[-1, 1].flatMap((s) => lamp({ n: "y", sign: 1, at: yF, a: [-lay.hz, lay.hz], b: [-lay.hx, lay.hx] }, s * (lay.hz - 1), lay.hx - 1, "amber", 0.2)));
  // side apertures: two on each flank of the first layer, each a recessed lens in a frame, so a damaged front still leaves the ship its eyes
  const l0 = BOW_LAYERS[0];
  for (const s of [-1, 1] as const)
    for (const y of [Y0 + 4, Y0 + 9]) {
      const f = { n: "x" as const, sign: s, at: s * l0.hx, a: [Y0, Y0 + 12] as const, b: [-l0.hz, l0.hz] as const };
      if (cut && s === 1) continue;
      out.push(...frame(f, y, 0, 2.2, 2.2, 0.4, 0.4, "hull-grey-dark"), on(f, y, 0, 2, 2, 0, 0.1, "glass"), on(f, y, 0, 0.7, 0.7, 0.1, 0.4, "lamp-blue"));
    }
  // the two debris-intercept mounts: a turret on the dorsal and the ventral face of the middle layer, a pair of barrels each, and a service hatch
  const l1 = BOW_LAYERS[1];
  const y1 = layerY(1);
  for (const s of [1, -1] as const) {
    const z = s * l1.hz;
    out.push(cub("hull-grey-dark", [-2.6, 2.6], [y1[0] + 1, y1[1] - 1], [z, z + s * 1.4]), cub("hull-orange", [-2.4, 2.4], [y1[0] + 1.2, y1[1] - 1.2], [z + s * 1.4, z + s * 1.8]));
    for (const x of [-1, 1]) out.push(rod("hull-grey", [x, y1[0] + 2, z + s * 2.6], [x, y1[1] + 3, z + s * 2.6], 0.34, 8), rod("bell-inside", [x, y1[1] + 3, z + s * 2.6], [x, y1[1] + 3.15, z + s * 2.6], 0.22, 8), ringAt("hull-grey-dark", x, z + s * 2.6, 0.45, y1[0] + 4, 0.1));
    out.push(cub("hull-grey-dark", [-1.8, 1.8], [y1[0] + 1.6, y1[0] + 3.4], [z + s * 1.8, z + s * 2.8]));
  }
  out.push(...marking(designation(marks), { at: [-l0.hx - 0.2, Y0 + 6, -4], right: [0, 0, 1], up: [0, 1, 0], height: 1.35, align: "middle" }, conceptStyle("goldman")));
  out.push(...lightPool({ o: [-l0.hx - 0.12, Y0 + 6, -7], u: [0, 0, 1], v: [0, 1, 0], w: [-1, 0, 0] }, 5.5));
  out.push(...lampHalo("port", [-72, 270, 22]), ...lampHalo("starboard", [72, 154, 22]), ...lampHalo("strobe", [0, 210, 36]), ...beaconLamp([0, 374, 6]));
  out.push(...lightPool({ o: [0, 268, 30], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, 20));
  out.push(...collar("L", Y0, -1));
  return out;
}
