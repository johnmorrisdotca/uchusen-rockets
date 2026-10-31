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
    if (record.joints.bottom) assert.equal(record.joints.bottom.y, 0, record.id);
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
    assert.equal(record.trueTo.length, 1, `${record.id}: a model is true to its one version`);
  }
});
