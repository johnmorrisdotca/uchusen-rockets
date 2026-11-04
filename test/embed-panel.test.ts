// The tabs of the demo's embed panel: the package's six ways are its own text, the framework tabs are valid for their framework and give the element the rocket's attributes, and a painted
// rocket's credit goes with every tab that draws it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseTemplate } from "@angular/compiler";
import { build } from "esbuild";
import { compile } from "svelte/compiler";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";
import { attributesFromOptions, embedCode, OPTION_ATTRIBUTES, paintedCredit, type RocketOptions } from "../src/index.ts";
import { build as buildRocket } from "../src/build/index.ts";
import { KINDS, LABELS, packageKind, panelCode, SIZES, type Kind } from "../demo/embed-code.ts";

const exportsOf = (JSON.parse(readFileSync("package.json", "utf8")) as { exports: Record<string, unknown> }).exports;
const LINE: RocketOptions = { rocket: "falcon-9", variant: "block-5", show: "apart", look: "thick", view: "below", engines: "on", phase: "liftoff" };
const PAINTED: RocketOptions = { rocket: "starship", variant: "v3", look: "painted", show: "ship" };
const syntax = (code: string, name: string): string[] => (ts.transpileModule(code, { reportDiagnostics: true, fileName: name, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
const tagAttrs = (code: string): string[] => {
  const tag = /<uchusen-rocket\b([^>]*?)\/?>/s.exec(code);
  assert.ok(tag, code);
  return [...tag[1]!.matchAll(/\s([\w-]+)=/g)].map((one) => one[1]!);
};

test("the panel's tabs are the family's seven then the package's SVG, data address and image link, and the sizes include the old 480", () => {
  assert.deepEqual([...KINDS], ["html", "module", "react", "vue", "angular", "svelte", "iframe", "svg", "data", "link"]);
  assert.deepEqual(LABELS, { data: "Data address", link: "Image link" });
  assert.ok(SIZES.includes(480));
});

test("the package's six ways are its own text, whatever the size", () => {
  for (const options of [LINE, PAINTED]) {
    for (const kind of ["html", "module", "iframe", "svg", "data", "link"] as Kind[]) {
      assert.equal(panelCode(kind, options), embedCode(options, packageKind(kind)), kind);
    }
    const bare = (svg: string) => svg.replace(/<desc>[\s\S]*<\/desc>/, "");
    assert.equal(bare(panelCode("svg", options)), bare(buildRocket({ rocket: options.rocket!, variant: options.variant! }).svg({ look: options.look as never, view: (options.view ?? "three-quarter") as never, show: options.show!, ...(options.engines === "on" ? { engines: true } : {}) })));
  }
  assert.match(panelCode("iframe", LINE, { size: 240 }), /max-width:240px/);
  assert.match(panelCode("link", LINE, { size: 320 }), /width="320" height="427"/);
});

test("the framework tabs give the element the rocket's attributes, all of them ones the element reads", () => {
  const read = new Set<string>(OPTION_ATTRIBUTES);
  for (const options of [LINE, PAINTED]) {
    const want = Object.keys(attributesFromOptions(options));
    for (const name of want) assert.ok(read.has(name), name);
    for (const kind of ["react", "vue", "angular", "svelte"] as Kind[]) assert.deepEqual(tagAttrs(panelCode(kind, options)), want, kind);
  }
});

test("the imports are paths the package exports", () => {
  for (const kind of ["react", "vue", "angular", "svelte"] as Kind[]) {
    const paths = [...panelCode(kind, LINE).matchAll(/@johnmorrisdotca\/uchusen-rockets\/([\w/-]+)/g)].map((one) => one[1]!);
    assert.deepEqual(paths, ["element"], kind);
    assert.ok("./element" in exportsOf);
  }
});

test("a painted rocket's credit goes with every framework tab, and a line drawing has none", async () => {
  const credit = paintedCredit(PAINTED);
  assert.ok(credit.length > 20);
  assert.equal(paintedCredit(LINE), "");
  for (const kind of ["react", "vue", "angular", "svelte"] as Kind[]) {
    assert.match(panelCode(kind, PAINTED), /Clarence365[\s\S]*CC BY 4\.0/, kind);
    assert.doesNotMatch(panelCode(kind, LINE), /<p>/, kind);
  }
});

test("the React, Angular and module code is valid, the Angular template parses, and React builds", async () => {
  for (const options of [LINE, PAINTED]) {
    for (const [kind, file] of [["module", "m.ts"], ["react", "r.tsx"], ["angular", "a.ts"]] as const) assert.deepEqual(syntax(panelCode(kind, options), file), [], `${kind} ${options.look}`);
    const parsed = parseTemplate(/template: `([^`]*)`/.exec(panelCode("angular", options))![1]!, "rocket.component.ts");
    assert.deepEqual(parsed.errors ?? [], []);
    const built = await build({ stdin: { contents: panelCode("react", options), loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic", external: ["@johnmorrisdotca/uchusen-rockets/*", "react", "react/*"], logLevel: "silent" });
    assert.ok(built.outputFiles[0]!.text.includes("uchusen-rocket"));
  }
});

test("the Vue and Svelte components compile and name the element", () => {
  for (const options of [LINE, PAINTED]) {
    const { descriptor, errors } = parse(panelCode("vue", options));
    assert.deepEqual(errors, []);
    assert.match(compileScript(descriptor, { id: "rocket" }).content, /onMounted/);
    assert.match(compile(panelCode("svelte", options), { filename: "Rocket.svelte", generate: "client" }).js.code, /uchusen-rocket/);
  }
});
