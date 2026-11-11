// The family's must-have list for a package (spx-stats docs/package-work.md, "The must-have list"; kazoku-ui docs/package-standard.md), as a check that fails when an item is missing.
// scripts/check-standard.mjs is kazoku-ui's templates/check-standard.mjs (kazoku-ui main, 2026-11-10b), copied unchanged and held to one recorded hash.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const standard = (await import(new URL("../scripts/check-standard.mjs", import.meta.url).href)) as { STANDARD_VERSION: string; standardProblems(root: string): string[] };

const RECORDED = { version: "2026-11-10b", sha256: "671fb57446682a5f548ead4d91a9cbb8f58535d6ecc6c7414d2e0275bfd3a9ea" };

test("the check is kazoku-ui's, byte for byte", () => {
  assert.equal(standard.STANDARD_VERSION, RECORDED.version);
  assert.equal(createHash("sha256").update(readFileSync("scripts/check-standard.mjs")).digest("hex"), RECORDED.sha256);
});

test("this package has every item of the family's must-have list", () => {
  assert.deepEqual(standard.standardProblems("."), []);
});
