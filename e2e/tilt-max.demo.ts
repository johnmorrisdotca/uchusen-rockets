// How far the view may be tipped: 90 degrees for a craft in space (straight above or below), 45 for a rocket on the ground. The slider, the drag and the address take the limit, and Fit still holds the craft at the limit.
import { expect, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";
const is3d = (browserName: string) => browserName === "chromium";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
type Bar = HTMLElement & { set(next: object): void; fit(): void; pause(): void; state: { tilt: number; zoom: number } };
const sliderMax = (page: Page) => bar(page).evaluate((node) => (node.shadowRoot?.querySelector("#tilt") as HTMLInputElement | null)?.max ?? "");
const stopTurn = (page: Page) => bar(page).evaluate((node) => (node as Bar).pause());
const angle = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement & { angle: { az: number; el: number } }).angle);
const tiltNow = (page: Page) => bar(page).evaluate((node) => (node as Bar).state.tilt);
const press = async (page: Page, rocket: string) => {
  await page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`).click();
  await page.locator(`[data-testid="rocket-${rocket}"]`).dispatchEvent("click");
};

test("the slider reaches 90 on a fleet ship and 45 on a rocket, and the limit follows the craft chosen", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-ship-ariake`);
  await expect(bar(page)).toHaveAttribute("tilt-max", "90");
  await expect.poll(() => sliderMax(page)).toBe("90");
  await bar(page).evaluate((node) => (node as Bar).set({ tilt: 90 }));
  expect(await tiltNow(page)).toBe(90);
  // a rocket is held to 45, and a tip beyond it is brought back to it
  await press(page, "saturn-v");
  await expect(bar(page)).toHaveAttribute("tilt-max", "45");
  await expect.poll(() => sliderMax(page)).toBe("45");
  expect(await tiltNow(page)).toBe(45);
  await bar(page).evaluate((node) => (node as Bar).set({ tilt: 90 }));
  expect(await tiltNow(page)).toBe(45);
  await press(page, "iss");
  await expect(bar(page)).toHaveAttribute("tilt-max", "90");
  await expect.poll(() => sliderMax(page)).toBe("90");
});

test("the address takes a tip up to the craft's limit and no further", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-02&tilt=80`);
  await expect.poll(() => tiltNow(page)).toBe(80);
  await page.goto(`${URL}?rocket=saturn-v&tilt=80`);
  await expect.poll(() => tiltNow(page)).toBe(45);
});

for (const rocket of ["fleet-ship-ariake", "fleet-02", "fleet-ship-03", "iss"]) {
  test(`${rocket} at 90 degrees: the camera does not flip, Fit holds the whole craft`, async ({ page, browserName }) => {
    test.skip(!is3d(browserName), "WebGL is drawn in Chromium here");
    await page.goto(`${URL}?rocket=${rocket}&background=earth`);
    await stopTurn(page);
    await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
    for (const tilt of [-90, 90]) {
      await bar(page).evaluate((node, value) => (node as Bar).set({ tilt: value }), tilt);
      await expect.poll(async () => Math.abs((await angle(page)).el), { timeout: 30_000 }).toBeGreaterThan(60);
      const looking = await angle(page);
      expect(Math.abs(looking.el)).toBeLessThanOrEqual(87.01);
      // the turn goes on being a turn: yawing from above moves the camera round, it does not jump
      await bar(page).evaluate((node) => (node as Bar).set({ yaw: 30 }));
      await expect.poll(async () => Math.abs(((await angle(page)).az - looking.az + 540) % 360 - 180)).toBeGreaterThan(0);
      await bar(page).evaluate((node) => (node as Bar).set({ yaw: 0 }));
      await bar(page).evaluate((node) => (node as Bar).set({ zoom: 2, panX: 60, panY: -40 }));
      await bar(page).evaluate((node) => (node as Bar).fit());
      const { min, max } = build({ rocket, variant: ROCKETS[rocket].defaultVariant }).boundsOf("together");
      const corners = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z])));
      await expect
        .poll(() => hero(page).evaluate((node, points) => points.map((point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false), corners), { timeout: 30_000 })
        .toEqual(corners.map(() => true));
      expect(await tiltNow(page)).toBe(tilt);
    }
  });
}
