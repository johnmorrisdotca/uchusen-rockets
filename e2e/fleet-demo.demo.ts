// What the demo says about the SPX fleet: the Maker row and the Made by line read "SPX" for every fleet ship, the Rocket list holds the ships by their registry names and no placeholder, and the first tab of a ship's panel under the 3D view is drawn, not a blank pill.
import { expect, type Page, test } from "@playwright/test";
import { ROCKETS } from "../src/rockets.ts";
import { foldPicker } from "./picker.ts";

const URL = "/uchusen-rockets/";
const SHIPS = ["fleet-ship-01", "fleet-kyotori", "fleet-ship-03", "fleet-ship-ariake", "fleet-kaminari", "fleet-emiake", "fleet-romaryu"] as const;
/** What the Rocket row lists for SPX, in the registry's order: the ships, and the repair drone. Kit boxes stay off it. */
const LISTED = ["fleet-ship-01", "fleet-kyotori", "fleet-drone", "fleet-ship-03", "fleet-ship-ariake", "fleet-kaminari", "fleet-emiake", "fleet-romaryu"] as const;
const names = LISTED.map((id) => ROCKETS[id].name);

const pressed = (page: Page, group: string) => page.locator(`#${group} button[aria-pressed="true"]`).allTextContents();
const listed = (page: Page) => page.locator('#rockets button:visible').allTextContents();

test("the Maker row and the Made by line read SPX for every fleet ship opened by address", async ({ page }) => {
  for (const id of SHIPS) {
    // A page's own `load` also waits for the pictures and files it asks for, and one load on a hosted runner took the whole 240 s of the test. What is read here is drawn by the page's script, so the test waits for that.
    await page.goto(`${URL}?rocket=${id}`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => pressed(page, "makers"), { message: id, timeout: 60_000 }).toEqual(["SPX"]);
    await expect(page.locator("#facts")).toContainText(/Made by\s*SPX/i, { timeout: 60_000 });
    await expect(page.locator("#facts")).not.toContainText("SpaceX");
  }
});

test("the Maker row and the Made by line read SPX for every fleet ship chosen from the list", async ({ page }) => {
  await page.goto(URL);
  for (const id of SHIPS) {
    await page.locator('[data-testid="maker-fleet"]').click();
    await page.locator(`[data-testid="rocket-${id}"]`).click();
    expect(await pressed(page, "makers"), id).toEqual(["SPX"]);
    await expect(page.locator("#facts")).toContainText(/Made by\s*SPX/i);
    await expect(page.locator("#facts")).not.toContainText("SpaceX");
  }
});

test("the Rocket list under SPX holds the fleet ships by their registry names, and no placeholder, on the demo and on the code builder", async ({ page }) => {
  await page.goto(URL);
  await foldPicker(page);
  await page.locator('[data-testid="maker-fleet"]').click();
  const got = await listed(page);
  expect(got.every((name) => !name.startsWith("Fleet "))).toBe(true);
  expect(got).toEqual(names);
  await page.goto(`${URL}builder.html`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await foldPicker(page);
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
    await page.goto(`${URL}?rocket=fleet-kaminari`);
    await foldPicker(page);
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
