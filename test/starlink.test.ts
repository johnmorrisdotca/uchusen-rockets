// Starlink v1.5 and v2 mini: the filing's bus, arrays and debris-software mass. A size the filing does not give stays blank.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/index.ts";

const bus = (id: string) => variantOf("starlink", id);

test("v1.5 is one array and v2 mini is two, from the filing, and the thickness and the whole height stay blank", () => {
  const v15 = bus("v1-5");
  const mini = bus("v2-mini");
  assert.ok(v15 && mini);
  assert.equal(v15.facts.sizes?.["Bus length"]?.value, 2.8);
  assert.equal(v15.facts.sizes?.["Bus width"]?.value, 1.3);
  assert.equal(v15.facts.sizes?.["Solar array length"]?.value, 8.1);
  assert.equal(v15.facts.sizes?.["Solar array width"]?.value, 2.8);
  assert.equal(v15.facts.more.arrays?.value, 1);
  assert.equal(v15.facts.more.mass?.value, 303);
  assert.equal(v15.facts.more.thickness?.value, null);
  assert.equal(v15.facts.height.value, null);
  assert.equal(v15.facts.diameter.value, null);
  assert.equal(mini.facts.sizes?.["Bus length"]?.value, 4.1);
  assert.equal(mini.facts.sizes?.["Bus width"]?.value, 2.7);
  assert.equal(mini.facts.sizes?.["Solar array length"]?.value, 12.8);
  assert.equal(mini.facts.sizes?.["Solar array width"]?.value, 4.1);
  assert.equal(mini.facts.more.arrays?.value, 2);
  assert.equal(mini.facts.more.mass?.value, 800);
  assert.equal(mini.facts.more.thickness?.value, null);
  assert.equal(ROCKETS.starlink.maker, "spacex");
  assert.equal(ROCKETS.starlink.country.value, "US");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "starlink"), false);
});

test("the drawing is the filing's plates, one wing or two, and the code-made mesh stays small", () => {
  const v15 = build({ rocket: "starlink", variant: "v1-5" });
  const mini = build({ rocket: "starlink", variant: "v2-mini" });
  const span = (built: ReturnType<typeof build>) => built.boundsOf("together").max[0] - built.boundsOf("together").min[0];
  const tall = (built: ReturnType<typeof build>) => built.boundsOf("together").max[1] - built.boundsOf("together").min[1];
  assert.ok(Math.abs(span(v15) - (1.3 + 8.1)) < 0.02);
  assert.ok(Math.abs(tall(v15) - 2.8) < 0.02);
  assert.equal(v15.parts[0]?.pieces.filter((piece) => piece.kind === "plate" && piece.material === "solar").length, 1);
  assert.ok(Math.abs(span(mini) - (2.7 + 12.8 * 2)) < 0.02);
  assert.ok(Math.abs(tall(mini) - 4.1) < 0.02);
  assert.equal(mini.parts[0]?.pieces.filter((piece) => piece.kind === "plate" && piece.material === "solar").length, 2);
  for (const built of [v15, mini]) {
    assert.equal(built.parts[0]?.record.painted, null);
    assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
    assert.ok(built.svg({ look: "painted" }).startsWith("<svg"));
    assert.ok(built.glb().bytes.length < 600 * 1024);
    assert.equal(built.flamesOf("together").length, 0);
  }
});
