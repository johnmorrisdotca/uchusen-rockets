// A finished ship sits still and the drones move on the screen. The mark is the first drone, in the page's own pixels.
import { expect, type Page, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium", "WebGL is drawn in Chromium here");
});

const hero = (page: Page) => page.locator('[data-testid="hero"]');
const mark = (page: Page) => page.locator('[data-testid="inspect-mark"]');

const open = async (page: Page, drones: number) => {
  await page.goto(`/uchusen-rockets/inspect.html?drones=${drones}&play=1&speed=1`);
  await expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });
  await expect(page.locator("#hero canvas")).toHaveAttribute("data-drones", "ready", { timeout: 60_000 });
  await expect(mark(page)).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => hero(page).getAttribute("data-painted"), { timeout: 90_000 }).toMatch(/code|model|mixed/);
};

const spot = async (page: Page) => {
  const box = await mark(page).boundingBox();
  if (!box) return null;
  const canvas = await page.locator("#hero canvas").boundingBox();
  if (!canvas) return null;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (x <= canvas.x || x >= canvas.x + canvas.width || y <= canvas.y || y >= canvas.y + canvas.height) return null;
  return { x, y };
};

// The drone flies, holds, and flies again; the page says which with data-inspect-paused. The page's own clock is the one
// that counts, so sample until it has gone 0 -> 1 -> 0 (a whole flight seen), however slowly the frames come. The arc's
// span is the larger side of the box around every sample, not the distance from the first one.
const moved = async (page: Page, pixels: number) => {
  const canvas = page.locator("#hero canvas");
  const points: { x: number; y: number }[] = [];
  const seen: string[] = [];
  const state = async () => {
    const next = await spot(page);
    if (next) points.push(next);
    const flag = await canvas.getAttribute("data-inspect-paused");
    if (flag === "0" || flag === "1") {
      if (seen[seen.length - 1] !== flag) seen.push(flag);
    }
    return seen.join(">");
  };
  const span = () => {
    if (points.length === 0) return 0;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  };
  await expect
    .poll(
      async () => {
        const order = await state();
        const whole = order.includes("0>1>0");
        return whole ? "a whole flight" : `${points.length} samples, paused went ${order || "unread"}`;
      },
      { timeout: 90_000, intervals: [400] },
    )
    .toBe("a whole flight");
  const far = span();
  expect(far, `${points.length} samples, paused went ${seen.join(">")}`).toBeGreaterThan(pixels);
  return far;
};

for (const drones of [1, 10, 100]) {
  test(`${drones} drones move on the screen`, async ({ page }) => {
    await open(page, drones);
    await moved(page, 16);
    if (drones === 100) {
      const canvas = page.locator("#hero canvas");
      const before = Number(await canvas.getAttribute("data-frames"));
      await page.waitForTimeout(700);
      const after = Number(await canvas.getAttribute("data-frames"));
      expect(after).toBeGreaterThan(before);
      const calls = Number(await canvas.getAttribute("data-draw-calls"));
      expect(calls).toBeGreaterThan(0);
      expect(calls).toBeLessThan(200);
    }
  });
}

test("pause holds the drone, and the keys change the count", async ({ page }) => {
  await open(page, 8);
  await page.getByTestId("inspect-play").click();
  await expect(page.getByTestId("inspect-play")).toHaveText("Play");
  const first = await spot(page);
  expect(first).toBeTruthy();
  await page.waitForTimeout(500);
  const next = await spot(page);
  expect(next).toBeTruthy();
  expect(Math.hypot(next!.x - first!.x, next!.y - first!.y)).toBeLessThan(4);
  const range = page.getByTestId("inspect-range");
  await range.focus();
  const before = await page.getByTestId("inspect-count").inputValue();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("inspect-count")).not.toHaveValue(before);
  await page.getByTestId("inspect-play").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("inspect-play")).toHaveText("Pause");
});
