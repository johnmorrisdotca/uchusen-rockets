import assert from "node:assert/strict";
import { describe, test } from "node:test";

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

type Listeners = Map<string, Array<() => void>>;

/** A page whose WebGL can be off, then on, and that keeps the probe's retry listeners. */
function failingPage(): { listeners: Listeners; state: { visibilityState: string; webgl: boolean } } {
  const listeners: Listeners = new Map();
  const listen = (key: string, fn: () => void) => {
    const list = listeners.get(key) ?? [];
    list.push(fn);
    listeners.set(key, list);
  };
  const state = { visibilityState: "visible", webgl: false };
  const page = {
    get visibilityState() { return state.visibilityState; },
    createElement: () => ({
      width: 300,
      height: 150,
      addEventListener: (type: string, fn: () => void) => listen(type, fn),
      getContext: () => {
        if (!state.webgl) return null;
        return { getExtension: () => null, getParameter: () => "ANGLE (Apple, Apple M2, OpenGL 4.1)" };
      },
    }),
    addEventListener: (type: string, fn: () => void) => listen(`document:${type}`, fn),
  };
  (globalThis as { document?: unknown }).document = page;
  return { listeners, state };
}

const fire = (listeners: Listeners, key: string) => {
  for (const fn of listeners.get(key) ?? []) fn();
};

describe("WebGL probe", { concurrency: 1 }, () => {
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

  test("a failed WebGL probe is asked again when the page is shown or a context is restored", async () => {
    const shown = failingPage();
    // A query keeps this look off the module the first test already cached. tsc does not follow it.
    // @ts-expect-error the query is a cache key, not a second file
    const shownProbe = await import("../src/element/probe.ts?retry=shown");
    assert.equal(shownProbe.glProbe().works, false);
    assert.equal(shownProbe.probeCount(), 1);
    assert.equal(shownProbe.glProbe().works, false);
    assert.equal(shownProbe.probeCount(), 1);
    shown.state.visibilityState = "hidden";
    fire(shown.listeners, "document:visibilitychange");
    assert.equal(shownProbe.probeCount(), 1);
    shown.state.webgl = true;
    fire(shown.listeners, "document:visibilitychange");
    assert.equal(shownProbe.probeCount(), 1);
    shown.state.visibilityState = "visible";
    fire(shown.listeners, "document:visibilitychange");
    assert.deepEqual(shownProbe.glProbe(), { works: true, software: false });
    assert.equal(shownProbe.probeCount(), 2);
    fire(shown.listeners, "document:visibilitychange");
    assert.equal(shownProbe.probeCount(), 2);

    const restored = failingPage();
    // @ts-expect-error the query is a cache key, not a second file
    const restoredProbe = await import("../src/element/probe.ts?retry=restored");
    assert.equal(restoredProbe.glProbe().works, false);
    assert.equal(restoredProbe.probeCount(), 1);
    restored.state.webgl = true;
    fire(restored.listeners, "webglcontextrestored");
    assert.deepEqual(restoredProbe.glProbe(), { works: true, software: false });
    assert.equal(restoredProbe.probeCount(), 2);
    delete (globalThis as { document?: unknown }).document;
  });

  test("a software renderer is named, a WebGL1-only browser works, and a context that throws or is null is a failure", async () => {
    const software = pageWith({ webgl2: "Google SwiftShader" });
    // @ts-expect-error the query is a cache key, not a second file
    const soft = await import("../src/element/probe.ts?kind=software");
    assert.deepEqual(soft.glProbe(), { works: true, software: true });
    assert.deepEqual(software.calls, ["webgl2"]);

    const one = pageWith({ webgl: "llvmpipe (LLVM 15.0.7, 256 bits)" });
    // @ts-expect-error the query is a cache key, not a second file
    const webgl1 = await import("../src/element/probe.ts?kind=webgl1");
    assert.deepEqual(webgl1.glProbe(), { works: true, software: true });
    assert.deepEqual(one.calls, ["webgl2", "webgl"]);

    failingPage();
    // @ts-expect-error the query is a cache key, not a second file
    const nothing = await import("../src/element/probe.ts?kind=null");
    assert.deepEqual(nothing.glProbe(), { works: false, software: false });
    assert.equal(nothing.probeCount(), 1);

    (globalThis as { document?: unknown }).document = {
      createElement: () => ({
        width: 300,
        height: 150,
        addEventListener: () => undefined,
        getContext: () => {
          throw new Error("the browser refused a context");
        },
      }),
      addEventListener: () => undefined,
    };
    // @ts-expect-error the query is a cache key, not a second file
    const thrown = await import("../src/element/probe.ts?kind=throw");
    assert.deepEqual(thrown.glProbe(), { works: false, software: false });
    assert.equal(thrown.probeCount(), 1);
    delete (globalThis as { document?: unknown }).document;
  });
});
