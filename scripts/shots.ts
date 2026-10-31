// Pictures of every look of every variant from every side, in a real headless browser with swiftshader, for checking by eye. Takes the viewing matrix as words:
//
//   node scripts/shots.ts <folder> <rocket> [variants] [shows] [looks] [views]
//
// Each comma list falls back to all of the rocket's. It starts the site's own server on 7902, takes the shots and stops it, by the process it started.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { ROCKETS, showsOf } from "../src/index.ts";

const out = process.argv[2] ?? "docs/images/check";
const rocketId = process.argv[3] ?? "starship";
const list = (i: number, all: string[]) => (process.argv[i] ? process.argv[i].split(",") : all);
const variantsAll = ROCKETS[rocketId].variants;
const variants = list(4, variantsAll.map((variant) => variant.id));
const onlyShows = process.argv[5] ? process.argv[5].split(",") : null;
const looks = list(6, ["line", "thick", "painted"]);
const views = list(7, ["front", "back", "side", "below"]);
mkdirSync(out, { recursive: true });
const port = 7902;
const server = spawn("node", ["scripts/dev.ts"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
await new Promise((resolve) => setTimeout(resolve, 700));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const problems: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 620, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/uchusen-rockets/element-check.html`);
  await page.evaluate(() => {
    document.body.style.cssText = "margin:0;background:#070c17;color:#e4ebf5";
    document.body.replaceChildren();
    const r = document.createElement("uchusen-rocket");
    r.id = "r";
    r.setAttribute("spin", "off");
    document.body.append(r);
  });
  await page.evaluate((rocket) => document.getElementById("r")?.setAttribute("rocket", rocket), rocketId);
  for (const variant of variants)
    for (const show of showsOf(variantsAll.find((one) => one.id === variant)?.slots ?? [])) {
      if (onlyShows && !onlyShows.includes(show)) continue;
      for (const look of looks)
        for (const view of views) {
          await page.evaluate(
            ([v, s, l, w]) => {
              const r = document.getElementById("r") as HTMLElement;
              r.setAttribute("variant", v);
              r.setAttribute("show", s);
              r.setAttribute("look", l);
              r.setAttribute("view", w);
            },
            [variant, show, look, view],
          );
          await page.locator('uchusen-rocket[data-state="3d"]').waitFor({ timeout: 60_000 });
          if (look === "painted") await page.waitForFunction(() => (document.getElementById("r") as HTMLElement).dataset.painted !== "loading", undefined, { timeout: 60_000 });
          await page.waitForTimeout(350);
          await page.screenshot({ path: join(out, `${variant}-${show}-${look}-${view}.jpg`), type: "jpeg", quality: 80 });
        }
    }
} finally {
  await browser.close();
  server.kill();
}
if (problems.length) console.error([...new Set(problems)].join("\n"));
console.log(`shots in ${out}`);
