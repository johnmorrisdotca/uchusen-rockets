// Ship 02, the fictional Heavy Transport: the voyage arithmetic (relativistic, constant proper acceleration, a flip at halfway), the spec block against the physics, the engine cards, the sections, the parts.
import assert from "node:assert/strict";
import test from "node:test";
import { C, G0, LY, YEAR_S, jetPowerW, massRatio, rangeLightYears, ship02Budget, thrustN, voyage } from "../src/model/fleet/ship-02/journey.ts";
import { DECKS, BUDGET, DESIGN, ENGINE_CARDS, HULL_STACK_RING, INSETS, SPEC, TANK_CAPACITY_T } from "../src/model/fleet/ship-02/specs.ts";
import { SECTIONS } from "../src/model/fleet/ship-02/sections.ts";
import { DRY_T, LENGTH, MASS_T } from "../src/model/fleet/ship-02/dims.ts";
import { SHIP_02_SLOTS } from "../src/model/fleet/ship-02/index.ts";
import { meshOf, boundsOf } from "../src/model/pieces.ts";
import { check, MAKERS, partEntry, ROCKETS, variantOf } from "../src/index.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);

test("constants: c, one g, the Julian year and the light year", () => {
  assert.equal(C, 299_792_458);
  assert.equal(G0, 9.80665);
  assert.equal(YEAR_S, 31_557_600);
  near(LY, 9.4607304725808e15, 1e3, "a light year in metres");
});

test("Earth to Proxima Centauri, 4.37 light years, at 0.015 g: the worked numbers", () => {
  const v = voyage(4.37, 0.015);
  near(v.rapidity, 0.2594008, 1e-6, "midpoint rapidity");
  near(v.peak, 0.253735, 1e-5, "peak speed in c");
  near(v.gamma, 1.033833, 1e-5, "Lorentz factor at the flip");
  near(v.shipYears, 33.5047, 1e-3, "years on board");
  near(v.endpointYears, 33.8817, 1e-3, "years in the endpoints' frame");
  near(v.halfShipYears * 2, v.shipYears, 1e-9, "the flip is at the halfway point in time on board");
});

test("the same route at other accelerations (the trade-off in one line: faster needs more unproven physics)", () => {
  const rows: [number, number, number, number][] = [[0.01, 0.2089, 41.07, 41.38], [0.02, 0.2906, 28.99, 29.42], [0.05, 0.4387, 18.23, 18.91]];
  for (const [g, peak, ship, earth] of rows) {
    const v = voyage(4.37, g);
    near(v.peak, peak, 1e-4, `peak at ${g} g`);
    near(v.shipYears, ship, 0.01, `ship years at ${g} g`);
    near(v.endpointYears, earth, 0.01, `earth years at ${g} g`);
  }
  // the one that matches Waymark's 0.020 g: 0.29063 c, 28.989 years aboard, 29.424 in the endpoint frame
  near(voyage(4.37, 0.02).shipYears, 28.989, 1e-3, "Waymark's figure");
});

test("physics identities: a short trip is Newtonian; a long one never reaches c; the flip is symmetric", () => {
  const short = voyage(1e-6, 0.015);
  near(short.shipYears, Math.sqrt((4 * 1e-6 * LY) / (0.015 * G0)) / YEAR_S, 1e-6, "Newtonian limit, t = 2 sqrt(D / a)");
  assert.ok(voyage(1e6, 0.015).peak < 1);
  const v = voyage(4.37, 0.015);
  near(Math.cosh(v.rapidity), 1 + (0.015 * G0 * 4.37 * LY) / (2 * C * C), 1e-12, "cosh eta");
  near(v.endpointYears, (2 * C * Math.sinh(v.rapidity)) / (0.015 * G0) / YEAR_S, 1e-12, "endpoint time");
});

test("Ship 02's budget: mass ratio, arrival mass, propellant left and thrust agree with the voyage", () => {
  const v = voyage(4.37, 0.015);
  near(massRatio(v, 0.4), 3.6583, 1e-4, "mass ratio");
  assert.deepEqual(BUDGET.voyage, v);
  near(BUDGET.fullMassT, 8_450_000, 0, "full mass");
  near(BUDGET.arrivalMassT, 2_309_803, 5, "arrival mass");
  near(BUDGET.propellantLeftT, 209_803, 5, "propellant left at Proxima");
  assert.ok(BUDGET.propellantLeftT > 0, "arrives with propellant in hand");
  assert.ok(BUDGET.propellantUsedT < DESIGN.propellantT, "the tanks carry enough");
  near(BUDGET.startThrustN, 8_450_000 * 1000 * 0.015 * G0, 1, "thrust is mass times acceleration");
  near(thrustN(8_450_000, 0.015), BUDGET.startThrustN, 1, "thrustN");
  near(jetPowerW(BUDGET.startThrustN, 0.4) / 1e15, 74.53, 0.01, "jet power in petawatts");
  const other = ship02Budget(0.015, 0.4, 4.37, DRY_T, DESIGN.payloadT, DESIGN.propellantT);
  assert.deepEqual(other, BUDGET);
});

test("range: with a full payload the fuel carries the ship about five light years to rest", () => {
  near(rangeLightYears(BUDGET.fullMassT / (DRY_T + DESIGN.payloadT), 0.4, 0.015), 5.0395, 1e-3, "range, no reserve");
  near(SPEC.rangeLy, 5.04, 0.005, "the spec block's range");
  assert.ok(rangeLightYears(BUDGET.fullMassT / (DRY_T + DESIGN.payloadT), 0.4, 0.015) > 4.37, "Proxima is within range");
  // with no payload the range is longer, but the forward shield's rated peak (0.30 c) stops the long ones
  const empty = rangeLightYears((DRY_T + DESIGN.propellantT) / DRY_T, 0.4, 0.015);
  assert.ok(empty > 9);
  assert.ok(voyage(empty, 0.015).peak > DESIGN.shieldCap, "an empty ship could outrun its shield, so the shield sets the top speed");
  assert.ok(voyage(4.37, 0.015).peak < DESIGN.shieldCap, "the Proxima trip is inside the shield's rating");
});

test("the spec block is worked from the same numbers", () => {
  assert.equal(SPEC.length, LENGTH);
  assert.equal(SPEC.dryMassT, 1_100_000);
  assert.equal(Object.values(MASS_T).reduce((a, b) => a + b, 0), DRY_T);
  near(SPEC.proxima.shipYears, 33.5047, 1e-3, "spec ship years");
  near(SPEC.proxima.earthYears, 33.8817, 1e-3, "spec earth years");
  near(SPEC.cruiseC, 0.253735, 1e-5, "spec cruise");
  assert.ok(SPEC.propellantT <= SPEC.tankCapacityT, "the propellant fits the tanks");
  near(SPEC.propellantT / SPEC.tankCapacityT, 0.87, 0.02, "tank fill");
  assert.ok(TANK_CAPACITY_T > 7e6 && TANK_CAPACITY_T < 8e6);
  // far larger than the Waymark (380 m x 118 m x 74 m, 105,000 t) and than a 300 m franchise cruiser
  assert.ok(SPEC.length > 380 * 4);
  assert.ok(SPEC.fullMassT > 105_000 * 50);
});

test("the engine cards agree with the physics", () => {
  const main = ENGINE_CARDS[0];
  near(main.thrustEachN * main.count, BUDGET.startThrustN, 1, "main thrust");
  near(main.isp, (0.4 * C) / G0, 1e-6, "main specific impulse");
  assert.equal(main.count, 8);
  const vernier = ENGINE_CARDS[1];
  assert.equal(vernier.count, 4);
  near(vernier.thrustEachN * vernier.count, SPEC.maneuverThrustN, 1, "manoeuvring thrust");
  near(vernier.exhaust, (vernier.isp * G0) / C, 1e-12, "vernier exhaust fraction");
  // the mass flow at full mass times the exhaust speed is the thrust; averaged over the voyage it burns the propellant
  const flow = BUDGET.startThrustN / (0.4 * C);
  near(flow, 10.37, 0.01, "kilograms a second at the start");
  const averageFlow = (BUDGET.propellantUsedT * 1000) / (BUDGET.voyage.shipYears * YEAR_S);
  assert.ok(averageFlow < flow && averageFlow > flow / 3, "the average flow is below the start's, as thrust falls with mass");
  for (const card of ENGINE_CARDS) assert.ok(card.fuel.length > 10 && card.operation.length > 10 && card.parts.length >= 4);
  assert.ok(partEntry("fleet-02-nozzle-main") && partEntry("fleet-02-vernier-cluster"), "each engine is a part on its own");
});

test("the hull layers are real, separate and numbered outside to inside", () => {
  assert.deepEqual(HULL_STACK_RING.map((l) => l.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(HULL_STACK_RING.every((l) => l.thicknessM > 0));
  assert.ok(HULL_STACK_RING.find((l) => l.name.startsWith("Water jacket"))!.thicknessM >= 3, "heavy radiation shielding");
});

test("sections: named bow to stern, one for every few per cent of the length, each with a part that exists", () => {
  assert.ok(SECTIONS.length >= 50);
  assert.ok(LENGTH / SECTIONS.length <= 36, "one label for every 2 per cent of the length, on average");
  const slots = new Set(SHIP_02_SLOTS.map((s) => s.slot));
  const ids = new Set<string>();
  for (const s of SECTIONS) {
    assert.ok(slots.has(s.slot), `${s.id}: ${s.slot} is a slot`);
    assert.ok(!ids.has(s.id), `${s.id} is repeated`);
    ids.add(s.id);
    assert.ok(s.name.length > 3 && s.job.length > 8);
    assert.ok(s.at[1] >= -5 && s.at[1] <= LENGTH, `${s.id} is on the ship`);
  }
  // no gap longer than 5 per cent of the length between the outside labels, from the tail to the bow
  const ys = SECTIONS.filter((s) => !s.inside).map((s) => s.at[1]).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] <= 0.05 * LENGTH, `gap before ${ys[i]}`);
  assert.ok(DECKS.length >= 24 && DECKS.every((d, i) => d.n === i + 1));
  assert.ok(INSETS.length >= 7 && INSETS.every((i) => i.parts.length >= 5 && i.parts.length <= 6));
});

test("the parts: each is a part record, each builds finite geometry in its place, all within the ship's length", () => {
  assert.ok(SHIP_02_SLOTS.length >= 30);
  assert.equal(variantOf("fleet-02")?.status, "fictional");
  assert.ok(!/fiction/i.test(ROCKETS["fleet-02"].name), "no fictional label in what the picker shows");
  assert.equal(MAKERS.fleet, "SPX");
  assert.equal(ROCKETS["fleet-02"].maker, "fleet");
  assert.equal(variantOf("fleet-02")?.facts.more.designation?.value, "SPX-207");
  let pieces = 0;
  let top = 0;
  for (const slot of SHIP_02_SLOTS) {
    const entry = partEntry(`fleet-02-fleet-02-${slot.slot}`);
    assert.ok(entry, slot.slot);
    assert.equal(entry!.record.height, slot.height);
    const list = slot.pieces();
    pieces += list.length;
    const mesh = meshOf(list);
    const b = boundsOf(mesh);
    for (const v of [...b.min, ...b.max]) assert.ok(Number.isFinite(v), `${slot.slot} has finite bounds`);
    top = Math.max(top, b.max[1] + slot.at[1]);
  }
  assert.ok(pieces > 60_000, `${pieces} pieces: no bare surfaces`);
  near(top, LENGTH, 15, "the tip of the bow mast");
  assert.equal(check({ rocket: "fleet-02" }).ok, true);
  // the same slot takes the other pod: a custom build, still fitting
  const swapped = check({ rocket: "fleet-02", parts: { pod: "fleet-02-pod-survey" } });
  assert.equal(swapped.ok, true);
  assert.equal(swapped.custom, true);
});

test("decks: each of the 29 has a part of its own that can be shown alone", () => {
  const slots = new Set(SHIP_02_SLOTS.map((s) => s.slot));
  assert.equal(DECKS.length, 29);
  for (const d of DECKS) assert.ok(slots.has(d.slot), `deck ${d.n}: ${d.slot}`);
  // the rooms inside the habitat rings, the farm, the command citadel and the dock are one part to a deck, not one lump
  for (const slot of ["habitat-a-deck-1", "habitat-b-deck-3", "farm-terrace-2", "command-bridge", "command-crew", "command-medbay", "dock-hangar", "dock-works", "drive-engines"]) assert.ok(slots.has(slot), slot);
  assert.ok(!slots.has("habitat-inside") && !slots.has("command-inside"));
});

test("header tanks and the thirty-two attitude thrusters are modelled", () => {
  const bells = SHIP_02_SLOTS.find((s) => s.slot === "attitude-thrusters")!.pieces().filter((p) => p.kind === "lathe" && p.material === "bell");
  assert.equal(bells.length, 32);
  const header = SHIP_02_SLOTS.find((s) => s.slot === "header-tanks")!.pieces();
  assert.ok(header.filter((p) => p.kind === "lathe" && p.material === "hull-grey").length >= 4, "four vernier headers");
  assert.ok(SECTIONS.some((s) => s.id === "header-v") && SECTIONS.some((s) => s.id === "header-m"));
});

test("hardpoints and variants: two pod mounts and the wing tips, four named variants from swapped modules", () => {
  const ids = ROCKETS["fleet-02"].variants.map((v) => v.id);
  assert.deepEqual(ids, ["fleet-02", "fleet-02-survey", "fleet-02-tanker", "fleet-02-rescue"]);
  for (const id of ids) {
    const r = check({ rocket: "fleet-02", variant: id });
    assert.equal(r.ok, true, id);
    assert.equal(r.custom, false, `${id} is a named variant, not a custom build`);
  }
  const pods = ids.map((id) => check({ rocket: "fleet-02", variant: id }).parts.find((p) => p.slot === "pod")!.part.id);
  assert.equal(new Set(pods).size, 3, "three different dorsal pods across the variants");
  for (const slot of ["pod", "pod-ventral", "tip-port", "tip-starboard"]) assert.ok(SHIP_02_SLOTS.some((s) => s.slot === slot), slot);
  assert.ok(SECTIONS.some((s) => s.id === "hp-dorsal") && SECTIONS.some((s) => s.id === "hp-ventral") && SECTIONS.some((s) => s.id === "hp-tips"));
});

test("the viewer's panel data: sections, specification, notes and insets all point at parts that exist", () => {
  const inspector = variantOf("fleet-02")!.inspector!;
  const slots = new Set(SHIP_02_SLOTS.map((s) => s.slot));
  assert.ok(inspector.sections.length >= 55 && inspector.sections.every((s) => slots.has(s.slot)));
  assert.ok(Object.keys(inspector.places).every((slot) => slots.has(slot)));
  assert.ok(inspector.spec.some(([k, v]) => k === "Designation" && v.startsWith("SPX-207")));
  assert.deepEqual(Object.keys(inspector.notes), ["propulsion", "construction", "history", "equipment"]);
  assert.ok(inspector.insets.length >= 7);
  for (const inset of inspector.insets) {
    assert.ok(inset.slots.every((s) => slots.has(s)), inset.id);
    assert.equal(inset.parts.length >= 5 && inset.parts.length <= 6, true, inset.id);
  }
  // an inset that cuts the ship open shows the inside parts and not the shell over them
  const reactor = inspector.insets.find((i) => i.id === "reactor-core")!;
  assert.ok(reactor.slots.includes("reactor-inside") && !reactor.slots.includes("reactor"));
  // the other variants carry the same panel
  for (const v of ROCKETS["fleet-02"].variants) assert.ok(v.inspector);
});

test("Download 3D model: the full-detail .glb is made on demand, opens, and its parts and triangles match", async () => {
  const { NodeIO } = await import("@gltf-transform/core");
  const { KHRMeshQuantization } = await import("@gltf-transform/extensions");
  const { build } = await import("../src/build/index.ts");
  const built = build({ rocket: "fleet-02" });
  const glb = built.glb();
  assert.ok(glb.bytes.byteLength > 5_000_000, "the full-detail ship is a big file, which is why it is not shipped");
  const doc = await new NodeIO().registerExtensions([KHRMeshQuantization]).readBinary(glb.bytes);
  const nodes = doc.getRoot().listNodes();
  assert.equal(built.parts.length, SHIP_02_SLOTS.length);
  const meshNodes = nodes.filter((n) => n.getMesh());
  const stamps = meshNodes.filter((n) => (n.getName() ?? "").includes("~stamp"));
  assert.equal(meshNodes.length - stamps.length, built.parts.length, "one mesh to a part, plus the stamp groups");
  const names = new Set(nodes.map((n) => n.getName()));
  for (const slot of SHIP_02_SLOTS) assert.ok(names.has(slot.slot), `${slot.slot} is a node`);
  let triangles = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) if (primitive.getMode() === 4) triangles += primitive.getIndices()!.getCount() / 3;
  assert.equal(triangles, glb.triangles, "the file holds exactly the triangles the writer counted");
  let expected = 0;
  for (const slot of SHIP_02_SLOTS) {
    const mesh = meshOf(slot.pieces());
    for (const b of mesh.faces.values()) expected += b.indices.length / 3;
    for (const stamp of mesh.stamps) for (const b of stamp.mesh.faces.values()) expected += b.indices.length / 3;
  }
  assert.equal(glb.triangles, expected, "and those are the parts' own triangles");
  const part = (await import("../src/build/index.ts")).buildPart("fleet-02-fleet-02-propellant-lines").glb();
  assert.ok(part.bytes.byteLength > 1000 && part.triangles > 0);
});

test("the build budget: the first picture in a second and full detail in three, with the coarse level a fraction of the fine", async () => {
  const { build } = await import("../src/build/index.ts");
  // a warm run in Node is several times quicker than a cold page, and these limits are the page's own, so they are held with room to spare
  const t0 = performance.now();
  const coarse = build({ rocket: "fleet-02" }, { detail: "coarse" });
  const drawing = coarse.svg({ look: "line" });
  const first = performance.now() - t0;
  assert.ok(first < 1000, `the first picture took ${Math.round(first)} ms`);
  assert.ok(drawing.length < 80 * 1024);
  const t1 = performance.now();
  const coarseGlb = coarse.glb();
  const coarseMs = performance.now() - t1;
  assert.ok(coarseMs < 1500, `the coarse mesh took ${Math.round(coarseMs)} ms`);
  const t2 = performance.now();
  const fine = build({ rocket: "fleet-02" }, { detail: "full" });
  const fineGlb = fine.glb();
  const fineMs = performance.now() - t2;
  assert.ok(fineMs < 3000, `full detail took ${Math.round(fineMs)} ms`);
  // the far view carries the structure and the larger detail only
  assert.ok(coarseGlb.triangles < fineGlb.triangles / 3, `${coarseGlb.triangles} coarse against ${fineGlb.triangles} fine`);
  assert.ok(coarseGlb.triangles < 600_000 && coarseGlb.bytes.byteLength < 20_000_000);
  // every part is still there at the coarse level, and the drawing is the same at either
  assert.equal(coarse.parts.length, fine.parts.length);
  assert.ok(Math.abs(coarse.svg({ look: "line" }).length - fine.svg({ look: "line" }).length) < 4000, "the drawing is the same drawing at either level");
  // a build at one level does not leak into the next
  assert.ok(build({ rocket: "falcon-9" }).glb().triangles > 0);
});

test("nothing a reader sees calls the ship fictional: the status is kept in the data and shown nowhere", async () => {
  const { SECTIONS: sections } = await import("../src/model/fleet/ship-02/sections.ts");
  const { NOTES, ENGINE_CARDS: cards, HULL_STACK_RING: layers, DECKS: decks, INSETS: insets } = await import("../src/model/fleet/ship-02/specs.ts");
  const strip = (v: unknown) => JSON.stringify(v, (k, x) => (k === "status" ? undefined : x));
  for (const v of ROCKETS["fleet-02"].variants) assert.ok(!/fiction/i.test(strip(v)), v.id);
  assert.ok(!/fiction/i.test(strip([sections, NOTES, cards, layers, decks, insets, MAKERS.fleet])));
  assert.equal(variantOf("fleet-02")?.status, "fictional");
  assert.equal(variantOf("fleet-02")?.firstWord, "Planned first flight");
});
