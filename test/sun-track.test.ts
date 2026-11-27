import assert from "node:assert/strict";
import test from "node:test";
import { trackAngle } from "../src/model/fleet/sunTrack.ts";

const near = (got: number, want: number) => assert.ok(Math.abs(got - want) < 0.05, `${got} against ${want}`);

test("a face about the ship's vertical turns toward the sun", () => {
  const up: [number, number, number] = [0, 1, 0];
  const ahead: [number, number, number] = [0, 0, 1];
  near(trackAngle(ahead, up, ahead), 0);
  near(trackAngle([1, 0, 0], up, ahead), 90);
  near(trackAngle([-1, 0, 0], up, ahead), -90);
  assert.ok(Math.abs(Math.abs(trackAngle([0, 0, -1], up, ahead)) - 180) < 0.05);
  near(trackAngle(up, up, ahead), 0);
  near(trackAngle([0, 0, 1], up, [1, 0, 0]), -90);
  near(trackAngle([1, 0, 0], up, [1, 0, 0]), 0);
});
