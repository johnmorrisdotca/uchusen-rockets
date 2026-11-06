// The command citadel slides clear of Miyamoto, and the camera is told to follow it.
import { expect, test } from "@playwright/test";

test("separating the citadel stays in the address and the view follows it", async ({ page }) => {
  await page.goto("/uchusen-rockets/?rocket=starship&variant=v3");
  await expect(page.getByTestId("leave-field")).toBeHidden();

  await page.goto("/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=line");
  await expect(page.getByTestId("leave-field")).toBeVisible();
  await expect(page.getByTestId("leave-reason")).toContainText("lifeboat");
  await page.getByTestId("leave-range").evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = "0.6";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => new URL(page.url()).searchParams.get("leave")).toBe("0.60");
  await expect.poll(async () => page.locator("uchusen-rocket canvas").getAttribute("data-leave"), { timeout: 20000 }).toBe("command");
});
