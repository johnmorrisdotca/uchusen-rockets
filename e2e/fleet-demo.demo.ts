// What the demo says about the SPX fleet. The first tab of a ship's panel under the 3D view is drawn, not a blank pill.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

/** The spread of light in the middle of a picture of the tab: a pill whose fill and words are one colour has none. */
async function spread(page: Page, png: Buffer): Promise<number> {
  const scratch = await page.context().newPage();
  try {
    return await scratch.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const draw = canvas.getContext("2d")!;
      draw.drawImage(image, 0, 0);
      const inset = Math.round(Math.min(image.width, image.height) * 0.25);
      const { data } = draw.getImageData(inset, inset, image.width - 2 * inset, image.height - 2 * inset);
      let low = 255;
      let high = 0;
      for (let i = 0; i < data.length; i += 4) {
        const light = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        low = Math.min(low, light);
        high = Math.max(high, light);
      }
      return high - low;
    }, png.toString("base64"));
  } finally {
    await scratch.close();
  }
}

for (const scheme of ["dark", "light"] as const) {
  test(`the chosen tab of a ship's panel under the 3D view is readable in the ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${URL}?rocket=fleet-02`);
    const tab = page.locator("#hero").locator('.panel [role="tab"][aria-selected="true"]');
    await expect(tab).toHaveText("Specification", { timeout: 60_000 });
    await tab.scrollIntoViewIfNeeded();
    expect(await spread(page, await tab.screenshot())).toBeGreaterThan(80);
    await page.locator("#hero").locator('.panel [data-tab="history"]').click();
    const next = page.locator("#hero").locator('.panel [role="tab"][aria-selected="true"]');
    await expect(next).toHaveText("History");
    expect(await spread(page, await next.screenshot())).toBeGreaterThan(80);
  });
}
