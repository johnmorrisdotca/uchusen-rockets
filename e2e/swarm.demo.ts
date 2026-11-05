// The swarm page draws the path, and the ship view hides what is not built yet and puts the drones in the scene.
import { expect, test } from "@playwright/test";

test("twenty-four drone boxes stay outside the hull", async ({ page }) => {
  await page.goto("/uchusen-rockets/swarm.html");
  const map = page.getByTestId("swarm-map");
  await expect(map.locator("svg")).toBeVisible();
  await expect(map.locator("[data-hull]")).toBeVisible();
  await expect(map.locator("[data-drone]")).toHaveCount(24);
  await expect(map.locator("[data-drone][data-clear=yes]")).toHaveCount(24);
  await expect(page.getByTestId("swarm-now")).toContainText("24");
});

test("day 100 of Miyamoto shows the drive underway and 24 drones", async ({ page }) => {
  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=line&view=three-quarter&build=on&at=0.0684");
  const hero = page.getByTestId("hero");
  await expect(hero).toHaveAttribute("data-state", "3d", { timeout: 45_000 });
  const canvas = hero.locator("canvas");
  await expect(canvas).toHaveAttribute("data-swarm", "24", { timeout: 45_000 });
  await expect(canvas).toHaveAttribute("data-going", "drive");
  await expect(canvas).toHaveAttribute("data-built", "");
  await expect(canvas).toHaveAttribute("data-weld", "dot");
});
