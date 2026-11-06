// Choosing a craft: one test for each action, with the mouse, a touch and the keyboard.
import { expect, test, type Page } from "@playwright/test";

const rockets = "/uchusen-rockets/";
const compare = "/uchusen-rockets/compare.html";

const heroOf = (page: Page) => page.locator('[data-testid="hero"]');

async function ready(page: Page, url: string): Promise<void> {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.goto(url);
  await expect(heroOf(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  expect(problems).toEqual([]);
}

async function read(page: Page): Promise<{ selected: string; shift: number; yaw: number; tilt: number; roll: number; outline: boolean; spin: string }> {
  return heroOf(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const outline = node.shadowRoot?.querySelector("[data-testid=craft-outline]");
    return {
      selected: canvas?.dataset.selected ?? "",
      shift: Number(canvas?.dataset.shift ?? "0"),
      yaw: Number(canvas?.dataset.yaw ?? "0"),
      tilt: Number(canvas?.dataset.tilt ?? "0"),
      roll: Number(canvas?.dataset.roll ?? "0"),
      outline: outline instanceof HTMLElement && !outline.hidden,
      spin: canvas?.dataset.craftSpin ?? "",
    };
  });
}

async function craftPoint(page: Page): Promise<{ x: number; y: number }> {
  await heroOf(page).scrollIntoViewIfNeeded();
  const spot = await heroOf(page).evaluate((node) => {
    const el = node as HTMLElement & { craftAt(x: number, y: number): number | null };
    const canvas = node.shadowRoot?.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!rect || typeof el.craftAt !== "function") return null;
    for (let y = 0.15; y <= 0.85; y += 0.08) {
      for (let x = 0.3; x <= 0.75; x += 0.08) {
        const px = rect.x + rect.width * x;
        const py = rect.y + rect.height * y;
        const top = document.elementFromPoint(px, py);
        if (top !== el) continue;
        if (el.craftAt(px, py) !== null) return { x: px, y: py };
      }
    }
    return null;
  });
  if (!spot) throw new Error("no craft under the pointer");
  return spot;
}

async function focusCanvas(page: Page): Promise<void> {
  await heroOf(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    if (canvas instanceof HTMLElement) canvas.focus();
  });
}

async function clickEmpty(page: Page): Promise<void> {
  const spot = await heroOf(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const ring = node.shadowRoot?.querySelector("[data-testid=craft-outline]");
    if (!(canvas instanceof HTMLElement) || !(ring instanceof HTMLElement)) return null;
    const c = canvas.getBoundingClientRect();
    const r = ring.getBoundingClientRect();
    const corners = [
      { x: c.x + 6, y: c.y + 6 },
      { x: c.right - 6, y: c.y + 6 },
      { x: c.x + 6, y: c.bottom - 6 },
      { x: c.right - 6, y: c.bottom - 6 },
    ];
    const hero = canvas.getRootNode() instanceof ShadowRoot ? (canvas.getRootNode() as ShadowRoot).host : null;
    return corners.find((point) => {
      const outside = point.x < r.left - 1 || point.x > r.right + 1 || point.y < r.top - 1 || point.y > r.bottom + 1;
      return outside && document.elementFromPoint(point.x, point.y) === hero;
    }) ?? null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.click(spot!.x, spot!.y);
}

async function touch(page: Page, points: { x: number; y: number }[], next?: { x: number; y: number }[]): Promise<void> {
  const client = await page.context().newCDPSession(page);
  const start = points.map((point, id) => ({ ...point, id, radiusX: 1, radiusY: 1 }));
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: start });
  if (next) {
    const moved = next.map((point, id) => ({ ...point, id, radiusX: 1, radiusY: 1 }));
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: moved });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
});

test("a click chooses the craft and opens its properties", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  await expect.poll(() => read(page).then((row) => row.outline)).toBe(true);
  const card = page.locator('[data-testid="craft-card"]');
  await expect(card).toHaveAttribute("open", "");
  await expect(page.locator('[data-testid="craft-name"]')).not.toBeEmpty();
  await page.locator('[data-testid="craft-spin"]').selectOption("long");
  await expect.poll(() => read(page).then((row) => row.spin)).toBe("long");
});

test("a click on empty ground clears the choice", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  await clickEmpty(page);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("");
  await expect(page.locator('[data-testid="craft-card"]')).not.toHaveAttribute("open", "");
});

test("Escape clears the choice", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  await focusCanvas(page);
  await page.keyboard.press("Escape");
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("");
});

test("a drag moves only the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  let spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  spot = await craftPoint(page);
  await page.mouse.move(spot.x, spot.y);
  await page.mouse.down();
  await page.mouse.move(spot.x + 70, spot.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => read(page).then((row) => row.shift)).toBeGreaterThan(1);
});

test("the arrow keys move the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await focusCanvas(page);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => read(page).then((row) => row.shift)).toBeGreaterThan(0.2);
});

test("Shift and a drag tilts the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  let spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  spot = await craftPoint(page);
  await page.keyboard.down("Shift");
  await page.mouse.move(spot.x, spot.y);
  await page.mouse.down();
  await page.mouse.move(spot.x, spot.y + 80, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect.poll(() => read(page).then((row) => Math.abs(row.tilt))).toBeGreaterThan(5);
});

test("Alt and the arrow keys turn the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await focusCanvas(page);
  await page.keyboard.press("Alt+ArrowRight");
  await page.keyboard.press("Alt+ArrowRight");
  await expect.poll(() => read(page).then((row) => Math.abs(row.yaw))).toBeGreaterThan(5);
});

test("Alt+Shift and an arrow rolls the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await focusCanvas(page);
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await expect.poll(() => read(page).then((row) => Math.abs(row.roll))).toBeGreaterThan(2);
});

test("a tap chooses the craft", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await touch(page, [spot]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  await expect(page.locator('[data-testid="craft-card"]')).toHaveAttribute("open", "");
});

test("a one-finger drag moves the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  let spot = await craftPoint(page);
  await touch(page, [spot]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  spot = await craftPoint(page);
  await touch(page, [spot], [{ x: spot.x + 70, y: spot.y }]);
  await expect.poll(() => read(page).then((row) => row.shift)).toBeGreaterThan(1);
});

test("a two-finger twist rolls the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  let spot = await craftPoint(page);
  await touch(page, [spot]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  spot = await craftPoint(page);
  await touch(
    page,
    [{ x: spot.x - 50, y: spot.y }, { x: spot.x + 50, y: spot.y }],
    [{ x: spot.x, y: spot.y - 50 }, { x: spot.x, y: spot.y + 50 }],
  );
  await expect.poll(() => read(page).then((row) => Math.abs(row.roll))).toBeGreaterThan(20);
});

test("Tab chooses the craft and Enter opens the card", async ({ page }) => {
  await ready(page, rockets);
  await focusCanvas(page);
  await page.keyboard.press("Tab");
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  await expect(page.locator('[data-testid="craft-card"]')).not.toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-testid="craft-card"]')).toHaveAttribute("open", "");
  await expect(page.locator('[data-testid="craft-name"]')).not.toBeEmpty();
});

test("Shift-Tab chooses the craft", async ({ page }) => {
  await ready(page, rockets);
  await focusCanvas(page);
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
});

test("Tab and Shift-Tab cycle the craft on the compare page", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 700, "a phone shows one craft, so there is nothing to cycle");
  await ready(page, compare);
  await focusCanvas(page);
  await page.keyboard.press("Tab");
  const first = await read(page).then((row) => row.selected);
  expect(first).not.toBe("");
  await page.keyboard.press("Tab");
  const second = await read(page).then((row) => row.selected);
  expect(second).not.toBe(first);
  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => read(page).then((row) => row.selected)).toBe(first);
});

async function emptyPoint(page: Page): Promise<{ x: number; y: number }> {
  const spot = await heroOf(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    const ring = node.shadowRoot?.querySelector("[data-testid=craft-outline]");
    if (!(canvas instanceof HTMLElement) || !(ring instanceof HTMLElement)) return null;
    const c = canvas.getBoundingClientRect();
    const r = ring.getBoundingClientRect();
    const corners = [
      { x: c.x + 6, y: c.y + 6 },
      { x: c.right - 6, y: c.y + 6 },
      { x: c.x + 6, y: c.bottom - 6 },
      { x: c.right - 6, y: c.bottom - 6 },
    ];
    const hero = canvas.getRootNode() instanceof ShadowRoot ? (canvas.getRootNode() as ShadowRoot).host : null;
    return corners.find((point) => {
      const outside = point.x < r.left - 1 || point.x > r.right + 1 || point.y < r.top - 1 || point.y > r.bottom + 1;
      return outside && document.elementFromPoint(point.x, point.y) === hero;
    }) ?? null;
  });
  if (!spot) throw new Error("no empty ground");
  return spot;
}

test("a two-finger drag down tilts the chosen craft", async ({ page }) => {
  await ready(page, rockets);
  let spot = await craftPoint(page);
  await touch(page, [spot]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  spot = await craftPoint(page);
  await touch(page, [{ x: spot.x - 40, y: spot.y }, { x: spot.x + 40, y: spot.y }], [{ x: spot.x - 40, y: spot.y + 90 }, { x: spot.x + 40, y: spot.y + 90 }]);
  await expect.poll(() => read(page).then((row) => Math.abs(row.tilt))).toBeGreaterThan(5);
});

test("a tap on empty ground clears the choice", async ({ page }) => {
  await ready(page, rockets);
  const spot = await craftPoint(page);
  await touch(page, [spot]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("-1");
  const empty = await emptyPoint(page);
  await touch(page, [empty]);
  await expect.poll(() => read(page).then((row) => row.selected)).toBe("");
});

test("Compare uses the same card", async ({ page }) => {
  await ready(page, compare);
  const spot = await craftPoint(page);
  await page.mouse.click(spot.x, spot.y);
  await expect.poll(() => read(page).then((row) => row.selected)).not.toBe("");
  await expect(page.locator('[data-testid="craft-card"]')).toHaveAttribute("open", "");
  await expect(page.locator('[data-testid="craft-name"]')).not.toBeEmpty();
});
