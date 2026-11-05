// ISV Miyamoto (SPX-452): the physics the bible prints, its parts in metres, the detail on every module, one mesh for one description, the named sections and decks, and how long it takes to build.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { BUILD_BUDGET_MS, MATERIALS, PART_ENTRIES, ROCKETS, check } from "../src/index.ts";
import { ENVELOPE, HANGAR, MASS, RADIATOR_AREA } from "../src/model/fleet/ship-03/dims.ts";
import { LEVELS, parts } from "../src/model/fleet/ship-03/index.ts";
import { readFileSync } from "node:fs";
import { ARRAY_POWER, asBuilt, CLASS_FACTS, CLASS_TABLE, classTableMarkdown, fuelLimitedLy, ANCESTORS, DRIVE, ENGINES, HISTORY, IDENTITY, ROUTES, OPERATOR, SECTIONS, SHIPS, TITLE_BLOCK, titleBlockOf, deckSummary, idealMidpoint, journey, labelDensity, labels, longestBurnLy, specification, STATUS } from "../src/model/fleet/ship-03/specs.ts";
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
  assert.equal(IDENTITY.designation, "SPX-452");
  assert.equal(IDENTITY.type, "ICV");
  assert.equal(IDENTITY.class, "Romurusu");
  assert.equal(SHIPS.ariake.registry, "SPX-186");
  assert.equal(SHIPS.ariake.meaning, "daybreak");
  assert.equal(OPERATOR, "SPX");
  assert.equal(TITLE_BLOCK, "ISV Miyamoto, SPX-452 · Romurusu class · ICV · SPX · DCD ×2 · KAZE core v4");
  assert.equal(titleBlockOf("ariake"), "ISV Ariake, SPX-186 · Romurusu class · ICV · SPX · DCD ×2 · KAZE core v4");
  assert.equal(IDENTITY.maker, "SPX");
  assert.equal(IDENTITY.japanese, "宮本");
  assert.equal(IDENTITY.meaning, "at the foot of the shrine");
  assert.deepEqual([ENVELOPE.length, ENVELOPE.beam, ENVELOPE.height], [380, 138, 74]);
  const lines = specification().map((line) => `${line.name}: ${line.value} ${line.note ?? ""}`).join("\n");
  for (const text of ["ISV Miyamoto, SPX-452", "Romurusu class", "KAZE core v4", "DCD", "380 m", "138 m", "105,000 t", "20.42 years aboard", "21.03 years", "0.04 g sustained", "24,000 m2"]) assert.ok(lines.includes(text), text);
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
    if (part.id.startsWith("radiators") || part.id === "collar-none") continue;
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
  assert.equal(rocket.variants.length, 6);
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
  assert.deepEqual(shared?.record.trueTo, ["miyamoto", "miyamoto-deployed", "miyamoto-array", "miyamoto-relief", "miyamoto-no-collar"]);
  // the sister ship is a variant of the same model: its own row in the picker, its own marks and pod, the rest shared
  const sister = ROCKETS["fleet-ship-ariake"];
  assert.equal(sister.variants.length, 5);
  assert.equal(sister.variants[0].name, "ISV 有明 Ariake, SPX-186");
  assert.equal(MIYAMOTO_VARIANT_SLOTS.ariake.drive, "drive-ariake");
  assert.equal(MIYAMOTO_VARIANT_SLOTS.ariake.pod, "pod-survey");
  assert.equal(MIYAMOTO_VARIANT_SLOTS.ariake.habitat, "habitat-ariake");
  assert.equal(MIYAMOTO_VARIANT_SLOTS.ariake.command, "command-ariake");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["ariake-cutaway"].habitat, "habitat-ariake-cutaway");
  assert.equal(check({ rocket: "fleet-ship-ariake", variant: "ariake" }).ok, true);
  assert.equal(check({ rocket: "fleet-ship-ariake", variant: "ariake-cutaway" }).ok, true);
  // the shadow-shield collar swaps for none in one slot
  assert.equal(MIYAMOTO_VARIANT_SLOTS.miyamoto["drive-collar"], "shield-collar");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-no-collar"]["drive-collar"], "collar-none");
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
  for (const label of labels()) assert.ok(Math.abs(label.at[0]) <= 70 && label.at[1] >= 0 && label.at[1] <= 380 && Math.abs(label.at[2]) <= 45, label.id);
});

for (const variant of ["miyamoto", "ariake"] as const) test(`the build budget, ${variant}: the first picture inside a second, the full detail inside three, on this computer`, () => {
  const stowed = Object.values(MIYAMOTO_VARIANT_SLOTS[variant]);
  const once = (level: "coarse" | "fine") => {
    const start = performance.now();
    const list = parts().filter((part) => stowed.includes(part.id));
    let pieces = 0;
    toGlb(list.map((part) => { const made = part.pieces({ level }); pieces += made.length; return { name: part.id, mesh: meshOf(made), at: [0, 0, 0] as const }; }));
    return { ms: performance.now() - start, pieces };
  };
  once("fine");
  const coarse = once("coarse");
  const full = once("fine");
  console.log(`build ${variant}, coarse ${coarse.ms.toFixed(0)} ms (${coarse.pieces} pieces), full ${full.ms.toFixed(0)} ms (${full.pieces} pieces)`);
  assert.ok(coarse.ms < BUILD_BUDGET_MS.coarse, `the coarse build took ${coarse.ms.toFixed(0)} ms`);
  assert.ok(full.ms < BUILD_BUDGET_MS.fine, `the full build took ${full.ms.toFixed(0)} ms`);
  // the first picture is the kit's coarse level: the hulls, the barrels, the bells, the big boxes, a small share of the pieces
  assert.ok(coarse.pieces > 200 && coarse.pieces < full.pieces * 0.1, `${coarse.pieces} coarse of ${full.pieces}`);
});

test("every module names the real hardware it descends from, and the pipes and struts are round", () => {
  for (const part of parts()) {
    const key = part.id.replace(/-moved$/, "").replace(/-inboard$/, "").replace(/-cutaway$/, "").replace(/-ariake$/, "").replace(/^radiators-.*/, "radiators").replace(/^pod-.*/, "pod").replace(/^array-.*/, "array").replace(/^(shield-collar|collar-none)$/, "collar").replace(/^stack-berth.*/, "stack-berth");
    assert.ok(ANCESTORS[key], key);
    assert.ok(part.note.includes("Descends from"), `${part.id}: ${part.note}`);
  }
  // round, not square: every rod in a part has at least a hexagon's sides, and the I-beams and ball joints are there
  const pieces = parts().flatMap((part) => part.pieces());
  const rods = pieces.filter((piece) => piece.kind === "plate" && piece.outline.length >= 5);
  const lathes = pieces.filter((piece) => piece.kind === "lathe" && piece.segs >= 10);
  assert.ok(rods.length > 1500 && lathes.length > 800, `${rods.length} round rods, ${lathes.length} round lathes`);
});

test("Ariake is a variant record of the same model: a dawn-gold livery, a survey pod, a refit and a warm interior, none of it on Miyamoto", () => {
  const all = parts();
  const get = (id: string) => all.find((part) => part.id === id)!.pieces({ detail: 0.6 });
  // dawn-gold appears on Ariake's own parts and on none of Miyamoto's
  for (const id of ["drive-ariake", "habitat-ariake", "command-ariake", "bow-ariake", "hangar-starboard-ariake", "hangar-port-ariake", "pod-survey"]) assert.ok(materialsOf(get(id)).has("hull-dawn"), id);
  for (const id of ["drive", "habitat", "command", "bow", "hangar-starboard", "hangar-port", "pod-relay", "pod-relief"]) assert.ok(!materialsOf(get(id)).has("hull-dawn"), id);
  // the warm interior: wood and dawn-gold rooms in Ariake's cutaway, blue ones in Miyamoto's
  assert.ok(materialsOf(get("habitat-ariake-cutaway")).has("wood") && !materialsOf(get("habitat-cutaway")).has("wood"));
  // the refit: a sensor mast and a second solarium, so the citadel has more pieces than Miyamoto's
  assert.ok(get("command-ariake").length > get("command").length + 150);
  // orange stays on the removable leaves: Ariake's hangar has the same number of orange pieces as Miyamoto's
  const orange = (pieces: Piece[]) => pieces.filter((piece) => piece.kind !== "lines" && (piece as { material: string }).material === "hull-orange").length;
  assert.equal(orange(get("hangar-starboard-ariake")), orange(get("hangar-starboard")));
});

test("Ariake's engine end is clad in raised hexagonal tiles, with the nozzle lips and the windows kept", () => {
  const all = parts();
  const get = (id: string) => all.find((part) => part.id === id)!.pieces({ detail: 1 });
  const hexes = (pieces: Piece[]) => pieces.filter((piece) => piece.kind === "plate" && piece.outline.length === 6);
  const drive = get("drive-ariake");
  const plain = get("drive");
  assert.ok(hexes(drive).length - hexes(plain).length > 1000, `${hexes(drive).length} hexagons against ${hexes(plain).length}`);
  // real geometry: each a raised plate standing 0.1 m or more, of near-black materials, with a seam round it (the six sides are inside the pitch)
  const raised = hexes(drive).filter((tile) => (tile as { thickness: number }).thickness === 0.2);
  assert.ok(raised.length > 1000 && raised.every((tile) => ["tile", "panel-dark", "hull-grey-dark"].includes((tile as { material: string }).material)), `${raised.length} raised tiles`);
  // the white and gold bands are gone, the nozzle lips (orange) and the service windows (the bands' cut-outs) stay
  const band = (pieces: Piece[], material: string) => pieces.filter((piece) => piece.kind === "lathe" && piece.material === material && piece.body).length;
  assert.ok(band(plain, "hull-white") > 0 && band(plain, "gold") > 0 && band(drive, "hull-white") === 0 && band(drive, "gold") === 0);
  const orange = (pieces: Piece[]) => pieces.filter((piece) => piece.kind !== "lines" && (piece as { material: string }).material === "hull-orange").length;
  assert.equal(orange(drive), orange(plain));
  assert.equal(band(drive, "tile"), band(plain, "hull-white") + band(plain, "gold") + band(plain, "hull-white-worn"));
  // the collar too: hexagons, and the orange panel row kept
  const collar = get("shield-collar-ariake");
  assert.ok(hexes(collar).filter((tile) => (tile as { thickness: number }).thickness === 0.2).length > 150, `${hexes(collar).length} hexagons on the collar`);
  assert.ok(orange(collar) > 0 && orange(collar) <= orange(get("shield-collar")));
});

test("Ariake fills all four hangar positions, each with the door and racks of Miyamoto's, and her spec says so", () => {
  const all = parts();
  const get = (id: string) => all.find((part) => part.id === id)!;
  const ids = ["hangar-starboard-ariake", "hangar-port-ariake", "hangar-starboard-fore-ariake", "hangar-port-aft-ariake"];
  assert.deepEqual(ids.map((id) => MIYAMOTO_VARIANT_SLOTS.ariake[id.replace(/-ariake$/, "").replace("hangar-starboard", "hangar-starboard").replace(/^hangar-starboard-fore$/, "hangar-starboard-fore")]), ids);
  // four distinct boxes in four positions
  const where = new Set(ids.map((id) => `${get(id).place!.x}/${get(id).y0}`));
  assert.equal(where.size, 4);
  // the door and the racks: same orange leaves, hazard blocks and net straps as the twin Miyamoto has of the same kind; the boxes are as big
  const count = (pieces: Piece[], material: string) => pieces.filter((piece) => piece.kind !== "lines" && (piece as { material: string }).material === material).length;
  const twin = { "hangar-starboard-fore-ariake": "hangar-port", "hangar-port-aft-ariake": "hangar-starboard" } as const;
  for (const [id, mine] of Object.entries(twin)) {
    const a = get(id).pieces({ detail: 0.6 });
    const m = get(mine).pieces({ detail: 0.6 });
    assert.equal(count(a, "hull-orange"), count(m, "hull-orange"), `${id} orange leaves`);
    for (const material of ["hazard", "black"]) assert.ok(Math.abs(count(a, material) - count(m, material)) <= count(m, material) * 0.2, `${id} ${material}: ${count(a, material)} against ${count(m, material)}`);
    assert.ok(Math.abs(a.length - m.length) < m.length * 0.06, `${id}: ${a.length} against ${m.length}`);
    assert.equal(get(id).height, get(mine).height);
  }
  // the spec: four boxes, double the cargo, the same beam (the staggered pair already stands at the full beam), a heavier ship on the same drive, and a route she can still fly
  const m = asBuilt("miyamoto");
  const a = asBuilt("ariake");
  assert.equal(m.hangars, 2);
  assert.equal(a.hangars, 4);
  assert.equal(a.mass.cargo, 2 * m.mass.cargo);
  assert.equal(a.beam, ENVELOPE.beam);
  assert.equal(a.mass.full, a.mass.inert + a.mass.propellant);
  assert.ok(a.mass.inert > m.mass.inert + m.mass.cargo);
  near(journey(ROUTES.benchmark, a.acceleration, DRIVE.exhaustOfC, a.mass.full).thrust, journey(ROUTES.benchmark).thrust, 1, "the same thrust");
  assert.ok(journey(ROUTES.benchmark, a.acceleration, DRIVE.exhaustOfC, a.mass.full).peak < idealMidpoint(DRIVE.exhaustOfC, a.mass), "she has fuel for the benchmark route");
  assert.ok(fuelLimitedLy(a.mass, a.acceleration) >= ROUTES.benchmark);
  const lines = Object.fromEntries(specification("ariake").map((line) => [line.name, line.value]));
  assert.equal(lines["Hangar boxes"], "4");
  assert.equal(lines.Cargo, "5,600 t");
  assert.equal(lines.Beam, "138 m");
});

test("the class table, the variant records, the docs and the viewer agree: pod, side boxes, signature features, the sister link", () => {
  const all = parts();
  const slotsOf = (variant: string) => MIYAMOTO_VARIANT_SLOTS[variant];
  const piecesOf = (id: string) => all.find((part) => part.id === id)!.pieces({ detail: 0.6 });
  const cells = (pieces: Piece[]) => pieces.filter((piece) => piece.kind === "plate" && ["coil", "gold", "kapton"].includes((piece as { material: string }).material) && piece.thickness === 0.12).length;
  const hexes = (pieces: Piece[]) => pieces.filter((piece) => piece.kind === "plate" && piece.outline.length === 6 && piece.thickness === 0.2).length;
  for (const [ship, facts] of Object.entries(CLASS_FACTS) as [keyof typeof CLASS_FACTS, (typeof CLASS_FACTS)[keyof typeof CLASS_FACTS]][]) {
    const slots = slotsOf(ship);
    // the default pod and the side boxes, from the variant record, against the table
    assert.equal(slots.pod, `pod-${facts.defaultPod}`, `${ship}'s default pod`);
    assert.equal(SHIPS[ship].pod, facts.defaultPod);
    assert.equal(Object.keys(slots).filter((slot) => slot.startsWith("hangar-")).length, facts.sideBoxes, `${ship}'s side boxes`);
    assert.equal(asBuilt(ship).hangars, facts.sideBoxes);
    const row = (name: string) => CLASS_TABLE.find((r) => r.row === name)![ship];
    assert.ok(row("Default pod").startsWith(facts.defaultPod), row("Default pod"));
    assert.ok(row("Side box modules").includes(facts.sideBoxes === 4 ? "all four" : "staggered pair"), row("Side box modules"));
    // the signature features: present on the ship that has them, and only there
    const has = (feature: string) => (facts.features as readonly string[]).includes(feature);
    assert.equal("array" in slots, has("solar-array"), `${ship}: the solar array`);
    assert.equal(cells(piecesOf(slots.bow)) > 300, has("rounded-solar-nose"), `${ship}: the solar-cell nose`);
    assert.equal(hexes(piecesOf(slots.drive)) > 1000, has("hex-engine-end"), `${ship}: the hex engine end`);
    assert.equal(Object.keys(slots).filter((slot) => slot.startsWith("hangar-")).length === 4, has("four-boxes"), `${ship}: four boxes`);
    assert.equal(row("Signature").includes("solar array"), has("solar-array"));
    assert.equal(row("Signature").includes("hexagonal"), has("hex-engine-end"));
    assert.equal(row("Nose").includes("rounded"), has("rounded-solar-nose"));
  }
  // the array has two states and its power is on the spec; Ariake's spec says none
  assert.ok("array-stowed" in Object.fromEntries(all.map((part) => [part.id, 1])) && "array-deployed" in Object.fromEntries(all.map((part) => [part.id, 1])));
  assert.equal(slotsOf("miyamoto-array").array, "array-deployed");
  assert.equal(slotsOf("miyamoto").array, "array-stowed");
  assert.ok(ARRAY_POWER.auMW > 1.5 && ARRAY_POWER.auMW < 3 && ARRAY_POWER.auMW < ARRAY_POWER.fusionMW * 0.01);
  const power = (ship: "miyamoto" | "ariake") => Object.fromEntries(specification(ship).map((line) => [line.name, `${line.value} ${line.note ?? ""}`]));
  assert.match(power("miyamoto")["Solar array"], /MW\(e\) at one astronomical unit/);
  assert.match(power("miyamoto")["Solar array"], /near a star/);
  assert.match(power("miyamoto").Power, /fusion is the main power/);
  assert.match(power("ariake")["Solar array"], /^none/);
  // the table is in the bible and the README, word for word
  const table = classTableMarkdown();
  assert.ok(readFileSync("docs/fleet/ship-03.md", "utf8").includes(table), "the bible has the table");
  assert.ok(readFileSync("README.md", "utf8").includes(table), "the README has the table");
  assert.match(readFileSync("docs/fleet/ship-03.md", "utf8"), /^## The Romurusu class: Miyamoto and Ariake$/m);
  // the viewer's spec tab: a "Sister ship" row that links to the other ship, both ways, to a variant that exists
  for (const [rocket, variant, other, otherVariant] of [["fleet-ship-03", "miyamoto", "fleet-ship-ariake", "ariake"], ["fleet-ship-ariake", "ariake", "fleet-ship-03", "miyamoto"], ["fleet-ship-03", "miyamoto-cutaway", "fleet-ship-ariake", "ariake-cutaway"]] as const) {
    const inspector = ROCKETS[rocket].variants.find((v) => v.id === variant)!.inspector!;
    assert.ok(inspector.spec.some(([name]) => name === "Sister ship"), `${variant} has a Sister ship row`);
    assert.deepEqual(inspector.links?.["Sister ship"], { rocket: other, variant: otherVariant });
    assert.ok(ROCKETS[other].variants.some((v) => v.id === otherVariant), `${other}/${otherVariant} exists`);
    assert.ok(inspector.spec.some(([name, value]) => name === "Hangar boxes" && value.startsWith(`${CLASS_FACTS[variant.startsWith("ariake") ? "ariake" : "miyamoto"].sideBoxes} `)));
  }
});
