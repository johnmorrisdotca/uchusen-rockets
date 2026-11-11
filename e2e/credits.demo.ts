// The credits and the page frame: every page of the demo says what it is, has a way home, and shows where its models and pictures come from with a link to every credit, without opening a menu
// (kazoku-ui's <kazoku-page-header> and <kazoku-page-credits>). The bare frame made for an iframe has the small credit line in a corner.
// On a phone the credits must not run off the side of the page or sit on top of anything else.
import { expect, type Locator, test } from "@playwright/test";

const BASE = "/uchusen-rockets/";
const NOTICE = "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/NOTICE.md";
/** Every page with the family's page frame. */
// fleet-compare.html only sends the reader on to compare.html?layout=lineup (and drops the language), so the test opens that.
const PAGES = ["", "journey.html", "compare.html", "compare.html?layout=lineup", "fleet-db.html", "poster.html", "yard.html", "inspect.html", "swarm.html", "beam.html", "embed-page.html", "builder.html"];
const FRAMES = ["embed.html", "embed.html?rocket=starship&variant=v3&look=painted", "embed.html?rocket=falcon-9&variant=block-5&look=thick&flight=1"];

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Nothing the credits sit beside is under them, and they stay inside the width of the page. */
async function insideAndClear(credit: Locator, others: Locator): Promise<void> {
  const page = credit.page();
  const box = (await credit.boundingBox())!;
  const size = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
  // A link that wraps onto two lines has a bounding box as wide as both lines, which "overlaps" a neighbour it does not touch: compare the boxes of each line instead.
  const lines = (node: Locator) => node.evaluate((element) => [...element.getClientRects()].map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })));
  const mine = await lines(credit);
  for (const other of await others.all()) {
    if (!(await other.isVisible())) continue;
    const theirs = await lines(other);
    const hit = mine.some((a) => theirs.some((b) => overlaps(a, b)));
    expect(hit, `the credits sit on top of ${await other.evaluate((node) => node.outerHTML.slice(0, 80))}`).toBe(false);
  }
}

for (const lang of ["en", "ja"] as const) {
  for (const path of PAGES) {
    test(`${path || "the home page"} in ${lang} says what it is, links home, and shows its credits`, async ({ page }) => {
      test.skip(lang === "ja" && path === "builder.html", "the code builder is in English only");
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "domcontentloaded" });
      const header = page.locator("kazoku-page-header");
      await expect(header.locator('[part="line"]')).toContainText(lang === "ja" ? "宇宙船 Uchusen Rockets" : "Uchusen Rockets 宇宙船");
      await expect(header.locator('[part="link"]').first()).toHaveAttribute("href", "index.html");
      const credits = page.locator("kazoku-page-credits");
      await expect(credits.locator('[part="text"]')).toContainText(lang === "ja" ? "制作者" : "credited to their makers");
      const all = credits.locator('[part="link"]');
      await all.scrollIntoViewIfNeeded();
      await expect(all).toBeVisible();
      await expect(all).toHaveAttribute("href", NOTICE);
      await expect(all).toHaveText(lang === "ja" ? "データと出典" : "Data and credits");
      await insideAndClear(all, page.locator("footer a, footer code"));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the page does not run off the side").toBe(true);
    });
  }
  for (const path of FRAMES) {
    test(`${path} in ${lang} names its source in a corner`, async ({ page }) => {
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "domcontentloaded" });
      const credit = page.getByTestId("frame-credit");
      await expect(credit).toBeVisible();
      await expect(credit.locator('[part="link"]')).toHaveText(lang === "ja" ? "データと出典" : "Data and credits");
      await expect(credit.locator('[part="link"]')).toHaveAttribute("href", NOTICE);
      await expect(credit.locator('[part="text"]')).toContainText(lang === "ja" ? "モデルの制作者" : "Models by their makers");
      await insideAndClear(credit, page.locator("button, #credit, #open-in, uchusen-flight"));
    });
  }
}

