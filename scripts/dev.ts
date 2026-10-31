// A tiny static server for the built site, at the same address it has on GitHub Pages: /uchusen-rockets/. Port 7900 is this package's own (7900 to 7999); PORT overrides it, and the tests' server is on 7901.
// `pnpm dev` builds first. `/` redirects to the site.
import { createServer } from "node:http";
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
};

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (!path.startsWith(base)) {
    response.writeHead(302, { location: base }).end();
    return;
  }
  const rel = normalize(path.slice(base.length) || "index.html").replace(/^([/\\])+/, "");
  const file = join(root, rel);
  if (!file.startsWith(root)) {
    response.writeHead(403).end("no");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Uchusen demo on http://127.0.0.1:${port}${base}`));
