// Picking one part draws it full and the rest dimmed. The list names each part, and a launch date only when a source gives one.
import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "../src/build/index.ts";
import { partsOf } from "../src/partList.ts";

test("a named part is full and the rest are dimmed, and naming none leaves the drawing as it was", () => {
  const iss = build({ rocket: "iss", variant: "iss" });
  const plain = iss.svg({ look: "line" });
  assert.equal(plain.includes('opacity="0.28"'), false);
  const picked = iss.svg({ look: "line", part: "zarya" });
  assert.match(picked, /<g data-slot="zarya" opacity="1">/);
  assert.match(picked, /<g data-slot="unity" opacity="0.28">/);
  assert.equal(iss.svg({ look: "line", part: "" }).includes('opacity="0.28"'), false);
});

test("parts() names Zarya in English and Japanese, with the launch date and length its source gives", () => {
  const zarya = partsOf("iss").find((part) => part.id === "zarya");
  assert.ok(zarya);
  assert.equal(zarya.name, "Zarya");
  assert.equal(zarya.nameJa, "ザーリャ");
  assert.equal(zarya.launched, "1998-11-20");
  assert.equal(zarya.height, 12.56);
  assert.equal(zarya.diameter, null);
  const wing = partsOf("iss").find((part) => part.id === "arrays-s4");
  assert.equal(wing?.nameJa, "S4 の太陽電池翼");
  assert.equal(wing?.launched, null);
});
