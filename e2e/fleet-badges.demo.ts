// The fleet's badges in a real browser: every badge is drawn at 16 px and at 512 px, on a white blanket and on a dark hull, and each time it is far from blank, stands off the background, keeps its own look (no two the
// same at 16 px) and, for the round ones, leaves the corners of its box clear. Pictures only: no WebGL, no server page.
import { expect, type Page, test } from "@playwright/test";
import { FLEET_BADGES, FLEET_PALETTE } from "../src/index.ts";

test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "the badges are pictures: one Chromium draws them");
});

const BACKGROUNDS = { blanket: FLEET_PALETTE.protected, hull: FLEET_PALETTE.heatSink } as const;
const WHITE = "#ffffff";

/** Draws one badge as an image at a width on a background and reads its pixels: how much of the box differs from the background, the corners, and a coarse fingerprint. */
async function draw(page: Page, svg: string, width: number, background: string) {
  return page.evaluate(
    async ([markup, w, bg]) => {
      const box = /viewBox="0 0 (\d+) (\d+)"/.exec(markup) as RegExpExecArray;
      const height = Math.round((w * Number(box[2])) / Number(box[1]));
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(markup)}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      context.fillStyle = bg;
      context.fillRect(0, 0, w, height);
      context.drawImage(image, 0, 0, w, height);
      const { data } = context.getImageData(0, 0, w, height);
      const back = [parseInt(bg.slice(1, 3), 16), parseInt(bg.slice(3, 5), 16), parseInt(bg.slice(5, 7), 16)];
      const differs = (i: number) => Math.abs(data[i] - back[0]) + Math.abs(data[i + 1] - back[1]) + Math.abs(data[i + 2] - back[2]) > 60;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) if (differs(i)) ink++;
      const corner = Math.max(1, Math.round(w / 16));
      let cornerInk = 0;
      for (let y = 0; y < corner; y++) for (let x = 0; x < corner; x++) if (differs((y * w + x) * 4)) cornerInk++;
      // 8 x 8 cells of mean brightness, to tell two pictures apart
      const cells: number[] = [];
      for (let cy = 0; cy < 8; cy++)
        for (let cx = 0; cx < 8; cx++) {
          let sum = 0;
          let count = 0;
          for (let y = Math.floor((cy * height) / 8); y < Math.floor(((cy + 1) * height) / 8); y++)
            for (let x = Math.floor((cx * w) / 8); x < Math.floor(((cx + 1) * w) / 8); x++) {
              const i = (y * w + x) * 4;
              sum += data[i] + data[i + 1] + data[i + 2];
              count++;
            }
          cells.push(sum / Math.max(1, count) / 3);
        }
      return { ink: ink / (w * height), cornerInk: cornerInk / (corner * corner), cells };
    },
    [svg, width, background] as const,
  );
}

test("every badge draws at 16 px and 512 px on a blanket and on a hull: not blank, off the background, corners clear", async ({ page }) => {
  await page.goto("about:blank");
  for (const one of FLEET_BADGES)
    for (const [place, background] of [...Object.entries(BACKGROUNDS), ["white", WHITE]] as const)
      for (const width of [16, 512]) {
        const seen = await draw(page, one.svg, width, background);
        const label = `${one.id} on ${place} at ${width}px`;
        expect(seen.ink, `${label} is not blank`).toBeGreaterThan(0.08);
        expect(seen.ink, `${label} leaves the background showing`).toBeLessThan(0.97);
        if (one.kind !== "patch" && one.id !== "fleet-emblem") expect(seen.cornerInk, `${label} is round: its corners are clear`).toBeLessThan(0.05);
      }
});

test("at 16 px no two badges look the same, and a crest differs from its crew patch", async ({ page }) => {
  await page.goto("about:blank");
  const looks = new Map<string, number[]>();
  for (const one of FLEET_BADGES) looks.set(one.id, (await draw(page, one.svg, 16, WHITE)).cells);
  const gap = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  const ids = [...looks.keys()];
  for (const [i, a] of ids.entries())
    for (const b of ids.slice(i + 1)) expect(gap(looks.get(a) as number[], looks.get(b) as number[]), `${a} and ${b}`).toBeGreaterThan(1.5);
});
