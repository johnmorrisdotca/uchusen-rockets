import assert from "node:assert/strict";
import { test } from "node:test";

import { build } from "../src/build/index.ts";
import { embedCode } from "../src/embed.ts";
import { ROCKETS } from "../src/rockets.ts";
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
  assert.match(painted, /#fff1e6/);
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

test("every variant lights what a source says it has and the drawing shows, and never an error; a blank stays dark", () => {
  // at full thrust, stacked. A landed stage, a tower's stack and a part with no bell in its drawing have no flame.
  const stacked: Readonly<Record<string, number>> = {
    "saturn-v/saturn-v": 5, "space-shuttle/stack": 5, "space-shuttle/discovery": 3, "sls/block-1": 6, "new-glenn/7x2": 7, "electron/electron": 9, "soyuz/soyuz-2": 20, "falcon-1/falcon-1": 1, "falcon-1/falcon-1e": 1, "lunar-module/lunar-module": 1,
    "falcon-heavy/falcon-heavy": 27, "grasshopper/grasshopper": 1, "starship/v3": 33, "falcon-9/block-5": 9,
    "droneship/ocisly": 0, "landing-zone/lz-1": 0, "landing-zone/lz-4": 0, "launch-tower/stack": 0, "launch-tower/catch": 0, "starbase/city": 0, "iss/iss": 0, "hubble/hubble": 0, "gemini/gemini": 0, "mercury/friendship-7": 0, "apollo-soyuz/apollo-soyuz": 0, "jupiter-c/jupiter-c": 0, "dragon/dragon-2": 0,
  };
  for (const [key, count] of Object.entries(stacked)) {
    const [rocket, variant] = key.split("/");
    assert.equal(build({ rocket, variant }).flamesOf("together").length, count, key);
  }
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const built = build({ rocket: rocket.id, variant: variant.id });
      for (const look of ["line", "thick", "painted"] as const)
        for (const show of ["together", "apart"]) {
          const lit = built.svg({ look, show, engines: true });
          assert.ok(lit.startsWith("<svg"), `${rocket.id} ${variant.id} ${look} ${show}`);
          if (show === "together") assert.equal(lit.match(/data-plume=/g)?.length ?? 0, built.flamesOf("together").length, `${rocket.id} ${variant.id} ${look}`);
        }
      // only a part whose engines a source tells of ever burns
      for (const bell of built.flamesOf("apart")) assert.notEqual(variant.facts.engines[bell.slot]?.value ?? null, null, `${rocket.id} ${variant.id} ${bell.slot}`);
    }
});

test("the parts that have engines in their data and no bell in their drawing stay dark, and nothing joins them without a decision", () => {
  // No source read here gives the size of a Draco or SuperDraco thruster, the service propulsion engine or the A-7, so none is drawn and none burns: a bell's size is never estimated.
  // Thrusters and the service engine also burn in orbit, not in the stacked picture a flame is drawn for. Add a part here only with a reason; give it a sourced bell and take it out when a source gives one.
  const dark: string[] = [];
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const withData = Object.entries(variant.facts.engines).filter(([, figure]) => figure?.value != null).map(([slot]) => slot);
      if (withData.length === 0) continue;
      const lit = new Set(build({ rocket: rocket.id, variant: variant.id }).flamesOf("apart").map((bell) => bell.slot));
      for (const slot of withData) if (!lit.has(slot)) dark.push(`${rocket.id}/${variant.id}/${slot}`);
    }
  assert.deepEqual(dark.sort(), [
    "apollo-soyuz/apollo-soyuz/csm",
    "dragon/cargo-dragon-2/capsule",
    "dragon/dragon-1/capsule",
    "dragon/dragon-2/capsule",
    "falcon-9/block-5-dragon-2/capsule",
    "falcon-9/v1.0-dragon/capsule",
    "jupiter-c/jupiter-c/tail",
    "jupiter-c/jupiter-c/tub",
    "lunar-module/lunar-module/ascent",
  ]);
  for (const key of ["dragon/dragon-1", "dragon/dragon-2", "dragon/cargo-dragon-2", "apollo-soyuz/apollo-soyuz", "jupiter-c/jupiter-c"]) {
    const [rocket, variant] = key.split("/");
    assert.equal(build({ rocket, variant }).flamesOf("apart").length, 0, key);
    assert.equal(build({ rocket, variant }).svg({ look: "line", show: "together", engines: true }).includes("data-plume"), false, key);
  }
});
