// The beam page draws the carry in both looks, and the reduced-motion picture is the dotted one.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/beam.html";

test("the beam page shows the cone, the line and the dotted line", async ({ page }) => {
  await page.goto(URL);
  const marks = async (id: string) => page.getByTestId(id).locator("svg path, svg polygon").count();
  await expect(page.getByTestId("beam-carry").locator("svg")).toBeVisible();
  await expect(page.getByTestId("beam-line").locator("svg")).toBeVisible();
  const carry = await marks("beam-carry");
  const dotted = await marks("beam-dotted");
  expect(carry).toBeGreaterThan(0);
  expect(dotted).toBeGreaterThan(carry);
});
