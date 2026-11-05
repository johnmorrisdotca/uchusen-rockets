// Names under each craft's foot, and the plinth a craft in space stands on. Pure: no picture is drawn.
import assert from "node:assert/strict";
import { test } from "node:test";
import { placeNameLabels } from "../src/element/namePlace.ts";
import { plinthBoxes } from "../src/element/plinth.ts";
import { fliesInSpace } from "../src/rockets.ts";

const inside = (at: { x: number; y: number }, w: number, h: number, width: number, height: number) =>
  at.x >= 4 - 1e-6 && at.y >= 4 - 1e-6 && at.x + w <= width - 4 + 1e-6 && at.y + h <= height - 4 + 1e-6;

const clear = (a: { x: number; y: number }, aw: number, ah: number, b: { x: number; y: number }, bw: number, bh: number) =>
  a.x + aw <= b.x + 1e-6 || b.x + bw <= a.x + 1e-6 || a.y + ah <= b.y + 1e-6 || b.y + bh <= a.y + 1e-6;

test("each name sits under its own foot, on one line, inside the picture", () => {
  const labels = [
    { footX: 200, footY: 400, w: 180, h: 16 },
    { footX: 600, footY: 400, w: 180, h: 16 },
    { footX: 1000, footY: 400, w: 220, h: 16 },
  ];
  const placed = placeNameLabels(labels, 1200, 500);
  labels.forEach((label, index) => {
    const at = placed[index];
    assert.ok(at, String(index));
    assert.ok(Math.abs(at.x + label.w / 2 - label.footX) < 1, "under its own foot");
    assert.ok(Math.abs(at.y - (label.footY + 4)) < 1, "just under the foot");
    assert.ok(inside(at, label.w, label.h, 1200, 500));
  });
});

test("names that would pile into one column step apart and stay inside", () => {
  const labels = [
    { footX: 500, footY: 470, w: 200, h: 16 },
    { footX: 560, footY: 470, w: 200, h: 16 },
    { footX: 620, footY: 470, w: 240, h: 16 },
  ];
  const placed = placeNameLabels(labels, 1000, 500);
  placed.forEach((at, index) => assert.ok(inside(at, labels[index].w, labels[index].h, 1000, 500), String(index)));
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) assert.ok(clear(placed[i], labels[i].w, labels[i].h, placed[j], labels[j].w, labels[j].h), `${i} covers ${j}`);
  }
  const centres = placed.map((at, index) => at.x + labels[index].w / 2);
  assert.ok(centres[0] < centres[1] && centres[1] < centres[2], "left to right, one name to a craft");
  assert.ok(centres[2] - centres[0] > 80, "not one column");
});

test("a name that would hang off the left is pulled inside", () => {
  const placed = placeNameLabels([{ footX: 20, footY: 100, w: 180, h: 16 }], 390, 400);
  assert.equal(placed[0].x, 4);
  assert.ok(inside(placed[0], 180, 16, 390, 400));
});

test("a plinth stands on the ground, wider than the craft, and reaches down so the camera's box is unchanged", () => {
  const [mark, slab] = plinthBoxes({ min: [-4, 0, -3], max: [4, 40, 3] });
  assert.equal(mark.kind, "mark");
  assert.equal(slab.kind, "slab");
  assert.ok(slab.size[0] > 8 && slab.size[2] > 6, "wider than the footprint");
  assert.ok(mark.size[0] > slab.size[0] && mark.size[2] > slab.size[2], "the band shows past the platform");
  assert.ok(Math.abs(slab.at[1] + slab.size[1] / 2) < 1e-9, "the platform's top is the ground");
  assert.ok(slab.at[1] < 0 && mark.at[1] < 0, "both reach down, so the craft is not lifted");
});

test("a craft in space is the one that may be seen from above, and a rocket is not", () => {
  assert.equal(fliesInSpace("iss"), true);
  assert.equal(fliesInSpace("hubble"), true);
  assert.equal(fliesInSpace("fleet-ship-03"), true);
  assert.equal(fliesInSpace("dragon"), true);
  assert.equal(fliesInSpace("saturn-v"), false);
  assert.equal(fliesInSpace("starship"), false);
});
