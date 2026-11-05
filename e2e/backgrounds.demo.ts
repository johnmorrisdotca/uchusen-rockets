// The Moon as a background, and small beside the Earth. Each picture is drawn, and the one before it is taken off the page.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  return problems;
}

test("the Moon stands behind the rocket, beside the Earth, and the picture before it is freed", async ({ page }) => {
  const problems = watch(page);
  const sky = page.locator('[data-testid="sky"]');
  const moons = page.locator('[data-testid="sky-moons"]');
  const earth = page.locator('[data-testid="earth"]');
  await page.goto(URL);
  await expect(page.locator('[data-testid="background-none"]')).toHaveAttribute("aria-pressed", "true");
  await expect(sky).toBeHidden();
  await expect(moons).toBeHidden();

  await page.locator('[data-testid="background-moon"]').click();
  await expect(page.locator('[data-testid="background-moon"]')).toHaveAttribute("aria-pressed", "true");
  await expect(sky).toHaveAttribute("data-draws", "moon");
  await expect(sky.locator("svg")).toHaveCount(1);
  if (process.env.SHOTS && test.info().project.name === "chromium-desk") await page.screenshot({ path: `${process.env.SHOTS}/moon-desk.png` });
  await expect(earth).toBeHidden();
  await expect(page.locator('[data-testid="sky-credit"]')).toContainText("Wakusei Planets");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBe("moon");

  await page.locator('[data-testid="background-earth"]').click();
  await expect(sky).toBeHidden();
  await expect(sky.locator("svg")).toHaveCount(0);
  await expect(moons).toHaveAttribute("data-draws", "moon");
  await expect(moons.locator("svg")).toHaveCount(1);
  await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
  await expect(earth.locator("svg")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="earth-credit"]')).toContainText("Natural Earth");
  if (process.env.SHOTS) {
    const shots = process.env.SHOTS;
    const project = test.info().project.name;
    await page.screenshot({ path: `${shots}/earth-moon-${project}.png` });
    await page.locator("#backgrounds").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/picker-${project}.png` });
  }

  await page.locator('[data-testid="background-none"]').click();
  await expect(moons).toBeHidden();
  await expect(moons.locator("svg")).toHaveCount(0);
  await expect(earth).toBeHidden();
  await expect(earth.locator("svg")).toHaveCount(0);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBeNull();
  expect(problems).toEqual([]);
});
