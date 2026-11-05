// The comparison page with the fleet in it: ships lie lengthwise in their own band, the scale fits whatever is shown, and the switch picks rockets, the fleet or both.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build, lineupSvg } from "../src/build/index.ts";

const KAMINARI = "fleet-02:fleet-02";
const MIYAMOTO = "fleet-ship-03:miyamoto";
const STARSHIP = "starship:v3";
const FRAME = { width: 900, height: 560 };

const mixes: string[][] = [[KAMINARI], [MIYAMOTO], [KAMINARI, MIYAMOTO], [STARSHIP, KAMINARI], [STARSHIP, MIYAMOTO, KAMINARI, "building", "person"], [STARSHIP, "falcon-9:block-5", "building", "person"]];

test("the scale fits whatever is shown: no mix is wider or taller than the frame, and the whole ship is in it", () => {
  for (const items of mixes) {
    const picture = lineupSvg({ items, unit: 3.4, ruler: true, labels: true, fit: FRAME });
    assert.ok(picture.width <= FRAME.width + 0.5 && picture.height <= FRAME.height + 0.5, `${items.join(",")}: ${picture.width} by ${picture.height}`);
    assert.ok(picture.unit <= 3.4 && picture.unit > 0);
    const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(picture.svg)!;
    assert.ok(Math.abs(Number(viewBox[1]) - picture.width) < 0.1 && Math.abs(Number(viewBox[2]) - picture.height) < 0.1);
    // a craft's drawn size is its true size at that scale, and it is inside the picture
    for (const item of picture.items) assert.ok(item.height * picture.unit <= Math.max(picture.width, picture.height), item.key);
  }
  // with Kaminari in, the ruler runs to 2,000 m
  assert.match(lineupSvg({ items: [KAMINARI], unit: 3.4, fit: FRAME }).svg, />1,000</);
});

test("a fleet ship is drawn with its long axis across the page, and a rocket stands upright", () => {
  const ship = build({ rocket: "fleet-02", variant: "fleet-02" }).boundsOf("together");
  const length = ship.max[1] - ship.min[1];
  const across = Math.max(ship.max[0] - ship.min[0], ship.max[2] - ship.min[2]);
  assert.ok(length > across * 1.5, "the ship is a long thing");
  const picture = lineupSvg({ items: [KAMINARI], unit: 3.4, ruler: false, labels: false, fit: FRAME });
  assert.ok(picture.width > picture.height * 1.8, `${picture.width} wide and ${picture.height} tall: it lies lengthwise`);
  const item = picture.items[0];
  assert.equal(Math.round(item.height), Math.round(length), "its item height is its length");
  assert.ok(Math.abs(item.height * picture.unit + 16 - picture.width) <= 1, "its length fills the picture's width");
  const rocket = lineupSvg({ items: [STARSHIP], unit: 3, ruler: false, labels: false });
  assert.ok(rocket.height > rocket.width, "a rocket stands up");
});

test("the switch: rockets alone, the fleet alone, or all, and rockets alone keep today's scale", () => {
  const items = [STARSHIP, KAMINARI, "building", "person"];
  const rockets = lineupSvg({ items, unit: 3.4, filter: "rockets" });
  assert.deepEqual(rockets.items.map((i) => i.key), [STARSHIP, "building", "person"]);
  assert.equal(rockets.unit, 3.4, "no shrinking: the rockets keep their scale");
  assert.equal(rockets.svg, lineupSvg({ items: [STARSHIP, "building", "person"], unit: 3.4 }).svg, "rockets alone is today's picture");
  const fleet = lineupSvg({ items, unit: 3.4, filter: "fleet", fit: FRAME });
  assert.deepEqual(fleet.items.map((i) => i.key), [KAMINARI]);
  const all = lineupSvg({ items, unit: 3.4, filter: "all", fit: FRAME });
  assert.deepEqual(all.items.map((i) => i.key).sort(), [KAMINARI, STARSHIP, "building", "person"].sort());
  assert.ok(all.unit < 3.4 && all.unit <= fleet.unit + 1e-9, "everything on one scale, shrunk to fit the biggest");
  assert.ok(all.height > fleet.height, "the rockets band is above the fleet band");
});

const STOOD = ["fleet-ship-01:hanabusa", "fleet-ship-03:miyamoto", "fleet-kaminari:fleet-kaminari"];

test("pose stand puts the fleet upright in one row, at one scale, and the view turns them", () => {
  const lying = lineupSvg({ items: ["fleet-kaminari:fleet-kaminari"], unit: 3.4, ruler: false, labels: false, fit: FRAME });
  const stood = lineupSvg({ items: STOOD, unit: 3.4, pose: "stand", filter: "fleet", ruler: false, labels: false, fit: FRAME, view: "side" });
  assert.deepEqual(stood.items.map((item) => item.key), STOOD);
  assert.ok(stood.height > stood.width, `${stood.width} by ${stood.height}: the length goes up`);
  assert.ok(lying.width > lying.height, "without pose the same ship still lies down");
  const length = (key: string) => {
    const [rocket, variant] = key.split(":");
    const box = build({ rocket, variant }).boundsOf("together");
    return box.max[1] - box.min[1];
  };
  assert.ok(length(STOOD[2]) > length(STOOD[1]) * 2, "the transport is enormous beside the command ship");
  const front = lineupSvg({ items: STOOD, unit: 3.4, pose: "stand", filter: "fleet", ruler: false, labels: false, fit: FRAME, view: "front" });
  const quarter = lineupSvg({ items: STOOD, unit: 3.4, pose: "stand", filter: "fleet", ruler: false, labels: false, fit: FRAME, view: "three-quarter" });
  assert.notEqual(stood.svg, front.svg);
  assert.notEqual(stood.svg, quarter.svg);
  const mixed = lineupSvg({ items: [STARSHIP, ...STOOD, "person"], unit: 3.4, pose: "stand", filter: "fleet", fit: FRAME });
  assert.deepEqual(mixed.items.map((item) => item.key), STOOD, "the fleet filter still leaves out rockets and the person");
});
