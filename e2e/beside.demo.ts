// "Beside it": Starship with Super Heavy stands beside the craft on screen at true scale. The toggle is in the address and survives a reload, Fit holds both craft, and Starship itself is not offered it.
import { expect, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";
const is3d = (browserName: string) => browserName === "chromium";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const toggle = (page: Page) => page.locator('[data-testid="beside-on"]');
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);
const press = async (page: Page, id: string) => {
  const rocket = /^rocket-(.+)$/.exec(id)?.[1];
  if (rocket) await page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`).click();
  await page.locator(`[data-testid="${id}"]`).click();
};
const stopTurn = (page: Page) => page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
const reach3d = async (page: Page) => {
  // a phone has the view below the controls, and nothing is drawn out of sight
  await hero(page).scrollIntoViewIfNeeded();
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
};

/** Every corner of the box both craft fill is on the picture after Fit. */
async function bothInView(page: Page, rocket: string, variant?: string) {
  const { min, max } = build({ rocket, ...(variant ? { variant } : {}) }, { beside: true }).boundsOf("together");
  const corners = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z])));
  await page.locator('[data-testid="view-bar"]').evaluate((node) => (node as HTMLElement & { fit(): void }).fit());
  await expect
    .poll(() => hero(page).evaluate((node, points) => points.map((point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false), corners), { timeout: 30_000 })
    .toEqual(corners.map(() => true));
}

test("Beside it: Starship stands beside the craft, the toggle is in the address and survives a reload, Fit holds both, and Starship is not offered it", async ({ page, browserName }) => {
  const problems: string[] = [];
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(URL);
  await foldPicker(page);
  // Starship itself: nothing to stand beside it
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await expect(toggle(page)).toBeHidden();

  await press(page, "rocket-saturn-v");
  await expect(toggle(page)).toBeVisible();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-testid="beside-note"]')).toBeHidden();
  expect(param(page, "beside")).toBeNull();
  await stopTurn(page);
  if (is3d(browserName)) await reach3d(page);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  await expect(page.locator('[data-testid="beside-note"]')).toBeVisible();
  await expect.poll(() => param(page, "beside")).toBe("on");
  if (is3d(browserName)) {
    await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.beside)).toBe("on");
    await bothInView(page, "saturn-v");
  }

  if (is3d(browserName)) {
    // what stands beside it is named, under its foot and inside the picture
    // a phone scrolls to the toggle, and a view out of sight draws nothing, so nothing is named yet
    await hero(page).scrollIntoViewIfNeeded();
    const label = hero(page).locator("[data-beside-label]");
    await expect(label).toHaveText("Starship with Super Heavy, 124.4 m");
    await expect(label).toBeVisible();
    const [canvas, words] = await Promise.all([hero(page).locator("canvas").boundingBox(), label.boundingBox()]);
    expect(words!.x).toBeGreaterThanOrEqual(canvas!.x - 1);
    expect(words!.x + words!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
    expect(words!.y + words!.height).toBeLessThanOrEqual(canvas!.y + canvas!.height + 1);
  }

  // a reload keeps it
  await page.reload();
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  await expect(hero(page)).toHaveAttribute("rocket", "saturn-v");
  await stopTurn(page);
  if (is3d(browserName)) {
    await reach3d(page);
    await bothInView(page, "saturn-v");
  }

  // Starship is not offered it, whatever the address says, and the choice comes back with the next craft
  await press(page, "rocket-starship");
  await expect(toggle(page)).toBeHidden();
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await press(page, "rocket-falcon-9");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await expect(hero(page)).toHaveAttribute("data-beside", "on");

  await toggle(page).click();
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await expect.poll(() => param(page, "beside")).toBeNull();
  if (is3d(browserName)) await expect(hero(page).locator("[data-beside-label]")).toHaveCount(0);
  await page.goto(`${URL}?rocket=starship&beside=on`);
  await foldPicker(page);
  await expect(toggle(page)).toBeHidden();
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  expect(problems).toEqual([]);
});

test("Beside it with the drawing alone: the drawing holds both craft too", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error this preserves the canvas overloads except for WebGL
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (/^(webgl2?|experimental-webgl)$/.test(type)) return null;
      return getContext.call(this, type, ...(args as []));
    };
  });
  const paths = () => hero(page).evaluate((node) => node.shadowRoot?.querySelector(".drawing svg")?.querySelectorAll("path").length ?? 0);
  await page.goto(`${URL}?rocket=sls`);
  await foldPicker(page);
  await expect.poll(paths, { timeout: 30_000 }).toBeGreaterThan(0);
  const alone = await paths();
  await page.goto(`${URL}?rocket=sls&beside=on`);
  await foldPicker(page);
  await expect(hero(page)).toHaveAttribute("data-beside", "on", { timeout: 30_000 });
  await expect.poll(paths, { timeout: 30_000 }).toBeGreaterThan(alone);
});
