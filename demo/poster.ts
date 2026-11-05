// The Rockets of the World poster. Every built craft is the package's own line drawing, at one scale, with the SPX ships in their own row. A craft with no shape is named, never drawn.
import { lineupSvg } from "../src/build/lineup.ts";
import { MAKERS, type MakerId } from "../src/data/makers.ts";
import { figureWords } from "../src/data/types.ts";
import { ROCKETS, PLANNED_ROCKETS, variantOf } from "../src/rockets.ts";

/** Pixels to a metre, the same on every row, so a fleet ship towers over a rocket. */
export const POSTER_UNIT = 2;

/** A landscape sheet at 300 dpi: the long side and the short side, in pixels. A2 is 420 × 594 mm, A1 is 594 × 841 mm. */
export const SHEETS = { a2: { long: 7016, short: 4961 }, a1: { long: 9933, short: 7016 } } as const;

const MARK: Record<MakerId, string> = {
  spacex: "#b7c3d4",
  nasa: "#7f9cc4",
  "blue-origin": "#6aa8c8",
  "rocket-lab": "#c4b48a",
  russia: "#c48b8b",
  "us-army": "#8a9b78",
  fleet: "#d4c4a8",
  sites: "#8a8a8a",
};

export interface PosterCopy {
  title: string;
  later: string;
  scale: string;
  metre: string;
}

const ENGLISH: PosterCopy = {
  title: "Rockets of the World",
  later: "To add later",
  scale: "50 m",
  metre: "One metre is the same on every row.",
};

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const keyOf = (id: string): string => {
  const entry = ROCKETS[id];
  return entry ? `${id}:${entry.defaultVariant}` : id;
};

/** Built craft that stand in a maker's row: a site and an SPX ship are not in these rows. */
export function rocketRows(): { maker: MakerId; name: string; keys: string[] }[] {
  const rows: { maker: MakerId; name: string; keys: string[] }[] = [];
  for (const id of Object.keys(MAKERS) as MakerId[]) {
    if (id === "sites" || id === "fleet") continue;
    const keys = Object.values(ROCKETS)
      .filter((rocket) => rocket.status === "built" && rocket.maker === id)
      .map((rocket) => keyOf(rocket.id));
    if (keys.length > 0) rows.push({ maker: id, name: MAKERS[id], keys });
  }
  return rows;
}

/** The SPX ships, the ones whose names carry a designation. Part kits are not ships. */
export function fleetKeys(): string[] {
  return Object.values(ROCKETS)
    .filter((rocket) => rocket.maker === "fleet" && rocket.name.includes("SPX-"))
    .map((rocket) => keyOf(rocket.id));
}

/** Craft the catalogue names, or the poster was asked for, that have no drawing yet. */
export function laterNames(): string[] {
  const names = PLANNED_ROCKETS.map((rocket) => rocket.name);
  if (!Object.values(ROCKETS).some((rocket) => rocket.name.includes("SPX-013"))) names.push("Hanabusa, SPX-013");
  return names;
}

const factsOf = (key: string): string => {
  const named = variantOf(key.split(":")[0] ?? "", key.split(":")[1]);
  if (!named) return key;
  return `${named.name} — ${figureWords(named.facts.height, " m")} — ${figureWords(named.firstFlight)}`;
};

const caption = (keys: readonly string[], y: number): { svg: string; height: number } => {
  const lines = keys.map((key) => factsOf(key));
  const body = lines.map((line, i) => `<tspan x="48" dy="${i === 0 ? 0 : 16}">${escape(line)}</tspan>`).join("");
  return { svg: `<text x="48" y="${y}" fill="#93a6c0" font-size="13" font-family="sans-serif">${body}</text>`, height: lines.length * 16 + 12 };
};

/**
 * The poster as one SVG.
 * @param copy The sentences that change with the reader's language. Left out, the poster is in English.
 * @returns The picture, its size, and the names it lists as still to add.
 */
export function posterSvg(copy: PosterCopy = ENGLISH): { svg: string; later: string[]; width: number; height: number } {
  const later = laterNames();
  const bands = [
    ...rocketRows().map((row) => ({ maker: row.maker, title: row.name, picture: lineupSvg({ items: row.keys, unit: POSTER_UNIT, labels: true, ruler: true, filter: "rockets" as const }) })),
    { maker: "fleet" as const, title: MAKERS.fleet, picture: lineupSvg({ items: fleetKeys(), unit: POSTER_UNIT, labels: true, ruler: true, filter: "fleet" as const }) },
  ];
  let width = 720;
  for (const band of bands) width = Math.max(width, band.picture.width + 72);
  const bar = 50 * POSTER_UNIT;
  const parts: string[] = [];
  parts.push(`<text x="24" y="36" fill="#f4f7fb" font-size="28" font-family="sans-serif">${escape(copy.title)}</text>`);
  parts.push(`<line x1="${width - bar - 24}" y1="28" x2="${width - 24}" y2="28" stroke="#f4f7fb" stroke-width="3"/>`);
  parts.push(`<text x="${width - bar - 24}" y="48" fill="#f4f7fb" font-size="14" font-family="sans-serif">${escape(copy.scale)}</text>`);
  parts.push(`<text x="24" y="62" fill="#93a6c0" font-size="14" font-family="sans-serif">${escape(copy.metre)}</text>`);
  let y = 84;
  for (const band of bands) {
    parts.push(`<rect x="24" y="${y + 8}" width="16" height="16" rx="3" fill="${MARK[band.maker]}"/>`);
    parts.push(`<text x="48" y="${y + 22}" fill="#dfe9f6" font-size="22" font-family="sans-serif">${escape(band.title)}</text>`);
    parts.push(`<g transform="translate(24,${y + 36})">${band.picture.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</g>`);
    y += band.picture.height + 44;
    const lines = caption(band.picture.items.map((item) => item.key), y);
    parts.push(lines.svg);
    y += lines.height + 16;
  }
  parts.push(`<text x="24" y="${y + 20}" fill="#93a6c0" font-size="16" font-family="sans-serif">${escape(`${copy.later}: ${later.join(", ")}`)}</text>`);
  y += 48;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}" fill="none" style="color:#d7e2f0"><rect width="100%" height="100%" fill="#05080f"/>${parts.join("")}</svg>`;
  return { svg, later, width, height: y };
}

/**
 * A canvas that fits the picture on a landscape sheet, keeping its shape.
 * @param width The picture's width.
 * @param height The picture's height.
 * @param sheet The sheet's long and short sides, in pixels.
 * @returns The canvas size.
 */
export function fitSheet(width: number, height: number, sheet: { long: number; short: number }): { width: number; height: number } {
  const scale = Math.min(sheet.long / width, sheet.short / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
