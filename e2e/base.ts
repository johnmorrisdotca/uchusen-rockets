// The demo's tests never reach the live site: wakusei-planets asks for its map tiles' manifest on johnmorrisdotca.github.io, and a request that fails there (access control, the network) was a page problem that failed CI.
// The manifest is the package's own published tile levels (e2e/tiles-manifest.json). An empty catalogue made WebKit report the manifest as an access-control failure, and refusing a tile did the same, so each tile is answered with one of the package's own maps.
// The bodies' own pictures (jsDelivr's copy of the installed package's dist/textures) are read from node_modules, so no test waits on a CDN either.
// A test that opens its own context (browser.newContext, browser.newPage) gets the same answers. The page fixture's context is not that context, so the routes have to be on the browser.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, type Browser, type BrowserContext } from "@playwright/test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TEXTURES = join(ROOT, "node_modules", "@johnmorrisdotca", "wakusei-planets", "dist", "textures");
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".avif": "image/avif" };
// WebKit drops a fulfilled tile unless the CORS header is spelled this way. A lower-case name came back as an access-control error.
const CORS = { "Access-Control-Allow-Origin": "*" };

const TEXTURE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@johnmorrisdotca\/wakusei-planets@[^/]+\/dist\/textures\/.+$/;

const stubbed = new WeakSet<BrowserContext>();
const wrapped = new WeakSet<Browser>();

/** Answer the tiles manifest and each tile from this machine. A fulfilled subresource still failed WebKit's access check, so the page's own fetch answers before that request leaves. A navigation is not that fetch: the test opens the manifest as a document, and only that document is fulfilled. */
async function stubTiles(context: BrowserContext): Promise<void> {
  if (stubbed.has(context)) return;
  stubbed.add(context);
  const manifest = await readFile(join(ROOT, "e2e", "tiles-manifest.json"), "utf8");
  const tile = await readFile(join(TEXTURES, "mars-512.webp"));
  const webp = tile.toString("base64");
  await context.addInitScript(({ manifest, webp }) => {
    const prefix = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/";
    const bytes = Uint8Array.from(atob(webp), (c) => c.charCodeAt(0));
    const native = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith(prefix)) return native(input, init);
      if (url.includes("manifest.json")) return Promise.resolve(new Response(manifest, { status: 200, headers: { "content-type": "application/json" } }));
      return Promise.resolve(new Response(bytes, { status: 200, headers: { "content-type": "image/webp" } }));
    };
  }, { manifest, webp });
  await context.route(/^https:\/\/johnmorrisdotca\.github\.io\/wakusei-planets\/tiles\//, async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    if (url.includes("manifest.json")) {
      await route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: manifest });
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/webp", headers: CORS, body: tile });
  });
  // Linux WebKit turns a fulfilled picture into a blob URL and then refuses it ("access control checks"). Chromium can read the file from this machine. WebKit loads the picture from jsDelivr, which sends the CORS header the loader asks for.
  if (context.browser()?.browserType().name() !== "webkit") {
    await context.route(TEXTURE, async (route) => {
      const file = new URL(route.request().url()).pathname.split("/dist/textures/")[1]!;
      try {
        const ext = file.slice(file.lastIndexOf("."));
        await route.fulfill({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", headers: CORS, body: await readFile(join(TEXTURES, decodeURIComponent(file))) });
      } catch {
        await route.fulfill({ status: 404, body: "" });
      }
    });
  }
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
