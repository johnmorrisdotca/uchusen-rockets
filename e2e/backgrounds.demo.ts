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
  await expect(page.locator('[data-testid="background-mars"] .thumb-name')).toHaveText("Mars");
  await expect(page.locator('[data-testid="moon-heading"]')).toHaveText("Mars's moons");
  await expect(moonRow).toBeVisible();
  await expect(earth).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("background")).toBe("mars");
  await shot(page, "mars-desk");

  await page.locator('[data-testid="moon-phobos"]').click();
  await expect(sky).toHaveAttribute("data-chosen", "phobos");
  await expect(sky).toHaveAttribute("data-moons", /phobos/);
  await expect(sky.locator("wakusei-body").first()).not.toHaveAttribute("moons");
  const phobos = sky.locator('wakusei-body[data-moon="phobos"]');
  await expect(phobos).toBeVisible();
  await expect.poll(async () => (await phobos.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(16);
  const credit = await page.locator('[data-testid="sky-credit"]').innerText();
  expect(credit.split("Wakusei Planets by John Morris").length - 1).toBe(1);
  await expect(moons).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("moon")).toBe("phobos");
  await expect(page.locator('[data-testid="sky-credit"]')).toContainText("Wakusei Planets");
  await expect(page.locator('[data-testid="sky-credit"]')).not.toContainText("enlarged");

  await page.locator('[data-testid="background-jupiter"]').click();
  await expect(sky).toHaveAttribute("data-draws", "jupiter");
  await expect(sky.locator("wakusei-body")).toHaveCount(1);
  await expect(sky.locator("svg")).toHaveCount(1);
  await expect(sky).not.toHaveAttribute("data-moons");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("moon")).toBeNull();
  await page.locator('[data-testid="moon-all"]').click();
  await expect(sky).toHaveAttribute("data-moons", /io/);
  await expect(sky.locator("wakusei-body[data-moon]")).toHaveCount(4);
  await expect(sky.locator("wakusei-body").first()).not.toHaveAttribute("moons");
  await expect.poll(async () => (await sky.locator('wakusei-body[data-moon="io"]').boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(16);
  await expect(page.locator('[data-testid="moon-heading"]')).toHaveText("Jupiter's moons");
  await expect(moons).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("moon")).toBe("all");
  await shot(page, "jupiter-desk");

  await page.locator('[data-testid="background-saturn"]').click();
  await expect(sky).toHaveAttribute("data-draws", "saturn");
  await expect(page.locator('[data-testid="moon-heading"]')).toHaveText("Saturn's moons");
  await expect(sky).not.toHaveAttribute("data-moons");
  await page.locator('[data-testid="moon-titan"]').click();
  await expect(sky).toHaveAttribute("data-moons", /titan/);
  await expect(moons).toBeHidden();
  await shot(page, "saturn-desk");

  await page.locator('[data-testid="background-mars"]').click();
  await page.locator('[data-testid="look-painted"]').click();
  await expect(sky).toHaveAttribute("data-form", "painted", { timeout: 30_000 });
  await expect(sky.locator("wakusei-body")).toHaveCount(1);
  await expect(sky.locator("svg")).toHaveCount(0);
  await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
  await expect.poll(() => sky.locator("wakusei-body").evaluate((node) => (node as unknown as { stats?: { textureWidth?: number } }).stats?.textureWidth ?? 0), { timeout: 30_000 }).toBeGreaterThan(0);
  await shot(page, "painted-desk");

  await page.goto(`${URL}?background=moon`);
  await expect(sky).toHaveAttribute("data-draws", "moon", { timeout: 30_000 });
  await expect(moons).toBeHidden();

  await page.locator('[data-testid="background-earth"]').click();
  await expect(sky).toBeHidden();
  await expect(sky.locator("svg")).toHaveCount(0);
  await expect(moons).toBeHidden();
  await page.locator('[data-testid="moon-moon"]').click();
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

test("each look uses its own kind of picture for the body and for a moon beside it", async ({ page }) => {
  const problems = watch(page);
  const sky = page.locator('[data-testid="sky"]');
  const moons = page.locator('[data-testid="sky-moons"]');
  const earth = page.locator('[data-testid="earth"]');
  const hero = page.locator('[data-testid="hero"]');
  const texture = (root: ReturnType<typeof page.locator>) => root.locator("wakusei-body").first().evaluate((node) => (node as unknown as { stats?: { textureWidth?: number } }).stats?.textureWidth ?? 0);

  await page.goto(`${URL}?background=mars&look=line`);
  await expect(sky).toHaveAttribute("data-form", "line");
  await expect(sky.locator("wakusei-body")).toHaveCount(1);
  await expect(sky.locator("svg")).toHaveCount(1);

  await page.goto(`${URL}?background=jupiter&look=line&moon=all`);
  await expect(sky).toHaveAttribute("data-form", "line");
  await expect(sky).toHaveAttribute("data-moons", /io/);
  await expect(sky.locator("wakusei-body")).toHaveCount(5);
  await expect(sky.locator("svg")).toHaveCount(5);
  await expect(sky.locator("wakusei-body").first()).not.toHaveAttribute("moons");
  await expect(moons).toBeHidden();

  await page.goto(`${URL}?background=mars&look=painted`);
  await hero.scrollIntoViewIfNeeded();
  await expect(sky).toHaveAttribute("data-form", "painted");
  await expect(sky.locator("svg")).toHaveCount(0);
  await expect(sky.locator("wakusei-body")).toHaveCount(1);
  await expect.poll(() => texture(sky), { timeout: 30_000 }).toBeGreaterThan(0);

  await page.goto(`${URL}?background=jupiter&look=painted&moon=io`);
  await hero.scrollIntoViewIfNeeded();
  await expect(sky).toHaveAttribute("data-form", "painted", { timeout: 30_000 });
  await expect(sky.locator("svg")).toHaveCount(0);
  await expect(sky.locator("wakusei-body")).toHaveCount(2);
  await expect(sky.locator("wakusei-body").first()).not.toHaveAttribute("moons");
  await expect(sky.locator('wakusei-body[data-moon="io"]')).toHaveAttribute("time", "now");
  await expect.poll(async () => (await sky.locator('wakusei-body[data-moon="io"]').boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(16);
  await expect(moons).toBeHidden();
  await expect.poll(() => texture(sky), { timeout: 30_000 }).toBeGreaterThan(0);

  await page.goto(`${URL}?background=earth&look=painted&moon=moon`);
  await hero.scrollIntoViewIfNeeded();
  await expect(earth.locator("chikyu-earth-realistic")).toBeVisible({ timeout: 30_000 });
  await expect(earth.locator("svg")).toHaveCount(0);
  await expect(moons).toHaveAttribute("data-draws", "moon");
  await expect(moons).toHaveAttribute("data-form", "painted");
  await expect(moons.locator("svg")).toHaveCount(0);
  await expect(moons.locator("wakusei-body")).toHaveCount(1);
  await expect.poll(() => texture(moons), { timeout: 30_000 }).toBeGreaterThan(0);
  await shot(page, "earth-moon-painted");
  expect(problems).toEqual([]);
});

test("a globe turns between two dates, its moons move, and the Sun's glow fades out", async ({ page }) => {
  const problems = watch(page);
  const sky = page.locator('[data-testid="sky"]');
  const body = sky.locator("wakusei-body");
  const markup = () => body.locator("svg").innerHTML();

  await page.goto(`${URL}?background=venus&look=line`);
  await expect(sky).toHaveAttribute("data-spin", "clock", { timeout: 30_000 });
  await expect(body).toHaveAttribute("time", "now");
  await expect(body).toHaveAttribute("rate", "4000");
  await expect(body.locator("svg")).toHaveCount(1);
  const before = await markup();
  await body.evaluate((node) => node.setAttribute("time", "2026-01-01T00:00:00Z"));
  await expect.poll(markup).not.toBe(before);
  const turned = await markup();
  await body.evaluate((node) => node.setAttribute("time", "2026-07-01T00:00:00Z"));
  await expect.poll(markup).not.toBe(turned);

  await page.goto(`${URL}?background=jupiter&look=line&moon=all`);
  const io = sky.locator('wakusei-body[data-moon="io"]');
  await expect(io).toHaveAttribute("time", "now", { timeout: 30_000 });
  await expect(io).toHaveAttribute("rate", "4000");
  await expect(io).toHaveAttribute("data-place", /-?\d/);
  const planet = sky.locator("wakusei-body").first();
  const jupiterBefore = await planet.locator("svg").innerHTML();
  await planet.evaluate((node) => node.setAttribute("time", "2026-01-01T00:00:00Z"));
  await expect.poll(() => planet.locator("svg").innerHTML()).not.toBe(jupiterBefore);

  await page.goto(`${URL}?background=sun&look=line`);
  const glow = page.locator('[data-testid="sun-glow"]');
  await expect(glow).toBeVisible();
  const painted = await glow.evaluate((el) => {
    const style = getComputedStyle(el);
    return { image: style.backgroundImage, radius: style.borderRadius, color: style.backgroundColor };
  });
  expect(painted.image).toContain("radial-gradient");
  expect(painted.image).toMatch(/,\s*0\)/);
  expect(painted.radius).not.toBe("0px");
  expect(painted.color === "transparent" || painted.color === "rgba(0, 0, 0, 0)").toBe(true);
  await shot(page, "sun-desk");

  if (process.env.SHOTS && test.info().project.name === "chromium-desk") {
    const texture = () => sky.locator("wakusei-body").first().evaluate((node) => (node as unknown as { stats?: { textureWidth?: number } }).stats?.textureWidth ?? 0);
    for (const id of ["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]) {
      await page.goto(`${URL}?background=${id}&look=painted`);
      await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
      if (id === "venus") await expect(sky.locator("wakusei-body").first()).toHaveAttribute("look", "realistic");
      else await expect.poll(texture, { timeout: 30_000 }).toBeGreaterThan(0);
      await shot(page, `${id}-globe`);
    }
    for (const [query, name] of [
      ["jupiter&moon=all", "jupiter-moons"],
      ["jupiter&moon=io", "jupiter-io"],
      ["saturn&moon=titan", "saturn-titan"],
      ["mars&moon=phobos", "mars-phobos"],
    ] as const) {
      await page.goto(`${URL}?background=${query}&look=painted`);
      await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
      await expect.poll(texture, { timeout: 30_000 }).toBeGreaterThan(0);
      await expect(sky.locator("wakusei-body[data-moon]").first()).toBeVisible();
      await page.waitForTimeout(1200);
      await shot(page, name);
    }
    await page.goto(`${URL}?background=earth&look=painted&moon=moon`);
    await page.locator('[data-testid="hero"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="earth"] chikyu-earth-realistic')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => page.locator('[data-testid="sky-moons"] wakusei-body').evaluate((node) => (node as unknown as { stats?: { textureWidth?: number } }).stats?.textureWidth ?? 0), { timeout: 30_000 }).toBeGreaterThan(0);
    await shot(page, "earth-moon-globe");
  }
  expect(problems).toEqual([]);
});
