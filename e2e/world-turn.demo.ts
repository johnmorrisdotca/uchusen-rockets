// Every planet and moon the demo draws turns on its own axis, unless the reader prefers less motion or has chosen Still: the Earth inside the compare page's 3D view (and its clouds), the backgrounds, and the journey's planets.
import { expect, test, type Page } from "@playwright/test";

const BASE = "/uchusen-rockets/";

const canvas = (page: Page) => page.getByTestId("hero").locator("canvas").first();

test("the Earth in the compare view turns by itself", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium-desk", "WebGL is drawn on the desk");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${BASE}compare.html?picker=off&background=earth&with=none`);
  await expect(canvas(page)).toHaveAttribute("data-earth", "painted", { timeout: 90_000 });
  await expect(canvas(page)).toHaveAttribute("data-world-turning", "true");
  const first = Number(await canvas(page).getAttribute("data-world-turn"));
  await expect.poll(async () => Number(await canvas(page).getAttribute("data-world-turn")), { timeout: 30_000 }).not.toBe(first);
});

test("Still holds the Earth, and so does reduced motion", async ({ page, browser }) => {
  test.skip(test.info().project.name !== "chromium-desk", "WebGL is drawn on the desk");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${BASE}compare.html?picker=off&background=earth&with=none&spin=still`);
  await expect(canvas(page)).toHaveAttribute("data-earth", "painted", { timeout: 90_000 });
  await expect(canvas(page)).toHaveAttribute("data-world-turning", "false");
  const frames = Number(await canvas(page).getAttribute("data-frames"));
  await page.waitForTimeout(1500);
  expect(Number(await canvas(page).getAttribute("data-frames"))).toBe(frames);

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const still = await reduced.newPage();
  await still.goto(`${BASE}compare.html?picker=off&background=earth&with=none`);
  await expect(canvas(still)).toHaveAttribute("data-earth", "painted", { timeout: 90_000 });
  await expect(canvas(still)).toHaveAttribute("data-world-turning", "false");
  await reduced.close();
});

test("a background planet turns: its picture changes with nothing touched", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium-desk", "WebGL is drawn on the desk");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${BASE}?background=jupiter&look=painted&picker=off`);
  const body = page.locator('[data-testid="sky"] wakusei-body').first();
  await expect(page.getByTestId("sky")).toHaveAttribute("data-form", "painted", { timeout: 90_000 });
  await expect.poll(() => body.evaluate((node) => (node as unknown as { stats?: { textureWidth?: number } }).stats?.textureWidth ?? 0), { timeout: 90_000 }).toBeGreaterThan(0);
  await expect(body).toHaveAttribute("rate", /^[1-9]/);
  const first = await body.screenshot();
  await expect.poll(async () => !(await body.screenshot()).equals(first), { timeout: 60_000 }).toBe(true);
});

test("a planet on the journey turns on its own axis, and stays still under reduced motion", async ({ page, browser }) => {
  test.skip(test.info().project.name !== "chromium-desk", "WebGL is drawn on the desk");
  test.setTimeout(180_000);
  const address = `${BASE}journey.html?date=2026-11-04&look=painted`;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(address);
  const planet = page.getByTestId("dest").locator("wakusei-body");
  await expect(planet).toHaveAttribute("body", "mars", { timeout: 90_000 });
  expect(Number(await planet.getAttribute("turn"))).not.toBe(0);

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const still = await reduced.newPage();
  await still.goto(address);
  const held = still.getByTestId("dest").locator("wakusei-body");
  await expect(held).toHaveAttribute("body", "mars", { timeout: 90_000 });
  await expect(held).toHaveAttribute("turn", "0");
  await reduced.close();
});
