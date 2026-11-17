import assert from "node:assert/strict";
import test from "node:test";
import { check, ROCKETS } from "../src/index.ts";
import { collar, COLLARS, mates } from "../src/model/fleet/collars.ts";
import { ATC, ATC_IDS, ATC_NAMES, CARRIES, DOORS, DOOR_MARGIN, envelopeOf, specRows, spareOf } from "../src/model/fleet/craft/index.ts";
import { SHUTTLE } from "../src/model/fleet/craft/shuttle.ts";
import { HANGAR_DOOR } from "../src/model/fleet/ship-02/dims.ts";
import { doorOf } from "../src/model/fleet/ship-03/dims.ts";
import { PORTS as HANABUSA } from "../src/model/fleet/ship-01/docking.ts";
import { PORTS as KYOTORI } from "../src/model/fleet/ship-kyotori/docking.ts";

const built = ATC_IDS.filter((id) => ATC[id]);

test("the doors are the ships' own: Miyamoto's rescue bay 76 by 16 m, survey bay 72 by 16 m, Kaminari's dorsal hangar 121 by 64 m", () => {
  assert.deepEqual([doorOf("starboard-aft").wide, doorOf("starboard-aft").high], [76, 16]);
  assert.deepEqual([doorOf("port-fore").wide, doorOf("port-fore").high], [72, 16]);
  assert.deepEqual([HANGAR_DOOR.wide, HANGAR_DOOR.high], [121, 64]);
  assert.equal(DOORS.length, 3);
});

test("every craft built passes every hangar door with a metre to spare on each side, in either turn", () => {
  assert.deepEqual(built, ["crew-shuttle"]);
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
  const nose = { "crew-shuttle": SHUTTLE.nose } as const;
  for (const id of built) {
    const craft = ATC[id];
    assert.ok(craft);
    const mine = JSON.stringify(craft.pieces());
    for (const piece of collar(craft.collar, nose[id as keyof typeof nose], 1)) assert.ok(mine.includes(JSON.stringify(piece)), `${id} is missing a piece of its class ${craft.collar} collar`);
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
    assert.match(rows["Docking collar"], new RegExp(`Class ${craft.collar}`));
    assert.match(rows["Tightest hangar door"], /to spare/);
  }
  assert.throws(() => specRows("eva-pod"), RangeError);
});

test("the shuttle opens for a cutaway; every build is the same twice", () => {
  const shuttle = ATC["crew-shuttle"];
  assert.ok(shuttle?.crewed);
  assert.ok(shuttle.pieces({ cutaway: true }).length > shuttle.pieces().length + 100);
  assert.equal(JSON.stringify(shuttle.pieces({ cutaway: true })), JSON.stringify(shuttle.pieces({ cutaway: true })));
});

test("the craft are one rocket of the fleet and the fit report is clean for each", () => {
  assert.ok(ROCKETS["fleet-atc"]);
  assert.equal(ROCKETS["fleet-atc"].maker, "fleet");
  for (const variant of ["crew-shuttle"]) {
    const report = check({ rocket: "fleet-atc", variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
  }
});
