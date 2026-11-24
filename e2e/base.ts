// The demo's tests never reach the live site: wakusei-planets asks for its map tiles' manifest on johnmorrisdotca.github.io, and a request that fails there (access control, the network) was a page problem that failed CI.
// The manifest is the package's own published tile levels (e2e/tiles-manifest.json). An empty catalogue made WebKit report the manifest as an access-control failure, and refusing a tile did the same, so each tile is answered with one of the package's own maps.
// The bodies' own pictures (jsDelivr's copy of the installed package's dist/textures) are read from node_modules, so no test waits on a CDN either.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base } from "@playwright/test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEXTURES = join(ROOT, "node_modules", "@johnmorrisdotca", "wakusei-planets", "dist", "textures");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".avif": "image/avif" };
const CORS = { "access-control-allow-origin": "*" };

const TILES = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/";

export const test = base.extend<{ tiles: void }>({
  tiles: [
    async ({ context }, use) => {
      const manifest = await readFile(join(ROOT, "e2e", "tiles-manifest.json"));
      const tile = await readFile(join(TEXTURES, "mars-512.webp"));
      await context.route(`${TILES}**`, (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("/manifest.json")) return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: manifest });
        const ext = path.slice(path.lastIndexOf("."));
        if (ext in TYPES) return route.fulfill({ status: 200, contentType: TYPES[ext], headers: CORS, body: tile });
        return route.fulfill({ status: 204, headers: CORS, body: "" });
      });
      await context.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@johnmorrisdotca\/wakusei-planets@[^/]+\/dist\/textures\/.+$/, async (route) => {
        const file = new URL(route.request().url()).pathname.split("/dist/textures/")[1]!;
        try {
          const ext = file.slice(file.lastIndexOf("."));
          await route.fulfill({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", headers: { "access-control-allow-origin": "*" }, body: await readFile(join(TEXTURES, decodeURIComponent(file))) });
        } catch {
          await route.fulfill({ status: 404, body: "" });
        }
      });
      await use();
    },
    { auto: true },
  ],
});
