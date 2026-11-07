import assert from "node:assert/strict";
import { test } from "node:test";
import { familiesOf, filterCraft, parseLayout, pickerCatalogue, pickerKind } from "../demo/pickerModel.ts";

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
