// The rockets drawn wholly by this package's code: each is drawn to its sourced height, its engines are the sourced count, and each part has the record every part has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { check, figureWords, partEntry, ROCKETS, variantOf } from "../src/index.ts";
import type { Piece } from "../src/model/pieces.ts";
import { build, buildPart } from "../src/build/index.ts";

const BELL = (piece: Piece) => piece.kind === "lathe" && piece.material === "bell";
const bells = (id: string) => (partEntry(id)?.pieces() ?? []).filter(BELL).length;

test("Falcon 1 is SpaceX's guide's size, with the other figures kept beside it", () => {
  const f = variantOf("falcon-1", "falcon-1");
  assert.equal(f?.facts.height.value, 21.3);
  assert.deepEqual(f?.facts.height.others?.map((other) => other.value), [21, 22.25]);
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1" }).size?.height, 21.3);
  assert.equal(f?.facts.parts["first-stage"].value, null);
  assert.equal(bells("falcon-1-falcon-1-first-stage"), 1);
  assert.equal(bells("falcon-1-falcon-1-second-stage"), 1);
  assert.equal(partEntry("falcon-1-falcon-1-fairing")?.record.height, 3.5);
  assert.ok(Math.abs((buildPart("falcon-1-falcon-1-fairing").bounds.max[0] ?? 0) - 0.77) < 0.01, "1.54 m across, narrower than the stages");
});

test("Falcon 1e says it was announced and never flew", () => {
  const e = variantOf("falcon-1", "falcon-1e");
  assert.equal(e?.status, "announced");
  assert.equal(figureWords(e?.firstFlight), "Never flew");
  assert.equal(figureWords(e?.facts.height, " m"), "27.4 m, announced");
  assert.equal(check({ rocket: "falcon-1", variant: "falcon-1e" }).size?.height, 27.4);
});

test("no code-made rocket is labelled as a custom build, and each comes apart and alone", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const report = check({ rocket: rocket.id, variant: variant.id });
      assert.ok(report.ok, `${variant.id}: ${report.issues.map((issue) => issue.message).join(" ")}`);
      assert.equal(report.custom, false, variant.id);
      const built = build({ rocket: rocket.id, variant: variant.id });
      for (const show of built.shows) assert.ok(built.boundsOf(show).max[1] > 0, `${variant.id} ${show}`);
    }
});
