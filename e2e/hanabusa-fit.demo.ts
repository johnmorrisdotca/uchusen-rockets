// Hanabusa's panel keeps the choices inside the window at 1440 by 900, in the page's own font and in a wide one (a hosted runner's font is wider than a Mac's).
import { expect, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";
import { isListed } from "../demo/listed.ts";

const URL = "/uchusen-rockets/";
for (const font of ["default", "wide"]) test(`Hanabusa's choices fit a 1440 by 900 window, ${font} font`, async ({ browser }, info) => {
  test.skip(info.project.name !== "chromium-desk", "Once");
  test.setTimeout(300_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${URL}?background=earth`);
  if (font === "wide") await page.addStyleTag({ content: `*{font-family:Verdana,"DejaVu Sans",sans-serif !important}` });
  const hero = page.locator('[data-testid="hero"]');
  const rocket = ROCKETS["fleet-ship-01"];
  for (const variant of rocket.variants) {
    await page.locator(`[data-testid="maker-${rocket.maker}"]`).click();
    const button = page.locator('[data-testid="rocket-fleet-ship-01"]');
    if (!isListed(rocket.id)) await button.dispatchEvent("click");
    else await button.click();
    await page.locator(`[data-testid="variant-${variant.id}"]`).click();
    await expect(hero).toHaveAttribute("data-variant", variant.id);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const end = await page.evaluate(() => (document.getElementById("facts") as HTMLElement).getBoundingClientRect().top + scrollY);
    expect(end, variant.id).toBeLessThanOrEqual(1010);
  }
  await context.close();
});
