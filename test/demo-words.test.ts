import assert from "node:assert/strict";
import { test } from "node:test";
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
