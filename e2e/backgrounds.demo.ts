// Planets and a moon behind the rocket. Each picture is drawn, and the one before it is taken off the page.
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

const shot = async (page: Page, name: string) => {
  if (process.env.SHOTS && test.info().project.name === "chromium-desk") await page.screenshot({ path: `${process.env.SHOTS}/${name}.png` });
};

test("two planets and a moon stand behind the rocket, and the picture before is freed", async ({ page }) => {
  const problems = watch(page);
  const sky = page.locator('[data-testid="sky"]');
  const moons = page.locator('[data-testid="sky-moons"]');
  const earth = page.locator('[data-testid="earth"]');
  const moonRow = page.locator('[data-testid="moons"]');
  await page.goto(URL);
  await expect(page.locator('[data-testid="background-none"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-testid="background-mars"]')).toBeVisible();
  await expect(sky).toBeHidden();

  await page.locator('[data-testid="background-mars"]').click();
  await expect(sky).toHaveAttribute("data-draws", "mars");
  await expect(sky.locator("svg")).toHaveCount(1);
  await expect(moonRow).toBeVisible();
  await expect(earth).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBe("mars");
  await shot(page, "mars-desk");

  await page.locator('[data-testid="moon-phobos"]').click();
  await expect(moons).toHaveAttribute("data-draws", "phobos");
  await expect(moons.locator("svg")).toHaveCount(1);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("moon")).toBe("phobos");
  await expect(page.locator('[data-testid="sky-credit"]')).toContainText("Wakusei Planets");

  await page.locator('[data-testid="background-jupiter"]').click();
  await expect(sky).toHaveAttribute("data-draws", "jupiter");
  await expect(sky.locator("svg")).toHaveCount(1);
  await expect(moons).toHaveAttribute("data-draws", "io,europa,ganymede,callisto");
  await expect(moons.locator("svg")).toHaveCount(4);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("moon")).toBeNull();
  await shot(page, "jupiter-desk");

  await page.locator('[data-testid="background-saturn"]').click();
  await expect(sky).toHaveAttribute("data-draws", "saturn");
  await expect(moons).toHaveAttribute("data-draws", "titan");
  await expect(moons.locator("svg")).toHaveCount(1);
  await shot(page, "saturn-desk");

  await page.goto(`${URL}?background=moon`);
  await expect(sky).toHaveAttribute("data-draws", "moon");
  await expect(moons).toBeHidden();

  await page.locator('[data-testid="background-earth"]').click();
  await expect(sky).toBeHidden();
  await expect(sky.locator("svg")).toHaveCount(0);
  await expect(moons).toHaveAttribute("data-draws", "moon");
  await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
  await expect(earth.locator("svg")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="earth-credit"]')).toContainText("Natural Earth");

  await page.locator('[data-testid="background-none"]').click();
  await expect(moons).toBeHidden();
  await expect(sky).toBeHidden();
  await expect(earth).toBeHidden();
  await expect(earth.locator("svg")).toHaveCount(0);
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBeNull();
  if (process.env.SHOTS) {
    await page.locator("#backgrounds").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.SHOTS}/picker-${test.info().project.name}.png` });
  }
  expect(problems).toEqual([]);
});
