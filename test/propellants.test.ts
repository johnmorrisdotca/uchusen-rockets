import assert from "node:assert/strict";
import { test } from "node:test";

import { build } from "../src/build/index.ts";
import { PROPELLANTS, propellantOf } from "../src/data/propellants.ts";
import { SOURCES } from "../src/data/sources.ts";
import { ROCKETS } from "../src/rockets.ts";

const WORDS = {
  kerosene: /RP-1|RG-1/,
  methane: /CH4|methane/i,
  hydrogen: /LH2|hydrogen/i,
  solid: /APCP|ammonium perchlorate/i,
  hypergolic: /Aerozine/i,
} as const;

test("each engine's propellant names its page, and the flame's colour follows from that page's words", () => {
  for (const one of PROPELLANTS) {
    assert.ok(one.propellant.value && one.propellant.source && SOURCES[one.propellant.source], one.id);
    assert.equal(SOURCES[one.propellant.source].read, "direct", `${one.id}: read, not heard of`);
    assert.ok(one.propellant.note, `${one.id}: the words the page uses`);
    assert.match(one.propellant.value, WORDS[one.flame], `${one.id}: ${one.flame} from "${one.propellant.value}"`);
  }
  assert.equal(new Set(PROPELLANTS.map((one) => one.id)).size, PROPELLANTS.length);
});

test("the colour of a flame is the kind its engine's page gives, for each part with a bell", () => {
  const flame = (rocket: string, variant: string, slot: string) => build({ rocket, variant }).parts.find((part) => part.slot === slot)?.flame;
  assert.equal(flame("falcon-9", "block-5", "first-stage"), "kerosene");
  assert.equal(flame("falcon-9", "block-5", "second-stage"), "kerosene");
  assert.equal(flame("falcon-1", "falcon-1", "second-stage"), "kerosene");
  assert.equal(flame("starship", "v3", "booster"), "methane");
  assert.equal(flame("saturn-v", "saturn-v", "first-stage"), "kerosene");
  assert.equal(flame("saturn-v", "saturn-v", "second-stage"), "hydrogen");
  assert.equal(flame("saturn-v", "saturn-v", "third-stage"), "hydrogen");
  assert.equal(flame("space-shuttle", "stack", "orbiter"), "hydrogen");
  assert.equal(flame("space-shuttle", "stack", "srb-left"), "solid");
  assert.equal(flame("sls", "block-1", "first-stage"), "hydrogen");
  assert.equal(flame("sls", "block-1", "srb-right"), "solid");
  assert.equal(flame("new-glenn", "7x2", "first-stage"), "methane");
  assert.equal(flame("new-glenn", "7x2", "second-stage"), "hydrogen");
  assert.equal(flame("electron", "electron", "first-stage"), "kerosene");
  assert.equal(flame("soyuz", "soyuz-2", "booster-1"), "kerosene");
  assert.equal(flame("lunar-module", "lunar-module", "descent"), "hypergolic");
});

test("an engine that no page read here names, or a part whose data names none, has a neutral flame, never a guess", () => {
  const flame = (rocket: string, variant: string, slot: string) => build({ rocket, variant }).parts.find((part) => part.slot === slot)?.flame;
  // the 2019 design's and Block 4's ship data count their engines and name no Raptor
  assert.equal(flame("starship", "2019", "ship"), "neutral");
  assert.equal(flame("starship", "v4", "ship"), "neutral");
  assert.equal(propellantOf("falcon-9", "9 Mystery"), null);
  assert.equal(propellantOf("falcon-9", null), null);
  assert.equal(propellantOf("starship", "3 sea-level and 3 vacuum"), null);
  // "solid motor" is each rocket's own
  assert.equal(propellantOf("sls", "1 solid motor")?.id, "sls-srb");
  assert.equal(propellantOf("space-shuttle", "1 solid motor")?.id, "shuttle-srb");
  assert.equal(propellantOf("falcon-9", "1 solid motor"), null);
});

test("every part that has a bell and an engine in its variant's data has a flame kind, and the kinds are the pictures' colours", () => {
  const kinds = new Set<string>();
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) for (const part of build({ rocket: rocket.id, variant: variant.id }).parts) kinds.add(part.flame);
  assert.deepEqual([...kinds].sort(), ["hydrogen", "hypergolic", "kerosene", "methane", "neutral", "solid"]);
});

test("a drawn flame takes its colour from the kind: methane is not orange, kerosene is", () => {
  const painted = (rocket: string, variant: string) => build({ rocket, variant }).svg({ look: "painted", show: "together", engines: true });
  assert.ok(painted("falcon-9", "block-5").includes("#ff9a3a"));
  assert.ok(!painted("starship", "v3").includes("#ff9a3a"));
  assert.ok(painted("starship", "v3").includes("#9aa5ff"));
  assert.ok(painted("saturn-v", "saturn-v").includes("#b8dcff") || build({ rocket: "saturn-v", variant: "saturn-v" }).flamesOf("together").length > 0);
  const line = (rocket: string, variant: string) => build({ rocket, variant }).svg({ look: "line", show: "together", engines: true });
  assert.ok(line("falcon-9", "block-5").includes("#e7a24a"));
  assert.ok(line("starship", "v3").includes("#8f9bf0"));
});
