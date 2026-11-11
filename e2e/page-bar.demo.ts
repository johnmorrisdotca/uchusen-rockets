// The page bar under the header: every page in it links every page in it, marks only its own and looks pressed there, and stays one row on a desk, beside the page frame's line.
import { expect, test } from "@playwright/test";

const BASE = "/uchusen-rockets/";

/** What the bar offers, in order, and the page each link opens. */
const PAGES: readonly [string, string][] = [
  ["Rockets", "index.html"],
  ["Compare", "compare.html"],
  ["Journey", "journey.html"],
  ["Fleet", "fleet-db.html"],
  ["Yard", "yard.html"],
  ["Builder", "builder.html"],
  ["Docs", "docs/index.html"],
  ["Embed", "embed-page.html"],
];

test("every page's bar links every page, marks only its own, on one row", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const titles = new Set<string>();
  for (const [name, file] of PAGES) {
    await page.goto(`${BASE}${file}`, { waitUntil: "domcontentloaded" });
    titles.add(await page.title());
    // the docs are their own site, with their own bar
    if (file === "docs/index.html") continue;
    const bar = page.getByTestId("page-links");
    const links = await bar.locator("a").evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent ?? "", href: node.getAttribute("href") ?? "", current: node.getAttribute("aria-current") ?? "" })));
    expect(links.map((link) => link.text), file).toEqual(PAGES.map(([label]) => label));
    expect(links.map((link) => link.href), file).toEqual(PAGES.map(([, href]) => href));
    expect(links.filter((link) => link.current === "page").map((link) => link.text), file).toEqual([name]);
    const looks = await bar.locator("a").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    const here = PAGES.findIndex(([label]) => label === name);
    for (const [index, look] of looks.entries()) if (index !== here) expect(look, `${file}: ${PAGES[index]?.[0]} must not look pressed`).not.toBe(looks[here]);
    const tops = await bar.locator("a, button").evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
    expect(new Set(tops).size, `${file}: ${tops.join(",")}`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), file).toBe(true);
  }
  // each link opens a page of its own
  expect(titles.size).toBe(PAGES.length);
});
