// Choosing a docked craft: one row of buttons per port, kept in the address, still there with Fit, Beside it and true scale, and the graphics objects come back when the craft is taken off.
import { expect, type Page, test } from "@playwright/test";
import { DOCK } from "../src/model/fleet/ship-01/docking.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const openDocked = (page: Page) => page.getByTestId("panel-docked").click();
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);

const COUNT = () => {
  type Ctx = (WebGLRenderingContext | WebGL2RenderingContext) & { isContextLost(): boolean };
  const tallies = new WeakMap<object, { made: number; freed: number }>();
  const contexts: { context: WeakRef<Ctx>; tally: { made: number; freed: number } }[] = [];
  const tallyOf = (context: object) => {
    let tally = tallies.get(context);
    if (!tally) {
      tally = { made: 0, freed: 0 };
      tallies.set(context, tally);
      contexts.push({ context: new WeakRef(context as Ctx), tally });
    }
    return tally;
  };
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error the wrapper keeps the call and only counts a WebGL context
  HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
    const context = getContext.call(this, type, ...(rest as []));
    if (context && /webgl/.test(type)) tallyOf(context);
    return context;
  };
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype] as unknown as Record<string, (...args: unknown[]) => unknown>[]) {
    for (const [verb, into] of [["createBuffer", "made"], ["deleteBuffer", "freed"]] as const) {
      const original = proto[verb];
      if (!original) continue;
      proto[verb] = function (this: object, ...args: unknown[]) {
        tallyOf(this)[into] += 1;
        return original.apply(this, args);
      };
    }
  }
  Object.assign(window, { __dockedSeen: contexts });
};

const buffers = (page: Page) =>
  page.evaluate(() => {
    const contexts = (window as unknown as { __dockedSeen: { context: WeakRef<{ isContextLost(): boolean }>; tally: { made: number; freed: number } }[] }).__dockedSeen;
    const alive = contexts.filter(({ context }) => {
      const held = context.deref();
      return held !== undefined && !held.isContextLost();
    });
    return { contexts: alive.length, buffers: alive.reduce((sum, { tally }) => sum + tally.made - tally.freed, 0) };
  });

test("each port offers its craft, and the choice stays in the address with Fit, Beside it and true scale", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-ship-01&variant=hanabusa`);
  await openDocked(page);
  await expect(page.getByTestId("docked-crew-s-dragon")).toBeVisible();
  await expect(page.getByTestId("docked-crew-s-orion")).toBeVisible();
  await expect(page.getByTestId("docked-visitor-s-soyuz")).toBeVisible();
  await expect(page.getByTestId("docked-starship-starship")).toBeVisible();
  await expect(page.getByTestId("docked-berth-m-dragon")).toHaveCount(0);

  await page.getByTestId("docked-crew-s-dragon").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@crew-s");
  await expect.poll(() => param(page, "docked")).toBe("dragon@crew-s");

  await page.getByTestId("panel-look").click();
  await page.getByTestId("beside-on").click();
  await page.getByTestId("true-scale").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@crew-s");
  await expect(hero(page)).toHaveAttribute("beside", "on");
  await expect(hero(page)).toHaveAttribute("scale", "true");
  await expect.poll(() => param(page, "docked")).toBe("dragon@crew-s");

  await page.reload();
  await expect(page.getByTestId("docked-crew-s-dragon")).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page)).toHaveAttribute("docked", "dragon@crew-s");
});

test("Miyamoto's ventral collars and the first design's arms offer a craft", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-ship-03&variant=miyamoto`);
  await openDocked(page);
  await expect(page.getByTestId("docked-dragon-ventral-dragon")).toBeVisible();
  await expect(page.getByTestId("docked-starship-ventral-starship")).toBeVisible();
  await page.getByTestId("docked-dragon-ventral-dragon").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@dragon-ventral");
  await page.getByTestId("panel-look").click();
  await page.getByTestId("beside-on").click();
  await page.getByTestId("true-scale").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@dragon-ventral");
  await expect(hero(page)).toHaveAttribute("beside", "on");
  await expect(hero(page)).toHaveAttribute("scale", "true");
  await expect.poll(() => param(page, "docked")).toBe("dragon@dragon-ventral");

  await page.goto(`${URL}?rocket=fleet-kaminari&variant=fleet-kaminari`);
  await openDocked(page);
  await expect(page.getByTestId("docked-dragon-dragon")).toBeVisible();
  await expect(page.getByTestId("docked-methane-starship")).toBeVisible();
  await expect(page.getByTestId("docked-oxygen-starship")).toBeVisible();
  await expect(page.getByTestId("docked-stack-starship")).toBeVisible();

  await page.goto(`${URL}?rocket=fleet-02&variant=fleet-02`);
  await openDocked(page);
  await expect(page.getByTestId("docked-starboard-26-dragon")).toBeVisible();
  await expect(page.getByTestId("docked-port-92-orion")).toBeVisible();
  await page.getByTestId("docked-starboard-26-dragon").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@starboard-26");
});

test("taking the craft off gives the graphics buffers back", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "the graphics count is read from Chromium");
  await page.addInitScript(COUNT);
  await page.goto(`${URL}?rocket=fleet-ship-01&variant=hanabusa`);
  await openDocked(page);
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  const before = await buffers(page);
  expect(before.contexts).toBe(1);

  await page.getByTestId("docked-crew-s-dragon").click();
  await expect(hero(page)).toHaveAttribute("docked", "dragon@crew-s");
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  const nose: [number, number, number] = [DOCK.reach, DOCK.face, 0];
  await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { fit(): void }).fit());
  await expect
    .poll(() => hero(page).evaluate((node, point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false, nose), { timeout: 30_000 })
    .toBe(true);

  await page.getByTestId("docked-crew-s-none").click();
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(async () => (await buffers(page)).buffers, { timeout: 20_000 }).toBeLessThanOrEqual(before.buffers);
  expect((await buffers(page)).contexts).toBe(1);
});
