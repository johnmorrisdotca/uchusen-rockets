import assert from "node:assert/strict";
import { test } from "node:test";
import { shownInWindow, type StageBox } from "../src/element/onScreen.ts";

const frame = { width: 390, height: 844 };
const box = (top: number, height: number, left = 99, width = 192): StageBox => ({ top, bottom: top + height, left, right: left + width, width, height });

test("a stage the observer can see is shown", () => {
  assert.equal(shownInWindow(true, box(2000, 0, 0, 0), frame), true);
});

test("a stuck stage in the window is shown when the observer says it is outside", () => {
  assert.equal(shownInWindow(false, box(15, 256), frame), true);
});

test("a stage within the observer's margin above the window is shown", () => {
  assert.equal(shownInWindow(false, box(-180, 100), frame), true);
});

test("a stage past that margin is not shown", () => {
  assert.equal(shownInWindow(false, box(1100, 256), frame), false);
  assert.equal(shownInWindow(false, box(-220, 10), frame), false);
});

test("a stage with no size is not shown", () => {
  assert.equal(shownInWindow(false, box(15, 0, 99, 0), frame), false);
});
