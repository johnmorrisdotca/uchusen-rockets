// The default fit reads the body as well as the reach: Juno's thin 20 m arrays do not leave its body a speck in the frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { fitBox } from "../src/fitBox.ts";
import { FOV_DEG, frameFor, PICTURE_H, PICTURE_W, VIEWS } from "../src/index.ts";

/** How many pixels tall a 640-pixel picture draws the body of a craft `metres` tall, from the camera that holds the box. */
function bodyPixels(box: { min: [number, number, number]; max: [number, number, number] }, metres: number, view: keyof typeof VIEWS): number {
  const { distance } = frameFor(box.min, box.max, VIEWS[view], PICTURE_W / PICTURE_H);
  return (metres / (2 * distance * Math.tan((FOV_DEG * Math.PI) / 360))) * PICTURE_H;
}

test("Juno's body is at least 85 pixels tall in the default fit and at least one and a half times what holding the whole span gives", () => {
  const juno = build({ rocket: "juno", variant: "juno" });
  const whole = juno.boundsOf("together");
  const width = juno.fitWidthOf("together");
  assert.equal(width, 12);
  const body = juno.boundsOf("together").max[1];
  assert.equal(body, 3.5);
  for (const view of ["three-quarter", "front", "side"] as const) {
    const held = bodyPixels(fitBox(whole.min, whole.max, width), body, view);
    const all = bodyPixels(whole, body, view);
    assert.ok(held >= 85, `${view}: ${held.toFixed(0)} px`);
    assert.ok(held >= all * 1.5, `${view}: ${held.toFixed(0)} px against ${all.toFixed(0)} px when the arrays set the fit`);
  }
});

test("only a part that names a fit width is framed narrower, and the height is never cut", () => {
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], 12), { min: [-6, 0, -6], max: [6, 3.5, 6] });
  assert.deepEqual(fitBox([-2, 0, -2], [2, 5, 2], 12), { min: [-2, 0, -2], max: [2, 5, 2] });
  assert.deepEqual(fitBox([-10, 0, -10], [10, 3.5, 10], null), { min: [-10, 0, -10], max: [10, 3.5, 10] });
  for (const [rocket, variant] of [["jwst", "jwst"], ["voyager", "voyager"], ["parker-solar-probe", "parker-solar-probe"], ["starship", "v3"], ["hubble", "hubble"]] as const) assert.equal(build({ rocket, variant }).fitWidthOf("together"), null, rocket);
});

test("the drawing is fitted to the same box the 3D view frames", () => {
  const juno = build({ rocket: "juno", variant: "juno" });
  const svg = juno.svg({ look: "line" });
  assert.ok(svg.length > 0);
  // a part shown alone is a different box: the single craft part keeps its fit width
  assert.equal(juno.fitWidthOf("craft"), 12);
});
