// Writes test/data/orbit-horizons.json: what JPL Horizons gives for a few flights, so test/physics-horizons.test.ts can measure the
// propagator against it without the network. By hand, never in the build or CI:
//
//   node scripts/fetch-orbit-reference.ts
//
// JPL's SSD API fair-use policy (https://ssd-api.jpl.nasa.gov/, read 2026-11-11): one request at a time, no more than needed, back off on
// errors, and a User-Agent naming the application. HORIZONS_USER_AGENT sets it; the default names this script only. The data are NASA/JPL
// Solar System Dynamics', which JPL calls public domain (https://ssd.jpl.nasa.gov/faq.html).
// Three flights, each with the bodies that pull, in kilometres and kilometres a second, TDB:
//   moon:     the Moon from the solar system's barycentre, 28 days of 2026, with the Sun and the planets every 12 hours (ecliptic J2000).
//   roadster: the Tesla Roadster (-143205) from the barycentre, the first half of 2025, with the Sun and the planets every 2 days.
//   iss:      the ISS (-125544) from the Earth's centre, 100 minutes on 2026-10-01, every minute (the Earth's equator, ICRF).
// The gravitational parameters (DE440's) and the obliquity of the ecliptic are from https://ssd.jpl.nasa.gov/astro_par.html, the Earth's J2 and radius Horizons' own (body 399).
import { writeFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const AGENT = process.env.HORIZONS_USER_AGENT ?? "orbit-reference-script/1.0";

async function get(url: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": AGENT } });
    if (response.ok) return response.text();
    console.error(`${response.status} for ${url.slice(0, 120)}, waiting`);
    await sleep(10_000 * (attempt + 1));
  }
  throw new Error(`no answer from ${url.slice(0, 120)}`);
}

async function horizons(params: Record<string, string>): Promise<string> {
  const query = new URLSearchParams({ format: "json", ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, `'${v}'`])) });
  const text = (JSON.parse(await get(`${API}?${query}`)) as { result: string }).result;
  await sleep(1_000);
  return text;
}

/** Rows of [x, y, z, vx, vy, vz], kilometres to the metre and km/s to the micrometre a second, and the TDB Julian date of the first. */
async function vectors(command: string, center: string, plane: "ECLIPTIC" | "FRAME", start: string, stop: string, stepSize: string): Promise<{ jd0: number; rows: number[][] }> {
  const text = await horizons({ COMMAND: command, OBJ_DATA: "NO", MAKE_EPHEM: "YES", EPHEM_TYPE: "VECTORS", CENTER: center, REF_PLANE: plane, REF_SYSTEM: "ICRF", OUT_UNITS: "KM-S", VEC_TABLE: "2", CSV_FORMAT: "YES", TIME_TYPE: "TDB", START_TIME: start, STOP_TIME: stop, STEP_SIZE: stepSize });
  if (!text.includes("$$SOE")) throw new Error(`Horizons gave no vectors for ${command}@${center}: ${text.slice(0, 400)}`);
  const lines = text.split("$$SOE")[1]!.split("$$EOE")[0]!.trim().split("\n");
  const cells = lines.map((line) => line.split(",").map((cell) => cell.trim()));
  const round = (cell: string, k: number): number => Number(Number(cell).toFixed(k < 3 ? 3 : 9));
  return { jd0: Number(cells[0]![0]), rows: cells.map((c) => c.slice(2, 8).map(round)) };
}

const PLANETS: Record<string, string> = { sun: "10", mercury: "199", venus: "299", mars: "4", jupiter: "5", saturn: "6", uranus: "7", neptune: "8", pluto: "9" };

async function flight(craft: string, center: string, plane: "ECLIPTIC" | "FRAME", start: string, stop: string, stepSize: string, bodies: Record<string, string>) {
  const own = await vectors(craft, center, plane, start, stop, stepSize);
  const pulled: Record<string, number[][]> = {};
  for (const [name, code] of Object.entries(bodies)) {
    const table = await vectors(code, center, plane, start, stop, stepSize);
    if (table.jd0 !== own.jd0 || table.rows.length !== own.rows.length) throw new Error(`${name}'s table does not line up with ${craft}'s`);
    pulled[name] = table.rows;
  }
  return { start: `${start} TDB`, jd0: own.jd0, step: stepSize, craft: own.rows, bodies: pulled };
}

async function main(): Promise<void> {
  const parRaw = await get("https://ssd.jpl.nasa.gov/astro_par.html");
  const par = parRaw.replace(/<[^>]*>/g, " ").replace(/&#\d+;|&nbsp;/g, " ").replace(/\s+/g, " ");
  const gmOf = (label: string): number => {
    const match = new RegExp(`${label} (-?[\\d.]+)`).exec(par);
    if (!match) throw new Error(`no GM for ${label} on astro_par.html`);
    return Number(match[1]);
  };
  const sunMatch = /GM sun ([\d.]+) x 10 (\d+) m 3 s -2/.exec(par);
  if (!sunMatch) throw new Error("no GM of the Sun on astro_par.html");
  const gm: Record<string, number> = {
    sun: (Number(sunMatch[1]) * 10 ** Number(sunMatch[2])) / 1e9,
    mercury: gmOf("Mercury"),
    venus: gmOf("Venus"),
    earth: gmOf("Earth"),
    moon: gmOf("Moon"),
    mars: gmOf("Mars system"),
    jupiter: gmOf("Jupiter system"),
    saturn: gmOf("Saturn system"),
    uranus: gmOf("Uranus system"),
    neptune: gmOf("Neptune system"),
    pluto: gmOf("Pluto system"),
  };

  const obliquity = /obliquity of ecliptic \(J2000\) &#949; ([\d.]+) \(/.exec(parRaw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
  if (!obliquity) throw new Error("no obliquity on astro_par.html");

  const earth = await horizons({ COMMAND: "399", OBJ_DATA: "YES", MAKE_EPHEM: "NO" });
  const num = (pattern: RegExp, what: string): number => {
    const match = pattern.exec(earth);
    if (!match) throw new Error(`no ${what} in Horizons' Earth data`);
    return Number(match[1]);
  };
  const earthData = {
    j2: num(/J2 \(IERS 2010\)\s*=\s*([\d.]+)/, "J2"),
    radiusKm: num(/Equ\. radius, km\s*=\s*([\d.]+)/, "equatorial radius"),
    gm: num(/GM, km\^3\/s\^2\s*=\s*([\d.]+)/, "GM"),
    siderealYearDays: num(/Sidereal orb period\s*=\s*([\d.]+) d/, "sidereal period"),
  };
  const year = await vectors("3", "500@10", "ECLIPTIC", "2026-01-01 00:00", "2026-01-01 00:01", "1");

  const moon = await flight("301", "500@0", "ECLIPTIC", "2026-01-01 00:00", "2026-01-29 00:00", "12 h", { ...PLANETS, earth: "399" });
  const roadster = await flight("-143205", "500@0", "ECLIPTIC", "2025-01-01 00:00", "2025-07-02 00:00", "2 d", { ...PLANETS, "earth-moon": "3" });
  const iss = await vectors("-125544", "500@399", "FRAME", "2026-10-01 00:00", "2026-10-01 01:40", "1 m");

  const out = {
    source: "NASA/JPL Solar System Dynamics, Horizons (https://ssd.jpl.nasa.gov/api/horizons.api) and Astrodynamic Parameters (https://ssd.jpl.nasa.gov/astro_par.html), read 2026-11-11 by scripts/fetch-orbit-reference.ts. Public domain (https://ssd.jpl.nasa.gov/faq.html).",
    units: "km, km/s, km^3/s^2, TDB",
    gm,
    obliquityArcsec: Number(obliquity[1]),
    earth: { ...earthData, source: "Horizons body 399, geophysical properties" },
    earthMoonBarycentre: { center: "the Sun's centre, ecliptic J2000", jd0: year.jd0, state: year.rows[0] },
    moon: { frame: "solar system barycentre, ecliptic J2000", ...moon },
    roadster: { frame: "solar system barycentre, ecliptic J2000", ...roadster },
    iss: { frame: "the Earth's centre, ICRF equator", start: "2026-10-01 00:00 TDB", jd0: iss.jd0, step: "1 m", craft: iss.rows },
  };
  writeFileSync(new URL("../test/data/orbit-horizons.json", import.meta.url), `${JSON.stringify(out)}\n`);
  console.log(`wrote test/data/orbit-horizons.json: moon ${moon.craft.length} rows, roadster ${roadster.craft.length}, iss ${iss.rows.length}`);
}

await main();
