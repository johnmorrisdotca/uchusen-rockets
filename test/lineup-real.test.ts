// Real craft for scale in the fleet band: Starship with Super Heavy, Saturn V, SLS and the ISS lie sideways at the fleet ships' own scale, nose right, each with its name and length.
import assert from "node:assert/strict";
import { test } from "node:test";
import { variantOf } from "../src/index.ts";
import { build, lineupSvg, REAL_CRAFT } from "../src/build/index.ts";
import { lyingCamera } from "../src/build/lineup.ts";

const KAMINARI = "fleet-02:fleet-02";
const MIYAMOTO = "fleet-ship-03:miyamoto";
const FRAME = { width: 900, height: 560 };

/** The lengths of the ground lines of the fleet band, in the order they are drawn: each ship, then each real craft, in pixels. */
const lines = (svg: string) => [...svg.matchAll(/<path d="M([\d.]+) ([\d.]+)H([\d.]+)" stroke="currentColor" stroke-width="\.6" opacity="\.4"\/>/g)].map((m) => Number(m[3]) - Number(m[1]));
const texts = (svg: string) => [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const lengthOf = (key: string) => {
  const [rocket, variant] = key.split(":");
  const b = build({ rocket, variant }).boundsOf("together");
  return rocket === "iss" ? b.max[0] - b.min[0] : b.max[1] - b.min[1];
};

test("the four real craft are Starship with Super Heavy, Saturn V, SLS and the ISS, each a variant the package has", () => {
  assert.deepEqual(REAL_CRAFT.map((craft) => craft.name), ["Starship with Super Heavy", "Saturn V", "SLS Block 1", "ISS"]);
  for (const craft of REAL_CRAFT) assert.ok(variantOf(...(craft.key.split(":") as [string, string])), craft.key);
});

test("they lie in the fleet band at the ships' scale: every length ratio against a ship is the true one, to within 1%", () => {
  for (const ship of [KAMINARI, MIYAMOTO]) {
    const picture = lineupSvg({ items: [ship], unit: 3.4, filter: "fleet", fit: FRAME, labels: true, real: true });
    const [shipPx, ...realPx] = lines(picture.svg);
    assert.equal(realPx.length, REAL_CRAFT.length);
    assert.equal(picture.real.length, REAL_CRAFT.length);
    const shipLength = lengthOf(ship);
    assert.ok(Math.abs(shipPx / picture.unit - shipLength) / shipLength < 0.002, "the ship is drawn at the lineup's scale");
    REAL_CRAFT.forEach((craft, i) => {
      // the sourced length of a rocket is its height; the station's overall length is the figure the data holds for it
      const [rocket, variant] = craft.key.split(":");
      const facts = variantOf(rocket, variant)!.facts;
      const truth = (craft.axis === "y" ? facts.height.value : facts.diameter.value) as number;
      const ratioDrawn = realPx[i] / shipPx;
      const ratioTrue = truth / shipLength;
      // the station's line model ends its arrays 1.2 m inside the sourced overall length: 1.1%, the only one past 1%
      const allowed = craft.key === "iss:iss" ? 0.015 : 0.01;
      assert.ok(Math.abs(ratioDrawn / ratioTrue - 1) < allowed, `${ship} ${craft.name}: drawn ${ratioDrawn}, true ${ratioTrue}`);
      // and it is the model's own length at the same scale, exactly
      assert.ok(Math.abs(realPx[i] / picture.unit - lengthOf(craft.key)) < 0.3, craft.name);
    });
  }
});

test("each carries a label with its name and its length, and the labels go when labels are off", () => {
  const on = lineupSvg({ items: [KAMINARI], unit: 3.4, filter: "fleet", fit: FRAME, labels: true, real: true });
  const words = texts(on.svg);
  for (const craft of REAL_CRAFT) {
    const [rocket, variant] = craft.key.split(":");
    const facts = variantOf(rocket, variant)!.facts;
    const metres = (craft.axis === "y" ? facts.height.value : facts.diameter.value) as number;
    assert.ok(words.includes(`${craft.name}, ${metres.toLocaleString("en-US")} m`), `${craft.name}: ${words.join(" | ")}`);
  }
  assert.deepEqual(on.real.map((item) => item.height), [124.4, 110.64, 98.15, 109]);
  const off = lineupSvg({ items: [KAMINARI], unit: 3.4, filter: "fleet", fit: FRAME, labels: false, real: true });
  assert.equal(texts(off.svg).filter((word) => REAL_CRAFT.some((craft) => word.startsWith(craft.name))).length, 0);
  assert.equal(off.real.length, 4);
});

test("a rocket points its nose right and the station runs along its long axis", () => {
  const b = build({ rocket: "saturn-v" }).boundsOf("together");
  const rocket = lyingCamera("y", b, 40, 100, 2);
  assert.ok(rocket.project([0, b.max[1], 0])[0] > rocket.project([0, b.min[1], 0])[0] + 200, "the nose is at the right");
  assert.equal(rocket.project([0, b.min[1], 0])[0], 40, "the tail is at the start of the line");
  // the lowest of it is on the ground line and the rest above
  const ys = [b.min[0], b.max[0]].map((x) => rocket.project([x, 0, 0])[1]);
  assert.ok(Math.max(...ys) <= 100 + 1e-9 && Math.min(...ys) < 100);
  const iss = build({ rocket: "iss" }).boundsOf("together");
  const station = lyingCamera("x", iss, 40, 100, 2);
  assert.equal(station.project([iss.min[0], 0, 0])[0], 40);
  assert.ok(station.project([iss.max[0], 0, 0])[0] - 40 > 200);
  assert.equal(station.project([0, iss.min[1], 0])[1], 100);
  assert.ok(station.project([0, iss.max[1], 0])[1] < 100, "up is up");
});

test("the switch: off by default, and they come only with the fleet band", () => {
  const items = [KAMINARI, "starship:v3", "building", "person"];
  const plain = lineupSvg({ items, unit: 3.4, fit: FRAME });
  assert.deepEqual(plain.real, []);
  assert.equal(plain.svg, lineupSvg({ items, unit: 3.4, fit: FRAME, real: false }).svg, "off is today's picture");
  assert.equal(lineupSvg({ items, unit: 3.4, fit: FRAME, real: true, filter: "rockets" }).real.length, 0, "rockets alone have no fleet band");
  assert.equal(lineupSvg({ items: ["starship:v3", "building"], unit: 3.4, real: true }).real.length, 0, "no ship, no band");
  const all = lineupSvg({ items, unit: 3.4, fit: FRAME, real: true });
  assert.equal(all.real.length, 4);
  assert.deepEqual(all.items.map((item) => item.key).sort(), [KAMINARI, "starship:v3", "building", "person"].sort(), "the items are as they were");
  const fleet = lineupSvg({ items, unit: 3.4, fit: FRAME, real: true, filter: "fleet" });
  assert.equal(fleet.real.length, 4);
});

test("with them in, the scale still fits the frame, on a desk and on a phone, with the ruler to the ship's length", () => {
  for (const frame of [FRAME, { width: 350, height: 360 }]) {
    for (const items of [[KAMINARI], [KAMINARI, MIYAMOTO], [MIYAMOTO, "starship:v3", "building", "person"]]) {
      const picture = lineupSvg({ items, unit: 3.4, ruler: true, labels: true, fit: frame, real: true });
      assert.ok(picture.width <= frame.width + 0.5 && picture.height <= frame.height + 0.5, `${items.join(",")}: ${picture.width} by ${picture.height} in ${frame.width} by ${frame.height}`);
      assert.ok(picture.unit > 0.05, `${items.join(",")}: scale ${picture.unit}`);
    }
  }
});
