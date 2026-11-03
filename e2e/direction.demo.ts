// The drag rule (spx-stats docs/package-work.md, "A drag moves the object with the pointer"): the surface under the pointer follows the pointer, the arrow keys agree and Auto-turn takes the near side to the right.
// Two ways to read it. The shared check, e2e/ground.mjs (kazoku-ui's templates/e2e-ground.mjs, unchanged), slides the middle of a picture over the next, which needs a picture with texture in two directions: it is run on the
// Space Shuttle's stack in the thick look, which is wide and asymmetric (a rocket's body is a plain tube, and a plain tube has nothing to follow up or down). The camera's own angle is the other: one sign in src/framing.ts (`turnedBy`) serves
// every rocket, and a camera at azimuth a sees a point on the near side at x = -R sin(a), so the surface goes right as the azimuth falls; at elevation e its height is -R sin(e), so it goes up as the elevation falls.
// Desk Chromium only: the 3D looks draw in software here.
import { expect, type Page, test } from "@playwright/test";
import { checkFollowsTheHand, dragBy } from "./ground.mjs";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const angle = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement & { angle: { az: number; el: number } }).angle);

test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

async function open(page: Page, rocket: string, variant: string, look: string) {
  await page.goto(`${URL}?rocket=${rocket}&variant=${variant}&look=${look}`);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelector("canvas")?.dataset.look ?? ""), { timeout: 60_000 }).toBe(look);
  await page.waitForTimeout(500);
}

test.describe("drag, keys and Auto-turn", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the Space Shuttle's stack follows the hand: drag right and up, the arrow keys, and Auto-turn takes the near side to the right", async ({ page }) => {
    test.setTimeout(240_000);
    await open(page, "space-shuttle", "stack", "thick");
    await checkFollowsTheHand(page, { view: '[data-testid="hero"]', controls: "kazoku-view-controls", distance: 100, min: 3, autoTurn: "right" });
  });

  test("Starship's camera goes round to the left and down as the surface goes right and up: drag, keys and Auto-turn", async ({ page }) => {
    test.setTimeout(240_000);
    await open(page, "starship", "v3", "thick");
    const start = await angle(page);
    await dragBy(page, hero(page), 60, 0);
    await expect.poll(async () => start.az - (await angle(page)).az).toBeGreaterThan(5);
    await dragBy(page, hero(page), -60, 0);
    await expect.poll(async () => Math.abs((await angle(page)).az - start.az)).toBeLessThan(1);
    await dragBy(page, hero(page), 0, -60);
    await expect.poll(async () => start.el - (await angle(page)).el).toBeGreaterThan(2);
    await dragBy(page, hero(page), 0, 60);
    await expect.poll(async () => Math.abs((await angle(page)).el - start.el)).toBeLessThan(1);
    await hero(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => start.az - (await angle(page)).az).toBeGreaterThan(0.5);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowUp");
    await expect.poll(async () => start.el - (await angle(page)).el).toBeGreaterThan(0.5);
    await page.keyboard.press("ArrowDown");
    const turning = await angle(page);
    await bar(page).evaluate((node) => {
      const view = node as HTMLElement & { controller: { speed: number; play(): void } };
      view.controller.speed = 6;
      view.controller.play();
    });
    await expect.poll(async () => turning.az - (await angle(page)).az, { timeout: 15_000 }).toBeGreaterThan(5);
    await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  });
});
