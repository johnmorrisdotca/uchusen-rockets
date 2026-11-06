import { expect, test } from "@playwright/test";
import { BODIES } from "@johnmorrisdotca/wakusei-planets";

const URL = "/uchusen-rockets/compare.html?background=mars&with=none";

test("a background turns on its own day, and Still is kept in the address", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(URL);
  const body = page.locator("wakusei-body").first();
  await expect(body).toHaveAttribute("body", "mars", { timeout: 30_000 });
  const hours = Math.abs(BODIES.mars.rotationHours);
  const rate = Number(await body.getAttribute("rate"));
  expect(hours * 3600 / rate).toBeGreaterThanOrEqual(5 * 60);
  await page.getByTestId("turn-pace").getByRole("button", { name: "0", exact: true }).click();
  await expect(page).toHaveURL(/spin=still/);
  await expect(body).toHaveAttribute("rate", "0");
});

test("reduced motion keeps a background still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(URL);
  const body = page.locator("wakusei-body").first();
  await expect(body).toHaveAttribute("body", "mars", { timeout: 30_000 });
  await expect(body).toHaveAttribute("rate", "0");
});
