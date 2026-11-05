// The beam page draws the carry in both looks, and the reduced-motion picture is the dotted one.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/beam.html";

test("the beam page shows the light, the line and the dotted line on a dark ground", async ({ page }) => {
  await page.goto(URL);
  const carry = page.getByTestId("beam-carry");
  await expect(carry.locator("svg")).toBeVisible();
  await expect(carry.locator("svg rect")).toHaveAttribute("fill", "#070b14");
  await expect(carry.locator("[data-beam=light]")).toBeVisible();
  await expect(carry.locator("stop[stop-opacity='0']")).toHaveCount(1);
  await expect(page.getByTestId("beam-line").locator("[data-beam=line]")).toBeVisible();
  await expect(page.getByTestId("beam-dotted").locator("[data-beam=dots]")).toBeVisible();
});
