// Builds the static demo for GitHub Pages into ./site: the page, its styles, its scripts bundled with three.js, the shipped assets and the docs. Every address in it is relative, so it works at the Pages address
// (https://johnmorrisdotca.github.io/uchusen-rockets/) and anywhere else. `pnpm site` builds first.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { publishThumbnails, thumbnailHead } from "./family-thumbnail.mjs";
import { renderIndex } from "./page.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
// The demo's page, with the family's card in its <head> (og:image, twitter:image, the icon), published beside it.
const ALT = "Uchusen Rockets: Saturn V, Starship, the Space Shuttle, Falcon Heavy and SLS, painted in 3D, side by side.";
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
writeFileSync(join(site, "index.html"), renderIndex().replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "compare.html"), renderIndex("compare.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "journey.html"), renderIndex("journey.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "poster.html"), renderIndex("poster.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "beam.html"), renderIndex("beam.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "swarm.html"), renderIndex("swarm.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "fleet-db.html"), renderIndex("fleet-db.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "fleet-compare.html"), renderIndex("fleet-compare.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
writeFileSync(join(site, "yard.html"), renderIndex("yard.html").replace("</head>", `  ${thumbnailHead(pkg, { alt: ALT })}\n  </head>`));
publishThumbnails(root, site);
for (const file of ["demo.css", "compare.css", "journey.css", "poster.css", "beam.css", "swarm.css", "fleet-db.css", "fleet-compare.css", "yard.css", "family.css", "react-check.html", "element-check.html", "embed.html", "builder.html"]) cpSync(join(root, "demo", file), join(site, file));
cpSync(join(root, "dist", "assets"), join(site, "assets"), { recursive: true });
// the realistic Earth's pictures, from the package: no wider than the demo asks for (`max-texture` in demo/earth.ts)
const earthPictures = join(root, "node_modules", "@johnmorrisdotca", "chikyu-earth", "dist", "textures");
mkdirSync(join(site, "textures"));
for (const file of readdirSync(earthPictures)) if (/-(1024|2048)\.webp$/.test(file)) cpSync(join(earthPictures, file), join(site, "textures", file));
await build({
  entryPoints: { demo: join(root, "demo", "demo.ts"), embed: join(root, "demo", "embed.ts"), journey: join(root, "demo", "journey.ts"), compare: join(root, "demo", "compare.ts"), poster: join(root, "demo", "poster-page.ts"), beam: join(root, "demo", "beam-page.ts"), swarm: join(root, "demo", "swarm-page.ts"), "fleet-db": join(root, "demo", "fleet-db.ts"), "fleet-compare": join(root, "demo", "fleet-compare.ts"), builder: join(root, "demo", "builder.ts"), yard: join(root, "demo", "yard.ts"), "react-check": join(root, "demo", "react-check.ts"), "element-check": join(root, "demo", "element-check.ts") },
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
// The family header's language picker and theme switch: one small module for the page.
writeFileSync(join(site, "kazoku-parts.src.js"), `import "@johnmorrisdotca/kazoku-ui/language-picker/define";\nimport "@johnmorrisdotca/kazoku-ui/theme-switch/define";\n`);
await build({ entryPoints: [join(site, "kazoku-parts.src.js")], outfile: join(site, "kazoku-parts.js"), bundle: true, format: "esm", minify: true, logLevel: "warning", absWorkingDir: root });
rmSync(join(site, "kazoku-parts.src.js"));
writeFileSync(join(site, ".nojekyll"), "");
console.log("site/ is ready");
