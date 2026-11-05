// The poster draws the package's own rockets at one scale and names what it cannot draw yet.
import assert from "node:assert/strict";
import test from "node:test";
import { fitSheet, fleetKeys, laterNames, posterSvg, rocketRows, SHEETS } from "../demo/poster.ts";

test("each maker's rockets are their own row, and the SPX ships are not in those rows", () => {
  const rows = rocketRows();
  assert.ok(rows.some((row) => row.name === "NASA" && row.keys.some((key) => key.startsWith("saturn-v:"))));
  assert.ok(rows.some((row) => row.name === "SpaceX" && row.keys.some((key) => key.startsWith("falcon-9:"))));
  assert.equal(rows.some((row) => row.keys.some((key) => key.startsWith("fleet-"))), false);
  assert.ok(fleetKeys().some((key) => key.startsWith("fleet-02:")));
});

test("a rocket with no shape, and a ship the package does not have yet, are named to add later", () => {
  const later = laterNames();
  assert.ok(later.includes("Vulcan Centaur"));
  assert.ok(later.includes("Ariane 6"));
  assert.ok(later.includes("Hanabusa, SPX-013"));
});

test("the poster is one picture at one scale, and it says what is still to add", () => {
  const poster = posterSvg();
  assert.ok(poster.svg.startsWith("<svg"));
  assert.match(poster.svg, /Rockets of the World/);
  assert.match(poster.svg, /50 m/);
  assert.match(poster.svg, /Saturn V/);
  assert.match(poster.svg, /SPX-207/);
  assert.match(poster.svg, /To add later: .*Vulcan Centaur/);
  assert.deepEqual(poster.later, laterNames());
  const wide = fitSheet(10_000, 1_000, SHEETS.a2);
  assert.equal(wide.width, SHEETS.a2.long);
  assert.ok(wide.height < SHEETS.a2.short);
});
