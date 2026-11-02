import assert from "node:assert/strict";
import { test } from "node:test";

import { build } from "../src/build/index.ts";
import { embedCode } from "../src/embed.ts";
import { bellsOf, enginesWanted, litBells, pickBells, ringsOf } from "../src/engines.ts";

test("engines are off unless asked for, and off under reduced motion whatever the page says", () => {
  assert.equal(enginesWanted(null, false), false);
  assert.equal(enginesWanted(null, true), false);
  assert.equal(enginesWanted("on", false), true);
  assert.equal(enginesWanted("on", true), false);
  assert.equal(enginesWanted("off", false), false);
  // a hostile value is only off
  assert.equal(enginesWanted('"><script>', false), false);
});

test("which engines burn goes from the middle out, and a part-used ring has them evenly round it", () => {
  const bellsIn = (rocket: string, variant: string, slot: string) => bellsOf(build({ rocket, variant }).parts.find((part) => part.slot === slot)?.pieces ?? []);
  const booster = bellsIn("starship", "v3", "booster");
  assert.deepEqual(ringsOf(booster).map((ring) => ring.length), [3, 10, 20]);
  assert.equal(pickBells(booster, 33).length, 33);
  assert.deepEqual(pickBells(booster, 13).map((bell) => bell.x), [...ringsOf(booster)[0], ...ringsOf(booster)[1]].map((bell) => bell.x));
  assert.deepEqual(pickBells(booster, 3).map((bell) => bell.x), ringsOf(booster)[0].map((bell) => bell.x));
  const falcon = bellsIn("falcon-9", "block-5", "first-stage");
  assert.deepEqual(ringsOf(falcon).map((ring) => ring.length), [1, 8]);
  const three = pickBells(falcon, 3);
  assert.equal(three.length, 3);
  assert.equal(Math.hypot(three[0].x, three[0].z), 0);
  // the other two stand opposite each other
  assert.ok(Math.abs(three[1].x + three[2].x) < 1e-9 && Math.abs(three[1].z + three[2].z) < 1e-9);
  assert.equal(pickBells(falcon, 1).length, 1);
  assert.equal(Math.hypot(pickBells(falcon, 1)[0].x, pickBells(falcon, 1)[0].z), 0);
  assert.equal(pickBells(falcon, 0).length, 0);
  assert.equal(pickBells(falcon, 99).length, 9);
  assert.equal(pickBells(falcon, -1).length, 0);
  const ship = bellsIn("starship", "v3", "ship");
  assert.equal(ship.length, 6);
  // the sea-level engines are the inner ring
  assert.deepEqual(ringsOf(ship).map((ring) => ring.length), [3, 3]);
  assert.ok(ringsOf(ship)[0][0].exit < ringsOf(ship)[1][0].exit);
});

test("a flame is drawn at each bell already in the rocket, and nowhere else", () => {
  const starship = build({ rocket: "starship", variant: "v3" });
  const placed = (show: string) => {
    const places = starship.placesOf(show);
    return litBells(
      starship.parts.map((part) => {
        const place = places.find((one) => one.slot === part.slot);
        return { slot: part.slot, atY: place?.at[1] ?? 0, shown: place?.shown ?? false, pieces: part.pieces };
      }),
      show === "together",
    );
  };
  const stacked = placed("together");
  const apart = placed("apart");
  assert.equal(stacked.length, 33);
  assert.equal(apart.length, 39);
  assert.equal(bellsOf(starship.parts.find((part) => part.slot === "booster")?.pieces ?? []).length, 33);
  const plain = starship.svg({ look: "line", view: "below", show: "together" });
  assert.equal(starship.svg({ look: "line", view: "below", show: "together", engines: false }), plain);
  assert.equal(plain.includes("data-plume"), false);
  const lit = starship.svg({ look: "line", view: "below", show: "together", engines: true });
  assert.equal(lit.match(/data-plume=/g)?.length, 33);
  const painted = starship.svg({ look: "painted", view: "side", show: "apart", engines: true });
  assert.equal(painted.match(/data-plume=/g)?.length, 39);
  assert.match(painted, /#fff4d2/);
  assert.equal(/spacex|logo|wordmark/i.test(painted), false);

  const falcon = build({ rocket: "falcon-9", variant: "block-5" });
  const falconBells = (show: string) => {
    const places = falcon.placesOf(show);
    return litBells(
      falcon.parts.map((part) => {
        const place = places.find((one) => one.slot === part.slot);
        return { slot: part.slot, atY: place?.at[1] ?? 0, shown: place?.shown ?? false, pieces: part.pieces };
      }),
      show === "together",
    ).length;
  };
  assert.equal(falconBells("together"), 9);
  assert.equal(falconBells("apart"), 10);
  assert.equal(build({ rocket: "grasshopper" }).svg({ engines: true }).match(/data-plume=/g)?.length, 1);
});

test("an embed asked to light the engines carries the flames and, when painted, the credit", () => {
  const element = embedCode({ rocket: "starship", variant: "v3", engines: "on", look: "line" }, "element");
  assert.match(element, /engines="on"/);
  const painted = embedCode({ rocket: "starship", variant: "v3", engines: "on", look: "painted", show: "together" }, "svg");
  assert.match(painted, /data-plume=/);
  assert.match(painted, /creativecommons\.org/);
  assert.equal(embedCode({ rocket: "starship", variant: "v2", engines: "on", look: "line" }, "svg").includes("data-plume"), true);
});
