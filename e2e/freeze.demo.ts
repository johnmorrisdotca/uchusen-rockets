// The demo must never ask a lot of the machine. Played in headless Chromium with the controls turning it, these fail on a draw loop that runs when nothing moves or more than once a frame, on WebGL contexts or
// graphics memory (buffers, vertex arrays, textures) that grow with each change, on a canvas past its pixel budget at any zoom on a 5K screen, and on a lost context that is not let go.
import { expect as plainExpect, type Locator, type Page, test } from "@playwright/test";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";
import { ROCKETS } from "../src/rockets.ts";

// these draw in software, and a page building a painted material can be busy for many seconds
const expect = plainExpect.configure({ timeout: 30_000 });
const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const press = (page: Page, id: string) => page.locator(`[data-testid="${id}"]`).click();

test.use({ reducedMotion: "no-preference" });
test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

/** Counts what the page asks of the graphics card, from before any script runs. */
const COUNT = () => {
  type Ctx = (WebGLRenderingContext | WebGL2RenderingContext) & { isContextLost(): boolean };
  const seen = { contexts: [] as Ctx[], made: {} as Record<string, number>, freed: {} as Record<string, number>, frames: 0, asked: 0, draws: 0 };
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error a wrapper with the same overloads is not worth writing out
  HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
    const context = getContext.call(this, type, ...(rest as []));
    if (context && /webgl/.test(type) && !seen.contexts.includes(context as Ctx)) seen.contexts.push(context as Ctx);
    return context;
  };
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[]) {
    for (const kind of ["Buffer", "Texture", "VertexArray", "Program", "Framebuffer", "Renderbuffer"]) {
      for (const [verb, into] of [["create", seen.made], ["delete", seen.freed]] as const) {
        const original = proto[verb + kind];
        if (!original) continue;
        proto[verb + kind] = function (this: unknown, ...args: unknown[]) {
          into[kind] = (into[kind] ?? 0) + 1;
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
  // frames, not callbacks: callbacks of one frame share a time
  let last = -1;
  const frame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    seen.asked++;
    return frame((time) => {
      if (time !== last) seen.frames++;
      last = time;
      callback(time);
    });
  };
  Object.assign(window, { __seen: seen });
};

type Seen = { contexts: { isContextLost(): boolean }[]; made: Record<string, number>; freed: Record<string, number>; frames: number; asked: number; draws: number };
const usage = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as unknown as { __seen: Seen }).__seen;
    const live = (kind: string) => (seen.made[kind] ?? 0) - (seen.freed[kind] ?? 0);
    return { contexts: seen.contexts.filter((context) => !context.isContextLost()).length, buffers: live("Buffer"), arrays: live("VertexArray"), textures: live("Texture"), programs: live("Program"), framebuffers: live("Framebuffer"), pageFrames: seen.frames, asked: seen.asked, draws: seen.draws };
  });
const drawn = (page: Page) => hero(page).evaluate((node) => Number((node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.frames ?? 0));
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
  const round = async () => {
    await press(page, "variant-v1");
    await press(page, "show-apart");
    await press(page, "look-thick");
    await press(page, "look-painted");
    await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
    await press(page, "variant-v3");
    await expect(hero(page)).toHaveAttribute("data-painted", "model", { timeout: 90_000 });
    await press(page, "show-together");
    await press(page, "look-line");
    await settle(page, 600);
  };
  // the first rounds fill the caches that are kept on purpose; how much is held at any moment depends on what has been drawn yet, so it is the most held that must not grow
  const peak = { buffers: 0, arrays: 0, textures: 0 };
  for (let i = 0; i < 2; i++) {
    await round();
    const now = await usage(page);
    for (const key of ["buffers", "arrays", "textures"] as const) peak[key] = Math.max(peak[key], now[key]);
  }
  for (let i = 0; i < 4; i++) {
    await round();
    const now = await usage(page);
    expect(now.contexts).toBe(1);
    expect(now.buffers).toBeLessThanOrEqual(peak.buffers);
    expect(now.arrays).toBeLessThanOrEqual(peak.arrays);
    expect(now.textures).toBeLessThanOrEqual(peak.textures);
  }
});

test("every variant of every rocket: drawn line and painted, then contexts and graphics memory stay flat as they are walked again", async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  const walk = async (look: string) => {
    await press(page, `look-${look}`);
    for (const rocket of Object.values(ROCKETS))
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
    const round = async () => {
      await press(page, "rocket-falcon-9");
      await expect.poll(() => canvasData(page, "plumes")).toBe("9");
      await press(page, "rocket-falcon-heavy");
      await expect.poll(() => canvasData(page, "plumes")).toBe("27");
      await press(page, "rocket-starship");
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
      await press(page, "variant-v3");
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
