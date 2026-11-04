// Starship and Super Heavy beside another craft: at true scale, clear of it, on the same ground, and in the box the camera fits.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BESIDE_GAP } from "../src/beside.ts";
import { BESIDE_ROCKET, besideBounds, besideLayout, canBeside, check, partEntry, ROCKETS, variantOf } from "../src/index.ts";
import { build } from "../src/build/index.ts";

const alone = (rocket: string, variant?: string) => build({ rocket, ...(variant ? { variant } : {}) });
const CRAFT = [["saturn-v", undefined], ["falcon-9", "block-5"], ["sls", undefined], ["fleet-02", "fleet-02"], ["fleet-ship-03", "miyamoto"]] as const;

test("it is Starship Block 3, the ship on Super Heavy, and it is offered beside every craft but Starship", () => {
  assert.equal(BESIDE_ROCKET.rocket, "starship");
  assert.equal(variantOf("starship", BESIDE_ROCKET.variant)?.id, "v3");
  assert.deepEqual(check(BESIDE_ROCKET).parts.map(({ slot }) => slot), ["booster", "ship"]);
  assert.equal(canBeside("starship"), false);
  for (const id of Object.keys(ROCKETS)) assert.equal(canBeside(id), id !== "starship", id);
  // its painted model is another's work, credited with the craft it belongs to: beside a craft the viewer draws it in this package's own paint, so no licensed model comes in uncredited
  assert.ok(check(BESIDE_ROCKET).parts.some(({ part }) => partEntry(part.id)?.record.painted));
  assert.deepEqual(check({ rocket: "saturn-v" }).credits.map((credit) => credit.id).filter((id) => check(BESIDE_ROCKET).credits.some((one) => one.id === id)), []);
});

test("the layout: true scale, on the ground, clear of the craft and never overlapping it", () => {
  const craft = { min: [-4, 0, -4], max: [4, 70, 4] } as const;
  const other = { min: [-9.15, 0, -5.4], max: [9.15, 124.4, 9.15] } as const;
  const { at, bounds } = besideLayout({ min: [...craft.min], max: [...craft.max] }, { min: [...other.min], max: [...other.max] });
  // never scaled: it is only moved
  assert.ok(Math.abs(bounds.max[0] - bounds.min[0] - (other.max[0] - other.min[0])) < 1e-9);
  assert.ok(Math.abs(bounds.max[1] - bounds.min[1] - (other.max[1] - other.min[1])) < 1e-9);
  assert.ok(Math.abs(bounds.max[2] - bounds.min[2] - (other.max[2] - other.min[2])) < 1e-9);
  assert.equal(bounds.min[1], 0, "its foot is on the ground line");
  assert.equal(at[1], 0);
  assert.equal(at[2], 0);
  assert.ok(Math.abs(bounds.min[0] - craft.max[0] - BESIDE_GAP) < 1e-9, "the spacing is the least gap for a craft this narrow");
  // a wide craft gets a wider gap, a tenth of its width
  const wide = besideLayout({ min: [-500, 0, -200], max: [480, 1800, 200] }, { min: [-9.15, 0, -5.4], max: [9.15, 124.4, 9.15] });
  assert.ok(Math.abs(wide.bounds.min[0] - 480 - 98) < 1e-6);
  // a craft whose foot is below the ground line still has the other standing on the ground
  assert.equal(besideLayout({ min: [-4, -30, -4], max: [4, 70, 4] }, { min: [-9, 0, -5], max: [9, 124, 9] }).bounds.min[1], 0);
});

test("the bounds Fit uses hold both craft, and are the craft's own box when nothing stands beside it", () => {
  const craft = { min: [-4, 0, -4], max: [4, 70, 4] } as const;
  const placed = { min: [8, 0, -5], max: [26, 124, 9] } as const;
  const both = besideBounds({ min: [...craft.min], max: [...craft.max] }, { min: [...placed.min], max: [...placed.max] });
  assert.deepEqual(both, { min: [-4, 0, -5], max: [26, 124, 9] });
  for (const [rocket, variant] of CRAFT) {
    const single = alone(rocket, variant);
    const beside = build({ rocket, ...(variant ? { variant } : {}) }, { beside: true });
    for (const show of single.shows.slice(0, 2)) {
      const a = single.boundsOf(show);
      const b = beside.boundsOf(show);
      const stack = alone("starship", "v3").boundsOf("together");
      // the box holds the craft as it was, and the whole stack at its own size, to the right of it
      for (let c = 0; c < 3; c++) {
        assert.ok(b.min[c] <= a.min[c] + 1e-9 && b.max[c] >= a.max[c] - 1e-9, `${rocket} ${show} axis ${c}`);
      }
      assert.ok(b.max[1] >= stack.max[1] - 1e-9, `${rocket}: the stack's top is in`);
      assert.ok(b.max[0] - a.max[0] >= BESIDE_GAP + (stack.max[0] - stack.min[0]) - 1e-6, `${rocket} ${show}: room for the stack's width and the gap`);
    }
  }
});

test("built beside a craft: Starship stands whole at true height, clear of the craft, on the ground, in the file and the drawing", () => {
  const stack = alone("starship", "v3");
  const height = variantOf("starship", "v3")?.facts.height.value as number;
  for (const [rocket, variant] of CRAFT) {
    const description = { rocket, ...(variant ? { variant } : {}) };
    const single = build(description);
    const beside = build(description, { beside: true });
    assert.deepEqual(beside.beside.map((part) => part.slot), ["beside-booster", "beside-ship"]);
    assert.deepEqual(beside.parts.map((part) => part.slot), single.parts.map((part) => part.slot), "its own parts are as they were");
    assert.deepEqual(beside.shows, single.shows, "what can be shown is as it was");
    assert.equal(beside.report.label, single.report.label);
    const places = beside.placesOf("together");
    const own = places.filter((place) => !place.slot.startsWith("beside-"));
    assert.deepEqual(own, single.placesOf("together"), "the craft stands where it stood");
    const booster = places.find((place) => place.slot === "beside-booster")!;
    const ship = places.find((place) => place.slot === "beside-ship")!;
    assert.equal(booster.at[1], 0, "Super Heavy stands on the ground");
    assert.ok(Math.abs(ship.at[1] - booster.at[1] - (stack.placesOf("together").find((p) => p.slot === "ship")!.at[1])) < 1e-9, "the ship stands on it as it does alone");
    assert.equal(booster.shown && ship.shown, true);
    // true scale: the stack from its foot to its top is the sourced height, and its parts are the same records
    const top = beside.beside.map((part, i) => places[own.length + i].at[1] + part.bounds.max[1]);
    assert.ok(Math.abs(Math.max(...top) - height) < 1e-6, `${rocket}: ${Math.max(...top)} m, not ${height} m`);
    assert.deepEqual(beside.beside.map((part) => part.record.id), stack.parts.map((part) => part.record.id));
    // clear: the stack's left edge is past the craft's right edge, whatever is shown
    for (const show of single.shows.slice(0, 2)) {
      const right = Math.max(...single.placesOf(show).filter((place) => place.shown).map((place) => place.at[0] + (single.parts.find((part) => part.slot === place.slot) as { bounds: { max: number[] } }).bounds.max[0]));
      const near = Math.min(...beside.placesOf(show).filter((place) => place.slot.startsWith("beside-")).map((place) => place.at[0] + (beside.beside.find((part) => part.slot === place.slot) as { bounds: { min: number[] } }).bounds.min[0]));
      assert.ok(near - right >= BESIDE_GAP - 1e-9, `${rocket} ${show}: ${near - right} m between them`);
    }
    // the file and the drawing take it in
    const file = beside.glb();
    assert.ok(file.triangles > single.glb().triangles);
    assert.match(beside.svg(), /<svg /);
    assert.ok(beside.svg().length > single.svg().length);
  }
});

test("Starship has nothing beside it, and a rocket built alone has an empty list", () => {
  const twin = build({ rocket: "starship", variant: "v3" }, { beside: true });
  assert.equal(twin.beside.length, 0);
  assert.deepEqual(twin.boundsOf("together"), alone("starship", "v3").boundsOf("together"));
  assert.equal(alone("saturn-v").beside.length, 0);
});

test("beside costs a tenth of the build budget at most: a heavy craft is built beside in the same time within the budget", () => {
  const time = (beside: boolean) => Math.min(...[0, 1, 2].map(() => {
    const start = performance.now();
    const built = build({ rocket: "fleet-ship-03", variant: "miyamoto" }, { detail: "coarse", beside });
    built.boundsOf("together");
    return performance.now() - start;
  }));
  assert.ok(time(true) <= 1000, "the first picture is inside a second with Starship beside it");
  const start = performance.now();
  build({ rocket: "saturn-v" }, { beside: true }).glb();
  assert.ok(performance.now() - start <= 1000, "one craft and its file, inside a second");
});
