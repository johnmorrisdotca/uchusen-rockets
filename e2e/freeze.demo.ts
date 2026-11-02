// The demo must never ask a lot of the machine. Played in headless Chromium with the controls turning it, these fail on a draw loop that runs when nothing moves or more than once a frame, on WebGL contexts or
// graphics memory (buffers, vertex arrays, textures) that grow with each change, on a canvas past its pixel budget at any zoom on a 5K screen, and on a lost context that is not let go.
import { expect, type Page, test } from "@playwright/test";
import { MAX_PIXELS, MAX_SIDE } from "../src/pixels.ts";
import { ROCKETS } from "../src/rockets.ts";

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
  const seen = { contexts: [] as Ctx[], made: {} as Record<string, number>, freed: {} as Record<string, number>, frames: 0 };
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
  // frames, not callbacks: callbacks of one frame share a time
  let last = -1;
  const frame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    return frame((time) => {
      if (time !== last) seen.frames++;
      last = time;
      callback(time);
    });
  };
  Object.assign(window, { __seen: seen });
};

type Seen = { contexts: { isContextLost(): boolean }[]; made: Record<string, number>; freed: Record<string, number>; frames: number };
const usage = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as unknown as { __seen: Seen }).__seen;
    const live = (kind: string) => (seen.made[kind] ?? 0) - (seen.freed[kind] ?? 0);
    return { contexts: seen.contexts.filter((context) => !context.isContextLost()).length, buffers: live("Buffer"), arrays: live("VertexArray"), textures: live("Texture"), pageFrames: seen.frames };
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

test("every rocket in the catalogue: drawn line and painted, then contexts and graphics memory stay flat as they are walked again", async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto(URL);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await reach3d(page);
  const walk = async (look: string) => {
    await press(page, `look-${look}`);
    for (const id of Object.keys(ROCKETS)) {
      await press(page, `rocket-${id}`);
      await expect(hero(page)).toHaveAttribute("rocket", id);
      await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
      if (look === "painted") await expect(hero(page)).toHaveAttribute("data-painted", /^(model|code|mixed)$/, { timeout: 90_000 });
      await settle(page, 150);
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
