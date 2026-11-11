// The Tiangong space station: drawn by this package's code from the sourced lengths and widths, with no model, in two variants; and one detailed model, CC BY 4.0, for the painted look of a third, credited word for word.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { check, creditLine, MODEL_CREDITS, paintedCredit, ROCKETS, variantOf } from "../src/index.ts";
import { build } from "../src/build/index.ts";

const CREDIT_LINE = 'This work is based on "tianGong" (https://sketchfab.com/3d-models/tiangong-aca22b1dd6d242c1ae7b88de2f483b77) by w29572227 (https://sketchfab.com/w29572227) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).';

test("Tiangong has three variants, the chinese name 天宮 and the sourced sizes of its modules", () => {
  const rocket = ROCKETS["tiangong"];
  assert.ok(rocket && rocket.name.includes("天宮"));
  assert.deepEqual(rocket.variants.map((one) => one.id), ["tiangong", "tiangong-docked", "tiangong-detailed"]);
  const sizes = variantOf("tiangong", "tiangong")?.facts.sizes ?? {};
  assert.equal(sizes["Tianhe length"]?.value, 16.6);
  assert.equal(sizes["Wentian length"]?.value, 17.9);
  assert.equal(sizes["Mengtian length"]?.value, 17.9);
  assert.equal(sizes["Module width, each"]?.value, 4.2);
  assert.equal(variantOf("tiangong", "tiangong-docked")?.facts.parts["shenzhou"]?.value, 9.25);
  assert.equal(variantOf("tiangong", "tiangong-docked")?.facts.parts["tianzhou"]?.value, 10.6);
  // a figure no source gives is blank, never estimated
  assert.equal(variantOf("tiangong", "tiangong")?.facts.height.value, null);
});

test("the two variants without a model draw every look from the code and carry no credit", () => {
  for (const variant of ["tiangong", "tiangong-docked"]) {
    const report = check({ rocket: "tiangong", variant });
    assert.ok(report.ok, JSON.stringify(report.issues));
    assert.deepEqual(report.credits, []);
    const built = build({ rocket: "tiangong", variant });
    assert.ok(built.parts.every((part) => part.record.painted === null && part.pieces.length > 0));
    for (const look of ["line", "thick", "painted"] as const) assert.ok(built.svg({ look }).startsWith("<svg"), `${variant} ${look}`);
  }
  const docked = build({ rocket: "tiangong", variant: "tiangong-docked" });
  assert.deepEqual(docked.parts.map((part) => part.slot), ["tianhe", "wentian", "mengtian", "shenzhou", "tianzhou"]);
  const by = (slot: string) => docked.parts.find((part) => part.slot === slot)!.record;
  // each module stands to its source: the core's length, the craft's lengths and array spans
  assert.equal(by("tianhe").height, 16.6);
  assert.equal(by("shenzhou").height, 9.25);
  assert.equal(by("shenzhou").diameter, 17);
  assert.equal(by("tianzhou").height, 10.6);
  assert.equal(by("tianzhou").diameter, 14.9);
});

test("the laboratories stand across the hub: together, the station is as wide as the infobox says, about 39 m", () => {
  const bounds = build({ rocket: "tiangong", variant: "tiangong" }).boundsOf("together");
  assert.ok(Math.abs(bounds.max[0] - bounds.min[0] - 39.6) < 0.5, `${bounds.max[0] - bounds.min[0]}`);
});

test("the detailed model is credited word for word, to its author, under CC BY 4.0, and shown only in the painted look", () => {
  const painted = check({ rocket: "tiangong", variant: "tiangong-detailed" });
  assert.ok(painted.ok, JSON.stringify(painted.issues));
  assert.deepEqual(painted.credits.map((one) => one.id), ["w29572227-tiangong"]);
  assert.equal(painted.credits[0].licence, "CC BY 4.0");
  assert.equal(painted.credits[0].creator, "w29572227");
  const credit = MODEL_CREDITS["w29572227-tiangong"];
  assert.equal(credit.line, CREDIT_LINE);
  assert.ok(creditLine("w29572227-tiangong").startsWith(CREDIT_LINE));
  assert.ok(paintedCredit({ rocket: "tiangong", variant: "tiangong-detailed", look: "painted" }).includes(CREDIT_LINE));
  assert.equal(paintedCredit({ rocket: "tiangong", variant: "tiangong-detailed", look: "line" }), "");
  assert.equal(paintedCredit({ rocket: "tiangong", variant: "tiangong", look: "painted" }), "");
});

test("its file is a separate small asset with no picture, only this package's materials, and says whose it is", () => {
  const file = "models/tiangong-station.glb";
  assert.ok(statSync(file).size < 1.2 * 1024 * 1024);
  const bytes = readFileSync(file);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString("utf8")) as { images?: unknown[]; textures?: unknown[]; asset: { extras: Record<string, string> } };
  assert.equal(json.images, undefined);
  assert.equal(json.textures, undefined);
  assert.equal(json.asset.extras.author, "w29572227");
  assert.match(json.asset.extras.license, /^CC-BY-4\.0/);
  assert.match(json.asset.extras.source, /sketchfab\.com\/3d-models\/tiangong-aca22b1dd6d242c1ae7b88de2f483b77$/);
});

test("NOTICE says this one file is CC BY 4.0, with the author's credit line and the date it was read", () => {
  const notice = readFileSync("NOTICE.md", "utf8");
  assert.ok(notice.includes(CREDIT_LINE));
  assert.match(notice, /only that one file is/);
  assert.match(notice, /2026-11-11/);
});
