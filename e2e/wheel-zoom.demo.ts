// Ctrl or Command and the wheel zooms every stage. The pages come from the page bar, not from a list kept here.
import { expect, type Locator, type Page, test } from "@playwright/test";

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

test("ctrl and the wheel zooms every stage in the page list, and the page does not scroll", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(`${BASE}index.html`, { waitUntil: "load" });
  const listed = await page.locator('[data-testid="page-links"] a').evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "").filter((href) => href !== ""));
  expect(listed.length).toBeGreaterThan(3);
  const pending = [...listed];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const href = pending.shift();
    if (!href || seen.has(href)) continue;
    seen.add(href);
    await page.goto(`${BASE}${href}`, { waitUntil: "load" });
    if (!href.includes("docs/")) {
      const more = await page.locator('a[href$=".html"]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "").filter((one) => one !== "" && !one.includes("/") && !one.startsWith("http")));
      for (const one of more) if (!seen.has(one)) pending.push(one);
    }
    const loose = await page.locator(STAGE).evaluateAll((nodes) => nodes.flatMap((node) => (node.closest("[data-view-stage]") ? [] : [node.id || node.tagName])));
    expect(loose, href).toEqual([]);
    const stages = page.locator("[data-view-stage]");
    const count = await stages.count();
    if (count === 0) {
      expect(await page.locator(STAGE).count(), href).toBe(0);
      continue;
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
        const scale = await drawn.first().evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);
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
  }
  expect(seen.has("journey.html"), "the page list").toBe(true);
  expect(seen.has("fleet-compare.html"), "the compare line-up").toBe(true);
});
