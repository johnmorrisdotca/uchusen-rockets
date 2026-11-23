// The demo's tests never reach the live site: wakusei-planets asks for its map tiles' manifest on johnmorrisdotca.github.io, and a request that fails there (access control, the network) was a page problem that failed CI.
// Every test gets an empty manifest instead, and the bodies' own pictures (jsDelivr's copy of the installed package's dist/textures) are read from node_modules, so no test waits on a CDN either; any other tile is refused.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base } from "@playwright/test";

const TEXTURES = join(fileURLToPath(new URL("..", import.meta.url)), "node_modules", "@johnmorrisdotca", "wakusei-planets", "dist", "textures");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".avif": "image/avif" };

const TILES = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/";

export const test = base.extend<{ tiles: void }>({
  tiles: [
    async ({ context }, use) => {
      await context.route(`${TILES}**`, (route) =>
        route.request().url() === `${TILES}manifest.json`
          ? route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ tileSize: 512, bodies: {} }) })
          : route.abort(),
      );
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
