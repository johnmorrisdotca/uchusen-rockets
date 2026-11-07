// A painted rocket fades in once. After it is up, the canvas does not go clear and fade in again.
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const URL = "/uchusen-rockets/?rocket=starship&look=painted";

test("a painted rocket fades in once and does not dip", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desk", "One browser's frames are enough");
  test.setTimeout(60_000);
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("uchusen-rocket")?.shadowRoot?.querySelector("canvas");
    return !!canvas && Number(getComputedStyle(canvas).opacity) >= 0.85;
  });
  const loaded = await page.evaluate(async () => {
    const samples: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 3000) {
      const canvas = document.querySelector("uchusen-rocket")?.shadowRoot?.querySelector("canvas");
      samples.push(canvas ? Math.round(Number(getComputedStyle(canvas).opacity) * 100) / 100 : -1);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
    return samples;
  });
  console.log(loaded.join(" "));
  expect(loaded.some((value) => value <= 0.25), `dipped: ${loaded.join(" ")}`).toBe(false);
});
