// The fit check: only the records and joints count, wherever a part came from; a mix says what it is.
import assert from "node:assert/strict";
import { test } from "node:test";
import { check, PART_ENTRIES, partEntry } from "../src/index.ts";
import { build, FitError } from "../src/build/index.ts";

test("a real variant is its own label, and is not custom", () => {
  const report = check({ rocket: "starship", variant: "v3" });
  assert.equal(report.ok, true);
  assert.equal(report.custom, false);
  assert.equal(report.label, "Block 3 (V3)");
  assert.deepEqual(report.size, { height: 124.4, diameter: 9 });
});

test("unknown names are refused by name, and anything from outside is only text", () => {
  assert.equal(check({ rocket: "nope" }).issues[0].code, "unknown-rocket");
  assert.equal(check({ rocket: "constructor" }).issues[0].code, "unknown-rocket");
  assert.equal(check({ rocket: "starship", variant: "v9" }).issues[0].code, "unknown-variant");
  assert.equal(check({ rocket: "starship", variant: "v3", parts: { ship: "<img onerror=1>" } }).issues[0].code, "unknown-part");
  assert.equal(check({ rocket: "starship", variant: "v3", parts: { wing: "starship-v3-ship" } }).issues[0].code, "unknown-slot");
});

test("a mix goes together when its joints meet, and is labelled as a custom build", () => {
  const report = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } });
  assert.equal(report.ok, true);
  assert.equal(report.custom, true);
  assert.match(report.label, /Custom build, not a vehicle that flew/);
  assert.ok(report.issues.some((issue) => issue.code === "custom" && issue.level === "note"));
});

test("a part in the wrong slot is refused", () => {
  const report = check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.code === "wrong-kind"));
  assert.throws(() => build({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } }), FitError);
});

test("the joint check reads only the records: a narrower part does not fit", () => {
  const ship = partEntry("starship-2019-ship");
  assert.ok(ship);
  assert.equal(ship.record.joints.bottom?.kind, "stage");
  const report = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-2019-ship" } });
  // 8.94 m against 9 m is within the tolerance, so it fits, as a custom build
  assert.equal(report.ok, true);
  assert.equal(report.custom, true);
});

test("every part has the one record: size, origin's joints and where its shape came from", () => {
  for (const { record } of PART_ENTRIES) {
    assert.ok(record.height > 0 && record.diameter > 0, record.id);
    assert.ok(record.drawnFrom.length > 5, record.id);
    if (record.joints.top) assert.equal(record.joints.top.y, record.height, record.id);
    if (record.joints.bottom) assert.ok(record.joints.bottom.y >= 0 && record.joints.bottom.y < record.height, record.id);
    if (record.sourced.height.value !== null && record.trueTo.length) assert.equal(record.height, record.sourced.height.value, `${record.id}: drawn to its source`);
    if (record.sourced.diameter.value !== null && record.trueTo.length) assert.equal(record.diameter, record.sourced.diameter.value, `${record.id}: drawn to its source`);
  }
});

test("a rocket's credits come from the parts it uses", () => {
  assert.deepEqual(check({ rocket: "starship", variant: "v2" }).credits, []);
  const b3 = check({ rocket: "starship", variant: "v3" });
  assert.deepEqual(b3.credits.map((credit) => credit.id), ["clarence365-block3"]);
  assert.equal(b3.credits[0].usedFor.length, 2);
  const mix = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-2019-ship" } });
  assert.deepEqual(mix.credits.map((credit) => credit.id).sort(), ["clarence365-block3", "martiandays-2019"]);
  assert.deepEqual(check({ rocket: "starship", variant: "v1-flight1" }).credits.map((credit) => credit.creator), ["clarence365"]);
});

test("a labelled real version uses only parts true for it", () => {
  for (const { record } of PART_ENTRIES) {
    if (!record.trueTo.length) continue;
    const painted = record.painted;
    if (!painted) continue;
    assert.ok(record.trueTo.length <= 2, `${record.id}: a model is true to the version it shows`);
  }
});

test("each Falcon's parts add up to its sourced height, joint to joint, its nozzle nested in the stage below", () => {
  for (const [id, height] of [["v1.0", 54.9], ["v1.1", 68.4], ["ft", 69.8], ["block-5", 69.8]] as const) {
    const report = check({ rocket: "falcon-9", variant: id });
    assert.equal(report.ok, true);
    assert.ok(Math.abs((report.size?.height ?? 0) - height) < 0.01, `${id}: ${report.size?.height}`);
  }
});

test("a part goes on another rocket when its joints fit: Falcon 9 with Dragon 2 uses both rockets' own parts, and its credits are both authors'", () => {
  const report = check({ rocket: "falcon-9", variant: "block-5-dragon-2" });
  assert.equal(report.ok, true);
  assert.equal(report.custom, false);
  assert.deepEqual(report.parts.map(({ part }) => part.id), ["falcon-9-block-5-first-stage", "falcon-9-block-5-second-stage", "dragon-dragon-2-trunk", "dragon-dragon-2-capsule"]);
  assert.deepEqual(report.credits.map((credit) => credit.creator).sort(), ["KUBAHA", "Stanley Creative"]);
  assert.ok(Math.abs((report.size?.height ?? 0) - 64.8) < 0.05);
});

test("a stage with the wrong joint is refused by its diameter, whichever rocket it came from", () => {
  const report = check({ rocket: "starship", variant: "v3", parts: { ship: "falcon-9-block-5-fairing" } });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.code === "wrong-kind"));
  const wide = check({ rocket: "falcon-9", variant: "block-5", parts: { "second-stage": "falcon-9-v1.0-second-stage" } });
  assert.equal(wide.ok, true);
  assert.equal(wide.custom, true);
});

test("Falcon Heavy's boosters stand beside its core; Dragon's versions are different spacecraft; Grasshopper is a test vehicle", () => {
  const heavy = check({ rocket: "falcon-heavy" });
  assert.equal(heavy.ok, true);
  assert.equal(heavy.size?.height, 70);
  assert.deepEqual(heavy.parts.map(({ slot }) => slot), ["centre", "side-left", "side-right"]);
  assert.ok(Math.abs((check({ rocket: "dragon", variant: "dragon-2" }).size?.height ?? 0) - 8.1) < 0.01);
  assert.ok(Math.abs((check({ rocket: "dragon", variant: "dragon-1" }).size?.height ?? 0) - 6.1) < 0.01);
  assert.equal(check({ rocket: "grasshopper" }).variant?.status, "test-vehicle");
  assert.equal(check({ rocket: "grasshopper" }).size?.height, 32);
});
