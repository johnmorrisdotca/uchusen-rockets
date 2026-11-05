// The beam is a cone in both looks, a dotted line when motion is reduced, and it is gone once the part is home.
import assert from "node:assert/strict";
import test from "node:test";
import { tractorBeam } from "../src/beam.ts";
import { beamLight } from "../src/draw/beamLight.ts";
import { drawPart, perspective } from "../src/draw/svg.ts";
import { VIEWS } from "../src/framing.ts";
import type { Plate } from "../src/model/pieces.ts";

const ends = { from: [0, 0, 0] as [number, number, number], part: [0, 8, 0] as [number, number, number], slot: [0, 12, 0] as [number, number, number] };

const far = (plate: Plate): number => {
  const length = plate.outline[1]?.[0] ?? 0;
  return plate.frame.o[1] + plate.frame.u[1] * length;
};

test("a carry is a cone from the drone to the part, and both looks draw it", () => {
  const pieces = tractorBeam(ends, "carry");
  const plates = pieces.filter((piece): piece is Plate => piece.kind === "plate");
  assert.equal(plates.length, 24);
  assert.ok(plates.every((plate) => Math.abs(plate.frame.o[1]) < 0.2));
  assert.ok(plates.every((plate) => Math.abs(far(plate) - 8) < 0.01));
  const near = Math.max(...plates.map((plate) => Math.hypot(plate.frame.o[0], plate.frame.o[2])));
  const wide = Math.min(...plates.map((plate) => {
    const length = plate.outline[1]?.[0] ?? 0;
    return Math.hypot(plate.frame.o[0] + plate.frame.u[0] * length, plate.frame.o[2] + plate.frame.u[2] * length);
  }));
  assert.ok(wide > near);
  const cam = perspective({ min: [-2, -1, -2], max: [2, 10, 2] }, VIEWS.side);
  for (const look of ["line", "painted"] as const) {
    const svg = drawPart(pieces, [0, 0, 0], cam, look);
    assert.match(svg, /<(path|polygon|polyline)/);
  }
});

test("reduced motion is a dotted line with gaps, and no flash", () => {
  const solid = tractorBeam(ends, "attach");
  const dotted = tractorBeam(ends, "attach", true);
  assert.ok(dotted.length < solid.length);
  const lengths = dotted.filter((piece): piece is Plate => piece.kind === "plate").map((plate) => plate.outline[1]?.[0] ?? 0);
  assert.ok(lengths.reduce((sum, one) => sum + one, 0) < 8);
  assert.equal(dotted.some((piece) => piece.kind === "plate" && piece.material === "strobe"), false);
  assert.equal(solid.some((piece) => piece.kind === "plate" && piece.material === "strobe"), true);
});

test("the painted beam is light that fades out, brighter at the part", () => {
  const cam = perspective({ min: [-2, -1, -2], max: [2, 10, 2] }, VIEWS.side);
  const light = beamLight(ends.from, ends.part, 0.2, 1.2, cam, "painted", "t");
  assert.match(light, /data-beam="light"/);
  assert.match(light, /data-ring="1"/);
  assert.match(light, /data-spark="1"/);
  assert.match(light, /data-emitter="1"/);
  assert.match(light, /mix-blend-mode:screen/);
  assert.match(light, /stop-opacity="0"/);
  assert.match(light, /feGaussianBlur/);
  const quiet = beamLight(ends.from, ends.part, 0.2, 1.2, cam, "painted", "q", true);
  assert.match(quiet, /data-beam="still"/);
  assert.equal(quiet.includes("data-ring"), false);
  assert.equal(quiet.includes("data-spark"), false);
  const line = beamLight(ends.from, ends.part, 0.2, 1.2, cam, "line", "t");
  assert.match(line, /data-beam="line"/);
  assert.match(line, /fill="none"/);
});

test("the beam shortens as the part settles and is gone when the part is home", () => {
  const mid = tractorBeam(ends, "settle", false, 0.5).filter((piece): piece is Plate => piece.kind === "plate");
  assert.ok(Math.abs(far(mid[mid.length - 1]!) - 10) < 0.01);
  assert.equal(tractorBeam(ends, "settle", false, 1).length, 0);
});
