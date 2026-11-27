// The ship's specification sits under the 3D stage. A locked aspect box puts that panel on top of the picture.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../demo/demo.css", import.meta.url), "utf8");

test("a ship with its panel does not lock the stage to the picture's box", () => {
  const blocks = [...css.matchAll(/[^{}]*uchusen-rocket\[data-panel\][^{]*\{[^}]*\}/g)].map((match) => match[0]);
  assert.ok(blocks.length > 0, "a data-panel rule");
  const frees = blocks.some((block) => /aspect-ratio:\s*auto/.test(block) && /height:\s*auto/.test(block) && /overflow:\s*visible/.test(block));
  assert.ok(frees, blocks.join("\n"));
  for (const block of blocks) assert.equal(/height:\s*16rem/.test(block) && /overflow:\s*hidden/.test(block), false, block);
  assert.match(css, /uchusen-rocket\[data-panel\] \{ max-width: min\(620px, max\(10rem, calc\(\(100vh - 36rem\) \* 0\.75\)\)\)/);
  assert.equal(css.includes("62vh"), false);
});
