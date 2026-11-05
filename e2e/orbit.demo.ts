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

  await page.evaluate(() => {
    const holder = document.querySelector('[data-testid="earth"]');
    const button = document.querySelector('[data-testid="orbit-10000"]');
    if (!(holder instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) return;
    const seen: number[] = [];
    (window as unknown as { orbitSeen: number[] }).orbitSeen = seen;
    const start = performance.now();
    const tick = () => {
      seen.push(Number(holder.dataset.orbitOpen));
      const elapsed = performance.now() - start;
      if (elapsed < 4000 && (holder.dataset.orbitMoving === "1" || elapsed < 900)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    button.click();
  });
  await expect.poll(async () => page.evaluate(() => ((window as unknown as { orbitSeen?: number[] }).orbitSeen ?? []).length)).toBeGreaterThan(2);
  await expect.poll(async () => earth.getAttribute("data-orbit-moving")).toBe("0");
  const open = await earth.getAttribute("data-orbit-open");
  const target = await earth.getAttribute("data-orbit-target");
  expect(open).toBe(target);
  const values = await page.evaluate(() => (window as unknown as { orbitSeen: number[] }).orbitSeen);
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
