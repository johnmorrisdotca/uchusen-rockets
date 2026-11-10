// A plain drag turns the craft at every zoom. The middle button (or the right button, Ctrl or Command, or Space) and a drag move it: panning is never a side effect of zooming in.
import { expect, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";

const URL = "/uchusen-rockets/";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
type Bar = HTMLElement & { set(next: object): void; pause(): void; state: { yaw: number; panX: number; panY: number; zoom: number } };
const angle = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement & { angle: { az: number } }).angle.az);

async function drag(page: Page, button: "left" | "middle" = "left"): Promise<void> {
  const box = await hero(page).boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down({ button });
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up({ button });
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
    await bar(page).evaluate((node, z) => (node as Bar).set({ zoom: z, yaw: 0, tilt: 0, panX: 0, panY: 0 }), zoom);
    await expect.poll(() => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.zoom ?? "")).toBe(zoom.toFixed(2));
    const before = await angle(page);
    await drag(page);
    await expect.poll(async () => Math.abs((await angle(page)) - before)).toBeGreaterThan(5);
    const placed = await bar(page).evaluate((node) => (node as Bar).state);
    expect(placed.panX).toBe(0);
    expect(placed.panY).toBe(0);
  }
  await bar(page).evaluate((node) => (node as Bar).set({ zoom: 2, yaw: 0, panX: 0, panY: 0 }));
  const still = await angle(page);
  await drag(page, "middle");
  const moved = await bar(page).evaluate((node) => (node as Bar).state);
  expect(Math.abs(moved.panX) + Math.abs(moved.panY)).toBeGreaterThan(10);
  expect(Math.abs((await angle(page)) - still)).toBeLessThan(1);
  expect(problems).toEqual([]);
});
