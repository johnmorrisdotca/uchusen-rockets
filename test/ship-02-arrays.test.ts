// The first design's mended drive (MODULES-437): the eight scaled-up torch bells become eight rings of seven magnetic-nozzle thrusters, as a variant beside the original, which stays as it was.
import assert from "node:assert/strict";
import test from "node:test";
import { check, partEntry, ROCKETS, variantOf } from "../src/index.ts";
import { ARRAY, ARRAY_REACH, arrayPieces, driveArrays, PER_TORCH, THRUSTERS } from "../src/model/fleet/ship-02/arrays.ts";
import { DRIVE } from "../src/model/fleet/ship-02/dims.ts";
import { driveEngines } from "../src/model/fleet/ship-02/drive.ts";
import { SHIP_02_SLOTS } from "../src/model/fleet/ship-02/index.ts";
import { ENGINE_CARDS } from "../src/model/fleet/ship-02/specs.ts";
import { boundsOfPieces } from "../src/model/pieces.ts";

test("eight rings of seven: 56 thrusters, each torch's place filled and inside the old bell's footprint", () => {
  assert.equal(PER_TORCH, 7);
  assert.equal(THRUSTERS, 56);
  assert.equal(THRUSTERS, DRIVE.nozzles * PER_TORCH);
  assert.ok(ARRAY_REACH < DRIVE.exit, `the array reaches ${ARRAY_REACH} m, the bell's lip is at ${DRIVE.exit} m`);
  const one = boundsOfPieces(arrayPieces());
  assert.ok(Math.max(one.max[0], one.max[2], -one.min[0], -one.min[2]) <= DRIVE.exit);
  const all = boundsOfPieces(driveArrays());
  for (const x of DRIVE.columns) assert.ok(all.min[0] <= x - ARRAY.r && all.max[0] >= x + ARRAY.r);
  assert.equal(JSON.stringify(driveArrays()), JSON.stringify(driveArrays()));
});

test("no bell: nothing of the array is a lathe as wide as a torch's bell, and it hangs from the raft, not down the old length", () => {
  const widest = (pieces: ReturnType<typeof driveArrays>) => Math.max(...pieces.filter((p) => p.kind === "lathe").map((p) => Math.max(...p.profile.map(([r]) => r))));
  assert.ok(widest(driveEngines()) >= DRIVE.exit, "the original's bell is as wide as 25 m");
  assert.ok(widest(driveArrays()) < DRIVE.exit / 2, `the array's widest piece is ${widest(driveArrays())} m`);
  const old = boundsOfPieces(driveEngines());
  const now = boundsOfPieces(driveArrays());
  assert.ok(old.min[1] < 5 && now.min[1] > DRIVE.length, "the thrusters hang below the raft, where the bells' chambers were, not 96 m down");
});

test("the variant is a named variant of the first design at both addresses, swaps only the engine part, and leaves the original variants as they were", () => {
  for (const rocket of ["fleet-02", "fleet-02-original"]) {
    const variant = ROCKETS[rocket].variants.find((v) => v.id === "fleet-02-arrays");
    assert.ok(variant, rocket);
    assert.match(variant.name, /first design, thruster arrays/);
    const report = check({ rocket, variant: "fleet-02-arrays" });
    assert.ok(report.ok && report.custom === false, JSON.stringify(report.issues));
    const swapped = report.parts.filter((p) => p.part.id !== `fleet-02-fleet-02-${p.slot}`);
    assert.deepEqual(swapped.map((p) => p.slot), ["drive-engines"]);
    assert.equal(swapped[0].part.id, "fleet-02-drive-engines-arrays");
  }
  const standard = check({ rocket: "fleet-02", variant: "fleet-02" }).parts.find((p) => p.slot === "drive-engines");
  assert.equal(standard?.part.id, "fleet-02-fleet-02-drive-engines");
  assert.equal(partEntry("fleet-02-fleet-02-drive-engines")?.pieces().length, driveEngines().length, "the original's drive is the bells, untouched");
  assert.ok(SHIP_02_SLOTS.some((s) => s.slot === "drive-engines"));
});

test("the thrust is the first design's, divided over the thrusters: nothing is typed", () => {
  const inspector = variantOf("fleet-02", "fleet-02-arrays")?.inspector;
  assert.ok(inspector);
  const total = ENGINE_CARDS[0].thrustEachN * ENGINE_CARDS[0].count;
  const row = inspector.spec.find(([k]) => k === ENGINE_CARDS[0].name);
  assert.ok(row);
  const each = Number(/^56 x ([\d.,]+) MN/.exec(row[1])?.[1].replace(/,/g, ""));
  assert.ok(Math.abs(each * THRUSTERS * 1e6 - total) / total < 0.01, `${each} MN x 56 is not ${total} N`);
  assert.match(inspector.spec.find(([k]) => k === "Drive")?.[1] ?? "", /56 magnetic-nozzle thrusters in 8 arrays/);
  // every label that points at the drive stands where the thrusters are, not where the bells were
  for (const section of inspector.sections.filter((s) => s.slot === "drive-engines")) assert.ok(section.at[1] >= ARRAY.plane - 18 - 0.01 && section.at[1] <= ARRAY.plane + 18 + 0.01, `${section.id} at ${section.at[1]}`);
  assert.doesNotMatch(JSON.stringify(inspector.sections.filter((s) => s.slot === "drive-engines")), /bell|lip|torch nozzle/i);
  // the standard variant keeps its bells in its words
  assert.match(JSON.stringify(variantOf("fleet-02", "fleet-02")?.inspector?.sections), /50 m across the lip/);
});

test("the thruster has a propulsion card on its own", () => {
  const card = partEntry("fleet-02-thruster-array");
  assert.ok(card);
  assert.equal(card.record.kind, "engine");
  assert.ok(card.pieces().length > 30);
  assert.ok(card.record.height > 10 && card.record.diameter < 20);
});
