// The credits: every page of the demo shows where its models and pictures come from, and a link to every credit, without opening a menu. The family pages carry them in the footer, the bare frame made for an iframe in a corner.
// On a phone the credits must not run off the side of the page or sit on top of anything else.
import { expect, type Locator, test } from "@playwright/test";

const BASE = "/uchusen-rockets/";
const NOTICE = "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/NOTICE.md";
/** Every page with the family's footer. The code builder has a footer of its own, in English only. */
const PAGES = ["", "journey.html", "compare.html", "fleet-compare.html", "fleet-db.html", "poster.html", "yard.html", "inspect.html", "swarm.html", "beam.html", "embed-page.html"];
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
  for (const other of await others.all()) {
    if (!(await other.isVisible())) continue;
    const there = await other.boundingBox();
    if (there) expect(overlaps(box, there), `the credits sit on top of ${await other.evaluate((node) => node.outerHTML.slice(0, 80))}`).toBe(false);
  }
}

for (const lang of ["en", "ja"] as const) {
  for (const path of PAGES) {
    test(`${path || "the home page"} in ${lang} shows its credits in the footer`, async ({ page }) => {
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "domcontentloaded" });
      const footer = page.locator("footer");
      await expect(footer.locator('[data-say="creditLine"]')).toContainText(lang === "ja" ? "制作者" : "credited to their makers");
      const all = footer.locator(`a[href="${NOTICE}"]`);
      await all.scrollIntoViewIfNeeded();
      await expect(all).toBeVisible();
      await expect(all).toContainText(lang === "ja" ? "クレジット" : "credit");
      await insideAndClear(all, footer.locator(`a:not([href="${NOTICE}"]), code`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the page does not run off the side").toBe(true);
    });
  }
  for (const path of FRAMES) {
    test(`${path} in ${lang} names its source in a corner`, async ({ page }) => {
      await page.goto(`${BASE}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "domcontentloaded" });
      const credit = page.getByTestId("frame-credit");
      await expect(credit).toBeVisible();
      await expect(credit).toContainText(lang === "ja" ? "クレジット一覧" : "All credits");
      await expect(credit).toHaveAttribute("href", NOTICE);
      await insideAndClear(credit, page.locator("button, a:not([data-testid='frame-credit']), #credit, uchusen-flight"));
    });
  }
}

test("the code builder shows its credits in its footer", async ({ page }) => {
  await page.goto(`${BASE}builder.html`, { waitUntil: "domcontentloaded" });
  const all = page.locator("footer").locator(`a[href="${NOTICE}"]`);
  await all.scrollIntoViewIfNeeded();
  await expect(all).toBeVisible();
  await expect(page.locator("footer")).toContainText("credited to their makers");
  await insideAndClear(all, page.locator(`footer a:not([href="${NOTICE}"])`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the page does not run off the side").toBe(true);
});
