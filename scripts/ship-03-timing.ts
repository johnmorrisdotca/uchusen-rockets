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
  const result = await page.evaluate(async () => {
    const { parts, LEVELS } = await import("/model/fleet/ship-03/index.js");
    const { MIYAMOTO_VARIANT_SLOTS } = await import("/model/fleet/ship-03/variants.js");
    const { meshOf } = await import("/model/pieces.js");
    const { toGlb } = await import("/build/glb.js");
    const ids = Object.values(MIYAMOTO_VARIANT_SLOTS.miyamoto) as string[];
    const once = (detail: number) => {
      const start = performance.now();
      const list = parts().filter((part: { id: string }) => ids.includes(part.id));
      let pieces = 0;
      const made = list.map((part: { id: string; pieces: (o: { detail: number }) => unknown[] }) => {
        const p = part.pieces({ detail });
        pieces += p.length;
        return { name: part.id, mesh: meshOf(p), at: [0, 0, 0] };
      });
      const glb = toGlb(made);
      return { ms: Math.round(performance.now() - start), pieces, bytes: glb.bytes.length };
    };
    const first = once(LEVELS[0]);
    const cold = once(1);
    const warm = once(1);
    return { coarse: first, fullCold: cold, fullWarm: warm };
  });
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  server.close();
}
