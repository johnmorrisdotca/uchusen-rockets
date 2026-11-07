// A craft berthed in space is the ship, not the launch stack. Super Heavy returns to Earth.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { STACK_M, berthPieces } from "../src/model/fleet/kaminari-concepts/berth.ts";
import { STARSHIP_DRAWS } from "../src/model/starship.ts";

const filesUnder = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (name.endsWith(".ts")) out.push(path);
  }
  return out;
};

test("no fleet model draws Super Heavy", () => {
  const hits = filesUnder("src/model/fleet").filter((path) => readFileSync(path, "utf8").includes("boosterPieces"));
  assert.deepEqual(hits, []);
});

test("a concept berth holds the Starship ship, about 52 m, with the tankers and the Dragon", () => {
  assert.ok(Math.abs(STACK_M - STARSHIP_DRAWS.v3.shipHeight) < 0.01);
  assert.ok(STACK_M < 60);
  const pieces = berthPieces({
    at: [0, 0, 0],
    hullX: 0,
    stack: [40, 0, 0],
    tankers: [[40, 80, 0], [40, 150, 0]],
    dragon: [-30, 6, 0],
    methane: [50, 80, 6],
    oxygen: [50, 150, -6],
    height: 200,
    diameter: 80,
    note: "",
  });
  assert.ok(pieces.length > 10);
});
