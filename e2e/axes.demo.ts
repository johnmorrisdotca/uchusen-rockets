import { expect, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";

test("the view bar offers roll and the drawing turns with it", async ({ page }) => {
  await page.goto("/uchusen-rockets/");
  await foldPicker(page);
  const bar = page.getByTestId("view-bar");
  await bar.evaluate((node) => (node as HTMLElement & { pause(): void }).pause());
  await expect(bar.locator("[data-b='axis-roll']")).toBeVisible();
  await expect(bar.locator("[data-b='axis-tilt']")).toBeVisible();
  await expect(bar.locator("[data-b='axis-all']")).toBeVisible();
  await bar.locator("[data-b='axis-roll']").click();
  await expect(bar.locator("[data-b='axis-roll']")).toHaveAttribute("aria-pressed", "true");
  await bar.locator("#yaw").evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "40";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page).toHaveURL(/roll=40/);
  const rocket = page.locator("#hero");
  if ((await rocket.getAttribute("data-state")) !== "3d") {
    await expect.poll(async () => rocket.locator("svg").evaluate((svg) => (svg as SVGElement).style.transform)).toContain("rotate(40deg)");
  }
});
