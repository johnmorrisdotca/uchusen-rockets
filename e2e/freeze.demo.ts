// The demo must never ask a lot of the machine. Played in headless Chromium with the controls turning it, these fail on a draw loop that runs when nothing moves or more than once a frame, on WebGL contexts or
// graphics memory (buffers, vertex arrays, textures) that grow with each change, on a canvas past its pixel budget at any zoom on a 5K screen, and on a lost context that is not let go. With the Earth behind the rocket they
// also fail on more than one frame request for it per page frame, on drawing it faster than its own low rate, on anything drawn out of sight or on a hidden tab, on its context or pictures kept after it is turned off, and on growth over 50 rounds of changes.
import { execSync } from "node:child_process";
import { chromium, expect, type Page, test } from "@playwright/test";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const press = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).click();

test.use({ reducedMotion: "no-preference" });
test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

/** Counts what the page asks of the graphics card, from before any script runs. Objects are counted per context, as a lost context's objects are gone whether or not they were deleted, and contexts are held weakly, so counting them does not keep them alive. */
const COUNT = () => {
  type Ctx = (WebGLRenderingContext | WebGL2RenderingContext) & { isContextLost(): boolean };
  type Tally = { made: Record<string, number>; freed: Record<string, number> };
  const tallies = new WeakMap<object, Tally>();
  const seen = { contexts: [] as { context: WeakRef<Ctx>; tally: Tally }[], frames: 0, callbacks: 0, mostInAFrame: 0 };
  const tallyOf = (context: object) => {
    let tally = tallies.get(context);
    if (!tally) {
      tally = { made: {}, freed: {} };
      tallies.set(context, tally);
      seen.contexts.push({ context: new WeakRef(context as Ctx), tally });
    }
    return tally;
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error a wrapper with the same overloads is not worth writing out
  HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
    const context = getContext.call(this, type, ...(rest as []));
    if (context && /webgl/.test(type)) tallyOf(context);
    return context;
  };
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[]) {
    for (const kind of ["Buffer", "Texture", "VertexArray", "Program", "Framebuffer", "Renderbuffer"]) {
      for (const [verb, into] of [["create", "made"], ["delete", "freed"]] as const) {
        const original = proto[verb + kind];
        if (!original) continue;
        proto[verb + kind] = function (this: object, ...args: unknown[]) {
          const tally = tallyOf(this)[into];
          tally[kind] = (tally[kind] ?? 0) + 1;
          return original.apply(this, args);
        };
      }
    }
  }
  // frames, not callbacks: callbacks of one frame share a time
  let last = -1;
  let inThisFrame = 0;
  const frame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    return frame((time) => {
      if (time !== last) {
        seen.frames++;
        inThisFrame = 0;
      }
      last = time;
      seen.callbacks++;
      seen.mostInAFrame = Math.max(seen.mostInAFrame, ++inThisFrame);
      callback(time);
    });
  };
  Object.assign(window, { __seen: seen });
};

type Tallied = { context: WeakRef<{ isContextLost(): boolean }>; tally: { made: Record<string, number>; freed: Record<string, number> } };
type Seen = { contexts: Tallied[]; frames: number; callbacks: number; mostInAFrame: number };
const usage = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as unknown as { __seen: Seen }).__seen;
    const alive = seen.contexts.filter(({ context }) => {
      const held = context.deref();
      return held !== undefined && !held.isContextLost();
    });
    const live = (kind: string) => alive.reduce((sum, { tally }) => sum + (tally.made[kind] ?? 0) - (tally.freed[kind] ?? 0), 0);
    return { contexts: alive.length, buffers: live("Buffer"), arrays: live("VertexArray"), textures: live("Texture"), programs: live("Program"), framebuffers: live("Framebuffer"), pageFrames: seen.frames, callbacks: seen.callbacks, mostInAFrame: seen.mostInAFrame };
  });
const drawn = (page: Page) => hero(page).evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));
/** Presses a choice and waits until the view has drawn it. What three.js holds depends on which materials each shape was drawn with, so a reading of it means something only when no frame of a change was skipped; and a new rocket is in only when `uchusen-change` says so. */
const pressAndDraw = async (page: Page, id: string) => {
  const rocketChange = /^(rocket|variant)-/.test(id);
  const mark = await drawn(page);
  await Promise.all([rocketChange ? hero(page).evaluate((node) => new Promise((done) => node.addEventListener("uchusen-change", done, { once: true }))) : null, press(page, id)]);
  await expect.poll(() => drawn(page), { timeout: 60_000 }).toBeGreaterThan(mark);
};
const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
const settle = (page: Page, ms: number) => page.waitForTimeout(ms);
/** Draws and page frames over a stretch long enough for `frames` of the page's own: a slow machine (software WebGL on a runner) has few in a second. */
const measure = async (page: Page, frames = 12) => {
  const start = { drawn: await drawn(page), page: (await usage(page)).pageFrames };
  await expect.poll(async () => (await usage(page)).pageFrames - start.page, { timeout: 90_000 }).toBeGreaterThanOrEqual(frames);
  const end = { drawn: await drawn(page), page: (await usage(page)).pageFrames };
  return { drew: end.drawn - start.drawn, frames: end.page - start.page };
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(COUNT);
});

test("it draws at most once a frame while it spins on its own, and not at all once it is still", async ({ page }) => {
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  // handed back to its own spin: its own hands drag it, the controls stand down
  await hero(page).evaluate((node) => {
    (node as HTMLElement & { drive(choice: null): void }).drive(null);
    node.setAttribute("spin", "fast");
  });
  await settle(page, 1500);
  const { drew, frames } = await measure(page);
  // one frame is the page's own; a draw loop that doubles every frame draws hundreds of times more
  expect(drew).toBeGreaterThan(0);
  expect(drew).toBeLessThanOrEqual(frames + 3);

  await hero(page).evaluate((node) => node.setAttribute("spin", "off"));
  // the turn runs down (the controls glide to a stop), then nothing draws
  await expect
    .poll(async () => {
      const mark = await drawn(page);
      await settle(page, 1000);
      return (await drawn(page)) - mark;
    }, { timeout: 60_000 })
    .toBe(0);
  const still = await usage(page);
  await settle(page, 2000);
  expect((await usage(page)).pageFrames - still.pageFrames).toBeLessThanOrEqual(2);
});

test("drag inertia and the controls' turn draw once a frame too", async ({ page }) => {
  await page.goto(URL);
  await reach3d(page);
  const { drew, frames } = await measure(page);
  expect(drew).toBeGreaterThan(0);
  expect(drew).toBeLessThanOrEqual(frames + 3);
});

test("a view out of sight draws nothing and redraws nothing, even while the controls keep turning", async ({ page }) => {
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "4000px";
    document.body.append(spacer);
    window.scrollTo(0, 3500);
  });
  await settle(page, 1000);
  await bar(page).evaluate((node) => (node as HTMLElement & { play(): void }).play());
  const redraws = await hero(page).evaluate(async (node) => {
    let n = 0;
    const watching = new MutationObserver((records) => (n += records.length));
    watching.observe((node as HTMLElement).shadowRoot as ShadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ["viewBox"] });
    await new Promise((done) => setTimeout(done, 400));
    return n;
  });
  const before = await drawn(page);
  await settle(page, 1500);
  expect(await drawn(page)).toBe(before);
  expect(redraws).toBe(0);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
});

test("changes give back what they took: contexts, buffers, vertex arrays and textures do not grow", async ({ page }) => {
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  const round = async () => {
    await pressAndDraw(page, "variant-v1");
    await pressAndDraw(page, "show-apart");
    await pressAndDraw(page, "look-thick");
    await pressAndDraw(page, "look-painted");
    await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
    await pressAndDraw(page, "variant-v3");
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
    await pressAndDraw(page, "show-together");
    await pressAndDraw(page, "look-line");
    await settle(page, 600);
  };
  // the first round fills the caches that are kept on purpose
  await round();
  const first = await usage(page);
  await round();
  await round();
  await round();
  const last = await usage(page);
  expect(last.contexts).toBe(1);
  expect(last.buffers).toBeLessThanOrEqual(first.buffers);
  expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  expect(last.textures).toBeLessThanOrEqual(first.textures);
});

test("a lost context is let go, the drawing takes over, and nothing keeps drawing", async ({ page }) => {
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await hero(page).evaluate((node) => {
    const canvas = (node as HTMLElement).shadowRoot?.querySelector("canvas");
    const gl = (canvas?.getContext("webgl2") ?? canvas?.getContext("webgl")) as WebGLRenderingContext | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(hero(page)).toHaveAttribute("data-state", "fallback", { timeout: 10_000 });
  await expect(hero(page)).toHaveAttribute("data-why", "context-lost");
  await settle(page, 500);
  expect((await usage(page)).contexts).toBe(0);
  await expect(hero(page).locator("canvas")).toHaveCount(0);
  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ zoom: 3, yaw: 40 }));
  await expect.poll(() => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector<HTMLElement>(".drawing")?.dataset.zoom)).toBe("3.00");
});

test.describe("on a 5K screen", () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });

  test("the canvas stays inside its pixel budget from 1x to 5x, and the drawing never grows past its box", async ({ page }) => {
    await page.goto(URL);
    await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
    await reach3d(page);
    // as large as a page can make it: the whole width of the screen
    await hero(page).evaluate((node) => {
      const style = (node as HTMLElement).style;
      style.maxWidth = "none";
      style.width = "100vw";
      style.setProperty("--uchusen-aspect", "16 / 9");
    });
    const size = () =>
      hero(page).evaluate((node) => {
        const canvas = (node as HTMLElement).shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
        const drawing = (node as HTMLElement).shadowRoot?.querySelector<HTMLElement>(".drawing") as HTMLElement;
        return { w: canvas.width, h: canvas.height, css: canvas.clientWidth, transform: drawing.style.transform, box: (drawing.firstElementChild?.getAttribute("viewBox") ?? "").split(" ").map(Number) };
      });
    for (const zoom of [1, 2, 3, 4, 5]) {
      await bar(page).evaluate((node, z) => (node as HTMLElement & { set(next: object): void }).set({ zoom: z }), zoom);
      await expect.poll(async () => (await size()).css).toBeGreaterThan(2000);
      await expect.poll(async () => (await size()).w, { timeout: 30_000 }).toBeGreaterThan(2000);
      await expect.poll(() => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.zoom)).toBe(zoom.toFixed(2));
      const now = await size();
      expect(now.w * now.h).toBeLessThanOrEqual(MAX_PIXELS);
      expect(Math.max(now.w, now.h)).toBeLessThanOrEqual(MAX_SIDE);
      // it is still sharp: far more than the 2560 pixels the screen is wide in CSS pixels, and not past the screen's own ratio
      expect(now.w).toBeGreaterThan(2560);
      expect(now.w).toBeLessThanOrEqual(2560 * 2);
      expect(now.transform).toBe("");
    }
  });
});

// ------------------------------------------------------------- with the Earth behind the rocket
const LOOKS = [
  { look: "line", form: "line", contexts: 1 },
  { look: "thick", form: "thick", contexts: 1 },
  { look: "painted", form: "realistic", contexts: 2 },
] as const;
/** The most draws a second for each form: its own timer, and a little for a measure that starts or ends between two. */
const EARTH_RATE = { line: 2, thick: 2, realistic: 4 } as const;

const earth = (page: Page) => page.locator('[data-testid="earth"]');
const earthDraws = (page: Page) =>
  earth(page).evaluate((node) => {
    const realistic = node.querySelector("chikyu-earth-realistic") as (HTMLElement & { stats: { draws: number } }) | null;
    return realistic ? realistic.stats.draws : Number((node as HTMLElement).dataset.draws ?? 0);
  });
/** The Earth in a look, and the rocket's picture in: everything loaded and at least one draw of each. */
const earthIn = async (page: Page, look: string, form: string) => {
  await press(page, `look-${look}`);
  await press(page, "background-earth");
  await expect(earth(page)).toHaveAttribute("data-form", form, { timeout: 60_000 });
  if (form === "realistic") {
    await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
    await expect(earth(page).locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "live", { timeout: 90_000 });
  }
  await expect.poll(() => earthDraws(page), { timeout: 90_000 }).toBeGreaterThan(0);
};
const hideTab = (page: Page, hidden: boolean) =>
  page.evaluate((isHidden) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => isHidden });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (isHidden ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
const rendererName = (page: Page) =>
  page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl") as WebGLRenderingContext;
    const named = gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) as string;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return named;
  });
/** Every canvas of the page, shadow roots too. */
const canvases = (page: Page) =>
  page.evaluate(() => {
    const found: { w: number; h: number }[] = [];
    const walk = (root: Document | ShadowRoot) => {
      for (const node of root.querySelectorAll("*")) {
        if (node instanceof HTMLCanvasElement) found.push({ w: node.width, h: node.height });
        if (node.shadowRoot) walk(node.shadowRoot);
      }
    };
    walk(document);
    return found;
  });

test("it draws in software here, on any machine", async ({ page }) => {
  await page.goto(URL);
  expect(await rendererName(page)).toMatch(/swiftshader/i);
});

test("the Earth costs nothing until it is chosen: not a byte of its code, no picture, no timer, no extra context", async ({ page }) => {
  const scripts: Promise<string>[] = [];
  const addresses: string[] = [];
  page.on("response", (response) => {
    addresses.push(response.url());
    if (response.url().endsWith(".js")) scripts.push(response.text());
  });
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await settle(page, 1000);
  await expect(earth(page)).toBeHidden();
  expect(await earth(page).evaluate((node) => node.childElementCount)).toBe(0);
  expect(addresses.filter((address) => /textures\//.test(address))).toEqual([]);
  for (const text of await Promise.all(scripts)) {
    expect(text).not.toContain("chikyu-earth-realistic");
    expect(text).not.toContain("Antarctica");
  }
  expect((await usage(page)).contexts).toBe(1);
  const before = await usage(page);
  await settle(page, 1500);
  expect((await usage(page)).pageFrames).toBe(before.pageFrames);

  // and only the form asked for comes in: the line globe needs no picture
  await earthIn(page, "line", "line");
  expect(addresses.filter((address) => /textures\//.test(address))).toEqual([]);
  expect((await usage(page)).contexts).toBe(1);
});

for (const { look, form, contexts } of LOOKS) {
  test.describe(`with the Earth behind ${look}`, () => {
    test("at its own low rate and nothing else while the rocket is still, and one frame request each per page frame with no growth while it spins", async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto(URL);
      await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
      await reach3d(page);
      await earthIn(page, look, form);
      expect((await usage(page)).contexts).toBe(contexts);

      // the rocket still, in the controls' hands and paused, nobody touching it: only the Earth's own rate is left
      await settle(page, 2000);
      const before = { draws: await earthDraws(page), rocket: await drawn(page), frames: (await usage(page)).pageFrames, at: Date.now() };
      await settle(page, 5000);
      const seconds = (Date.now() - before.at) / 1000;
      const drew = (await earthDraws(page)) - before.draws;
      expect(await drawn(page)).toBe(before.rocket);
      expect(drew).toBeGreaterThan(0);
      expect(drew / seconds).toBeLessThanOrEqual(EARTH_RATE[form] + 1);
      // the line globe needs no frame at all; the realistic one one a draw
      const frames = (await usage(page)).pageFrames - before.frames;
      expect(frames / seconds).toBeLessThanOrEqual(form === "realistic" ? EARTH_RATE.realistic + 1 : 0.5);
      await expect(earth(page)).toHaveAttribute("data-turning", "true");

      // the rocket spins on its own: one request for it, one for the Earth
      await hero(page).evaluate((node) => {
        (node as HTMLElement & { drive(choice: null): void }).drive(null);
        node.setAttribute("spin", "fast");
      });
      await settle(page, 1500);
      await page.evaluate(() => ((window as unknown as { __seen: Seen }).__seen.mostInAFrame = 0));
      const earlier = await measure(page);
      expect(earlier.drew).toBeGreaterThan(0);
      expect(earlier.drew).toBeLessThanOrEqual(earlier.frames + 3);
      const start = await usage(page);
      expect(start.mostInAFrame).toBeLessThanOrEqual(2);
      await settle(page, 3000);
      const later = await usage(page);
      expect(later.mostInAFrame).toBeLessThanOrEqual(2);
      // no growth: the same requests a frame after a while as at first
      expect((later.callbacks - start.callbacks) / Math.max(1, later.pageFrames - start.pageFrames)).toBeLessThanOrEqual(2);
      expect(later.contexts).toBe(contexts);
    });

    test("out of sight and on a hidden tab: no draw and no frame for either, and both come back", async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto(URL);
      await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
      await reach3d(page);
      await earthIn(page, look, form);
      // both have something to do: the rocket spins on its own hands
      await hero(page).evaluate((node) => {
        (node as HTMLElement & { drive(choice: null): void }).drive(null);
        node.setAttribute("spin", "fast");
      });
      const quiet = async () => {
        await expect(earth(page)).toHaveAttribute("data-turning", "false");
        // a frame already asked for when the page learned it is out of sight still comes, late on a busy machine
        await settle(page, 2000);
        const before = { earth: await earthDraws(page), rocket: await drawn(page), frames: (await usage(page)).pageFrames };
        await settle(page, 2500);
        expect(await earthDraws(page)).toBe(before.earth);
        expect(await drawn(page)).toBe(before.rocket);
        expect((await usage(page)).pageFrames).toBe(before.frames);
      };
      const turning = async () => {
        await expect(earth(page)).toHaveAttribute("data-turning", "true");
        const mark = { earth: await earthDraws(page), rocket: await drawn(page) };
        await expect.poll(() => earthDraws(page), { timeout: 30_000 }).toBeGreaterThan(mark.earth);
        await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(mark.rocket);
      };

      await hideTab(page, true);
      await quiet();
      await hideTab(page, false);
      await turning();

      await page.evaluate(() => {
        const spacer = document.createElement("div");
        spacer.style.height = "4000px";
        document.body.append(spacer);
        window.scrollTo(0, 3500);
      });
      await quiet();
      await page.evaluate(() => window.scrollTo(0, 0));
      await turning();
    });
  });
}

test("the realistic Earth's context is let go after 30 seconds out of sight, and it comes back", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await earthIn(page, "painted", "realistic");
  expect((await usage(page)).contexts).toBe(2);
  await hideTab(page, true);
  await expect.poll(async () => (await usage(page)).contexts, { timeout: 45_000, intervals: [2000] }).toBeLessThanOrEqual(1);
  await hideTab(page, false);
  await expect.poll(async () => (await usage(page)).contexts, { timeout: 60_000 }).toBe(2);
  const mark = await earthDraws(page);
  await expect.poll(() => earthDraws(page), { timeout: 30_000 }).toBeGreaterThan(mark);
});

test("reduced motion: the Earth is there and does not turn", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(COUNT);
  await page.goto(URL);
  await reach3d(page);
  for (const { look, form } of LOOKS) {
    await earthIn(page, look, form);
    await expect(earth(page)).toHaveAttribute("data-turning", "false");
    await settle(page, 500);
    const mark = await earthDraws(page);
    await settle(page, 1500);
    expect(await earthDraws(page)).toBe(mark);
  }
  await context.close();
});

test("nobody at the page: it stops turning after five minutes, and a move starts it again", async ({ page }) => {
  await page.clock.install();
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await earthIn(page, "line", "line");
  await expect(earth(page)).toHaveAttribute("data-turning", "true");
  await page.clock.fastForward("05:10");
  await expect(earth(page)).toHaveAttribute("data-turning", "false");
  const mark = await earthDraws(page);
  await settle(page, 1200);
  expect(await earthDraws(page)).toBe(mark);
  await page.mouse.move(20, 20);
  await page.mouse.move(40, 40);
  await expect(earth(page)).toHaveAttribute("data-turning", "true");
  await expect.poll(() => earthDraws(page)).toBeGreaterThan(mark);
});

test("the Earth's context lost: the rocket goes on; the rocket's lost: the Earth goes back to lines, and one context is never two again", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await earthIn(page, "painted", "realistic");
  // the Earth's: nothing draws while it is gone, the rocket does not notice
  await earth(page).evaluate((node) => {
    const canvas = node.querySelector("chikyu-earth-realistic")?.shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext;
    (window as unknown as { __lose: WEBGL_lose_context | null }).__lose = gl.getExtension("WEBGL_lose_context");
    (window as unknown as { __lose: WEBGL_lose_context }).__lose.loseContext();
  });
  await expect(earth(page).locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "lost");
  await expect(hero(page)).toHaveAttribute("data-state", "3d");
  const mark = await earthDraws(page);
  await settle(page, 1000);
  expect(await earthDraws(page)).toBe(mark);
  expect((await usage(page)).contexts).toBe(1);
  await page.evaluate(() => (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext());
  await expect(earth(page).locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "live");
  await expect.poll(() => earthDraws(page), { timeout: 30_000 }).toBeGreaterThan(mark);

  // the rocket's: the page has lost WebGL once, so it asks for no more of it
  await hero(page).evaluate((node) => {
    const canvas = (node as HTMLElement).shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(hero(page)).toHaveAttribute("data-state", "fallback", { timeout: 10_000 });
  await expect(earth(page)).toHaveAttribute("data-form", "thick");
  await expect.poll(async () => (await usage(page)).contexts, { timeout: 15_000 }).toBe(0);
  await expect.poll(() => earthDraws(page), { timeout: 15_000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test.describe("at a 5120 by 2880 window with a device scale of 2", () => {
  test.use({ viewport: { width: 5120, height: 2880 }, deviceScaleFactor: 2 });

  for (const { look, form, contexts } of LOOKS) {
    test(`every canvas of ${look} with the Earth is inside the budget, as the page lays it out and across the whole window`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.goto(URL);
      await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
      await reach3d(page);
      await earthIn(page, look, form);
      const within = async () => {
        const all = await canvases(page);
        expect(all).toHaveLength(contexts);
        for (const { w, h } of all) {
          expect(w * h).toBeLessThanOrEqual(MAX_PIXELS);
          expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_SIDE);
        }
        return all;
      };
      await within();
      // a picture behind the rocket takes no more than a canvas pixel to a CSS pixel, on any screen
      if (form === "realistic") {
        const box = (await earth(page).boundingBox()) as { width: number; height: number };
        const held = await earth(page).evaluate((node) => {
          const canvas = node.querySelector("chikyu-earth-realistic")?.shadowRoot?.querySelector("canvas") as HTMLCanvasElement;
          return canvas.width * canvas.height;
        });
        expect(held).toBeLessThanOrEqual(box.width * box.height * 1.02);
      }
      // as large as a page can make it
      await page.evaluate(() => {
        const space = document.querySelector(".view-space") as HTMLElement;
        space.style.position = "fixed";
        space.style.inset = "0";
        space.style.zIndex = "5";
        const rocket = document.getElementById("hero") as HTMLElement;
        rocket.style.maxWidth = "none";
        rocket.style.width = "100vw";
        rocket.style.setProperty("--uchusen-aspect", "16 / 9");
      });
      await expect.poll(async () => Math.max(...(await canvases(page)).map(({ w }) => w)), { timeout: 60_000 }).toBeGreaterThan(2560);
      if (form === "realistic") await expect.poll(async () => Math.min(...(await canvases(page)).map(({ w }) => w)), { timeout: 60_000 }).toBeGreaterThan(2560);
      const large = await within();
      console.log(`canvases at 5120x2880@2, ${look}, across the window: ${large.map(({ w, h }) => `${w}x${h}`).join(", ")}`);
      expect((await usage(page)).contexts).toBe(contexts);
    });
  }
});

test.describe("50 rounds", () => {
  const ROUNDS = Number(process.env.FREEZE_ROUNDS ?? 50);
  test("the Earth on and off, and changing rocket and look: GPU objects flat after the first round, its context and pictures given back, and the memory measured", async () => {
    test.setTimeout(60 * 60_000);
    // a browser of its own, so its processes can be read
    const server = await chromium.launchServer({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    const pid = String(server.process().pid);
    const processMB = () => {
      const rows = execSync("ps -A -o pid=,ppid=,rss=", { encoding: "utf8", maxBuffer: 1 << 24 }).trim().split("\n").map((line) => line.trim().split(/\s+/));
      const inTree = new Set([pid]);
      for (let grew = true; grew; ) {
        grew = false;
        for (const [one, parent] of rows)
          if (inTree.has(parent) && !inTree.has(one)) {
            inTree.add(one);
            grew = true;
          }
      }
      return Math.round(rows.filter(([one]) => inTree.has(one)).reduce((sum, row) => sum + Number(row[2]), 0) / 1024);
    };
    const browser = await chromium.connect(server.wsEndpoint());
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", baseURL: test.info().project.use.baseURL });
    await page.addInitScript(COUNT);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const heapMB = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      const { metrics } = await cdp.send("Performance.getMetrics");
      return +((metrics.find((metric) => metric.name === "JSHeapUsedSize")?.value ?? 0) / 1048576).toFixed(1);
    };
    await page.goto(URL);
    await reach3d(page);
    const startMB = processMB();
    const startHeap = await heapMB();
    const offNow = async () => {
      await press(page, "background-none");
      await expect(earth(page)).toBeHidden();
      await expect(earth(page).locator("*")).toHaveCount(0);
      // the shared renderer lets the context go a second after the last element, and pictures after their short linger
      await expect.poll(async () => (await usage(page)).contexts, { timeout: 15_000 }).toBe(1);
    };
    let withEarth = await usage(page);
    const round = async () => {
      await earthIn(page, "line", "line");
      await earthIn(page, "painted", "realistic");
      // every picture at the size it wants and drawn, so a reading with the Earth on can be compared too
      await expect.poll(() => earth(page).evaluate((node) => Object.values((node.querySelector("chikyu-earth-realistic") as unknown as { stats: { tiers: Record<string, number> } }).stats.tiers).every((width) => width === 2048)), { timeout: 90_000 }).toBe(true);
      await settle(page, 400);
      withEarth = await usage(page);
      await pressAndDraw(page, "rocket-falcon-heavy");
      await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
      expect((await usage(page)).contexts).toBe(2);
      // straight off from the realistic Earth, and on and off again as lines
      await offNow();
      await pressAndDraw(page, "look-thick");
      await earthIn(page, "thick", "thick");
      await offNow();
      await pressAndDraw(page, "look-line");
      await pressAndDraw(page, "rocket-starship");
      await settle(page, 300);
    };
    const log: string[] = [];
    // the first round fills the caches kept on purpose; each round ends where it began
    await round();
    await settle(page, 2500);
    const first = await usage(page);
    const firstOn = withEarth;
    const firstHeap = await heapMB();
    const firstMB = processMB();
    log.push(`after round 1: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}, framebuffers ${first.framebuffers}, heap ${firstHeap} MB, process ${firstMB} MB`);
    for (let index = 1; index < ROUNDS; index++) {
      await round();
      if ((index + 1) % 10 === 0) log.push(`after round ${index + 1}: heap ${await heapMB()} MB, process ${processMB()} MB, contexts ${(await usage(page)).contexts}`);
    }
    await settle(page, 2500);
    const last = await usage(page);
    const lastHeap = await heapMB();
    const lastMB = processMB();
    log.push(`with the Earth on, round 1 then round ${ROUNDS}: buffers ${firstOn.buffers} ${withEarth.buffers}, textures ${firstOn.textures} ${withEarth.textures}, programs ${firstOn.programs} ${withEarth.programs}, contexts ${firstOn.contexts} ${withEarth.contexts}`);
    log.push(`at the start: heap ${startHeap} MB, process ${startMB} MB`);
    log.push(`after round ${ROUNDS}: buffers ${last.buffers}, arrays ${last.arrays}, textures ${last.textures}, programs ${last.programs}, framebuffers ${last.framebuffers}, heap ${lastHeap} MB, process ${lastMB} MB`);
    console.log(log.join("\n"));
    await test.info().attach("rounds", { body: log.join("\n") });
    await browser.close();
    await server.close();
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
    expect(last.framebuffers).toBeLessThanOrEqual(first.framebuffers);
    expect(withEarth.contexts).toBe(2);
    expect(withEarth.buffers).toBeLessThanOrEqual(firstOn.buffers);
    expect(withEarth.textures).toBeLessThanOrEqual(firstOn.textures);
    expect(withEarth.programs).toBeLessThanOrEqual(firstOn.programs);
    expect(lastHeap - firstHeap).toBeLessThanOrEqual(5);
    // A debugger's Network agent, which every Playwright page has, keeps response bodies up to 200 MB in the page's process, so this reading climbs by that much here and not for a person (with no debugger attached it stays level): anything well past that is ours.
    expect(lastMB - firstMB).toBeLessThanOrEqual(450);
  });
});
