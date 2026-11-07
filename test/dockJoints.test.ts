// A visiting craft is held by a deep truss and a short port, not by one thin rod.
import assert from "node:assert/strict";
import { test } from "node:test";
import { deepTruss, dockingPort, TRUSS_DEEP } from "../src/model/fleet/dockJoints.ts";

const adapterLength = (asked: number): number => {
  const tube = dockingPort("M", asked).find((piece) => piece.kind === "lathe" && piece.material === "hull-white");
  assert.ok(tube && tube.kind === "lathe");
  const ys = tube.profile.map((point) => point[1]);
  return Math.max(...ys) - Math.min(...ys);
};

test("a docking port's adapter stays between 1 and 3 m", () => {
  assert.ok(adapterLength(9) <= 3 && adapterLength(9) >= 2.9);
  assert.ok(adapterLength(0.2) <= 1.05 && adapterLength(0.2) >= 0.95);
});

test("a long reach is four chords of a deep truss", () => {
  assert.ok(TRUSS_DEEP >= 3);
  const pieces = deepTruss([0, 0, 0], [24, 0, 0], TRUSS_DEEP);
  const long = pieces.filter((piece) => piece.kind === "plate" && piece.thickness > 10);
  assert.ok(long.length >= 4);
  const off = Math.max(...pieces.filter((piece) => piece.kind === "plate").map((piece) => Math.hypot(piece.frame.o[1], piece.frame.o[2])));
  assert.ok(off >= TRUSS_DEEP / 2 - 0.3);
});
