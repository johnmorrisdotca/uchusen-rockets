import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const plumes = (page: import("@playwright/test").Page) => page.locator("#hero").evaluate((node) => Number(node.shadowRoot?.querySelector("canvas")?.dataset.plumes ?? "0"));

test("engines lit light the booster of the craft beside it", async ({ page }) => {
  await page.goto("/uchusen-rockets/?rocket=saturn-v&variant=saturn-v");
  await expect(page.getByTestId("hero")).toHaveAttribute("data-state", "3d", { timeout: 30000 });
  await page.getByTestId("engines-on").click();
  await expect.poll(() => plumes(page)).toBeGreaterThan(0);
  const alone = await plumes(page);
  await page.getByTestId("beside-on").click();
  await expect(page.getByTestId("hero")).toHaveAttribute("data-state", "3d", { timeout: 30000 });
  // Super Heavy, the booster of the Starship that stands beside it, has 33 engines. The ship on top of that booster stays dark.
  await expect.poll(() => plumes(page), { timeout: 30000 }).toBe(alone + 33);
});
