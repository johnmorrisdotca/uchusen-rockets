// The distance buttons climb away from the body. The camera eases, the address keeps the step, and a moon appears when the distance reaches it.
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

test("each orbit step sets the altitude, the camera eases, and the address round-trips", async ({ page }) => {
  const problems = watch(page);
  const earth = page.locator('[data-testid="earth"]');
  const note = page.locator('[data-testid="orbit-altitude"]');
  const moons = page.locator('[data-testid="sky-moons"]');
  await page.goto(`${URL}?background=earth`);
  await page.locator('[data-testid="panel-background"]').click();
  await expect(note).toHaveAttribute("data-km", "400");
  await expect(page.locator('[data-testid="orbit-400"]')).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("orbit")).toBeNull();
  await expect(moons).toBeHidden();

  // the page's clock is held and driven by the test, a tenth of a second at a time, so the easing is read the same on a machine that draws a frame a second. Left running it flows by itself, and a stall of 800 ms on a slow runner finishes the ease before the first reading.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('[data-testid="orbit-10000"]').evaluate((button) => (button as HTMLButtonElement).click());
  await expect(earth).toHaveAttribute("data-orbit-moving", "1");
  const values: number[] = [Number(await earth.getAttribute("data-orbit-open"))];
  for (let step = 0; step < 40 && (await earth.getAttribute("data-orbit-moving")) === "1"; step += 1) {
    await page.clock.runFor(100);
    values.push(Number(await earth.getAttribute("data-orbit-open")));
  }
  await page.clock.resume();
  await expect.poll(async () => earth.getAttribute("data-orbit-moving")).toBe("0");
  const open = await earth.getAttribute("data-orbit-open");
  const target = await earth.getAttribute("data-orbit-target");
  expect(open).toBe(target);
  expect(new Set(values.map((value) => value.toFixed(3))).size).toBeGreaterThan(2);
  expect(values[values.length - 1]).toBeGreaterThan(values[0]);
  await expect(note).toHaveAttribute("data-km", "10000");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("orbit")).toBe("10000km");
  await expect(moons).toBeHidden();

  for (const km of [1000, 36000, 100000, 384400]) {
    await page.locator(`[data-testid="orbit-${km}"]`).click();
    await expect(note).toHaveAttribute("data-km", String(km));
  }
  await expect(moons).toHaveAttribute("data-draws", "moon");

  await page.goto(`${URL}?background=earth&orbit=36000km`);
  await expect(page.locator('[data-testid="orbit-36000"]')).toHaveAttribute("aria-pressed", "true");
  await expect(note).toHaveAttribute("data-km", "36000");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("orbit")).toBe("36000km");

  await page.locator('[data-testid="panel-background"]').click();
  await page.locator('[data-testid="background-jupiter"]').click();
  const first = page.locator('[data-testid="orbits"] button').first();
  await expect(first).toBeVisible();
  await expect(first).not.toHaveAttribute("data-km", "400");

  await page.locator('[data-testid="background-none"]').click();
  await expect(page.locator('[data-testid="orbits"]')).toBeHidden();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("orbit")).toBeNull();
  expect(problems, problems.join("\n")).toEqual([]);
});
