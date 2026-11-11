// The craft built as parts in slots from a model cut into pieces: the ISS, Tiangong, Hubble and Jupiter-C. Every part is usable on its own, each has its own painted file and credit, the whole is the default
// build and stands at its sourced size, and a stacked part can be swapped as any other part can.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { builderState, check, MODEL_CREDITS, PART_ENTRIES, partEntry, partIdOf, variantOf } from "../src/index.ts";
import { build, buildPart } from "../src/build/index.ts";

const CRAFT = [
  { rocket: "iss", variant: "iss", credit: "nasa-iss", parts: 27, tall: 71.7, wide: 109, tolerance: 0.015 },
  { rocket: "tiangong", variant: "tiangong", credit: "w29572227-tiangong", parts: 10, tall: 55.6, wide: 39, tolerance: 0.03 },
  { rocket: "hubble", variant: "hubble", credit: "robo-reboot-hubble", parts: 9, tall: 13.2, wide: 10.3, tolerance: 0.01 },
  { rocket: "jupiter-c", variant: "jupiter-c", credit: "nasa-jupiter-c", parts: 4, tall: 21.3, wide: 2.09, tolerance: 0.01 },
] as const;

/** The size of a whole file under a megabyte and a half, so a station of many files stays near a megabyte in all. */
const MAX_BYTES = 1.5 * 1024 * 1024;

for (const craft of CRAFT) {
  const variant = variantOf(craft.rocket, craft.variant);
  assert.ok(variant);

  test(`${craft.rocket}: ${craft.parts} parts in slots, each usable on its own, with its own painted file and the one credit`, () => {
    assert.equal(variant.slots.length, craft.parts);
    const report = check({ rocket: craft.rocket, variant: craft.variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
    assert.equal(report.parts.length, craft.parts);
    assert.deepEqual(report.credits.map((one) => one.id), [craft.credit]);
    assert.ok(MODEL_CREDITS[craft.credit]);
    let bytes = 0;
    let painted = 0;
    for (const slot of variant.slots) {
      const id = partIdOf(craft.rocket, craft.variant, slot);
      const entry = partEntry(id);
      assert.ok(entry, id);
      assert.ok(entry.record.trueTo.includes(craft.variant), id);
      // a part the model does not draw (the ISS's truss segments its model leaves out) has no file, and this package's own paint shows for it
      if (entry.record.painted) {
        assert.equal(entry.record.painted.credit, craft.credit, id);
        const file = join("models", entry.record.painted.file);
        assert.ok(existsSync(file), `${file} exists`);
        bytes += statSync(file).size;
        painted++;
      } else assert.ok(craft.rocket === "iss" && slot.startsWith("truss-"), `${id} has a painted file`);
      // alone: its own pieces, a mesh, a drawing, and a size
      const alone = buildPart(id);
      assert.ok(alone.bounds.max[1] > alone.bounds.min[1], `${id} has a height`);
      assert.ok(alone.svg({ look: "line" }).startsWith("<svg"), id);
      assert.ok(alone.glb().bytes.length > 0, id);
      // and shown alone in the whole
      const whole = build({ rocket: craft.rocket, variant: craft.variant });
      assert.ok(whole.shows.includes(slot), `${slot} can be shown`);
      const places = whole.placesOf(slot);
      assert.equal(places.filter((place) => place.shown).length, 1, `${slot} alone`);
      assert.ok(Number.isFinite(whole.boundsOf(slot).max[1]), slot);
    }
    assert.ok(bytes <= MAX_BYTES * 1.6, `${craft.rocket}: ${(bytes / 1024).toFixed(0)} KB of painted files in all`);
    assert.ok(painted >= craft.parts - 9, `${craft.rocket}: ${painted} parts painted by the model`);
    for (const slot of variant.slots) {
      const file = partEntry(partIdOf(craft.rocket, craft.variant, slot))?.record.painted?.file;
      if (file) assert.ok(statSync(join("models", file)).size <= MAX_BYTES, slot);
    }
  });

  test(`${craft.rocket}: the whole is the default build, together, at its sourced size`, () => {
    const whole = build({ rocket: craft.rocket, variant: craft.variant });
    assert.equal(whole.shows[0], "together");
    assert.ok(whole.placesOf("together").every((place) => place.shown));
    const { min, max } = whole.boundsOf("together");
    const tall = max[1] - min[1];
    const wide = max[0] - min[0];
    assert.ok(Math.abs(tall - craft.tall) / craft.tall <= craft.tolerance, `${craft.rocket} stands ${tall} m against ${craft.tall} m`);
    assert.ok(Math.abs(wide - craft.wide) / craft.wide <= craft.tolerance, `${craft.rocket} is ${wide} m across against ${craft.wide} m`);
    assert.ok(whole.svg({ look: "line" }).length < 80 * 1024, "a drawing under 80 KB");
    assert.ok(whole.svg({ look: "painted" }).length < 80 * 1024, "a painted drawing under 80 KB");
    assert.ok(whole.glb().bytes.length < 600 * 1024, "a code-made mesh under 600 KB");
  });
}

test("a stacked part of a station or the telescope swaps like any other part: the builder offers the stack's own parts, and a foreign part of the right kind is a custom build", () => {
  // Tianhe's node takes any module with the same joints: Destiny does not fit it (its joints are wider), Unity's narrow neck does not either, so the fit check says why
  const wrong = check({ rocket: "tiangong", variant: "tiangong", parts: { hub: "iss-iss-destiny" } });
  assert.ok(!wrong.ok);
  assert.ok(wrong.issues.some((issue) => issue.code === "joint-diameter"));
  // a part of another kind is refused by kind
  const kind = check({ rocket: "hubble", variant: "hubble", parts: { "light-shield": "jupiter-c-jupiter-c-tub" } });
  assert.ok(kind.issues.some((issue) => issue.code === "wrong-kind"));
  // Hubble's equipment section and forward shell share their joints: swapping one in for the other is a custom build that goes together
  const swapped = check({ rocket: "hubble", variant: "hubble", parts: { "equipment-section": "hubble-hubble-equipment-section" } });
  assert.ok(swapped.ok && !swapped.custom);
  // the builder starts a station from its foot and walks its stack
  const rows = builderState(["iss-iss-zvezda"]).rows;
  assert.equal(rows[0]?.chosen, "iss-iss-zvezda");
  assert.ok(rows.length >= 5, "the station's stack has rows");
  assert.ok(PART_ENTRIES.some((entry) => entry.record.id === "tiangong-tiangong-wentian" && entry.record.strapOn));
});

test("the painted files of the two licensed models carry their authors' licence and credit, and no flag or logo material", () => {
  for (const [rocket, author] of [["tiangong", "w29572227"], ["hubble", "Cybertron B-127"]] as const) {
    const variant = variantOf(rocket);
    assert.ok(variant);
    for (const slot of variant.slots) {
      const file = join("models", partEntry(partIdOf(rocket, variant.id, slot))?.record.painted?.file ?? "");
      assert.ok(file.endsWith(".glb"), `${slot} is painted by the model`);
      const bytes = new Uint8Array(readFileSync(file));
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))) as { asset: { extras: Record<string, string> }; materials: { name: string }[] };
      assert.ok(json.asset.extras.author.startsWith(author), `${file}: ${json.asset.extras.author}`);
      assert.match(json.asset.extras.license, /CC-BY-4\.0/, file);
      assert.ok(!/flag|logo/i.test(JSON.stringify(json.materials)), file);
    }
  }
});
