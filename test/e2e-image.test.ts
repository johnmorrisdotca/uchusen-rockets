// The Mac keeps one native browser. The image run is how the same suite takes more than one worker.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const bin = fileURLToPath(new URL("../node_modules/.bin/kazoku-ci-image", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts: Record<string, string> };
const setup = "pnpm site && node scripts/docs-site.mjs build";

test("pnpm test:e2e:image runs the demo in CI's Playwright image at 4 CPUs, two at a time", () => {
  const script = pkg.scripts["test:e2e:image"];
  assert.equal(script, `kazoku-ci-image --cpus 4 --setup "${setup}" -- test`);
  const ran = spawnSync(bin, ["--cpus", "4", "--setup", setup, "--dry-run", "--", "test"], { cwd: root, encoding: "utf8" });
  assert.equal(ran.status, 0, `${ran.stderr}\n${ran.stdout}`);
  const shown = `${ran.stdout}\n${ran.stderr}`;
  assert.match(shown, /--workers=2/);
  assert.match(shown, /--cpus 4/);
  assert.match(shown, /pnpm site && node scripts\/docs-site\.mjs build/);
});
