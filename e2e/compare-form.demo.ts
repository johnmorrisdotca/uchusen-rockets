// In space a launch stack is what is still flying. On the ground, and until asked, it is the whole stack.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/compare.html";

test("Float with In space shows the Starship ship and about 52 m, and the stack is the whole rocket", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
  await page.goto(`${URL}?rocket=starship&variant=v3&with=none&form=space&place=float&look=painted`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  const hero = page.locator('[data-testid="hero"]');
  await expect(hero).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect(hero).toHaveAttribute("data-form", "space");
  await expect(hero).toHaveAttribute("data-slots", "ship");
  await expect(page.locator("#cw-table")).toContainText("52 m");

  await page.locator('[data-testid="form-stack"]').click();
  await expect(hero).toHaveAttribute("data-form", "stack", { timeout: 90_000 });
  await expect(hero).toHaveAttribute("data-slots", "booster,ship");
  await expect(page.locator("#cw-table")).toContainText("124.4 m");

  await page.locator('[data-testid="place-ground"]').click();
  await expect(hero).not.toHaveAttribute("float", "");
  await expect(hero).toHaveAttribute("data-slots", "booster,ship");
});
