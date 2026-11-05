// What is left of a rocket after each burn, drawn with the rockets' own parts at the scale of the whole rocket; Falcon Heavy at lift-off with its three cores; the Fuel and Payload rows' figures.
import assert from "node:assert/strict";
import test from "node:test";
import { WAKUSEI_SOURCE as S } from "../demo/journey-bodies.ts";
import { stagedSvg, viewOf } from "../demo/journey-craft.ts";
import { build } from "../src/build/index.ts";
import { CRAFTS, craftOf, planTrip, stageOf, type Craft } from "../src/journey/index.ts";
import { PART_ENTRIES, partIdOf, variantOf } from "../src/index.ts";

const NOW = Date.UTC(2026, 10, 4);
const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const slotsOf = (name: string): string[] | null => {
  const stage = stageOf(craftOf(name)!, "coast");
  return stage.slots ? [...stage.slots] : null;
};

test("the stage at each phase: whole through the ascent, the upper stage with its payload for the departure burn and the coast, the payload alone from the turn round", () => {
  for (const craft of CRAFTS.filter((one) => one.drive === "ballistic")) {
    for (const phase of ["preheat", "ignition", "ascent"]) assert.equal(stageOf(craft, phase).slots, null, `${craft.id} ${phase}`);
    for (const phase of ["burn", "coast"]) assert.equal(stageOf(craft, phase).name, (craft as Extract<Craft, { drive: "ballistic" }>).stages.upper.name, `${craft.id} ${phase}`);
    for (const phase of ["flip", "brake", "flyby", "arrival"]) assert.equal(stageOf(craft, phase).name, (craft as Extract<Craft, { drive: "ballistic" }>).stages.payload.name, `${craft.id} ${phase}`);
  }
  assert.deepEqual(slotsOf("saturn-v"), ["third-stage", "adapter", "service-module", "capsule"]);
  assert.deepEqual(stageOf(craftOf("saturn-v")!, "arrival").slots, ["service-module", "capsule"]);
  assert.deepEqual(slotsOf("sls"), ["upper-stage", "service-module", "capsule"]);
  assert.deepEqual(stageOf(craftOf("sls")!, "brake").slots, ["service-module", "capsule"]);
  assert.deepEqual(slotsOf("falcon-heavy"), ["second-stage", "fairing"]);
  assert.equal(stageOf(craftOf("falcon-heavy")!, "arrival").rocket, "dragon");
  assert.deepEqual(stageOf(craftOf("falcon-heavy")!, "arrival").slots, ["capsule", "trunk"]);
  assert.equal(stageOf(craftOf("kaminari")!, "brake").slots, null, "a ship that burns all the way stays whole");
});

test("every stage is the rockets' own parts: its rocket, variant and slots exist, and each stage is part of the one before", () => {
  for (const craft of CRAFTS) {
    if (craft.drive !== "ballistic") continue;
    const { launch, upper, payload } = craft.stages;
    for (const stage of [launch, upper, payload]) {
      const variant = variantOf(stage.rocket, stage.variant);
      assert.ok(variant, `${craft.id}: ${stage.rocket} ${stage.variant}`);
      for (const slot of stage.slots ?? []) {
        assert.ok(variant.slots.includes(slot), `${craft.id}: slot ${slot}`);
        assert.ok(PART_ENTRIES.some((entry) => entry.record.id === partIdOf(stage.rocket, stage.variant, slot)), `${craft.id}: part of ${slot}`);
      }
    }
    assert.ok(payload.slots!.every((slot) => upper.slots!.includes(slot)) || upper.rocket !== payload.rocket || payload.slots!.length <= upper.slots!.length, craft.id);
    assert.ok(upper.slots!.length > payload.slots!.length, `${craft.id}: the payload is less than the upper stage`);
  }
});

test("a drawing keeps the scale of the whole rocket, and shows less after each burn", () => {
  for (const id of ["saturn-v", "sls", "falcon-heavy"]) {
    const craft = craftOf(id)!;
    const launch = stagedSvg(craft, "ascent", false).svg;
    const upper = stagedSvg(craft, "coast", false).svg;
    const payload = stagedSvg(craft, "arrival", false).svg;
    for (const svg of [launch, upper, payload]) assert.match(svg, /^<svg [^>]*viewBox="0 0 480 640"/);
    assert.ok(launch.length > upper.length && upper.length > payload.length, `${id}: ${launch.length} ${upper.length} ${payload.length}`);
    // the Space Launch System's data tells of no engine for its upper stage, so it draws no flame
    if (id !== "sls") assert.notEqual(stagedSvg(craft, "burn", true).svg, upper, `${id}: a lit stage is drawn with its flame`);
  }
  // what is left is drawn at the whole rocket's scale: every across-the-page coordinate of the capsule and its service module is one the whole rocket's drawing has, and alone, fitted to itself, it is not
  const whole = build({ rocket: "saturn-v", variant: "saturn-v" });
  const frame = whole.boundsOf("together", true);
  const across = (svg: string): Set<string> => new Set([...svg.matchAll(/[ML]([\d.]+) [\d.]+/g)].map((m) => m[1] as string));
  const everything = across(whole.svg({ look: "line", view: "side", engines: true, frame }));
  const kept = across(whole.svg({ look: "line", view: "side", only: ["service-module", "capsule"], frame }));
  const alone = across(whole.svg({ look: "line", view: "side", show: "capsule" }));
  assert.ok(kept.size > 20 && [...kept].every((x) => everything.has(x)), "same scale as the whole rocket");
  assert.ok([...alone].some((x) => !everything.has(x)), "alone, fitted to itself, it would not be");
});

test("the remaining parts close up into one stack, centred in the frame, with the lower part's engines alight", () => {
  const whole = build({ rocket: "saturn-v", variant: "saturn-v" });
  const frame = whole.boundsOf("together", true);
  const lit = whole.svg({ only: ["third-stage", "adapter", "service-module", "capsule"], frame, engines: true });
  const dark = whole.svg({ only: ["third-stage", "adapter", "service-module", "capsule"], frame });
  assert.ok(lit.length > dark.length, "a flame is drawn");
  assert.equal(whole.svg({ show: "together" }), whole.svg({ show: "together", frame: undefined }), "no `only` and no frame is the drawing as it was");
});

test("Falcon Heavy at lift-off shows its side boosters: three cores, drawn from the front", () => {
  const craft = craftOf("falcon-heavy")!;
  assert.equal(viewOf(craft), "front");
  const heavy = build({ rocket: "falcon-heavy", variant: "falcon-heavy" });
  assert.equal(heavy.placesOf("together").filter((place) => place.shown).length, 3);
  assert.ok(heavy.parts.filter((part) => part.record.strapOn).length === 2);
  const launch = stagedSvg(craft, "preheat", false).svg;
  assert.ok(launch.length > heavy.svg({ look: "line", view: "front", show: "centre" }).length, "more than the centre core");
});

test("a rocket with boosters on its sides is drawn from the front, every other from the side, and a ship from the side", () => {
  for (const craft of CRAFTS.filter((one) => one.drive === "ballistic")) {
    const whole = build({ rocket: craft.rocket, variant: craft.variant });
    const sided = whole.parts.some((part) => part.record.strapOn);
    assert.equal(viewOf(craft), sided ? "front" : "side", craft.id);
  }
  assert.equal(viewOf(craftOf("kaminari")!), "side");
});

test("the Fuel row: the propellant used, or n/a with the reason", () => {
  const saturn = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  assert.ok(saturn.fuel.usedT !== null);
  near(saturn.fuel.usedT!, 43.5 * (1 - Math.exp(-saturn.dv.arrival / (314 * 9.80665))), 0.01, "tonnes for the braking burn");
  near(saturn.fuel.usedT!, 10.2, 0.4, "tonnes");
  assert.match(saturn.fuel.note, /braking burn only/);
  const heavy = planTrip(S, craftOf("falcon-heavy")!, "earth", "mars", Date.UTC(2026, 10, 4, 17));
  assert.equal(heavy.fuel.usedT, null);
  assert.match(heavy.fuel.note, /no source gives the specific impulse/);
  const flyby = planTrip(S, craftOf("sls")!, "earth", "mars", Date.UTC(2026, 10, 4, 17));
  assert.equal(flyby.fuel.usedT, null);
  assert.match(flyby.fuel.note, /does not brake/);
  const ship = planTrip(S, craftOf("kaminari")!, "earth", "mars", NOW);
  assert.ok(ship.fuel.usedT! > 1000 && ship.fuel.carriedT === 6_350_000);
});

test("the Payload row is its own: the figure for the target, at least, or n/a with the reason", () => {
  const saturn = planTrip(S, craftOf("saturn-v")!, "earth", "moon", NOW);
  assert.deepEqual([saturn.payload.kg, saturn.payload.atLeast, saturn.payload.note], [43_500, false, "Payload to Moon"]);
  const heavy = planTrip(S, craftOf("falcon-heavy")!, "earth", "moon", NOW);
  assert.deepEqual([heavy.payload.kg, heavy.payload.atLeast], [16_800, true]);
  const none = planTrip(S, craftOf("saturn-v")!, "earth", "mars", Date.UTC(2026, 10, 4, 17));
  assert.equal(none.payload.kg, null);
  assert.match(none.payload.note, /no published payload figure covers a trip to Mars/);
  const ship = planTrip(S, craftOf("kaminari")!, "earth", "mars", NOW);
  assert.equal(ship.payload.kg, 1_000_000 * 1000);
});
