// The swarm page draws the path, and the ship view hides what is not built yet and puts the drones in the scene.
import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { expectStillPicture } from "./still.ts";

const COUNT = () => {
  type Ctx = (WebGLRenderingContext | WebGL2RenderingContext) & { isContextLost(): boolean };
  type Tally = { made: Record<string, number>; freed: Record<string, number> };
  const tallies = new WeakMap<object, Tally>();
  const seen = { contexts: [] as { context: WeakRef<Ctx>; tally: Tally }[] };
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
    for (const kind of ["Buffer", "Texture", "VertexArray"]) {
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
  Object.assign(window, { __seen: seen });
};

const usage = (page: Page) =>
  page.evaluate(() => {
    const seen = (window as unknown as { __seen: { contexts: { context: WeakRef<{ isContextLost(): boolean }>; tally: { made: Record<string, number>; freed: Record<string, number> } }[] } }).__seen;
    const alive = seen.contexts.filter(({ context }) => {
      const held = context.deref();
      return held !== undefined && !held.isContextLost();
    });
    const live = (kind: string) => alive.reduce((sum, { tally }) => sum + (tally.made[kind] ?? 0) - (tally.freed[kind] ?? 0), 0);
    return { buffers: live("Buffer"), arrays: live("VertexArray"), textures: live("Texture") };
  });

const miyamoto = "/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=painted&view=three-quarter&build=on";
const ariake = "/uchusen-rockets/?rocket=fleet-ship-ariake&variant=ariake&look=painted&view=three-quarter&build=on";

test("twenty-four drone boxes stay outside the hull", async ({ page }) => {
  await page.goto("/uchusen-rockets/swarm.html");
  const map = page.getByTestId("swarm-map");
  await expect(map.locator("svg")).toBeVisible();
  await expect(map.locator("[data-hull]")).toBeVisible();
  await expect(map.locator("[data-drone]")).toHaveCount(24);
  await expect(map.locator("[data-drone][data-clear=yes]")).toHaveCount(24);
  await expect(page.getByTestId("swarm-now")).toContainText("24");
});

test("day 100 of Miyamoto shows the drive underway and 24 drones", async ({ page }) => {
  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=line&view=three-quarter&build=on&at=0.0684");
  const hero = page.getByTestId("hero");
  await expect(hero).toHaveAttribute("data-state", "3d", { timeout: 45_000 });
  const canvas = hero.locator("canvas");
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 45_000 });
  await expect(canvas).toHaveAttribute("data-going", "drive");
  await expect(canvas).toHaveAttribute("data-built", "");
  await expect(canvas).toHaveAttribute("data-weld", "dot");
  await expect(canvas).toHaveAttribute("data-swarm-near", /\d+/);
});

test("Ariake builds with the same swarm", async ({ page }) => {
  await page.goto(`${ariake}&at=0.3`);
  const canvas = page.getByTestId("hero").locator("canvas");
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 60_000 });
  await expect(canvas).toHaveAttribute("data-going", /.+/);
  await expect(canvas).toHaveAttribute("data-frame-ms", /\d/, { timeout: 45_000 });
});

test("leaving builder mode and coming back keeps the drone buffers", async ({ page }) => {
  await page.addInitScript(COUNT);
  await page.goto(`${miyamoto}&at=0.0684`);
  const canvas = page.getByTestId("hero").locator("canvas");
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 45_000 });
  const settled = async () => {
    let last = await usage(page);
    for (let i = 0; i < 8; i += 1) {
      await page.waitForTimeout(300);
      const next = await usage(page);
      if (next.buffers === last.buffers && next.arrays === last.arrays && next.textures === last.textures) return next;
      last = next;
    }
    return last;
  };
  const first = await settled();
  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=painted&view=three-quarter&build=off");
  await expect(canvas).not.toHaveAttribute("data-swarm", { timeout: 45_000 });
  await page.goto(`${miyamoto}&at=0.0684`);
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 45_000 });
  const second = await settled();
  expect(second.buffers).toBeLessThanOrEqual(first.buffers);
  expect(second.arrays).toBeLessThanOrEqual(first.arrays);
  expect(second.textures).toBeLessThanOrEqual(first.textures);
});

test("a frame with 24 drones and one with 96", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "one software timing is enough");
  const read = async (url: string, swarm: string) => {
    await page.goto(url);
    const canvas = page.getByTestId("hero").locator("canvas");
    await expect(canvas).toHaveAttribute("data-swarm", swarm, { timeout: 60_000 });
    await expect(canvas).toHaveAttribute("data-frame-ms", /\d/, { timeout: 45_000 });
    return canvas.evaluate((node) => ({
      swarm: node.dataset.swarm,
      showMs: node.dataset.swarmShow,
      lodMs: node.dataset.swarmLod,
      frameMs: node.dataset.frameMs,
      calls: node.dataset.drawCalls,
      triangles: node.dataset.triangles,
      near: node.dataset.swarmNear,
    }));
  };
  const small = await read(`${miyamoto}&look=painted&at=0.0684`, "24");
  const large = await read("/uchusen-rockets/?rocket=fleet-kaminari&variant=fleet-kaminari&look=painted&view=three-quarter&build=on&at=0.2", "96");
  writeFileSync("/tmp/builder-drones-measure.json", JSON.stringify({ small, large }, null, 2));
  expect(Number(small.calls)).toBeGreaterThan(0);
  expect(Number(large.calls)).toBeGreaterThan(0);
  expect(Number(large.triangles)).toBeGreaterThan(Number(small.triangles));
});

test("builder pictures", async ({ page }, info) => {
  test.skip(!process.env.SHOTS || info.project.name !== "chromium-desk", "pictures only when SHOTS is set, on the desk");
  test.setTimeout(300_000);
  const dir = process.env.SHOTS ?? "";
  const desk = { width: 1440, height: 900 };
  const phone = { width: 390, height: 844 };
  const FRAME = "html,body,main,#main-view{background:#070c17 !important;margin:0 !important}main > :not(#main-view){display:none !important}#view-bar{position:fixed !important;left:-4000px !important;top:0 !important}.stage-row{margin:0 !important;display:block !important;width:100vw !important}.stage-box{padding:0 !important;border:0 !important;background:#070c17 !important;width:100vw !important}uchusen-rocket,.stage-box uchusen-rocket,.stage-box uchusen-rocket[data-panel]{max-width:none !important;width:100vw !important;height:100vh !important;margin:0 !important}uchusen-rocket::part(figure){aspect-ratio:auto !important;width:100% !important;height:100vh !important}";
  const shoot = async (base: string, at: string, name: string, size: { width: number; height: number }, swarm = "24") => {
    await page.setViewportSize(size);
    await page.goto(`${base}&at=${at}`);
    await page.addStyleTag({ content: FRAME });
    const canvas = page.getByTestId("hero").locator("canvas");
    await expect(canvas).toHaveAttribute("data-swarm", swarm, { timeout: 60_000 });
    await expect(canvas).toHaveAttribute("data-frame-ms", /\d/, { timeout: 45_000 });
    await expect.poll(async () => canvas.evaluate((node) => node.clientHeight)).toBeGreaterThan(size.height * 0.75);
    await canvas.screenshot({ path: `${dir}/${name}.png` });
  };
  for (const at of ["0.0684", "0.3", "0.6"]) {
    await shoot(miyamoto, at, `miyamoto-${at}`, desk);
    await shoot(miyamoto, at, `miyamoto-${at}-phone`, phone);
  }
  await page.setViewportSize(desk);
  await page.goto(`${miyamoto}&at=0.6`);
  await page.addStyleTag({ content: FRAME });
  const canvas = page.getByTestId("hero").locator("canvas");
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 60_000 });
  const zoom = page.getByRole("region", { name: "The rocket" }).getByRole("button", { name: "Zoom in" }).first();
  let clicks = 0;
  for (let i = 0; i < 4; i += 1) {
    if (await zoom.isDisabled()) break;
    await zoom.evaluate((node: HTMLButtonElement) => node.click());
    clicks += 1;
    if (clicks === 3) {
      await page.waitForTimeout(400);
      await canvas.screenshot({ path: `${dir}/miyamoto-mid.png` });
    }
  }
  await page.waitForTimeout(600);
  await canvas.screenshot({ path: `${dir}/miyamoto-close.png` });
});

test("fleet builder pictures", async ({ page }, info) => {
  test.skip(!process.env.SHOTS || info.project.name !== "chromium-desk", "pictures only when SHOTS is set, on the desk");
  test.setTimeout(600_000);
  const dir = process.env.SHOTS ?? "";
  const frame = "html,body,main,#main-view{background:#070c17 !important;margin:0 !important}main > :not(#main-view){display:none !important}#view-bar{position:fixed !important;left:-4000px !important;top:0 !important}.stage-row{margin:0 !important;display:block !important;width:100vw !important}.stage-box{padding:0 !important;border:0 !important;background:#070c17 !important;width:100vw !important}uchusen-rocket,.stage-box uchusen-rocket,.stage-box uchusen-rocket[data-panel]{max-width:none !important;width:100vw !important;height:100vh !important;margin:0 !important}uchusen-rocket::part(figure){aspect-ratio:auto !important;width:100% !important;height:100vh !important}";
  await page.setViewportSize({ width: 1440, height: 900 });
  const ships = [
    { base: ariake, name: "ariake", swarm: "24" },
    { base: "/uchusen-rockets/?rocket=fleet-kaminari&variant=fleet-kaminari&look=painted&view=three-quarter&build=on", name: "kaminari", swarm: "96" },
    { base: "/uchusen-rockets/?rocket=fleet-emiake&variant=fleet-emiake&look=painted&view=three-quarter&build=on", name: "emiake", swarm: "96" },
    { base: "/uchusen-rockets/?rocket=fleet-romaryu&variant=fleet-romaryu&look=painted&view=three-quarter&build=on", name: "romaryu", swarm: "96" },
    { base: "/uchusen-rockets/?rocket=fleet-ship-01&variant=hanabusa&look=painted&view=three-quarter&build=on", name: "hanabusa", swarm: "48" },
  ];
  for (const ship of ships) {
    for (const at of ["0.0684", "0.3", "0.6"]) {
      await page.goto(`${ship.base}&at=${at}`);
      await page.addStyleTag({ content: frame });
      const canvas = page.getByTestId("hero").locator("canvas");
      await expect(canvas).toHaveAttribute("data-swarm", ship.swarm, { timeout: 60_000 });
      await expect(canvas).toHaveAttribute("data-frame-ms", /\d/, { timeout: 45_000 });
      await expect.poll(async () => canvas.evaluate((node) => node.clientHeight)).toBeGreaterThan(600);
      await canvas.screenshot({ path: `${dir}/${ship.name}-${at}.png` });
    }
  }
});

test.describe("the swarm page opens moving", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the drones run their legs: the map changes between two frames", async ({ page }) => {
    await page.goto("/uchusen-rockets/swarm.html");
    const map = page.getByTestId("swarm-map");
    await expect(map.locator("[data-drone]").first()).toBeVisible();
    const first = await map.screenshot();
    await expect.poll(async () => !(await map.screenshot()).equals(first), { timeout: 30_000 }).toBe(true);
  });

  test("reduced motion keeps the drones in their boxes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/uchusen-rockets/swarm.html");
    const map = page.getByTestId("swarm-map");
    await expect(map.locator("[data-drone]").first()).toBeVisible();
    await expectStillPicture(page, () => map.screenshot(), "the drones stay in their boxes");
  });

  test("Pause holds the drones and the address, Play runs them again", async ({ page }) => {
    await page.goto("/uchusen-rockets/swarm.html");
    const map = page.getByTestId("swarm-map");
    const pause = page.getByTestId("swarm-pause");
    await expect(map.locator("[data-drone]").first()).toBeVisible();
    await expect(pause).toHaveAttribute("data-on", "");
    // the name (Pause, Play) says what a press does, so the button does not also say pressed: that would be read twice
    await expect(pause).not.toHaveAttribute("aria-pressed");
    await expect(pause).toHaveText("Pause");
    await pause.focus();
    await page.keyboard.press("Enter");
    await expect(pause).not.toHaveAttribute("data-on");
    await expect(pause).toHaveText("Play");
    await expect(page).toHaveURL(/play=0/);
    await expectStillPicture(page, async () => Buffer.from(await map.innerHTML()), "held, the page draws nothing");
    const held = await map.innerHTML();
    await pause.click();
    await expect(pause).toHaveAttribute("data-on", "");
    await expect(page).not.toHaveURL(/play=0/);
    await expect.poll(async () => (await map.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });

  test("play=0 opens held, and Play runs it", async ({ page }) => {
    await page.goto("/uchusen-rockets/swarm.html?play=0");
    const map = page.getByTestId("swarm-map");
    const pause = page.getByTestId("swarm-pause");
    await expect(map.locator("[data-drone]").first()).toBeVisible();
    await expect(pause).not.toHaveAttribute("data-on");
    await expectStillPicture(page, async () => Buffer.from(await map.innerHTML()), "held, the page draws nothing");
    const held = await map.innerHTML();
    await pause.click();
    await expect.poll(async () => (await map.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });

  test("the button names its state in Japanese", async ({ page }) => {
    await page.goto("/uchusen-rockets/swarm.html?lang=ja");
    const pause = page.getByTestId("swarm-pause");
    await expect(pause).toHaveText("一時停止");
    await pause.click();
    await expect(pause).toHaveText("再生");
  });

  test("reduced motion opens held with Play ready, and Play runs it", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/uchusen-rockets/swarm.html");
    const map = page.getByTestId("swarm-map");
    const pause = page.getByTestId("swarm-pause");
    await expect(map.locator("[data-drone]").first()).toBeVisible();
    await expect(pause).toHaveText("Play");
    const held = await map.innerHTML();
    await pause.click();
    await expect.poll(async () => (await map.innerHTML()) !== held, { timeout: 30_000 }).toBe(true);
  });
});
