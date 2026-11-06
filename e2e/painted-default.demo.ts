// Painted is the look a page opens on. A line drawing is a choice. The yard is a scene and the docs are prose, so they have no look. The drawing builder on the Rockets page is a thick-line drawing on purpose.
import { expect, test, type Page } from "@playwright/test";

const URL = "/uchusen-rockets/";

/** A page in the bar that is not a rocket view. */
const NOT_A_ROCKET = new Set(["yard.html", "docs/index.html"]);

/** The craft a reader sees first. A page in the bar that is missing here fails the test. */
const CRAFT: Record<string, string> = {
  "index.html": "#hero",
  "compare.html": "#hero",
  "fleet-db.html": "#hero",
  "builder.html": "#rocket",
  "embed-page.html": "#rocket",
  "embed.html": "#rocket",
  "fleet-compare.html": "#lineup",
};

async function painted(page: Page, selector: string): Promise<void> {
  const craft = page.locator(selector);
  await expect(craft).toHaveAttribute("look", "painted");
  if (selector !== "#lineup") await expect(craft).toHaveAttribute("data-look", "painted");
}

test("every page opens painted, and a part stays painted", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  const bar = await page.locator('[data-testid="page-links"] a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
  for (const href of bar) {
    if (NOT_A_ROCKET.has(href)) continue;
    expect(CRAFT[href] ?? (href === "journey.html" ? "journey" : ""), `${href} has no painted check`).not.toBe("");
  }
  const pages = [...new Set([...bar, "embed.html", "fleet-compare.html", "poster.html"])];
  for (const href of pages) {
    if (NOT_A_ROCKET.has(href)) continue;
    await page.goto(href === "index.html" ? URL : `${URL}${href}`);
    if (href === "poster.html") {
      await expect(page.locator("#look")).toHaveText("Line drawing");
      continue;
    }
    if (href === "journey.html") {
      await expect(page.getByTestId("stage")).toHaveAttribute("data-look", "painted");
      await expect(page.getByTestId("painted-rocket")).toHaveAttribute("look", "painted");
      continue;
    }
    await painted(page, CRAFT[href] as string);
    if (href === "index.html") await painted(page, "#lineup");
    if (href === "builder.html" || href === "embed-page.html") {
      await page.getByTestId("show-apart").click();
      await painted(page, "#rocket");
    }
  }
  await page.goto(URL);
  const hero = page.locator("#hero");
  for (const id of ["show-apart", "show-booster", "show-ship"]) {
    await page.getByTestId(id).click();
    await painted(page, "#hero");
    await expect.poll(() => hero.getAttribute("data-painted"), { timeout: 90_000 }).toMatch(/^(model|mixed|code)$/);
    await expect.poll(() => hero.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector("canvas")?.dataset.look ?? ""), { timeout: 90_000 }).toBe("painted");
  }
});
