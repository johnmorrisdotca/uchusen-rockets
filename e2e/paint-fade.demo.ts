// The painted rocket fades in once. After the picture first reaches full, it does not dip on the way to the model.
// After the canvas is fully up, its opacity stays at 1.
import { inflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });

const URL = "/uchusen-rockets/";

/** Mean luma of a PNG. Every other pixel, so a frame is cheap to read. */
function luma(png: Buffer): number {
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 8;
  let color = 6;
  const parts: Buffer[] = [];
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      color = data[9];
    } else if (type === "IDAT") parts.push(data);
    else if (type === "IEND") break;
  }
  if (depth !== 8 || (color !== 2 && color !== 6) || width === 0) return 0;
  const raw = inflateSync(Buffer.concat(parts));
  const channels = color === 6 ? 4 : 3;
  const stride = width * channels;
  let previous = Buffer.alloc(stride);
  let pos = 0;
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = previous[i];
      const upLeft = i >= channels ? previous[i - channels] : 0;
      const value = raw[pos];
      pos += 1;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const distanceLeft = Math.abs(estimate - left);
        const distanceUp = Math.abs(estimate - up);
        const distanceUpLeft = Math.abs(estimate - upLeft);
        predictor = distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft;
      }
      row[i] = (value + predictor) & 255;
    }
    previous = row;
    if (y % 2 !== 0) continue;
    for (let x = 0; x < width; x += 2) {
      const i = x * channels;
      sum += 0.2126 * row[i] + 0.7152 * row[i + 1] + 0.0722 * row[i + 2];
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

test("a painted rocket fades in once and does not dip", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desk", "One browser's frames are enough");
  test.setTimeout(180_000);
  const rockets = ["starship", "fleet-kaminari", "fleet-kyotori"];
  for (const rocket of rockets) {
    await page.goto(`${URL}?rocket=${rocket}&look=painted`, { waitUntil: "commit" });
    const client = await page.context().newCDPSession(page);
    const samples: number[] = [];
    const started = Date.now();
    while (Date.now() - started < 12_000) {
      const box = await page.evaluate(() => {
        const node = document.querySelector("#hero");
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        if (rect.width < 20) return null;
        return { x: rect.x + rect.width * 0.3, y: rect.y + rect.height * 0.15, width: rect.width * 0.4, height: rect.height * 0.7 };
      });
      const clip = box ?? { x: 180, y: 240, width: 140, height: 260 };
      const shot = await client.send("Page.captureScreenshot", { format: "png", clip: { ...clip, scale: 1 } });
      const png = Buffer.from(shot.data, "base64");
      const value = luma(png);
      samples.push(Math.round(value * 10) / 10);
      writeFileSync(testInfo.outputPath(`${rocket}-${String(samples.length).padStart(3, "0")}.png`), png);
      await page.waitForTimeout(100);
    }
    console.log(rocket, samples.join(" "));
    const peak = Math.max(...samples);
    expect(peak, `${rocket} never came up: ${samples.join(" ")}`).toBeGreaterThan(12);
    const reached = samples.findIndex((value) => value >= peak - 8);
    expect(reached, rocket).toBeGreaterThanOrEqual(0);
    const after = samples.slice(reached);
    const lowest = Math.min(...after);
    expect(lowest, `${rocket} dipped after it was up: ${samples.join(" ")}`).toBeGreaterThan(peak - 8);
  }
});

test("a painted canvas stays up after its fade", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desk", "One browser's frames are enough");
  test.setTimeout(60_000);
  await page.goto(`${URL}?rocket=starship&look=painted`, { waitUntil: "domcontentloaded" });
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
