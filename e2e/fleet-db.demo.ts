import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/fleet-db.html";

test("the fleet record opens on a ship, then a section, and keeps both in the address", async ({ page }) => {
  await page.goto(URL);
  const ships = page.getByTestId("db-ships");
  await expect(ships.getByRole("button", { pressed: true })).toBeVisible();
  await expect(ships.getByTestId("db-ship-fleet-emiake")).toBeVisible();
  await expect(ships.getByTestId("db-ship-fleet-romaryu")).toBeVisible();
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 1100) {
    const hero = await page.getByTestId("db-hero").boundingBox();
    const row = await ships.boundingBox();
    expect(hero && row && hero.x + hero.width <= row.x + 4).toBe(true);
  }
  await ships.getByTestId("db-ship-fleet-ship-03").click();
  await expect(page).toHaveURL(/ship=fleet-ship-03/);
  await expect(page.getByTestId("db-hero")).toHaveAttribute("rocket", "fleet-ship-03");
  const sections = page.getByTestId("db-sections");
  const whole = sections.getByTestId("db-show-together");
  await expect(whole).toHaveAttribute("aria-pressed", "true");
  const part = sections.locator("button").nth(1);
  const slot = (await part.getAttribute("data-testid"))?.replace("db-show-", "") ?? "";
  await part.click();
  await expect(page).toHaveURL(new RegExp(`show=${slot}`));
  await expect(page.getByTestId("db-hero")).toHaveAttribute("show", slot);
  const module = page.getByTestId("db-modules").locator("button").first();
  await expect(module).toBeVisible();
  await module.click();
  await expect(page).toHaveURL(/module=/);
  await expect(page.getByTestId("db-module-job")).not.toHaveText("");
  await expect(page.getByTestId("db-hero")).toHaveAttribute("data-focus", /.+/);
  await expect(page.getByTestId("db-facts")).toContainText("The ship");
  await expect(page.getByTestId("db-part-facts")).toBeVisible();
  await expect(page.getByTestId("db-part-facts")).toContainText("m");
  await expect(page.getByTestId("db-profile").locator("tr").nth(2)).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(wide).toBe(false);
});
