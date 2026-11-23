// The demo's tests never reach the live site: wakusei-planets asks for its map tiles' manifest on johnmorrisdotca.github.io, and a request that fails there (access control, the network) was a page problem that failed CI.
// Every test gets an empty manifest instead, and the bodies' own pictures (jsDelivr's copy of the installed package's dist/textures) are read from node_modules, so no test waits on a CDN either; any other tile is refused.
// A test that opens its own context (browser.newContext, browser.newPage) gets the same answers. The page fixture's context is not that context, so the routes have to be on the browser.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, type Browser, type BrowserContext } from "@playwright/test";

const TEXTURES = join(fileURLToPath(new URL("..", import.meta.url)), "node_modules", "@johnmorrisdotca", "wakusei-planets", "dist", "textures");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".avif": "image/avif" };

const TILES = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/";
const TEXTURE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@johnmorrisdotca\/wakusei-planets@[^/]+\/dist\/textures\/.+$/;

const stubbed = new WeakSet<BrowserContext>();
const wrapped = new WeakSet<Browser>();

/** Answer the tiles manifest and the body pictures from this machine, and refuse every other tile. */
async function stubTiles(context: BrowserContext): Promise<void> {
  if (stubbed.has(context)) return;
  stubbed.add(context);
  await context.route(`${TILES}**`, (route) =>
    route.request().url() === `${TILES}manifest.json`
      ? route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ tileSize: 512, bodies: {} }) })
      : route.abort(),
  );
  await context.route(TEXTURE, async (route) => {
    const file = new URL(route.request().url()).pathname.split("/dist/textures/")[1]!;
    try {
      const ext = file.slice(file.lastIndexOf("."));
      await route.fulfill({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", headers: { "access-control-allow-origin": "*" }, body: await readFile(join(TEXTURES, decodeURIComponent(file))) });
    } catch {
      await route.fulfill({ status: 404, body: "" });
    }
  });
}

/** Contexts a test opens itself are not the page fixture's context, so they miss its routes unless the browser installs them. */
function stubBrowser(browser: Browser): void {
  if (wrapped.has(browser)) return;
  wrapped.add(browser);
  const openContext = browser.newContext.bind(browser);
  const openPage = browser.newPage.bind(browser);
  browser.newContext = (async (options?: Parameters<Browser["newContext"]>[0]) => {
    const context = await openContext(options);
    await stubTiles(context);
    return context;
  }) as Browser["newContext"];
  browser.newPage = (async (options?: Parameters<Browser["newPage"]>[0]) => {
    const page = await openPage(options);
    await stubTiles(page.context());
    return page;
  }) as Browser["newPage"];
}

export const test = base.extend<{ tiles: void }>({
  browser: [async ({ browser }, use) => {
    stubBrowser(browser);
    await use(browser);
  }, { scope: "worker" }],
  tiles: [async ({ context }, use) => {
    await stubTiles(context);
    await use();
  }, { auto: true }],
});
