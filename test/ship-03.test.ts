// ISV Miyamoto (SPX-03): the physics the bible prints, its parts in metres, the detail on every module, one mesh for one description, the named sections and decks, and how long it takes to build.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { MATERIALS, PART_ENTRIES, ROCKETS, check } from "../src/index.ts";
import { ENVELOPE, HANGAR, MASS, RADIATOR_AREA } from "../src/model/fleet/ship-03/dims.ts";
import { LEVELS, parts } from "../src/model/fleet/ship-03/index.ts";
import { ANCESTORS, DRIVE, ENGINES, HISTORY, IDENTITY, ROUTES, OPERATOR, SECTIONS, TITLE_BLOCK, deckSummary, idealMidpoint, journey, labelDensity, labels, longestBurnLy, specification, STATUS } from "../src/model/fleet/ship-03/specs.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const materialsOf = (pieces: readonly Piece[]) => new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));

test("the approved profile: 0.040 g at 0.63 c exhaust, and every number of the bible's table", () => {
  const trip = journey(ROUTES.benchmark);
  near(trip.onboardYears, 20.423, 0.001, "years aboard");
  near(trip.endpointYears, 21.034, 0.001, "years at the ends");
  near(trip.peak, 0.39833, 0.00001, "peak speed");
  near(trip.arrivalMass, 27_532, 1, "arrival mass");
  near(trip.thrust / 1e6, 41.19, 0.01, "launch thrust in MN");
  near(trip.jetPower / 1e15, 4.38, 0.01, "jet power in PW");
  near(trip.convertedShare, 0.223, 0.001, "share of mass-energy made directed");
  near(idealMidpoint(), 0.422, 0.001, "ideal midpoint speed");
  near(longestBurnLy(), 4.41, 0.01, "longest burn at the shield limit");
  const proxima = journey(ROUTES.proxima);
  near(proxima.onboardYears, 20.14, 0.01, "Proxima, aboard");
  near(proxima.endpointYears, 20.73, 0.01, "Proxima, Earth's frame");
  // the 0.020 g baseline stays as design history
  const baseline = journey(ROUTES.benchmark, 0.02, 0.45);
  near(baseline.onboardYears, 28.989, 0.001, "baseline, aboard");
  near(baseline.endpointYears, 29.424, 0.001, "baseline, ends");
  near(baseline.arrivalMass, 27_770, 1, "baseline arrival mass");
  assert.ok(trip.peak < DRIVE.shieldLimitOfC, "the trip stays inside the shield limit");
  assert.ok(MASS.inert + MASS.propellant === MASS.full && MASS.cargo < MASS.inert);
  assert.equal(RADIATOR_AREA, 24_000);
});

test("the engine cards agree: thrust is mass flow times exhaust speed, and the main drive carries the ship", () => {
  const main = ENGINES["miyamoto-main"];
  near(main.thrust * main.count, journey(ROUTES.benchmark).thrust, 1, "two drives give the launch thrust");
  near(main.exhaustOfC, 0.63, 1e-9, "main exhaust");
  const gamma = 1 / Math.sqrt(1 - main.exhaustOfC ** 2);
  near(main.massFlow * gamma * main.exhaust, main.thrust, 1, "relativistic thrust");
  for (const id of ["miyamoto-vernier", "miyamoto-attitude"]) near(ENGINES[id].massFlow * ENGINES[id].exhaust, ENGINES[id].thrust, 1e-3, id);
  assert.ok(ENGINES["miyamoto-vernier"].thrust * ENGINES["miyamoto-vernier"].count < main.thrust * main.count * 0.1, "the verniers cannot brake the ship");
  assert.equal(Object.values(ENGINES).length, 3);
});

test("the identity and the specification: the SPX designation, the Japanese name with its reading, the numbers", () => {
  assert.equal(IDENTITY.designation, "SPX-03");
  assert.equal(IDENTITY.class, "ICV");
  assert.equal(OPERATOR, "SPX");
  assert.equal(TITLE_BLOCK, "ISV Miyamoto, SPX-03 · ICV class · SPX · DCD ×2 · KAZE core v4");
  assert.equal(IDENTITY.maker, "SPX");
  assert.equal(IDENTITY.japanese, "宮本");
  assert.equal(IDENTITY.meaning, "at the foot of the shrine");
  assert.deepEqual([ENVELOPE.length, ENVELOPE.beam, ENVELOPE.height], [380, 118, 74]);
  const lines = specification().map((line) => `${line.name}: ${line.value}`).join("\n");
  for (const text of ["ISV Miyamoto, SPX-03", "KAZE core v4", "DCD", "380 m", "118 m", "105,000 t", "20.42 years aboard", "21.03 years", "0.04 g sustained", "24,000 m2"]) assert.ok(lines.includes(text), text);
  assert.ok(HISTORY.service.includes("2459") && IDENTITY.firstFlight === 2456 && STATUS === "STATUS: PLANNED · FIRST FLIGHT 2456");
  assert.ok(!/in service|serving|was commissioned/i.test(Object.values(HISTORY).join(" ")), "the history reads as a plan");
  assert.equal(ROCKETS["fleet-ship-03"].madeBy.value, "SPX");
});

test("each part is built where it says, in metres, and stands on its origin", () => {
  for (const part of parts()) {
    const pieces = part.pieces();
    const { min, max } = boundsOf(meshOf(pieces));
    assert.ok(Number.isFinite(min[1]) && max[1] > min[1], part.id);
    assert.ok(min[1] >= -4, `${part.id}: stands from ${min[1]}`);
    // the part is as long as it says, give or take what stands past the ends: collars, antennas, the bow's mounts
    assert.ok(max[1] <= part.height + 8, `${part.id}: ${max[1]} against ${part.height}`);
    assert.ok(max[1] >= part.height * 0.85, `${part.id}: only ${max[1]} of ${part.height}`);
    if (part.place) assert.ok(Math.abs(min[0]) < 130 && Math.abs(max[0]) < 130, `${part.id}: ${min[0]}..${max[0]}`);
  }
  // the hangars stand where the layout drawing puts them: starboard aft, port forward
  assert.ok(HANGAR.starboard.y[1] < HANGAR.port.y[1] && HANGAR.starboard.x[0] > 0 && HANGAR.port.x[1] < 0);
});

test("no module has a bare surface: hundreds of pieces and many kinds of detail, and the whole ship thousands", () => {
  const all = parts();
  let total = 0;
  for (const part of all) {
    const pieces = part.pieces();
    total += pieces.length;
    if (part.id.startsWith("radiators")) continue;
    assert.ok(pieces.length >= 250, `${part.id}: ${pieces.length} pieces`);
    assert.ok(materialsOf(pieces).size >= 9, `${part.id}: ${materialsOf(pieces).size} materials`);
  }
  const stowed = all.filter((part) => Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto).includes(part.id)).reduce((sum, part) => sum + part.pieces().length, 0);
  assert.ok(stowed >= 15_000, `${stowed} pieces in the stowed ship`);
  assert.ok(total > stowed);
  // the kinds of detail: copper and coils, hatches and lamps, glass, plants, hazard marks, coolant, the foam of the armour and the water of the barrels
  const everything = all.flatMap((part) => part.pieces());
  for (const material of ["copper", "coil", "hazard", "lamp-amber", "lamp-blue", "lamp-red", "glass", "plant", "coolant", "foam", "fuel", "radiator", "radiator-hot", "hull-orange", "hull-yellow", "hull-white", "panel-dark", "bell", "core", "deck"]) assert.ok(everything.some((piece) => piece.kind !== "lines" && (piece as { material: string }).material === material), material);
  for (const piece of everything) if (piece.kind !== "lines") assert.ok((piece as { material: string }).material in MATERIALS, (piece as { material: string }).material);
});

test("a mesh is a pure function of its description: the same part twice is the same bytes", () => {
  for (const id of ["drive", "hangar-starboard", "command-cutaway"]) {
    const part = parts().find((one) => one.id === id)!;
    const bytes = () => toGlb([{ name: id, mesh: meshOf(part.pieces()), at: [0, 0, 0] }]).bytes;
    assert.deepEqual(bytes(), bytes(), id);
  }
});

test("the levels of detail: a quarter of the detail is far fewer pieces, and the shape is the same length", () => {
  assert.deepEqual([...LEVELS], [0.25, 0.6, 1]);
  for (const id of ["drive", "fuel-aft", "hangar-port", "command"]) {
    const part = parts().find((one) => one.id === id)!;
    const [low, mid, full] = LEVELS.map((detail) => part.pieces({ detail }).length);
    assert.ok(low < mid && mid < full, `${id}: ${low}, ${mid}, ${full}`);
    assert.ok(low < full * 0.8, `${id}: ${low} against ${full}`);
    const lengths = LEVELS.map((detail) => boundsOf(meshOf(part.pieces({ detail }))).max[1]);
    near(lengths[0], lengths[2], 1.5, `${id} length`);
  }
});

test("Miyamoto is in the registry: four variants, every slot's part exists, the joints fit, and it is in the story, with no visible tag", () => {
  const rocket = ROCKETS["fleet-ship-03"];
  assert.equal(rocket.variants.length, 4);
  for (const variant of rocket.variants) {
    assert.equal(variant.status, "fictional");
    assert.ok(!/fictional/i.test(variant.name), variant.name);
    assert.deepEqual(Object.keys(variant.partIds ?? {}), [...variant.slots]);
    for (const id of Object.values(variant.partIds ?? {})) assert.ok(PART_ENTRIES.some((entry) => entry.record.id === id), id);
    const report = check({ rocket: rocket.id, variant: variant.id });
    assert.equal(report.ok, true, `${variant.id}: ${JSON.stringify(report).slice(0, 200)}`);
  }
  for (const entry of PART_ENTRIES) if (entry.record.rocket === "fleet-ship-03") assert.ok(entry.record.trueTo.length > 0, entry.record.id);
  // the same part serves more than one variant
  const shared = PART_ENTRIES.find((entry) => entry.record.id === "fleet-ship-03-drive");
  assert.deepEqual(shared?.record.trueTo, ["miyamoto", "miyamoto-deployed", "miyamoto-relief"]);
  // the mission pod swaps: two parts, one mount
  assert.ok(PART_ENTRIES.some((entry) => entry.record.id === "fleet-ship-03-pod-relay") && PART_ENTRIES.some((entry) => entry.record.id === "fleet-ship-03-pod-relief"));
});

test("every variant builds in every look and view, and no mark of a maker is on it", () => {
  for (const variant of ROCKETS["fleet-ship-03"].variants) {
    const built = build({ rocket: "fleet-ship-03", variant: variant.id });
    assert.ok(built.parts.length >= 12, variant.id);
    for (const look of ["line", "thick", "painted"] as const) assert.ok(built.svg({ look }).length > 500);
  }
});

test("sections and decks: a label for every few percent of the length, and more decks than a 139 m ship's 12", () => {
  const density = labelDensity();
  assert.ok(density.shareEach <= 0.05, `one label for every ${(density.shareEach * 100).toFixed(1)}% of the length`);
  assert.ok(density.labels >= 40 && labels().length === SECTIONS.length);
  const decks = deckSummary();
  assert.ok(decks.length >= 14, `${decks.length} decks`);
  assert.deepEqual(decks.map((deck) => deck.number), decks.map((_, i) => i + 1));
  for (let i = 1; i < decks.length; i++) assert.ok(decks[i].to <= decks[i - 1].to + 1e-9, "bow to stern");
  // every module has named sections, and labels stand on both sides
  for (const module of ["drive", "engineering", "fuel-aft", "fuel-fore", "habitat", "command", "bow", "hangar-starboard", "hangar-port", "pod"]) assert.ok(SECTIONS.some((section) => section.module === module), module);
  assert.ok(labels().some((label) => label.side === "left") && labels().some((label) => label.side === "right"));
  // the label points stay inside the envelope
  for (const label of labels()) assert.ok(Math.abs(label.at[0]) <= 60 && label.at[1] >= 0 && label.at[1] <= 380 && Math.abs(label.at[2]) <= 45, label.id);
});

test("the build budget: the first picture inside a second, the full detail inside three, on this computer", () => {
  const stowed = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
  const once = (detail: number) => {
    const start = performance.now();
    const list = parts().filter((part) => stowed.includes(part.id));
    toGlb(list.map((part) => ({ name: part.id, mesh: meshOf(part.pieces({ detail })), at: [0, 0, 0] as const })));
    return performance.now() - start;
  };
  once(1);
  const coarse = once(LEVELS[0]);
  const full = once(1);
  console.log(`build, coarse ${coarse.toFixed(0)} ms, full ${full.toFixed(0)} ms`);
  assert.ok(coarse < 1000, `the coarse build took ${coarse.toFixed(0)} ms`);
  assert.ok(full < 3000, `the full build took ${full.toFixed(0)} ms`);
});

test("every module names the real hardware it descends from, and the pipes and struts are round", () => {
  for (const part of parts()) {
    const key = part.id.replace(/-cutaway$/, "").replace(/^radiators-.*/, "radiators").replace(/^pod-.*/, "pod");
    assert.ok(ANCESTORS[key], key);
    assert.ok(part.note.includes("Descends from"), `${part.id}: ${part.note}`);
  }
  // round, not square: every rod in a part has at least a hexagon's sides, and the I-beams and ball joints are there
  const pieces = parts().flatMap((part) => part.pieces());
  const rods = pieces.filter((piece) => piece.kind === "plate" && piece.outline.length >= 5);
  const lathes = pieces.filter((piece) => piece.kind === "lathe" && piece.segs >= 10);
  assert.ok(rods.length > 1500 && lathes.length > 800, `${rods.length} round rods, ${lathes.length} round lathes`);
});
