import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/fleet-compare.html";

test("the three ships stand at one scale, the view stays in the address, and the transport is the long one", async ({ page }) => {
  await page.goto(URL);
  const lineup = page.getByTestId("cmp-lineup");
  await expect(lineup).toHaveAttribute("pose", "stand");
  await expect(lineup).toHaveAttribute("data-count", "3");
  await expect(page.getByTestId("cmp-view-three-quarter")).toHaveAttribute("aria-pressed", "true");
  const transport = Number.parseFloat(await page.getByTestId("cmp-length-fleet-kaminari").innerText());
  const command = Number.parseFloat(await page.getByTestId("cmp-length-fleet-ship-03").innerText());
  expect(transport).toBeGreaterThan(command * 2);
  const before = await lineup.locator("svg").innerHTML();
  await page.getByTestId("cmp-view-side").click();
  await expect(page).toHaveURL(/view=side/);
  await expect(lineup).toHaveAttribute("view", "side");
  await expect(page.getByTestId("cmp-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("cmp-view-three-quarter")).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => lineup.locator("svg").innerHTML()).not.toBe(before);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(wide).toBe(false);
});
