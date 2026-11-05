// The Rockets of the World poster: one portrait sheet. Every built craft is the package's own drawing, at one scale, standing on shared baselines in rows from the shortest to the tallest. The SPX ships are a band at the foot, at a smaller scale that the band states.
import { build, drawnPieces, type Built } from "../src/build/index.ts";
import { defsOf, drawPart, orthographic } from "../src/draw/svg.ts";
import { check } from "../src/fit.ts";
import { axesOf, directionOf, VIEWS, type Angle } from "../src/framing.ts";
import { MAKERS, type MakerId } from "../src/data/makers.ts";
import { figureWords } from "../src/data/types.ts";
import type { LookName } from "../src/looks.ts";
import { PLANNED_ROCKETS, ROCKETS, variantOf } from "../src/rockets.ts";

/** The sheet's width in pixels. The height follows the rows, and it stays taller than it is wide. */
export const SHEET_W = 900;

/** Pixels to a metre on the rocket rows. */
export const POSTER_UNIT = 3.2;

/** A landscape print of the sheet at 300 dpi, long side then short side. A2 is 420 × 594 mm, A1 is 594 × 841 mm. The page turns these for a portrait sheet. */
export const SHEETS = { a2: { long: 7016, short: 4961 }, a1: { long: 9933, short: 7016 } } as const;

const MARK: Record<MakerId, string> = {
  spacex: "#8ea0b8",
  nasa: "#3e6eae",
  "blue-origin": "#2f7f9e",
  "rocket-lab": "#a6843c",
  russia: "#a14a4a",
  "us-army": "#5d7348",
  fleet: "#8a7048",
  sites: "#6e6e6e",
};

const PAD = 28;
const GAP = 10;
const MIN_CELL = 58;
const LABEL = 36;

export interface PosterCopy {
  title: string;
  same: string;
  later: string;
  fleet: string;
  person: string;
  scale: string;
}

const ENGLISH: PosterCopy = {
  title: "Rockets of the World",
  same: "All craft at the same scale.",
  later: "To add later",
  fleet: "SPX fleet, at 1/{n} the scale above",
  person: "A person, 1.8 m",
  scale: "20 m",
};

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface PosterCraft {
  key: string;
  name: string;
  maker: MakerId;
  metres: number;
  widthM: number;
  height: string;
}

const measure = (built: Built): { metres: number; widthM: number } => {
  const show = built.shows[0] ?? "together";
  const b = built.boundsOf(show);
  return {
    metres: Math.max(1, b.max[1] - Math.min(0, b.min[1])),
    widthM: Math.max(Math.abs(b.min[0]), Math.abs(b.max[0]), Math.abs(b.min[2]), Math.abs(b.max[2])) * 2,
  };
};

const facingOf = (key: string): Angle => {
  const named = variantOf(key.split(":")[0] ?? "", key.split(":")[1]);
  return named?.lineupView ? VIEWS[named.lineupView] : VIEWS.front;
};

/** Built craft for the rows: a site, a part kit and an SPX ship are not among them. Shortest first. */
export function posterCraft(): PosterCraft[] {
  const craft: PosterCraft[] = [];
  for (const rocket of Object.values(ROCKETS)) {
    if (rocket.status !== "built" || rocket.maker === "sites" || rocket.maker === "fleet") continue;
    const key = `${rocket.id}:${rocket.defaultVariant}`;
    const named = variantOf(rocket.id, rocket.defaultVariant);
    if (!named || !check({ rocket: rocket.id, variant: named.id }).ok) continue;
    const size = measure(build({ rocket: rocket.id, variant: named.id }));
    craft.push({ key, name: rocket.name, maker: rocket.maker, metres: size.metres, widthM: size.widthM, height: figureWords(named.facts.height, " m") });
  }
  craft.sort((a, b) => a.metres - b.metres || a.name.localeCompare(b.name));
  return craft;
}

/** The SPX ships. Part kits are not ships. */
export function fleetKeys(): string[] {
  return Object.values(ROCKETS)
    .filter((rocket) => rocket.maker === "fleet" && rocket.name.includes("SPX-"))
    .map((rocket) => `${rocket.id}:${rocket.defaultVariant}`);
}

/** Craft named by the catalogue, or asked for by the poster, that have no drawing yet. */
export function laterNames(): string[] {
  const names = PLANNED_ROCKETS.map((rocket) => rocket.name);
  if (!Object.values(ROCKETS).some((rocket) => rocket.name.includes("SPX-013"))) names.push("Hanabusa, SPX-013");
  return names;
}

const cellOf = (craft: PosterCraft, unit: number): number => Math.max(MIN_CELL, craft.widthM * unit + 8, craft.name.length * 4.6);

/**
 * Rows of craft, shortest first, each row staying within the sheet. A row takes the next craft until the next one would pass the width.
 * @param craft Craft, shortest first.
 * @param unit Pixels to a metre.
 * @param inner The width the rows may use.
 * @returns The rows.
 */
export function packRows(craft: readonly PosterCraft[], unit: number, inner: number): PosterCraft[][] {
  const rows: PosterCraft[][] = [];
  let row: PosterCraft[] = [];
  let used = 0;
  for (const one of craft) {
    const cell = cellOf(one, unit);
    if (row.length > 0 && used + cell > inner) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(one);
    used += cell + GAP;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

const drawBuilt = (built: Built, facing: Angle, unit: number, look: LookName, x0: number, base: number): string => {
  const show = built.shows[0] ?? "together";
  const cam = orthographic(facing, unit, x0, base);
  const { forward } = axesOf(directionOf(facing));
  const places = built.placesOf(show).filter((place) => place.shown);
  return places
    .sort((a, b) => b.at[0] * forward[0] + b.at[2] * forward[2] - (a.at[0] * forward[0] + a.at[2] * forward[2]))
    .map((place) => {
      const part = built.parts.find((one) => one.slot === place.slot);
      return part ? drawPart(drawnPieces(part, show === "together"), place.at, cam, look, 0.7) : "";
    })
    .join("");
};

const shipSize = (built: Built): { length: number; tall: number; from: number; low: number } => {
  const b = built.boundsOf(built.shows[0] ?? "together");
  return { length: b.max[1] - b.min[1], tall: b.max[2] - b.min[2], from: b.min[1], low: b.min[2] };
};

/**
 * The poster as one SVG.
 * @param copy The sentences that change with the reader's language. Left out, the poster is in English.
 * @param look The drawings' look. Left out, the coloured look.
 * @returns The picture, its size, and the names it lists as still to add.
 */
export function posterSvg(copy: PosterCopy = ENGLISH, look: LookName = "painted"): { svg: string; later: string[]; width: number; height: number } {
  const later = laterNames();
  const craft = posterCraft();
  const inner = SHEET_W - PAD * 2;
  const rows = packRows(craft, POSTER_UNIT, inner);
  const parts: string[] = [];
  parts.push(`<text x="${PAD}" y="40" fill="#172033" font-size="32" font-family="sans-serif">${escape(copy.title)}</text>`);
  parts.push(`<text x="${PAD}" y="62" fill="#3d4b60" font-size="14" font-family="sans-serif">${escape(copy.same)}</text>`);
  const bar = 20 * POSTER_UNIT;
  const barX = SHEET_W - PAD - bar;
  parts.push(`<line x1="${barX}" y1="34" x2="${barX + bar}" y2="34" stroke="#172033" stroke-width="3"/>`);
  parts.push(`<text x="${barX}" y="52" fill="#172033" font-size="13" font-family="sans-serif">${escape(copy.scale)}</text>`);
  const personH = 1.8 * POSTER_UNIT;
  const personX = barX - 36;
  parts.push(`<circle cx="${personX}" cy="${36 - personH}" r="${personH * 0.18}" fill="#172033"/>`);
  parts.push(`<rect x="${personX - personH * 0.16}" y="${38 - personH * 0.78}" width="${personH * 0.32}" height="${personH * 0.62}" rx="1" fill="#172033"/>`);
  parts.push(`<text x="${personX}" y="64" text-anchor="middle" fill="#3d4b60" font-size="9" font-family="sans-serif">${escape(copy.person)}</text>`);
  let legendX = PAD;
  let legendY = 78;
  for (const id of Object.keys(MAKERS) as MakerId[]) {
    if (id === "sites" || id === "fleet") continue;
    const chip = 13 + MAKERS[id].length * 6.6 + 16;
    if (legendX + chip > SHEET_W - PAD) {
      legendX = PAD;
      legendY += 18;
    }
    parts.push(`<rect x="${legendX}" y="${legendY}" width="9" height="9" rx="2" fill="${MARK[id]}"/>`);
    parts.push(`<text x="${legendX + 13}" y="${legendY + 9}" fill="#172033" font-size="11" font-family="sans-serif">${escape(MAKERS[id])}</text>`);
    legendX += chip;
  }
  let y = legendY + 32;
  for (const row of rows) {
    const cells = row.map((one) => cellOf(one, POSTER_UNIT));
    const spare = Math.max(0, inner - cells.reduce((sum, cell) => sum + cell, 0) - GAP * Math.max(0, row.length - 1));
    const gap = GAP + Math.min(16, spare / Math.max(1, row.length));
    const block = cells.reduce((sum, cell) => sum + cell, 0) + gap * Math.max(0, row.length - 1);
    const tall = Math.max(...row.map((one) => one.metres));
    const base = y + tall * POSTER_UNIT;
    let x = PAD + Math.max(0, (inner - block) / 2);
    for (const [index, one] of row.entries()) {
      const cell = cells[index] ?? MIN_CELL;
      const named = variantOf(one.key.split(":")[0] ?? "", one.key.split(":")[1]);
      if (named && check({ rocket: named.rocket, variant: named.id }).ok) {
        const built = build({ rocket: named.rocket, variant: named.id });
        parts.push(drawBuilt(built, facingOf(one.key), POSTER_UNIT, look, x + cell / 2, base));
      }
      parts.push(`<rect x="${x + cell / 2 - 4}" y="${base + 4}" width="8" height="8" rx="2" fill="${MARK[one.maker]}"/>`);
      parts.push(`<text x="${x + cell / 2}" y="${base + 22}" text-anchor="middle" fill="#172033" font-size="8" font-family="sans-serif"><tspan x="${x + cell / 2}">${escape(one.name)}</tspan><tspan x="${x + cell / 2}" dy="10">${escape(one.height)}</tspan></text>`);
      x += cell + gap;
    }
    y = base + LABEL + 16;
  }
  const ships = fleetKeys().flatMap((key) => {
    const named = variantOf(key.split(":")[0] ?? "", key.split(":")[1]);
    if (!named || !check({ rocket: named.rocket, variant: named.id }).ok) return [];
    const built = build({ rocket: named.rocket, variant: named.id });
    return [{ key, name: ROCKETS[named.rocket]?.name ?? named.name, built, size: shipSize(built) }];
  });
  const longest = Math.max(1, ...ships.map((ship) => ship.size.length));
  const fleetUnit = Math.min(POSTER_UNIT, (inner * 0.96) / longest);
  const ratio = Math.max(1, Math.round(POSTER_UNIT / fleetUnit));
  y += 8;
  parts.push(`<text x="${PAD}" y="${y + 16}" fill="#172033" font-size="14" font-family="sans-serif">${escape(copy.fleet.replace("{n}", String(ratio)))}</text>`);
  y += 28;
  for (const ship of ships) {
    const { tall, from, low } = ship.size;
    const base = y + tall * fleetUnit;
    const cam = {
      project: (p: readonly [number, number, number]): [number, number] => [PAD + (p[1] - from) * fleetUnit, base - (p[2] - low) * fleetUnit],
      depth: (p: readonly [number, number, number]) => -p[0],
      toward: (): [number, number, number] => [1, 0, 0],
      above: false,
    };
    const show = ship.built.shows[0] ?? "together";
    for (const place of ship.built.placesOf(show).filter((one) => one.shown).sort((a, b) => a.at[0] - b.at[0])) {
      const part = ship.built.parts.find((one) => one.slot === place.slot);
      if (part) parts.push(drawPart(drawnPieces(part, show === "together"), place.at, cam, look, 0.55));
    }
    parts.push(`<text x="${PAD}" y="${base + 12}" fill="#172033" font-size="9" font-family="sans-serif">${escape(ship.name)}</text>`);
    y = base + 20;
  }
  y += 10;
  parts.push(`<text x="${PAD}" y="${y}" fill="#3d4b60" font-size="12" font-family="sans-serif">${escape(`${copy.later}: ${later.join(", ")}`)}</text>`);
  y += 28;
  const height = Math.max(y, Math.round(SHEET_W * 1.2));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${height}" viewBox="0 0 ${SHEET_W} ${height}" fill="none"><rect width="100%" height="100%" fill="#e7eef5"/>${defsOf(look)}${parts.join("")}</svg>`;
  return { svg, later, width: SHEET_W, height };
}

/**
 * A canvas that fits the picture on a sheet, keeping its shape. A portrait picture uses the sheet's long side as its height.
 * @param width The picture's width.
 * @param height The picture's height.
 * @param sheet The sheet's long and short sides, in pixels.
 * @returns The canvas size.
 */
export function fitSheet(width: number, height: number, sheet: { long: number; short: number }): { width: number; height: number } {
  const portrait = height >= width;
  const frame = portrait ? { width: sheet.short, height: sheet.long } : { width: sheet.long, height: sheet.short };
  const scale = Math.min(frame.width / width, frame.height / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
