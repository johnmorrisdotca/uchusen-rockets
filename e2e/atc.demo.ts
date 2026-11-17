// The small craft (ATC) in the demo: each is a variant of one rocket, made by SPX, with its card, and the cutaway beside the shuttle. Run under CPU_THROTTLE=4 for the slow-machine check.
import { expect, test } from "@playwright/test";
import { ATC_NAMES } from "../src/model/fleet/craft/index.ts";

const URL = "/uchusen-rockets/";

test.beforeEach(async ({ page, browserName }) => {
  const rate = Number(process.env.CPU_THROTTLE ?? "1");
  if (rate > 1 && browserName === "chromium") await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate });
});

for (const [variant, id] of [["crew-shuttle", "crew-shuttle"]] as const) {
  test(`${variant} opens by address, made by SPX, with its name from the map`, async ({ page }) => {
    await page.goto(`${URL}?rocket=fleet-atc&variant=${variant}`);
    await expect(page.locator("#facts")).toContainText(/Made by\s*SPX/i, { timeout: 30_000 });
    await expect(page.locator(`[data-testid="variant-${variant}"]`)).toContainText(ATC_NAMES[id].name);
    await expect(page.locator("#facts")).not.toContainText("SpaceX");
  });
}
