import { expect, type Page } from "@playwright/test";

/** Fold the floating picker before using the stage beneath it, as a reader does. */
export async function foldPicker(page: Page): Promise<void> {
  const picker = page.getByTestId("ship-picker-window");
  if (await picker.count() === 0) return;
  if (await picker.getAttribute("open") !== null) await picker.locator('button[data-act="fold"]').click();
  await expect(picker).not.toHaveAttribute("open", "");
}
