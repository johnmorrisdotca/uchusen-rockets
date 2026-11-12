import assert from "node:assert/strict";
import { test } from "node:test";

type Fake = { calls: string[]; lost: number };

/** A page whose canvas answers `getContext` as a browser with the given renderer would. */
function pageWith(kinds: Record<string, string | null>): Fake {
  const fake: Fake = { calls: [], lost: 0 };
  const context = (renderer: string) => ({
    getExtension: (name: string) => (name === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 1 } : name === "WEBGL_lose_context" ? { loseContext: () => fake.lost++ } : null),
    getParameter: () => renderer,
  });
  (globalThis as { document?: unknown }).document = {
    createElement: () => ({
      width: 300,
      height: 150,
      getContext: (type: string) => {
        fake.calls.push(type);
        const renderer = kinds[type];
        return renderer ? context(renderer) : null;
      },
    }),
  };
  return fake;
}

test("the WebGL probe makes one context for the whole page and lets it go at once", async () => {
  const fake = pageWith({ webgl2: "ANGLE (Apple, Apple M2, OpenGL 4.1)" });
  const { glProbe, probeCount } = await import("../src/element/probe.ts");
  assert.equal(probeCount(), 0);
  const first = glProbe();
  for (let i = 0; i < 20; i++) assert.equal(glProbe(), first);
  assert.deepEqual(first, { works: true, software: false });
  assert.equal(probeCount(), 1);
  assert.deepEqual(fake.calls, ["webgl2"]);
  assert.equal(fake.lost, 1);
  delete (globalThis as { document?: unknown }).document;
});
