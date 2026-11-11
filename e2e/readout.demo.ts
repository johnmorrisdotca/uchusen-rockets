// The zoom readout between the buttons: it reads the view's zoom in kazoku-ui's form (1×, 2.4×) after the buttons, the wheel and a pinch, and a polite live region says it once the zoom settles.
import { expect, type Locator, type Page, test } from "@playwright/test";
import { zoomText } from "@johnmorrisdotca/kazoku-ui/view-controls";
import { foldPicker } from "./picker.ts";

const BASE = "/uchusen-rockets/";

// Every page with its own view bar, and the bar's stage.
const PAGES: readonly { page: string; stage: string }[] = [
  { page: "index.html", stage: "#hero" },
  { page: "fleet-db.html", stage: "#hero" },
  { page: "yard.html", stage: "#yard-view" },
  { page: "journey.html", stage: ".jr-stage" },
  { page: "inspect.html", stage: "#hero" },
  { page: "fleet-compare.html", stage: "#cmp-view" },
  { page: "poster.html", stage: "#poster-stage" },
  { page: "swarm.html", stage: "#swarm-stage" },
  { page: "beam.html", stage: "#beam-stage" },
];

type Bar = HTMLElement & { state: { zoom: number } };

const bar = async (page: Page, stage: string): Promise<Locator> => {
  const id = await page.locator(stage).first().getAttribute("id");
  return page.locator(`kazoku-view-controls[for="${id}"]`).first();
};
const shown = (b: Locator) => b.evaluate((node) => node.shadowRoot?.querySelector("[data-o='zoom']")?.textContent ?? "");
const live = (b: Locator) => b.evaluate((node) => node.shadowRoot?.querySelector("[data-live]")?.textContent ?? "");
const zoomNow = (b: Locator) => b.evaluate((node) => (node as Bar).state.zoom);

const pinch = (stage: Locator) => stage.evaluate((node) => {
  const r = node.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const send = (type: string, id: number, x: number) => node.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, clientX: x, clientY: cy, pointerType: "touch", isPrimary: id === 1 }));
  send("pointerdown", 1, cx - 24);
  send("pointerdown", 2, cx + 24);
  send("pointermove", 1, cx - 90);
  send("pointermove", 2, cx + 90);
  send("pointerup", 1, cx - 90);
  send("pointerup", 2, cx + 90);
});

for (const one of PAGES) {
  test(`${one.page}: the readout follows the buttons, the wheel and a pinch, and is announced`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`${BASE}${one.page}`);
    await foldPicker(page);
    const stage = page.locator(one.stage).first();
    const b = await bar(page, one.stage);
    await expect(b).toBeVisible();
    await expect.poll(() => shown(b)).toBe("1×");
    expect(await b.evaluate((node) => node.shadowRoot?.querySelector("[data-live]")?.getAttribute("aria-live"))).toBe("polite");
    expect(await b.evaluate((node) => node.shadowRoot?.querySelector("[data-live]")?.getAttribute("role"))).toBe("status");

    // the plus button
    await b.evaluate((node) => (node.shadowRoot?.querySelector("[data-b='in']") as HTMLButtonElement).click());
    await expect.poll(async () => (await zoomNow(b)) > 1).toBe(true);
    await expect.poll(async () => (await shown(b)) === zoomText(await zoomNow(b))).toBe(true);
    expect(await shown(b)).not.toBe("1×");
    await expect.poll(async () => (await live(b)).endsWith(await shown(b))).toBe(true);

    // the wheel (Ctrl and the wheel zooms)
    const afterButton = await zoomNow(b);
    await stage.scrollIntoViewIfNeeded();
    await stage.hover();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -240);
    await page.keyboard.up("Control");
    await expect.poll(async () => (await zoomNow(b)) > afterButton).toBe(true);
    await expect.poll(async () => (await shown(b)) === zoomText(await zoomNow(b))).toBe(true);
    await expect.poll(async () => (await live(b)).endsWith(await shown(b))).toBe(true);

    // a pinch, from Fit: the wheel may have reached the page's top zoom
    await b.evaluate((node) => (node.shadowRoot?.querySelector("[data-b='fit']") as HTMLButtonElement).click());
    await expect.poll(() => shown(b)).toBe("1×");
    const afterWheel = await zoomNow(b);
    await pinch(stage);
    await expect.poll(async () => (await zoomNow(b)) > afterWheel).toBe(true);
    await expect.poll(async () => (await shown(b)) === zoomText(await zoomNow(b))).toBe(true);
    await expect.poll(async () => (await live(b)).endsWith(await shown(b))).toBe(true);

    // Fit brings it back
    await b.evaluate((node) => (node.shadowRoot?.querySelector("[data-b='fit']") as HTMLButtonElement).click());
    await expect.poll(() => shown(b)).toBe("1×");
  });
}
