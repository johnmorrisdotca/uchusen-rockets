import assert from "node:assert/strict";
import { test } from "node:test";
import { angleAt, MOTIONS, motionNote, motionsOf, motionSpeed, motionWanted } from "../src/index.ts";
import { parts as hanabusa } from "../src/model/fleet/ship-01/index.ts";
import { parts as miyamoto } from "../src/model/fleet/ship-03/index.ts";
import { rpmFor } from "../src/model/fleet/ship-01/spin.ts";
import { meshOf } from "../src/model/pieces.ts";
import { SAIL_SLOTS } from "../src/model/fleet/kaminari-concepts/sails.ts";

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test("Hanabusa's rings turn at the rpm that gives the living ring 1 g, and the printed rate says so", () => {
  const ring = motionsOf("fleet-ship-01").find((m) => m.group === "spin");
  assert.ok(ring);
  const rpm = rpmFor(76, 1);
  near(rpm, 3.43, 0.01);
  near((ring.rate ?? 0) / 6, rpm, 1e-9);
  // one turn takes 60 / rpm seconds, and a quarter of it a quarter turn
  near(angleAt(ring, (60 / rpm) * 0.25), 90, 1e-6);
  near(angleAt(ring, 60 / rpm), 0, 1e-6);
  // ten times faster is ten times the angle
  near(angleAt(ring, 1, 10), (angleAt(ring, 10) % 360), 1e-9);
  assert.match(motionNote("fleet-ship-01"), /3\.43 rpm, one turn every 17\.5 s/);
});

test("a door leaf is shut, opens to its angle, holds, and comes back, and the five leaves go one after the next", () => {
  const leaf = (k: number) => motionsOf("fleet-ship-03").find((m) => m.group === `door-leaf-${k}`)!;
  const first = leaf(0);
  near(angleAt(first, 0), 0);
  near(angleAt(first, first.period! * 0.5), first.to!);
  near(angleAt(first, first.period! * 0.99), 0);
  assert.ok(angleAt(leaf(4), 0.3 * first.period!) !== angleAt(first, 0.3 * first.period!));
  for (let t = 0; t < 100; t += 0.37) {
    const a = angleAt(first, t);
    assert.ok(a >= -1e-9 && a <= first.to! + 1e-9);
  }
});

test("a sweep stays between its angles", () => {
  const dish = motionsOf("fleet-ship-03").find((m) => m.group === "dish-track")!;
  for (let t = 0; t < 200; t += 0.7) {
    const a = angleAt(dish, t);
    assert.ok(a >= dish.from! - 1e-9 && a <= dish.to! + 1e-9);
  }
  near(angleAt(dish, 0), dish.from!);
  near(angleAt(dish, dish.period! / 2), dish.to!);
});

test("every motion names a group that a part of its ship really carries, so none moves nothing", () => {
  const groups = (list: { pieces: (o?: { detail?: number }) => Parameters<typeof meshOf>[0] }[]) => new Set(list.flatMap((p) => meshOf(p.pieces({ detail: 0.3 })).moves.map((g) => g.name)));
  const sails = new Set(SAIL_SLOTS.flatMap((slot) => meshOf(slot.pieces()).moves.map((g) => g.name)));
  const have: Record<string, Set<string>> = { "fleet-emiake": sails, "fleet-ship-01": groups(hanabusa()), "fleet-ship-03": groups(miyamoto()), "fleet-ship-ariake": groups(miyamoto()) };
  for (const m of MOTIONS) assert.ok(have[m.ship]?.has(m.group), `${m.ship}: ${m.group}`);
});

test("the Motion choice: still unless asked for, ten times on request, never under reduced motion", () => {
  assert.equal(motionWanted(null, false), false);
  assert.equal(motionWanted("off", false), false);
  assert.equal(motionWanted("on", false), true);
  assert.equal(motionWanted("fast", false), true);
  assert.equal(motionWanted("on", true), false);
  assert.equal(motionWanted("fast", true), false);
  assert.equal(motionSpeed("fast"), 10);
  assert.equal(motionSpeed("on"), 1);
  assert.equal(motionsOf("starship").length, 0);
  assert.equal(motionNote("starship"), "");
});
