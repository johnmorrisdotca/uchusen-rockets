// Packs the orbital launch log out of Jonathan McDowell's GCAT (General Catalog of Artificial Space Objects, https://planet4589.org/space/gcat, CC BY 4.0) and writes src/launches/data.ts.
//
//   node scripts/make-launches.ts <folder holding launch.tsv, launchlog.tsv, lv.tsv, sites.tsv and orgs.tsv>
//
// The five files are the TSV files GCAT publishes under https://planet4589.org/space/gcat/tsv/ (launch/launch.tsv, derived/launchlog.tsv, tables/lv.tsv, tables/sites.tsv, tables/orgs.tsv).
// A launch is kept when GCAT's LaunchCode starts with O (orbital) or D (deep space, from Earth, through a parking orbit) and its second letter is S (success) or F (failure): a pad explosion or a pad abort (E, A) is not a launch.
// Each GCAT fact is kept as GCAT gives it. What this script decides is written in docs/guides/launch-log.md ("What was decided").
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const folder = process.argv[2];
if (!folder) {
  console.error("usage: node scripts/make-launches.ts <folder with the GCAT tsv files>");
  process.exit(1);
}

type Row = Record<string, string>;

/** Reads a GCAT TSV: the header line starts with `#`, and every cell is trimmed. */
function table(name: string): { rows: Row[]; updated: string } {
  const lines = readFileSync(join(folder as string, name), "utf8").split("\n");
  const columns = (lines[0] ?? "").replace(/^#/, "").split("\t").map((cell) => cell.trim());
  const updated = /^# Updated (\d{4}) (\w{3})\s+(\d+)/.exec(lines[1] ?? "");
  const rows = lines.filter((line) => line.length > 0 && !line.startsWith("#")).map((line) => Object.fromEntries(line.split("\t").map((cell, at) => [columns[at] ?? `c${at}`, cell.trim()])));
  return { rows, updated: updated ? `${updated[1]}-${String(MONTHS.indexOf(updated[2] as string) + 1).padStart(2, "0")}-${updated[3]?.padStart(2, "0")}` : "" };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Where GCAT's English spelling is not the one a reader knows, and the one this package shows. */
const SITE_NAMES: Record<string, string> = { Baykonur: "Baikonur", Vostochniy: "Vostochny" };
/** The most payload names kept for one launch; the count of all of them is kept as well. */
const MAX_NAMES = 8;
const none = (value: string | undefined): string | null => (value === undefined || value === "" || value === "-" ? null : value);

const launch = table("launch.tsv");
const log = table("launchlog.tsv");
const lv = table("lv.tsv");
const sites = table("sites.tsv");
const orgs = table("orgs.tsv");

const familyOf = new Map(lv.rows.map((row) => [row.LV_Name as string, none(row.LV_Family) ?? ""]));
const siteName = new Map(sites.rows.map((row) => [row.Site as string, none(row.ShortName) ?? (row.Site as string)]));
const org = new Map(orgs.rows.map((row) => [row.Code as string, row]));
const names = new Map<string, string[]>();
for (const row of log.rows) {
  const tag = row.Launch_Tag as string;
  const list = names.get(tag) ?? [];
  list.push(row.Name as string);
  names.set(tag, list);
}

/** The place of a value in a pool, adding it the first time it is seen. */
function intern<T extends string | string[]>(pool: T[], index: Map<string, number>, value: T): number {
  const key = typeof value === "string" ? value : value.join("\u0001");
  const found = index.get(key);
  if (found !== undefined) return found;
  pool.push(value);
  index.set(key, pool.length - 1);
  return pool.length - 1;
}

const vehicles: string[][] = [];
const vehicleIndex = new Map<string, number>();
const siteList: string[][] = [];
const siteIndex = new Map<string, number>();
const agencies: string[][] = [];
const agencyIndex = new Map<string, number>();
const orbitKinds: string[] = [];
const orbitIndex = new Map<string, number>();
const countries = new Map<string, string>();

const out: (string | number | (string | number)[] | null)[][] = [];
const issues: string[] = [];
for (const row of launch.rows) {
  const code = row.LaunchCode as string;
  if (!/^[OD][SF]/.test(code)) continue;
  const tag = row.Launch_Tag as string;
  // the date: `1957 Oct  4 1928:34`, with the time in four digits (and seconds when known), or no time at all, and a ? when GCAT is unsure of it
  const when = /^(\d{4}) (\w{3})\s+(\d{1,2})(?: (\d{2})(\d{2})(?::(\d{2}))?)?(\?)?$/.exec(row.Launch_Date as string);
  if (!when) {
    issues.push(`${tag}: date ${row.Launch_Date}`);
    continue;
  }
  const month = MONTHS.indexOf(when[2] as string) + 1;
  if (month === 0) issues.push(`${tag}: month ${when[2]}`);
  const date = `${when[1]}-${String(month).padStart(2, "0")}-${String(when[3]).padStart(2, "0")}`;
  const time = when[4] ? `${when[4]}:${when[5]}${when[6] ? `:${when[6]}` : ""}` : "";
  const approx = when[7] ? 1 : 0;

  // the outcome: S or F, with a number after it for the launches GCAT scores between the two
  const fraction = /^[OD]([SF])(\d+)?/.exec(code) as RegExpExecArray;
  const score = fraction[2] === undefined ? 0 : Number(fraction[2]);
  const outcome = score > 0 ? "p" : fraction[1] === "S" ? "s" : "f";

  const vehicle = row.LV_Type as string;
  const v = intern(vehicles, vehicleIndex, [vehicle, familyOf.get(vehicle) ?? ""]);
  const siteCode = row.Launch_Site as string;
  const s = intern(siteList, siteIndex, [siteCode, SITE_NAMES[siteName.get(siteCode) ?? ""] ?? siteName.get(siteCode) ?? siteCode]);
  // an agency written A/B is two organizations; the first one that has a state gives the country
  const agencyCode = row.Agency as string;
  const parts = agencyCode.split("/").map((part) => org.get(part));
  const state = parts.map((part) => part?.StateCode ?? "").find((code) => code !== "") ?? "";
  const a = intern(agencies, agencyIndex, [agencyCode, parts.map((part, at) => part?.ShortName ?? agencyCode.split("/")[at]).join("/"), state]);
  if (state && !countries.has(state)) {
    const stateOrg = org.get(state);
    countries.set(state, none(stateOrg?.ShortEName) ?? none(stateOrg?.Name) ?? state);
  }

  // the orbit: what the profile code says the launch aimed at, kept only when the launch reached an orbit, and the insertion orbit's numbers where GCAT has them
  const target = /^Sat (\w+)/.exec(row.Category as string)?.[1];
  const reached = outcome !== "f";
  const o = reached && target ? intern(orbitKinds, orbitIndex, target) : -1;
  const apogee = reached && row.Apoflag !== "?" && Number(row.Apogee) > 0 ? Number(row.Apogee) : 0;
  const perigee = reached && none(row.Perigee) !== null ? Number(row.Perigee) : null;
  const inclination = reached && none(row.Inc) !== null ? Number(row.Inc) : null;

  const flight = none(row.Flight) ?? none(row.Mission);
  const all = names.get(tag) ?? [];
  out.push([tag, date, time, v, none(row.Variant), s, none(row.Launch_Pad), a, outcome, score, o, apogee, perigee, inclination, flight, approx, all.length, all.slice(0, MAX_NAMES)]);
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}
out.sort((left, right) => `${left[1]}T${left[2] || "00:00"}`.localeCompare(`${right[1]}T${right[2] || "00:00"}`) || String(left[0]).localeCompare(String(right[0])));

const packed = JSON.stringify({ vehicles, sites: siteList, agencies, countries: [...countries], orbits: orbitKinds, rows: out });
const here = dirname(fileURLToPath(import.meta.url));
const text = `// GENERATED by scripts/make-launches.ts from GCAT, the General Catalog of Artificial Space Objects by Jonathan C. McDowell (https://planet4589.org/space/gcat), CC BY 4.0. Do not edit by hand: see NOTICE.md and docs/guides/launch-log.md.
// The log is one packed JSON string, parsed on first use by launches/index.ts. Nothing outside the "launches" entry imports this file.

/** The GCAT release the log was packed from, and the day its files were last updated. */
export const LAUNCH_SOURCE = { release: "1.8.9", updated: ${JSON.stringify(launch.updated)} } as const;

/** The packed log. */
export const PACKED_LAUNCHES: string = ${JSON.stringify(packed)};
`;
writeFileSync(join(here, "..", "src", "launches", "data.ts"), text);
console.log(`${out.length} launches, ${vehicles.length} vehicles, ${siteList.length} sites, ${agencies.length} agencies, ${(text.length / 1024).toFixed(0)} KB`);
