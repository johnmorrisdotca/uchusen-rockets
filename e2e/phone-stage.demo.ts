// A phone: a tap or a pinch on a stage turns that view and leaves the Safari page at scale 1. Once a rocket is in 3D, its still picture is gone.
import { expect, type Locator, type Page, test } from "@playwright/test";

const BASE = "/uchusen-rockets/";

const zoomOf = async (stage: Locator): Promise<number> => {
  const id = await stage.getAttribute("id");
  const text = await stage.page().locator(`kazoku-view-controls[for="${id}"]`).evaluate((node) => node.shadowRoot?.querySelector("[data-o='zoom']")?.textContent ?? "");
  const value = Number(text.replace(/[^\d.]+/g, ""));
  if (!Number.isFinite(value)) throw new Error(`no zoom readout for #${id}`);
  return value;
};

const scaleOf = (page: Page) => page.evaluate(() => window.visualViewport?.scale ?? 1);

/** Two fingers spread on the stage. The view zooms; the page must not. */
const pinch = (stage: Locator) => stage.evaluate((node) => {
  const box = node.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const send = (type: string, id: number, x: number, y: number) => node.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: id,
    clientX: x,
    clientY: y,
    pointerType: "touch",
    isPrimary: id === 1,
  }));
  send("pointerdown", 1, cx - 24, cy);
  send("pointerdown", 2, cx + 24, cy);
  send("pointermove", 1, cx - 90, cy);
  send("pointermove", 2, cx + 90, cy);
  send("pointerup", 1, cx - 90, cy);
  send("pointerup", 2, cx + 90, cy);
});

test("a tap or a pinch on a stage does not zoom the page, and the line-up bar sits on the stage", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(`${BASE}index.html`, { waitUntil: "load" });
  const listed = await page.locator('[data-testid="page-links"] a').evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "").filter((href) => href !== ""));
  const pending = [...listed];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const href = pending.shift();
    if (!href || seen.has(href)) continue;
    seen.add(href);
    await page.goto(`${BASE}${href}`, { waitUntil: "load" });
    const pageTouch = await page.evaluate(() => [getComputedStyle(document.documentElement).touchAction, getComputedStyle(document.body).touchAction]);
    expect(pageTouch, href).not.toContain("none");
    if (!href.includes("docs/")) {
      const more = await page.locator('a[href$=".html"]').evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "").filter((one) => one !== "" && !one.includes("/") && !one.startsWith("http")));
      for (const one of more) if (!seen.has(one)) pending.push(one);
    }
    const stages = page.locator("[data-view-stage]");
    const count = await stages.count();
    for (let index = 0; index < count; index += 1) {
      const stage = stages.nth(index);
      if (!(await stage.isVisible())) continue;
      await stage.scrollIntoViewIfNeeded();
      const id = await stage.getAttribute("id");
      const touch = await stage.evaluate((node) => getComputedStyle(node).touchAction);
      expect(touch, href).toBe("none");
      const blocked = await stage.evaluate((node) => {
        const event = new Event("gesturestart", { bubbles: true, cancelable: true });
        node.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(blocked, href).toBe(true);
      const bar = page.locator(`kazoku-view-controls[for="${id}"]`);
      await expect(bar, href).toBeVisible();
      const button = bar.locator("[data-b='in']");
      await expect(button, href).toBeVisible();
      const buttonTouch = await button.evaluate((node) => {
        const root = node.getRootNode();
        const host = root instanceof ShadowRoot ? root.host.tagName : "light";
        return `${getComputedStyle(node).touchAction} ${host}`;
      });
      expect(buttonTouch, href).toBe("manipulation KAZOKU-VIEW-CONTROLS");
      await button.tap({ timeout: 5_000 });
      await button.tap({ timeout: 5_000 });
      expect(await scaleOf(page), href).toBe(1);
      const before = await zoomOf(stage);
      await pinch(stage);
      await expect.poll(() => zoomOf(stage), { message: `${href} pinch` }).toBeGreaterThan(before);
      expect(await scaleOf(page), href).toBe(1);
      if (href !== "fleet-compare.html") continue;
      const beside = await stage.evaluate((node) => {
        const bar = node.ownerDocument.querySelector(`kazoku-view-controls[for="${node.id}"]`);
        return bar !== null && (node.contains(bar) || node.nextElementSibling === bar);
      });
      if (!beside) continue;
      const seated = await stage.evaluate((node) => {
        const bar = node.ownerDocument.querySelector(`kazoku-view-controls[for="${node.id}"]`);
        const line = node.querySelector("uchusen-lineup");
        if (!(bar instanceof HTMLElement) || !(line instanceof HTMLElement)) return "missing";
        if (bar.parentElement !== node) return "outside";
        return bar.offsetTop - (line.offsetTop + line.offsetHeight);
      });
      expect(typeof seated === "number" && seated >= -2 && seated < 12, `${href} bar ${seated}`).toBe(true);
      const colours = await page.evaluate(() => {
        const frame = document.getElementById("cmp-view");
        const strip = document.querySelector("kazoku-view-controls[for='cmp-view']")?.shadowRoot?.querySelector(".bar");
        return {
          stage: frame ? getComputedStyle(frame).backgroundColor : "",
          bar: strip ? getComputedStyle(strip).backgroundColor : "",
        };
      });
      expect(colours.bar, "line-up bar").toBe(colours.stage);
    }
  }
  expect(seen.has("journey.html"), "the page list").toBe(true);
  expect(seen.has("fleet-compare.html"), "the compare line-up").toBe(true);
});

test("the still picture is gone once the 3D view is in, and a turn changes the ship", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${BASE}embed-page.html`, { waitUntil: "load" });
  const rocket = page.locator("#rocket");
  await expect.poll(async () => rocket.getAttribute("data-state")).toBe("3d");
  await expect.poll(() => rocket.evaluate((node) => getComputedStyle(node.shadowRoot?.querySelector("canvas") ?? node).opacity)).toBe("1");
  const drawing = await rocket.evaluate((node) => {
    const layer = node.shadowRoot?.querySelector(".drawing");
    if (!(layer instanceof HTMLElement)) return { display: "missing", svg: true, rects: 1 };
    const style = getComputedStyle(layer);
    return { display: style.display, svg: layer.querySelector("svg") !== null, rects: layer.getClientRects().length };
  });
  expect(drawing).toEqual({ display: "none", svg: false, rects: 0 });
  const box = await rocket.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const shot = async () => {
    const patches: Buffer[] = [];
    for (const fx of [0.42, 0.52]) {
      for (const fy of [0.18, 0.36, 0.54, 0.74]) {
        patches.push(await page.screenshot({ clip: { x: box.x + box.width * fx, y: box.y + box.height * fy, width: 16, height: 16 } }));
      }
    }
    return patches;
  };
  const before = await shot();
  await page.locator("kazoku-view-controls[for='rocket']").evaluate((node) => {
    const input = node.shadowRoot?.querySelector("#yaw");
    if (!(input instanceof HTMLInputElement)) throw new Error("no yaw");
    input.value = "90";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(async () => {
    const after = await shot();
    return after.filter((patch, index) => !patch.equals(before[index])).length;
  }).toBe(8);
});
