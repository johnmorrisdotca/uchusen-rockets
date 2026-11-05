import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/fleet-db.html";

test("the fleet record opens on a ship, then a section, and keeps both in the address", async ({ page }) => {
  await page.goto(URL);
  const ships = page.getByTestId("db-ships");
  await expect(ships.getByRole("button", { pressed: true })).toBeVisible();
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
  await expect(page.getByTestId("db-facts")).toContainText("m");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(wide).toBe(false);
});
