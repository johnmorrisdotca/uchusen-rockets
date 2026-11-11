// The launch log: its spot checks against launches everybody knows, its lookups and counts, its link to this package's rockets, its credit, and that it stays a sub-path of its own.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { ROCKETS } from "../src/index.ts";
import {
  countLaunches,
  findLaunches,
  LAUNCH_LOG_SOURCE,
  LAUNCH_VEHICLE_LINKS,
  launchByTag,
  launches,
  launchesByOutcome,
  launchesBySite,
  launchesByVehicle,
  launchesByYear,
  launchTotals,
  ORBIT_KINDS,
} from "../src/launches/index.ts";

test("the log holds every orbital launch attempt since 1957, oldest first, each with a tag of its own", () => {
  const all = launches();
  assert.ok(all.length > 7000, `${all.length} launches`);
  assert.equal(new Set(all.map((launch) => launch.tag)).size, all.length);
  assert.equal(all[0]?.date, "1957-10-04");
  for (let at = 1; at < all.length; at++) assert.ok((all[at - 1] as { ms: number }).ms <= (all[at] as { ms: number }).ms, `${all[at]?.tag} is out of order`);
  for (const launch of all) {
    assert.match(launch.date, /^\d{4}-\d{2}-\d{2}$/, launch.tag);
    assert.ok(launch.time === null || /^\d{2}:\d{2}(:\d{2})?$/.test(launch.time), launch.tag);
    assert.ok(Number.isFinite(launch.ms), launch.tag);
    assert.equal(launch.utc.startsWith(launch.date), true);
    assert.equal(launch.utc.endsWith("Z"), launch.time !== null);
    assert.ok(launch.vehicle && launch.site.code && launch.site.name && launch.agency.code, launch.tag);
    assert.ok(launch.payloads.length <= Math.max(8, launch.payloadCount) && launch.payloads.length <= launch.payloadCount, launch.tag);
  }
});

test("Sputnik 1: 1957-10-04, an R-7 from Baikonur, the first launch of all", () => {
  const sputnik = launchByTag("1957 ALP");
  assert.ok(sputnik);
  assert.equal(sputnik, launches()[0]);
  assert.equal(sputnik.date, "1957-10-04");
  assert.equal(sputnik.utc, "1957-10-04T19:28:34Z");
  assert.equal(sputnik.family, "R-7");
  assert.equal(sputnik.vehicle, "Sputnik 8K71PS");
  assert.equal(sputnik.site.name, "Baikonur");
  assert.equal(sputnik.site.code, "NIIP-5");
  assert.equal(sputnik.pad, "LC1");
  assert.equal(sputnik.country?.code, "SU");
  assert.equal(sputnik.outcome, "success");
  assert.deepEqual(sputnik.payloads, ["1-y ISZ"]);
  assert.equal(sputnik.orbit?.kind, "LEO");
  assert.equal(sputnik.rocket, null, "no drawing of it here, so no link");
});

test("Apollo 11: a Saturn V from Kennedy's pad 39A on 1969-07-16, linked to this package's Saturn V", () => {
  const apollo = findLaunches({ rocket: "saturn-v" }).find((launch) => launch.flight === "Apollo 11");
  assert.ok(apollo);
  assert.equal(apollo.tag, "1969-059");
  assert.equal(apollo.vehicle, "Saturn V");
  assert.equal(apollo.rocket, "saturn-v");
  assert.equal(apollo.rocketVariant, "saturn-v");
  assert.equal(apollo.utc, "1969-07-16T13:32:00Z");
  assert.equal(apollo.site.name, "Kennedy");
  assert.equal(apollo.pad, "LC39A");
  assert.equal(apollo.country?.code, "US");
  assert.equal(apollo.outcome, "success");
  assert.ok(apollo.payloads.includes("Apollo 11 CSM") && apollo.payloads.includes("Apollo 11 LM"));
  assert.equal(apollo.orbit?.kind, "EEO");
  assert.ok((apollo.orbit?.perigeeKm ?? 0) > 150 && (apollo.orbit?.perigeeKm ?? 999) < 250, "the parking orbit's perigee");
  assert.equal(launchesByVehicle("Saturn V").length, 13);
});

test("the first Falcon 9 flew on 2010-06-04 from Cape Canaveral pad 40", () => {
  const first = findLaunches({ rocket: "falcon-9" })[0];
  assert.ok(first);
  assert.equal(first.date, "2010-06-04");
  assert.equal(first.vehicle, "Falcon 9");
  assert.equal(first.pad, "LC40");
  assert.equal(first.site.name, "Canaveral");
  assert.equal(first.agency.name, "SpaceX");
  assert.equal(first.outcome, "success");
  assert.deepEqual(first.payloads, ["Dragon Qual Unit"]);
  assert.ok(launchTotals({ rocket: "falcon-9" }).total >= 600);
});

test("the Falcon Heavy test flight, 2018-02-06, carried Starman's Roadster out of Earth orbit", () => {
  const heavy = findLaunches({ rocket: "falcon-heavy" });
  const test = heavy[0];
  assert.ok(test);
  assert.equal(test.date, "2018-02-06");
  assert.equal(test.utc, "2018-02-06T20:45:00Z");
  assert.equal(test.vehicle, "Falcon Heavy");
  assert.equal(test.rocketVariant, "falcon-heavy");
  assert.equal(test.pad, "LC39A");
  assert.deepEqual(test.payloads, ["Tesla Roadster"]);
  assert.equal(test.flight, "Tesla Roadster");
  assert.equal(test.outcome, "success");
  assert.equal(test.orbit?.kind, "EEO");
  assert.equal(heavy[1]?.flight, "Arabsat 6A");
});

test("a failure reaches no orbit, a success names one, and a partial launch says how well it went", () => {
  for (const launch of launches()) {
    if (launch.outcome === "failure") assert.equal(launch.orbit, null, launch.tag);
    if (launch.outcome === "partial") assert.ok(launch.score !== null && launch.score >= 1 && launch.score <= 99, launch.tag);
    else assert.equal(launch.score, null, launch.tag);
    if (launch.orbit) assert.ok(Object.hasOwn(ORBIT_KINDS, launch.orbit.kind), `${launch.tag} ${launch.orbit.kind}`);
  }
  const challenger = findLaunches({ rocket: "space-shuttle", outcome: "failure" });
  assert.equal(challenger.length, 1);
  assert.equal(challenger[0]?.date, "1986-01-28");
  assert.equal(launchesByOutcome("failure")[0]?.tag, "1957-F01", "Vanguard's first try is the first failure");
});

test("lookups by vehicle, site, year and outcome agree with one another and with the counts", () => {
  const total = launches().length;
  assert.deepEqual(launchTotals(), { total, success: launchesByOutcome("success").length, partial: launchesByOutcome("partial").length, failure: launchesByOutcome("failure").length });
  assert.equal(launchTotals().success + launchTotals().partial + launchTotals().failure, total);
  assert.equal(launchesByYear(1957).length, 3);
  assert.deepEqual(launchesByYear(1957).map((launch) => launch.outcome), ["success", "success", "failure"]);
  for (const by of ["vehicle", "site", "agency", "outcome", "year"] as const) assert.equal(countLaunches(by).reduce((sum, one) => sum + one.count, 0), total, by);
  assert.ok(countLaunches("country").reduce((sum, one) => sum + one.count, 0) >= total - 10, "all but a few have a country");
  assert.equal(countLaunches("year").reduce((sum, one) => sum + one.count, 0), total);
  const years = countLaunches("year").map((one) => one.key);
  assert.deepEqual(years, [...years].sort());
  assert.equal(years[0], "1957");
  const byVehicle = countLaunches("vehicle");
  assert.equal(byVehicle[0]?.key, "Falcon 9");
  assert.equal(byVehicle[0]?.count, launchesByVehicle("Falcon 9").length);
  // a site's name and its codes are the same lookup, and a name several codes share holds for all of them
  assert.equal(launchesBySite("NIIP-5").length + launchesBySite("GIK-5").length, launchesBySite("Baikonur").length);
  assert.equal(launchesBySite("baikonur").length, launchesBySite("Baikonur").length);
  assert.ok(launchesBySite("Baikonur").length > 1500);
  // every field of a filter must hold
  const narrow = findLaunches({ rocket: "falcon-9", year: 2020, outcome: "success" });
  assert.ok(narrow.length > 10 && narrow.every((launch) => launch.rocket === "falcon-9" && launch.date.startsWith("2020-") && launch.outcome === "success"));
  assert.deepEqual(findLaunches({ from: "1957-10-04", to: "1957-12-31" }).map((launch) => launch.tag), ["1957 ALP", "1957 BET", "1957-F01"]);
  assert.equal(findLaunches({ country: "USSR", year: 1957 }).length, 2);
  assert.equal(findLaunches({ family: "r-7", year: 1957 }).length, 2);
  assert.equal(findLaunches({ vehicle: "no such vehicle" }).length, 0);
  assert.equal(launchByTag("no such tag"), undefined);
});

test("every vehicle linked to a rocket is a vehicle that flew, and every rocket and variant it names is in ROCKETS", () => {
  const flown = new Set(launches().map((launch) => launch.vehicle));
  const seen = new Set<string>();
  for (const link of LAUNCH_VEHICLE_LINKS) {
    assert.ok(flown.has(link.vehicle), `${link.vehicle} has no launch`);
    assert.ok(!seen.has(link.vehicle), `${link.vehicle} is linked twice`);
    seen.add(link.vehicle);
    const rocket = ROCKETS[link.rocket];
    assert.ok(rocket, `${link.vehicle}: no rocket ${link.rocket}`);
    if (link.variant !== undefined) {
      assert.equal(link.match, "same", `${link.vehicle}: only the vehicle that is drawn names a variant`);
      assert.ok(rocket.variants.some((variant) => variant.id === link.variant), `${link.vehicle}: no variant ${link.variant} in ${link.rocket}`);
    }
  }
  for (const launch of launches()) {
    const link = LAUNCH_VEHICLE_LINKS.find((one) => one.vehicle === launch.vehicle);
    assert.equal(launch.rocket, link?.rocket ?? null, launch.tag);
    assert.equal(launch.rocketVariant, link?.variant ?? null, launch.tag);
  }
  // the vehicles the task names, and what they came to
  for (const [vehicle, rocket] of [["Falcon 9", "falcon-9"], ["Falcon Heavy", "falcon-heavy"], ["Falcon 1", "falcon-1"], ["Saturn V", "saturn-v"], ["Space Shuttle", "space-shuttle"], ["SLS Block 1", "sls"], ["New Glenn 7x2", "new-glenn"], ["Electron", "electron"], ["Soyuz-2-1A", "soyuz"], ["Soyuz-U", "soyuz"], ["Starship V3", "starship"], ["Jupiter C", "jupiter-c"]] as const) {
    assert.equal(launchesByVehicle(vehicle)[0]?.rocket, rocket, vehicle);
    assert.ok(findLaunches({ rocket }).length >= launchesByVehicle(vehicle).length, rocket);
  }
  assert.equal(launchesByVehicle("Sputnik 8K71PS")[0]?.rocket, null);
  assert.equal(countLaunches("rocket").length, new Set(LAUNCH_VEHICLE_LINKS.map((link) => link.rocket)).size);
  for (const link of LAUNCH_VEHICLE_LINKS) assert.ok(findLaunches({ rocket: link.rocket }).length > 0, link.rocket);
});

test("the source is credited as its licence asks, in NOTICE.md, with the day it was read", () => {
  const notice = readFileSync("NOTICE.md", "utf8");
  assert.equal(LAUNCH_LOG_SOURCE.licence, "CC BY 4.0");
  assert.equal(LAUNCH_LOG_SOURCE.credit, "Data from GCAT (J. McDowell, planet4589.org/space/gcat)");
  assert.ok(notice.includes(LAUNCH_LOG_SOURCE.credit));
  assert.ok(notice.includes(LAUNCH_LOG_SOURCE.url));
  assert.ok(notice.includes("Jonathan C. McDowell"));
  assert.ok(notice.includes("Licence: CC-BY-4.0"));
  assert.ok(notice.includes(`Release ${LAUNCH_LOG_SOURCE.release}`));
  assert.match(LAUNCH_LOG_SOURCE.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(notice.includes("2026-11-11"));
});

test("the log is a sub-path of its own: one data file, no import from the rest of the package, and nothing else imports it", () => {
  const imports = (file: string) => [...readFileSync(file, "utf8").matchAll(/^(?:import|export)[^"\n]*from "([^"]+)"/gm)].map((match) => match[1] as string);
  for (const file of ["src/launches/index.ts", "src/launches/links.ts", "src/launches/data.ts"]) for (const from of imports(file)) assert.match(from, /^\.\/(data|links|index)\.ts$/, `${file} imports ${from}`);
  assert.deepEqual(imports("src/launches/data.ts"), []);
  const size = statSync("src/launches/data.ts").size;
  assert.ok(size < 1.25 * 1024 * 1024, `the data file is ${size} bytes`);
  assert.ok(!readFileSync("src/index.ts", "utf8").includes("launches"), "the main entry does not load the log");
  assert.ok(!readFileSync("src/build/index.ts", "utf8").includes("launches"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { exports: Record<string, { import: string }> };
  assert.equal(pkg.exports["./launches"]?.import, "./dist/launches/index.js");
});
