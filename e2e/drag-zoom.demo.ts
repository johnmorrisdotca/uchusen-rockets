// A plain drag turns the craft at every zoom. Panning is the Move choice, not a side effect of zooming in.
import { expect, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
type Bar = HTMLElement & { set(next: object): void; pause(): void; state: { yaw: number; panX: number; panY: number; zoom: number } };
const angle = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement & { angle: { az: number } }).angle.az);

async function drag(page: Page): Promise<void> {
  const box = await hero(page).boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
}

test("zoomed in, a drag turns the craft and does not move it", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(URL);
  await foldPicker(page);
  await bar(page).evaluate((node) => (node as Bar).pause());
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  for (const zoom of [2, 5]) {
    await bar(page).evaluate((node, z) => (node as Bar).set({ zoom: z, yaw: 0, tilt: 0, panX: 0, panY: 0, drag: "turn" }), zoom);
    await expect.poll(() => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.zoom ?? "")).toBe(zoom.toFixed(2));
    const before = await angle(page);
    await drag(page);
    await expect.poll(async () => Math.abs((await angle(page)) - before)).toBeGreaterThan(5);
    const placed = await bar(page).evaluate((node) => (node as Bar).state);
    expect(placed.panX).toBe(0);
    expect(placed.panY).toBe(0);
  }
  await bar(page).evaluate((node) => (node as Bar).set({ zoom: 2, yaw: 0, panX: 0, panY: 0 }));
  await bar(page).locator('[data-b="move"]').evaluate((node) => (node as HTMLButtonElement).click());
  const still = await angle(page);
  await drag(page);
  const moved = await bar(page).evaluate((node) => (node as Bar).state);
  expect(Math.abs(moved.panX) + Math.abs(moved.panY)).toBeGreaterThan(10);
  expect(Math.abs((await angle(page)) - still)).toBeLessThan(1);
  expect(problems).toEqual([]);
});
