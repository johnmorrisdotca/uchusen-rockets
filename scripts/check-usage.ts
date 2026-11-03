// Every way of using the package that the guides show, run against the package as npm packs it: the files in examples/ are copied beside a copy of the packed package
// (.usage/node_modules/@johnmorrisdotca/uchusen-rockets) and each one is built, type-checked or run, and the ones with a page are opened in a browser, which must show a rocket.
// The guides must hold these files' text, word for word, so what a reader copies is what was tested.
// `pnpm test:usage` (builds the package and the site first). One browser, one page at a time, drawn in software, closed when the step ends.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "@playwright/test";
import { build as esbuild } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const at = (...parts: string[]) => join(root, ...parts);
const usage = at(".usage");
const NAME = "@johnmorrisdotca/uchusen-rockets";
const require = createRequire(import.meta.url);

/** Run a program and, if it fails, say what it printed. */
const sh = (program: string, args: string[], cwd: string): string => {
  try {
    return execFileSync(program, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const out = error as { stdout?: string; stderr?: string };
    throw new Error(`${program} ${args.join(" ")} failed:\n${out.stdout ?? ""}${out.stderr ?? ""}`);
  }
};

const only = process.argv.slice(2);
const results: string[] = [];
const failures: string[] = [];
const step = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  if (only.length > 0 && !only.includes(name)) return;
  const started = Date.now();
  try {
    await run();
    results.push(`ok   ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    results.push(`FAIL ${name}`);
  }
  console.log(results[results.length - 1]);
};

// 1. The package as npm packs it, installed beside the examples.
rmSync(usage, { recursive: true, force: true });
mkdirSync(usage, { recursive: true });
const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", usage], { cwd: root, encoding: "utf8" })) as { filename: string }[];
const tarball = join(usage, packed[0]!.filename);
// A package.json of its own ends the repository's scope, so the package name is read from node_modules (the tarball), never from this checkout.
writeFileSync(join(usage, "package.json"), JSON.stringify({ private: true, type: "module" }));
const installed = join(usage, "node_modules", "@johnmorrisdotca", "uchusen-rockets");
mkdirSync(installed, { recursive: true });
execFileSync("tar", ["-xzf", tarball, "-C", installed, "--strip-components=1"]);
cpSync(at("examples"), join(usage, "examples"), { recursive: true });
const examples = (name: string) => join(usage, "examples", name);

// 2. A page that is a folder of built files, served to the browser without a port.
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".glb": "model/gltf-binary", ".jpg": "image/jpeg" };
const typeOf = (file: string) => TYPES[extname(file)] ?? "application/octet-stream";
const serve = async (page: Page, origin: string, folder: string, prefix = ""): Promise<void> => {
  await page.route(`${origin}${prefix}/**`, (route) => {
    const pathname = new URL(route.request().url()).pathname.slice(prefix.length);
    const file = join(folder, decodeURIComponent(pathname.endsWith("/") ? `${pathname}index.html` : pathname));
    if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ body: readFileSync(file), contentType: typeOf(file) });
  });
};

const opened = async (browser: Browser, run: (page: Page, errors: string[]) => Promise<void>): Promise<void> => {
  const context = await browser.newContext({ viewport: { width: 800, height: 700 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  try {
    await run(page, errors);
  } finally {
    await context.close();
  }
  if (errors.length > 0) throw new Error(`the page reported errors:\n${errors.join("\n")}`);
};

/** The rocket is drawn (an <svg> in the element's shadow root) and, where the page can draw WebGL, the 3D view takes over: its data-state reaches `3d`. */
const seesRocket = async (page: Page, selector = "uchusen-rocket"): Promise<void> => {
  await page.locator(selector).first().waitFor({ state: "attached", timeout: 20_000 });
  await page.waitForFunction((css) => (document.querySelector(css)?.shadowRoot?.querySelectorAll("svg path, svg polyline, svg line").length ?? 0) > 10, selector, { timeout: 20_000 });
  await page.waitForFunction((css) => document.querySelector(css)?.getAttribute("data-state") === "3d", selector, { timeout: 90_000 });
};

const pageOf = (file: string) => readFileSync(file, "utf8");

// WebGL is drawn in software, never on the machine's graphics card (the family's rule; kazoku-ui exports these as `SOFTWARE_GL_ARGS`).
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

await step("node", () => {
  const out = execFileSync(process.execPath, [join(examples("node"), "server.mjs")], { cwd: usage, encoding: "utf8" }).trim();
  if (!/^true 69\.8 m, from \S/.test(out)) throw new Error(`unexpected output: ${out}`);
});

await step("typescript", () => {
  writeFileSync(join(examples("typescript"), "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "esnext", moduleResolution: "bundler", strict: true, noEmit: true, lib: ["es2023", "dom", "dom.iterable"], types: [], skipLibCheck: true }, include: ["index.ts"] }));
  sh(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", join(examples("typescript"), "tsconfig.json")], usage);
  // The same file, run: types are erased, so it is plain JavaScript to Node.
  const run = execFileSync(process.execPath, [join(examples("typescript"), "index.ts")], { cwd: usage, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (!/^true Block 3/.test(run)) throw new Error(`unexpected output: ${run}`);
});

/** A CDN's answer for a package file or for three.js: the file as npm packs it, or three's own build. */
const cdnFile = (pathname: string, prefix: string): { body: Buffer; type: string } | null => {
  const own = new RegExp(`^${prefix}/@johnmorrisdotca/uchusen-rockets@[^/]+/(.+)$`).exec(pathname);
  const file = own ? join(installed, own[1]!) : (() => {
    const three = new RegExp(`^${prefix}/three@[^/]+/(.+)$`).exec(pathname);
    return three ? join(root, "node_modules", "three", three[1]!) : "";
  })();
  return file !== "" && existsSync(file) ? { body: readFileSync(file), type: typeOf(file) } : null;
};

await step("cdn-jsdelivr", async () => {
  await opened(browser, async (page) => {
    await page.route("https://cdn.jsdelivr.net/**", (route) => {
      const found = cdnFile(new URL(route.request().url()).pathname, "/npm");
      return found ? route.fulfill({ body: found.body, headers: { "content-type": found.type, "access-control-allow-origin": "*" } }) : route.fulfill({ status: 404, body: "", headers: { "access-control-allow-origin": "*" } });
    });
    await page.route("https://page.test/**", (route) => route.fulfill({ body: pageOf(join(examples(""), "cdn-jsdelivr.html")), contentType: "text/html" }));
    await page.goto("https://page.test/");
    await seesRocket(page);
    if ((await page.locator("uchusen-rocket").getAttribute("variant")) !== "v3") throw new Error("the element lost its attributes");
  });
});

await step("cdn-unpkg", async () => {
  await opened(browser, async (page) => {
    await page.route("https://unpkg.com/**", (route) => {
      const found = cdnFile(new URL(route.request().url()).pathname, "");
      return found ? route.fulfill({ body: found.body, headers: { "content-type": found.type, "access-control-allow-origin": "*" } }) : route.fulfill({ status: 404, body: "", headers: { "access-control-allow-origin": "*" } });
    });
    await page.route("https://page.test/**", (route) => route.fulfill({ body: pageOf(join(examples(""), "cdn-unpkg.html")), contentType: "text/html" }));
    await page.goto("https://page.test/");
    await seesRocket(page);
  });
});

await step("iframe", async () => {
  if (!existsSync(at("site", "embed.html"))) throw new Error("site/ is not built: `pnpm test:usage` builds it");
  await opened(browser, async (page) => {
    await serve(page, "https://johnmorrisdotca.github.io", at("site"), "/uchusen-rockets");
    await page.route("https://page.test/**", (route) => route.fulfill({ body: pageOf(join(examples(""), "iframe.html")), contentType: "text/html" }));
    await page.goto("https://page.test/");
    const frame = page.frameLocator("iframe");
    await frame.locator("uchusen-rocket").waitFor({ state: "attached", timeout: 20_000 });
    await frame.locator("uchusen-rocket").evaluate((element) => new Promise<void>((done) => { const look = () => (element.shadowRoot?.querySelector("svg path") ? done() : setTimeout(look, 100)); look(); }));
    if ((await frame.locator("uchusen-rocket").getAttribute("variant")) !== "v3") throw new Error("the embed ignored variant");
  });
});

// The bundlers and frameworks: built, then opened.
const { build: viteBuild, loadConfigFromFile } = await import("vite");
const viteApp = async (name: string, plugins: unknown[] = []): Promise<void> => {
  const dir = examples(name);
  const out = join(usage, "out", name);
  await viteBuild({ root: dir, plugins: plugins as never[], logLevel: "warn", build: { outDir: out, emptyOutDir: true }, base: "./", configFile: false });
  await opened(browser, async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesRocket(page);
  });
};

await step("vite", () => viteApp("vite"));
await step("react", () => viteApp("react"));
await step("vue", async () => {
  // The example's own vite.config.ts, the one the guide shows: it tells Vue that uchusen- tags are custom elements.
  const loaded = await loadConfigFromFile({ command: "build", mode: "production" }, join(examples("vue"), "vite.config.ts"), examples("vue"));
  if (!loaded) throw new Error("examples/vue/vite.config.ts did not load");
  await viteApp("vue", [...((loaded.config.plugins ?? []) as unknown[])]);
});
await step("svelte", async () => viteApp("svelte", [(await import("@sveltejs/vite-plugin-svelte")).svelte()]));

await step("react-ssr", async () => {
  const script = join(usage, "ssr-react.tsx");
  writeFileSync(script, `import { renderToString } from "react-dom/server";\nimport { RocketView } from "./examples/react/RocketView";\nconst html = renderToString(<RocketView />);\nif (!html.includes("<uchusen-rocket")) throw new Error("no element in " + html);\nconsole.log(html);\n`);
  const out = join(usage, "ssr-react.mjs");
  await esbuild({ entryPoints: [script], outfile: out, bundle: true, platform: "node", format: "esm", jsx: "automatic", absWorkingDir: root, logLevel: "silent", external: ["react", "react-dom"], splitting: false });
  const html = execFileSync(process.execPath, [out], { cwd: root, encoding: "utf8" });
  if (!html.includes('rocket="starship"') || !html.includes('look="thick"')) throw new Error(`the server render lost the attributes: ${html}`);
});

await step("webpack", async () => {
  const { default: webpack } = await import("webpack");
  const dir = examples("webpack");
  const config = (await import(pathToFileURL(join(dir, "webpack.config.mjs")).href)).default as Record<string, unknown>;
  const stats = await new Promise<import("webpack").Stats>((resolve, reject) => {
    webpack({ ...config, context: dir, output: { ...(config["output"] as object), path: join(usage, "out", "webpack") } } as import("webpack").Configuration, (error, result) => (error || !result ? reject(error ?? new Error("no result")) : resolve(result)));
  });
  if (stats.hasErrors()) throw new Error(stats.toString({ colors: false, errors: true }));
  const out = join(usage, "out", "webpack");
  writeFileSync(join(out, "index.html"), `<!doctype html><html><body><script src="main.js"></script></body></html>`);
  await opened(browser, async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesRocket(page);
  });
});

await step("angular", async () => {
  const dir = examples("angular");
  const out = join(usage, "out", "angular");
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "esnext", experimentalDecorators: true, useDefineForClassFields: false } }));
  await esbuild({ entryPoints: [join(dir, "main.ts")], outdir: out, bundle: true, splitting: true, format: "esm", tsconfig: join(dir, "tsconfig.json"), absWorkingDir: root, logLevel: "silent", minify: true });
  writeFileSync(join(out, "index.html"), readFileSync(join(dir, "index.html")));
  await opened(browser, async (page) => {
    await serve(page, "https://app.test", out);
    await page.goto("https://app.test/");
    await seesRocket(page);
  });
});

await browser.close();

// 3. The guides hold what was tested, word for word.
const everything = only.length === 0;
const FILES: Record<string, string[]> = {
  "cdn-jsdelivr.html": ["docs/guides/getting-started.md", "docs/guides/ja/getting-started.md"],
  "cdn-unpkg.html": ["docs/guides/bundlers-and-cdn.md", "docs/guides/ja/bundlers-and-cdn.md"],
  "iframe.html": ["docs/guides/embed-on-your-site.md", "docs/guides/ja/embed-on-your-site.md"],
  "vite/main.ts": ["docs/guides/bundlers-and-cdn.md", "docs/guides/ja/bundlers-and-cdn.md"],
  "vite/index.html": ["docs/guides/bundlers-and-cdn.md", "docs/guides/ja/bundlers-and-cdn.md"],
  "webpack/src/index.js": ["docs/guides/bundlers-and-cdn.md", "docs/guides/ja/bundlers-and-cdn.md"],
  "webpack/webpack.config.mjs": ["docs/guides/bundlers-and-cdn.md", "docs/guides/ja/bundlers-and-cdn.md"],
  "react/RocketView.tsx": ["docs/guides/react-and-frameworks.md", "docs/guides/ja/react-and-frameworks.md"],
  "vue/RocketView.vue": ["docs/guides/react-and-frameworks.md", "docs/guides/ja/react-and-frameworks.md"],
  "vue/vite.config.ts": ["docs/guides/react-and-frameworks.md", "docs/guides/ja/react-and-frameworks.md"],
  "svelte/RocketView.svelte": ["docs/guides/react-and-frameworks.md", "docs/guides/ja/react-and-frameworks.md"],
  "angular/rocket-view.component.ts": ["docs/guides/react-and-frameworks.md", "docs/guides/ja/react-and-frameworks.md"],
  "typescript/index.ts": ["docs/guides/typescript-and-node.md", "docs/guides/ja/typescript-and-node.md"],
  "node/server.mjs": ["docs/guides/typescript-and-node.md", "docs/guides/ja/typescript-and-node.md"],
};
const normal = (text: string) => text.replace(/\r\n/g, "\n").trim();
for (const [file, places] of everything ? Object.entries(FILES) : []) {
  const code = normal(readFileSync(at("examples", file), "utf8"));
  for (const place of places) {
    if (!normal(readFileSync(at(place), "utf8")).includes(code)) failures.push(`${place} does not hold examples/${file} word for word`);
  }
}
const unlisted = (folder: string): string[] => readdirSync(at("examples", folder), { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? unlisted(join(folder, entry.name)) : [relative("", join(folder, entry.name)).split("\\").join("/")]));
const known = new Set([...Object.keys(FILES), "angular/index.html", "angular/main.ts", "react/index.html", "react/main.tsx", "svelte/index.html", "svelte/main.ts", "vue/index.html", "vue/main.ts"]);
for (const file of everything ? unlisted("") : []) if (!known.has(file)) failures.push(`examples/${file} is not listed in scripts/check-usage.ts: say where the guides show it`);

console.log(failures.length === 0 ? `\nusage ok: ${results.length} ways to use ${NAME}` : `\n${failures.length} failure${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`);
if (failures.length > 0) process.exit(1);
