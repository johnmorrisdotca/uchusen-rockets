// The Embed link in the one page bar opens the shell page. That page is the builder's screen with the choice in the address.
// The bare frame stays embed.html, and opened on its own it offers the shell page.
import { expect, test } from "@playwright/test";

const BASE = "/uchusen-rockets/";

test("Embed in the bar opens the shell page, and the bare frame points back to it", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('[data-testid="page-links"] a[data-say="pageEmbed"]')).toHaveAttribute("href", "embed-page.html");
  await page.goto(`${BASE}embed-page.html?rocket=falcon-9&variant=block-5&look=thick`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const rocket = page.locator("#rocket");
  await expect(rocket).toHaveAttribute("rocket", "falcon-9");
  await expect(rocket).toHaveAttribute("look", "thick");
  await expect(page.locator('[data-testid="page-links"] a[aria-current="page"]')).toHaveText("Embed");
  await page.locator('[data-testid="look-painted"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("look")).toBe("painted");
  await expect(page.locator("#embed-panel")).toBeVisible();
  const open = await page.locator("#embed-panel").evaluate((node) => (node as { openHref?: string }).openHref ?? "");
  expect(open).toMatch(/^embed\.html\?/);
  expect(open).toContain("look=painted");
  await page.goto(`${BASE}embed.html?rocket=falcon-9&variant=block-5&look=thick`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const back = page.locator('[data-testid="open-in"] a');
  await expect(back).toBeVisible();
  await expect(back).toHaveText("Open in Uchusen Rockets");
  await expect(back).toHaveAttribute("href", /embed-page\.html\?.*look=thick/);
  await page.goto(BASE);
  await page.evaluate(() => {
    const frame = document.createElement("iframe");
    frame.id = "bare-frame";
    frame.src = "embed.html?rocket=starship&variant=v3";
    document.body.append(frame);
  });
  const framed = page.frameLocator("#bare-frame");
  await expect(framed.locator("#rocket")).toHaveAttribute("rocket", "starship");
  await expect(framed.locator('[data-testid="open-in"]')).toBeHidden();
});

test("the builder's bar comes from the same row and still leaves the address alone", async ({ page }) => {
  await page.goto(`${BASE}builder.html`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  const bar = page.locator('[data-testid="page-links"]');
  await expect(bar.locator("a")).toHaveText(["Rockets", "Compare", "Journey", "Fleet", "Yard", "Builder", "Docs", "Embed"]);
  await expect(bar.locator('a[aria-current="page"]')).toHaveText("Builder");
  await expect(bar.locator('a[data-say="pageEmbed"]')).toHaveAttribute("href", "embed-page.html");
  await expect(page.locator("#rocket")).toBeAttached();
  expect(new URL(page.url()).search).toBe("");
});

test("the builder and the Embed page name the view, the parts and the engines as the Rockets page does", async ({ page }) => {
  await page.goto(`${BASE}builder.html`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByTestId("view-three-quarter")).toHaveText("Three-quarter");
  await expect(page.getByTestId("view-front")).toHaveText("Front");
  await expect(page.getByTestId("view-back")).toHaveText("Back");
  await expect(page.getByTestId("view-side")).toHaveText("Side");
  await expect(page.getByTestId("view-below")).toHaveText("Below");
  await expect(page.getByTestId("show-together")).toHaveText("Together");
  await expect(page.getByTestId("show-apart")).toHaveText("Apart");
  await expect(page.getByTestId("show-booster")).toHaveText("Super Heavy");
  await expect(page.getByTestId("show-ship")).toHaveText("Ship");
  await expect(page.getByTestId("engines-off")).toHaveText("Dark");
  await expect(page.getByTestId("engines-on")).toHaveText("Lit");
  await page.goto(`${BASE}embed-page.html?lang=ja`);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
  await expect(page.getByTestId("view-front")).toHaveText("正面");
  await expect(page.getByTestId("show-booster")).toHaveText("Super Heavy（1 段目）");
  await expect(page.getByTestId("engines-on")).toHaveText("点火");
  await expect(page.getByTestId("show-together")).toHaveText("合体");
});
