import { expect, test } from "@playwright/test";

const data = (page: import("@playwright/test").Page, key: string) =>
  page.getByTestId("db-hero").evaluate((node, name) => node.shadowRoot?.querySelector("canvas")?.dataset[name] ?? "", key);

test("the repair drone eases out to Kaminari and ends at Fit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/uchusen-rockets/fleet-db.html?ship=fleet-drone&look=painted");
  await expect(page.getByTestId("db-hero")).toHaveAttribute("data-state", "3d", { timeout: 30_000 });
  await expect.poll(async () => Number(await data(page, "distance"))).toBeGreaterThan(0);
  const before = Number(await data(page, "distance"));
  // a real click scrolls the chip into view and, on a phone, scrolls the picture away, which stops the ease
  await page.getByTestId("db-ship-fleet-kaminari").evaluate((node) => (node as HTMLButtonElement).click());
  // software drawing of the far transition is slow, so the 0.8 s ease takes longer on the clock than on a graphics card
  await expect.poll(async () => Number(await data(page, "ease")), { timeout: 40_000 }).toBeGreaterThanOrEqual(10);
  await expect.poll(async () => data(page, "moving"), { timeout: 40_000 }).toBe("false");
  expect(Number(await data(page, "distance"))).toBeGreaterThan(before * 20);
});

test("reduced motion fits the new craft in one frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/uchusen-rockets/fleet-db.html?ship=fleet-drone&look=painted");
  await expect(page.getByTestId("db-hero")).toHaveAttribute("data-state", "3d", { timeout: 30_000 });
  const before = Number(await data(page, "distance"));
  await page.getByTestId("db-ship-fleet-kaminari").click();
  await expect.poll(async () => Number(await data(page, "distance")), { timeout: 5_000 }).toBeGreaterThan(before * 20);
  expect(Number(await data(page, "ease") || 0)).toBeLessThan(2);
  expect(await data(page, "moving")).not.toBe("true");
});
