// A figure names its source or is blank; a variant goes in only if a source documents it; a disagreement keeps the choice and says what else was said.
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Figure, PLANNED_ROCKETS, ROCKETS, SOURCES, variantOf } from "../src/index.ts";

const figuresOf = (rocket: string, id: string): [string, Figure<number | string>][] => {
  const v = variantOf(rocket, id);
  assert.ok(v);
  const f = v.facts;
  return [["height", f.height], ["diameter", f.diameter], ["first", v.firstFlight], ...Object.entries(f.parts), ...Object.entries(f.engines), ...Object.entries(f.more)] as [string, Figure<number | string>][];
};

test("every figure names a known source, or is blank with no value", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants)
      for (const [name, figure] of figuresOf(rocket.id, variant.id)) {
        if (figure.value === null) assert.equal(figure.source, null, `${variant.id} ${name}`);
        else {
          assert.ok(figure.source, `${variant.id} ${name} has a value and no source`);
          assert.ok(Object.hasOwn(SOURCES, figure.source), `${variant.id} ${name}`);
        }
        for (const other of figure.others ?? []) {
          assert.ok(Object.hasOwn(SOURCES, other.source));
          assert.ok(other.note.length > 10, `${variant.id} ${name}: a disagreement says why`);
        }
      }
});

test("the block sizes are the sources' figures", () => {
  const size = (id: string) => {
    const f = variantOf("starship", id)?.facts;
    return [f?.height.value, f?.parts.booster?.value, f?.parts.ship?.value];
  };
  assert.deepEqual(size("v1"), [121.3, 71, 50.3]);
  assert.deepEqual(size("v2"), [123.1, 71, 52.1]);
  assert.deepEqual(size("v3"), [124.4, 72.3, 52.1]);
  assert.deepEqual(size("v4"), [142, 81, 61]);
  assert.equal(variantOf("starship", "v3")?.facts.diameter.value, 9);
});

test("a stack's parts add up to its height, or the difference is spelled out", () => {
  for (const id of ["v1", "v2", "v3", "v4"]) {
    const f = variantOf("starship", id)?.facts;
    assert.ok(Math.abs((f?.parts.booster.value as number) + (f?.parts.ship.value as number) - (f?.height.value as number)) < 0.01, id);
  }
  const flight1 = variantOf("starship", "v1-flight1");
  assert.match(flight1?.note ?? "", /1\.7 m/);
});

test("the 81 m booster is Block 4's, and Block 3 says why it was not used", () => {
  const b3 = variantOf("starship", "v3")?.facts.parts.booster;
  assert.equal(b3?.value, 72.3);
  assert.ok(b3?.others?.some((other) => other.value === 81 && /Block 4/.test(other.note)));
  assert.equal(variantOf("starship", "v4")?.facts.parts.booster.value, 81);
});

test("blanks stay blank", () => {
  assert.equal(variantOf("starship", "2019")?.facts.diameter.value, null);
  assert.equal(variantOf("starship", "v4")?.firstFlight.value, null);
  assert.equal(variantOf("starship", "v4")?.facts.more.gridFins.value, null);
});

test("the artist's model is labelled as one, ship only, separate from the flown blocks", () => {
  const v = variantOf("starship", "2019");
  assert.equal(v?.status, "artist-model");
  assert.match(v?.name ?? "", /artist's model/);
  assert.deepEqual(v?.slots, ["ship"]);
  assert.ok(ROCKETS.starship.variants.filter((variant) => variant.status === "flown").every((variant) => variant.id !== "2019"));
});

test("what is planned carries sourced facts, not shapes", () => {
  for (const rocket of PLANNED_ROCKETS) {
    assert.equal(rocket.status, "planned");
    assert.ok(rocket.height.source && rocket.diameter.source);
    assert.ok(!Object.hasOwn(ROCKETS, rocket.id));
  }
});
