// What MODULES-412 must not change: the geometry of ISV Kaminari (SPX-207, every slot, byte for byte) and of ISV Miyamoto (SPX-03, every part, by count, size and materials). `test/data/fleet-fingerprint.json` was taken
// before the ship moved onto the resizable kit parts; the hashes and counts below are how "no visible loss of detail" is held to a number. `UPDATE_FINGERPRINT=1 node --test test/fleet-fingerprint.test.ts` retakes it.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { SHIP_02_SLOTS } from "../src/model/fleet/ship-02/index.ts";
import { MIYAMOTO_PARTS } from "../src/model/fleet/ship-03/variants.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const GOLDEN = new URL("./data/fleet-fingerprint.json", import.meta.url);

interface Stat {
  pieces: number;
  triangles: number;
  bounds: number[];
  materials: string[];
  hash?: string;
}

const round = (_: string, v: unknown) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);

/** The numbers that stand for a part's geometry. `exact` adds a hash of every piece, to the fourth decimal. */
export function stat(pieces: readonly Piece[], exact: boolean): Stat {
  const mesh = meshOf([...pieces]);
  let triangles = 0;
  for (const faces of mesh.faces.values()) triangles += faces.indices.length / 3;
  const b = boundsOf(mesh);
  const materials = [...new Set(pieces.map((p) => ("material" in p ? p.material : "lines")))].sort();
  return {
    pieces: pieces.length,
    triangles,
    bounds: [...b.min, ...b.max].map((v) => Math.round(v * 100) / 100),
    materials,
    ...(exact ? { hash: createHash("sha256").update(JSON.stringify(pieces, round)).digest("hex").slice(0, 24) } : {}),
  };
}

const taken = () => ({
  kaminari: Object.fromEntries(SHIP_02_SLOTS.map((s) => [s.slot, stat(s.pieces(), true)])),
  miyamoto: Object.fromEntries(MIYAMOTO_PARTS.map((p) => [p.id, stat(p.pieces(), false)])),
});

test("Kaminari: every slot builds the same pieces as before the kit took its parts over", () => {
  const now = taken();
  if (process.env.UPDATE_FINGERPRINT) writeFileSync(GOLDEN, `${JSON.stringify(now, null, 1)}\n`);
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as ReturnType<typeof taken>;
  assert.deepEqual(Object.keys(now.kaminari), Object.keys(golden.kaminari), "the same slots");
  for (const [slot, was] of Object.entries(golden.kaminari)) assert.deepEqual(now.kaminari[slot], was, slot);
});

test("Miyamoto: every part keeps its pieces and triangles within 2 per cent, its bounds within 0.1 m and every material it had", () => {
  const now = taken().miyamoto;
  const golden = (JSON.parse(readFileSync(GOLDEN, "utf8")) as ReturnType<typeof taken>).miyamoto;
  assert.deepEqual(Object.keys(now), Object.keys(golden), "the same parts");
  for (const [id, was] of Object.entries(golden)) {
    const is = now[id];
    assert.ok(Math.abs(is.pieces - was.pieces) <= was.pieces * 0.02, `${id}: ${is.pieces} pieces against ${was.pieces}`);
    assert.ok(Math.abs(is.triangles - was.triangles) <= was.triangles * 0.02, `${id}: ${is.triangles} triangles against ${was.triangles}`);
    for (const [i, v] of was.bounds.entries()) assert.ok(Math.abs(is.bounds[i] - v) <= 0.1, `${id}: bound ${i}`);
    for (const m of was.materials) assert.ok(is.materials.includes(m), `${id} lost ${m}`);
  }
});
