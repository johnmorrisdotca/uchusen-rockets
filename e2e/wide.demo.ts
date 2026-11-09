// The shared Wide layout: the toggle is on every demo page with a side panel, the choice stays in the address and on the device, the T key switches it, the panel moves below the view, and a phone stays one column.
import { expect, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";

const BASE = "/uchusen-rockets/";

type Shape = { page: string; view: string; panel: string; choose: string };
const SHAPES: readonly Shape[] = [
  { page: "index.html", view: ".stage-box .view-space", panel: ".stage-row > .panel", choose: '[data-testid="variant-v2"]' },
  { page: "fleet-db.html", view: ".stage-box .view-space", panel: ".stage-row > .panel", choose: "#db-ships .chip:nth-child(2)" },
  { page: "yard.html", view: ".yard-stage", panel: ".yard-side", choose: '[data-testid="yard-night"]' },
  { page: "journey.html", view: ".jr-stage", panel: ".jr-side", choose: "#to .chip:nth-child(2)" },
  { page: "builder.html", view: ".stage-box .view-space", panel: ".stage-row > .panel", choose: "#rockets .chip:nth-child(2)" },
  { page: "embed-page.html", view: ".stage-box .view-space", panel: ".stage-row > .panel", choose: "#rockets .chip:nth-child(2)" },
];

const box = (page: Page, selector: string) => page.locator(selector).first().evaluate((node) => {
  const r = node.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
});
const wideParam = (page: Page) => new globalThis.URL(page.url()).searchParams.get("wide");
const dataWide = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-wide"));

for (const shape of SHAPES) {
  test(`${shape.page}: Wide puts the panel below the view, stays in the address, and the T key switches back`, async ({ page }) => {
    test.skip(test.info().project.name !== "chromium-desk", "A desk; the phone has its own test");
    await page.goto(`${BASE}${shape.page}`);
    await foldPicker(page);
    const toggle = page.getByTestId("wide");
    await expect(toggle).toBeVisible();

    const view = await box(page, shape.view);
    const panel = await box(page, shape.panel);
    expect(panel.left, "Normal: the panel is beside the view").toBeGreaterThanOrEqual(view.right - 1);
    expect(await dataWide(page)).toBeNull();
    expect(wideParam(page)).toBeNull();

    await toggle.click();
    await expect.poll(() => dataWide(page)).toBe("on");
    await expect.poll(() => wideParam(page)).toBe("on");
    await expect.poll(async () => (await box(page, shape.view)).width).toBeGreaterThan(view.width + 100);
    const wide = await box(page, shape.view);
    const below = await box(page, shape.panel);
    expect(below.top, "Wide: the panel is below the view").toBeGreaterThanOrEqual(wide.bottom - 1);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    expect(wide.height, "no taller than 80vh").toBeLessThanOrEqual(viewport.height * 0.8 + 1);

    // a choice made in Wide keeps Wide in the address
    await page.locator(shape.choose).first().click();
    await expect.poll(() => wideParam(page)).toBe("on");
    expect(await dataWide(page)).toBe("on");

    // the T key switches back, and the parameter goes
    await page.locator("body").press("t");
    await expect.poll(() => dataWide(page)).toBeNull();
    await expect.poll(() => wideParam(page)).toBeNull();
    await expect.poll(async () => (await box(page, shape.view)).width).toBeLessThan(wide.width - 100);
  });
}

test("an address with wide=on opens Wide, and the choice follows to another page on this device", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium-desk", "A desk");
  await page.goto(`${BASE}index.html?wide=on&picker=off`);
  await expect.poll(() => dataWide(page)).toBe("on");
  await expect(page.getByTestId("wide")).toContainText(/Normal/);
  await page.goto(`${BASE}index.html?picker=off`);
  await expect.poll(() => dataWide(page)).toBeNull();
  await page.getByTestId("wide").click();
  await expect.poll(() => dataWide(page)).toBe("on");
  await page.goto(`${BASE}yard.html`);
  await expect.poll(() => dataWide(page)).toBe("on");
  await page.goto(`${BASE}yard.html?wide=off`);
  await expect.poll(() => dataWide(page)).toBeNull();
});

test("Wide draws the rocket again at the new size", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium-desk", "A desk");
  await page.goto(`${BASE}index.html?picker=off`);
  const hero = page.getByTestId("hero");
  const before = await hero.evaluate((node) => node.getBoundingClientRect().height);
  await page.getByTestId("wide").click();
  await expect.poll(() => hero.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(before + 50);
  const side = await hero.evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const r = node.getBoundingClientRect();
    return canvas ? { w: canvas.width, h: canvas.height, boxW: r.width, boxH: r.height } : null;
  });
  if (side) {
    expect(side.w * side.h).toBeLessThanOrEqual(6_000_000);
    expect(Math.max(side.w, side.h)).toBeLessThanOrEqual(4096);
  }
});

test("on a phone the toggle is hidden and Wide changes nothing: one column, no sideways scroll", async ({ page }) => {
  test.skip(test.info().project.name === "chromium-desk", "A phone");
  for (const shape of SHAPES) {
    await page.goto(`${BASE}${shape.page}?wide=on&picker=off`);
    await expect(page.getByTestId("wide")).toBeHidden();
    const view = await box(page, shape.view);
    const panel = await box(page, shape.panel);
    expect(panel.top, `${shape.page}: the panel is below the view`).toBeGreaterThanOrEqual(view.bottom - 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${shape.page}: no sideways scroll`).toBeLessThanOrEqual(1);
  }
});
