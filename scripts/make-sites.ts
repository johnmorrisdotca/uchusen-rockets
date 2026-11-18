// Builds the spaceports and launch sites of the `sites` entry: src/sites/data.ts and src/sites/source.ts.
//
//   node scripts/make-sites.ts <folder holding GCAT's sites.tsv> --release <GCAT release, such as 1.8.9>
//
// The places and the names a person decides are in scripts/sites-list.ts. This script adds what the sources say:
// - Wikidata (https://www.wikidata.org, CC0), asked once for the listed items: the coordinate, the English and Japanese labels, the operator (else the owner, and never one that has been dissolved) and the country. It is the one network call, 2 requests of up to 50 items. Nothing is read from Wikipedia.
// - GCAT (https://planet4589.org/space/gcat, CC BY 4.0): the point where Wikidata has none or is not the place, and the summary of the launches from the place, counted from the log in src/launches (so a changed log asks for this script again, and a test says so).
// A row whose Wikidata point lies over 100 km from GCAT's, a code in the launch log that no row holds, or an item with no English or Japanese label that the list does not name stops the script.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { launches } from "../src/launches/index.ts";
import { SITE_ROWS, UNPLACED } from "./sites-list.ts";

const folder = process.argv[2];
const releaseFlag = process.argv.indexOf("--release");
const release = releaseFlag === -1 ? undefined : process.argv[releaseFlag + 1];
if (!folder || folder.startsWith("--") || !/^\d+(\.\d+)+$/.test(release ?? "")) {
  console.error("usage: node scripts/make-sites.ts <folder with GCAT's sites.tsv> --release <the GCAT release on https://planet4589.org/space/gcat, as digits and dots such as 1.8.9>");
  process.exit(1);
}

const USER_AGENT = "uchusen-rockets-data/1.0 (https://github.com/johnmorrisdotca/uchusen-rockets)";
/** Wikidata states a coordinate's precision in degrees; GCAT its error in degrees. Coarser than this (about 500 m) is called approximate. */
const FINE = 0.005;
const FAR_KM = 100;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Row = Record<string, string>;
const lines = readFileSync(join(folder as string, "sites.tsv"), "utf8").split("\n");
const columns = (lines[0] ?? "").replace(/^#/, "").split("\t").map((cell) => cell.trim());
const stamp = /^# Updated (\d{4}) (\w{3})\s+(\d+)/.exec(lines[1] ?? "");
if (!stamp) throw new Error("sites.tsv has no `# Updated <year> <month> <day>` line on its second line");
const gcatUpdated = `${stamp[1]}-${String(MONTHS.indexOf(stamp[2] as string) + 1).padStart(2, "0")}-${(stamp[3] as string).padStart(2, "0")}`;
const gcat = new Map<string, Row>();
for (const line of lines.filter((one) => one.length > 0 && !one.startsWith("#"))) {
  const row = Object.fromEntries(line.split("\t").map((cell, at) => [columns[at] ?? `c${at}`, cell.trim()])) as Row;
  gcat.set(row.Site as string, row);
}

interface Claim {
  rank: string;
  mainsnak: { datavalue?: { value: unknown } };
  qualifiers?: Record<string, unknown>;
}
interface Entity {
  id: string;
  lastrevid: number;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
}

/** The items asked for in batches of 50, as Wikidata's API allows. */
async function entities(ids: string[]): Promise<Map<string, Entity>> {
  const found = new Map<string, Entity>();
  for (let at = 0; at < ids.length; at += 50) {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.slice(at, at + 50).join("|")}&props=labels|claims|info&languages=en|ja&format=json`;
    const reply = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!reply.ok) throw new Error(`Wikidata answered ${reply.status} for ${url}`);
    const body = (await reply.json()) as { entities?: Record<string, Entity & { missing?: string }> };
    for (const [id, entity] of Object.entries(body.entities ?? {})) {
      if (entity.missing !== undefined) throw new Error(`Wikidata has no item ${id}`);
      found.set(id, entity);
    }
  }
  return found;
}

/** A claim that holds today: not deprecated, and with no end time (P582) or end date qualifier. */
const live = (claims: Claim[] | undefined): Claim[] => (claims ?? []).filter((claim) => claim.rank !== "deprecated" && claim.qualifiers?.P582 === undefined);
const itemId = (claim: Claim): string | undefined => (claim.mainsnak.datavalue?.value as { id?: string } | undefined)?.id;

const items = await entities(SITE_ROWS.flatMap((row) => (row.wikidata ? [row.wikidata] : [])));
const related = new Set<string>();
for (const entity of items.values()) {
  const operators = live(entity.claims?.P137).length > 0 ? live(entity.claims?.P137) : live(entity.claims?.P127);
  for (const claim of [...operators, ...live(entity.claims?.P17)]) {
    const id = itemId(claim);
    if (id) related.add(id);
  }
}
for (const row of SITE_ROWS) for (const id of row.operators ?? []) related.add(id);
const others = await entities([...related].sort());

const km = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const rad = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * rad) / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const round = (value: number): number => Math.round(value * 1e4) / 1e4;

// the launch log, by GCAT site code
const placed = new Map<string, string>();
for (const row of SITE_ROWS) for (const code of row.gcat) {
  if (placed.has(code)) throw new Error(`GCAT site ${code} is on both ${placed.get(code)} and ${row.id}`);
  if (!gcat.has(code)) throw new Error(`${row.id}: GCAT has no site ${code}`);
  placed.set(code, row.id);
}
const inLog = new Set(launches().map((launch) => launch.site.code));
for (const code of inLog) if (!placed.has(code) && !(code in UNPLACED)) throw new Error(`GCAT site ${code} is in the launch log and on no row`);
for (const code of Object.keys(UNPLACED)) if (!inLog.has(code) || placed.has(code)) throw new Error(`UNPLACED names ${code}, which is not an unplaced site of the log`);

const notes: string[] = [];
const out = SITE_ROWS.map((row) => {
  const item = row.wikidata ? (items.get(row.wikidata) as Entity) : undefined;
  const preferred = live(item?.claims?.P625).sort((left, right) => Number(right.rank === "preferred") - Number(left.rank === "preferred"))[0];
  const point = preferred?.mainsnak.datavalue?.value as { latitude: number; longitude: number; precision: number | null } | undefined;
  const first = row.gcat[0] === undefined ? undefined : gcat.get(row.gcat[0]);
  const fromGcat = (row.position === "gcat" || point === undefined) && first !== undefined && first.Latitude !== "-" && first.Latitude !== "";
  if (!fromGcat && point === undefined) throw new Error(`${row.id}: no point in Wikidata or GCAT`);
  const lat = fromGcat ? Number((first as Row).Latitude) : (point as { latitude: number }).latitude;
  const lon = fromGcat ? Number((first as Row).Longitude) : (point as { longitude: number }).longitude;
  const error = fromGcat ? Number((first as Row).Error) : (point as { precision: number | null }).precision;
  if (point !== undefined && first !== undefined && first.Latitude !== "-") {
    const apart = km(point.latitude, point.longitude, Number(first.Latitude), Number(first.Longitude));
    if (apart > FAR_KM) throw new Error(`${row.id}: Wikidata's point is ${Math.round(apart)} km from GCAT's`);
  }

  const label = (language: string): string | undefined => item?.labels?.[language]?.value;
  const en = row.en ?? label("en");
  const ja = row.ja ?? label("ja");
  if (!en) throw new Error(`${row.id}: no English name`);
  if (!ja) throw new Error(`${row.id}: no Japanese name: type one in scripts/sites-list.ts`);

  const operatorClaims = live(item?.claims?.P137).length > 0 ? live(item?.claims?.P137) : live(item?.claims?.P127);
  const named = row.operators ?? operatorClaims.flatMap((claim) => itemId(claim) ?? []).filter((id) => live(others.get(id)?.claims?.P576).length === 0);
  const operators = [...new Set(named.map((id) => others.get(id)?.labels?.en?.value ?? ""))];
  if (operators.includes("")) throw new Error(`${row.id}: an operator has no English label: ${named.join(", ")}`);
  const countries = new Set(live(item?.claims?.P17).flatMap((claim) => (itemId(claim) ? live(others.get(itemId(claim) as string)?.claims?.P297).map((iso) => (iso.mainsnak.datavalue?.value as string)) : [])));
  const countrySource = row.country === null || row.country === undefined ? null : countries.has(row.country) ? "wikidata" : "typed";
  if (countrySource === "typed") notes.push(`${row.id}: country ${row.country} is typed; Wikidata says ${[...countries].join(", ") || "nothing"}`);

  const mine = launches().filter((launch) => row.gcat.includes(launch.site.code));
  const count = (outcome: string) => mine.filter((launch) => launch.outcome === outcome).length;
  if (row.gcat.length > 0 && mine.length === 0) notes.push(`${row.id}: GCAT's codes ${row.gcat.join(", ")} have no launch in the log`);
  const summary =
    mine.length === 0 ? null : { total: mine.length, success: count("success"), partial: count("partial"), failure: count("failure"), first: (mine[0] as { date: string }).date, last: (mine[mine.length - 1] as { date: string }).date };

  return {
    id: row.id,
    kind: row.kind,
    name: { en, ja },
    country: row.country ?? null,
    lat: round(lat),
    lon: round(lon),
    approximate: error === null || Number.isNaN(error) || error > FINE,
    operators,
    codes: { gcat: row.gcat, celestrak: row.celestrak },
    wikidata: item ? { id: item.id, revision: item.lastrevid } : null,
    launches: summary,
    sources: { position: fromGcat ? "gcat" : "wikidata", en: row.en ? "typed" : "wikidata", ja: row.ja ? "typed" : "wikidata", country: countrySource, operators: operators.length === 0 ? null : row.operators ? "typed" : "wikidata" },
  };
});
if (new Set(out.map((row) => row.id)).size !== out.length) throw new Error("two rows share an id");
for (const note of notes) console.log(`note ${note}`);

const here = dirname(fileURLToPath(import.meta.url));
const retrieved = new Date().toISOString().slice(0, 10);
const data = `// GENERATED by scripts/make-sites.ts from Wikidata (CC0) and GCAT, the General Catalog of Artificial Space Objects by Jonathan C. McDowell (https://planet4589.org/space/gcat), CC BY 4.0. Do not edit by hand: see NOTICE.md and docs/guides/sites.md.
// One row to a line. Nothing outside the "sites" entry imports this file.
import type { Site } from "./types.ts";

/** The places, in the order of the list in scripts/sites-list.ts. */
export const SITE_DATA: readonly Site[] = [
${out.map((row) => `  ${JSON.stringify(row)},`).join("\n")}
];
`;
writeFileSync(join(here, "..", "src", "sites", "data.ts"), data);
const source = `// GENERATED by scripts/make-sites.ts. Do not edit by hand: see NOTICE.md and docs/guides/sites.md.
// Where the sites come from. It is a file of its own so that reading the credit does not load the data in ./data.ts.

/**
 * Where the sites come from: Wikidata (CC0) for the points, the names and the operators, and GCAT (CC BY 4.0) for the rest, with the credit to print where GCAT's part is shown, the release the launch summaries were counted from and the days the sources were read.
 *
 * @example
 * \`\`\`ts
 * import { SITES_SOURCE } from "@johnmorrisdotca/uchusen-rockets/sites/source";
 *
 * console.log(SITES_SOURCE.gcat.credit);
 * \`\`\`
 */
export const SITES_SOURCE = {
  wikidata: { title: "Wikidata", url: "https://www.wikidata.org", licence: "CC0 1.0", licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/", retrieved: "${retrieved}" },
  gcat: {
    title: "GCAT: General Catalog of Artificial Space Objects",
    author: "Jonathan C. McDowell",
    url: "https://planet4589.org/space/gcat",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    credit: "Data from GCAT (J. McDowell, planet4589.org/space/gcat)",
    release: "${release}",
    sitesUpdated: "${gcatUpdated}",
  },
} as const;
`;
writeFileSync(join(here, "..", "src", "sites", "source.ts"), source);
console.log(`wrote ${out.length} sites; ${out.filter((row) => row.launches !== null).length} with launches`);
