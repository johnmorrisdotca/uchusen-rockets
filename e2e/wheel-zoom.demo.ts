// Ctrl or Command and the wheel zooms every stage. The pages are the site's own files, one test for each, so a slow machine cuts off one page and not the whole walk.
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";

const BASE = "/uchusen-rockets/";
// A drawing in a panel is not a stage. A rocket, a lineup, the journey or the yard is, and it has to wear the binder's mark.
const STAGE = "uchusen-rocket:not([mode='drawing']), uchusen-lineup, .jr-stage, #yard-view";

const zoomOf = async (stage: Locator): Promise<number> => {
  const id = await stage.getAttribute("id");
  const text = await stage.page().locator(`kazoku-view-controls[for="${id}"]`).evaluate((node) => node.shadowRoot?.querySelector("[data-o='zoom']")?.textContent ?? "");
  const value = Number(text.replace(/[^\d.]+/g, ""));
  if (!Number.isFinite(value)) throw new Error(`no zoom readout for #${id}`);
  return value;
};

const place = async (page: Page): Promise<{ y: number; scale: number }> => page.evaluate(() => ({
  y: Math.round(window.scrollY),
  scale: window.visualViewport?.scale ?? 1,
}));

const SITE = fileURLToPath(new URL("../site/", import.meta.url));
// embed.html is the bare frame of an iframe: no page bar, its one rocket is the whole page, and no page links to it
const FRAMES = new Set(["embed.html"]);
const PAGES = readdirSync(SITE).filter((name) => name.endsWith(".html") && !FRAMES.has(name)).sort();

test("the site holds the pages the other checks lean on", () => {
  expect(PAGES.length).toBeGreaterThan(3);
  expect(PAGES, "the journey").toContain("journey.html");
  expect(PAGES, "the compare line-up").toContain("fleet-compare.html");
});

for (const href of PAGES) {
  test(`ctrl and the wheel zooms every stage of ${href}, and the page does not scroll`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`${BASE}${href}`, { waitUntil: "load" });
    await foldPicker(page);
    const loose = await page.locator(STAGE).evaluateAll((nodes) => nodes.flatMap((node) => (node.closest("[data-view-stage]") ? [] : [node.id || node.tagName])));
    expect(loose, href).toEqual([]);
    const stages = page.locator("[data-view-stage]");
    const count = await stages.count();
    if (count === 0) {
      expect(await page.locator(STAGE).count(), href).toBe(0);
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const stage = stages.nth(index);
      if (!(await stage.isVisible())) continue;
      await stage.scrollIntoViewIfNeeded();
      await stage.hover();
      const before = await zoomOf(stage);
      const top = await stage.evaluate((node) => node.scrollTop);
      const scroll = await place(page);
      await page.keyboard.down("Control");
      await page.mouse.wheel(0, -240);
      await page.keyboard.up("Control");
      await expect.poll(() => zoomOf(stage), { message: `${href} zoom in` }).toBeGreaterThan(before);
      const drawn = stage.locator("#jr-picture, uchusen-lineup");
      if (await drawn.count()) {
        const scale = await drawn.first().evaluate((node) => {
          const own = new DOMMatrix(getComputedStyle(node).transform).a;
          const svg = node.shadowRoot?.querySelector("svg");
          const inner = svg instanceof SVGElement ? new DOMMatrix(getComputedStyle(svg).transform).a : 1;
          return Math.max(own, inner);
        });
        expect(scale, `${href} picture`).toBeGreaterThan(1);
      }
      const zoomed = await zoomOf(stage);
      expect(await stage.evaluate((node) => node.scrollTop), href).toBe(top);
      expect(await place(page), href).toEqual(scroll);
      await page.keyboard.down("Control");
      await page.mouse.wheel(0, 240);
      await page.keyboard.up("Control");
      await expect.poll(() => zoomOf(stage), { message: `${href} zoom out` }).toBeLessThan(zoomed);
      expect(await stage.evaluate((node) => node.scrollTop), href).toBe(top);
      expect(await place(page), href).toEqual(scroll);
    }
  });
}
