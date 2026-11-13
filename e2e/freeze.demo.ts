// The demo must never ask a lot of the machine. Played in headless Chromium with the controls turning it, these fail on a draw loop that runs when nothing moves or more than once a frame, on WebGL contexts or
// graphics memory (buffers, vertex arrays, textures) that grow with each change, on a canvas past its pixel budget at any zoom on a 5K screen, and on a lost context that is not let go. With the Earth behind the rocket they
// also fail on more than one frame request for it per page frame, on drawing it faster than its own low rate, on anything drawn out of sight or on a hidden tab, on its context or pictures kept after it is turned off, and on growth over 50 rounds of changes.
import { execSync } from "node:child_process";
import { chromium, expect as plainExpect, type Locator, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";
import { ROCKETS } from "../src/rockets.ts";
import { isListed } from "../demo/listed.ts";
import { foldPicker } from "./picker.ts";

// these draw in software, and a page building a painted material can be busy for many seconds
const expect = plainExpect.configure({ timeout: 30_000 });
const URL = "/uchusen-rockets/";
/** The walks of every variant leave the fleet to its own walk (below): it holds more than seventy, each far bigger than a rocket. */
const real = (rocket: { id: string }) => !rocket.id.startsWith("fleet-");
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
/** A rocket's button shows under its maker's, so its maker comes first. The fleet kit's boxes of parts are not listed, and are pressed without being seen. */
// The resource walks exercise each control handler and every resulting WebGL draw.
// Pointer actionability is checked by the interaction suite, rather than repeated
// thousands of times in the resource stress loop.
const resourceDriver = new WeakSet<Page>();
const activate = async (page: Page, button: Locator): Promise<void> => {
  if (!resourceDriver.has(page)) return button.click();
  await button.evaluate((node) => {
    const style = getComputedStyle(node);
    if (!(node instanceof HTMLButtonElement) || node.disabled || !node.isConnected || node.getClientRects().length === 0 || style.visibility === "hidden" || style.pointerEvents === "none") throw new Error("the resource control is not available");
    node.click();
  });
};
const press = async (page: Page, id: string) => {
  if (!resourceDriver.has(page)) await foldPicker(page);
  const rocket = /^rocket-(.+)$/.exec(id)?.[1];
  if (rocket) await activate(page, page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`));
  const button = page.locator(`[data-testid="${id}"]`);
  if (rocket && !isListed(rocket)) await button.dispatchEvent("click");
  else await activate(page, button);
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
  const change = async () => {
    if (!resourceDriver.has(page)) await foldPicker(page);
    await hero(page).evaluate((node, options) => {
      const frames = () => Number(node.shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0);
      const state = window as unknown as { __change: Promise<number>; __draw: Promise<number> };
      state.__change = new Promise((done) => {
        const changed = (mark: number) => {
          if (options.drawEvent) {
            state.__draw = new Promise((resolve) => {
              const drew = () => {
                const frame = frames();
                if (frame <= mark) return;
                node.removeEventListener("uchusen-draw", drew);
                resolve(frame);
              };
              node.addEventListener("uchusen-draw", drew);
            });
          }
          done(mark);
        };
        if (options.whole) node.addEventListener("uchusen-change", () => changed(frames()), { once: true });
        else {
          const watching = new MutationObserver(() => {
            watching.disconnect();
            changed(frames());
          });
          watching.observe(node, { attributes: true, attributeFilter: ["look", "show", "view", "engines"] });
        }
      });
    }, { whole: /^(rocket|variant)-/.test(id), drawEvent: resourceDriver.has(page) });
    await press(page, id);
    const mark = await page.evaluate(() => (window as unknown as { __change: Promise<number> }).__change);
    if (resourceDriver.has(page)) {
      const frame = await page.evaluate(() => (window as unknown as { __draw: Promise<number> }).__draw);
      expect(frame).toBeGreaterThan(mark);
    } else {
      await expect.poll(() => drawn(page), { timeout: 60_000 }).toBeGreaterThan(mark);
    }
  };
  if (resourceDriver.has(page)) await test.step(`draw ${id}`, change, { timeout: 60_000 });
  else await change();
};

const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
// Only the memory stress case advances resource-grace timers. Rate and visibility
// checks keep real time, and every resource count still comes from actual WebGL.
const memoryClock = new WeakSet<Page>();
const settle = (page: Page, ms: number) => memoryClock.has(page) ? page.clock.fastForward(ms) : page.waitForTimeout(ms);
/**
 * A reading once the GPU objects have stopped moving: four readings a second apart agree, arrays included, so the two seconds a left-behind craft is kept (clearGhost) are inside the wait. The pictures the renderer is still giving back after their short linger are not kept ones, and a slow runner reads them
 * mid-way (24 textures where the first round read 21); a leak never settles lower than it began, and is still caught by the comparison.
 */
const levelUsage = async (page: Page) => {
  let before = await usage(page);
  let still = 0;
  for (let tries = 0; tries < 20; tries++) {
    await settle(page, 1000);
    const now = await usage(page);
    still = now.textures === before.textures && now.buffers === before.buffers && now.arrays === before.arrays && now.programs === before.programs && now.framebuffers === before.framebuffers ? still + 1 : 0;
    if (still === 3) return now;
    before = now;
  }
  return before;
};
/** Draws and page frames over a stretch long enough for `frames` of the page's own: a slow machine (software WebGL on a runner) has few in a second. `begun` is a count taken in the same turn as the spin was asked for, so the first long frame is one of the twelve. */
const measure = async (page: Page, frames = 12, begun?: { drawn: number; page: number }) => {
  const start = begun ?? { drawn: await drawn(page), page: (await usage(page)).pageFrames };
  await expect.poll(async () => (await usage(page)).pageFrames - start.page, { timeout: 90_000 }).toBeGreaterThanOrEqual(frames);
  const end = { drawn: await drawn(page), page: (await usage(page)).pageFrames };
  return { drew: end.drawn - start.drawn, frames: end.page - start.page };
};


test("these tests draw in software, never on this machine's graphics card", async ({ page }) => {
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
  await page.goto(URL);
  await reach3d(page);
  const { drew, frames } = await measure(page);
  expect(drew).toBeGreaterThan(0);
  expect(drew).toBeLessThanOrEqual(frames + 3);
});

test("a view out of sight draws nothing and redraws nothing, even while the controls keep turning", async ({ page }) => {
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
  const first = await levelUsage(page);
  await walk("line");
  await walk("painted");
  const last = await levelUsage(page);
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

// The kept caches settle a few vertex arrays apart from one walk to the next (641, 647, 647 on a hosted runner; 2503, 2503, 2525 for the tanks and the Ariake). Buffers and textures are read exactly. A leak adds some for every variant walked, hundreds in a walk.
const arraysSlack = (arrays: number) => Math.max(16, Math.ceil(arrays * 0.02));
// Seconds a walk of each fleet ship took on a hosted runner, so CI's parts are the same size: the parts are filled heaviest first. A ship left out counts for ten.
const FLEET_SECONDS: Record<string, number> = { "fleet-02-original": 88, "fleet-02": 69, "fleet-ship-ariake": 60, "fleet-kyotori": 40, "fleet-ship-01": 39, "fleet-ship-03": 37, "fleet-tanks": 34, "fleet-emiake": 18, "fleet-insets-ship-03": 14, "fleet-insets": 14, "fleet-samples": 12, "fleet-labs": 10, "fleet-markings": 10, "fleet-engines": 10, "fleet-decks": 8, "fleet-romaryu": 7, "fleet-systems": 6, "fleet-habitats": 5, "fleet-cargo": 5, "fleet-structure": 3, "fleet-kaminari": 2, "fleet-drone": 2, "fleet-insets-ship-01": 1 };

// The walk is split into parts of about the same time each, every ship in one of them. CI runs one part a job (FLEET_PART="2/5"); with none set, as on a Mac, each part is a test of its own, so one test is about a fifth of the walk's time
// and a busy machine has the limit's margin back (the whole walk in one test took 40 minutes against its 45, MODULES-1288). Every assertion is the same for the ships of its part.
const FLEET_PARTS: [number, number][] = process.env.FLEET_PART ? [process.env.FLEET_PART.split("/").map(Number) as [number, number]] : Array.from({ length: 5 }, (_, i) => [i + 1, 5]);
for (const [part, parts] of FLEET_PARTS) {
  test(`the fleet kit, part ${part} of ${parts}: every module and the sample ship drawn painted, then contexts and graphics memory stay flat as they are walked again, and it still draws once a frame`, async ({ page }) => {
    await page.addInitScript(COUNT);
    test.setTimeout(45 * 60_000);
    await page.goto(URL);
    await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
    await reach3d(page);
    await press(page, "look-painted");
    const whole = Object.values(ROCKETS).filter((rocket) => !real(rocket));
    expect(whole.length).toBeGreaterThan(5);
    const loads = Array.from({ length: parts }, () => 0);
    const mine = new Set<string>();
    for (const rocket of [...whole].sort((a, b) => (FLEET_SECONDS[b.id] ?? 10) - (FLEET_SECONDS[a.id] ?? 10) || a.id.localeCompare(b.id))) {
      const to = loads.indexOf(Math.min(...loads));
      loads[to] += FLEET_SECONDS[rocket.id] ?? 10;
      if (to === part - 1) mine.add(rocket.id);
    }
    const fleet = whole.filter((rocket) => mine.has(rocket.id));
    expect(fleet.length).toBeGreaterThan(0);
    // The element says `uchusen-change` when the rocket and variant on screen are in. `data-variant` and `data-state` are set before that and `data-state` stays "3d" through a change, so they do not tell a reading that the
    // choice is drawn: a slow runner read 4 buffers where 1395 are made once the last variant's first frame is in.
    await hero(page).evaluate((node) =>
      node.addEventListener("uchusen-change", (event) => {
        const variant = (event as CustomEvent<{ report: { variant?: { rocket: string; id: string } } }>).detail.report.variant;
        const state = window as unknown as { __in: string; __inFrame: number };
        state.__in = `${variant?.rocket}/${variant?.id}`;
        state.__inFrame = Number(node.shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0);
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
          const frame = await page.evaluate(() => (window as unknown as { __inFrame: number }).__inFrame);
          await expect.poll(() => drawn(page), { timeout: 90_000 }).toBeGreaterThan(frame);
          await settle(page, 80);
        }
        // seconds a ship took, said as each ends, so a walk that slows down (or stops) says which ship did it
        console.log(`fleet walk, ${rocket.id}: ${Math.round((Date.now() - began) / 1000)} s`);
      }
    };
    // Compare the same settled camera and detail level: a moving camera can expose more geometry after the first frame. A painted model still on its way, or fittings mid-fade, hold their counts still for seconds on a slow
    // runner (one walk read 410 vertex arrays where the others read about 1000), so the count waits for both.
    const settledView = async () => {
      // The camera's ease to a new craft is 800 ms, and each frame moves it on by 40 ms at most, so a hitch while the next craft is built does not skip it (scene.ts, startPose with
      // `capped`): it ends after 20 drawn frames, whatever the clock says. A frame of the heaviest fleet ships takes 2 to 4 s on a runner drawing in software, so those 20 frames can take
      // over a minute there (30 s ran out on CI). The wait is for those frames: up to 180 s, and the number of frames it took is logged.
      const framesAt = Number(await canvasData(page, "frames"));
      await expect.poll(() => canvasData(page, "moving"), { timeout: 180_000 }).toBe("false");
      console.log(`fleet walk: the camera settled after ${Number(await canvasData(page, "frames")) - framesAt} frames`);
      await expect.poll(() => canvasData(page, "painted"), { timeout: 90_000 }).not.toBe("loading");
      await expect.poll(() => canvasData(page, "lod"), { timeout: 30_000 }).not.toBe("fade");
      return { detail: await hero(page).getAttribute("data-detail"), distance: await canvasData(page, "distance"), painted: await canvasData(page, "painted"), lod: await canvasData(page, "lod") };
    };
    await walk(1);
    const firstView = await settledView();
    const first = await levelUsage(page);
    console.log("fleet view 1", firstView);
    console.log(`fleet walk 1: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}`);
    // the opened ones and the apart view too: the shapes that are only built when chosen
    await press(page, "rocket-fleet-samples");
    await press(page, "show-apart");
    await settle(page, 600);
    await press(page, "show-together");
    await walk(1);
    const lastView = await settledView();
    const second = await levelUsage(page);
    console.log("fleet view 2", lastView);
    expect(lastView.detail).toBe(firstView.detail);
    console.log(`fleet walk 2: buffers ${second.buffers}, arrays ${second.arrays}, textures ${second.textures}, programs ${second.programs}`);
    // the first walk reads the caches still filling (15 more vertex arrays after it on a slow runner), so growth is read from the second walk to a third
    await walk(1);
    let last = await levelUsage(page);
    console.log(`fleet walk 3: buffers ${last.buffers}, arrays ${last.arrays}, textures ${last.textures}, programs ${last.programs}`);
    // The kept caches end a walk in one of two states, and the test does not choose which. The shadow pass and the fittings of a fleet ship are drawn only while it is big on screen, and a small one does not draw them
    // (scene.ts, applyFittingLod). A walk whose last ship was never drawn big read 1238 buffers and 410 arrays, and one whose last ship was read 1400 and 1006, for the same ships: one CI run read 1238, 1238, 1400, 1383 over
    // four walks and another 1400, 1400, 1382. So a walk is not held to an earlier one that may be in the other state. A leak keeps rising from walk to walk, hundreds of buffers for each, so when the third walk reads
    // above the first two one more walk is taken and it must not rise from the third. When the third does not read above them, it is held to the first two as before.
    // A vertex array is three.js's record of one geometry drawn with one program, made on the first draw and kept while the geometry lives; how many there are follows what the last frames drew. The textures hold memory and stay held to the second walk exactly.
    const arraysFloor = Math.max(first.arrays, second.arrays);
    const buffersFloor = Math.max(first.buffers, second.buffers);
    const third = last;
    if (last.arrays > arraysFloor + arraysSlack(arraysFloor) || last.buffers > buffersFloor || last.textures > second.textures) {
      await walk(1);
      last = await levelUsage(page);
      console.log(`fleet walk 4: buffers ${last.buffers}, arrays ${last.arrays}, textures ${last.textures}, programs ${last.programs}`);
      expect(last.buffers).toBeLessThanOrEqual(third.buffers);
      expect(last.arrays).toBeLessThanOrEqual(third.arrays + arraysSlack(third.arrays));
      expect(Math.min(third.textures, last.textures)).toBeLessThanOrEqual(second.textures);
    } else {
      expect(last.buffers).toBeLessThanOrEqual(buffersFloor);
      expect(last.arrays).toBeLessThanOrEqual(arraysFloor + arraysSlack(arraysFloor));
      expect(last.textures).toBeLessThanOrEqual(second.textures);
    }
    expect(last.contexts).toBe(1);
    // The ship left on screen can spend several seconds inside one frame. A count taken after play() waits that frame out, so the frame has already been counted and the next ninety seconds hold eleven where twelve fit.
    const begun = await page.evaluate(() => {
      const seen = (window as unknown as { __seen: { frames: number } }).__seen.frames;
      const canvas = document.querySelector('[data-testid="hero"]')?.shadowRoot?.querySelector("canvas");
      const drawnNow = Number(canvas?.getAttribute("data-frames") ?? 0);
      (document.querySelector('[data-testid="view-bar"]') as HTMLElement & { play(): void }).play();
      return { drawn: drawnNow, page: seen };
    });
    const { drew, frames } = await measure(page, 12, begun);
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
}

test("a scene with many objects draws few things a frame, and its graphics memory stays flat over repeated switching", async ({ page }) => {
  await page.addInitScript(COUNT);
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
    // software drawing on a runner can take longer than a fixed wait to finish one frame of a city
    await expect.poll(async () => (await drawn(page)) - drewBefore, { timeout: 90_000 }).toBeGreaterThan(0);
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
  const first = await levelUsage(page);
  for (let round = 0; round < 3; round++) for (const scene of scenes) await go(scene);
  const last = await levelUsage(page);
  console.log(`after three more rounds: buffers ${first.buffers} to ${last.buffers}, arrays ${first.arrays} to ${last.arrays}, textures ${first.textures} to ${last.textures}`);
  expect(last.contexts).toBe(1);
  expect(last.buffers).toBeLessThanOrEqual(first.buffers);
  expect(last.arrays).toBeLessThanOrEqual(first.arrays);
  expect(last.textures).toBeLessThanOrEqual(first.textures);
});

test("a lost context is let go, the drawing takes over, and nothing keeps drawing", async ({ page }) => {
  await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    const last = await levelUsage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
    expect(last.framebuffers).toBeLessThanOrEqual(first.framebuffers);
  });

  test("changing rocket with the engines lit gives back the flames of the old one", async ({ page }) => {
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    // one fast round as well: a few buffers are made on the frame after a step, and a run that left the flight first read 244 where every other run reads 247 before and after the forty. One fast round was not always enough: a slow run still read 244, then 247 after the forty, so a second round is taken before the count.
    await round();
    await round();
    await settle(page, 500);
    const first = await levelUsage(page);
    for (let i = 0; i < 40; i++) await round();
    await settle(page, 300);
    const last = await levelUsage(page);
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
  });

  test("grid fins, legs and flaps turn in a flight, and forty rounds of it make nothing on the graphics card and draw nothing extra", async ({ page }) => {
    await page.addInitScript(COUNT);
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
      // the pad's smoke (one instanced draw: its corners, their order and the puffs' places, three buffers, kept for the flight) reaches the card a frame or two after the first draw at
      // ignition; a slow run moved on before it did and first read 210 where the forty rounds, which do make it, end at 213. Held there until the count stands still, every run reads 213.
      if (at === 0) await levelUsage(page);
    }
    await leave();
    // at rest: the camera's glide over and the left-behind craft cleared (kept two seconds), then the count holds still
    const atRest = async () => {
      await expect.poll(() => canvasData(page, "moving"), { timeout: 30_000 }).not.toBe("true");
      await expect.poll(() => canvasData(page, "ghost"), { timeout: 30_000 }).not.toBe("on");
      await settle(page, 500);
      return levelUsage(page);
    };
    const first = await atRest();
    await expectIdle(page);
    const mark = await drawn(page);
    for (let i = 0; i < 40; i++) await round();
    await settle(page, 300);
    const last = await atRest();
    expect(last.contexts).toBe(1);
    expect(last.buffers).toBeLessThanOrEqual(first.buffers);
    expect(last.arrays).toBeLessThanOrEqual(first.arrays + 6);
    expect(last.textures).toBeLessThanOrEqual(first.textures);
    expect(last.programs).toBeLessThanOrEqual(first.programs);
    // 40 rounds of 7 steps and a leave: a draw for each at most (one a frame), not a loop
    expect((await drawn(page)) - mark).toBeLessThanOrEqual(40 * 9 + 20);
    await expectIdle(page);
  });

  test("changing variant in the middle of a flight ends it and gives back its flames", async ({ page }) => {
    await page.addInitScript(COUNT);
    test.setTimeout(240_000);
    // A new variant is first drawn in this package's own paint, and its licensed model comes in after: when the model is already in by that first frame the paint is never drawn or uploaded, so a round reads
    // 180 buffers fewer than when it is not, and which it is depends on how busy the machine is (a reading of 56 in the first rounds, 236 in a later one under load). The models are held back until the new
    // variant's first frame is drawn, so every round takes the same way and reads the same.
    let release = () => {};
    let held: Promise<void> | null = null;
    await page.route("**/models/*.glb", async (route) => {
      if (held) await held;
      await route.continue();
    });
    await page.goto(URL);
    await pause(page);
    await reach3d(page);
    const round = async () => {
      held = new Promise<void>((done) => (release = done));
      await rocket(page).evaluate((node) => (node as HTMLElement & { seek(p: number): void }).seek(5));
      await expect.poll(() => canvasData(page, "phase")).toBe("boostback");
      await press(page, "variant-v2");
      await expect.poll(async () => (await state(page)).active).toBe(false);
      await expect.poll(() => canvasData(page, "plumes")).toBe("0");
      await pressAndDraw(page, "variant-v3");
      release();
      held = null;
      await expect.poll(() => rocket(page).getAttribute("data-flight")).toBe("starship-flight-12");
      await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
      await settle(page, 200);
    };
    // Each reading waits for the release it measures: `levelUsage` reads again until the counts have held still for three seconds, so a flame still on its way out (or a model still arriving) under load is not counted.
    // The baseline is this test's own, taken here from the first two rounds, and nothing outside the test (an earlier test of a whole run, a fixed number) can move it.
    const peak = { buffers: 0, arrays: 0 };
    for (let i = 0; i < 2; i++) {
      await round();
      const now = await levelUsage(page);
      peak.buffers = Math.max(peak.buffers, now.buffers);
      peak.arrays = Math.max(peak.arrays, now.arrays);
    }
    for (let i = 0; i < 4; i++) {
      await round();
      const now = await levelUsage(page);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
  await page.goto(URL);
  expect(await rendererName(page)).toMatch(/swiftshader/i);
});

test("the Earth costs nothing until it is chosen: not a byte of its code, no picture, no timer, no extra context", async ({ page }) => {
  await page.addInitScript(COUNT);
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
  // the page is at rest before the window opens: no frame has been asked for between two readings half a second apart (the hero's last draw after it reached 3D may come a moment after the fixed settle on a busy machine)
  let askedBefore = -1;
  await expect
    .poll(
      async () => {
        const now = (await usage(page)).asked;
        const same = now === askedBefore;
        askedBefore = now;
        return same;
      },
      { intervals: [500], timeout: 30_000, message: "the page never stopped asking for frames" },
    )
    .toBe(true);
  const before = await usage(page);
  await settle(page, 1500);
  // by the page's own count of frames asked for and run, not by the clock: a frame asked for before the window opened may still run in it on a busy machine (MODULES-1181 saw one, with the Earth off, in a
  // run under load), and passes; a frame asked for after it opened, a real stray draw, fails
  noFrameAskedSince(before, await usage(page));

  // and only the form asked for comes in: the line globe needs no picture
  await earthIn(page, "line", "line");
  expect(addresses.filter((address) => /textures\//.test(address))).toEqual([]);
  expect((await usage(page)).contexts).toBe(1);
});

for (const { look, form, contexts } of LOOKS) {
  test.describe(`with the Earth behind ${look}`, () => {
    test("at its own low rate and nothing else while the rocket is still, and one frame request each per page frame with no growth while it spins", async ({ page }) => {
      await page.addInitScript(COUNT);
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
      await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
  await page.addInitScript(COUNT);
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
      await page.addInitScript(COUNT);
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
    let browser: Awaited<ReturnType<typeof chromium.connect>> | undefined;
    try {
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
      browser = await chromium.connect(server.wsEndpoint());
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", baseURL: test.info().project.use.baseURL });
      await page.clock.install();
      memoryClock.add(page);
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
      await foldPicker(page);
      resourceDriver.add(page);
      console.log("stress turn before pause", await bar(page).evaluate((node) => (node as HTMLElement & { state: unknown }).state));
      await pause(page);
      const startMB = processMB();
      const startHeap = await heapMB();
      const offNow = async () => {
        await press(page, "panel-background");
        await press(page, "background-none");
        await expect(earth(page)).toBeHidden();
        await expect(earth(page).locator("*")).toHaveCount(0);
        // the shared renderer lets the context go a second after the last element, and pictures after their short linger
        await page.clock.fastForward(1000);
        await expect.poll(async () => (await usage(page)).contexts, { timeout: 15_000 }).toBe(1);
      };
      let withEarth = await usage(page);
      const round = async () => {
        await foldPicker(page);
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
      const record = (line: string): void => { log.push(line); console.log(line); };
      // The caches kept on purpose are filled before the first round, each by what fills it: the painted look's own paint (a Block 2 has no model, so this package's steel and tiles are drawn) is one of them.
      // Which frame first drew it used to depend on whether a model had arrived by then, so the reading of the first round moved with timing.
      // Start from a different look: selecting the already-painted look correctly draws nothing.
      await pressAndDraw(page, "look-line");
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
      record(`after round 2: buffers ${first.buffers}, arrays ${first.arrays}, textures ${first.textures}, programs ${first.programs}, framebuffers ${first.framebuffers}, heap ${firstHeap} MB, process ${firstMB} MB`);
      for (let index = 2; index < ROUNDS; index++) {
        await round();
        if ((index + 1) % 10 === 0) record(`after round ${index + 1}: heap ${await heapMB()} MB, process ${processMB()} MB, contexts ${(await usage(page)).contexts}`);
      }
      await settle(page, 2500);
      const last = await usage(page);
      const lastHeap = await heapMB();
      const lastMB = processMB();
      record(`with the Earth on, round 2 then round ${ROUNDS}: buffers ${firstOn.buffers} ${withEarth.buffers}, textures ${firstOn.textures} ${withEarth.textures}, programs ${firstOn.programs} ${withEarth.programs}, contexts ${firstOn.contexts} ${withEarth.contexts}`);
      record(`at the start: heap ${startHeap} MB, process ${startMB} MB`);
      record(`after round ${ROUNDS}: buffers ${last.buffers}, arrays ${last.arrays}, textures ${last.textures}, programs ${last.programs}, framebuffers ${last.framebuffers}, heap ${lastHeap} MB, process ${lastMB} MB`);
      console.log(log.join("\n"));
      await test.info().attach("rounds", { body: log.join("\n") });
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
    } finally {
      await browser?.close();
      await server.close();
    }
  });
});

// ------------------------------------------------------------- all of it at once: every rocket, lit, with the Earth behind
const everyPicture = (page: Page) => expect.poll(() => earth(page).evaluate((node) => Object.values((node.querySelector("chikyu-earth-realistic") as unknown as { stats: { tiers: Record<string, number> } }).stats.tiers).every((width) => width === 2048)), { timeout: 90_000 }).toBe(true);

// The whole product would be 44 variants by three looks, Earth or none, lit or dark, and together, apart and each part: thousands of views, days in software. What is walked is the corners that ask the most: every variant
// dark with no Earth in line and painted (above), and every variant lit with the Earth behind in line and painted (here), each walked twice. Thick has the line look's shapes and one more line width, and is walked in its own
// tests; apart and each part alone are the rounds of the engines' and the changes' tests.
test("every variant of every rocket lit, with the Earth behind: line and painted, each with its own flames, and contexts and graphics memory stay flat as they are walked again", async ({ page }) => {
  await page.addInitScript(COUNT);
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
    await page.addInitScript(COUNT);
    test.setTimeout(240_000);
    // Start in the named look; the separate transition checks cover renderer release.
    await page.goto(`${URL}?background=earth&look=${look}`);
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
  await page.addInitScript(COUNT);
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${URL}?background=earth&look=line#embed`);
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
  await page.addInitScript(COUNT);
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

// ------------------------------------------------------------- the six pages that open moving (MODULES-818)
// Journey, yard, compare, the fleet line-up, swarm and beam each open moving. Each is held to the family's rule: while it moves it draws at most 30 times a second and asks for one frame a scheduler, once it has stopped it draws
// nothing, out of sight and on a hidden tab it draws nothing, and the graphics card holds no more at the end than at the start. The pages that are not a WebGL view are counted by what they draw: WebGL draws and 2D canvas
// drawing (a frame's worth counts once) and, where a page moves an SVG, the batches of changes to what `watch` names.
const PACE = () => {
  const pace = { renders: 0, watched: 0, crowded: 0 };
  let limit = 1;
  let current: number | null = null;
  let last = "";
  let at = -1;
  let inFrame = 0;
  const mark = () => {
    const key = current === null ? `n${performance.now()}` : `f${current}`;
    if (key === last) return;
    last = key;
    pace.renders++;
  };
  const frame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    frame((time) => {
      if (time !== at) {
        at = time;
        inFrame = 0;
      }
      if (++inFrame === limit + 1) pace.crowded++;
      current = time;
      try {
        callback(time);
      } finally {
        // the changes this frame made are delivered to observers in a microtask after it, still in this frame; the next task is not
        setTimeout(() => {
          if (current === time) current = null;
        }, 0);
      }
    });
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[]) {
    for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const original = proto[name];
      if (!original) continue;
      proto[name] = function (this: unknown, ...args: unknown[]) {
        mark();
        // `cheap`: counted and not run, so a heavy scene's frames come at the display's pace and the page's own cap is what holds its rate
        return (window as unknown as { __cheap?: boolean }).__cheap ? undefined : original.apply(this, args);
      };
    }
  }
  for (const name of ["clearRect", "fillRect", "strokeRect", "drawImage", "fill", "stroke", "fillText"]) {
    const proto = CanvasRenderingContext2D.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    const original = proto[name];
    proto[name] = function (this: unknown, ...args: unknown[]) {
      mark();
      return original.apply(this, args);
    };
  }
  const watching = new MutationObserver(() => {
    pace.watched++;
    mark();
  });
  const watch = (selector: string) => {
    const node = document.querySelector(selector);
    if (!node) throw new Error(`nothing to watch at ${selector}`);
    const options = { attributes: true, characterData: true, childList: true, subtree: true };
    watching.observe(node, options);
    if (node.shadowRoot) watching.observe(node.shadowRoot, options);
  };
  Object.assign(window, { __pace: pace, __watch: watch, __forget: (most: number) => {
      pace.crowded = 0;
      limit = most;
    } });
};
type Pace = { renders: number; watched: number; crowded: number; now: number };
const paceOf = (page: Page) =>
  page.evaluate(() => {
    const pace = (window as unknown as { __pace: Pace }).__pace;
    return { renders: pace.renders, watched: pace.watched, crowded: pace.crowded, now: performance.now() };
  });
const watching = (page: Page, selector: string) => page.evaluate((one) => (window as unknown as { __watch(selector: string): void }).__watch(one), selector);
const forget = (page: Page, most: number) => page.evaluate((limit) => (window as unknown as { __forget(most: number): void }).__forget(limit), most);
/** A frame in which anything drew, or a watched thing changed, counts once. */
const movedOf = (pace: Pace) => pace.renders;
/** The page counted from before any script runs: what it asks of the graphics card, and what it draws. */
const counted = async (page: Page, { cheap = false } = {}) => {
  if (cheap) await page.addInitScript(() => Object.assign(window, { __cheap: true }));
  await page.addInitScript(COUNT);
  await page.addInitScript(PACE);
};
/**
 * While it moves: it draws, at most `ceiling` times a second, and asks for at most `schedulers` frames in a page frame: each loop that runs on its own (the page's, the view bar's where it turns the view, and the family help's, which coalesces its redraw of the titles to one a frame). The stretch is
 * `frames` page frames long, not a set time, and its length is read from the page's own clock, so a slow machine measures a longer stretch and not a different rate.
 */
const expectPaced = async (page: Page, { schedulers, ceiling = 30, frames = 120 }: { schedulers: number; ceiling?: number; frames?: number }) => {
  await forget(page, schedulers);
  const from = { usage: await usage(page), pace: await paceOf(page) };
  await expect.poll(async () => (await usage(page)).pageFrames - from.usage.pageFrames, { timeout: 120_000 }).toBeGreaterThanOrEqual(frames);
  const to = { usage: await usage(page), pace: await paceOf(page) };
  const seconds = (to.pace.now - from.pace.now) / 1000;
  const moved = movedOf(to.pace) - movedOf(from.pace);
  expect(moved, "it draws while it moves").toBeGreaterThan(0);
  expect(moved, `drawn ${moved} times in ${seconds.toFixed(1)} s`).toBeLessThanOrEqual(Math.ceil(ceiling * seconds) + 2);
  expect(to.usage.asked - from.usage.asked, "frames asked for").toBeLessThanOrEqual(schedulers * (to.usage.pageFrames - from.usage.pageFrames) + schedulers + 4);
  // a page that schedules twice crowds nearly every frame; a one-off (the page's own redraw of a label, a chunk loading) may crowd a few
  expect(to.pace.crowded, `frames that ran more than ${schedulers} callbacks`).toBeLessThanOrEqual(3);
};
/** Once it has stopped: whatever was already on its way is drawn, and then nothing is, and no frame is asked for. */
const expectStill = async (page: Page, { asked = 2 }: { asked?: number } = {}) => {
  await expect
    .poll(async () => {
      const mark = movedOf(await paceOf(page));
      await settle(page, 1000);
      return movedOf(await paceOf(page)) - mark;
    }, { timeout: 90_000 })
    .toBe(0);
  const from = { usage: await usage(page), pace: await paceOf(page) };
  await settle(page, 2500);
  const to = { usage: await usage(page), pace: await paceOf(page) };
  expect(movedOf(to.pace) - movedOf(from.pace), "drawn after it stopped").toBe(0);
  expect(to.usage.asked - from.usage.asked, "frames asked for after it stopped").toBeLessThanOrEqual(asked);
};
const scrollAway = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "8000px";
    document.body.append(spacer);
    window.scrollTo(0, 7000);
  });
/** Out of sight and on a hidden tab it draws nothing, and when it is back it moves again. */
const expectUnseen = async (page: Page, options: { asked?: number } = {}) => {
  const moving = async () => {
    const mark = movedOf(await paceOf(page));
    await expect.poll(async () => movedOf(await paceOf(page)), { timeout: 60_000 }).toBeGreaterThan(mark);
  };
  await moving();
  await scrollAway(page);
  await expectStill(page, options);
  await page.evaluate(() => window.scrollTo(0, 0));
  await moving();
  await hideTab(page, true);
  await expectStill(page, options);
  await hideTab(page, false);
  await moving();
};
/** Contexts and graphics objects at the end are no more than at the start. */
const expectFlat = (start: Usage, end: Usage) => {
  expect(end.contexts).toBeLessThanOrEqual(start.contexts);
  for (const kind of ["buffers", "arrays", "textures", "programs", "framebuffers"] as const) expect(end[kind], kind).toBeLessThanOrEqual(start[kind]);
};
/** The bar's own turn has ended (it takes `data-turning` off the bar), for the page given `autoplay-for` of a few seconds in place of its minute: the page's own setting, changed in the page's markup as it is served. */
const shortened = async (page: Page, file: string, seconds: number) => {
  await page.route(`**/${file}`, async (route) => {
    const response = await route.fetch();
    const text = await response.text();
    if (!text.includes('autoplay-for="60"')) throw new Error(`${file} no longer carries autoplay-for="60"`);
    await route.fulfill({ response, body: text.replace('autoplay-for="60"', `autoplay-for="${seconds}"`) });
  });
};

test.describe("the six pages that open moving", () => {
  test.use({ reducedMotion: "no-preference" });

  const JOURNEY = "/uchusen-rockets/journey.html?date=2026-11-04&look=line";
  const journeyPlaying = (page: Page) => expect(page.getByTestId("play")).toHaveAttribute("data-on", "");

  test("journey: the trip plays at most 30 draws a second from its one frame loop, then Pause and play=0 leave nothing drawn, and it is still out of sight and on a hidden tab", async ({ page }) => {
    test.setTimeout(240_000);
    await counted(page);
    await page.goto(JOURNEY);
    await foldPicker(page);
    await journeyPlaying(page);
    await watching(page, "#jr-picture");
    const start = await levelUsage(page);
    await expectPaced(page, { schedulers: 2 });
    await expectUnseen(page);
    await page.getByTestId("play").click();
    await expect(page.getByTestId("play")).not.toHaveAttribute("data-on");
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    // held in the address, it opens still, and nothing is drawn from the first frame
    await page.goto(`${JOURNEY}&play=0`);
    await foldPicker(page);
    await expect(page.getByTestId("play")).not.toHaveAttribute("data-on");
    await expectStill(page);
  });

  /** The bar's own turn, held by its Pause and let go by its Play, which turns for the page's `autoplay-for`. */
  const barPlay = (page: Page) => bar(page).evaluate((node) => (node as HTMLElement & { play(): void }).play());
  const turning = (page: Page) => expect(bar(page)).toHaveAttribute("data-turning", "", { timeout: 60_000 });
  const turned = (page: Page) => expect(bar(page)).not.toHaveAttribute("data-turning", "", { timeout: 90_000 });
  /** A page whose autoplay is cut to a few seconds in its markup: it ends by itself at load, draws nothing then, and the Play that follows ends the same way, with the graphics card holding no more than before. */
  const endsByItself = async (page: Page, file: string, ready: () => Promise<void>) => {
    await counted(page);
    await shortened(page, file, 3);
    await ready();
    await turned(page);
    await expectStill(page);
    await pause(page);
    const start = await levelUsage(page);
    await barPlay(page);
    await turning(page);
    await turned(page);
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
  };

  const YARD = "/uchusen-rockets/yard.html";
  const yardReady = async (page: Page) => {
    await page.goto(YARD);
    await expect(page.getByTestId("yard-stage")).toHaveAttribute("data-ready", "yes", { timeout: 90_000 });
  };

  test("yard: it turns at most 30 draws a second from the bar's loop and the page's one, and nothing is drawn out of sight or on a hidden tab", async ({ page }) => {
    test.setTimeout(300_000);
    // software WebGL draws the yard a few times a second, far under the cap: the draws are counted and not run, so frames come at the display's pace and the cap is what holds the rate
    await counted(page, { cheap: true });
    await yardReady(page);
    await turning(page);
    await expectPaced(page, { schedulers: 2 });
    await expectUnseen(page);
  });

  test("yard: nothing is drawn once the autoplay ends (cut to 3 s), at load or after Play, and the graphics card holds no more", async ({ page }) => {
    test.setTimeout(300_000);
    await endsByItself(page, "yard.html", () => yardReady(page));
  });

  const COMPARE = "/uchusen-rockets/compare.html?rocket=space-shuttle&variant=stack&with=none&background=none&picker=off";
  const compareReady = async (page: Page) => {
    await page.goto(COMPARE);
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    await reach3d(page);
  };

  test("compare: the craft turns at most 30 draws a second from the bar's loop and the hero's one, and nothing is drawn out of sight or on a hidden tab", async ({ page }) => {
    test.setTimeout(300_000);
    await counted(page, { cheap: true });
    await compareReady(page);
    await turning(page);
    await expectPaced(page, { schedulers: 2 });
    await expectUnseen(page);
  });

  test("compare: nothing is drawn once the autoplay ends (cut to 3 s), at load or after Play, and the graphics card holds no more", async ({ page }) => {
    test.setTimeout(300_000);
    await endsByItself(page, "compare.html", () => compareReady(page));
  });

  test("compare: Still holds the view bar's turn with the Earth's, at load and when chosen, and the turn comes back on leaving Still", async ({ page }) => {
    test.setTimeout(300_000);
    await counted(page);
    // opened Still: the bar never turns, and nothing is drawn
    await page.goto(`${COMPARE}&spin=still`);
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    await reach3d(page);
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
    // leaving Still lets it turn, and choosing Still stops it again
    const pace = page.getByTestId("turn-pace");
    await pace.getByRole("button", { name: "1", exact: true }).click();
    await turning(page);
    await pace.getByRole("button", { name: "0", exact: true }).click();
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
  });

  test("compare: reduced motion holds the view bar's turn at load, and the page draws nothing once it has settled", async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await counted(page);
    await page.goto(COMPARE);
    await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
    await reach3d(page);
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
  });

  const FIRST = "/uchusen-rockets/?rocket=saturn-v&variant=saturn-v&background=none&panel=background";

  test("first page: Still holds the view bar's turn, at load and when chosen, and the turn comes back on leaving Still", async ({ page }) => {
    test.setTimeout(300_000);
    await counted(page);
    // opened Still: the bar never turns, and nothing is drawn
    await page.goto(`${FIRST}&spin=still`);
    await reach3d(page);
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
    // leaving Still lets it turn, and choosing Still stops it again
    const pace = page.getByTestId("turn-pace");
    await pace.getByRole("button", { name: "1", exact: true }).click();
    await turning(page);
    await pace.getByRole("button", { name: "0", exact: true }).click();
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
  });

  test("first page: reduced motion holds the view bar's turn at load, and the page draws nothing once it has settled", async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await counted(page);
    await page.goto(FIRST);
    await reach3d(page);
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await expectStill(page);
  });

  const LINEUP = "/uchusen-rockets/compare.html?layout=lineup";
  const lineupReady = async (page: Page, address: string) => {
    await page.goto(address);
    await foldPicker(page);
    await expect(page.getByTestId("cmp-lineup")).toHaveAttribute("data-count", "3", { timeout: 60_000 });
    await watching(page, "#lineup");
  };

  test("fleet line-up: the row turns at most 10 draws a second, turn=0 draws nothing, and it is still out of sight and on a hidden tab", async ({ page }) => {
    test.setTimeout(240_000);
    await counted(page);
    await lineupReady(page, LINEUP);
    const start = await levelUsage(page);
    await expectPaced(page, { schedulers: 1, ceiling: 10 });
    // the loop that turns it polls a frame at a time and draws only when a tenth of a second has passed: out of sight it asks for none
    await expectUnseen(page);
    await page.getByTestId("cmp-turn").click();
    await expect(page).toHaveURL(/turn=0/);
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    await page.goto(`${LINEUP}&turn=0`);
    await lineupReady(page, `${LINEUP}&turn=0`);
    await expectStill(page);
  });

  const SWARM = "/uchusen-rockets/swarm.html";
  const BEAM = "/uchusen-rockets/beam.html";

  test("swarm: the drones run at most 30 draws a second from one frame loop, and Pause, play=0 or reduced motion leave nothing drawn and no frame asked for; it is still out of sight and on a hidden tab", async ({ page }) => {
    test.setTimeout(240_000);
    await counted(page);
    await page.goto(SWARM);
    await expect(page.getByTestId("swarm-map").locator("[data-drone]").first()).toBeVisible();
    await watching(page, "#swarm-map");
    const start = await levelUsage(page);
    await expectPaced(page, { schedulers: 1 });
    await expectUnseen(page);
    // Pause rests the loop: nothing is drawn and no frame is asked for, play=0 is in the address, and Play runs it again
    await page.getByTestId("swarm-pause").click();
    await expect(page).toHaveURL(/play=0/);
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    await page.getByTestId("swarm-pause").click();
    await expectPaced(page, { schedulers: 1 });
    // the reader's own switch for less motion stops it too, while it runs
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    // held in the address, it opens still, and nothing is drawn from the first frame
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${SWARM}?play=0`);
    await expect(page.getByTestId("swarm-pause")).not.toHaveAttribute("data-on");
    await watching(page, "#swarm-map");
    await expectStill(page);
  });

  test("beam: the rings run at most 30 draws a second from one frame loop, and Pause, play=0 or reduced motion leave nothing drawn and no frame asked for; it is still out of sight and on a hidden tab", async ({ page }) => {
    test.setTimeout(240_000);
    await counted(page);
    await page.goto(BEAM);
    await expect(page.getByTestId("beam-carry").locator("[data-ring]").first()).toBeAttached();
    await watching(page, "#beam-carry");
    const start = await levelUsage(page);
    await expectPaced(page, { schedulers: 1 });
    await expectUnseen(page);
    // Pause rests the loop: nothing is drawn and no frame is asked for, play=0 is in the address, and Play runs it again
    await page.getByTestId("beam-pause").click();
    await expect(page).toHaveURL(/play=0/);
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    await page.getByTestId("beam-pause").click();
    await expectPaced(page, { schedulers: 1 });
    // the reader's own switch for less motion stops it too, while it runs
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectStill(page);
    expectFlat(start, await levelUsage(page));
    // held in the address, it opens still, and nothing is drawn from the first frame
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${BEAM}?play=0`);
    await expect(page.getByTestId("beam-pause")).not.toHaveAttribute("data-on");
    await watching(page, "#beam-carry");
    await expectStill(page);
  });
});

// The fleet kit with less motion asked for. The first page's view bar no longer turns by itself then (MODULES-1226), and the camera's ease to a new craft is skipped, so nothing but the change itself supplies a frame: choosing a ship at rest must draw it, once at least, and then nothing is drawn while it stays.
test.describe("the fleet kit with less motion asked for", () => {
  test.use({ reducedMotion: "reduce" });

  test("choosing a fleet ship draws it, one frame or more after each change, and nothing is drawn while it rests", async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await page.addInitScript(COUNT);
    await page.goto(URL);
    await reach3d(page);
    await expect(bar(page)).not.toHaveAttribute("data-turning", "");
    await press(page, "look-painted");
    await hero(page).evaluate((node) =>
      node.addEventListener("uchusen-change", (event) => {
        const variant = (event as CustomEvent<{ report: { variant?: { rocket: string; id: string } } }>).detail.report.variant;
        const state = window as unknown as { __in: string; __inFrame: number };
        state.__in = `${variant?.rocket}/${variant?.id}`;
        state.__inFrame = Number(node.shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0);
      }),
    );
    const ships = Object.values(ROCKETS).filter((rocket) => !real(rocket) && ["fleet-ship-01", "fleet-02", "fleet-tanks"].includes(rocket.id));
    expect(ships.map((rocket) => rocket.id)).toContain("fleet-ship-01");
    for (const rocket of ships) {
      const variant = rocket.variants[0]!;
      await press(page, `rocket-${rocket.id}`);
      await press(page, `variant-${variant.id}`);
      await expect(hero(page)).toHaveAttribute("data-variant", variant.id);
      await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
      await expect.poll(() => page.evaluate(() => (window as unknown as { __in?: string }).__in), { timeout: 90_000 }).toBe(`${rocket.id}/${variant.id}`);
      const frame = await page.evaluate(() => (window as unknown as { __inFrame: number }).__inFrame);
      // the change itself is drawn: a frame after the one the change event was told of
      await expect.poll(() => drawn(page), { timeout: 30_000, message: `${rocket.id}: no frame was drawn after the change` }).toBeGreaterThan(frame);
      // and then it rests: the count of frames does not move
      await settle(page, 1500);
      const rested = await drawn(page);
      await settle(page, 2500);
      expect(await drawn(page), `${rocket.id}: drawn while at rest`).toBe(rested);
    }
  });

test("picking one part costs one frame and then nothing is drawn", async ({ page }) => {
  await page.goto(`${URL}?rocket=iss&variant=iss&look=line&spin=off`);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  await hero(page).evaluate((node) => node.setAttribute("spin", "off"));
  await expect.poll(async () => {
    const mark = await drawn(page);
    await settle(page, 1000);
    return (await drawn(page)) - mark;
  }, { timeout: 60_000 }).toBe(0);
  const before = await drawn(page);
  await hero(page).evaluate((node) => node.setAttribute("part", "zarya"));
  await expect.poll(async () => (await drawn(page)) - before, { timeout: 10_000 }).toBeGreaterThan(0);
  const used = (await drawn(page)) - before;
  expect(used).toBeLessThanOrEqual(2);
  const mark = await drawn(page);
  await settle(page, 1500);
  expect(await drawn(page)).toBe(mark);
});
