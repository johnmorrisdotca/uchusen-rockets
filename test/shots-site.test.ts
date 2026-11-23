import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ensureShotsSite, shotsSiteReady } from "../scripts/shotsSite.ts";

const writePage = (root: string) => {
  mkdirSync(join(root, "site", "js"), { recursive: true });
  writeFileSync(join(root, "site", "element-check.html"), "<html></html>");
  writeFileSync(join(root, "site", "js", "element-check.js"), "");
};

test("shots builds the site when element-check.html is not there, and leaves a built site alone", () => {
  const root = mkdtempSync(join(tmpdir(), "shots-site-"));
  try {
    assert.equal(shotsSiteReady(root), false);
    const failed: string[][] = [];
    assert.throws(() => ensureShotsSite(root, (command, args) => {
      failed.push([command, ...args]);
      return 1;
    }), /pnpm site failed \(1\)/);
    assert.deepEqual(failed, [["pnpm", "site"]]);
    assert.throws(() => ensureShotsSite(root, () => 0), /pnpm site failed \(0\)/);

    let built = 0;
    ensureShotsSite(root, () => {
      built += 1;
      writePage(root);
      return 0;
    });
    assert.equal(built, 1);
    assert.equal(shotsSiteReady(root), true);

    ensureShotsSite(root, () => {
      built += 1;
      return 0;
    });
    assert.equal(built, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
