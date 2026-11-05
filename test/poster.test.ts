// The poster is one sheet: the package's own craft at one scale, shortest first, and the ships in their own band.
import assert from "node:assert/strict";
import test from "node:test";
import { fitSheet, fleetKeys, laterNames, packRows, posterCraft, posterSvg, SHEETS } from "../demo/poster.ts";

test("the craft run from short to tall, and a row stays within the sheet", () => {
  const craft = posterCraft();
  assert.ok(craft.length > 8);
  assert.ok(craft[0].metres <= craft[craft.length - 1].metres);
  assert.ok(craft.some((one) => one.name === "Saturn V"));
  assert.equal(craft.some((one) => one.key.startsWith("fleet-")), false);
  assert.ok(fleetKeys().some((key) => key.startsWith("fleet-02:")));
  const rows = packRows(craft, 3.2, 844);
  assert.ok(rows.length > 1);
  assert.ok(rows[0][0].metres <= rows[rows.length - 1][0].metres);
  for (const row of rows) {
    const width = row.reduce((sum, one) => sum + Math.max(58, one.widthM * 3.2 + 8), 0);
    assert.ok(width <= 844 + 58);
  }
});

test("a rocket with no shape, and a ship the package does not have yet, are named to add later", () => {
  const later = laterNames();
  assert.ok(later.includes("Vulcan Centaur"));
  assert.ok(later.includes("Ariane 6"));
  assert.ok(later.includes("Hanabusa, SPX-013"));
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
  assert.match(poster.svg, /To add later: .*Vulcan Centaur/);
  assert.ok(poster.height > poster.width);
  assert.deepEqual(poster.later, laterNames());
  const fitted = fitSheet(poster.width, poster.height, SHEETS.a1);
  assert.equal(fitted.height, SHEETS.a1.long);
});
