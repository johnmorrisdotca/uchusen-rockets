// The family's must-have list for a package (spx-stats docs/package-work.md, "The must-have list"; kazoku-ui docs/package-standard.md), as a check that fails when an item is missing.
// scripts/check-standard.mjs is kazoku-ui's templates/check-standard.mjs (kazoku-ui main, 2026-11-11b), copied unchanged and held to one recorded hash.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const standard = (await import(new URL("../scripts/check-standard.mjs", import.meta.url).href)) as { STANDARD_VERSION: string; standardProblems(root: string): string[] };

const RECORDED = { version: "2026-11-11b", sha256: "ecf0627e155de2b2c148e89d0722cac3b55f7d4a76e1fbfe1b52a008e50896bb" };

test("the check is kazoku-ui's, byte for byte", () => {
  assert.equal(standard.STANDARD_VERSION, RECORDED.version);
  assert.equal(createHash("sha256").update(readFileSync("scripts/check-standard.mjs")).digest("hex"), RECORDED.sha256);
});

test("this package has every item of the family's must-have list", () => {
  assert.deepEqual(standard.standardProblems("."), []);
});

test("the guides table and the development commands are listed once", () => {
  const readme = readFileSync("README.md", "utf8");
  const guides = readme.split("## Guides")[1]?.split("## ")[0] ?? "";
  const links = [...guides.matchAll(/\(docs\/guides\/[^)]+\)/g)].map((match) => match[0]);
  assert.equal(new Set(links).size, links.length);
  const development = readme.split("## Development")[1]?.split("## ")[0] ?? "";
  const commands = [...development.matchAll(/^pnpm [\w:-]+/gm)].map((match) => match[0]);
  assert.equal(new Set(commands).size, commands.length);
});
