// "Put this rocket on your site" is the family's <kazoku-embed-panel>, on the index page and the builder. Nothing the old panels had is gone, and a test counts it: the six ways (CDN script,
// iframe, module, SVG, data address, image link), a note for each, Copy, Save SVG, Save PNG, Open the embed page, and the credit that shows only when the picture needs one; and the panel adds
// React, Vue, Angular and Svelte, a size, the picture beside the code and Read the docs. The picture is the drawing itself: no WebGL context and no iframe of its own.
import { expect, test, type Page } from "@playwright/test";

const URL = "/uchusen-rockets/";
const PANEL = "#embed-panel";
const problems = (page: Page): string[] => {
  const found: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") found.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => found.push(`page: ${error.message}`));
  return found;
};

test("the index panel has the old six ways and the family's, a note each, Copy, Save SVG, Save PNG, the embed page, the docs, a size and a picture", async ({ page }) => {
  const found = problems(page);
  await page.goto(URL);
  const panel = page.locator(PANEL);
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.locator('[role="tab"]')).toHaveText(["HTML", "ES module", "React", "Vue", "Angular", "Svelte", "iframe", "SVG", "Data address", "Image link"]);
  await expect(panel.locator('[part="size-button"]')).toHaveText(["240", "320", "480", "640"]);
  await expect(panel.locator('[part="size-button"][aria-pressed="true"]')).toHaveText("480");
  await expect(panel.locator('[part="copy"]')).toHaveText("Copy code");
  await expect(page.locator("#embed-svg")).toHaveText("Save SVG");
  await expect(page.locator("#embed-png")).toHaveText("Save PNG");
  await expect(panel.locator('[part="open"]')).toHaveText("Open the embed page");
  await expect(panel.locator('[part="docs"]')).toHaveText("Read the docs");
  await expect(panel.locator('[part="preview"] svg')).toHaveCount(1);
  const picture = await panel.locator('[part="preview"] svg').boundingBox();
  expect(picture!.width).toBeGreaterThan(100);
  expect(picture!.height).toBeGreaterThan(picture!.width);
  await expect(panel.locator('[part="preview"] canvas, [part="preview"] iframe, [part="preview"] uchusen-rocket')).toHaveCount(0);
  const code = panel.locator('[part="code"]');
  const note = panel.locator('[part="note"]');
  const ways: [string, string, string][] = [
    ["html", "importmap", "One script from the CDN and the tag"],
    ["module", "rocket.svg(", "The drawing from a script of your own"],
    ["react", "useEffect", "for a page built with a bundler"],
    ["vue", "onMounted", "for a page built with a bundler"],
    ["angular", "CUSTOM_ELEMENTS_SCHEMA", "for a page built with a bundler"],
    ["svelte", "onMount", "for a page built with a bundler"],
    ["iframe", "embed.html?", "No script of your own"],
    ["svg", "<svg", "The drawing itself"],
    ["data", "data:image/svg+xml", "as an address"],
    ["link", "dist/assets/starship-v3.svg", "A link to the file in the package"],
  ];
  for (const [kind, needle, words] of ways) {
    await panel.locator(`button[data-kind="${kind}"]`).click();
    await expect(code, kind).toContainText(needle);
    await expect(note, kind).toContainText(words);
  }
  expect(found).toEqual([]);
});

test("the credit shows only for a painted rocket, and goes in the framework tabs too", async ({ page }) => {
  await page.goto(`${URL}?look=line`);
  const panel = page.locator(PANEL);
  await expect(panel.locator('[part="credits"]')).toBeHidden();
  await page.locator('[data-testid="look-painted"]').click();
  await expect(panel.locator('[part="credits"]')).toContainText("Clarence365");
  for (const kind of ["react", "vue", "angular", "svelte", "iframe"]) {
    await panel.locator(`button[data-kind="${kind}"]`).click();
    await expect(panel.locator('[part="code"]'), kind).toContainText("Clarence365");
  }
});

test("a size sets the iframe's width and the picture's, and the picture is the drawing", async ({ page }) => {
  await page.goto(URL);
  const panel = page.locator(PANEL);
  await panel.scrollIntoViewIfNeeded();
  await panel.locator('button[data-kind="iframe"]').click();
  await panel.locator('[part="size-button"]', { hasText: "240" }).click();
  await expect(panel.locator('[part="code"]')).toContainText("max-width:240px");
  await panel.locator('button[data-kind="link"]').click();
  await expect(panel.locator('[part="code"]')).toContainText('width="240" height="320"');
  await expect(panel.locator('[part="preview"] svg')).toHaveCount(1);
});

test("copy puts the code on the clipboard, and Save SVG still saves the picture", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desk", "One browser's clipboard and downloads are enough");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(URL);
  await page.locator(`${PANEL} [part="copy"]`).click();
  await expect(page.locator(`${PANEL} .status`)).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("<uchusen-rocket");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#embed-svg").click()]);
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
});

test("the builder page has the same panel, under its strict policy, with no error", async ({ page }) => {
  const found = problems(page);
  page.on("response", (response) => {
    if (response.status() >= 400) found.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${URL}builder.html`);
  await page.waitForSelector('html[data-ready="true"]');
  const panel = page.locator(PANEL);
  await expect(panel.locator('[role="tab"]')).toHaveText(["HTML", "ES module", "React", "Vue", "Angular", "Svelte", "iframe", "SVG", "Data address", "Image link"]);
  await expect(panel.locator('[part="preview"] svg')).toHaveCount(1);
  await expect(panel.locator('[part="copy"]')).toHaveText("Copy code");
  await expect(panel.locator('[part="open"]')).toHaveAttribute("href", /^embed\.html\?rocket=starship/);
  await expect(panel.locator('[part="docs"]')).toHaveText("Read the docs");
  await page.locator('[data-testid="look-painted"]').click();
  await expect(panel.locator('[part="credits"]')).toContainText("Keep this credit with a painted rocket");
  await panel.locator('button[data-kind="vue"]').click();
  await expect(panel.locator('[part="code"]')).toContainText("onMounted");
  expect(found).toEqual([]);
});
