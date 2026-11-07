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

/** Variance of the picture's brightness. A painted, lit surface is not one flat colour. */
async function spread(page: Page, selector: string): Promise<number> {
  const data = (await page.locator(selector).screenshot()).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;
    const g = canvas.getContext("2d");
    if (!g) return 0;
    g.drawImage(img, 0, 0, 80, 80);
    const px = g.getImageData(0, 0, 80, 80).data;
    let n = 0;
    let sum = 0;
    let sum2 = 0;
    for (let i = 0; i < px.length; i += 4) {
      const y = (px[i] + px[i + 1] + px[i + 2]) / 3;
      sum += y;
      sum2 += y * y;
      n += 1;
    }
    const mean = sum / n;
    return sum2 / n - mean * mean;
  }, data);
}

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
    if (href === "fleet-compare.html") await page.waitForURL(/layout=lineup/);
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
    expect(await spread(page, "#hero")).toBeGreaterThan(20);
  }
});
