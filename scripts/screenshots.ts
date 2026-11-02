// Pictures of the demo for the README, in a real headless browser: `pnpm screenshots [folder]`. It starts the site's own server on 7902, takes the shots and stops it.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Page } from "@playwright/test";

const out = process.argv[2] ?? "docs/images";
mkdirSync(out, { recursive: true });
const port = 7902;
const server = spawn("node", ["scripts/dev.ts"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
await new Promise((resolve) => setTimeout(resolve, 600));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const url = `http://127.0.0.1:${port}/uchusen-rockets/`;
const errors: string[] = [];
const press = async (page: Page, id: string) => {
  await page.locator(`[data-testid="${id}"]`).click();
};
const settled = async (page: Page) => {
  await page.locator('uchusen-rocket#hero[data-state="3d"]').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => (document.getElementById("hero") as HTMLElement).dataset.painted !== "loading", undefined, { timeout: 90_000 });
  await page.waitForTimeout(1200);
};
try {
  const page = await browser.newPage({ viewport: { width: 1320, height: 980 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await settled(page);
  const hero = (name: string) => page.locator("#main-view").screenshot({ path: join(out, name), type: "jpeg", quality: 84 });
  await hero("main-line.jpg");
  await press(page, "look-thick");
  await settled(page);
  await hero("main-thick.jpg");
  await press(page, "look-painted");
  await settled(page);
  await hero("main-painted.jpg");
  await press(page, "show-apart");
  await settled(page);
  await hero("apart-painted.jpg");
  await press(page, "show-booster");
  await press(page, "view-below");
  await settled(page);
  await hero("booster-below.jpg");
  await press(page, "look-line");
  await press(page, "show-ship");
  await press(page, "view-back");
  await settled(page);
  await hero("ship-back-line.jpg");
  await press(page, "more-compare");
  await page.locator("#compare").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator("#compare").screenshot({ path: join(out, "compare.jpg"), type: "jpeg", quality: 84 });
  // every rocket at one scale
  for (const key of ["starship:v1-flight1", "starship:v1", "starship:v2", "starship:v4", "falcon-9:block-5", "falcon-9:block-5-dragon-2", "falcon-heavy:falcon-heavy", "grasshopper:grasshopper", "dragon:dragon-2"]) await press(page, `compare-${key}`);
  await page.waitForTimeout(300);
  await page.locator('[data-testid="lineup"]').screenshot({ path: join(out, "family.jpg"), type: "jpeg", quality: 84 });
  await page.locator("#main-view").scrollIntoViewIfNeeded();
  await press(page, "rocket-falcon-heavy");
  await press(page, "look-painted");
  await press(page, "view-three-quarter");
  await settled(page);
  await hero("falcon-heavy-painted.jpg");
  await press(page, "rocket-falcon-9");
  await press(page, "variant-block-5-dragon-2");
  await press(page, "show-apart");
  await settled(page);
  await hero("falcon-9-apart.jpg");
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  await phone.goto(url);
  await phone.locator('uchusen-rocket#hero[data-state="3d"]').waitFor({ timeout: 90_000 });
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: join(out, "phone.jpg"), type: "jpeg", quality: 84 });
  await phone.close();
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) console.error(errors.join("\n"));
console.log(`shots in ${out}`);
