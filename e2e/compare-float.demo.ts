// The compare page floats the craft: no plinth, names at the top right, and a Ground choice puts the plinth back. Hide takes the names off, and both choices stay in the address.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/compare.html";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const canvasOf = (page: Page) =>
  hero(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    return { float: canvas?.dataset.float ?? "", plinth: canvas?.dataset.plinth ?? "" };
  });

test("the craft float, the names sit at the top right, and Ground and Hide are in the address", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(URL);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(hero(page)).toHaveAttribute("float", "");
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(() => canvasOf(page)).toEqual({ float: "on", plinth: "off" });
  const side = await hero(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const label = node.shadowRoot?.querySelector("[data-beside-label]");
    if (!canvas || !label) return null;
    const picture = canvas.getBoundingClientRect();
    const name = label.getBoundingClientRect();
    return { rightGap: picture.right - name.right, topGap: name.top - picture.top };
  });
  expect(side).not.toBeNull();
  expect(side!.rightGap).toBeGreaterThan(-2);
  expect(side!.rightGap).toBeLessThan(24);
  expect(side!.topGap).toBeGreaterThan(-2);
  expect(side!.topGap).toBeLessThan(24);

  await page.locator('[data-testid="labels-off"]').click();
  await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelectorAll("[data-beside-label]").length ?? 0)).toBe(0);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("labels")).toBe("off");

  await page.locator('[data-testid="place-ground"]').click();
  await expect(hero(page)).not.toHaveAttribute("float", "");
  await expect.poll(() => canvasOf(page)).toEqual({ float: "off", plinth: "off" });
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("place")).toBe("ground");
  expect(problems).toEqual([]);
});

test("a drag throws the craft and it keeps moving", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
  await page.goto(`${URL}?with=none`);
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  const canvas = hero(page).locator("canvas");
  const angle = await canvas.evaluate((node) => Number((node as HTMLCanvasElement).dataset.azimuth ?? "0"));
  const dragged = await canvas.evaluate((node) => {
    const spot = (node as HTMLCanvasElement).dataset.craft ?? "";
    const [minX, minY, maxX, maxY] = spot.split(",").map(Number);
    const width = node.clientWidth;
    const height = node.clientHeight;
    const x0 = Math.max(8, minX);
    const y0 = Math.max(8, minY);
    const x1 = Math.min(width - 8, maxX);
    const y1 = Math.min(height - 8, maxY);
    if (!(x1 > x0 && y1 > y0)) return spot;
    const rect = node.getBoundingClientRect();
    const fire = (type: string, x: number, y: number) =>
      node.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX: rect.left + x, clientY: rect.top + y, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    fire("pointerdown", x, y);
    fire("pointermove", Math.min(width - 8, x + 120), y);
    fire("pointerup", Math.min(width - 8, x + 120), y);
    return "ok";
  });
  expect(dragged).toBe("ok");
  // The suite asks for reduced motion, so the craft stays where it is let go. The coast itself is the unit test. Here the drag has to move the craft and leave the angle alone.
  await expect.poll(() => canvas.evaluate((node) => Number((node as HTMLCanvasElement).dataset.moves ?? "0"))).toBeGreaterThan(0);
  await expect.poll(() => canvas.evaluate((node) => Number((node as HTMLCanvasElement).dataset.thrown ?? "0"))).toBeGreaterThan(1);
  const later = await canvas.evaluate((node) => Number((node as HTMLCanvasElement).dataset.azimuth ?? "0"));
  expect(Math.abs(later - angle)).toBeLessThan(1);
});

test("picking Mars replaces the Earth", async ({ page }) => {
  await page.goto(`${URL}?background=mars&with=none`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(page.locator('[data-testid="earth"]')).toBeHidden();
  await expect.poll(() => page.locator('[data-testid="sky"]').getAttribute("data-draws"), { timeout: 30_000 }).toBe("mars");
  await page.locator('[data-testid="background-earth"]').click();
  await expect(page.locator('[data-testid="earth"]')).toBeVisible();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBeNull();
});

test("Ground puts a plinth under a craft that flies in space", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
  await page.goto(`${URL}?rocket=fleet-ship-01&variant=hanabusa&with=none&place=ground`);
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect.poll(() => canvasOf(page), { timeout: 30_000 }).toEqual({ float: "off", plinth: "on" });
});
