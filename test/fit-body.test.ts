// The default fit: a craft is shown whole, and a part that names a fit width is framed narrower. No built-in craft names one, so Juno's 20 m arrays are all inside the frame, and every painted model is inside the 3D frame too (a part's `reach` widens that frame, not the drawing).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/rockets.ts";
import { fitBox } from "../src/fitBox.ts";
import { type Vec3, frameFor, FOV_DEG, PICTURE_H, PICTURE_W, VIEW_NAMES, VIEWS } from "../src/index.ts";
import { axesOf, directionOf } from "../src/framing.ts";

test("Juno and Europa Clipper are shown whole by default: every corner of them is inside the frame, in every view", () => {
  for (const rocket of ["juno", "europa-clipper"] as const) {
    const craft = build({ rocket, variant: rocket });
    assert.equal(craft.fitWidthOf("together"), null);
    const { min, max } = craft.frameOf("together");
    assert.ok(max[0] - min[0] > 20, `${rocket}: the arrays span more than 20 m`);
    for (const view of ["three-quarter", "front", "side"] as const) {
      const frame = frameFor(min, max, VIEWS[view], PICTURE_W / PICTURE_H);
      const { right, up, forward } = axesOf(directionOf(VIEWS[view]));
      const tan = Math.tan((FOV_DEG * Math.PI) / 360);
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          for (const z of [min[2], max[2]]) {
            const q: Vec3 = [x - frame.position[0], y - frame.position[1], z - frame.position[2]];
            const depth = q[0] * forward[0] + q[1] * forward[1] + q[2] * forward[2];
            const across = Math.abs(q[0] * right[0] + q[1] * right[1] + q[2] * right[2]) / (depth * tan);
            const high = Math.abs(q[0] * up[0] + q[1] * up[1] + q[2] * up[2]) / (depth * tan);
            assert.ok(across <= PICTURE_W / PICTURE_H + 1e-6, `${rocket} ${view}: a corner is ${across.toFixed(2)} across`);
            assert.ok(high <= 1 + 1e-6, `${rocket} ${view}: a corner is ${high.toFixed(2)} high`);
          }
    }
  }
});

test("only a part that names a fit width is framed narrower, and the height is never cut", () => {
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], 12), { min: [-6, 0, -6], max: [6, 3.5, 6] });
  assert.deepEqual(fitBox([-2, 0, -2], [2, 5, 2], 12), { min: [-2, 0, -2], max: [2, 5, 2] });
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], null), { min: [-10, 0, -10], max: [10, 3.5, 10] });
  for (const [rocket, variant] of [["juno", "juno"], ["jwst", "jwst"], ["voyager", "voyager"], ["parker-solar-probe", "parker-solar-probe"], ["starship", "v3"], ["hubble", "hubble"]] as const) assert.equal(build({ rocket, variant }).fitWidthOf("together"), null, rocket);
});

// A painted model can stand taller or reach deeper than the plain line shape the fit is taken from. Walks every rocket and variant, not a list kept by hand: a craft added later that has a model past its frame fails here.
test("the default frame holds every painted model whole, for every variant, in every view", async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const cache = new Map<string, Float32Array>();
  // a model's vertices in the part's own coordinates, as the viewer places the file: the scene graph's own transforms applied
  const verticesOf = async (file: string): Promise<Float32Array> => {
    const known = cache.get(file);
    if (known) return known;
    const doc = await io.readBinary(new Uint8Array(readFileSync(`models/${file}`)));
    const out: number[] = [];
    const point: number[] = [0, 0, 0];
    for (const node of doc.getRoot().listNodes()) {
      const matrix = node.getWorldMatrix();
      for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
        const positions = primitive.getAttribute("POSITION");
        if (!positions) continue;
        for (let i = 0; i < positions.getCount(); i++) {
          const [x, y, z] = positions.getElement(i, point);
          for (let c = 0; c < 3; c++) out.push(matrix[c] * x + matrix[4 + c] * y + matrix[8 + c] * z + matrix[12 + c]);
        }
      }
    }
    const all = new Float32Array(out);
    cache.set(file, all);
    return all;
  };
  const aspect = PICTURE_W / PICTURE_H;
  const tan = Math.tan((FOV_DEG * Math.PI) / 360);
  const cut: string[] = [];
  let walked = 0;
  for (const [rocket, entry] of Object.entries(ROCKETS))
    for (const variant of entry.variants) {
      const built = build({ rocket, variant: variant.id });
      const shown = built.placesOf("together").filter((place) => place.shown);
      const painted = shown.flatMap((place) => {
        const part = built.parts.find((one) => one.slot === place.slot);
        return part?.record.painted ? [{ file: part.record.painted.file, at: place.at, slot: place.slot }] : [];
      });
      if (painted.length === 0) continue;
      walked++;
      const whole = built.frameOf("together");
      const fit = fitBox(whole.min, whole.max, built.fitWidthOf("together"));
      for (const view of VIEW_NAMES) {
        const frame = frameFor(fit.min, fit.max, VIEWS[view], aspect);
        const { right, up, forward } = axesOf(directionOf(VIEWS[view]));
        let worst = 0;
        let where = "";
        for (const { file, at, slot } of painted) {
          const v = await verticesOf(file);
          for (let i = 0; i < v.length; i += 3) {
            const q: Vec3 = [v[i] + at[0] - frame.position[0], v[i + 1] + at[1] - frame.position[1], v[i + 2] + at[2] - frame.position[2]];
            const depth = q[0] * forward[0] + q[1] * forward[1] + q[2] * forward[2];
            const across = Math.abs(q[0] * right[0] + q[1] * right[1] + q[2] * right[2]) / (depth * tan) / aspect;
            const high = Math.abs(q[0] * up[0] + q[1] * up[1] + q[2] * up[2]) / (depth * tan);
            const over = Math.max(across, high);
            if (over > worst) {
              worst = over;
              where = slot;
            }
          }
        }
        if (worst > 1 + 1e-6) cut.push(`${rocket}/${variant.id} ${view}: ${where} reaches ${(worst * 100).toFixed(0)}% of the frame`);
      }
    }
  assert.ok(walked > 20, `${walked} variants with a painted model were walked`);
  assert.deepEqual(cut, [], "a painted model is cut off by the default frame: name the box it fills as the part's reach");
});

test("a part's reach widens the 3D frame only: the box the drawing, the poster and the compare page size by stays the plain shape", () => {
  for (const rocket of ["cassini", "europa-clipper"] as const) {
    const craft = build({ rocket, variant: rocket });
    const [part] = craft.parts;
    assert.ok(part.reach, `${rocket} names a reach`);
    const plain = craft.boundsOf("together");
    const frame = craft.frameOf("together");
    for (let c = 0; c < 3; c++) {
      assert.ok(Math.abs(plain.max[c] - plain.min[c] - (part.bounds.max[c] - part.bounds.min[c])) < 1e-9, `${rocket}: the sized box is the plain shape's, on axis ${c}`);
      assert.ok(frame.min[c] <= plain.min[c] + 1e-9 && frame.max[c] >= plain.max[c] - 1e-9, `${rocket}: the frame holds the plain box, on axis ${c}`);
    }
    assert.ok(frame.max[2] - frame.min[2] > 2 * (plain.max[2] - plain.min[2]), `${rocket}: the frame is far deeper than the plain shape`);
  }
  assert.deepEqual(build({ rocket: "starship", variant: "v3" }).frameOf("together"), build({ rocket: "starship", variant: "v3" }).boundsOf("together"));
});
