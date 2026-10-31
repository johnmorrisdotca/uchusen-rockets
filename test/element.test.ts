import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_LOOK, DEFAULT_VIEW } from "../src/index.ts";

test("the element's module loads outside a browser, for a server's import, and defines nothing there", async () => {
  const module = await import("../src/element.ts");
  assert.equal(typeof module.UchusenRocket, "function");
  assert.equal(typeof module.defineUchusenRocket, "function");
  module.defineUchusenRocket();
  assert.equal(DEFAULT_LOOK, "line");
  assert.equal(DEFAULT_VIEW, "three-quarter");
});
