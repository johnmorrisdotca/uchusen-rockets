// The choices under Maker, Rocket and Variant are one group at a time. The tab is kept in the address.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

test("one group shows at a time, and the tab is kept in the address", async ({ page }) => {
  await page.goto(`${URL}?rocket=fleet-ship-01&variant=hanabusa`);
  await expect(page.locator('[data-testid="maker-fleet"]')).toBeVisible();
  await expect(page.locator('[data-testid="rocket-fleet-ship-01"]')).toBeVisible();
  await expect(page.locator('[data-testid="variant-hanabusa"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-look"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-testid="panel-look"]')).toHaveCSS("background-color", "rgb(28, 53, 86)");
  await expect(page.locator('[data-testid="look-line"]')).toBeVisible();
  await expect(page.locator('[data-testid="background-none"]')).toBeHidden();
  await expect(page.locator('[data-testid="panel-lights"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-docked"]')).toBeVisible();
  await expect(page.locator('[data-testid="lights-off"]')).toBeHidden();
  await page.locator('[data-testid="panel-lights"]').click();
  await expect(page.locator('[data-testid="lights-off"]')).toBeVisible();
  await expect(page.locator('[data-testid="lights-running"]')).toBeVisible();
  await expect(page.locator('[data-testid="lights-all"]')).toBeVisible();
  await expect(page.locator('[data-testid="engines-off"]')).toBeHidden();
  await page.locator('[data-testid="panel-look"]').click();
  await expect(page.locator('[data-testid="engines-off"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-motion"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-build"]')).toBeVisible();

  await page.locator('[data-testid="panel-background"]').click();
  await expect(page.locator('[data-testid="background-none"]')).toBeVisible();
  await expect(page.locator('[data-testid="look-line"]')).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("panel")).toBe("background");
  await page.reload();
  await expect(page.locator('[data-testid="panel-background"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-testid="panel-background"]')).toHaveCSS("background-color", "rgb(28, 53, 86)");
  await expect(page.locator('[data-testid="panel-look"]')).not.toHaveCSS("background-color", "rgb(28, 53, 86)");
  await expect(page.locator('[data-testid="background-earth"]')).toBeVisible();

  await page.locator('[data-testid="panel-look"]').click();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("panel")).toBeNull();
  await expect(page.locator('[data-testid="look-line"]')).toBeVisible();
});

test("a craft with no build and no moving parts hides those tabs", async ({ page }) => {
  await page.goto(`${URL}?rocket=starship&variant=v3`);
  await expect(page.locator('[data-testid="panel-build"]')).toBeHidden();
  await expect(page.locator('[data-testid="panel-motion"]')).toBeHidden();
  await expect(page.locator('[data-testid="panel-lights"]')).toBeVisible();
  await page.locator('[data-testid="panel-lights"]').click();
  await expect(page.locator('[data-testid="lights-off"]')).toBeVisible();
  await expect(page.locator('[data-testid="lights-running"]')).toBeHidden();
  await expect(page.locator('[data-testid="lights-note"]')).toHaveText("Not drawn on this craft yet.");
  await expect(page.locator('[data-testid="panel-docked"]')).toBeHidden();
  await expect(page.locator('[data-testid="panel-look"]')).toBeVisible();
  await expect(page.locator('[data-testid="panel-background"]')).toBeVisible();
});
