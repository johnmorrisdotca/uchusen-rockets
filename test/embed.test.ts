import assert from "node:assert/strict";
import { test } from "node:test";

import { assetPathOf, attributesFromOptions, embedCode, EMBED_KINDS, embedNote, optionsFromAttributes, paintedCredit, rocketFromParams, ROCKETS, rocketToParams, THREE_VERSION } from "../src/index.ts";
import { readFileSync } from "node:fs";
import { LOOK_NAMES } from "../src/looks.ts";
import { build } from "../src/build/index.ts";

const OPTIONS = { rocket: "falcon-9", variant: "block-5", show: "apart", look: "thick", view: "below", spin: "off", label: "A Falcon 9" };

test("options written as attributes and read back draw the same rocket", () => {
  const attributes = attributesFromOptions(OPTIONS);
  const back = optionsFromAttributes((name) => attributes[name] ?? null);
  assert.equal(embedCode(back, "svg"), embedCode(OPTIONS, "svg"));
});

test("options written as a query and read back draw the same rocket", () => {
  const query = rocketToParams(OPTIONS);
  assert.equal(embedCode(rocketFromParams(new URLSearchParams(query.toString())), "svg"), embedCode(OPTIONS, "svg"));
});

test("every way of putting a rocket in a page gives text that holds it", () => {
  assert.deepEqual([...EMBED_KINDS], ["element", "iframe", "module", "svg", "data", "link"]);
  const element = embedCode(OPTIONS, "element");
  assert.match(element, /<script type="module" src="[^"]*element\.js"><\/script>/);
  assert.match(element, /<uchusen-rocket\n {2}rocket="falcon-9"/);
  assert.match(element, /look="thick"/);
  const iframe = embedCode(OPTIONS, "iframe");
  const src = /src="([^"]+)"/.exec(iframe)?.[1] ?? "";
  assert.match(src, /^https:\/\/johnmorrisdotca\.github\.io\/uchusen-rockets\/embed\.html\?/);
  assert.match(src, /rocket=falcon-9/);
  assert.equal(embedCode(rocketFromParams(new URL(src.replaceAll("&amp;", "&")).searchParams), "svg"), embedCode(OPTIONS, "svg"));
  const module = embedCode(OPTIONS, "module");
  assert.match(module, /import \{ build \} from /);
  assert.match(module, /rocket\.svg\(/);
  const svg = embedCode(OPTIONS, "svg");
  assert.equal(svg, build({ rocket: "falcon-9", variant: "block-5" }).svg({ look: "thick", view: "below", show: "apart" }));
  const data = embedCode(OPTIONS, "data");
  assert.ok(data.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.equal(decodeURIComponent(data.slice(data.indexOf(",") + 1)), svg);
});

test("a painted embed carries the credit of the parts that show, in every form", () => {
  const painted = { rocket: "starship", variant: "v3", look: "painted", show: "together" };
  const credit = paintedCredit(painted);
  assert.match(credit, /Super Heavy, Block 3 \(V3\)/);
  assert.match(credit, /Ship, Block 3 \(V3\)/);
  assert.match(credit, /Clarence365/);
  assert.match(credit, /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\//);
  for (const kind of EMBED_KINDS) {
    const code = embedCode(painted, kind);
    const readable = kind === "data" ? decodeURIComponent(code) : code;
    assert.match(readable, /Clarence365/, kind);
    assert.match(readable, /creativecommons\.org\/licenses\/by\/4\.0/, kind);
  }
  const ship = paintedCredit({ ...painted, show: "ship" });
  assert.match(ship, /Ship, Block 3/);
  assert.doesNotMatch(ship, /Super Heavy/);
  assert.match(embedCode({ ...painted, show: "ship" }, "element"), /Ship, Block 3/);
  assert.doesNotMatch(embedCode({ ...painted, show: "ship" }, "svg"), /Super Heavy, Block 3/);
});

test("a line drawing and a variant painted by this package carry no CC BY credit", () => {
  assert.equal(paintedCredit({ rocket: "starship", variant: "v3", look: "line" }), "");
  assert.equal(paintedCredit({ rocket: "starship", variant: "v2", look: "painted" }), "");
  assert.doesNotMatch(embedCode({ rocket: "starship", variant: "v3", look: "line" }, "svg"), /Clarence365/);
  assert.doesNotMatch(embedCode({ rocket: "starship", variant: "v2", look: "painted" }, "element"), /creativecommons\.org/);
});

test("an attribute value that holds markup is escaped, and a bad rocket does not throw", () => {
  const code = embedCode({ rocket: "starship", label: '"><script>alert(1)</script>' }, "element");
  assert.doesNotMatch(code, /<script>alert/);
  assert.match(code, /&quot;&gt;&lt;script&gt;/);
  const svg = embedCode({ rocket: "no-such-rocket", look: "painted" }, "svg");
  assert.match(svg, /^<svg /);
  assert.equal(paintedCredit({ rocket: "no-such-rocket", look: "painted" }), "");
});

test("the CDN snippet names three.js at the version this package is tested with", () => {
  const code = embedCode({ rocket: "starship", variant: "v3" }, "element");
  const scripts = code.indexOf('type="importmap"');
  assert.ok(scripts >= 0 && scripts < code.indexOf('type="module"'), "the import map comes first");
  const { devDependencies } = JSON.parse(readFileSync("package.json", "utf8")) as { devDependencies: Record<string, string> };
  assert.equal(THREE_VERSION, devDependencies.three);
  assert.ok(code.includes(`three@${THREE_VERSION}/build/three.module.js`));
  assert.match(code, /"three\/addons\/"/);
});

test("the image link names a file make-assets writes, for every variant, part and look", () => {
  for (const rocket of Object.values(ROCKETS))
    for (const variant of rocket.variants) {
      const built = build({ rocket: rocket.id, variant: variant.id });
      for (const show of built.shows)
        for (const look of LOOK_NAMES) {
          const stem = `${rocket.id}-${variant.id}${show === built.shows[0] ? "" : `-${show}`}${look === "line" ? "" : `.${look}`}.svg`;
          assert.equal(assetPathOf({ rocket: rocket.id, variant: variant.id, show, look }), stem);
        }
    }
  assert.equal(assetPathOf({ rocket: "no-such-rocket" }), null);
  assert.equal(assetPathOf({ build: JSON.stringify({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }) }), null);
  // a custom build has no file: the link still gives a picture
  assert.match(embedCode({ build: JSON.stringify({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } }) }, "link"), /src="data:image\/svg\+xml/);
  assert.match(embedCode({ rocket: "starship", variant: "v3", look: "painted" }, "link"), /Clarence365/);
  assert.match(embedNote("link", { view: "side" }), /three-quarter/);
  // a hostile label is only text
  assert.doesNotMatch(embedCode({ rocket: "starship", label: '"><img onerror=1>' }, "link"), /<img onerror/);
});

test("a phase goes into the iframe's address and the element's attributes, and the drawing shows its engines", () => {
  const options = { rocket: "starship", variant: "v3", phase: "hot-staging" };
  assert.match(embedCode(options, "iframe"), /phase=hot-staging/);
  assert.match(embedCode(options, "element"), /phase="hot-staging"/);
  assert.equal(rocketFromParams(rocketToParams(options)).phase, "hot-staging");
});

test("a size sets the iframe's largest width and the linked picture's width and height, and 480 is the default", () => {
  assert.match(embedCode(OPTIONS, "iframe", { size: 240 }), /max-width:240px/);
  assert.match(embedCode(OPTIONS, "iframe"), /max-width:480px/);
  assert.match(embedCode(OPTIONS, "link", { size: 240 }), /width="240" height="320"/);
  assert.equal(embedCode(OPTIONS, "link", { size: 480 }), embedCode(OPTIONS, "link"));
  assert.match(embedCode(OPTIONS, "link", { size: 0 }), /width="480" height="640"/);
});
