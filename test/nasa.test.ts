// NASA's own models: each stands at its sourced size, each part is painted by its own file and credited to NASA, and the line looks are this package's own plain shapes. Hubble is no longer NASA's model: see stations.test.ts.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
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

/** The station's 27 parts, one file each. */
const ISS_FILES = ["zvezda", "zarya", "unity", "destiny", "harmony", "soyuz-aft", "soyuz-zvezda-nadir", "soyuz-zvezda-zenith", "soyuz-zarya-nadir", "airlock", "columbus", "kibo", "truss-s0", "truss-s1", "truss-p1", "truss-s3-s4", "truss-p3-p4", "truss-s5", "truss-p5", "truss-s6", "truss-p6", "arrays-s4", "arrays-p4", "arrays-s6", "arrays-p6", "radiators-starboard", "radiators-port"].map((part) => `iss-${part}.glb`);

const ROWS: readonly Row[] = [
  { rocket: "lunar-module", variant: "lunar-module", credit: "nasa-lunar-module", files: ["lunar-module-descent.glb", "lunar-module-ascent.glb"] },
  { rocket: "apollo-soyuz", variant: "apollo-soyuz", credit: "nasa-apollo-soyuz", files: ["apollo-soyuz-csm.glb", "apollo-soyuz-docking-module.glb", "apollo-soyuz-soyuz.glb"] },
  { rocket: "gemini", variant: "gemini", credit: "nasa-gemini", files: ["gemini-adapter.glb", "gemini-capsule.glb"] },
  { rocket: "mercury", variant: "friendship-7", credit: "nasa-friendship-7", files: ["mercury-capsule.glb"] },
  { rocket: "jupiter-c", variant: "jupiter-c", credit: "nasa-jupiter-c", files: ["jupiter-c-tail.glb", "jupiter-c-first-stage.glb", "jupiter-c-tub.glb", "jupiter-c-fourth-stage.glb"] },
  { rocket: "iss", variant: "iss", credit: "nasa-iss", files: ISS_FILES },
  { rocket: "voyager", variant: "voyager", credit: "nasa-voyager", files: ["voyager-craft.glb"] },
  { rocket: "juno", variant: "juno", credit: "nasa-juno", files: ["juno-craft.glb"] },
  { rocket: "jwst", variant: "jwst", credit: "nasa-jwst", files: ["jwst-craft.glb"] },
  { rocket: "parker-solar-probe", variant: "parker-solar-probe", credit: "nasa-parker", files: ["parker-solar-probe-craft.glb"] },
  { rocket: "cassini", variant: "cassini", credit: "nasa-cassini", files: ["cassini-craft.glb"] },
  { rocket: "galileo", variant: "galileo", credit: "nasa-galileo", files: ["galileo-craft.glb"] },
  { rocket: "pioneer", variant: "pioneer", credit: "nasa-pioneer", files: ["pioneer-craft.glb"] },
  { rocket: "europa-clipper", variant: "europa-clipper", credit: "nasa-europa-clipper", files: ["europa-clipper-craft.glb"] },
  // more models
];

const MAX_BYTES = 2.7 * 1024 * 1024;

/** One axis of a painted file, in metres, the same way the legal test reads a quantized mesh. */
function glbSpan(file: string, axis: 0 | 1 | 2): number {
  const bytes = new Uint8Array(readFileSync(join("models", file)));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length))) as { nodes: { mesh?: number; scale?: number[] }[]; meshes: { primitives: { attributes: { POSITION: number } }[] }[]; accessors: { min: number[]; max: number[]; normalized?: boolean }[] };
  const node = json.nodes.find((one) => one.mesh !== undefined);
  const scale = node?.scale?.[axis] ?? 1;
  let lo = Infinity;
  let hi = -Infinity;
  for (const primitive of json.meshes[node?.mesh ?? 0].primitives) {
    const accessor = json.accessors[primitive.attributes.POSITION];
    const unit = accessor.normalized ? 32767 : 1;
    lo = Math.min(lo, accessor.min[axis] / unit);
    hi = Math.max(hi, accessor.max[axis] / unit);
  }
  return (hi - lo) * scale;
}

for (const { rocket, variant, credit, files } of ROWS)
  test(`${rocket}: NASA's model, credited, within its budget, and its own plain shapes in the line looks`, () => {
    const report = check({ rocket, variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
    assert.deepEqual(report.credits.map((one) => one.id), [credit]);
    assert.equal(report.credits[0].creator, "NASA");
    assert.equal(report.credits[0].licence, "Public domain (NASA)");
    assert.ok(variantOf(rocket, variant)?.note);
    for (const file of files) {
      const bytes = statSync(join("models", file)).size;
      assert.ok(bytes <= MAX_BYTES, file);
      if (file === "voyager-craft.glb" || file === "juno-craft.glb" || file === "jwst-craft.glb" || file === "parker-solar-probe-craft.glb" || file === "cassini-craft.glb" || file === "galileo-craft.glb" || file === "pioneer-craft.glb" || file === "europa-clipper-craft.glb") assert.ok(bytes <= 400 * 1024, `${file} is ${(bytes / 1024).toFixed(0)} KB`);
    }
    // Voyager's antenna is the sourced 3.7 m, which is the file's Z. Juno's sourced 20 m is tip to tip; the file's height at that scale is 6.89 m.
    if (rocket === "voyager") assert.ok(Math.abs(glbSpan("voyager-craft.glb", 2) - 3.7) / 3.7 < 0.05);
    if (rocket === "juno") assert.ok(Math.abs(glbSpan("juno-craft.glb", 1) - 6.89) / 6.89 < 0.05);
    if (rocket === "jwst") assert.ok(Math.abs(glbSpan("jwst-craft.glb", 2) - 21.197) / 21.197 < 0.05);
    if (rocket === "parker-solar-probe") assert.ok(Math.abs(glbSpan("parker-solar-probe-craft.glb", 0) - 2.4) / 2.4 < 0.05);
    if (rocket === "cassini") assert.ok(Math.abs(glbSpan("cassini-craft.glb", 1) - 11.64) / 11.64 < 0.05);
    if (rocket === "galileo") assert.ok(Math.abs(glbSpan("galileo-craft.glb", 1) - 11) / 11 < 0.05);
    if (rocket === "pioneer") assert.ok(Math.abs(glbSpan("pioneer-craft.glb", 1) - 8.25) / 8.25 < 0.05);
    if (rocket === "europa-clipper") assert.ok(Math.abs(glbSpan("europa-clipper-craft.glb", 0) - 30) / 30 < 0.05);
    const built = build({ rocket, variant });
    assert.ok(built.parts.every((part) => part.record.painted && part.pieces.length > 0));
    assert.ok(built.svg({ look: "line" }).startsWith("<svg"));
  });
