// NASA's own models: each stands at its sourced size, each is painted by its own file and credited to NASA, and the line looks are this package's own plain shapes.
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { check, variantOf } from "../src/index.ts";
import { build } from "../src/build/index.ts";

interface Row {
  rocket: string;
  variant: string;
  credit: string;
  files: readonly string[];
}

const ROWS: readonly Row[] = [
  { rocket: "lunar-module", variant: "lunar-module", credit: "nasa-lunar-module", files: ["lunar-module-descent.glb", "lunar-module-ascent.glb"] },
  { rocket: "apollo-soyuz", variant: "apollo-soyuz", credit: "nasa-apollo-soyuz", files: ["apollo-soyuz-csm.glb", "apollo-soyuz-docking-module.glb", "apollo-soyuz-soyuz.glb"] },
  { rocket: "gemini", variant: "gemini", credit: "nasa-gemini", files: ["gemini-adapter.glb", "gemini-capsule.glb"] },
  { rocket: "mercury", variant: "friendship-7", credit: "nasa-friendship-7", files: ["mercury-capsule.glb"] },
  { rocket: "jupiter-c", variant: "jupiter-c", credit: "nasa-jupiter-c", files: ["jupiter-c-vehicle.glb"] },
  { rocket: "iss", variant: "iss", credit: "nasa-iss", files: ["iss-station.glb"] },
  { rocket: "hubble", variant: "hubble", credit: "nasa-hubble", files: ["hubble-telescope.glb"] },
  // more models
];

const MAX_BYTES = 2.7 * 1024 * 1024;

for (const { rocket, variant, credit, files } of ROWS)
  test(`${rocket}: NASA's model, credited, within its budget, and its own plain shapes in the line looks`, () => {
    const report = check({ rocket, variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
    assert.deepEqual(report.credits.map((one) => one.id), [credit]);
    assert.equal(report.credits[0].creator, "NASA");
    assert.equal(report.credits[0].licence, "Public domain (NASA)");
    assert.ok(variantOf(rocket, variant)?.note);
    for (const file of files) assert.ok(statSync(join("models", file)).size <= MAX_BYTES, file);
    const built = build({ rocket, variant });
    assert.ok(built.parts.every((part) => part.record.painted && part.pieces.length > 0));
    assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  });
