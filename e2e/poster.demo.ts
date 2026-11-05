// The poster page: the package's rockets at one scale, a zoom, and a download of the drawing.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/poster.html";

test("the poster shows the rockets, the fleet and what is still to add, and the zoom changes the picture", async ({ page }) => {
  await page.goto(URL);
  const poster = page.getByTestId("poster");
  await expect(poster).toContainText("Saturn V");
  await expect(poster).toContainText("SPX-207");
  await expect(poster).toContainText("To add later");
  await expect(poster).toContainText("Vulcan Centaur");
  const before = await poster.locator("svg").evaluate((node) => node.getBoundingClientRect().width);
  await page.getByTestId("poster-zoom").fill("50");
  const after = await poster.locator("svg").evaluate((node) => node.getBoundingClientRect().width);
  expect(after).toBeLessThan(before);
});

test("the drawing downloads as an SVG", async ({ page }) => {
  await page.goto(URL);
  const download = page.waitForEvent("download");
  await page.getByTestId("poster-svg").click();
  expect((await download).suggestedFilename()).toBe("rockets-of-the-world.svg");
});
