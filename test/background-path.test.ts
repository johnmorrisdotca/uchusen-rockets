// The painted Earth is made in one module. A page asks for it; it does not build the globe itself.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return sources(path);
  return entry.name.endsWith(".ts") ? [path] : [];
});

test("only the Earth module builds the painted globe", () => {
  const hits = sources("demo").filter((path) => path !== join("demo", "earth.ts") && readFileSync(path, "utf8").includes("chikyu-earth/realistic"));
  assert.deepEqual(hits, []);
});
