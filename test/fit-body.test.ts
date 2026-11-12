// The default fit: a craft is shown whole, and a part that names a fit width is framed narrower. No built-in craft names one, so Juno's 20 m arrays are all inside the frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { fitBox } from "../src/fitBox.ts";
import { type Vec3, frameFor, FOV_DEG, PICTURE_H, PICTURE_W, VIEWS } from "../src/index.ts";
import { axesOf, directionOf } from "../src/framing.ts";

test("Juno is shown whole by default: every corner of it is inside the frame, in every view", () => {
  const juno = build({ rocket: "juno", variant: "juno" });
  assert.equal(juno.fitWidthOf("together"), null);
  const { min, max } = juno.boundsOf("together");
  assert.ok(max[0] - min[0] > 20, "the arrays span more than 20 m");
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
          assert.ok(across <= PICTURE_W / PICTURE_H + 1e-6, `${view}: a corner is ${across.toFixed(2)} across`);
          assert.ok(high <= 1 + 1e-6, `${view}: a corner is ${high.toFixed(2)} high`);
        }
  }
});

test("only a part that names a fit width is framed narrower, and the height is never cut", () => {
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], 12), { min: [-6, 0, -6], max: [6, 3.5, 6] });
  assert.deepEqual(fitBox([-2, 0, -2], [2, 5, 2], 12), { min: [-2, 0, -2], max: [2, 5, 2] });
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], null), { min: [-10, 0, -10], max: [10, 3.5, 10] });
  for (const [rocket, variant] of [["juno", "juno"], ["jwst", "jwst"], ["voyager", "voyager"], ["parker-solar-probe", "parker-solar-probe"], ["starship", "v3"], ["hubble", "hubble"]] as const) assert.equal(build({ rocket, variant }).fitWidthOf("together"), null, rocket);
});
