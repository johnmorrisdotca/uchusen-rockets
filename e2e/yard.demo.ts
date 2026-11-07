// The yard page: the whole yard, a jump to each bay, day and night, the free spine leaving and coming back, and the build player for the chosen bay.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/yard.html";

test("the yard page jumps to a bay, lights the night, slides the free spine and plays that bay", async ({ page }) => {
  await page.goto(URL);
  const stage = page.getByTestId("yard-stage");
  await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
  await expect(stage).toHaveAttribute("data-shot", "whole");
  await page.getByTestId("yard-lounge").click();
  await expect(stage).toHaveAttribute("data-shot", "lounge");
  await page.getByTestId("yard-visitor").click();
  await expect(stage).toHaveAttribute("data-shot", "visitor");
  await page.getByTestId("yard-night").click();
  await expect(stage).toHaveAttribute("data-sky", "night");
  await page.getByTestId("yard-day").click();
  await expect(stage).toHaveAttribute("data-sky", "day");
  await page.getByTestId("yard-loose").click();
  await expect(stage).toHaveAttribute("data-loose", "out");
  await page.getByTestId("yard-loose").click();
  await expect(stage).toHaveAttribute("data-loose", "home");
  await page.getByTestId("yard-hall").click();
  await page.getByTestId("yard-build").click();
  await expect(stage).toHaveAttribute("data-build", "on");
  await expect(stage).toHaveAttribute("data-ship", "fleet-kaminari");
  await expect(page.getByTestId("build-bar")).toBeVisible();
  const fit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(fit).toBeLessThanOrEqual(1);
});

test("an address picks the ship and the bay, and the build starts there", async ({ page }) => {
  await page.goto(`${URL}?bay=hall&ship=miyamoto`);
  const stage = page.getByTestId("yard-stage");
  await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
  await expect(stage).toHaveAttribute("data-shot", "hall");
  await expect(stage).toHaveAttribute("data-ship", "miyamoto");
  await expect(stage).toHaveAttribute("data-build", "on");
  await expect(page.getByTestId("yard-ship")).toHaveValue("miyamoto");
  await expect(page.getByTestId("yard-hall")).toHaveAttribute("aria-pressed", "true");
  const address = new globalThis.URL(page.url());
  expect(address.searchParams.get("bay")).toBe("hall");
  expect(address.searchParams.get("ship")).toBe("miyamoto");
  await expect(page.getByTestId("build-now")).toContainText("Miyamoto");
  await expect(page.getByTestId("build-now")).toContainText("Hall");
  await expect(page.getByTestId("build-now")).toContainText("0 of ");
  await page.getByTestId("yard-ship").selectOption("hanabusa");
  await expect(page.getByTestId("yard-hall")).toHaveAttribute("aria-pressed", "true");
  expect(new globalThis.URL(page.url()).searchParams.get("ship")).toBe("hanabusa");
  await expect(page.getByTestId("build-now")).toContainText("Hanabusa");
});

test.describe("the build keeps moving while it plays", () => {
  test.use({ reducedMotion: "no-preference" });

  test("frames run, a drone moves across the picture, one flight finishes in about 30 seconds, and a pause holds the drone still", async ({ page }) => {
    await page.goto(URL);
    const stage = page.getByTestId("yard-stage");
    await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
    await page.getByTestId("yard-spine").click();
    await page.getByTestId("yard-build").click();
    await page.getByTestId("build-play").click();
    await expect(stage).toHaveAttribute("data-playing", "yes");
    await expect.poll(async () => Number(await stage.getAttribute("data-frames"))).toBeGreaterThan(2);
    const mark = page.getByTestId("yard-drone");
    await expect(mark).toBeVisible({ timeout: 15_000 });
    const at = async () => {
      const box = await mark.boundingBox();
      expect(box).toBeTruthy();
      return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    };
    const first = await at();
    const started = Date.now();
    let far = 0;
    while (Date.now() - started < 6_000) {
      await page.waitForTimeout(350);
      const next = await at();
      far = Math.max(far, Math.hypot(next.x - first.x, next.y - first.y));
      if (far > 16) break;
    }
    expect(far).toBeGreaterThan(16);
    const built = async () => Number(((await page.getByTestId("build-now").textContent()) ?? "").match(/(\d+) of /)?.[1] ?? "0");
    const before = await built();
    await page.getByTestId("yard-watch").click();
    await expect(page.getByTestId("yard-watch")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(built, { timeout: 45_000 }).toBeGreaterThan(before);
    await page.getByTestId("build-play").click();
    await expect(stage).toHaveAttribute("data-playing", "no");
    await page.waitForTimeout(300);
    const held = Number(await stage.getAttribute("data-frames"));
    const heldAt = await page.getByTestId("yard-drone").boundingBox();
    await page.waitForTimeout(700);
    expect(Number(await stage.getAttribute("data-frames"))).toBe(held);
    const still = await page.getByTestId("yard-drone").boundingBox();
    if (heldAt && still) expect(Math.hypot(still.x - heldAt.x, still.y - heldAt.y)).toBeLessThan(2);
  });

  test("play builds the chosen ship from the start, and a drone is on the picture", async ({ page }) => {
    await page.goto(`${URL}?bay=hall&ship=miyamoto`);
    const stage = page.getByTestId("yard-stage");
    await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
    await expect(stage).toHaveAttribute("data-build", "on");
    const built = async () => Number(((await page.getByTestId("build-now").textContent()) ?? "").match(/(\d+) of /)?.[1] ?? "0");
    expect(await built()).toBe(0);
    await page.getByTestId("build-play").click();
    await expect(stage).toHaveAttribute("data-playing", "yes");
    await expect(page.getByTestId("yard-drone")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("yard-watch").click();
    await expect.poll(built, { timeout: 45_000 }).toBeGreaterThan(0);
  });
});
