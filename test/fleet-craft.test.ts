import assert from "node:assert/strict";
import test from "node:test";
import { ATC_VARIANTS } from "../src/data/atc.ts";
import { check, HULL_STACKS, ROCKETS, stackDepth } from "../src/index.ts";
import { CRAFT_STACKS, PROPULSION, SECTIONS, STACK_OF } from "../src/model/fleet/craft/cards.ts";
import { enginePieces, LAYER_SCALE, layerPieces } from "../src/model/fleet/craft/extras.ts";
import { collar, COLLARS, mates } from "../src/model/fleet/collars.ts";
import { ATC, ATC_IDS, ATC_NAMES, CARRIES, DOORS, DOOR_MARGIN, envelopeOf, specRows, spareOf, type AtcId } from "../src/model/fleet/craft/index.ts";
import { HANGAR_DOOR } from "../src/model/fleet/ship-02/dims.ts";
import { doorOf } from "../src/model/fleet/ship-03/dims.ts";
import { PORTS as HANABUSA } from "../src/model/fleet/ship-01/docking.ts";
import { PORTS as KYOTORI } from "../src/model/fleet/ship-kyotori/docking.ts";

const built = ATC_IDS.filter((id) => ATC[id]);
/** The craft built so far: the family grows one commit at a time, and this line says how far. */
const EXPECT: AtcId[] = ["crew-shuttle", "cargo-tug", "rescue-cutter", "survey-lander", "survey-drone"];

test("the doors are the ships' own: Miyamoto's rescue bay 76 by 16 m, survey bay 72 by 16 m, Kaminari's dorsal hangar 121 by 64 m", () => {
  assert.deepEqual([doorOf("starboard-aft").wide, doorOf("starboard-aft").high], [76, 16]);
  assert.deepEqual([doorOf("port-fore").wide, doorOf("port-fore").high], [72, 16]);
  assert.deepEqual([HANGAR_DOOR.wide, HANGAR_DOOR.high], [121, 64]);
  assert.equal(DOORS.length, 3);
});

test("every craft built passes every hangar door with a metre to spare on each side, in either turn", () => {
  assert.deepEqual(built, EXPECT);
  for (const id of built) {
    const craft = ATC[id];
    assert.ok(craft);
    for (const door of DOORS) assert.ok(spareOf(craft.envelope, door) >= 0, `${id} in ${door.ship}: ${spareOf(craft.envelope, door)} m to spare`);
    // the envelope is the pieces' own bounds, not a typed number
    assert.deepEqual(craft.envelope, envelopeOf(craft.pieces()));
  }
  assert.equal(DOOR_MARGIN, 1);
  assert.ok(spareOf({ across: 15, deep: 15, long: 18 }, { wide: 76, high: 16 }) < 0, "a craft 15 m deep has no spare in a 16 m door with the margin");
});

test("a craft's docking collar is in its pieces, on its nose, and mates every port that carries it", () => {
  for (const id of built) {
    const craft = ATC[id];
    assert.ok(craft);
    if (craft.collar === null) {
      assert.equal(id, "survey-drone", "only the drone is held by a clamp");
      assert.ok(!CARRIES.some((c) => c.craft === id && c.port), "a craft with no collar has no port");
      continue;
    }
    const mine = JSON.stringify(craft.pieces());
    for (const piece of collar(craft.collar, craft.nose ?? NaN, 1)) assert.ok(mine.includes(JSON.stringify(piece)), `${id} is missing a piece of its class ${craft.collar} collar`);
    const rows = CARRIES.filter((c) => c.craft === id);
    assert.ok(rows.length >= 3, `${id} is carried by ${rows.length} ships`);
    for (const row of rows) {
      if (!row.port) continue;
      const table = row.ship === "fleet-ship-01" ? HANABUSA : KYOTORI;
      const port = table.find((p) => p.id === row.port?.id);
      assert.ok(port, `${row.ship} has no port ${row.port.id}`);
      assert.ok(mates(craft.collar, port.collar), `${id} (${craft.collar}) does not mate ${row.ship} ${port.id} (${port.collar})`);
    }
  }
  assert.equal(COLLARS.M.outer, 6);
  assert.equal(COLLARS.L.outer, 12);
});

test("each craft has its name from the one map, a role, a lineage and a spec card that reads them", () => {
  for (const id of ATC_IDS) assert.match(ATC_NAMES[id].name, /^ATC /);
  for (const id of ATC_IDS) assert.ok(ATC_NAMES[id].number === null || /^SPX-\d{3}$/.test(ATC_NAMES[id].number ?? ""));
  for (const id of built) {
    const craft = ATC[id];
    assert.ok(craft);
    assert.ok(craft.ancestor.length > 30 && craft.role.length > 10);
    const rows = Object.fromEntries(specRows(id));
    assert.equal(rows["Name"], ATC_NAMES[id].name);
    assert.equal(rows["Descends from"], craft.ancestor);
    assert.match(rows["Docking collar"], craft.collar ? new RegExp(`Class ${craft.collar}`) : /^None: a cradle clamp/);
    assert.match(rows["Tightest hangar door"], /to spare/);
  }
  assert.throws(() => specRows("no-such-craft" as AtcId), RangeError);
});

test("the crewed craft open for a cutaway and the others do not; every build is the same twice", () => {
  assert.deepEqual(built.filter((id) => ATC[id]?.crewed), EXPECT.filter((id) => ["crew-shuttle", "rescue-cutter", "eva-pod"].includes(id)));
  for (const id of built) {
    const craft = ATC[id];
    assert.ok(craft);
    const open = craft.pieces({ cutaway: true }).length;
    if (craft.crewed) assert.ok(open > craft.pieces().length + 5, `${id} has no inside`);
    else assert.equal(open, craft.pieces().length, `${id} is uncrewed and has no cutaway`);
    assert.equal(JSON.stringify(craft.pieces({ cutaway: true })), JSON.stringify(craft.pieces({ cutaway: true })));
  }
  assert.ok((ATC["crew-shuttle"]?.pieces({ cutaway: true }).length ?? 0) > (ATC["crew-shuttle"]?.pieces().length ?? 0) + 100);
});

test("the sizes are held: each craft is as long as designed, and the survey drone is the smallest and the cargo tug the widest", () => {
  const size = (id: AtcId) => ATC[id]?.envelope;
  const near = (a: number | undefined, b: number, tol = 0.6) => assert.ok(a === undefined || Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
  near(size("rescue-cutter")?.long, 18.9, 0.5);
  near(size("survey-lander")?.across, 9.4, 0.05);
  near(size("survey-lander")?.long, 7.9, 0.2);
  near(size("survey-drone")?.long, 1.65, 0.1);
  near(size("eva-pod")?.long, 4, 0.1);
  assert.ok(built.every((id) => id === "survey-drone" || (size(id)?.long ?? 0) > (size("survey-drone")?.long ?? 0)));
  assert.ok(built.every((id) => id === "cargo-tug" || Math.max(size(id)?.across ?? 0, size(id)?.deep ?? 0) < Math.max(size("cargo-tug")?.across ?? 0, size("cargo-tug")?.deep ?? 0)));
});

test("the craft are one rocket of the fleet and the fit report is clean for each", () => {
  assert.ok(ROCKETS["fleet-atc"]);
  assert.equal(ROCKETS["fleet-atc"].maker, "fleet");
  assert.deepEqual(ROCKETS["fleet-atc"].variants.map((v) => v.id), EXPECT);
  for (const variant of built) {
    const report = check({ rocket: "fleet-atc", variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
  }
});

test("each craft has labelled sections nose to tail, every one on a slot of the variant, and the labels spread over the length", () => {
  for (const id of built) {
    const rows = SECTIONS[id];
    const variant = ATC_VARIANTS.find((v) => v.id === id);
    assert.ok(variant?.inspector);
    assert.ok(rows.length >= 6, `${id} has ${rows.length} labels`);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    const heights = rows.map((r) => r.at[1]);
    const long = ATC[id]?.envelope.long ?? 0;
    assert.ok(Math.max(...heights) - Math.min(...heights) >= 0.6 * long, `${id}'s labels cover ${(Math.max(...heights) - Math.min(...heights)).toFixed(1)} of ${long} m`);
    for (const section of variant.inspector.sections) assert.ok(variant.slots.includes(section.slot), `${id}: ${section.id} is on no slot`);
    for (const slot of variant.slots) assert.ok(variant.inspector.places[slot], `${id}: ${slot} has no place`);
    for (const inset of variant.inspector.insets) for (const slot of inset.slots) assert.ok(variant.slots.includes(slot), `${id}: inset ${inset.id} shows ${slot}`);
  }
  const insets = (id: AtcId) => ATC_VARIANTS.find((v) => v.id === id)?.inspector?.insets.map((i) => i.id).join();
  if (built.includes("rescue-cutter")) assert.equal(insets("rescue-cutter"), "cabin,collar,engine,layers");
  if (built.includes("survey-drone")) assert.equal(insets("survey-drone"), "engine,layers");
});

test("each craft has a propulsion card drawn on its own, numbered, with no thrust figure it cannot source", () => {
  for (const id of built) {
    const card = PROPULSION[id];
    assert.deepEqual(card.parts.map((p) => p.n), card.parts.map((_, i) => i + 1));
    assert.ok(card.parts.length >= 4 && card.count >= 1 && card.operation.length > 20);
    assert.equal(card.propellant, null, "a propellant is named only with a source");
    const pieces = enginePieces(id);
    assert.ok(pieces.length >= 8, `${id}'s engine card is ${pieces.length} pieces`);
    assert.equal(JSON.stringify(pieces), JSON.stringify(enginePieces(id)));
    const rows = Object.fromEntries(specRows(id).concat([]));
    assert.ok(!("Thrust" in rows));
    const variant = ATC_VARIANTS.find((v) => v.id === id);
    assert.match(JSON.stringify(variant?.inspector?.spec), /Not given: a design of this package, with no source/);
    const inset = variant?.inspector?.insets.find((i) => i.id === "engine");
    assert.equal(inset?.parts.length, card.parts.length);
  }
  assert.equal(PROPULSION["rescue-cutter"].parts[0].name, "Bell");
  assert.equal(PROPULSION["survey-drone"].parts[0].name, "Nozzle");
});

test("hull layers: a crewed craft has a pressure hull, an uncrewed one a lighter skin, and the card draws a shell for each layer", () => {
  assert.ok(CRAFT_STACKS.craft.layers.some((l) => l.id === "pressure"));
  assert.ok(!("craft" in HULL_STACKS), "the ships' stacks keep their own rules");
  assert.ok(!CRAFT_STACKS.probe.layers.some((l) => l.id === "pressure"));
  assert.ok(stackDepth(CRAFT_STACKS.craft) > stackDepth(CRAFT_STACKS.probe));
  assert.ok(stackDepth(CRAFT_STACKS.craft) < stackDepth(HULL_STACKS.explorer), "a small craft's wall is thinner than a ship's");
  for (const id of built) {
    const stack = CRAFT_STACKS[STACK_OF[id]];
    assert.equal(STACK_OF[id], ATC[id]?.crewed ? "craft" : "probe");
    // one shell and two cut faces for each layer
    assert.equal(layerPieces(id).length, stack.layers.length * 3);
    const variant = ATC_VARIANTS.find((v) => v.id === id);
    assert.equal(variant?.inspector?.insets.find((i) => i.id === "layers")?.parts.length, stack.layers.length);
  }
  assert.equal(LAYER_SCALE, 10);
});
