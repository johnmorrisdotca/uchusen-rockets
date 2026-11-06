// The thruster choice: nozzles on a real craft, none on a rocket that has no jets, and the choice kept in the address.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

test("the Shuttle shows its nozzles, and station-keeping stays in the address", async ({ page }) => {
  await page.goto(`${URL}?rocket=space-shuttle&variant=discovery`);
  await expect(page.locator('[data-testid="panel-thrusters"]')).toBeVisible();
  await page.locator('[data-testid="panel-thrusters"]').click();
  await page.locator('[data-testid="thrusters-show"]').click();
  const canvas = page.locator("#hero").locator("canvas");
  await expect(canvas).toHaveAttribute("data-thrusters", "show");
  await expect.poll(async () => Number(await canvas.getAttribute("data-nozzles"))).toBeGreaterThan(4);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("thrusters")).toBe("show");
  await page.locator('[data-testid="thrusters-keep"]').click();
  await expect(canvas).toHaveAttribute("data-thrusters", "station-keeping");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("thrusters")).toBe("station-keeping");
  // reduced motion keeps the nozzles and does not puff or drift
  await expect(canvas).toHaveAttribute("data-puff", "0");
});

test("a rocket with no jets hides the choice", async ({ page }) => {
  await page.goto(`${URL}?rocket=starship&variant=v3`);
  await expect(page.locator('[data-testid="panel-thrusters"]')).toBeHidden();
});

test("a fleet ship keeps thrusters in the lights panel", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-ship-03&variant=miyamoto`);
  await expect(page.locator('[data-testid="panel-thrusters"]')).toBeHidden();
  await page.locator('[data-testid="panel-lights"]').click();
  await expect(page.locator('[data-testid="thrusters-show"]')).toBeVisible();
  await page.locator('[data-testid="thrusters-show"]').click();
  const canvas = page.locator("#hero").locator("canvas");
  await expect(canvas).toHaveAttribute("data-thrusters", "show");
  await expect.poll(async () => Number(await canvas.getAttribute("data-nozzles"))).toBeGreaterThan(4);
});
