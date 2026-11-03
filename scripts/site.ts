// Builds the static demo for GitHub Pages into ./site: the page, its styles, its scripts bundled with three.js, the shipped assets and the docs. Every address in it is relative, so it works at the Pages address
// (https://johnmorrisdotca.github.io/uchusen-rockets/) and anywhere else. `pnpm site` builds first.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { publishThumbnails, thumbnailHead } from "./family-thumbnail.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
// The demo's page, with the family's card in its <head> (og:image, twitter:image, the icon), published beside it.
const ALT = "Uchusen Rockets: Saturn V, Starship, the Space Shuttle, Falcon Heavy and SLS, painted in 3D, side by side.";
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
writeFileSync(join(site, "index.html"), readFileSync(join(root, "demo", "index.html"), "utf8").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
publishThumbnails(root, site);
for (const file of ["demo.css", "family.css", "react-check.html", "element-check.html", "embed.html", "builder.html"]) cpSync(join(root, "demo", file), join(site, file));
cpSync(join(root, "dist", "assets"), join(site, "assets"), { recursive: true });
// the realistic Earth's pictures, from the package: no wider than the demo asks for (`max-texture` in demo/earth.ts)
const earthPictures = join(root, "node_modules", "@johnmorrisdotca", "chikyu-earth", "dist", "textures");
mkdirSync(join(site, "textures"));
for (const file of readdirSync(earthPictures)) if (/-(1024|2048)\.webp$/.test(file)) cpSync(join(earthPictures, file), join(site, "textures", file));
await build({
  entryPoints: { demo: join(root, "demo", "demo.ts"), embed: join(root, "demo", "embed.ts"), builder: join(root, "demo", "builder.ts"), "react-check": join(root, "demo", "react-check.ts"), "element-check": join(root, "demo", "element-check.ts") },
  outdir: join(site, "js"),
  bundle: true,
  splitting: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  sourcemap: false,
  chunkNames: "chunks/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
writeFileSync(join(site, ".nojekyll"), "");
console.log("site/ is ready");
