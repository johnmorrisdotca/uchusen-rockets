// The rockets drawn wholly by this package's code: each is drawn to its sourced height, its engines are the sourced count, and each part has the record every part has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { check, figureWords, partEntry, ROCKETS, variantOf } from "../src/index.ts";
import type { Piece } from "../src/model/pieces.ts";
import { build, buildPart } from "../src/build/index.ts";

const BELL = (piece: Piece) => piece.kind === "lathe" && piece.material === "bell";
const bells = (id: string) => (partEntry(id)?.pieces() ?? []).filter(BELL).length;

test("Falcon 1 is SpaceX's guide's size, with the other figures kept beside it", () => {
  const f = variantOf("falcon-1", "falcon-1");
  assert.equal(f?.facts.height.value, 21.3);
  assert.deepEqual(f?.facts.height.others?.map((other) => other.value), [21, 22.25]);
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1" }).size?.height, 21.3);
  assert.equal(f?.facts.parts["first-stage"].value, null);
  assert.equal(bells("falcon-1-falcon-1-first-stage"), 1);
  assert.equal(bells("falcon-1-falcon-1-second-stage"), 1);
  assert.equal(partEntry("falcon-1-falcon-1-fairing")?.record.height, 3.5);
  assert.ok(Math.abs((buildPart("falcon-1-falcon-1-fairing").bounds.max[0] ?? 0) - 0.77) < 0.01, "1.54 m across, narrower than the stages");
});

test("Falcon 1e says it was announced and never flew", () => {
  const e = variantOf("falcon-1", "falcon-1e");
  assert.equal(e?.status, "announced");
  assert.equal(figureWords(e?.firstFlight), "Never flew");
  assert.equal(figureWords(e?.facts.height, " m"), "27.4 m, announced");
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1e" }).size?.height, 27.4);
});

test("Cargo Dragon 2 is Dragon 2's sizes with no windows, painted by this package's own code", () => {
  const glass = (id: string) => (partEntry(id)?.pieces() ?? []).filter((piece) => piece.kind === "plate" && piece.material === "glass").length;
  assert.equal(glass("dragon-dragon-2-capsule"), 4);
  assert.equal(glass("dragon-cargo-dragon-2-capsule"), 0);
  assert.equal(partEntry("dragon-cargo-dragon-2-capsule")?.record.painted, null);
  assert.equal(variantOf("dragon", "cargo-dragon-2")?.firstFlight.value, "2020-12-06");
  assert.ok(Math.abs((check({ rocket: "dragon", variant: "cargo-dragon-2" }).size?.height ?? 0) - 8.1) < 0.01);
});

test("Falcon 9 Block 4 has no sizes of its own in any source read, so it is not listed apart", () => {
  assert.ok(!ROCKETS["falcon-9"].variants.some((variant) => /block-4/.test(variant.id)));
  assert.match(variantOf("falcon-9", "ft")?.note ?? "", /Block 4/);
  assert.ok(variantOf("falcon-9", "ft")?.facts.height.others?.some((other) => other.value === 71));
});

test("Saturn V is its sourced stages, and its parts add to its sourced height", () => {
  const report = check({ rocket: "saturn-v" });
  assert.ok(Math.abs((report.size?.height ?? 0) - 110.64) < 0.01, String(report.size?.height));
  assert.equal(partEntry("saturn-v-saturn-v-first-stage")?.record.height, 42.06);
  assert.equal(partEntry("saturn-v-saturn-v-third-stage")?.record.diameter, 6.6);
  assert.equal(bells("saturn-v-saturn-v-first-stage"), 5);
  assert.equal(bells("saturn-v-saturn-v-second-stage"), 5);
  assert.equal(bells("saturn-v-saturn-v-third-stage"), 1);
  assert.equal(variantOf("saturn-v")?.facts.parts["escape-tower"].value, null);
});

test("the Space Shuttle stands as sourced: the tank's top at the stack's height, its parts their articles' lengths", () => {
  const report = check({ rocket: "space-shuttle" });
  assert.equal(report.size?.height, 56);
  assert.deepEqual(report.parts.map(({ part }) => part.height), [46.88, 45.46, 45.46, 37.24]);
  assert.equal(partEntry("space-shuttle-stack-orbiter")?.record.diameter, 23.79);
  assert.equal(bells("space-shuttle-stack-orbiter"), 3);
  assert.equal(bells("space-shuttle-stack-srb-left"), 1);
  const stack = build({ rocket: "space-shuttle" });
  assert.ok(Math.abs(stack.boundsOf("orbiter").max[0] - 23.79 / 2) < 0.01, "the wingspan");
  assert.ok(stack.placesOf("together").every((place) => place.shown));
  const alone = stack.placesOf("orbiter").find((place) => place.shown);
  assert.deepEqual(alone?.at, [0, 0, 0], "alone it stands on the ground at the middle");
  assert.match(variantOf("space-shuttle")?.note ?? "", /No name, flag or mark/);
});

const WHOLE_HEIGHTS: readonly (readonly [string, string, number])[] = [
  ["sls", "block-1", 98.15],
];

test("each rocket's parts add up to its sourced whole, and its engines are the sourced count", () => {
  for (const [rocket, variant, height] of WHOLE_HEIGHTS) {
    assert.equal(variantOf(rocket, variant)?.facts.height.value, height, rocket);
    assert.ok(Math.abs((check({ rocket, variant }).size?.height ?? 0) - height) < 0.01, `${rocket} ${variant}: ${check({ rocket, variant }).size?.height}`);
  }
  assert.equal(bells("sls-block-1-first-stage"), 4);
  assert.equal(partEntry("sls-block-1-first-stage")?.record.height, 64.6);
  assert.equal(partEntry("sls-block-1-srb-left")?.record.height, 53.95);
});

test("no code-made rocket is labelled as a custom build, and each comes apart and alone", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const report = check({ rocket: rocket.id, variant: variant.id });
      assert.ok(report.ok, `${variant.id}: ${report.issues.map((issue) => issue.message).join(" ")}`);
      assert.equal(report.custom, false, variant.id);
      const built = build({ rocket: rocket.id, variant: variant.id });
      for (const show of built.shows) assert.ok(built.boundsOf(show).max[1] > 0, `${variant.id} ${show}`);
    }
});
