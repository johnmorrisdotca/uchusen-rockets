import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UchusenRocket } from "../src/react.ts";

test("the wrapper passes its props as the element's attributes, and a description as JSON", () => {
  const html = renderToStaticMarkup(createElement(UchusenRocket, { rocket: "starship", variant: "v2", show: "ship", look: "thick", view: "back", build: { rocket: "starship", variant: "v3" } }));
  assert.match(html, /^<uchusen-rocket /);
  for (const part of ['variant="v2"', 'show="ship"', 'look="thick"', 'view="back"']) assert.ok(html.includes(part), part);
  assert.ok(html.includes("&quot;variant&quot;:&quot;v3&quot;"));
});
