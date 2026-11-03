// A figure names its source or is blank; a variant goes in only if a source documents it; a disagreement keeps the choice and says what else was said.
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Figure, figureWords, MAKERS, PLANNED_ROCKETS, ROCKETS, SOURCES, variantOf } from "../src/index.ts";

const figuresOf = (rocket: string, id: string): [string, Figure<number | string>][] => {
  const v = variantOf(rocket, id);
  assert.ok(v);
  const f = v.facts;
  return [["height", f.height], ["diameter", f.diameter], ["first", v.firstFlight], ...Object.entries(f.parts), ...Object.entries(f.engines), ...Object.entries(f.more), ...Object.entries(f.sizes ?? {})] as [string, Figure<number | string>][];
};

test("no variant's first flight or sizes come from nowhere: the dates are the launch list's", () => {
  for (const id of ["v1-flight1", "v1", "v2", "v3"]) assert.equal(variantOf("starship", id)?.firstFlight.source, "wikipedia-launches", id);
});

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

test("a date cannot be misread: Starship's first flight is Block 1's, without the ring; the ring's first is its own", () => {
  const flight1 = variantOf("starship", "v1-flight1")?.firstFlight;
  const v1 = variantOf("starship", "v1")?.firstFlight;
  assert.equal(flight1?.value, "2023-04-20");
  assert.equal(figureWords(flight1), "2023-04-20, Starship's first flight");
  assert.equal(v1?.value, "2023-11-18");
  assert.equal(figureWords(v1), "2023-11-18, first with the ring");
  assert.match(v1?.note ?? "", /2023-04-20/);
  assert.match(variantOf("starship", "v1")?.name ?? "", /vented ring/);
  assert.equal(variantOf("starship", "v2")?.firstFlight.value, "2025-01-16");
  assert.equal(variantOf("starship", "v3")?.firstFlight.value, "2026-05-22");
  // in order of flight
  const flown = ROCKETS.starship.variants.filter((variant) => variant.status === "flown").map((variant) => variant.firstFlight.value as string);
  assert.deepEqual(flown, [...flown].sort());
});

test("an announced figure says so wherever it is shown", () => {
  const v4 = variantOf("starship", "v4");
  assert.equal(v4?.status, "announced");
  assert.equal(figureWords(v4?.facts.height, " m"), "142 m, announced, an estimate");
  assert.equal(figureWords(v4?.facts.parts.booster, " m"), "81 m, announced");
  assert.equal(figureWords(v4?.facts.parts.ship, " m"), "61 m, announced");
  assert.equal(figureWords(v4?.firstFlight), "Not flown");
  assert.match(v4?.note ?? "", /not a measurement/);
  for (const flown of ["v1", "v2", "v3"]) assert.ok(!figureWords(variantOf("starship", flown)?.facts.height, " m").includes("announced"), flown);
});

test("a stated height its parts do not add to says so beside the number", () => {
  assert.equal(figureWords(variantOf("starship", "v1-flight1")?.facts.height, " m"), "121 m, as stated; its parts add to 119.3 m");
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

test("Falcon 9's versions are those the sources document, each with its own height, and Block 4 is not listed apart", () => {
  const ids = ROCKETS["falcon-9"].variants.map((variant) => variant.id);
  assert.deepEqual(ids, ["v1.0", "v1.0-dragon", "v1.1", "ft", "block-5", "block-5-dragon-2"]);
  assert.deepEqual(ids.slice(0, 5).map((id) => variantOf("falcon-9", id)?.facts.height.value), [54.9, 47.8, 68.4, 69.8, 69.8]);
  // the rounded figures are kept as what else was said, and say why
  assert.ok(variantOf("falcon-9", "block-5")?.facts.height.others?.some((other) => other.value === 70 && /rounds/.test(other.note)));
  assert.ok(variantOf("falcon-9", "v1.0")?.facts.height.others?.some((other) => other.value === 53));
  assert.equal(variantOf("falcon-9", "block-5")?.facts.height.source, "wikipedia-falcon-9-block-5");
  assert.match(variantOf("falcon-9", "ft")?.note ?? "", /Block 4/);
});

test("Dragon 1 is labelled as what the model shows, not as the later Cargo Dragon", () => {
  const d1 = variantOf("dragon", "dragon-1");
  assert.match(d1?.note ?? "", /not the later Cargo Dragon 2/);
  assert.equal(d1?.facts.height.value, 6.1);
  assert.equal(variantOf("dragon", "dragon-2")?.facts.height.value, 8.1);
  assert.equal(figureWords(variantOf("grasshopper", "grasshopper")?.firstFlight), "2012-09-21, a 1.8 m hop");
});

test("every rocket says whose it is, from a known source; a site has a blank, not a guess; every maker has something to show", () => {
  for (const rocket of Object.values(ROCKETS)) {
    assert.ok(Object.hasOwn(MAKERS, rocket.maker), rocket.id);
    if (rocket.maker === "sites") {
      assert.equal(rocket.madeBy.value, null, rocket.id);
      assert.equal(rocket.madeBy.source, null, rocket.id);
    } else {
      assert.ok(rocket.madeBy.value, rocket.id);
      assert.ok(rocket.madeBy.source && Object.hasOwn(SOURCES, rocket.madeBy.source), rocket.id);
    }
  }
  for (const maker of Object.keys(MAKERS)) assert.ok(Object.values(ROCKETS).some((rocket) => rocket.maker === maker), maker);
  assert.deepEqual(Object.values(ROCKETS).filter((rocket) => rocket.maker === "sites").map((rocket) => rocket.id).sort(), ["droneship", "landing-zone", "launch-tower", "starbase"]);
});
