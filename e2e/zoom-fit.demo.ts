// Changing craft, variant or view returns the picture to Fit. A zoom in the address stays until one of those changes. At a desk the fitted craft sits above the ship's panel.
import { expect, type Page, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";

function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  return problems;
}

const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const zoomOf = (page: Page) => hero(page).evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.zoom ?? (node as HTMLElement).shadowRoot?.querySelector<HTMLElement>(".drawing")?.dataset.zoom ?? "");
const press = async (page: Page, id: string) => {
  const rocket = /^rocket-(.+)$/.exec(id)?.[1];
  if (rocket) await page.locator(`[data-testid="maker-${ROCKETS[rocket].maker}"]`).click();
  await page.locator(`[data-testid="${id}"]`).click();
};

test("changing craft at zoom 5 returns to Fit, a shared zoom stays, and the fitted craft is above the panel", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium-desk", "Once, at a desk");
  const problems = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${URL}?zoom=5`);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("5.00");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("zoom"), { timeout: 30_000 }).toBe("5");

  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ yaw: 30 }));
  await press(page, "variant-v2");
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("1.00");
  const yaw = await bar(page).evaluate((node) => (node as HTMLElement & { state: { yaw: number } }).state.yaw);
  expect(Math.abs(yaw - 30)).toBeLessThan(0.5);

  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ zoom: 5 }));
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("5.00");
  await press(page, "rocket-saturn-v");
  await expect(hero(page)).toHaveAttribute("rocket", "saturn-v");
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("1.00");
  // the address is written a moment after the view, on a slow runner a long one
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("zoom"), { timeout: 30_000 }).toBeNull();

  await bar(page).evaluate((node) => (node as HTMLElement & { set(next: object): void }).set({ zoom: 5 }));
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("5.00");
  await press(page, "view-side");
  await expect.poll(() => zoomOf(page), { timeout: 30_000 }).toBe("1.00");

  await page.goto(`${URL}?rocket=fleet-ship-01&variant=hanabusa`);
  await bar(page).evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await expect(hero(page)).toHaveAttribute("data-panel", "on", { timeout: 90_000 });
  const boxes = await hero(page).evaluate((node) => {
    const root = (node as HTMLElement).shadowRoot;
    const figure = root?.querySelector(".picture")?.getBoundingClientRect();
    const panel = root?.querySelector(".panel")?.getBoundingClientRect();
    if (!figure || !panel) return null;
    return { figureBottom: figure.bottom, panelTop: panel.top, figureHeight: figure.height, panelHeight: panel.height };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.figureHeight).toBeGreaterThan(100);
  expect(boxes!.panelHeight).toBeGreaterThan(20);
  expect(boxes!.figureBottom).toBeLessThanOrEqual(boxes!.panelTop + 1);
  expect(problems).toEqual([]);
});
