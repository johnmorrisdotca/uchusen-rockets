// Pioneer 11's launch date, read from NASA's mission page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { PIONEER_11_LAUNCH } from "../src/data/pioneer-11.ts";
import { SOURCES } from "../src/data/sources.ts";

test("Pioneer 11's launch date is the mission page's, with the day it was read", () => {
  assert.equal(PIONEER_11_LAUNCH.value, "1973-04-06");
  assert.equal(PIONEER_11_LAUNCH.source, "nasa-pioneer-11");
  const source = SOURCES["nasa-pioneer-11"];
  assert.equal(source.url, "https://science.nasa.gov/mission/pioneer-11/");
  assert.equal(source.date, "2026-11-12");
  assert.equal(source.read, "direct");
});
