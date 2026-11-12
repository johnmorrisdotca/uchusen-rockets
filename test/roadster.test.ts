// The Roadster: one kind, three cars, only the first of them flown; Starman in the seat of each; Falcon Heavy's test flight carrying the first in its fairing; each model small and credited; the Sun read safely.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { check, parseSun, ROCKETS, spaceSlots, variantOf } from "../src/index.ts";
import { build } from "../src/build/index.ts";

test("three cars in one kind: the first flew, the two of the second generation did not and say so", () => {
  const roadster = ROCKETS.roadster;
  assert.deepEqual(roadster.variants.map((variant) => variant.id), ["first-generation", "second-generation", "second-generation-2"]);
  assert.equal(roadster.defaultVariant, "first-generation");
  assert.equal(roadster.maker, "spacex");
  assert.equal(variantOf("roadster", "first-generation")?.status, "flown");
  assert.equal(variantOf("roadster", "first-generation")?.firstFlight.value, "2018-02-06");
  for (const id of ["second-generation", "second-generation-2"]) {
    const variant = variantOf("roadster", id);
    assert.equal(variant?.status, "announced");
    assert.match(variant?.note ?? "", /has not flown/);
    assert.equal(variant?.facts.sizes?.Wheelbase?.value, 2.825);
  }
  assert.equal(variantOf("roadster", "first-generation")?.facts.sizes?.Length?.value, 3.946);
});

test("each car is its own licensed file, about a megabyte, credited; Starman is this package's own", () => {
  const credits: Record<string, string[]> = { "first-generation": ["the86guy-roadster"], "second-generation": ["metarex4d-roadster"], "second-generation-2": ["gmmichaelonearth-roadster", "minchou19-wheels"] };
  for (const [variant, ids] of Object.entries(credits)) {
    const report = check({ rocket: "roadster", variant });
    assert.ok(report.ok && !report.custom, variant);
    assert.deepEqual(report.credits.map((credit) => credit.id).sort(), [...ids].sort(), variant);
    const car = report.parts.find(({ slot }) => slot === "car")?.part;
    const starman = report.parts.find(({ slot }) => slot === "starman")?.part;
    assert.equal(car?.painted?.file, `roadster-${variant}-car.glb`);
    assert.equal(starman?.painted, null);
    assert.ok(statSync(`models/${car?.painted?.file}`).size < 1.4 * 1024 * 1024, variant);
  }
});

test("what each car's file says was changed is what NOTICE.md says", () => {
  const notice = readFileSync("NOTICE.md", "utf8");
  for (const variant of ROCKETS.roadster.variants) {
    const bytes = readFileSync(`models/roadster-${variant.id}-car.glb`);
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as { asset: { extras: { changes: string } } };
    assert.ok(notice.includes(`| ${json.asset.extras.changes} |`), variant.id);
  }
});

test("Starman sits in the car: inside its length and width, his helmet above its doors", () => {
  for (const variant of ROCKETS.roadster.variants) {
    const built = build({ rocket: "roadster", variant: variant.id });
    const car = built.parts.find((part) => part.slot === "car")?.bounds;
    const man = built.parts.find((part) => part.slot === "starman")?.bounds;
    assert.ok(car && man, variant.id);
    for (const c of [0, 2]) assert.ok(man.min[c] >= car.min[c] && man.max[c] <= car.max[c], `${variant.id} axis ${c}`);
    assert.ok(man.max[0] > 0, `${variant.id}: in the left seat`);
    assert.ok(man.min[1] > 0, variant.id);
  }
});

test("Falcon Heavy's test flight carries the first car and Starman in its fairing, and only they fly on in space", () => {
  const report = check({ rocket: "falcon-heavy", variant: "test-flight" });
  assert.ok(report.ok && !report.custom);
  assert.deepEqual(report.credits.map((credit) => credit.id).sort(), ["antonio-falcon-heavy", "the86guy-roadster"]);
  const car = report.parts.find(({ slot }) => slot === "car")?.part;
  assert.equal(car?.painted?.file, "roadster-first-generation-car.glb");
  assert.ok((car?.strapOn?.y ?? 0) > 56.9 && (car?.strapOn?.y ?? 0) < 70 - 4);
  assert.deepEqual(spaceSlots("falcon-heavy", variantOf("falcon-heavy", "test-flight")?.slots ?? []), ["car", "starman"]);
  assert.equal(spaceSlots("falcon-heavy", variantOf("falcon-heavy", "falcon-heavy")?.slots ?? []), null);
});

test("the Sun is three numbers, made one long; anything else is no Sun", () => {
  assert.deepEqual(parseSun("2, 0, 0"), [1, 0, 0]);
  const [x, y, z] = parseSun("-1,1,0") ?? [0, 0, 0];
  assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-12 && x < 0 && y > 0);
  for (const hostile of [null, undefined, "", "east", "0,0,0", "1,2", "1,2,3,4", "1e999,0,0", "NaN,0,0", '"><script>alert(1)</script>', "1;0;0", " , , ", "x".repeat(200)]) assert.equal(parseSun(hostile), null, String(hostile));
});
