// The comparison drawing stays readable: the numbers on the height ruler never lie on each other, a label has its own cell, the metres unit is not cut off at the right edge, and a phone's frame holds the whole drawing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lineupSvg } from "../src/build/index.ts";

const STARSHIPS = ["starship:v1-flight1", "starship:v1", "starship:v2", "starship:v3", "starship:v4", "building", "person"];
const KAMINARI = "fleet-02:fleet-02";

const numbers = (svg: string, anchor: string) => [...svg.matchAll(new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)" ${anchor}font-size="10"[^>]*>([^<]+)</text>`, "g"))].map((m) => ({ x: Number(m[1]), y: Number(m[2]), text: m[3] }));

test("the numbers on the height ruler are at least 12 pixels apart, with the fleet's small scale too", () => {
  for (const [items, fit] of [[STARSHIPS, { width: 900, height: 560 }], [[...STARSHIPS, KAMINARI], { width: 900, height: 560 }]] as const) {
    const ys = numbers(lineupSvg({ items: [...items], unit: 3.4, ruler: true, labels: true, fit }).svg, 'text-anchor="end" ').filter((one) => /^\d+$/.test(one.text) && one.x < 40).map((one) => one.y).sort((a, b) => a - b);
    assert.ok(ys.length >= 2);
    for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 12, `${items.length} items in ${fit.width}: ${ys[i - 1]} and ${ys[i]}`);
  }
});

test("each label stays inside its own cell: two neighbours never overlap", () => {
  const picture = lineupSvg({ items: STARSHIPS.slice(0, 5), unit: 3.4, ruler: true, labels: true, fit: { width: 900, height: 560 } });
  const labels = [...picture.svg.matchAll(/<text x="([\d.]+)" y="[\d.]+" text-anchor="middle" font-size="11"[^>]*>(.*?)<\/text>/g)].map((m) => ({ x: Number(m[1]), lines: [...m[2].matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((t) => t[1]) }));
  assert.equal(labels.length, 5);
  const half = (one: (typeof labels)[number]) => (Math.max(...one.lines.map((line) => line.length)) * 6) / 2;
  for (let i = 1; i < labels.length; i++) assert.ok(labels[i].x - labels[i - 1].x >= half(labels[i]) + half(labels[i - 1]), `${labels[i - 1].lines.join(" ")} and ${labels[i].lines.join(" ")}`);
  // the long names are wrapped, not cut
  assert.ok(labels.some((one) => one.lines.length >= 3));
  const all = labels.flatMap((one) => one.lines).join(" ");
  assert.match(all, /first/);
  assert.match(all, /vented/);
});

test("the unit of the metres ruler is inside the picture", () => {
  const picture = lineupSvg({ items: [KAMINARI], unit: 3.4, ruler: true, labels: true, fit: { width: 900, height: 560 } });
  const unit = numbers(picture.svg, "").find((one) => one.text === "m");
  assert.ok(unit);
  assert.ok(unit.x + 12 <= picture.width, `the "m" at ${unit.x} in ${picture.width}`);
  const last = numbers(picture.svg, 'text-anchor="middle" ').at(-1);
  assert.ok(last && last.x + (last.text.length * 6) / 2 <= picture.width, `the last number ${last?.text} at ${last?.x} in ${picture.width}`);
});

test("a narrow frame shrinks the room between the craft, but never below what a label needs: past that the page's frame scrolls it", () => {
  const wide = lineupSvg({ items: STARSHIPS, unit: 3.4, ruler: true, labels: true, fit: { width: 900, height: 560 } });
  const narrow = lineupSvg({ items: STARSHIPS, unit: 3.4, ruler: true, labels: true, fit: { width: 360, height: 460 } });
  assert.ok(narrow.width < wide.width);
  // seven cells of at least 72 pixels, the ruler's room and the edge
  assert.ok(narrow.width >= 46 + 7 * 72 - 1, `${narrow.width}`);
  assert.ok(narrow.width <= 46 + 7 * 96 + 8 + 0.5);
});
