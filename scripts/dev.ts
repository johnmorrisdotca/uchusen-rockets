// A tiny static server for the built site, at the same address it has on GitHub Pages: /uchusen-rockets/. Port 7900 is this package's own (7900 to 7999); PORT overrides it, and the tests' server is on 7901.
// `pnpm dev` builds first. `/` redirects to the site.
import { createServer, type IncomingMessage } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..", "site");
const base = "/uchusen-rockets/";
const port = Number(process.env.PORT ?? 7900);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// The tests' server on a hosted runner (CI set, no graphics card): to WebKit alone, every page gets a script first that makes WebGL contexts unavailable. Headless WebKit draws WebGL in software there and never reaches 3D: every page ends on
// the drawing ("fallback"). But the page's probe for WebGL, a synchronous call in its first moments, took about three seconds and, once in 60 to 150 loads in a container of two cores, held the page for minutes: the load event never came
// (MODULES-1093). Answering "no WebGL" at once ends on the same drawing without the stall. The package itself is not changed, and Chromium, which draws in software on purpose, gets nothing.
const STUB_PATH = `${base}webgl-off.js`;
const STUB = "const real = HTMLCanvasElement.prototype.getContext;\nHTMLCanvasElement.prototype.getContext = function (type, ...rest) {\n  return /^(experimental-)?webgl2?$/.test(String(type)) ? null : real.call(this, type, ...rest);\n};\n";
const webkitOnly = (request: IncomingMessage) => Boolean(process.env.CI) && /Safari\//.test(request.headers["user-agent"] ?? "") && !/Chrom(e|ium)\//.test(request.headers["user-agent"] ?? "");
function noWebglFor(request: IncomingMessage, file: string, body: Buffer): Buffer {
  if (!webkitOnly(request) || extname(file) !== ".html") return body;
  return Buffer.from(body.toString("utf8").replace(/<head[^>]*>/i, (head) => `${head}<script src="${STUB_PATH}"></script>`));
}

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (!path.startsWith(base)) {
    response.writeHead(302, { location: base }).end();
    return;
  }
  // a folder address (docs/) serves its index.html, as GitHub Pages does
  if (path === STUB_PATH && webkitOnly(request)) {
    response.writeHead(200, { "content-type": TYPES[".js"], "cache-control": "no-store" }).end(STUB);
    return;
  }
  const asked = path.slice(base.length);
  const rel = normalize(asked === "" || asked.endsWith("/") ? `${asked}index.html` : asked).replace(/^([/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root)) {
    response.writeHead(403).end("no");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(noWebglFor(request, file, body));
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Uchusen demo on http://127.0.0.1:${port}${base}`));
