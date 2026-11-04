// What the fleet's ships share as data: engine cards whose numbers agree, the performance and the trip that follow, hull-layer stacks, named sections with labels and decks, the spec block, the legend, the scale
// bar and the views at one scale.
import assert from "node:assert/strict";
import { test } from "node:test";
import { arrangement, assemble, deckSummary, ENGINE_CARDS, engineTable, exploded, G0, HULL_STACKS, KIT, labelDensity, labelsOf, LEGEND, performanceOf, PROXIMA_LY, rocketSpeed, SAMPLE_SHIPS, scaleBar, SECTIONS, specBlock, stackDepth, trip } from "../src/index.ts";
import { layerShells } from "../src/model/fleet/layers.ts";
import { C } from "../src/model/fleet/engines.ts";

test("every engine card's numbers agree: thrust = mass flow x specific impulse x g0, exhaust = specific impulse x g0, jet power = half thrust x exhaust", () => {
  for (const card of Object.values(ENGINE_CARDS)) {
    assert.ok(Math.abs(card.thrust - card.massFlow * card.isp * G0) / card.thrust < 1e-9, card.id);
    assert.ok(Math.abs(card.exhaust - card.isp * G0) < 1e-6, card.id);
    assert.ok(Math.abs(card.exhaustOfC - card.exhaust / C) < 1e-12, card.id);
    assert.ok(Math.abs(card.jetPower - 0.5 * card.thrust * card.exhaust) / card.jetPower < 1e-9, card.id);
    assert.ok(card.exhaustOfC < 0.2 && card.massFlow > 0 && card.fuelCapacity > 0, card.id);
    assert.ok(KIT[card.module], `${card.id}: ${card.module}`);
    assert.ok(card.operation === "continuous" || (card.operation === "pulsed" && (card.pulseHz ?? 0) > 0), card.id);
    assert.ok(card.note.includes("Fictional"), card.id);
  }
  // one card for each role the fleet needs, at least main and manoeuvring
  const roles = new Set(Object.values(ENGINE_CARDS).map((card) => card.role));
  for (const role of ["main", "braking", "manoeuvring", "vernier"]) assert.ok(roles.has(role as never), role);
  // a drive whose exhaust is a few per cent of c says so
  assert.ok(ENGINE_CARDS["fusion-main"].exhaustOfC > 0.02 && ENGINE_CARDS["fusion-main"].exhaustOfC < 0.06);
});

test("the relativistic rocket equation: slow it is the classical one, and it never reaches c", () => {
  const classical = (ve: number, r: number) => ve * Math.log(r);
  assert.ok(Math.abs(rocketSpeed(0.001, 10, 1) - classical(0.001, 10)) < 1e-8);
  assert.ok(rocketSpeed(0.9, 1e6, 1) < 1);
  assert.equal(rocketSpeed(0.05, 5, 5), 0);
});

test("a trip at constant proper acceleration: one g to a star 4.37 light years off takes 3.6 years aboard and 6.0 on Earth, and the clocks differ as they must", () => {
  const t = trip(4.37, 1);
  assert.ok(Math.abs(t.ship - 3.61) < 0.03, `${t.ship}`);
  assert.ok(Math.abs(t.earth - 6.0) < 0.05, `${t.earth}`);
  assert.ok(t.peak < 1 && t.peak > 0.9);
  // slower is longer, and aboard is always shorter than on Earth, and Earth's is never under the light's own
  const slow = trip(PROXIMA_LY, 0.05);
  assert.ok(slow.earth > t.earth && slow.ship < slow.earth && slow.earth > PROXIMA_LY);
  // a cruise limit makes the trip longer and the clocks closer
  const capped = trip(PROXIMA_LY, 1, 0.5);
  assert.ok(capped.earth > trip(PROXIMA_LY, 1).earth);
  assert.ok(Math.abs(capped.peak - 0.5) < 1e-9);
  assert.ok(capped.earth > PROXIMA_LY / 0.5 - 1e-6);
});

test("a ship's performance follows from its modules and engine cards", () => {
  const p = performanceOf(SAMPLE_SHIPS.hauler);
  const a = assemble(SAMPLE_SHIPS.hauler);
  assert.equal(p.thrust, 7 * 30e6);
  assert.ok(Math.abs(p.dry - a.mass) < 1e-9 && Math.abs(p.full - (a.mass + a.propellant)) < 1e-9);
  assert.ok(Math.abs(p.accelerationFull - p.thrust / (p.full * 1000) / G0) < 1e-12);
  assert.ok(p.accelerationDry > p.accelerationFull);
  assert.ok(Math.abs(p.exhaustOfC - ENGINE_CARDS["fusion-main"].exhaustOfC) < 1e-9);
  assert.ok(p.cruise < p.topSpeed && p.topSpeed < 1);
  assert.ok(Math.abs(p.massFlow - 7 * ENGINE_CARDS["fusion-main"].massFlow) < 1e-9);
  const table = engineTable(SAMPLE_SHIPS.scout);
  assert.deepEqual(table.map((row) => [row.role, row.count]), [["main", 3]]);
});

test("hull layers: a numbered stack from the outside in, with thicknesses and materials, a different stack for each role", () => {
  const signature = new Set<string>();
  for (const [name, stack] of Object.entries(HULL_STACKS)) {
    assert.deepEqual(stack.layers.map((layer) => layer.n), stack.layers.map((_, i) => i + 1), name);
    assert.ok(stack.layers.every((layer) => layer.mm > 0 && layer.material && layer.made.length > 5 && layer.name.length > 3), name);
    // the outside is the ablative skin and the pressure hull comes before the frame and the lining
    assert.equal(stack.layers[0].id, "ablative", name);
    const ids = stack.layers.map((layer) => layer.id);
    assert.ok(ids.indexOf("pressure") < ids.indexOf("frame") && ids.indexOf("frame") < ids.indexOf("lining"), name);
    assert.ok(ids.includes("whipple") || ids.includes("armour"), name);
    signature.add(stack.layers.map((layer) => `${layer.id}${layer.mm}`).join("/"));
    assert.ok(stackDepth(stack) > 0.2 && stackDepth(stack) < 2, name);
  }
  assert.equal(signature.size, Object.keys(HULL_STACKS).length);
  const ids = (name: keyof typeof HULL_STACKS) => HULL_STACKS[name].layers.map((layer) => layer.id);
  assert.ok(ids("transport").includes("radiation") && ids("transport").includes("water"));
  assert.ok(ids("explorer").filter((id) => id === "whipple").length >= 2);
  assert.ok(ids("command").filter((id) => id === "armour").length >= 2);
  assert.ok(stackDepth(HULL_STACKS.transport) > stackDepth(HULL_STACKS.explorer));
});

test("a cutaway's layers are real concentric shells, one for each layer at its thickness, with a face for each at both cut edges", () => {
  const stack = HULL_STACKS.transport;
  const shells = layerShells(6, 0, 10, stack, [1, 5]);
  const lathes = shells.filter((piece) => piece.kind === "lathe");
  assert.equal(lathes.length, stack.layers.length);
  let radius = 6;
  for (const [i, shell] of lathes.entries()) {
    if (shell.kind !== "lathe") continue;
    const outer = Math.max(...shell.profile.map(([r]) => r));
    const inner = Math.min(...shell.profile.map(([r]) => r));
    assert.ok(Math.abs(outer - radius) < 1e-9, `layer ${i + 1} starts where the one outside it ends`);
    assert.ok(Math.abs(outer - inner - stack.layers[i].mm / 1000) < 1e-9, `layer ${i + 1} has its thickness`);
    radius = inner;
  }
  assert.ok(Math.abs(radius - (6 - stackDepth(stack))) < 1e-9);
  assert.equal(shells.filter((piece) => piece.kind === "plate").length, stack.layers.length * 2);
});

test("every module's sections are named, with a job, in order; a ship has a label for every few per cent of its length, on both sides, and its decks are numbered bow to stern", () => {
  for (const module of Object.values(KIT)) {
    const sections = SECTIONS[module.id];
    assert.ok(sections && sections.length >= 2, module.id);
    for (const section of sections) {
      assert.ok(section.name.length > 3 && section.does.length > 10, `${module.id} ${section.id}`);
      assert.ok(section.from >= 0 && section.to <= 1 && section.from < section.to, `${module.id} ${section.id}`);
    }
    assert.equal(new Set(sections.map((section) => section.id)).size, sections.length, module.id);
  }
  for (const [id, ship] of Object.entries(SAMPLE_SHIPS)) {
    const labels = labelsOf(ship);
    const density = labelDensity(ship);
    // one label for every 3 to 5 per cent of the length, or fewer per cent
    assert.ok(density.shareEach <= 0.05, `${id}: a label for every ${(density.shareEach * 100).toFixed(1)}%`);
    assert.ok(labels.some((label) => label.side === "left") && labels.some((label) => label.side === "right"));
    const length = assemble(ship).length;
    assert.ok(labels.every((label) => label.at[1] >= -0.01 && label.at[1] <= length + 0.01));
    const decks = deckSummary(ship);
    assert.deepEqual(decks.map((deck) => deck.number), decks.map((_, i) => i + 1));
    assert.ok(decks.every((deck, i) => i === 0 || deck.to <= decks[i - 1].to + 1e-9), "deck 1 is at the bow");
    assert.equal(labels.filter((label) => label.deck !== undefined).length, decks.length);
  }
  assert.ok(deckSummary(SAMPLE_SHIPS.hauler).length >= 16);
});

test("the spec block has the figures a sheet prints, and the Proxima trip in both clocks", () => {
  const lines = specBlock(SAMPLE_SHIPS.hauler);
  const names = lines.map((line) => line.name);
  for (const name of ["Length", "Beam", "Dry mass", "Full mass", "Acceleration", "Cruise speed", "Top speed", "Proxima Centauri"]) assert.ok(names.includes(name), name);
  assert.ok(names.some((name) => name.startsWith("Engines")));
  assert.match(lines.find((line) => line.name === "Proxima Centauri")?.value ?? "", /years aboard, .* years on Earth/);
});

test("the legend has our own symbols, each a stroke path; the scale bar and the views share one scale", () => {
  assert.ok(LEGEND.length >= 15 && new Set(LEGEND.map((symbol) => symbol.id)).size === LEGEND.length);
  for (const symbol of LEGEND) assert.match(symbol.path, /^[MmLlHhVvCcSsAaZz\d. -]+$/, symbol.id);
  const bar = scaleBar(2, 300);
  assert.ok(bar.pixels <= 300 && bar.metres === 100 && bar.ticks.length >= 3);
  assert.equal(bar.ticks.at(-1)?.at, bar.pixels);
  const a = arrangement(SAMPLE_SHIPS.hauler, { width: 500, height: 900 });
  assert.ok(a.views.every((view) => view.width <= 500 + 1e-6 && view.height <= 900 + 1e-6));
  assert.equal(a.views.length, 3);
  assert.ok(a.lengthRuler.ticks.length >= 3 && a.lengthRuler.ticks.length <= 16);
});

test("the exploded assembly names every module and every mounting point, at collar positions, with a gap between modules", () => {
  const parts = exploded(SAMPLE_SHIPS.hauler, 6);
  assert.equal(parts.length, SAMPLE_SHIPS.hauler.length);
  const spine = parts.filter((part) => Math.hypot(part.assembled[0], part.assembled[2]) < 0.01 && part.mounts.some((m) => m.kind === "collar-bottom" || m.kind === "collar-top") && !part.module.startsWith("container"));
  for (let i = 1; i < spine.length; i++) {
    const below = spine[i - 1];
    assert.ok(spine[i].exploded[1] - (below.exploded[1] + KIT[below.module].length) >= 5.99, `${spine[i].module} is clear of ${below.module}`);
  }
  for (const part of parts) {
    assert.ok(part.name.length > 3);
    const m = KIT[part.module];
    assert.equal(part.mounts.filter((mount) => mount.kind !== "port").length, (m.top ? 1 : 0) + (m.bottom ? 1 : 0));
    assert.equal(part.mounts.filter((mount) => mount.kind === "port").length, m.ports.length);
  }
});

test("system insets: reactor core, navigation and sensors, life support and docking port, each of five or six numbered sub-parts that are parts of the registry and open when shown apart", async () => {
  const { INSETS, PART_ENTRIES, ROCKETS } = await import("../src/index.ts");
  const { build } = await import("../src/build/index.ts");
  const { meshOf, boundsOf } = await import("../src/model/pieces.ts");
  assert.deepEqual(Object.keys(INSETS).sort(), ["docking-port", "life-support", "nav-sensors", "reactor-core"]);
  for (const inset of Object.values(INSETS)) {
    assert.ok(inset.parts.length === 5 || inset.parts.length === 6, inset.id);
    assert.deepEqual(inset.parts.map((one) => one.n), inset.parts.map((_, i) => i + 1));
    for (const one of inset.parts) {
      const entry = PART_ENTRIES.find(({ record }) => record.id === `inset-${inset.id}-${one.n}`);
      assert.ok(entry, `${inset.id} ${one.n}`);
      assert.match(entry.record.name, new RegExp(`^${one.n}\\. `));
      assert.ok(entry.record.strapOn, "placed, not stacked");
      const { min, max } = boundsOf(meshOf(one.pieces()));
      assert.ok(max[1] - min[1] > 0.2 && Math.max(max[0] - min[0], max[2] - min[2]) <= Math.max(one.size[0], one.size[2]) + 1.5, `${inset.id} ${one.n}: ${max[0] - min[0]} x ${max[1] - min[1]}`);
      assert.ok(one.pieces().length >= 4, `${inset.id} ${one.n} has detail`);
    }
    const built = build({ rocket: "fleet-insets", variant: inset.id });
    assert.equal(built.parts.length, inset.parts.length);
    assert.deepEqual(built.shows.slice(0, 2), ["together", "apart"]);
    // apart, the sub-parts stand clear of each other
    const apart = built.placesOf("apart");
    assert.equal(new Set(apart.map((place) => place.at.join(","))).size, inset.parts.length);
  }
  assert.ok(ROCKETS["fleet-insets"].variants.every((variant) => variant.status === "fictional"));
});
