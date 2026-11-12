// Pictures of the demo for the README, in a real headless browser: `pnpm screenshots [folder]`. It starts the site's own server on 8277, takes the shots and stops it.
// `pnpm screenshots --thumbnail` takes only the family's thumbnail, dark thumbnail and icon (scripts/family-thumbnail.mjs).
// Chromium draws in software only (SwiftShader), never on the graphics card.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium, type Page } from "@playwright/test";
import { captureDrawing, composeThumbnails } from "./family-thumbnail.mjs";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const onlyThumbnail = process.argv.includes("--thumbnail");
const out = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "docs/images";
mkdirSync(out, { recursive: true });
const port = 8277;
const server = spawn("node", ["scripts/dev.ts"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
await new Promise((resolve) => setTimeout(resolve, 600));
await acquireBrowserLock();
const browser = await chromium.launch({ args: ["--headless=new", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-compositing", "--ignore-gpu-blocklist"] });
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
// The family's thumbnail: rockets of different kinds side by side, painted, in 3D, on the family's paper and its black
// cloth; the icon is one rocket alone, laid across the square so that it fills it. Each element only, never the page.
const THUMBNAIL_ROCKETS = [
  ["saturn-v", "saturn-v"],
  ["starship", "v3"],
  ["space-shuttle", "stack", "side"],
  ["falcon-heavy", "falcon-heavy"],
  ["sls", "block-1"],
];
const ICON_ROCKET = [["space-shuttle", "stack", "side"]];
const stage = async (page: Page, rockets: string[][], width: number, height: number, turn = 0) => {
  await page.goto(url);
  await page.waitForFunction(() => customElements.get("uchusen-rocket"));
  await page.evaluate(
    ({ rockets, width, height, turn }) => {
      const row = document.createElement("div");
      row.id = "thumbnail-stage";
      row.style.cssText = `display:flex;align-items:flex-end;padding:8px;width:max-content;transform:rotate(${turn}deg)`;
      for (const [rocket, variant, view = "three-quarter"] of rockets) {
        const one = document.createElement("uchusen-rocket");
        for (const [name, value] of Object.entries({ rocket, variant, show: "together", look: "painted", view, spin: "off" })) one.setAttribute(name, value);
        one.style.cssText = `display:block;width:${width}px;--uchusen-aspect:${width} / ${height};background:transparent`;
        row.append(one);
      }
      document.body.replaceChildren(row);
    },
    { rockets, width, height, turn },
  );
  const all = page.locator("#thumbnail-stage uchusen-rocket");
  for (let at = 0; at < rockets.length; at += 1) await all.nth(at).and(page.locator('[data-state="3d"]')).waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>("#thumbnail-stage uchusen-rocket")].every((one) => one.dataset.painted !== "loading"), undefined, { timeout: 120_000 });
  await page.waitForTimeout(2500);
  return captureDrawing(page, "#thumbnail-stage");
};
const thumbnails = async () => {
  const taken: Record<string, Buffer> = {};
  for (const [kind, scheme] of [["light", "light"], ["dark", "dark"], ["icon", "light"]] as const) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce" });
    taken[kind] = kind === "icon" ? await stage(page, ICON_ROCKET, 300, 600, 0) : await stage(page, THUMBNAIL_ROCKETS, 200, 560);
    if (kind === "icon") for (const picture of await composeThumbnails({ page, light: taken.light, dark: taken.dark, icon: taken.icon, label: "Uchusen Rockets 宇宙船" })) console.log(picture.file, `${Math.round(picture.bytes / 1024)} KB`);
    await page.close();
  }
};
try {
  if (!onlyThumbnail) await shots();
  await thumbnails();
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) console.error(errors.join("\n"));
console.log(`shots in ${out}`);

/** The README's pictures of the demo. */
async function shots() {
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
  // a flight, at hot staging
  await press(page, "rocket-starship");
  await press(page, "variant-v3");
  await press(page, "show-together");
  await press(page, "look-line");
  await settled(page);
  for (let step = 0; step < 4; step++) await page.locator('[data-testid="flight"]').locator('[data-testid="flight-next"]').click();
  await page.waitForTimeout(600);
  await page.locator('[data-testid="flight"]').locator('xpath=ancestor::*[contains(@class,"field")][1]').screenshot({ path: join(out, "flight.jpg"), type: "jpeg", quality: 84 });
  // NASA's painted models
  await press(page, "maker-nasa");
  await press(page, "rocket-lunar-module");
  await press(page, "look-painted");
  await settled(page);
  await page.locator(".stage-box").screenshot({ path: join(out, "lunar-module.jpg"), type: "jpeg", quality: 84 });
  await press(page, "rocket-space-shuttle");
  await press(page, "look-painted");
  await settled(page);
  await page.locator(".stage-box").screenshot({ path: join(out, "shuttle.jpg"), type: "jpeg", quality: 84 });
  // the code builder, the embed page and the documentation site
  await page.setViewportSize({ width: 1320, height: 1000 });
  await page.goto(`${url}builder.html`);
  await page.locator('html[data-ready="true"]').waitFor();
  await press(page, "rocket-falcon-9");
  await press(page, "variant-block-5");
  await press(page, "look-thick");
  await press(page, "show-apart");
  await page.locator('uchusen-rocket#rocket[data-state="3d"]').waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, "builder.jpg"), type: "jpeg", quality: 84 });
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(`${url}embed.html?rocket=falcon-9&variant=block-5&look=painted&show=apart&view=back`);
  await page.locator('html[data-ready="true"]').waitFor();
  await page.locator('uchusen-rocket#rocket[data-state="3d"]').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => (document.getElementById("rocket") as HTMLElement).dataset.painted !== "loading", undefined, { timeout: 90_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, "embed.jpg"), type: "jpeg", quality: 84 });
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto(`${url}docs/index.html`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, "docs-site.jpg"), type: "jpeg", quality: 84 });
  await page.close();
  // the engines at full thrust: a reader who asked for reduced motion has them off, so this page asks for no preference
  const lit = await browser.newPage({ viewport: { width: 1320, height: 980 }, deviceScaleFactor: 1.5, reducedMotion: "no-preference" });
  await lit.goto(`${url}?rocket=falcon-9`);
  await press(lit, "rocket-falcon-9");
  await press(lit, "variant-block-5");
  await press(lit, "look-painted");
  await press(lit, "view-below");
  await press(lit, "engines-on");
  await settled(lit);
  await lit.locator(".stage-box").screenshot({ path: join(out, "engines.jpg"), type: "jpeg", quality: 84 });
  await lit.close();
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  await phone.goto(url);
  await phone.locator('uchusen-rocket#hero[data-state="3d"]').waitFor({ timeout: 90_000 });
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: join(out, "phone.jpg"), type: "jpeg", quality: 84 });
  await phone.close();
}
