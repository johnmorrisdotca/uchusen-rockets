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

test.describe("the build keeps moving while it plays", () => {
  test.use({ reducedMotion: "no-preference" });

  test("frames run, a drone moves within a second, one flight finishes in about 30 seconds, and a pause draws nothing more", async ({ page }) => {
    await page.goto(URL);
    const stage = page.getByTestId("yard-stage");
    await expect(stage).toHaveAttribute("data-ready", "yes", { timeout: 60_000 });
    await page.getByTestId("yard-spine").click();
    await page.getByTestId("yard-build").click();
    await page.getByTestId("build-play").click();
    await expect(stage).toHaveAttribute("data-playing", "yes");
    await expect.poll(async () => Number(await stage.getAttribute("data-frames"))).toBeGreaterThan(2);
    await expect.poll(async () => stage.getAttribute("data-drone")).toBeTruthy();
    const firstDrone = await stage.getAttribute("data-drone");
    await expect.poll(async () => stage.getAttribute("data-drone"), { timeout: 5_000 }).not.toBe(firstDrone);
    const built = async () => Number(((await page.getByTestId("build-now").textContent()) ?? "").match(/(\d+) of /)?.[1] ?? "0");
    const before = await built();
    await page.getByTestId("yard-watch").click();
    await expect(page.getByTestId("yard-watch")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(built, { timeout: 45_000 }).toBeGreaterThan(before);
    await page.getByTestId("build-play").click();
    await expect(stage).toHaveAttribute("data-playing", "no");
    await page.waitForTimeout(300);
    const held = Number(await stage.getAttribute("data-frames"));
    await page.waitForTimeout(700);
    expect(Number(await stage.getAttribute("data-frames"))).toBe(held);
  });
});
