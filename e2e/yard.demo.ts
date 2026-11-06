// The yard page: the whole yard, a jump to each bay, day and night, the free spine leaving and coming back, and the build player for the chosen bay.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/yard.html";

test("the yard page jumps to a bay, lights the night, slides the free spine and plays that bay", async ({ page }) => {
  await page.goto(URL);
  const stage = page.getByTestId("yard-stage");
  await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
  await expect(stage).toHaveAttribute("data-shot", "whole");
  await page.getByTestId("yard-lounge").click();
  await expect(stage).toHaveAttribute("data-shot", "lounge");
  await page.getByTestId("yard-visitor").click();
  await expect(stage).toHaveAttribute("data-shot", "visitor");
  await page.getByTestId("yard-night").click();
  await expect(stage).toHaveAttribute("data-sky", "night");
  await page.getByTestId("yard-day").click();
  await expect(stage).toHaveAttribute("data-sky", "day");
  await page.getByTestId("yard-loose").click();
  await expect(stage).toHaveAttribute("data-loose", "out");
  await page.getByTestId("yard-loose").click();
  await expect(stage).toHaveAttribute("data-loose", "home");
  await page.getByTestId("yard-hall").click();
  await page.getByTestId("yard-build").click();
  await expect(stage).toHaveAttribute("data-build", "on");
  await expect(stage).toHaveAttribute("data-ship", "fleet-kaminari");
  await expect(page.getByTestId("build-bar")).toBeVisible();
  const fit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(fit).toBeLessThanOrEqual(1);
});
