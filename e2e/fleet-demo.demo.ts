// What the demo says about the SPX fleet: the Rocket list holds the ships by their registry names and no placeholder, and the first tab of a ship's panel under the 3D view is drawn, not a blank pill.
import { expect, type Page, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";
const SHIPS = ["fleet-ship-03", "fleet-ship-ariake", "fleet-02"] as const;
const names = SHIPS.map((id) => ROCKETS[id].name);

const listed = (page: Page) => page.locator('#rockets button:visible').allTextContents();

test("the Rocket list under SPX holds the fleet ships by their registry names, and no placeholder, on the demo and on the code builder", async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-testid="maker-fleet"]').click();
  expect(await listed(page)).toEqual(names);
  await page.goto(`${URL}builder.html`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await page.locator('[data-testid="maker-fleet"]').click();
  expect(await page.locator("#rockets button").allTextContents()).toEqual(names);
  expect(names.join(" ")).toContain("Miyamoto, SPX-452");
});

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
