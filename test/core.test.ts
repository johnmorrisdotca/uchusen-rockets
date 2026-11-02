import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanLook, cleanShow, cleanView, CROSSFADE_MS, DEFAULT_LOOK, DEFAULT_VIEW, directionOf, DRAWING_HOLD_MS, frameFor, MAX_PIXELS, MAX_SIDE, pixelRatioFor, placesFor, REDUCED_FADE_MS, revealDelay, showsOf, tiltMode, tiltTurn, turnedBy, VIEWS } from "../src/index.ts";

test("a hostile look, view or show falls back to the default", () => {
  assert.equal(cleanLook("<b>"), DEFAULT_LOOK);
  assert.equal(cleanLook("painted"), "painted");
  assert.equal(cleanView("constructor"), DEFAULT_VIEW);
  assert.equal(cleanShow("constructor", ["booster", "ship"]), "together");
  assert.equal(cleanShow("ship", ["booster", "ship"]), "ship");
  assert.equal(cleanShow("together", ["ship"]), "ship");
});

test("the shows: together, apart and each part, or only the part when there is one", () => {
  assert.deepEqual(showsOf(["booster", "ship"]), ["together", "apart", "booster", "ship"]);
  assert.deepEqual(showsOf(["ship"]), ["ship"]);
});

test("front looks at the windward side, back at the steel side, below from under", () => {
  assert.ok(directionOf(VIEWS.front)[2] > 0.99);
  assert.ok(directionOf(VIEWS.back)[2] < -0.99);
  assert.ok(directionOf(VIEWS.side)[0] > 0.99);
  assert.ok(directionOf(VIEWS.below)[1] < -0.9);
});

test("the camera holds the whole box, and a taller thing needs a farther camera", () => {
  const short = frameFor([-5, 0, -5], [5, 50, 5], VIEWS.front, 0.75);
  const tall = frameFor([-5, 0, -5], [5, 120, 5], VIEWS.front, 0.75);
  assert.ok(tall.distance > short.distance * 2);
  assert.deepEqual(short.target, [0, 25, 0]);
  assert.ok(short.position[2] > 0);
});

test("the crossfade: the drawing holds, reduced motion does not wait", () => {
  assert.equal(revealDelay(1000, 1100, false), DRAWING_HOLD_MS - 100);
  assert.equal(revealDelay(1000, 5000, false), 0);
  assert.equal(revealDelay(1000, 1100, true), 0);
  assert.ok(CROSSFADE_MS > REDUCED_FADE_MS);
});

test("tilt: asked for only where it must be, off under reduced motion or a mouse", () => {
  const base = { reducedMotion: false, coarsePointer: true, hasOrientation: true, needsPermission: false };
  assert.equal(tiltMode(base), "on");
  assert.equal(tiltMode({ ...base, needsPermission: true }), "ask");
  assert.equal(tiltMode({ ...base, reducedMotion: true }), "off");
  assert.equal(tiltTurn({ beta: null, gamma: 0 }, { beta: 0, gamma: 0 }), null);
});

test("the canvas is held to a pixel budget, whatever the screen", () => {
  assert.equal(pixelRatioFor(620, 827, 2), 2);
  assert.equal(pixelRatioFor(620, 827, 1), 1);
  assert.equal(pixelRatioFor(620, 827, 3), 2);
  for (const [w, h, ratio] of [[2560, 1440, 2], [5120, 2880, 2], [1, 10000, 2], [10000, 10000, 2], [800, 600, Number.NaN], [800, 600, 0], [0, 0, 2], [-5, 20, 2]] as const) {
    const r = pixelRatioFor(w, h, ratio);
    assert.ok(r >= 0.25 && r <= 2, `${w}x${h} at ${ratio}: ${r}`);
    if (w > 0 && h > 0 && r > 0.25) {
      assert.ok(w * r * (h * r) <= MAX_PIXELS * 1.0001, `${w}x${h} at ${ratio}: ${r}`);
      assert.ok(Math.max(w, h) * r <= MAX_SIDE * 1.0001, `${w}x${h} at ${ratio}: ${r}`);
    }
  }
  assert.equal(pixelRatioFor(800, 600, Number.NaN), 1);
});

test("a stack is placed by its joints", () => {
  const part = (id: string, height: number, top: boolean) => ({ slot: id, part: { id, height, joints: top ? { top: { kind: "stage", y: height, diameter: 9 } } : {} } }) as never;
  const places = placesFor([part("a", 70, true), part("b", 50, false)], "together", () => 5);
  assert.deepEqual(places.map((place) => place.at), [[0, 0, 0], [0, 70, 0]]);
});

test("the view controls turn and tip from the chosen view: a drag right carries the camera left, a tip lowers it, and it stays off the poles", () => {
  assert.deepEqual(turnedBy(VIEWS.front, 0, 0), VIEWS.front);
  assert.equal(turnedBy({ az: 32, el: 9 }, 40, 0).az, -8);
  assert.equal(turnedBy({ az: 32, el: 9 }, 0, 20).el, -11);
  assert.equal(turnedBy({ az: 0, el: 80 }, 0, -90).el, 87);
  assert.equal(turnedBy({ az: 0, el: -70 }, 0, 90).el, -87);
});
