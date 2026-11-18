// The sourced stage lengths of the three rockets not yet drawn (MODULES-1239): every figure names a source that is listed, a figure with no source is blank, and the numbers are the ones read.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FUTURE_STAGE_LENGTHS, ROCKETS, SOURCES, type Figure } from "../src/index.ts";

const figures = (): Array<[string, Figure]> => Object.entries(FUTURE_STAGE_LENGTHS).flatMap(([id, rocket]) => [[`${id} height`, rocket.height] as [string, Figure], ...Object.entries(rocket.diameters).map(([key, figure]) => [`${id} diameter ${key}`, figure] as [string, Figure]), ...Object.entries(rocket.parts).map(([key, figure]) => [`${id} ${key}`, figure] as [string, Figure])]);

test("every figure names a listed source, or is blank with its reason, and the others name theirs too", () => {
  for (const [name, figure] of figures()) {
    if (figure.value === null) {
      assert.equal(figure.source, null, name);
      assert.ok(figure.note !== undefined && figure.note.length > 20, `${name}: a blank says why`);
    } else {
      assert.ok(figure.source !== null && Object.hasOwn(SOURCES, figure.source), name);
      assert.ok(figure.value > 0 && Number.isFinite(figure.value), name);
    }
    for (const other of figure.others ?? []) {
      assert.ok(Object.hasOwn(SOURCES, other.source), `${name}: ${other.source}`);
      assert.ok(other.note.length > 5 && other.value !== figure.value, name);
    }
  }
  // none of the three is a rocket of the package yet
  for (const id of Object.keys(FUTURE_STAGE_LENGTHS)) assert.equal(Object.hasOwn(ROCKETS, id), false, id);
});

test("the numbers read: Ariane 5's stages, the N1's five blocks, the Titan II GLV's stations", () => {
  const a5 = FUTURE_STAGE_LENGTHS["ariane-5"];
  assert.deepEqual([a5.parts.eap.value, a5.parts.epc.value, a5.parts.eps.value, a5.parts.esc.value], [31.6, 23.8, 3.4, 4.711]);
  assert.equal(a5.parts.fairing.value, null);
  assert.deepEqual([a5.height.value, a5.height.others?.[0]?.value], [46, 52]);
  const n1 = FUTURE_STAGE_LENGTHS.n1;
  const blocks = [n1.parts["block-a"].value, n1.parts["block-b"].value, n1.parts["block-v"].value, n1.parts["block-g"].value, n1.parts["block-d"].value];
  assert.deepEqual(blocks, [30.09, 20.461, 11.51, 7.91, 5.5]);
  assert.deepEqual(n1.parts["block-d"].others?.map((other) => other.value), [5.7, 6.28], "Block D keeps the two Wikipedia figures");
  const above = n1.height.value! - blocks.reduce((sum, value) => sum + value!, 0);
  assert.ok(Math.abs(above - 29.829) < 0.01, `${above} m above the five blocks, not given apart`);
  assert.equal(n1.parts["payload-and-escape"].value, null);
  const glv = FUTURE_STAGE_LENGTHS["titan-ii-glv"];
  assert.ok(Math.abs(glv.parts["stage-1"].value! - (1342.31 - 500) * 0.0254) < 0.001, "stage I from the stations of figure 3-1");
  assert.ok(Math.abs(glv.parts["stage-2"].value! - (500 - 276.825) * 0.0254) < 0.001, "what the figure puts above the separation plane");
  assert.equal(glv.parts["stage-1"].source, "nasa-gemini-iv-report");
});
