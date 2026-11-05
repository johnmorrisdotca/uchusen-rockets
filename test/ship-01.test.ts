// ISV Hanabusa (SPX-013): the physics the bible prints, the wheels' numbers, its parts in metres, the detail on every module, one mesh for one description, the named sections and decks, the ring order, and how long it takes to build.
import assert from "node:assert/strict";
import { test } from "node:test";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { BUILD_BUDGET_MS, MATERIALS, PART_ENTRIES, ROCKETS, check } from "../src/index.ts";
import { LEVELS, parts } from "../src/model/fleet/ship-01/index.ts";
import { HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
import { ANCESTORS, DRIVE, ENGINES, ENVELOPE, HISTORY, IDENTITY, journey, labelDensity, labels, LIFE, longestBurnLy, MASS, idealMidpoint, OPERATOR, ROUTES, SECTIONS, specification, STATUS, TITLE_BLOCK, deckSummary, wheelLines } from "../src/model/fleet/ship-01/specs.ts";
import { rings, ship4 } from "../src/model/fleet/ship-01/rings.ts";
import { gAt, rpmFor, SPIN, SPIN4 } from "../src/model/fleet/ship-01/spin.ts";
import { SPINE_Y } from "../src/model/fleet/ship-01/hull.ts";
import { clearance, craftBox, DOCK, dockingPieces, gapTo, PORTS } from "../src/model/fleet/ship-01/docking.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);

test("the performance: 0.060 g at 0.70 c exhaust, and every number of the bible's table", () => {
  const trip = journey(ROUTES.benchmark);
  near(trip.onboardYears, 16.615, 0.001, "years aboard");
  near(trip.endpointYears, 17.358, 0.001, "years at the ends");
  near(trip.peak, 0.47349, 0.00001, "peak speed");
  near(trip.thrust / 1e6, 191.23, 0.01, "launch thrust in MN");
  near(trip.arrivalMass, 74_713, 1, "arrival mass");
  near(idealMidpoint(), 0.4835, 0.0001, "ideal midpoint speed");
  near(longestBurnLy(), 6.37, 0.01, "longest burn at the shield limit");
  const proxima = journey(ROUTES.proxima);
  near(proxima.onboardYears, 16.39, 0.01, "Proxima, aboard");
  near(proxima.endpointYears, 17.1, 0.01, "Proxima, Earth's frame");
  assert.ok(trip.peak < DRIVE.shieldLimitOfC, "the trip stays inside the shield limit");
  assert.ok(trip.arrivalMass > MASS.inert + MASS.reserve, "it arrives with its reserve");
  assert.equal(MASS.inert + MASS.propellant, MASS.full);
});

test("the engine cards agree: thrust is mass flow times exhaust speed, and nineteen thrusters carry the ship", () => {
  const main = ENGINES["hanabusa-main"];
  assert.equal(main.count, 19);
  near(main.thrust * main.count, journey(ROUTES.benchmark).thrust, 1, "nineteen thrusters give the launch thrust");
  near(main.exhaustOfC, 0.7, 1e-9, "main exhaust");
  const gamma = 1 / Math.sqrt(1 - main.exhaustOfC ** 2);
  near(main.massFlow * gamma * main.exhaust, main.thrust, 1, "relativistic thrust");
  const trim = ENGINES["hanabusa-trim"];
  near(trim.massFlow * trim.exhaust, trim.thrust, 1e-3, "trim pod");
  assert.ok(trim.thrust * trim.count < main.thrust * main.count * 0.1, "the trim pods cannot brake the ship");
  assert.equal(Object.values(ENGINES).length, 2);
});

test("the wheels' numbers are computed, not typed: 4.00 rpm for 1 g at 56 m, the rings of W4 at 3.43 rpm, the industrial wheel at 2.83", () => {
  near(SPIN.close.rpm1g, 3.996, 0.001, "56 m radius, 1 g");
  near(SPIN.close.rpmHalf, 2.826, 0.001, "56 m radius, 0.5 g");
  near(SPIN.industrial.rpm1g, 2.826, 0.001, "112 m radius, 1 g");
  near(SPIN4.sharedRpm, 3.43, 0.01, "shared rpm");
  near(gAt(76, SPIN4.sharedRpm), 1, 1e-9, "living ring, 1 g");
  near(gAt(48, SPIN4.sharedRpm), 0.63, 0.01, "garden ring");
  near(gAt(62, SPIN4.sharedRpm), 0.82, 0.01, "research ring");
  near(rpmFor(48), 4.32, 0.01, "garden ring on its own bearing");
  assert.ok(SPIN4.ownRpm[0] > 4, "the alternative would put the smallest ring over the comfort limit");
  const text = wheelLines().map((line) => `${line.value} ${line.note ?? ""}`).join(" ");
  for (const word of ["3.43 rpm", "0.63 g", "0.82 g", "1.00 g", "112 m radius", "2.83 rpm"]) assert.ok(text.includes(word), word);
});

test("the identity and the specification: the SPX designation, the Japanese name, the numbers, a plan and not a record", () => {
  assert.equal(IDENTITY.designation, "SPX-013");
  assert.equal(IDENTITY.type, "IXV");
  assert.equal(OPERATOR, "SPX");
  assert.equal(TITLE_BLOCK, "ISV Hanabusa, SPX-013 · Hanabusa class · IXV · SPX · MND ×19 · KAZE core v4");
  assert.equal(IDENTITY.maker, "SPX");
  assert.equal(IDENTITY.japanese, "花房");
  assert.equal(IDENTITY.meaning, "flower cluster");
  assert.deepEqual([ENVELOPE.length, ENVELOPE.beam, ENVELOPE.height], [611, 225, 225]);
  const lines = specification().map((line) => `${line.name}: ${line.value} ${line.note ?? ""}`).join("\n");
  for (const text of ["ISV Hanabusa, SPX-013", "KAZE core v4", "MND", "611 m", "225 m", "325,000 t", "16.62 years aboard", "17.36 years", "0.06 g sustained"]) assert.ok(lines.includes(text), text);
  assert.ok(HISTORY.service.includes("2461") && IDENTITY.firstFlight === 2461 && STATUS === "STATUS: PLANNED · FIRST FLIGHT 2461");
  assert.ok(!/in service|serving|was commissioned/i.test(Object.values(HISTORY).join(" ")), "the history reads as a plan");
  assert.ok(Object.keys(LIFE).length === 6);
  assert.equal(ROCKETS["fleet-ship-01"].madeBy.value, "SPX");
  // never "Ship 01" in visible text
  const visible = [lines, ...Object.values(HISTORY), ...Object.values(LIFE), ...SECTIONS.map((s) => s.name + s.does), ...ROCKETS["fleet-ship-01"].variants.map((v) => v.name + (v.note ?? ""))].join(" ");
  assert.ok(!/ship 0\d/i.test(visible), "no working name in visible text");
  assert.ok(!/fictional/i.test(visible), "no visible fictional tag");
});

test("each part is built where it says, in metres, and stands on its origin", () => {
  for (const part of parts()) {
    const pieces = part.pieces();
    const { min, max } = boundsOf(meshOf(pieces));
    assert.ok(Number.isFinite(min[1]) && max[1] > min[1], part.id);
    assert.ok(min[1] >= -8, `${part.id}: stands from ${min[1]}`);
    assert.ok(max[1] <= part.height + 12, `${part.id}: ${max[1]} against ${part.height}`);
    if (part.id.startsWith("boom") || part.id === "hubs") continue;
    assert.ok(max[1] >= part.height * 0.8, `${part.id}: only ${max[1]} of ${part.height}`);
    assert.ok(Math.abs(min[0]) < 130 && Math.abs(max[0]) < 130, `${part.id}: ${min[0]}..${max[0]}`);
  }
  // the rings stand where the order puts them: the smallest nearest the bow by default
  const bow = rings("bow");
  assert.deepEqual(bow.map((r) => r.rOut), [48, 62, 76]);
  assert.ok(bow[0].y > bow[1].y && bow[1].y > bow[2].y, "smallest at the bow");
  const aft = rings("aft");
  assert.ok(aft[0].y < aft[1].y && aft[1].y < aft[2].y, "the other order: smallest at the stern");
  assert.equal(HANABUSA_VARIANT_SLOTS.hanabusa["ring-garden"], "ring-garden");
  assert.equal(HANABUSA_VARIANT_SLOTS["hanabusa-aft"]["ring-garden"], "ring-garden-aft");
  assert.equal(HANABUSA_VARIANT_SLOTS["hanabusa-section"]["ring-living"], "ring-living-section");
  // the rings are spaced so light reaches every level: 75 m apart with a 24 to 26 m section
  for (const r of bow) assert.ok(SPIN.close.spacing - r.depth > 45, `${r.use}: open space ${SPIN.close.spacing - r.depth}`);
  assert.ok(SPINE_Y.end > 580 && SPINE_Y.end < 600, `${SPINE_Y.end} m of hull`);
});

test("no module has a bare surface: hundreds of pieces and many kinds of detail, and the whole ship tens of thousands", () => {
  const all = parts();
  const materialsOf = (pieces: readonly Piece[]) => new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));
  let total = 0;
  for (const part of all) {
    const pieces = part.pieces();
    total += pieces.length;
    if (["hubs", "wheel-industrial", "ring-living-section", "adapter", "drive", "docks"].includes(part.id)) continue;
    assert.ok(pieces.length >= 400, `${part.id}: ${pieces.length} pieces`);
    assert.ok(materialsOf(pieces).size >= 6, `${part.id}: ${materialsOf(pieces).size} materials`);
  }
  const ids = Object.values(HANABUSA_VARIANT_SLOTS.hanabusa);
  const whole = all.filter((part) => ids.includes(part.id)).reduce((sum, part) => sum + part.pieces().length, 0);
  assert.ok(whole >= 40_000, `${whole} pieces in the ship`);
  assert.ok(total > whole);
  const everything = all.flatMap((part) => part.pieces());
  for (const material of ["glass-clear", "grow-lamp", "solar", "window", "plant", "water", "leaf", "coil-lit", "copper", "hull-white", "hull-orange", "flood", "lamp-amber", "lamp-blue"]) assert.ok(everything.some((piece) => piece.kind !== "lines" && piece.material === material), `no ${material}`);
  for (const piece of everything) if (piece.kind !== "lines") assert.ok(piece.material in MATERIALS, piece.material);
});

test("a mesh is a pure function of its description: the same part twice is the same bytes", () => {
  for (const id of ["drive", "tank-4", "ring-living", "boom-port"]) {
    const part = parts().find((one) => one.id === id)!;
    const bytes = () => toGlb([{ name: id, mesh: meshOf(part.pieces({ detail: 0.5 })), at: [0, 0, 0] }]).bytes;
    assert.deepEqual(bytes(), bytes(), id);
  }
});

test("the levels of detail: a quarter of the detail is far fewer pieces, and the first picture is a small share", () => {
  assert.deepEqual([...LEVELS], [0.25, 0.6, 1]);
  for (const id of ["tank-4", "drum-farm-1"]) {
    const part = parts().find((one) => one.id === id)!;
    const [low, mid, full] = LEVELS.map((detail) => part.pieces({ detail }).length);
    assert.ok(low < mid && mid < full, `${id}: ${low}, ${mid}, ${full}`);
  }
  assert.ok(parts().find((one) => one.id === "tank-4")!.pieces({ level: "coarse" }).length < 200);
});

test("Hanabusa is in the registry: three variants, every slot's part exists, the joints fit, and it is in the story, with no visible tag", () => {
  const rocket = ROCKETS["fleet-ship-01"];
  assert.equal(rocket.variants.length, 3);
  for (const variant of rocket.variants) {
    assert.equal(variant.status, "fictional");
    assert.ok(!/fictional/i.test(variant.name), variant.name);
    assert.equal(variant.view?.tiltMax, 90);
    assert.deepEqual(Object.keys(variant.partIds ?? {}), [...variant.slots]);
    for (const id of Object.values(variant.partIds ?? {})) assert.ok(PART_ENTRIES.some((entry) => entry.record.id === id), id);
    const report = check({ rocket: rocket.id, variant: variant.id });
    assert.equal(report.ok, true, `${variant.id}: ${JSON.stringify(report).slice(0, 200)}`);
    assert.ok(variant.inspector && variant.inspector.sections.length >= 40, variant.id);
  }
  for (const entry of PART_ENTRIES) if (entry.record.rocket === "fleet-ship-01") assert.ok(entry.record.trueTo.length > 0, entry.record.id);
  const shared = PART_ENTRIES.find((entry) => entry.record.id === "fleet-ship-01-tank-1");
  assert.deepEqual(shared?.record.trueTo, ["hanabusa", "hanabusa-aft", "hanabusa-section"]);
  assert.equal(ROCKETS["fleet-insets-ship-01"].variants.length, 4);
});

test("every variant builds in every look and view", () => {
  for (const variant of ROCKETS["fleet-ship-01"].variants) {
    const built = build({ rocket: "fleet-ship-01", variant: variant.id });
    assert.ok(built.parts.length >= 30, variant.id);
    for (const look of ["line", "thick", "painted"] as const) assert.ok(built.svg({ look }).length > 500);
  }
});

test("sections and decks: a label for every few percent of the length, and far more decks than a 139 m ship's 12", () => {
  const density = labelDensity();
  assert.ok(density.shareEach <= 0.05, `one label for every ${(density.shareEach * 100).toFixed(1)}% of the length`);
  assert.ok(density.labels >= 40 && labels().length === SECTIONS.length);
  const decks = deckSummary();
  assert.ok(decks.length >= 24, `${decks.length} decks`);
  assert.deepEqual(decks.map((deck) => deck.number), decks.map((_, i) => i + 1));
  for (let i = 1; i < decks.length; i++) assert.ok(decks[i].to <= decks[i - 1].to + 1e-9, "bow to stern");
  for (const module of ["drive", "reactor", "tank-1", "drum-farm-1", "node", "lab", "solarium", "dome", "ring-garden", "ring-research", "ring-living", "wheel-industrial", "boom-port", "hubs"]) assert.ok(SECTIONS.some((section) => section.module === module), module);
  assert.ok(labels().some((label) => label.side === "left") && labels().some((label) => label.side === "right"));
  for (const label of labels()) assert.ok(Math.abs(label.at[0]) <= 125 && label.at[1] >= -8 && label.at[1] <= 620 && Math.abs(label.at[2]) <= 125, label.id);
});

for (const variant of ["hanabusa", "hanabusa-aft"] as const) test(`the build budget, ${variant}: the first picture inside a second, the full detail inside three, on this computer`, () => {
  const stowed = Object.values(HANABUSA_VARIANT_SLOTS[variant]);
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
  assert.ok(coarse.pieces > 150 && coarse.pieces < full.pieces * 0.1, `${coarse.pieces} coarse of ${full.pieces}`);
});

test("every module names the real hardware it descends from, and there is no bell", () => {
  for (const part of parts()) assert.ok(part.note.includes("Descends from"), `${part.id}: ${part.note}`);
  for (const key of ["drive", "reactor", "tanks", "drums", "booms", "rings", "halls", "node", "dome", "lift"]) assert.ok(ANCESTORS[key], key);
  // no chemical-rocket bell: the drive is nineteen thrusters of coil rings, and its pieces have no bell material
  const drive = parts().find((part) => part.id === "drive")!.pieces();
  assert.ok(!drive.some((piece) => piece.kind !== "lines" && (piece.material === "bell" || piece.material === "bell-inside")));
  assert.ok(drive.filter((piece) => piece.kind === "lathe" && piece.material === "coil-lit").length >= 19 * 5);
});

test("the ring order is one parameter, and both orders build the same pieces", () => {
  assert.equal(ship4("bow").length, ship4("aft").length);
});

test("the docking plan: ports as data, long-stay berths with services and walkways, a Starship upper-stage berth, all on the still keel and clear of everything that turns", () => {
  const text = specification().map((line) => `${line.name} ${line.value} ${line.note ?? ""}`).join(" ");
  for (const word of ["Docking", "Dragon", "Soyuz", "HTV-X", "Orion", "Starship upper stage", "not berthed", "Bow dust shield"]) assert.ok(text.includes(word), word);
  for (const id of ["dock-crew", "dock-visitor", "dock-berth", "dock-starship", "dock-walkways", "bow-shield"]) assert.ok(SECTIONS.some((s) => s.id === id), id);
  assert.ok(LIFE.docking.includes("never on a ring") && LIFE.docking.includes("live aboard"));
  // the data: every port has a name, a class, a position, a unit direction, a mount that does not turn and a list of craft
  assert.equal(new Set(PORTS.map((port) => port.id)).size, PORTS.length);
  for (const port of PORTS) {
    assert.ok(port.name && port.allows.length > 0 && ["S", "M", "L"].includes(port.collar), port.id);
    assert.ok(port.at.every(Number.isFinite) && port.at[1] > 0, `${port.id}: position`);
    assert.ok(Math.abs(Math.hypot(...port.dir) - 1) < 1e-9, `${port.id}: direction`);
    assert.ok(port.mount && !/ring|boom|wheel|hub/i.test(port.mount) || port.id.startsWith("hub"), `${port.id}: mount ${port.mount}`);
    // clear of the rings' rims and everything that turns, with its craft in place
    const box = craftBox(port);
    const gap = gapTo(box.r0, box.r1, box.y0, box.y1);
    assert.ok(gap.gap >= (port.longStay ? 10 : 4), `${port.id}: ${gap.gap.toFixed(1)} m from the ${gap.name}`);
  }
  // long-stay berths: at least four besides the hub ports, each with the five services, a walkway and a spread of sizes from crew vehicle to the Starship upper stage
  const longStay = PORTS.filter((port) => port.longStay);
  assert.ok(longStay.length >= 4 && longStay.every((port) => port.id.startsWith("hub") === false));
  for (const port of longStay) assert.deepEqual([...port.services], ["power", "coolant", "water", "air", "data"], port.id);
  assert.ok(longStay.every((port) => port.walkway));
  assert.ok(new Set(longStay.map((port) => port.collar)).size >= 2);
  assert.ok(longStay.some((port) => port.craft.length >= 52) && longStay.some((port) => port.craft.length <= 8.3));
  assert.deepEqual(PORTS.filter((port) => !port.longStay).map((port) => port.collar), ["L", "L", "L", "L"]);
  // the nearest approach, with the craft in place: the berth's tail (the lowest thing docked) against the tops of the booms and the garden ring
  const c = clearance();
  assert.ok(c.toBooms >= 10 && c.toRing >= 25 && c.worst >= 10, `${c.toBooms} m to the booms, ${c.toRing} m to the ring, worst ${c.worst}`);
  assert.ok(c.reach < 21 && c.berthReach < 20, `reach ${c.reach} and ${c.berthReach} m from the axis`);
  // the stage fits along the keel, and the shield stands ahead of every berth
  assert.ok(DOCK.berth.y0 + DOCK.berth.length <= SPINE_Y.end && DOCK.shield.y0 >= DOCK.berth.y0 + DOCK.berth.length);
  assert.ok(DOCK.shield.radius > c.reach, "every berth is in the shield's shadow");
  // the real models, placed: the package's own Starship upper stage, Dragon and the Soyuz of 1975, none of them lower than the tops of the booms plus ten metres
  const lowest = (id: string, base: number) => base + boundsOf(meshOf(PART_ENTRIES.find((e) => e.record.id === id)!.pieces())).min[1];
  for (const [id, base] of [["starship-v3-ship", DOCK.berth.y0], ["dragon-dragon-2-trunk", DOCK.face - 8.1], ["apollo-soyuz-apollo-soyuz-soyuz", DOCK.face - 7.5]] as const) assert.ok(lowest(id, base) > 100 + 17 * 24 + 10, id);
  // and in the meshes: nothing of the crown is lower than the tops of the booms plus ten metres, or past 25 m from the keel's axis
  const { min, max } = boundsOf(meshOf(dockingPieces()));
  assert.ok(min[1] > 100 + 17 * 24 + 10, `the crown starts ${min[1]} m up`);
  assert.ok(Math.max(Math.abs(min[0]), Math.abs(max[0]), Math.abs(min[2]), Math.abs(max[2])) < 25, `the crown reaches ${max[0]} m`);
});
