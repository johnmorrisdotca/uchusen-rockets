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

// The size of the box around a flight's samples: its larger side, in pixels.
const spanOf = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return 0;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};

// The drone flies, then holds, then flies again; the page says which with data-inspect-paused. The page's own clock is the
// one that counts, however slowly the frames come. So the first hold is waited for (a first reading may be mid-flight), and
// the samples of the next whole flight are kept: from the first one after paused goes 1 -> 0 until it goes 0 -> 1 (that
// hold's own sample is kept too). The arc's span is the larger side of the box around those samples, not the distance from
// the first one.
const moved = async (page: Page, pixels: number) => {
  const canvas = page.locator("#hero canvas");
  const flight: { x: number; y: number }[] = [];
  const seen: string[] = [];
  let started = false;
  let whole = false;
  const note = () => `${flight.length} samples of the flight, paused went ${seen.join(">") || "unread"}`;
  await expect
    .poll(
      async () => {
        const flag = await canvas.getAttribute("data-inspect-paused");
        const next = await spot(page);
        if (flag !== "0" && flag !== "1") return note();
        if (seen[seen.length - 1] !== flag) seen.push(flag);
        if (flag === "1" && started && !whole) {
          if (next) flight.push(next);
          whole = true;
        } else if (flag === "0" && seen.slice(-2).join(">") === "1>0") started = true;
        if (flag === "0" && started && !whole && next) flight.push(next);
        return whole ? "a whole flight" : note();
      },
      { timeout: 90_000, intervals: [400] },
    )
    .toBe("a whole flight");
  const far = spanOf(flight);
  expect(far, note()).toBeGreaterThan(pixels);
  return far;
};

test("the span of a flight is the box around all its samples, so a partial arc reads smaller", () => {
  const arc = Array.from({ length: 40 }, (_, i) => {
    const turn = Math.sin((i / 39) * Math.PI * 2) * 0.35;
    return { x: 600 + Math.sin(turn) * 120, y: 400 - (i / 39) * 30 };
  });
  expect(spanOf([])).toBe(0);
  expect(spanOf([{ x: 3, y: 4 }])).toBe(0);
  expect(spanOf([{ x: 0, y: 0 }, { x: 30, y: 5 }, { x: 10, y: 50 }])).toBe(50);
  const whole = spanOf(arc);
  expect(spanOf(arc.slice(20))).toBeLessThan(whole);
  expect(spanOf(arc.slice(30))).toBeLessThan(whole / 2);
});

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
