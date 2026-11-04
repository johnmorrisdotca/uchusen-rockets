// The fleet's badges: each SVG is well formed, has a viewBox, draws only in the fleet palette, carries no font, picture, script or outside file and stays under its size budget; the words are the public ones; every ship
// has its crest and its crew patch; the data module holds the files as they are.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { badge, badgesOf, badgeSvg, badgeUri, FLEET_BADGE_SHIPS, FLEET_BADGES, FLEET_PALETTE, HANABUSA_REGISTRY, type BadgeShip } from "../src/index.ts";
import { BADGE_FOLDER, svgsModule } from "../scripts/make-badges.ts";
import { lettering } from "../scripts/badge-letters.ts";

const PALETTE = new Set(Object.values(FLEET_PALETTE).map((hex) => hex.toLowerCase()));
const BRANDS = /spacex|nasa\b|logo|wordmark|boring company|tesla|musk/i;
/** A crest, the emblem and the class mark are round or six-sided pictures; a crew patch has words and a crest. */
const BUDGET = { emblem: 4096, crest: 4096, class: 4096, patch: 6144 } as const;
const TOTAL_BUDGET = 24 * 1024;
const SHIPS = Object.keys(FLEET_BADGE_SHIPS) as BadgeShip[];

/** Reads the tags of an SVG and checks they nest: a small parser, since the badges use no entities, comments or CDATA. */
function tags(svg: string) {
  const stack: string[] = [];
  const seen: { name: string; attributes: Record<string, string> }[] = [];
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g)) {
    const [, closing, name, attributes, selfClosing] = match;
    if (closing) assert.equal(stack.pop(), name, `</${name}> closes the wrong tag`);
    else {
      seen.push({ name, attributes: Object.fromEntries([...attributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map((one) => [one[1], one[2]])) });
      if (!selfClosing) stack.push(name);
    }
  }
  assert.deepEqual(stack, [], "every tag is closed");
  // everything between tags is a title's words or white space
  const text = svg.replace(/<[^>]*>/g, "\u0000").split("\u0000").map((part) => part.trim()).filter(Boolean);
  return { seen, text };
}

test("every badge is a well-formed SVG with a viewBox, a title and a size of its own", () => {
  assert.equal(FLEET_BADGES.length, 10);
  for (const one of FLEET_BADGES) {
    const { seen, text } = tags(one.svg);
    assert.equal(seen[0].name, "svg", one.id);
    assert.equal(seen[0].attributes.xmlns, "http://www.w3.org/2000/svg", one.id);
    assert.match(seen[0].attributes.viewBox, /^0 0 \d+ \d+$/, one.id);
    assert.equal(seen[0].attributes.role, "img", one.id);
    assert.equal(seen[0].attributes.width, String(one.size.width), one.id);
    assert.equal(seen[0].attributes.height, String(one.size.height), one.id);
    assert.equal(seen[1].name, "title", one.id);
    assert.deepEqual(text, [one.name], `${one.id}: only the title is text`);
    assert.ok(one.svg.endsWith("</svg>\n"), one.id);
  }
});

test("a badge is flat art: no font, picture, script, style, gradient, filter, id or outside file", () => {
  const allowed = new Set(["svg", "title", "g", "path", "circle", "rect"]);
  for (const one of FLEET_BADGES) {
    for (const { name, attributes } of tags(one.svg).seen) {
      assert.ok(allowed.has(name), `${one.id}: <${name}>`);
      for (const key of Object.keys(attributes)) assert.ok(!/^(id|href|xlink:href|style|class|filter|mask|clip-path|on\w+)$/.test(key), `${one.id}: ${key}`);
    }
    assert.ok(!/url\(|data:|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(one.svg), one.id);
    assert.ok(!BRANDS.test(one.svg) && !BRANDS.test(one.idea), one.id);
    assert.ok(!/fictional/i.test(one.svg + one.idea + one.name), one.id);
  }
});

test("a badge is drawn only in the fleet's palette, in at most four of its colours, with the dark outline", () => {
  for (const one of FLEET_BADGES) {
    const used = new Set<string>();
    for (const { attributes } of tags(one.svg).seen)
      for (const key of ["fill", "stroke"]) {
        const value = attributes[key];
        if (value === undefined || value === "none") continue;
        assert.match(value, /^#[0-9a-f]{6}$/, `${one.id}: ${key}=${value}`);
        assert.ok(PALETTE.has(value), `${one.id}: ${value} is not in FLEET_PALETTE`);
        used.add(value);
      }
    assert.ok(!/#[0-9a-f]{3}\b|rgb|hsl/i.test(one.svg.replace(/#[0-9a-f]{6}/gi, "")), one.id);
    assert.ok(used.size >= 2 && used.size <= 4, `${one.id}: ${used.size} colours`);
    assert.ok(used.has(FLEET_PALETTE.heatSink) && used.has(FLEET_PALETTE.protected), `${one.id}: outline and light ring`);
    assert.deepEqual(
      [...one.colours].map((role) => FLEET_PALETTE[role]).sort(),
      [...used].sort(),
      `${one.id}: its colours are the ones it uses`,
    );
  }
});

test("each badge is under its size budget, and all of them together", () => {
  let total = 0;
  for (const one of FLEET_BADGES) {
    const bytes = new TextEncoder().encode(one.svg).length;
    total += bytes;
    assert.ok(bytes <= BUDGET[one.kind], `${one.id}: ${bytes} bytes`);
  }
  assert.ok(total <= TOTAL_BUDGET, `${total} bytes in all`);
});

test("the data module holds the .svg files as they are, and every file is a badge", () => {
  assert.equal(readFileSync(new URL("../src/data/fleet/badges/svgs.ts", import.meta.url), "utf8"), svgsModule(), "run `pnpm badges`");
  const files = readdirSync(BADGE_FOLDER).filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4)).sort();
  assert.deepEqual(files, FLEET_BADGES.map((one) => one.id).sort());
  assert.equal(new Set(FLEET_BADGES.map((one) => one.svg)).size, FLEET_BADGES.length, "no two badges are the same picture");
});

test("the fleet has its emblem, the Romurusu class mark, and for every ship a crest and a crew patch", () => {
  assert.deepEqual(FLEET_BADGES.filter((one) => one.kind === "emblem").map((one) => one.id), ["fleet-emblem"]);
  assert.equal(badge("fleet-emblem")?.size.height, 244, "the emblem has its plate under it");
  assert.deepEqual(FLEET_BADGES.filter((one) => one.kind === "class").map((one) => [one.id, one.className]), [["class-romurusu", "Romurusu"]]);
  for (const ship of SHIPS) assert.deepEqual(badgesOf(ship).map((one) => one.kind), ["crest", "patch"], ship);
  assert.equal(badge("crest-kaminari")?.ship, "kaminari");
  assert.equal(badge("nothing"), undefined);
});

test("the words are the public ones: names, registry numbers, class, and nothing explained", () => {
  assert.deepEqual(
    SHIPS.map((ship) => [FLEET_BADGE_SHIPS[ship].name, FLEET_BADGE_SHIPS[ship].kanji, FLEET_BADGE_SHIPS[ship].registry]),
    [["Kaminari", "加美鳴", "SPX-207"], ["Miyamoto", "宮本", "SPX-452"], ["Ariake", "有明", "SPX-186"], ["Hanabusa", "花房", HANABUSA_REGISTRY]],
  );
  assert.equal(FLEET_BADGE_SHIPS.kaminari.ruby, "かみなり", "Kaminari is always shown with its reading");
  assert.equal(FLEET_BADGE_SHIPS.ariake.className, "Romurusu");
  assert.equal(FLEET_BADGE_SHIPS.ariake.classKanji, "ロムルス級");
  assert.equal(FLEET_BADGE_SHIPS.miyamoto.className, "Romurusu");
  assert.equal(HANABUSA_REGISTRY, "SPX-???");
  for (const info of Object.values(FLEET_BADGE_SHIPS)) assert.ok(!/fictional/i.test(JSON.stringify(info)), info.id);
});

test("a crew patch has its ship's name and registry number drawn as letters, in the badge's own paths", () => {
  for (const ship of SHIPS) {
    const info = FLEET_BADGE_SHIPS[ship];
    const patch = badge(`patch-${ship}`);
    assert.ok(patch, ship);
    const name = lettering(info.name, { x: 120, y: 40, height: 20, anchor: "middle" }).d;
    assert.ok(patch.svg.includes(`d="${name}"`), `${ship}: its name`);
    // Hanabusa's number is still to come: the operator's name stands where it will go
    const line = lettering(ship === "hanabusa" ? "SPX" : info.registry, { x: 120, y: 236, height: 14, anchor: "middle" }).d;
    assert.ok(patch.svg.includes(`d="${line}"`), `${ship}: its registry line`);
  }
  assert.ok(badge("fleet-emblem")?.svg.includes(`d="${lettering("SPX", { x: 100, y: 210, height: 16, anchor: "middle" }).d}"`), "the emblem's plate says SPX");
});

test("the lettering has every letter the badges need, and refuses an unknown one", () => {
  for (const word of ["KAMINARI", "MIYAMOTO", "ARIAKE", "HANABUSA", "SPX-0123456789"]) assert.ok(lettering(word, { x: 0, y: 0, height: 12 }).d.startsWith("M"), word);
  assert.throws(() => lettering("É", { x: 0, y: 0, height: 12 }), /no letter/);
  assert.equal(lettering("SPX", { x: 0, y: 0, height: 12 }).d, lettering("spx", { x: 0, y: 0, height: 12 }).d);
});

test("badgeSvg sets the width and keeps the proportions, and badgeUri is an image address", () => {
  assert.equal(badgeSvg("crest-kaminari"), badge("crest-kaminari")?.svg);
  assert.match(badgeSvg("patch-ariake", 120), /width="120" height="150"/);
  assert.match(badgeSvg("fleet-emblem", 16), /width="16" height="19\.52"/);
  assert.equal(decodeURIComponent(badgeUri("class-romurusu").slice("data:image/svg+xml,".length)), badge("class-romurusu")?.svg);
  assert.throws(() => badgeSvg("nothing"), /no badge/);
  assert.throws(() => badgeUri("nothing"), /no badge/);
});
