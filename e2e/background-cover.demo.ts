// A background body covers the stage at every zoom, and it keeps turning on its own.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/compare.html?background=saturn&with=none&look=painted&rocket=dragon&variant=dragon-2";

test("Saturn covers the stage at a close zoom and at a far one, and it turns", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  const stage = page.locator(".cw-stage .view-space");
  const body = page.locator('[data-testid="sky"] wakusei-body').first();
  await expect(body).toHaveAttribute("body", "saturn", { timeout: 30_000 });
  await expect(body).toHaveAttribute("data-state", "live", { timeout: 30_000 });

  const covers = async () => {
    const frame = await stage.boundingBox();
    const box = await body.boundingBox();
    expect(frame).toBeTruthy();
    expect(box).toBeTruthy();
    if (!frame || !box) return;
    expect(box.x).toBeLessThanOrEqual(frame.x + 1);
    expect(box.y).toBeLessThanOrEqual(frame.y + 1);
    expect(box.x + box.width).toBeGreaterThanOrEqual(frame.x + frame.width - 1);
    expect(box.y + box.height).toBeGreaterThanOrEqual(frame.y + frame.height - 1);
  };
  await covers();

  await page.locator("#view-bar").evaluate((node) => {
    (node as unknown as { set: (view: { zoom: number }) => void }).set({ zoom: 0.3 });
  });
  await covers();

  await page.getByTestId("cam-planet").click();
  await covers();

  await page.getByTestId("turn-pace").getByRole("button", { name: "10", exact: true }).click();
  await expect.poll(async () => Number(await body.getAttribute("rate"))).toBeGreaterThan(100);
  const first = await body.screenshot();
  await page.waitForTimeout(2500);
  const later = await body.screenshot();
  expect(Buffer.compare(first, later)).not.toBe(0);
});
