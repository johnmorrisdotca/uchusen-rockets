// The rockets drawn wholly by this package's code: each is drawn to its sourced height, its engines are the sourced count, and each part has the record every part has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { check, figureWords, FLIGHT_LOG, flightLogOf, MODEL_CREDITS, partEntry, PLANNED_ROCKETS, ROCKETS, SOURCES, variantOf } from "../src/index.ts";
import type { Piece } from "../src/model/pieces.ts";
import { build, buildPart } from "../src/build/index.ts";

const BELL = (piece: Piece) => piece.kind === "lathe" && piece.material === "bell";
const bells = (id: string) => (partEntry(id)?.pieces() ?? []).filter(BELL).length;

test("Falcon 1 is SpaceX's guide's size, with the other figures kept beside it", () => {
  const f = variantOf("falcon-1", "falcon-1");
  assert.equal(f?.facts.height.value, 21.3);
  assert.deepEqual(f?.facts.height.others?.map((other) => other.value), [21, 22.25]);
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1" }).size?.height, 21.3);
  assert.equal(f?.facts.parts["first-stage"].value, null);
  assert.equal(bells("falcon-1-falcon-1-first-stage"), 1);
  assert.equal(bells("falcon-1-falcon-1-second-stage"), 1);
  assert.equal(partEntry("falcon-1-falcon-1-fairing")?.record.height, 3.5);
  assert.ok(Math.abs((buildPart("falcon-1-falcon-1-fairing").bounds.max[0] ?? 0) - 0.77) < 0.01, "1.54 m across, narrower than the stages");
});

test("Falcon 1e says it was announced and never flew", () => {
  const e = variantOf("falcon-1", "falcon-1e");
  assert.equal(e?.status, "announced");
  assert.equal(figureWords(e?.firstFlight), "Never flew");
  assert.equal(figureWords(e?.facts.height, " m"), "27.4 m, announced");
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1e" }).size?.height, 27.4);
});

test("Cargo Dragon 2 is Dragon 2's sizes with no windows, painted by this package's own code", () => {
  const glass = (id: string) => (partEntry(id)?.pieces() ?? []).filter((piece) => piece.kind === "plate" && piece.material === "glass").length;
  assert.equal(glass("dragon-dragon-2-capsule"), 4);
  assert.equal(glass("dragon-cargo-dragon-2-capsule"), 0);
  assert.equal(partEntry("dragon-cargo-dragon-2-capsule")?.record.painted, null);
  assert.equal(variantOf("dragon", "cargo-dragon-2")?.firstFlight.value, "2020-12-06");
  assert.ok(Math.abs((check({ rocket: "dragon", variant: "cargo-dragon-2" }).size?.height ?? 0) - 8.1) < 0.01);
});

test("Falcon 9 Block 4 has no sizes of its own in any source read, so it is not listed apart", () => {
  assert.ok(!ROCKETS["falcon-9"].variants.some((variant) => /block-4/.test(variant.id)));
  assert.match(variantOf("falcon-9", "ft")?.note ?? "", /Block 4/);
  assert.ok(variantOf("falcon-9", "ft")?.facts.height.others?.some((other) => other.value === 71));
});

test("Saturn V is its sourced stages, and its parts add to its sourced height", () => {
  const report = check({ rocket: "saturn-v" });
  assert.ok(Math.abs((report.size?.height ?? 0) - 110.64) < 0.01, String(report.size?.height));
  assert.equal(partEntry("saturn-v-saturn-v-first-stage")?.record.height, 42.06);
  assert.equal(partEntry("saturn-v-saturn-v-third-stage")?.record.diameter, 6.6);
  assert.equal(bells("saturn-v-saturn-v-first-stage"), 5);
  assert.equal(bells("saturn-v-saturn-v-second-stage"), 5);
  assert.equal(bells("saturn-v-saturn-v-third-stage"), 1);
  assert.equal(variantOf("saturn-v")?.facts.parts["escape-tower"].value, null);
});

test("the Space Shuttle stands as sourced: the tank's top at the stack's height, its parts their articles' lengths", () => {
  const report = check({ rocket: "space-shuttle" });
  assert.equal(report.size?.height, 56);
  assert.deepEqual(report.parts.map(({ part }) => part.height), [46.88, 45.46, 45.46, 37.24]);
  assert.equal(partEntry("space-shuttle-stack-orbiter")?.record.diameter, 23.79);
  assert.equal(bells("space-shuttle-stack-orbiter"), 3);
  assert.equal(bells("space-shuttle-stack-srb-left"), 1);
  const stack = build({ rocket: "space-shuttle" });
  assert.ok(Math.abs(stack.boundsOf("orbiter").max[0] - 23.79 / 2) < 0.01, "the wingspan");
  assert.ok(stack.placesOf("together").every((place) => place.shown));
  const alone = stack.placesOf("orbiter").find((place) => place.shown);
  assert.deepEqual(alone?.at, [0, 0, 0], "alone it stands on the ground at the middle");
  assert.match(variantOf("space-shuttle")?.note ?? "", /No name, flag or mark/);
});

const WHOLE_HEIGHTS: readonly (readonly [string, string, number])[] = [
  ["sls", "block-1", 98.15],
  ["new-glenn", "7x2", 98],
  ["electron", "electron", 18],
  ["vulcan-centaur", "vc2s", 61.6],
  ["ariane-6", "a62", 63],
  ["ariane-6", "a64", 63],
  ["delta-iv-heavy", "heavy", 70.7],
  ["h3", "22s", 57],
  ["h3", "24l", 63],
  ["long-march-5", "cz-5", 56.97],
  ["mercury-redstone", "redstone", 25.41],
  ["soyuz", "soyuz-2", 46.3],
];

test("each rocket's parts add up to its sourced whole, and its engines are the sourced count", () => {
  for (const [rocket, variant, height] of WHOLE_HEIGHTS) {
    assert.equal(variantOf(rocket, variant)?.facts.height.value, height, rocket);
    assert.ok(Math.abs((check({ rocket, variant }).size?.height ?? 0) - height) < 0.01, `${rocket} ${variant}: ${check({ rocket, variant }).size?.height}`);
  }
  assert.equal(bells("sls-block-1-first-stage"), 4);
  assert.equal(partEntry("sls-block-1-first-stage")?.record.height, 64.6);
  assert.equal(partEntry("sls-block-1-srb-left")?.record.height, 53.95);
  assert.equal(bells("new-glenn-7x2-first-stage"), 7);
  assert.equal(bells("vulcan-centaur-vc2s-first-stage"), 2);
  assert.equal(bells("electron-electron-first-stage"), 9);
  assert.equal(bells("electron-electron-second-stage"), 1);
  assert.equal(bells("soyuz-soyuz-2-first-stage"), 4);
  assert.equal(bells("soyuz-soyuz-2-booster-1"), 4);
  assert.ok(Math.abs((build({ rocket: "soyuz" }).boundsOf("together").max[2] ?? 0) * Math.SQRT2 - 10.3 / 2) < 0.1, "the fins, at 45 degrees, give the sourced width");
});

test("a landing stands on each ship and pad, and only the sourced sizes carry a source", () => {
  const ocisly = variantOf("droneship", "ocisly");
  assert.equal(ocisly?.facts.sizes?.["Deck length"].value, 91.44);
  assert.equal(ocisly?.facts.sizes?.["Deck width"].value, 51.82);
  assert.equal(figureWords(ocisly?.facts.sizes?.["Deck width"], " m"), "51.82 m, nearly identical to the first barge");
  for (const id of ["jrti", "asog"]) assert.equal(variantOf("droneship", id)?.facts.sizes?.["Deck length"].value, null, id);
  assert.equal(variantOf("landing-zone", "lz-1")?.facts.diameter.value, 85.95);
  assert.equal(variantOf("landing-zone", "lz-4")?.facts.diameter.value, null);
  const ship = build({ rocket: "droneship" });
  const deckTop = ship.boundsOf("deck").max[1];
  const stage = ship.placesOf("together").find((place) => place.slot === "landed");
  assert.equal(stage?.at[1], partEntry("droneship-ocisly-deck")?.record.height);
  assert.ok(deckTop > 6);
  assert.equal(build({ rocket: "droneship" }).boundsOf("landed").min[1], 0);
  for (const words of [ocisly?.note ?? "", variantOf("landing-zone", "lz-1")?.note ?? ""]) assert.ok(/logo/.test(words));
  assert.equal(bells("droneship-ocisly-landed"), 9);
});

test("the launch tower is the FAA's height, the stack stands on the mount, and its arms can be swapped like any part", () => {
  const tower = partEntry("launch-tower-stack-tower")?.record;
  assert.equal(tower?.height, 146.3);
  assert.equal(figureWords(variantOf("launch-tower", "stack")?.facts.height, " m"), "146.3 m, approximately");
  assert.ok(variantOf("launch-tower", "stack")?.facts.height.others?.some((other) => other.value === 146));
  assert.ok(buildPart("launch-tower-stack-tower").bounds.max[1] > 149, "with its lightning rod");
  const stack = build({ rocket: "launch-tower", variant: "stack" });
  const place = (built: typeof stack, slot: string) => built.placesOf("together").find((one) => one.slot === slot)?.at[1] ?? 0;
  assert.equal(place(stack, "booster"), partEntry("launch-tower-stack-mount")?.record.height);
  assert.equal(place(stack, "ship"), place(stack, "booster") + 72.3);
  const caught = build({ rocket: "launch-tower", variant: "catch" });
  assert.ok(place(caught, "booster") > 40);
  assert.ok(place(caught, "arms") > place(caught, "booster") + 60, "the arms close near its top");
  const swapped = check({ rocket: "launch-tower", variant: "stack", parts: { arms: "launch-tower-catch-arms" } });
  assert.ok(swapped.ok);
  assert.equal(swapped.custom, true);
  const wrong = check({ rocket: "launch-tower", variant: "stack", parts: { arms: "launch-tower-stack-mount" } });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.issues[0].code, "wrong-kind");
});

test("inside Crew Dragon: the four sourced seats, and what has no source says so", () => {
  const v = variantOf("dragon", "crew-dragon-inside");
  assert.equal(v?.facts.more.seats.value, 4);
  assert.equal(v?.facts.more.pressurized.value, "9.3 cubic metres");
  assert.match(v?.note ?? "", /judged from one published picture/);
  assert.equal(partEntry("dragon-crew-dragon-inside-capsule")?.record.height, 4.5);
  const seats = (partEntry("dragon-crew-dragon-inside-capsule")?.pieces() ?? []).filter((piece) => piece.kind === "plate" && piece.material === "white");
  assert.equal(seats.length, 4);
  assert.equal(partEntry("dragon-crew-dragon-inside-capsule")?.record.painted, null);
});

test("Starbase is the map's places, what is built only, in few pieces", () => {
  const city = build({ rocket: "starbase", variant: "city" });
  const box = city.boundsOf("together");
  assert.ok(box.max[0] - box.min[0] > 3500, "launch site to build site");
  assert.equal(variantOf("starbase", "launch-site")?.facts.sizes?.["Tower 1 to tower 2"].value, 348);
  assert.equal(variantOf("starbase", "build-site")?.facts.sizes?.["Mega Bay's height"].source, "openstreetmap");
  for (const variant of ROCKETS.starbase.variants) {
    assert.match(variant.note ?? "", /no lettering or logo/);
    assert.match(variant.note ?? "", /nothing announced/);
    assert.equal(variant.status, "support");
  }
  const count = city.parts.reduce((sum, part) => sum + part.pieces.length, 0);
  assert.ok(count < 400, `${count} pieces`);
  // each part is one mesh per material, so what the card draws is small however many buildings there are
  const materials = city.parts.reduce((sum, part) => sum + part.mesh.faces.size, 0);
  assert.ok(materials < 60, `${materials} meshes`);
  assert.ok(city.glb().bytes.byteLength < 300 * 1024);
});

test("real flights name a variant there is, a known source, and the source's own words", () => {
  for (const flight of FLIGHT_LOG) {
    assert.ok(variantOf(flight.rocket, flight.variant), flight.id);
    assert.ok(Object.hasOwn(SOURCES, flight.source), flight.id);
    assert.match(flight.date, /^\d{4}-\d{2}-\d{2}$/);
  }
  const five = flightLogOf("starship").find((flight) => flight.id === "starship-flight-5");
  assert.equal(five?.date, "2024-10-13");
  assert.match(five?.outcome ?? "", /Caught/);
  assert.match(five?.vehicles ?? "", /B12.*S30/);
  assert.deepEqual(flightLogOf("falcon-1").map((flight) => flight.launch), ["Failure", "Failure", "Failure", "Success", "Success"]);
  const dates = flightLogOf("starship").map((flight) => flight.date);
  assert.deepEqual(dates, [...dates].sort());
});

test("Discovery is a CC0 scan, credited, in its own variant, with its marks painted out", () => {
  const report = check({ rocket: "space-shuttle", variant: "discovery" });
  assert.equal(report.credits[0].id, "smithsonian-discovery");
  assert.equal(report.credits[0].licence, "CC0 1.0");
  assert.deepEqual(check({ rocket: "space-shuttle", variant: "stack" }).credits.map((credit) => credit.id).sort(), ["nasa-shuttle-hi-res", "nasa-shuttle-parts"]);
  assert.match(variantOf("space-shuttle", "discovery")?.note ?? "", /painted out/);
  assert.match(MODEL_CREDITS["smithsonian-discovery"].changes, /painted out/);
});

test("no code-made rocket is labelled as a custom build, and each comes apart and alone", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const report = check({ rocket: rocket.id, variant: variant.id });
      assert.ok(report.ok, `${variant.id}: ${report.issues.map((issue) => issue.message).join(" ")}`);
      assert.equal(report.custom, false, variant.id);
      const built = build({ rocket: rocket.id, variant: variant.id });
      for (const show of built.shows) assert.ok(built.boundsOf(show).max[1] > 0, `${variant.id} ${show}`);
    }
});

test("Ariane 6, Atlas V 401 and Delta IV Heavy are the sourced stacks, and leave the planned list", () => {
  const a62 = variantOf("ariane-6", "a62");
  const a64 = variantOf("ariane-6", "a64");
  assert.equal(a62?.facts.height.value, 63);
  assert.equal(a64?.facts.height.value, 63);
  assert.equal(a62?.facts.parts["fairing"]?.value, 14);
  assert.equal(a62?.facts.parts["first-stage"]?.value, null);
  assert.equal(a62?.facts.parts["srb-left"]?.value, 13.5);
  assert.equal(a64?.facts.parts["srb-far"]?.value, 13.5);
  const atlas = variantOf("atlas-v", "401");
  assert.equal(atlas?.facts.parts["first-stage"]?.value, 32.46);
  assert.equal(atlas?.facts.parts["second-stage"]?.value, 12.68);
  assert.equal(atlas?.facts.parts["fairing"]?.value, 9);
  const heavy = variantOf("delta-iv-heavy", "heavy");
  assert.equal(heavy?.facts.height.value, 70.7);
  assert.equal(heavy?.facts.parts["first-stage"]?.value, 40.8);
  assert.equal(heavy?.facts.parts["second-stage"]?.value, 13.7);
  assert.equal(heavy?.facts.parts["fairing"]?.value, null);
  assert.equal(bells("ariane-6-a62-first-stage"), 1);
  assert.equal(bells("atlas-v-401-first-stage"), 1);
  assert.equal(bells("atlas-v-401-second-stage"), 1);
  assert.equal(bells("delta-iv-heavy-heavy-first-stage"), 1);
  assert.equal(bells("delta-iv-heavy-heavy-second-stage"), 1);
  assert.equal(check({ rocket: "ariane-6", variant: "a62" }).size?.height, 63);
  assert.equal(check({ rocket: "delta-iv-heavy", variant: "heavy" }).size?.height, 70.7);
  assert.equal(check({ rocket: "atlas-v", variant: "401" }).size?.height, 54.14);
  assert.equal(ROCKETS["ariane-6"]?.status, "built");
  assert.equal(PLANNED_ROCKETS.some((rocket) => rocket.id === "ariane-6"), false);
});

test("H3-22S, H3-24L and Long March 5 are the sourced stacks", () => {
  const s = variantOf("h3", "22s");
  const l = variantOf("h3", "24l");
  assert.equal(s?.facts.height.value, 57);
  assert.equal(l?.facts.height.value, 63);
  assert.equal(s?.facts.parts["first-stage"]?.value, 37);
  assert.equal(s?.facts.parts["second-stage"]?.value, 12);
  assert.equal(s?.facts.parts["fairing"]?.value, null);
  assert.equal(s?.facts.parts["srb-left"]?.value, 15);
  assert.equal(l?.facts.parts["srb-far"]?.value, 15);
  const cz = variantOf("long-march-5", "cz-5");
  assert.equal(cz?.facts.height.value, 56.97);
  assert.equal(cz?.facts.parts["first-stage"]?.value, 33.16);
  assert.equal(cz?.facts.parts["second-stage"]?.value, 11.54);
  assert.equal(cz?.facts.parts["fairing"]?.value, null);
  assert.equal(bells("h3-22s-first-stage"), 2);
  assert.equal(bells("h3-22s-second-stage"), 1);
  assert.equal(bells("long-march-5-cz-5-first-stage"), 2);
  assert.equal(check({ rocket: "h3", variant: "22s" }).size?.height, 57);
  assert.equal(check({ rocket: "h3", variant: "24l" }).size?.height, 63);
  assert.equal(check({ rocket: "long-march-5", variant: "cz-5" }).size?.height, 56.97);
});

test("Mercury-Redstone carries the existing capsule and stands 25.41 m", () => {
  const v = variantOf("mercury-redstone", "redstone");
  assert.equal(v?.facts.height.value, 25.41);
  assert.equal(v?.facts.diameter.value, 1.78);
  assert.equal(v?.facts.parts["first-stage"]?.value, null);
  assert.equal(v?.facts.parts["escape-tower"]?.value, null);
  assert.equal(v?.partIds?.capsule, "mercury-friendship-7-capsule");
  assert.equal(partEntry("mercury-friendship-7-capsule")?.record.height, 3.3);
  assert.equal(bells("mercury-redstone-redstone-first-stage"), 1);
  const report = check({ rocket: "mercury-redstone", variant: "redstone" });
  assert.ok(report.ok && !report.custom, report.issues.map((issue) => issue.message).join(" "));
  assert.equal(report.size?.height, 25.41);
  assert.equal(ROCKETS["mercury-redstone"]?.maker, "nasa");
  assert.equal(ROCKETS["mercury-redstone"]?.country.value, "US");
});

test("Vulcan Centaur VC2S: the infobox's stages and boosters, the adapter what the whole leaves, no longer only planned", () => {
  const vulcan = variantOf("vulcan-centaur", "vc2s");
  assert.equal(vulcan?.status, "flown");
  assert.equal(vulcan?.firstFlight.value, "2024-01-08");
  assert.deepEqual(vulcan?.slots, ["first-stage", "srb-left", "srb-right", "second-stage", "adapter", "fairing"]);
  const heights = (id: string) => partEntry(`vulcan-centaur-vc2s-${id}`)?.record.height;
  assert.equal(heights("first-stage"), 33.3);
  assert.equal(heights("second-stage"), 10.66);
  assert.equal(heights("fairing"), 15.5);
  assert.equal(heights("srb-left"), 21.98);
  assert.equal(partEntry("vulcan-centaur-vc2s-srb-left")?.record.diameter, 1.62);
  assert.ok(Math.abs((heights("adapter") ?? 0) - (61.6 - 33.3 - 10.66 - 15.5)) < 1e-9);
  assert.equal(vulcan?.facts.parts.adapter.value, null, "no source gives the adapter's length");
  const report = check({ rocket: "vulcan-centaur", variant: "vc2s" });
  assert.ok(report.ok && !report.custom);
  assert.deepEqual(report.credits, [], "drawn wholly by this package's code");
  assert.ok(!PLANNED_ROCKETS.some((rocket) => rocket.id === "vulcan-centaur"));
  assert.equal(ROCKETS["vulcan-centaur"].maker, "ula");
  assert.equal(ROCKETS["vulcan-centaur"].country.value, "US");
});
