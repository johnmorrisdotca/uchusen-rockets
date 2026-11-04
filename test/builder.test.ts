import assert from "node:assert/strict";
import { test } from "node:test";

import { builderState, check, PART_ENTRIES, ROCKETS } from "../src/index.ts";
import { build } from "../src/build/index.ts";

/** Every rocket the builder can be walked to, by every pick on every row. */
function everyState(): ReturnType<typeof builderState>[] {
  const seen = new Set<string>();
  const out: ReturnType<typeof builderState>[] = [];
  const walk = (picks: string[]) => {
    const state = builderState(picks);
    const key = state.rows.map((row) => row.chosen).join("|");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(state);
    state.rows.forEach((row, index) => {
      for (const option of row.options) if (option.id !== row.chosen) walk([...state.rows.slice(0, index).map((one) => one.chosen), option.id, ...state.rows.slice(index + 1).map((one) => one.chosen)]);
    });
  };
  walk([]);
  return out;
}

test("the bottom row offers something from every rocket, by the registry alone", () => {
  const rockets = new Set(builderState().rows[0].options.map((option) => option.rocket));
  for (const rocket of Object.values(ROCKETS)) assert.ok(rockets.has(rocket.name), rocket.id);
});

test("every rocket the builder can reach goes together: no pick on any row can make one that fails the check, or that will not draw", () => {
  const states = everyState();
  assert.ok(states.length > 100, `only ${states.length}`);
  for (const { description, report, rows } of states) {
    const key = JSON.stringify(description);
    assert.ok(report.ok, key);
    assert.equal(report.issues.filter((issue) => issue.level === "error").length, 0, key);
    assert.ok(check(description).ok, key);
    assert.ok(build(description).svg().startsWith("<svg"), key);
    assert.equal(rows.length, report.parts.length, key);
    assert.deepEqual(report.parts.map(({ part }) => part.id), rows.map((row) => row.chosen), key);
    if (report.custom) assert.match(report.label, /^Custom build, not a vehicle that flew/, key);
  }
});

test("a row with one answer is made for the reader; a real set of parts takes its real name", () => {
  const heavy = builderState(["falcon-heavy-falcon-heavy-centre"]);
  assert.deepEqual(heavy.rows.map((row) => row.auto), [false, true, true]);
  assert.equal(heavy.report.label, "Falcon Heavy");
  assert.equal(heavy.report.custom, false);
  assert.equal(builderState(["grasshopper-grasshopper-vehicle"]).rows.length, 1);
  // the parts of a variant, picked one by one, are that variant and not a custom build
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      // the fleet kit has its own way to put ships together
      if (rocket.id.startsWith("fleet-")) continue;
      const ids = check({ rocket: rocket.id, variant: variant.id }).parts.map(({ part }) => part.id);
      const state = builderState(ids);
      assert.equal(state.report.custom, false, `${rocket.id} ${variant.id}: ${state.report.label}`);
      assert.equal(state.report.variant?.id, variant.id, `${rocket.id} ${variant.id}`);
      assert.equal(state.description.parts, undefined, `${rocket.id} ${variant.id}`);
    }
});

test("a change lower down keeps what still fits and picks what belongs for the rest; a hostile pick gives way", () => {
  const mix = builderState(["starship-v3-booster", "starship-v2-ship"]);
  assert.equal(mix.report.custom, true);
  assert.deepEqual(mix.description, { rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } });
  // another booster: the ship still fits, so it stays
  assert.equal(builderState(["starship-v1-booster", "starship-v2-ship"]).rows[1].chosen, "starship-v2-ship");
  // a falcon's stage: the ship cannot sit on it, so its own second stage is offered
  const falcon = builderState(["falcon-9-ft-first-stage", "starship-v2-ship"]);
  assert.equal(falcon.rows[1].chosen, "falcon-9-ft-second-stage");
  assert.ok(falcon.report.ok);
  assert.equal(falcon.report.variant?.id, "ft");
  // nothing from a nine-metre stage is offered on a Falcon
  assert.ok(falcon.rows[1].options.every((option) => !option.id.startsWith("starship-")));
  const hostile = builderState(['"><script>alert(1)</script>', "constructor", "__proto__"]);
  assert.ok(hostile.report.ok);
  assert.ok(hostile.rows[0].options.some((option) => option.id === hostile.rows[0].chosen));
});

test("no part is left out that could stand somewhere: every part true to a rocket can be reached", () => {
  const reached = new Set(everyState().flatMap((state) => state.rows.map((row) => row.chosen)));
  for (const { record } of PART_ENTRIES) if (record.trueTo.length > 0 && !record.rocket.startsWith("fleet-")) assert.ok(reached.has(record.id), record.id);
});
