// The poster is one sheet: the package's own craft at one scale, shortest first, and the ships in their own band.
import assert from "node:assert/strict";
import test from "node:test";
import { cellOf, fitSheet, heightLabel, fleetKeys, laterNames, packRows, posterCraft, posterSvg, SHEETS } from "../demo/poster.ts";

test("the craft run from short to tall, and a row stays within the sheet", () => {
  const craft = posterCraft();
  assert.ok(craft.length > 8);
  assert.ok(craft[0].metres <= craft[craft.length - 1].metres);
  assert.ok(craft.some((one) => one.name === "Saturn V"));
  assert.equal(craft.find((one) => one.name === "Saturn V")?.flight, "1967");
  assert.equal(craft.some((one) => one.key.startsWith("fleet-")), false);
  assert.ok(fleetKeys().some((key) => key.startsWith("fleet-kaminari:")));
  assert.ok(fleetKeys().some((key) => key.startsWith("fleet-ship-01:")));
  const rows = packRows(craft, 3.2, 844);
  assert.ok(rows.length > 1);
  assert.ok(rows[0][0].metres <= rows[rows.length - 1][0].metres);
  for (const row of rows) {
    // each craft's cell as the sheet draws it, with the gap after it: a row takes a craft only while it fits
    const width = row.reduce((sum, one) => sum + cellOf(one, 3.2) + 4, 0);
    assert.ok(width <= 844 + row.length * 4, `a row of ${row.length} is ${width} px`);
  }
});

test("a rocket with no shape is named to add later, and Hanabusa is named only until the package has the ship", () => {
  const later = laterNames();
  assert.ok(!later.includes("Vulcan Centaur"), "Vulcan Centaur has its shape now");
  assert.ok(later.includes("Ariane 6"));
  assert.equal(later.includes("Mercury-Redstone"), false);
  const hasShip = fleetKeys().some((key) => key.startsWith("fleet-ship-01:"));
  assert.equal(later.includes("Hanabusa, SPX-013"), !hasShip);
});

test("the poster is one coloured sheet, with one scale line and the fleet band", () => {
  const poster = posterSvg();
  assert.equal(poster.svg.match(/<svg /g)?.length, 1);
  assert.match(poster.svg, /Rockets of the World/);
  assert.match(poster.svg, /All craft at the same scale/);
  assert.match(poster.svg, /20 m/);
  assert.match(poster.svg, /linearGradient/);
  assert.match(poster.svg, /Saturn V/);
  assert.match(poster.svg, /SPX fleet, at 1\/\d+ the scale above/);
  assert.match(poster.svg, /#dad8d0/);
  assert.match(poster.svg, /#d17a3c/);
  assert.match(poster.svg, /To add later: .*Ariane 6/);
  assert.ok(poster.height > poster.width);
  assert.deepEqual(poster.later, laterNames());
  const fitted = fitSheet(poster.width, poster.height, SHEETS.a1);
  assert.equal(fitted.height, SHEETS.a1.long);
});

test("a label carries the height and its unit, and the words that go with a figure stay for the card", () => {
  const webb = posterCraft().find((one) => one.name === "James Webb Space Telescope");
  assert.equal(webb?.height, "4.8 m");
  assert.equal(heightLabel({ value: 146.3, source: "x", brief: "approximately" } as never), "146.3 m");
  assert.equal(heightLabel({ value: null, source: null } as never), "No source");
  for (const one of posterCraft()) assert.ok(one.height.length <= 12, `${one.name}: ${one.height}`);
  // a cell is never narrower than the longest line of its label
  const long = { ...posterCraft()[0], name: "Short", height: "123456789012 m" };
  assert.ok(cellOf(long, 3.2) >= long.height.length * 4.6);
});
