// The demo must never ask a lot of the machine. Played in headless Chromium with the controls turning it, these fail on a draw loop that runs when nothing moves or more than once a frame, on WebGL contexts or
// graphics memory (buffers, vertex arrays, textures) that grow with each change, on a canvas past its pixel budget at any zoom on a 5K screen, and on a lost context that is not let go. With the Earth behind the rocket they
// also fail on more than one frame request for it per page frame, on drawing it faster than its own low rate, on anything drawn out of sight or on a hidden tab, on its context or pictures kept after it is turned off, and on growth over 50 rounds of changes.
import { execSync } from "node:child_process";
import { chromium, expect as plainExpect, type Locator, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";
import { ROCKETS } from "../src/rockets.ts";
import { isListed } from "../demo/listed.ts";

// these draw in software, and a page building a painted material can be busy for many seconds
const expect = plainExpect.configure({ timeout: 30_000 });
const URL = "/uchusen-rockets/";
/** The walks of every variant leave the fleet to its own walk (below): it holds more than seventy, each far bigger than a rocket. */
const real = (rocket: { id: string }) => !rocket.id.startsWith("fleet-");
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
/** A rocket's button shows under its maker's, so its maker comes first. The fleet kit's boxes of parts are not listed, and are pressed without being seen. */
const press = async (page: Page, id: string) => {
  const rocket = /^rocket-(.+)$/.exec(id)?.[1];
  if (rocket) await page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`).click();
  const button = page.locator(`[data-testid="${id}"]`);
  if (rocket && !isListed(rocket)) await button.dispatchEvent("click");
  else await button.click();
};

test.use({ reducedMotion: "no-preference" });
test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

/** Counts what the page asks of the graphics card, from before any script runs. Objects are counted per context, as a lost context's objects are gone whether or not they were deleted, and contexts are held weakly, so counting them does not keep them alive. */
const COUNT = () => {
  type Ctx = (WebGLRenderingContext | WebGL2RenderingContext) & { isContextLost(): boolean };
  type Tally = { made: Record<string, number>; freed: Record<string, number> };
  const tallies = new WeakMap<object, Tally>();
  const seen = { contexts: [] as { context: WeakRef<Ctx>; tally: Tally }[], frames: 0, callbacks: 0, mostInAFrame: 0, asked: 0, draws: 0, pending: 0, newestRun: 0 };
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
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[]) {
    for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const original = proto[name];
      if (!original) continue;
      proto[name] = function (this: unknown, ...args: unknown[]) {
        seen.draws++;
        return original.apply(this, args);
      };
    }
  }
  // frames, not callbacks: callbacks of one frame share a time. Each request is numbered, and the requests not yet run or cancelled are `pending`: a frame that comes later can be told from one asked for later.
  let last = -1;
  let inThisFrame = 0;
  const waiting = new Set<number>();
  const frame = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    const asked = ++seen.asked;
    const handle = frame((time) => {
      if (waiting.delete(handle)) seen.pending--;
      seen.newestRun = Math.max(seen.newestRun, asked);
      if (time !== last) {
        seen.frames++;
        inThisFrame = 0;
      }
      last = time;
      seen.callbacks++;
      seen.mostInAFrame = Math.max(seen.mostInAFrame, ++inThisFrame);
      callback(time);
    });
    waiting.add(handle);
    seen.pending++;
    return handle;
  };
  window.cancelAnimationFrame = (handle) => {
    if (waiting.delete(handle)) seen.pending--;
    cancel(handle);
  };
  Object.assign(window, { __seen: seen });
};

type Tallied = { context: WeakRef<{ isContextLost(): boolean }>; tally: { made: Record<string, number>; freed: Record<string, number> } };
type Seen = { contexts: Tallied[]; frames: number; callbacks: number; mostInAFrame: number; asked: number; draws: number; pending: number; newestRun: number };
const usage = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as unknown as { __seen: Seen }).__seen;
    const alive = seen.contexts.filter(({ context }) => {
      const held = context.deref();
      return held !== undefined && !held.isContextLost();
    });
    const live = (kind: string) => alive.reduce((sum, { tally }) => sum + (tally.made[kind] ?? 0) - (tally.freed[kind] ?? 0), 0);
    return { contexts: alive.length, buffers: live("Buffer"), arrays: live("VertexArray"), textures: live("Texture"), programs: live("Program"), framebuffers: live("Framebuffer"), pageFrames: seen.frames, callbacks: seen.callbacks, mostInAFrame: seen.mostInAFrame, asked: seen.asked, draws: seen.draws, pending: seen.pending, newestRun: seen.newestRun };
  });
type Usage = Awaited<ReturnType<typeof usage>>;
/** No frame was asked for and run between two readings. A frame asked for before the first reading may still come after it, late on a busy machine: a hosted runner drawing in software had one come more than two
 * seconds after the tab was hidden. Only such a frame may come, and only as many as were waiting at the first reading; a frame asked for after it fails, so a loop always does. */
const noFrameAskedSince = (before: Usage, after: Usage) => {
  const frames = after.pageFrames - before.pageFrames;
  expect(after.newestRun, "a frame asked for during the quiet stretch was run").toBeLessThanOrEqual(before.asked);
  if (frames > 0) console.log(`${frames} frame(s) asked for before the quiet stretch came during it (${before.pending} waiting at its start)`);
  expect(frames).toBeLessThanOrEqual(before.pending);
};
const drawn = (page: Page) => hero(page).evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));
/** Presses a choice and waits until the view has drawn it. What three.js holds depends on which materials each shape was drawn with, so a reading of it means something only when no frame of a change was skipped.
 * The frames are counted in the page at the change itself: a new rocket's when `uchusen-change` says it is in, anything else's when the element's attributes change. Counted before the press instead, a frame
 * of an earlier move that came between the count and the press passed for one of the change, and the reading was taken before the change was drawn. */
const pressAndDraw = async (page: Page, id: string) => {
  await hero(page).evaluate((node, whole) => {
    const frames = () => Number(node.shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0);
    (window as unknown as { __change: Promise<number> }).__change = new Promise((done) => {
      if (whole) node.addEventListener("uchusen-change", () => done(frames()), { once: true });
      else {
        const watching = new MutationObserver(() => {
          watching.disconnect();
          done(frames());
        });
        watching.observe(node, { attributes: true, attributeFilter: ["look", "show", "view", "engines"] });
      }
    });
  }, /^(rocket|variant)-/.test(id));
  await press(page, id);
  const mark = await page.evaluate(() => (window as unknown as { __change: Promise<number> }).__change);
  await expect.poll(() => drawn(page), { timeout: 60_000 }).toBeGreaterThan(mark);
};
const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
const settle = (page: Page, ms: number) => page.waitForTimeout(ms);
/**
 * A reading once the GPU objects have stopped moving: two readings a second apart agree. The pictures the renderer is still giving back after their short linger are not kept ones, and a slow runner reads them
 * mid-way (24 textures where the first round read 21); a leak never settles lower than it began, and is still caught by the comparison.
 */
const levelUsage = async (page: Page) => {
  let before = await usage(page);
  for (let tries = 0; tries < 15; tries++) {
    await page.waitForTimeout(1000);
    const now = await usage(page);
    if (now.textures === before.textures && now.buffers === before.buffers && now.programs === before.programs && now.framebuffers === before.framebuffers) return now;
    before = now;
  }
  return before;
};
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

test("these tests draw in software, never on this machine's graphics card", async ({ page }) => {
  await page.goto(URL);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl?.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  });
  expect(renderer).toMatch(/swiftshader/i);
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
  test.setTimeout(300_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  // A licensed model is let through only once the view has drawn this package's own paint, which shows until the model is in. Left to itself it is a race: when the model comes before the next frame the own
  // paint is never drawn, and three.js holds no vertex arrays for it. Those are let go with the rocket, so the count went up and down by round (72, 55, 55, 55 here; 55 then 72 on a hosted runner) and a
  // round that drew the own paint after one that did not read as growth. Held, every round draws the same things.
  let open = () => {};
  let gate = Promise.resolve();
  await page.route("**/assets/models/**", async (route) => {
    await gate;
    await route.continue();
  });
  const withModelsHeld = async (id: string) => {
    gate = new Promise((done) => (open = done));
    await pressAndDraw(page, id);
    open();
  };
  const round = async () => {
    await pressAndDraw(page, "variant-v1");
    await pressAndDraw(page, "show-apart");
    await pressAndDraw(page, "look-thick");
    await withModelsHeld("look-painted");
    await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
    await withModelsHeld("variant-v3");
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
    await pressAndDraw(page, "show-together");
    await pressAndDraw(page, "look-line");
    await settle(page, 600);
  };
  // the first round fills the caches that are kept on purpose; each change is waited for until it is drawn, so no later round finds a shape not yet drawn, and every later reading is held to the first
  await round();
  const first = await usage(page);
  console.log(`round 1: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}`);
  for (let i = 0; i < 4; i++) {
    await round();
    const now = await usage(page);
    console.log(`round ${i + 2}: buffers ${now.buffers}, arrays ${now.arrays}, textures ${now.textures}, programs ${now.programs}`);
    expect(now.contexts).toBe(1);
    expect(now.buffers).toBeLessThanOrEqual(first.buffers);
    expect(now.arrays).toBeLessThanOrEqual(first.arrays);
    expect(now.textures).toBeLessThanOrEqual(first.textures);
  }
});

test("every variant of every rocket: drawn line and painted, then contexts and graphics memory stay flat as they are walked again", async ({ page }) => {
  test.setTimeout(45 * 60_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  const walk = async (look: string) => {
    await press(page, `look-${look}`);
    for (const rocket of Object.values(ROCKETS).filter(real))
      for (const variant of rocket.variants) {
        await press(page, `rocket-${rocket.id}`);
        await press(page, `variant-${variant.id}`);
        await expect(hero(page)).toHaveAttribute("rocket", rocket.id);
        await expect(hero(page)).toHaveAttribute("data-variant", variant.id);
        await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
        if (look === "painted") await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
        await settle(page, 120);
      }
  };
  await walk("line");
  await walk("painted");
  const first = await usage(page);
  await walk("line");
  await walk("painted");
  const last = await usage(page);
  expect(last.contexts).toBe(1);
  expect(last.buffers).toBeLessThanOrEqual(first.buffers);
  expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  expect(last.textures).toBeLessThanOrEqual(first.textures);
  // still only one draw a frame with all of them behind it
  await bar(page).evaluate((node) => (node as HTMLElement & { play(): void }).play());
  await settle(page, 800);
  const { drew, frames } = await measure(page);
  expect(drew).toBeLessThanOrEqual(frames + 3);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
});

test("the fleet kit: every module and the sample ship drawn painted, then contexts and graphics memory stay flat as they are walked again, and it still draws once a frame", async ({ page }) => {
  test.setTimeout(45 * 60_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await press(page, "look-painted");
  const fleet = Object.values(ROCKETS).filter((rocket) => !real(rocket));
  expect(fleet.length).toBeGreaterThan(5);
  // The element says `uchusen-change` when the rocket and variant on screen are in. `data-variant` and `data-state` are set before that and `data-state` stays "3d" through a change, so they do not tell a reading that the
  // choice is drawn: a slow runner read 4 buffers where 1395 are made once the last variant's first frame is in.
  await hero(page).evaluate((node) =>
    node.addEventListener("uchusen-change", (event) => {
      const variant = (event as CustomEvent<{ report: { variant?: { rocket: string; id: string } } }>).detail.report.variant;
      (window as unknown as { __in: string }).__in = `${variant?.rocket}/${variant?.id}`;
    }),
  );
  const walk = async (stride: number) => {
    for (const rocket of fleet) {
      const began = Date.now();
      for (const variant of rocket.variants.filter((_, i) => i % stride === 0)) {
        await press(page, `rocket-${rocket.id}`);
        await press(page, `variant-${variant.id}`);
        await expect(hero(page)).toHaveAttribute("data-variant", variant.id);
        await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
        await expect.poll(() => page.evaluate(() => (window as unknown as { __in?: string }).__in), { timeout: 90_000 }).toBe(`${rocket.id}/${variant.id}`);
        await settle(page, 80);
      }
      // seconds a ship took, said as each ends, so a walk that slows down (or stops) says which ship did it
      console.log(`fleet walk, ${rocket.id}: ${Math.round((Date.now() - began) / 1000)} s`);
    }
  };
  await walk(1);
  const first = await usage(page);
  console.log(`fleet walk 1: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}`);
  // the opened ones and the apart view too: the shapes that are only built when chosen
  await walk(2);
  await press(page, "rocket-fleet-samples");
  await press(page, "show-apart");
  await settle(page, 600);
  await press(page, "show-together");
  await walk(1);
  const last = await usage(page);
  console.log(`fleet walk 2: buffers ${last.buffers}, arrays ${last.arrays}, textures ${last.textures}, programs ${last.programs}`);
  expect(last.contexts).toBe(1);
  expect(last.buffers).toBeLessThanOrEqual(first.buffers);
  expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  expect(last.textures).toBeLessThanOrEqual(first.textures);
  await bar(page).evaluate((node) => (node as HTMLElement & { play(): void }).play());
  await settle(page, 800);
  const { drew, frames } = await measure(page);
  expect(drew).toBeLessThanOrEqual(frames + 3);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  // a canvas past its budget is never made: the fleet's ships are far bigger than a rocket, the pixels are the same
  const side = await hero(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    return canvas ? [canvas.width, canvas.height] : [0, 0];
  });
  expect(side[0] * side[1]).toBeLessThanOrEqual(MAX_PIXELS);
  expect(Math.max(...side)).toBeLessThanOrEqual(MAX_SIDE);
});

test("a scene with many objects draws few things a frame, and its graphics memory stays flat over repeated switching", async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  const figures: string[] = [];
  const scenes: readonly [string, string][] = [["starbase", "city"], ["starbase", "launch-site"], ["launch-tower", "stack"], ["droneship", "ocisly"]];
  const go = async ([rocket, variant]: readonly [string, string]) => {
    await press(page, `rocket-${rocket}`);
    await press(page, `variant-${variant}`);
    await expect(hero(page)).toHaveAttribute("data-variant", variant);
    await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    await settle(page, 400);
  };
  for (const scene of scenes) {
    await go(scene);
    const before = await usage(page);
    const drewBefore = await drawn(page);
    await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ yaw: 31 }));
    await settle(page, 700);
    const after = await usage(page);
    const frames = (await drawn(page)) - drewBefore;
    const perFrame = frames > 0 ? Math.round((after.draws - before.draws) / frames) : 0;
    figures.push(`${scene.join(":")}: ${perFrame} draws a frame over ${frames} frames, ${after.buffers} buffers`);
    expect(frames).toBeGreaterThan(0);
    expect(perFrame).toBeLessThanOrEqual(400);
    await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ yaw: 0 }));
  }
  console.log(figures.join("\n"));
  for (const scene of scenes) await go(scene);
  const first = await usage(page);
  for (let round = 0; round < 3; round++) for (const scene of scenes) await go(scene);
  const last = await usage(page);
  console.log(`after three more rounds: buffers ${first.buffers} to ${last.buffers}, arrays ${first.arrays} to ${last.arrays}, textures ${first.textures} to ${last.textures}`);
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

// ------------------------------------------------------------- the engines
const pause = (page: Page) => bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
const canvasData = (page: Page, key: string) => hero(page).evaluate((node, name) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset[name] ?? "", key);
/** Nothing is drawn or asked for, over `ms`, once whatever is moving has run down. */
const expectIdle = async (page: Page, ms = 2000) => {
  await expect
    .poll(async () => {
      const mark = await drawn(page);
      await settle(page, 1000);
      return (await drawn(page)) - mark;
    }, { timeout: 90_000 })
    .toBe(0);
  const start = await usage(page);
  await settle(page, ms);
  const end = await usage(page);
  expect(end.pageFrames - start.pageFrames).toBeLessThanOrEqual(2);
  expect(end.asked - start.asked).toBeLessThanOrEqual(2);
};

test.describe("with the engines lit", () => {
  test("a flame draws at most once a frame, asks for one frame at a time, and stops when it has settled", async ({ page }) => {
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await press(page, "engines-on");
    await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    const before = await usage(page);
    const mark = await drawn(page);
    // for a set time, not a set number of frames: a flame settles, and a slow machine may have drawn few by then
    await settle(page, 10_000);
    const after = await usage(page);
    const drew = (await drawn(page)) - mark;
    const frames = after.pageFrames - before.pageFrames;
    // it does flicker
    expect(drew).toBeGreaterThan(0);
    expect(drew).toBeLessThanOrEqual(frames + 3);
    // one for the view, and no more; the controls are paused and their own bar asks for none
    expect(after.asked - before.asked).toBeLessThanOrEqual(after.pageFrames - before.pageFrames + 3);
    await expectIdle(page);
    expect(await canvasData(page, "plumes")).toBe("33");
  });

  test("a painted, spinning, lit rocket still draws once a frame, on its own hands and on the controls'", async ({ page }) => {
    await page.goto(URL);
    await reach3d(page);
    await press(page, "engines-on");
    await press(page, "look-painted");
    await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
    const onControls = await measure(page, 12);
    expect(onControls.drew).toBeGreaterThan(0);
    expect(onControls.drew).toBeLessThanOrEqual(onControls.frames + 3);
    await pause(page);
    await hero(page).evaluate((node) => {
      (node as HTMLElement & { drive(choice: null): void }).drive(null);
      node.setAttribute("spin", "fast");
    });
    await settle(page, 1000);
    const onItsOwn = await measure(page, 12);
    expect(onItsOwn.drew).toBeGreaterThan(0);
    expect(onItsOwn.drew).toBeLessThanOrEqual(onItsOwn.frames + 3);
    await hero(page).evaluate((node) => node.setAttribute("spin", "off"));
    await expectIdle(page);
  });

  test("out of sight and on a hidden tab a lit rocket draws nothing, and picks up when it is back", async ({ page }) => {
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await press(page, "engines-on");
    await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "6000px";
      document.body.append(spacer);
      window.scrollTo(0, 5000);
    });
    await settle(page, 1000);
    const hiddenFrom = await drawn(page);
    await settle(page, 1500);
    expect(await drawn(page)).toBe(hiddenFrom);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(hiddenFrom);
    // a hidden tab: headless Chromium never hides one by itself, so the page is told, as a real one would be
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle(page, 500);
    const tabFrom = await usage(page);
    const tabDrawn = await drawn(page);
    await settle(page, 1500);
    expect(await drawn(page)).toBe(tabDrawn);
    expect((await usage(page)).asked - tabFrom.asked).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(tabDrawn);
  });

  test("forty rounds of on and off, across looks and parts, make nothing on the graphics card; contexts stay at one", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    const round = async () => {
      await press(page, "engines-on");
      await press(page, "look-thick");
      await press(page, "show-booster");
      await press(page, "engines-off");
      await press(page, "show-together");
      await press(page, "look-line");
    };
    // the first round makes each part's flames, which are kept on purpose
    await round();
    await settle(page, 300);
    const first = await usage(page);
    for (let i = 0; i < 39; i++) await round();
    await settle(page, 300);
    const last = await usage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
    expect(last.framebuffers).toBeLessThanOrEqual(first.framebuffers);
  });

  test("changing rocket with the engines lit gives back the flames of the old one", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await press(page, "engines-on");
    // each rocket is read once it has been drawn: its plumes are counted when it is built, and its buffers are made by its first frame, which a slow runner draws well after (9 buffers just after the plumes, 191 a frame later)
    const round = async () => {
      await pressAndDraw(page, "rocket-falcon-9");
      await expect.poll(() => canvasData(page, "plumes")).toBe("9");
      await pressAndDraw(page, "rocket-falcon-heavy");
      await expect.poll(() => canvasData(page, "plumes")).toBe("27");
      await pressAndDraw(page, "rocket-starship");
      await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    };
    await round();
    await settle(page, 300);
    const first = await usage(page);
    for (let i = 0; i < 4; i++) await round();
    await settle(page, 300);
    const last = await usage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  });

  test("a lit rocket let go while out of sight gives back its context, and comes back lit", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await press(page, "engines-on");
    await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "6000px";
      document.body.append(spacer);
      window.scrollTo(0, 5000);
    });
    await expect(hero(page)).toHaveAttribute("data-state", "picture", { timeout: 60_000 });
    expect((await usage(page)).contexts).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await reach3d(page);
    await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    expect((await usage(page)).contexts).toBe(1);
  });
});

test.describe("a played timeline", () => {
  const rocket = (page: Page) => hero(page) as Locator;
  const state = (page: Page) => rocket(page).evaluate((node) => (node as HTMLElement & { flightState: { playing: boolean; ended: boolean; position: number; active: boolean } }).flightState);
  const flightButton = (page: Page, id: string) => page.locator('[data-testid="flight"]').locator(`[data-testid="${id}"]`);

  test("draws at most once a frame, asks for one frame at a time, ends by itself, and then nothing draws", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await flightButton(page, "flight-play").click();
    await expect.poll(async () => (await state(page)).playing).toBe(true);
    const before = await usage(page);
    const { drew, frames } = await measure(page, 20);
    const after = await usage(page);
    expect(drew).toBeGreaterThan(0);
    expect(drew).toBeLessThanOrEqual(frames + 3);
    expect(after.asked - before.asked).toBeLessThanOrEqual(after.pageFrames - before.pageFrames + 3);
    await expect.poll(async () => (await state(page)).ended, { timeout: 180_000 }).toBe(true);
    expect((await state(page)).playing).toBe(false);
    await expectIdle(page);
  });

  test("paused it settles to nothing; out of sight and on a hidden tab it stands still and draws nothing", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await flightButton(page, "flight-play").click();
    await expect.poll(async () => (await state(page)).position, { timeout: 60_000 }).toBeGreaterThan(0.5);
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "6000px";
      document.body.append(spacer);
      window.scrollTo(0, 5000);
    });
    await settle(page, 1000);
    const away = { at: (await state(page)).position, drew: await drawn(page) };
    await settle(page, 2000);
    expect((await state(page)).position).toBe(away.at);
    expect(await drawn(page)).toBe(away.drew);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await state(page)).position, { timeout: 60_000 }).toBeGreaterThan(away.at);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle(page, 500);
    const hidden = { at: (await state(page)).position, drew: await drawn(page), asked: (await usage(page)).asked };
    await settle(page, 2000);
    expect((await state(page)).position).toBe(hidden.at);
    expect(await drawn(page)).toBe(hidden.drew);
    expect((await usage(page)).asked - hidden.asked).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect.poll(async () => (await state(page)).position, { timeout: 60_000 }).toBeGreaterThan(hidden.at);
    await flightButton(page, "flight-play").click();
    expect((await state(page)).playing).toBe(false);
    await expectIdle(page);
  });

  test("forty rounds in and out of a flight, scrubbing all the way, make nothing on the graphics card", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    const seek = (position: number) => rocket(page).evaluate((node, at) => (node as HTMLElement & { seek(p: number): void }).seek(at), position);
    const leave = () => rocket(page).evaluate((node) => (node as HTMLElement & { endFlight(): void }).endFlight());
    const round = async () => {
      for (const at of [0, 3, 5.5, 8, 11, 14]) await seek(at);
      await page.waitForTimeout(40);
      await leave();
      await page.waitForTimeout(40);
    };
    // the first round, drawn at every step, makes the ground and each part's flames, which are kept on purpose
    for (const at of [0, 3, 5.5, 8, 11, 14]) {
      const mark = await drawn(page);
      await seek(at);
      await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(mark);
    }
    await leave();
    await settle(page, 500);
    const first = await usage(page);
    for (let i = 0; i < 40; i++) await round();
    await settle(page, 300);
    const last = await usage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
  });

  test("grid fins, legs and flaps turn in a flight, and forty rounds of it make nothing on the graphics card and draw nothing extra", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    await press(page, "rocket-falcon-9");
    await press(page, "variant-block-5");
    await press(page, "look-thick");
    await expect(hero(page)).toHaveAttribute("data-flight", "falcon-9-starlink-2019");
    const seek = (position: number) => rocket(page).evaluate((node, at) => (node as HTMLElement & { seek(p: number): void }).seek(at), position);
    const leave = () => rocket(page).evaluate((node) => (node as HTMLElement & { endFlight(): void }).endFlight());
    const turned = () => canvasData(page, "turned");
    // folded fins for the ascent, none for the entry, the legs open for the landing
    await seek(2);
    await expect.poll(turned).toContain("first-stage:grid-fins~0=85");
    await seek(7);
    await expect.poll(turned).not.toContain("grid-fins");
    await seek(9);
    await expect.poll(turned).toContain("first-stage:legs~0=60");
    await leave();
    // the first round makes what is kept on purpose (the ground and the flames); the rest make nothing
    const round = async () => {
      for (const at of [0, 2, 5, 7, 8, 9, 10]) await seek(at);
      await page.waitForTimeout(40);
      await leave();
      await page.waitForTimeout(40);
    };
    for (const at of [0, 2, 5, 7, 8, 9, 10]) {
      const was = await drawn(page);
      await seek(at);
      await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(was);
    }
    await leave();
    await settle(page, 500);
    const first = await usage(page);
    const mark = await drawn(page);
    for (let i = 0; i < 40; i++) await round();
    await settle(page, 300);
    const last = await usage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
    // 40 rounds of 7 steps and a leave: a draw for each at most (one a frame), not a loop
    expect((await drawn(page)) - mark).toBeLessThanOrEqual(40 * 9 + 20);
    await expectIdle(page);
  });

  test("changing variant in the middle of a flight ends it and gives back its flames", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    const round = async () => {
      await rocket(page).evaluate((node) => (node as HTMLElement & { seek(p: number): void }).seek(5));
      await expect.poll(() => canvasData(page, "phase")).toBe("boostback");
      await press(page, "variant-v2");
      await expect.poll(async () => (await state(page)).active).toBe(false);
      await expect.poll(() => canvasData(page, "plumes")).toBe("0");
      await pressAndDraw(page, "variant-v3");
      await expect.poll(() => rocket(page).getAttribute("data-flight")).toBe("starship-flight-12");
      await settle(page, 200);
    };
    const peak = { buffers: 0, arrays: 0 };
    for (let i = 0; i < 2; i++) {
      await round();
      const now = await usage(page);
      peak.buffers = Math.max(peak.buffers, now.buffers);
      peak.arrays = Math.max(peak.arrays, now.arrays);
    }
    for (let i = 0; i < 4; i++) {
      await round();
      const now = await usage(page);
      expect(now.contexts).toBe(1);
      expect(now.buffers).toBeLessThanOrEqual(peak.buffers);
      expect(now.arrays).toBeLessThanOrEqual(peak.arrays);
    }
  });
});

test.describe("the embed page", () => {
  const LIT = `${URL}embed.html?rocket=starship&variant=v3&look=painted&engines=on`;
  const rocket = (page: Page) => page.locator('[data-testid="rocket"]');
  const drew = (page: Page) => rocket(page).evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));

  test("lit, it draws at most once a frame, settles to nothing, and holds one context", async ({ page }) => {
    await page.goto(LIT);
    await expect(rocket(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    await expect.poll(() => rocket(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.plumes)).toBe("33");
    // for a set time, not a set number of frames: a flame settles, and a slow machine may have drawn few by then
    await rocket(page).evaluate((node) => node.setAttribute("engines", "off"));
    await rocket(page).evaluate((node) => node.setAttribute("engines", "on"));
    const start = { drew: await drew(page), page: (await usage(page)).pageFrames };
    await settle(page, 10_000);
    const frames = (await usage(page)).pageFrames - start.page;
    const count = (await drew(page)) - start.drew;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(frames + 3);
    await expect
      .poll(async () => {
        const mark = await drew(page);
        await settle(page, 1000);
        return (await drew(page)) - mark;
      }, { timeout: 90_000 })
      .toBe(0);
    expect((await usage(page)).contexts).toBe(1);
  });

  test("forty rounds of on and off make nothing on the graphics card", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${URL}embed.html?rocket=falcon-9&variant=block-5&look=line`);
    await expect(rocket(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    const toggle = (value: string) => rocket(page).evaluate((node, on) => node.setAttribute("engines", on), value);
    await toggle("on");
    await settle(page, 300);
    await toggle("off");
    await settle(page, 300);
    const first = await usage(page);
    for (let i = 0; i < 40; i++) {
      await toggle("on");
      await page.waitForTimeout(30);
      await toggle("off");
      await page.waitForTimeout(30);
    }
    await settle(page, 300);
    const last = await usage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
  });

  test("with its flight's controls it plays once a frame, ends, and then nothing draws", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${URL}embed.html?rocket=falcon-9&variant=block-5&look=line&flight=1`);
    await expect(rocket(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    const before = await usage(page);
    const start = await drew(page);
    await page.locator('[data-testid="flight"]').locator('[data-testid="flight-play"]').click();
    await expect.poll(async () => (await usage(page)).pageFrames - before.pageFrames, { timeout: 90_000 }).toBeGreaterThanOrEqual(20);
    const after = await usage(page);
    const count = (await drew(page)) - start;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(after.pageFrames - before.pageFrames + 3);
    expect(after.asked - before.asked).toBeLessThanOrEqual(after.pageFrames - before.pageFrames + 3);
    await expect(page.locator('[data-testid="flight"]')).toHaveAttribute("data-playing", "false", { timeout: 180_000 });
    await expect
      .poll(async () => {
        const mark = await drew(page);
        await settle(page, 1000);
        return (await drew(page)) - mark;
      }, { timeout: 90_000 })
      .toBe(0);
    expect((await usage(page)).contexts).toBe(1);
  });

  test("in a page that scrolls it away it draws nothing", async ({ page }) => {
    await page.goto(`${URL}react-check.html`);
    await page.evaluate((src) => {
      document.documentElement.innerHTML = "<body></body>";
      const frame = document.createElement("iframe");
      frame.src = src;
      frame.style.cssText = "width:480px;height:640px;border:0;display:block";
      frame.dataset.testid = "embed";
      const spacer = document.createElement("div");
      spacer.style.height = "6000px";
      document.body.append(frame, spacer);
    }, LIT);
    const inner = page.frameLocator('[data-testid="embed"]').locator('[data-testid="rocket"]');
    await expect(inner).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    const count = () => inner.evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));
    await page.evaluate(() => window.scrollTo(0, 5000));
    await settle(page, 1200);
    const from = await count();
    await settle(page, 1500);
    expect(await count()).toBe(from);
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
  await press(page, "panel-look");
  await press(page, `look-${look}`);
  await press(page, "panel-background");
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
        const before = { earth: await earthDraws(page), rocket: await drawn(page), usage: await usage(page) };
        await settle(page, 2500);
        expect(await earthDraws(page)).toBe(before.earth);
        expect(await drawn(page)).toBe(before.rocket);
        noFrameAskedSince(before.usage, await usage(page));
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
      await press(page, "panel-background");
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
      withEarth = await levelUsage(page);
      await pressAndDraw(page, "rocket-falcon-heavy");
      await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
      expect((await usage(page)).contexts).toBe(2);
      // straight off from the realistic Earth, and on and off again as lines
      await offNow();
      await press(page, "panel-look");
      await pressAndDraw(page, "look-thick");
      await earthIn(page, "thick", "thick");
      await offNow();
      await press(page, "panel-look");
      await pressAndDraw(page, "look-line");
      await pressAndDraw(page, "rocket-starship");
      await settle(page, 300);
    };
    const log: string[] = [];
    // The caches kept on purpose are filled before the first round, each by what fills it: the painted look's own paint (a Block 2 has no model, so this package's steel and tiles are drawn) is one of them.
    // Which frame first drew it used to depend on whether a model had arrived by then, so the reading of the first round moved with timing.
    await pressAndDraw(page, "look-painted");
    await pressAndDraw(page, "variant-v2");
    await pressAndDraw(page, "variant-v3");
    await pressAndDraw(page, "look-line");
    // the first round fills the rest; each round ends where it began. A second round is played before anything is read: on a slow runner the Earth's last pictures come in after the first round (20 textures read with the Earth on, where 24 are held
    // from then on, and 24 again at round 50), so a first reading is a baseline only once they are in. A leak still shows, as growth from round 2 to the last.
    await round();
    await round();
    await settle(page, 2500);
    const first = await usage(page);
    const firstOn = withEarth;
    const firstHeap = await heapMB();
    const firstMB = processMB();
    log.push(`after round 2: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}, framebuffers ${first.framebuffers}, heap ${firstHeap} MB, process ${firstMB} MB`);
    for (let index = 2; index < ROUNDS; index++) {
      await round();
      if ((index + 1) % 10 === 0) log.push(`after round ${index + 1}: heap ${await heapMB()} MB, process ${processMB()} MB, contexts ${(await usage(page)).contexts}`);
    }
    await settle(page, 2500);
    const last = await usage(page);
    const lastHeap = await heapMB();
    const lastMB = processMB();
    log.push(`with the Earth on, round 2 then round ${ROUNDS}: buffers ${firstOn.buffers} ${withEarth.buffers}, textures ${firstOn.textures} ${withEarth.textures}, programs ${firstOn.programs} ${withEarth.programs}, contexts ${firstOn.contexts} ${withEarth.contexts}`);
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

// ------------------------------------------------------------- all of it at once: every rocket, lit, with the Earth behind
const everyPicture = (page: Page) => expect.poll(() => earth(page).evaluate((node) => Object.values((node.querySelector("chikyu-earth-realistic") as unknown as { stats: { tiers: Record<string, number> } }).stats.tiers).every((width) => width === 2048)), { timeout: 90_000 }).toBe(true);

// The whole product would be 44 variants by three looks, Earth or none, lit or dark, and together, apart and each part: thousands of views, days in software. What is walked is the corners that ask the most: every variant
// dark with no Earth in line and painted (above), and every variant lit with the Earth behind in line and painted (here), each walked twice. Thick has the line look's shapes and one more line width, and is walked in its own
// tests; apart and each part alone are the rounds of the engines' and the changes' tests.
test("every variant of every rocket lit, with the Earth behind: line and painted, each with its own flames, and contexts and graphics memory stay flat as they are walked again", async ({ page }) => {
  test.setTimeout(60 * 60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${URL}?background=earth`);
  await pause(page);
  await reach3d(page);
  await press(page, "engines-on");
  // `data-variant` and `data-state` are set before a variant is built and drawn, and `data-state` stays "3d" through a change: the element says `uchusen-change` once the rocket and variant on screen are in. A slow runner read 12 buffers where 111 are made once
  // the last variant's first frame is in, so each step waits for it (as the fleet kit's walk above does).
  await hero(page).evaluate((node) =>
    node.addEventListener("uchusen-change", (event) => {
      const variant = (event as CustomEvent<{ report: { variant?: { rocket: string; id: string } } }>).detail.report.variant;
      (window as unknown as { __in: string }).__in = `${variant?.rocket}/${variant?.id}`;
    }),
  );
  const walk = async (look: "line" | "painted") => {
    await press(page, `look-${look}`);
    await expect(earth(page)).toHaveAttribute("data-form", look === "line" ? "line" : "realistic", { timeout: 60_000 });
    for (const rocket of Object.values(ROCKETS).filter(real))
      for (const variant of rocket.variants) {
        const named = `${rocket.id} ${variant.id} ${look}`;
        await press(page, `rocket-${rocket.id}`);
        await press(page, `variant-${variant.id}`);
        await expect(hero(page), named).toHaveAttribute("rocket", rocket.id);
        await expect(hero(page), named).toHaveAttribute("data-variant", variant.id);
        await expect(hero(page), named).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
        if (look === "painted") await expect(hero(page), named).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
        await expect.poll(() => page.evaluate(() => (window as unknown as { __in?: string }).__in), { message: named, timeout: 90_000 }).toBe(`${rocket.id}/${variant.id}`);
        // the flames the package says it has, and none where no source tells of an engine
        const flames = String(build({ rocket: rocket.id, variant: variant.id }).flamesOf("together").length);
        await expect.poll(() => canvasData(page, "plumes"), { message: named, timeout: 30_000 }).toBe(flames);
        await settle(page, 120);
      }
  };
  // The camera eases after a ship is in. A reading during that move, or before the first frame has uploaded the ship, counts only what is already on the card.
  const atRest = async () => {
    await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.moving ?? "false"), { timeout: 30_000 }).not.toBe("true");
    await settle(page, 80);
  };
  await walk("line");
  expect((await usage(page)).contexts).toBe(1);
  await walk("painted");
  await expect(earth(page).locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "live", { timeout: 90_000 });
  await everyPicture(page);
  await atRest();
  const first = await usage(page);
  expect(first.contexts).toBe(2);
  await walk("line");
  await walk("painted");
  await expect(earth(page).locator("chikyu-earth-realistic")).toHaveAttribute("data-state", "live", { timeout: 90_000 });
  await everyPicture(page);
  await atRest();
  const last = await usage(page);
  console.log(`every variant lit with the Earth, first and second walk: buffers ${first.buffers} ${last.buffers}, arrays ${first.arrays} ${last.arrays}, textures ${first.textures} ${last.textures}, programs ${first.programs} ${last.programs}`);
  expect(last.contexts).toBe(2);
  expect(last.buffers).toBeLessThanOrEqual(first.buffers);
  expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  expect(last.textures).toBeLessThanOrEqual(first.textures);
  expect(last.programs).toBeLessThanOrEqual(first.programs);
  // still one draw a frame for the rocket and one request each with all of it behind it
  await hero(page).evaluate((node) => {
    (node as HTMLElement & { drive(choice: null): void }).drive(null);
    node.setAttribute("spin", "fast");
  });
  await settle(page, 1500);
  await page.evaluate(() => ((window as unknown as { __seen: Seen }).__seen.mostInAFrame = 0));
  const { drew, frames } = await measure(page);
  expect(drew).toBeGreaterThan(0);
  expect(drew).toBeLessThanOrEqual(frames + 3);
  expect((await usage(page)).mostInAFrame).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

for (const { look, form, contexts } of LOOKS.filter((one) => one.look !== "thick")) {
  test(`lit, with the Earth behind ${look}: out of sight and on a hidden tab nothing draws and no frame is asked for, and both come back`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`${URL}?background=earth`);
    await pause(page);
    await reach3d(page);
    await earthIn(page, look, form);
    await press(page, "panel-look");
    await press(page, "engines-on");
    await expect.poll(() => canvasData(page, "plumes")).toBe("33");
    expect((await usage(page)).contexts).toBe(contexts);
    await hero(page).evaluate((node) => {
      (node as HTMLElement & { drive(choice: null): void }).drive(null);
      node.setAttribute("spin", "fast");
    });
    const quiet = async () => {
      await expect(earth(page)).toHaveAttribute("data-turning", "false");
      await settle(page, 2000);
      const before = { earth: await earthDraws(page), rocket: await drawn(page), usage: await usage(page) };
      await settle(page, 2500);
      expect(await earthDraws(page)).toBe(before.earth);
      expect(await drawn(page)).toBe(before.rocket);
      const after = await usage(page);
      noFrameAskedSince(before.usage, after);
      expect(after.asked - before.usage.asked).toBeLessThanOrEqual(1);
    };
    const back = async () => {
      await expect(earth(page)).toHaveAttribute("data-turning", "true");
      const mark = { earth: await earthDraws(page), rocket: await drawn(page) };
      await expect.poll(() => earthDraws(page), { timeout: 30_000 }).toBeGreaterThan(mark.earth);
      await expect.poll(() => drawn(page), { timeout: 30_000 }).toBeGreaterThan(mark.rocket);
      expect(await canvasData(page, "plumes")).toBe("33");
    };
    await hideTab(page, true);
    await quiet();
    await hideTab(page, false);
    await back();
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "6000px";
      document.body.append(spacer);
      window.scrollTo(0, 5000);
    });
    await quiet();
    await page.evaluate(() => window.scrollTo(0, 0));
    await back();
  });
}

test("the Earth on the page and the embed page: what is copied carries the lit rocket and not the Earth, says so, and the link opens with no error", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${URL}?background=earth#embed`);
  await pause(page);
  // the address opens at the section, so the view may be out of sight, and then it rightly stays a picture
  await page.evaluate(() => window.scrollTo(0, 0));
  await reach3d(page);
  await expect(earth(page)).toHaveAttribute("data-form", "line", { timeout: 60_000 });
  await expect(page.locator("#embed")).toBeVisible();
  await press(page, "engines-on");
  await page.locator("#embed-panel").scrollIntoViewIfNeeded();
  await expect(page.locator('#embed-panel [part="note"]')).toContainText("The Earth behind it stays on this page");
  const open = page.locator('#embed-panel [part="open"]');
  await expect(open).toHaveAttribute("href", /engines=on/);
  expect(await open.getAttribute("href")).not.toContain("background");
  await expect(page.locator('#embed-panel [part="code"]')).not.toContainText(/earth/i);
  const address = (await open.getAttribute("href")) as string;
  await page.goto(`${URL}${address}`);
  const rocket = page.locator('[data-testid="rocket"]');
  await expect(rocket).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(() => rocket.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.plumes)).toBe("33");
  expect(errors).toEqual([]);
});

test("the embed page given background=earth draws the lit rocket, loads nothing of the Earth, holds one context, and stands still out of sight", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  const addresses: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => addresses.push(response.url()));
  const lit = `${URL}embed.html?rocket=saturn-v&variant=saturn-v&look=painted&engines=on&background=earth`;
  await page.goto(lit);
  const rocket = page.locator('[data-testid="rocket"]');
  await expect(rocket).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(() => rocket.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.plumes)).toBe("5");
  expect(addresses.filter((address) => /textures\//.test(address))).toEqual([]);
  expect((await usage(page)).contexts).toBe(1);
  expect(errors).toEqual([]);
  // inside a page that scrolls it away
  await page.goto(`${URL}react-check.html`);
  await page.evaluate((src) => {
    document.documentElement.innerHTML = "<body></body>";
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.style.cssText = "width:480px;height:640px;border:0;display:block";
    frame.dataset.testid = "embed";
    const spacer = document.createElement("div");
    spacer.style.height = "6000px";
    document.body.append(frame, spacer);
  }, lit);
  const inner = page.frameLocator('[data-testid="embed"]').locator('[data-testid="rocket"]');
  await expect(inner).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  const count = () => inner.evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));
  await expect.poll(count, { timeout: 30_000 }).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 5000));
  await settle(page, 1200);
  const from = await count();
  await settle(page, 1500);
  expect(await count()).toBe(from);
});
