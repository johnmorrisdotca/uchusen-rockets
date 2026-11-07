// Every page a reader opens uses the family's shell. A new page in demo/ fails here until it does.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

// The bare frame, and the two fixtures that open the element alone.
const BARE = new Set(["embed.html", "element-check.html", "react-check.html"]);
// The builder takes the page bar and not the family header: the header's inline styles do not fit its content policy.
const BAR_ONLY = new Set(["builder.html"]);
const MARKERS = ["family:head", "family:header", "family:footer", "family:scripts"];

test("every reader page uses the shell", () => {
  const pages = readdirSync("demo").filter((name) => name.endsWith(".html")).sort();
  assert.ok(pages.includes("index.html"));
  assert.ok(pages.includes("journey.html"));
  for (const name of pages) {
    const html = read(`demo/${name}`);
    if (BARE.has(name)) {
      assert.equal(html.includes("family:header"), false, name);
      continue;
    }
    if (BAR_ONLY.has(name)) {
      assert.ok(html.includes("<!--page-bar-->"), name);
      continue;
    }
    for (const marker of MARKERS) assert.ok(html.includes(`<!--${marker}`), `${name} ${marker}`);
  }
});

test("the docs site uses the same family shell", () => {
  const source = read("scripts/docs-site.mjs");
  for (const call of ["familyHead(", "familyHeader(", "familyFooter(", "familyUnreviewed("]) assert.ok(source.includes(call), call);
});
