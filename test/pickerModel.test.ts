import assert from "node:assert/strict";
import { test } from "node:test";
import { hasLaunchStack, isSpacecraft } from "../demo/craftKind.ts";
import { familiesOf, filterCraft, parseLayout, pickerCatalogue, pickerKind, pickerKinds } from "../demo/pickerModel.ts";
import { kindOf } from "../demo/shipPicker.ts";

test("layout is the one attribute: card, browser and grid", () => {
  assert.equal(parseLayout("browser"), "browser");
  assert.equal(parseLayout("card"), "card");
  assert.equal(parseLayout("strip"), "card");
  assert.equal(parseLayout("grid"), "grid");
  assert.equal(parseLayout(null), "browser");
  assert.equal(parseLayout("shelf"), "browser");
});

test("the catalogue lists a craft once, with its kind and a fact", () => {
  const rows = pickerCatalogue();
  assert.equal(new Set(rows.map((row) => row.rocket)).size, rows.length);
  const starship = rows.find((row) => row.rocket === "starship");
  assert.equal(starship?.kind, "rocket");
  assert.equal(starship?.family, "spacex");
  assert.match(starship?.fact ?? "", /m/);
  assert.equal(pickerKind("iss"), "station");
  assert.equal(pickerKind("fleet-kaminari"), "fleet");
  assert.equal(rows.some((row) => row.rocket === "fleet-02"), false);
});

test("search, kind and family narrow the same list", () => {
  const rows = pickerCatalogue();
  const saturn = filterCraft(rows, { kind: "rocket", family: "nasa", search: "saturn" });
  assert.deepEqual(saturn.map((row) => row.rocket), ["saturn-v"]);
  assert.equal(filterCraft(rows, { kind: "fleet", family: "all", search: "no-such-craft" }).length, 0);
  assert.ok(familiesOf(rows, "fleet").includes("fleet"));
  assert.equal(familiesOf(rows, "fleet").includes("spacex"), false);
});

test("a lone probe or telescope is a spacecraft, in the ship picker and on the compare page, and a launcher or a station is not", () => {
  const rows = pickerCatalogue();
  for (const id of ["voyager", "juno", "jwst", "parker-solar-probe", "hubble"]) {
    assert.equal(pickerKind(id), "craft", id);
    assert.equal(kindOf(id), "craft", id);
    assert.equal(rows.find((row) => row.rocket === id)?.kind, "craft", id);
  }
  for (const id of ["saturn-v", "starship", "dragon", "gemini"]) assert.equal(kindOf(id), "rocket", id);
  assert.equal(pickerKind("iss"), "station");
  assert.equal(kindOf("iss"), "station");
  assert.deepEqual(pickerKinds(), ["rocket", "craft", "station", "fleet"]);
  // the Real rockets column holds no spacecraft
  assert.equal(filterCraft(rows, { kind: "rocket", family: "all", search: "" }).some((row) => isSpacecraft(row.rocket)), false);
  assert.deepEqual(filterCraft(rows, { kind: "craft", family: "nasa", search: "" }).map((row) => row.rocket).sort(), ["hubble", "juno", "jwst", "parker-solar-probe", "voyager"]);
  assert.ok(familiesOf(rows, "craft").includes("nasa"));
  assert.equal(familiesOf(rows, "craft").includes("spacex"), false);
});

test("only a craft with a launch stack that leaves it offers Launch stack and In space", () => {
  assert.equal(hasLaunchStack("starship", "v3"), true);
  assert.equal(hasLaunchStack("saturn-v", "saturn-v"), true);
  assert.equal(hasLaunchStack("space-shuttle", "stack"), true);
  assert.equal(hasLaunchStack("falcon-9", "block-5"), true);
  for (const [rocket, variant] of [["jwst", "jwst"], ["juno", "juno"], ["voyager", "voyager"], ["parker-solar-probe", "parker-solar-probe"], ["hubble", "hubble"], ["iss", "iss"], ["dragon", "dragon-2"], ["nowhere", "none"]] as const) assert.equal(hasLaunchStack(rocket, variant), false, rocket);
});
