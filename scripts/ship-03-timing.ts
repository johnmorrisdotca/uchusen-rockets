// How long a visitor's browser takes to build Miyamoto: the compiled model is loaded into headless Chromium (software GL, one core's worth of work as on a laptop) and built at the coarse and the full level, measuring the
// parts, the meshes and the .glb the viewer would hand to three.js. `node scripts/ship-03-timing.ts <folder with the compiled src>`; it serves on 7904 (or TIMING_PORT).
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

const root = resolve(process.argv[2] ?? "dist");
const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  try {
    if (path === "/") return void response.writeHead(200, { "content-type": "text/html" }).end("<!doctype html><title>t</title>");
    response.writeHead(200, { "content-type": extname(path) === ".js" ? "text/javascript" : "text/plain" }).end(readFileSync(join(root, path)));
  } catch {
    response.writeHead(404).end("no");
  }
});
const port = Number(process.env.TIMING_PORT ?? 7904);
await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.addScriptTag({
    type: "module",
    content: `
      import { parts, LEVELS } from "/model/fleet/ship-03/index.js";
      import { MIYAMOTO_VARIANT_SLOTS } from "/model/fleet/ship-03/variants.js";
      import { meshOf } from "/model/pieces.js";
      import { toGlb } from "/build/glb.js";
      const ids = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto);
      const once = (detail, level) => {
        const start = performance.now();
        let pieces = 0;
        const made = parts().filter((part) => ids.includes(part.id)).map((part) => {
          const p = part.pieces({ detail, level });
          pieces += p.length;
          return { name: part.id, mesh: meshOf(p), at: [0, 0, 0] };
        });
        const glb = toGlb(made);
        return { ms: Math.round(performance.now() - start), pieces, bytes: glb.bytes.length };
      };
      window.measure = () => ({ firstPicture: once(1, "coarse"), quarterDetail: once(LEVELS[0], "fine"), fullCold: once(1, "fine"), fullWarm: once(1, "fine") });
    `,
  });
  await page.waitForFunction(() => "measure" in window);
  const result = await page.evaluate(() => (window as unknown as { measure: () => unknown }).measure());
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  server.close();
}
