import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { LOOK_NAMES, MAKERS, VIEW_NAMES } from "../src/index.ts";
import { WORDS } from "../demo/words.js";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const japanese = /[぀-ヿ一-鿿]/;

test("the demo says every word in both languages, with the same blanks to fill", () => {
  assert.deepEqual(Object.keys(WORDS.ja).sort(), Object.keys(WORDS.en).sort());
  for (const [key, english] of Object.entries(WORDS.en)) assert.deepEqual(placeholders(WORDS.ja[key]), placeholders(english), key);
});

test("no sentence of the Japanese is left in English", () => {
  for (const [key, text] of Object.entries(WORDS.ja)) {
    if (japanese.test(text)) continue;
    // a name, a file type or a code word may stay as it is; a sentence may not
    assert.ok(text.split(/\s+/).length <= 2 || WORDS.en[key] === text, `${key}: ${text}`);
  }
});

test("the Japanese does not use English punctuation to end a sentence", () => {
  for (const [key, text] of Object.entries(WORDS.ja)) if (japanese.test(text) && /[a-z぀-ヿ一-鿿][.]\s*$/.test(text)) assert.fail(`${key}: ${text}`);
});

test("every word the demo looks up exists in both languages: the makers, looks and views it lists, and each word it names in its code and pages", () => {
  const wanted = new Set<string>();
  for (const maker of Object.keys(MAKERS)) wanted.add(`maker_${maker}`);
  for (const look of LOOK_NAMES) wanted.add(`look_${look}`);
  for (const view of VIEW_NAMES) wanted.add(`view_${view.replaceAll("-", "_")}`);
  for (const file of readdirSync("demo").filter((name) => name.endsWith(".ts") || name.endsWith(".html"))) {
    const text = readFileSync(`demo/${file}`, "utf8");
    for (const match of text.matchAll(/\bsay\("([\w-]+)"\)/g)) wanted.add(match[1]);
    for (const match of text.matchAll(/data-say="([\w-]+)"/g)) wanted.add(match[1]);
  }
  const missing = [...wanted].filter((key) => !(key in WORDS.en) || !(key in WORDS.ja));
  assert.deepEqual(missing, [], `the demo asks for words it does not have: ${missing.join(", ")}`);
});
