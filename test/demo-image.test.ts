// The browser gate on this machine runs in CI's Playwright image, in an image slot, with more than one worker. The hosted CI job stays at one worker.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
};

test("the browser gate runs in the CI image with more than one worker", () => {
  const script = pkg.scripts["test:demo:image"] ?? "";
  assert.match(script, /^kazoku-ci-image /);
  const cpus = Number(script.match(/--cpus (\d+)/)?.[1]);
  // kazoku-ci-image sets workers to half the container's CPUs, rounded, and at least 1.
  assert.equal(Math.max(1, Math.round(cpus / 2)) > 1, true);
  assert.match(pkg.devDependencies["@johnmorrisdotca/kazoku-ui"] ?? "", /^\^0\.(4[1-9]|[5-9]\d)/);
});
