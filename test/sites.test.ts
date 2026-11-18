// The sites: what every row must carry, spot checks against places everybody knows, the summaries against the launch log, the credit, and that the entry stays a lazy sub-path of its own with its own size baseline.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { launches } from "../src/launches/index.ts";
import { findSites, siteById, sites, SITES_SOURCE, type Site } from "../src/sites/index.ts";

const site = (id: string): Site => {
  const found = siteById(id);
  assert.ok(found, id);
  return found;
};
/** The distance in km between two points on the Earth. */
const km = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const rad = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * rad) / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

test("every row has an id of its own, both names, a point on the Earth, its sources and a way back to them", () => {
  const all = sites();
  assert.ok(all.length >= 50, `${all.length} places`);
  assert.equal(new Set(all.map((one) => one.id)).size, all.length);
  for (const one of all) {
    assert.match(one.id, /^[a-z]+(-[a-z]+)*$/, one.id);
    assert.ok(one.kind === "spaceport" || one.kind === "launch-area", one.id);
    assert.ok(one.name.en.length > 0 && /[A-Za-z]/.test(one.name.en), one.id);
    assert.match(one.name.ja, /[\u3040-\u30ff\u4e00-\u9fff]/, `${one.id}: ${one.name.ja} has no Japanese`);
    assert.doesNotMatch(one.name.ja, /[A-Za-z]/, `${one.id}: ${one.name.ja} has Latin letters`);
    assert.ok(Math.abs(one.lat) <= 90 && Math.abs(one.lon) <= 180, one.id);
    assert.equal(one.lat, Math.round(one.lat * 1e4) / 1e4, `${one.id}: four places`);
    assert.ok(one.country === null || /^[A-Z]{2}$/.test(one.country), one.id);
    assert.equal(one.country === null, one.sources.country === null, `${one.id}: a country has a source, a sea has none`);
    assert.equal(one.operators.length === 0, one.sources.operators === null, `${one.id}: operators and their source`);
    if (one.sources.position === "wikidata") assert.ok(one.wikidata, one.id);
    if (one.wikidata) assert.match(one.wikidata.id, /^Q\d+$/, one.id);
    else assert.equal(one.sources.position, "gcat", `${one.id}: no Wikidata item, so the point is GCAT's`);
    assert.ok(one.wikidata !== null || (one.sources.en === "typed" && one.sources.ja === "typed"), `${one.id}: names with no item are typed`);
    assert.ok(one.country !== null || one.kind === "launch-area", `${one.id}: a place at sea is a launch area`);
    assert.ok(one.codes.gcat.length > 0 || one.wikidata !== null, `${one.id}: GCAT or Wikidata names it`);
    assert.equal(one.launches === null, one.codes.gcat.length === 0, `${one.id}: launches come from its GCAT codes`);
  }
});

test("places everybody knows are where they are, with their names, countries and operators", () => {
  const kourou = site("kourou");
  assert.equal(kourou.name.ja, "ギアナ宇宙センター");
  assert.equal(kourou.country, "GF", "French Guiana, as the launch log's ISO codes have it");
  assert.ok(km(kourou.lat, kourou.lon, 5.24, -52.77) < 10);
  const baikonur = site("baikonur");
  assert.equal(baikonur.country, "KZ", "the place, not the state that runs it");
  assert.deepEqual(baikonur.codes.gcat, ["NIIP-5", "GIK-5"]);
  assert.ok(km(baikonur.lat, baikonur.lon, 45.96, 63.31) < 10);
  const tanegashima = site("tanegashima");
  assert.equal(tanegashima.name.ja, "種子島宇宙センター");
  assert.deepEqual(tanegashima.operators, ["Japan Aerospace Exploration Agency"]);
  assert.ok(km(tanegashima.lat, tanegashima.lon, 30.4, 130.97) < 10);
  const cape = site("cape-canaveral");
  assert.ok(km(cape.lat, cape.lon, 28.49, -80.58) < 10);
  assert.ok(km(site("kennedy").lat, site("kennedy").lon, 28.52, -80.65) < 10);
  assert.ok(km(site("mahia").lat, site("mahia").lon, -39.26, 177.87) < 10);
  assert.equal(site("mahia").country, "NZ");
  assert.equal(site("kwajalein").country, "MH");
});

test("Starbase's point is GCAT's, at the pad, and not Wikidata's, which is the village 3 km off", () => {
  const starbase = site("starbase");
  assert.equal(starbase.sources.position, "gcat");
  assert.ok(km(starbase.lat, starbase.lon, 25.9964, -97.1536) < 0.1);
  assert.equal(starbase.name.ja, "スターベース");
  assert.deepEqual(starbase.operators, ["SpaceX"]);
});

test("a spaceport with no launch in the log has no launch summary, and the sea has no country", () => {
  for (const id of ["spaceport-america", "esrange", "corn-ranch"]) {
    assert.equal(site(id).launches, null, id);
    assert.deepEqual(site(id).codes.gcat, [], id);
  }
  assert.equal(site("spaceport-america").country, "US");
  assert.equal(site("esrange").country, "SE");
  for (const one of findSites({ country: null })) assert.equal(one.kind, "launch-area", one.id);
  assert.ok(findSites({ country: null }).length >= 5);
});

test("the launch summaries are the launch log's own counts, and every site in the log is on one row", () => {
  const log = launches();
  const owner = new Map<string, string>();
  for (const one of sites()) for (const code of one.codes.gcat) {
    assert.equal(owner.get(code), undefined, `${code} is on two rows`);
    owner.set(code, one.id);
  }
  const loose = new Set(log.filter((launch) => !owner.has(launch.site.code)).map((launch) => launch.site.code));
  assert.deepEqual([...loose], ["TYSC?"], "only GCAT's own doubtful site is on no row");
  for (const one of sites()) {
    const mine = log.filter((launch) => owner.get(launch.site.code) === one.id);
    if (one.launches === null) {
      assert.equal(mine.length, 0, one.id);
      continue;
    }
    assert.equal(one.launches.total, mine.length, one.id);
    assert.equal(one.launches.total, one.launches.success + one.launches.partial + one.launches.failure, one.id);
    for (const outcome of ["success", "partial", "failure"] as const) assert.equal(one.launches[outcome], mine.filter((launch) => launch.outcome === outcome).length, `${one.id} ${outcome}`);
    assert.equal(one.launches.first, mine[0]?.date, one.id);
    assert.equal(one.launches.last, mine[mine.length - 1]?.date, one.id);
  }
  assert.equal(site("baikonur").launches?.first, "1957-10-04", "Sputnik 1");
  assert.equal(sites().reduce((sum, one) => sum + (one.launches?.total ?? 0), 0), log.length - 1, "every launch but the one at TYSC?");
});

test("a few points against where GCAT puts the launches from them", () => {
  assert.ok(km(site("vandenberg").lat, site("vandenberg").lon, 34.63, -120.61) < 25, "Vandenberg");
  assert.ok(km(site("plesetsk").lat, site("plesetsk").lon, 62.9, 40.5) < 10, "Plesetsk");
  assert.ok(km(site("kapustin-yar").lat, site("kapustin-yar").lon, 48.5, 45.8) < 50, "Kapustin Yar");
  assert.ok(km(site("jiuquan").lat, site("jiuquan").lon, 41.31, 100.31) < 50, "Jiuquan");
  assert.ok(km(site("sea-launch").lat, site("sea-launch").lon, 0, -154) < 1, "the Sea Launch platform is at the equator");
});

test("the lookups: by id, by any code, by kind, by country and by the day of the latest launch", () => {
  assert.equal(siteById("nowhere"), undefined);
  assert.equal(siteById("kourou"), site("kourou"));
  assert.equal(findSites({ code: "NIIP-5" })[0]?.id, "baikonur");
  assert.equal(findSites({ code: "niip-5" })[0]?.id, "baikonur", "a code matches without regard to case");
  assert.equal(findSites({ code: "TYMSC" })[0]?.id, "baikonur", "CelesTrak's code");
  assert.equal(findSites({ code: "Q177477" })[0]?.id, "baikonur", "the Wikidata item");
  assert.deepEqual(findSites({ code: "AFETR" }).map((one) => one.id), ["cape-canaveral", "kennedy"], "CelesTrak's one code for both");
  assert.deepEqual(findSites({ code: "XX" }), []);
  assert.equal(findSites().length, sites().length);
  assert.deepEqual(findSites({ country: "JP" }).map((one) => one.id), ["tanegashima", "uchinoura", "kii", "hokkaido"]);
  assert.deepEqual(findSites({ country: "jp", kind: "launch-area" }), []);
  const active = findSites({ since: "2026-01-01" }).map((one) => one.id);
  assert.ok(active.includes("kourou") && active.includes("mahia") && !active.includes("woomera") && !active.includes("spaceport-america"));
  assert.ok(findSites({ launched: false }).every((one) => one.launches === null));
  assert.equal(findSites({ launched: true }).length + findSites({ launched: false }).length, sites().length);
  assert.ok(findSites({ kind: "spaceport" }).length + findSites({ kind: "launch-area" }).length === sites().length);
});

test("the rows are shared, so they are frozen all the way down", () => {
  const one = site("kourou");
  assert.ok(Object.isFrozen(sites()) && Object.isFrozen(one) && Object.isFrozen(one.name) && Object.isFrozen(one.codes) && Object.isFrozen(one.codes.gcat) && Object.isFrozen(one.operators) && Object.isFrozen(one.launches) && Object.isFrozen(one.sources) && Object.isFrozen(one.wikidata));
  assert.throws(() => {
    (one.name as { en: string }).en = "x";
  }, TypeError);
});

test("the sources are credited as their licences ask, in NOTICE.md, with the days they were read", () => {
  assert.equal(SITES_SOURCE.wikidata.licence, "CC0 1.0");
  assert.match(SITES_SOURCE.wikidata.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(SITES_SOURCE.gcat.credit, "Data from GCAT (J. McDowell, planet4589.org/space/gcat)");
  assert.match(SITES_SOURCE.gcat.release, /^\d+(\.\d+)+$/);
  assert.match(SITES_SOURCE.gcat.sitesUpdated, /^\d{4}-\d{2}-\d{2}$/);
  const notice = readFileSync("NOTICE.md", "utf8");
  assert.ok(notice.includes("## Spaceports and launch sites"));
  assert.ok(notice.includes(`holds ${sites().length} spaceports and launch sites`), "NOTICE.md counts the places");
  for (const word of ["Wikidata", "CC0", "https://www.wikidata.org/wiki/Wikidata:Licensing", SITES_SOURCE.wikidata.retrieved, SITES_SOURCE.gcat.sitesUpdated, "CelesTrak", "scripts/make-sites.ts", "src/sites/data.ts"]) assert.ok(notice.includes(word), `NOTICE.md does not say ${word}`);
  const data = readFileSync("src/sites/data.ts", "utf8");
  assert.ok(!/openstreetmap|wikipedia/i.test(data), "no share-alike source is in the data");
});

test("the entry is a lazy sub-path of its own: one data file, nothing else imports it, and a size baseline", async () => {
  const imports = (file: string) => [...readFileSync(file, "utf8").matchAll(/^(?:import|export)[^"\n]*from "([^"]+)"/gm)].map((match) => match[1] as string);
  for (const file of ["src/sites/index.ts", "src/sites/data.ts", "src/sites/source.ts", "src/sites/types.ts"]) for (const from of imports(file)) assert.match(from, /^\.\/(data|source|types|index)\.ts$/, `${file} imports ${from}`);
  assert.deepEqual(imports("src/sites/data.ts"), ["./types.ts"]);
  assert.deepEqual(imports("src/sites/source.ts"), [], "reading the credit loads no data");
  assert.deepEqual(imports("src/sites/types.ts"), []);
  assert.ok(statSync("src/sites/source.ts").size < 4096);
  assert.ok(statSync("src/sites/data.ts").size < 48 * 1024, `the data file is ${statSync("src/sites/data.ts").size} bytes`);
  for (const file of ["src/index.ts", "src/build/index.ts", "src/launches/index.ts", "src/element.ts"]) assert.ok(!readFileSync(file, "utf8").includes("sites/"), `${file} does not load the sites`);
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { exports: Record<string, { import: string }> };
  assert.equal(pkg.exports["./sites"]?.import, "./dist/sites/index.js");
  assert.equal(pkg.exports["./sites/source"]?.import, "./dist/sites/source.js");

  // The entry bundled and minified as a reader's bundler would (what `pnpm size` measures), held to its own baseline: 27.4 kB minified and 6.2 kB gzipped when it was made, and the credit alone 0.5 kB.
  const measure = async (file: string) => {
    const built = await build({ entryPoints: [file], bundle: true, minify: true, format: "esm", platform: "neutral", target: "es2020", write: false, logLevel: "silent" });
    const bytes = built.outputFiles[0]?.contents as Uint8Array;
    return { minified: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
  };
  const entry = await measure("src/sites/index.ts");
  assert.ok(entry.minified < 30_000 && entry.gzip < 7_000, `the sites entry is ${entry.minified} B minified and ${entry.gzip} B gzipped: raise the baseline in this test only if the places grew on purpose`);
  assert.ok((await measure("src/sites/source.ts")).minified < 1_024);
});
