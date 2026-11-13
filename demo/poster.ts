// The Rockets of the World poster: one portrait sheet. Every built craft is the package's own drawing, at one scale, standing on shared baselines in rows from the shortest to the tallest. The SPX ships are a band at the foot, at a smaller scale that the band states.
import { build, drawnPieces, type Built } from "../src/build/index.ts";
import type { Piece } from "../src/model/pieces.ts";
import { defsOf, drawPart, orthographic } from "../src/draw/svg.ts";
import { check } from "../src/fit.ts";
import { axesOf, directionOf, VIEWS, type Angle } from "../src/framing.ts";
import { MAKERS, type MakerId } from "../src/data/makers.ts";
import { figureWords } from "../src/data/types.ts";
import type { LookName } from "../src/looks.ts";
import { MATERIALS } from "../src/model/materials.ts";
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
  ula: "#7a6fb3",
  russia: "#a14a4a",
  "us-army": "#5d7348",
  china: "#8a3b3b",
  japan: "#8a3d4a",
  fleet: "#8a7048",
  sites: "#6e6e6e",
};

const PAD = 28;
const GAP = 4;
const MIN_CELL = 36;
const LABEL = 102;

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
  /** The year it first flew, or the short note when it has not. */
  flight: string;
}

/** A craft's height for its label on the sheet: the number and its unit. What a figure says beside the number belongs on the craft's card, not under a drawing. A craft with no number gives the figure's own words. */
export const heightLabel = (figure: Parameters<typeof figureWords>[0]): string => {
  if (figure && figure.value !== null) return typeof figure.value === "number" ? `${figure.value} m` : figure.value;
  return figureWords(figure, " m");
};

/** A first flight as a year, or the short note when there is no date. */
const flightWords = (figure: { value: string | null; brief?: string }): string => {
  if (figure.value === null) return figure.brief ?? "";
  const year = /^(\d{4})/.exec(figure.value);
  return year ? year[1] : (figure.brief ?? figure.value);
};

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
    craft.push({ key, name: rocket.name, maker: rocket.maker, metres: size.metres, widthM: size.widthM, height: heightLabel(named.facts.height), flight: flightWords(named.firstFlight) });
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

/** A long name on two lines, split so the lines are as even as the words allow. */
const wrapName = (name: string): string[] => {
  if (name.length <= 14 || !name.includes(" ")) return [name];
  const words = name.split(" ");
  let cut = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const score = Math.max(words.slice(0, i).join(" ").length, words.slice(i).join(" ").length);
    if (score < best) {
      best = score;
      cut = i;
    }
  }
  if (cut < words.length && (words[cut] === "and" || words[cut] === "or")) cut += 1;
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
};

/** A craft's cell on the sheet: its width at the scale, with a little room, and never narrower than its name or the least a cell may be. */
export const cellOf = (craft: PosterCraft, unit: number): number => Math.max(MIN_CELL, craft.widthM * unit + 4, Math.max(craft.height.length, ...wrapName(craft.name).map((line) => line.length)) * 4.6);

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

const dot3 = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** How far a built craft reaches along one axis. */
const span = (built: Built, axis: readonly [number, number, number]): { lo: number; hi: number } => {
  const box = built.boundsOf(built.shows[0] ?? "together");
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of [box.min[0], box.max[0]])
    for (const y of [box.min[1], box.max[1]])
      for (const z of [box.min[2], box.max[2]]) {
        const d = x * axis[0] + y * axis[1] + z * axis[2];
        if (d < lo) lo = d;
        if (d > hi) hi = d;
      }
  return { lo, hi };
};

const shipFill = (material: keyof typeof MATERIALS) => MATERIALS[material].color;

/** A poster shows the shapes a person can name, not every hatch. */
const shipShape = (piece: Piece): boolean => {
  if (piece.kind === "lathe") {
    const radius = Math.max(...piece.profile.map(([r]) => r));
    const ys = piece.profile.map(([, y]) => y);
    return radius >= 6 || Math.max(...ys) - Math.min(...ys) >= 30;
  }
  if (piece.kind !== "plate") return false;
  const across = piece.outline.map(([a]) => a);
  const along = piece.outline.map(([, b]) => b);
  return Math.max(...across) - Math.min(...across) >= 8 && Math.max(...along) - Math.min(...along) >= 4;
};

/** One ship, side-on: the windward face, laid flat, in the mesh's own colours. */
const drawShip = (built: Built, unit: number, look: LookName, x0: number, yTop: number): { svg: string; tall: number; length: number } => {
  const direction = directionOf(VIEWS.front);
  const { right, up, forward } = axesOf(direction);
  const along = span(built, up);
  const across = span(built, right);
  const cam = {
    project: (p: readonly [number, number, number]): [number, number] => [x0 + (dot3(p, up) - along.lo) * unit, yTop + (across.hi - dot3(p, right)) * unit],
    depth: (p: readonly [number, number, number]) => dot3(p, forward),
    toward: (): [number, number, number] => [direction[0], direction[1], direction[2]],
    above: true,
  };
  const show = built.shows[0] ?? "together";
  const svg = built
    .placesOf(show)
    .filter((place) => place.shown)
    .sort((a, b) => dot3(a.at, forward) - dot3(b.at, forward))
    .map((place) => {
      const part = built.parts.find((one) => one.slot === place.slot);
      const pieces = part ? drawnPieces(part, show === "together").filter(shipShape).map((piece) => (piece.kind === "lathe" ? { ...piece, segs: Math.min(piece.segs, 16) } : piece)) : [];
      return pieces.length ? drawPart(pieces, place.at, cam, look, 0.45, undefined, shipFill) : "";
    })
    .join("");
  return { svg, tall: Math.max(1, across.hi - across.lo), length: Math.max(1, along.hi - along.lo) };
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
    const gap = GAP;
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
      const lines = wrapName(one.name);
      const stagger = index % 2 === 1 ? 40 : 0;
      const nameTop = base + 16 + stagger;
      const nameLines = lines.map((line, lineIndex) => `<tspan x="${x + cell / 2}" dy="${lineIndex === 0 ? 0 : 9}">${escape(line)}</tspan>`).join("");
      const flight = one.flight ? `<tspan x="${x + cell / 2}" dy="10">${escape(one.flight)}</tspan>` : "";
      parts.push(`<text data-poster-label="1" x="${x + cell / 2}" y="${nameTop}" text-anchor="middle" fill="#172033" font-size="8" font-family="sans-serif">${nameLines}<tspan x="${x + cell / 2}" dy="10">${escape(one.height)}</tspan>${flight}</text>`);
      x += cell + gap;
    }
    y = base + LABEL + 4;
  }
  const ships = fleetKeys().flatMap((key) => {
    const named = variantOf(key.split(":")[0] ?? "", key.split(":")[1]);
    if (!named || !check({ rocket: named.rocket, variant: named.id }).ok) return [];
    const built = build({ rocket: named.rocket, variant: named.id });
    return [{ name: ROCKETS[named.rocket]?.name ?? named.name, built }];
  });
  const along = axesOf(directionOf(VIEWS.front)).up;
  const longest = Math.max(1, ...ships.map((ship) => { const reach = span(ship.built, along); return reach.hi - reach.lo; }));
  const fleetUnit = Math.min(POSTER_UNIT, (inner * 0.96) / longest);
  const ratio = Math.max(1, Math.round(POSTER_UNIT / fleetUnit));
  y += 8;
  parts.push(`<text x="${PAD}" y="${y + 16}" fill="#172033" font-size="14" font-family="sans-serif">${escape(copy.fleet.replace("{n}", String(ratio)))}</text>`);
  y += 28;
  for (const ship of ships) {
    const drawn = drawShip(ship.built, fleetUnit, look, PAD, y);
    parts.push(drawn.svg);
    parts.push(`<text x="${PAD}" y="${y + drawn.tall * fleetUnit + 12}" fill="#172033" font-size="9" font-family="sans-serif">${escape(ship.name)}</text>`);
    y += drawn.tall * fleetUnit + 22;
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
