// The shared ship picker floats on the Card window. layout switches Card and Browser. The choice is the page's craft.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

test("the ship picker is a Card window, and one attribute switches it to the Browser", async ({ page }) => {
  await page.goto(URL);
  const frame = page.getByTestId("ship-picker-window");
  const picker = page.getByTestId("ship-picker");
  await expect(frame).toHaveAttribute("variant", "card");
  await expect(picker).toHaveAttribute("data-layout", "browser");
  await expect(picker.locator(".pk-side")).toBeVisible();
  await expect(picker.getByTestId("ship-picker-search")).toBeVisible();
  await expect(picker.getByTestId("ship-picker-facts")).toContainText(/Starship|m/);
  await picker.evaluate((node) => node.setAttribute("layout", "card"));
  await expect(picker).toHaveAttribute("data-layout", "card");
  await expect(picker.locator(".pk-side")).toHaveCount(0);
  await expect(picker.locator(".pk-kinds")).toBeVisible();
  await picker.evaluate((node) => node.setAttribute("layout", "browser"));
  await expect(picker.locator(".pk-side")).toBeVisible();
});

test("choosing a craft in the picker puts it on the stage and in the address", async ({ page }) => {
  await page.goto(URL);
  const picker = page.getByTestId("ship-picker");
  await picker.getByTestId("pick-kind-rocket").click();
  await picker.getByTestId("pick-saturn-v").click();
  await expect(page).toHaveURL(/rocket=saturn-v/);
  await expect(page.getByTestId("hero")).toHaveAttribute("rocket", "saturn-v");
  await expect(picker.getByTestId("pick-saturn-v")).toHaveAttribute("aria-selected", "true");
  await expect(picker.locator(".pk-craft .craft-pic svg").first()).toBeVisible();
});
