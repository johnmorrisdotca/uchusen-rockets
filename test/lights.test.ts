import assert from "node:assert/strict";
import { test } from "node:test";
import { dronePieces } from "../src/model/fleet/drone/index.ts";
import { contextOf, drum } from "../src/model/fleet/hull.ts";
import { isCoarse } from "../src/model/fleet/levels.ts";
import { dutyOf, lampFactor, lampHalo, lightMode } from "../src/model/fleet/lights.ts";
import { dockingHardware } from "../src/model/fleet/ship-01/docking.ts";
import { noseRounded } from "../src/model/fleet/ship-03/nose.ts";
import type { Piece } from "../src/model/pieces.ts";

const names = (pieces: readonly Piece[]): Set<string> => {
  const out = new Set<string>();
  for (const piece of pieces) if ("material" in piece && typeof piece.material === "string") out.add(piece.material);
  return out;
};

test("a light's job is the material, and anything else is the engines", () => {
  assert.equal(dutyOf("nav-red"), "running");
  assert.equal(dutyOf("nav-white"), "running");
  assert.equal(dutyOf("strobe"), "flash");
  assert.equal(dutyOf("beacon"), "beacon");
  assert.equal(dutyOf("flood"), "work");
  assert.equal(dutyOf("light-pool"), "work");
  assert.equal(dutyOf("halo-port"), "running");
  assert.equal(dutyOf("halo-strobe"), "flash");
  assert.equal(dutyOf("halo-beacon"), "beacon");
  assert.equal(dutyOf("coil-lit"), "engine");
  assert.equal(lightMode(null), "all");
  assert.equal(lightMode("running"), "running");
  assert.equal(lightMode("nope"), "all");
});

test("the white flash is 60 a minute and the red beacon 40, both steady when motion is reduced", () => {
  assert.equal(lampFactor("flash", "all", false, 0), 1);
  assert.equal(lampFactor("flash", "all", false, 0.09), 0.35);
  assert.equal(lampFactor("flash", "all", false, 1), 1);
  assert.equal(lampFactor("beacon", "running", false, 0), 1);
  assert.equal(lampFactor("beacon", "running", false, 0.5), 0.35);
  assert.equal(lampFactor("beacon", "running", false, 1.5), 1);
  assert.equal(lampFactor("flash", "all", true, 0), lampFactor("flash", "all", true, 0.5));
  assert.equal(lampFactor("running", "off", false, 0), 0);
  assert.equal(lampFactor("running", "running", false, 0.5), 1);
  assert.equal(lampFactor("work", "running", false, 0), 0);
  assert.equal(lampFactor("work", "all", false, 0), 1);
  assert.equal(lampFactor("engine", "off", false, 0), 1);
});

test("a closed hull carries port, starboard, stern, strobe, beacon and a flood pool", () => {
  const have = names(drum(contextOf("lights", "industrial", { detail: 0.25 }), { R: 3, L: 8, top: "M", bottom: "M", junk: 0, hatches: 0, conduits: 0, trays: 0, vents: 0, ladders: 0, panels: false, hazard: false }));
  for (const material of ["nav-red", "nav-green", "nav-white", "strobe", "beacon", "flood", "light-pool"]) assert.ok(have.has(material), material);
});

test("a docking ring and the repair drone carry the same lamps", () => {
  const dock = names(dockingHardware(1));
  for (const material of ["nav-red", "nav-green", "nav-white", "strobe", "beacon", "flood"]) assert.ok(dock.has(material), material);
  assert.ok(names(dronePieces(false)).has("lamp-amber"));
  const nose = names(noseRounded(false));
  assert.ok(nose.has("light-pool"));
  assert.ok(nose.has("ink-worn"), "the registry is the weathered hull lettering");
  const halo = lampHalo("port", [0, 1, 0]);
  assert.ok(halo.length > 0 && isCoarse(halo[0]), "a running-light halo stays in the wide view");
  assert.ok(names(dockingHardware(1)).has("light-pool"));
});
