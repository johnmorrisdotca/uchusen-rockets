import assert from "node:assert/strict";
import { test } from "node:test";
import { COUNTRY_CODES, countryOf, MAKER_COUNTRIES, MAKERS, PLANNED_ROCKETS, ROCKETS, SOURCES, type MakerId } from "../src/index.ts";
import { ROCKET_COUNTRIES } from "../src/data/countries.ts";

const ALL = [...Object.values(ROCKETS), ...PLANNED_ROCKETS];
const isFleet = (id: string) => ROCKETS[id]?.maker === "fleet";

test("the country codes are ISO 3166-1's 249, each a region the browser's own list names", () => {
  assert.equal(COUNTRY_CODES.length, 249);
  assert.equal(new Set(COUNTRY_CODES).size, 249);
  assert.deepEqual([...COUNTRY_CODES], [...COUNTRY_CODES].sort());
  const names = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
  for (const code of COUNTRY_CODES) assert.ok(names.of(code) && names.of(code) !== code, code);
});

test("every rocket, built or planned, has a valid code with a source, or a blank that says why", () => {
  for (const rocket of ALL) {
    const { value, source, note } = rocket.country;
    if (value === null) assert.ok(note, `${rocket.id} says why it has none`);
    else {
      assert.ok((COUNTRY_CODES as readonly string[]).includes(value), `${rocket.id}: ${value}`);
      assert.ok(source && source in SOURCES, `${rocket.id} names its source`);
    }
  }
  // a rocket that is not the package's own design is typed one by one: a new one needs its line
  for (const rocket of ALL) if (!isFleet(rocket.id)) assert.ok(Object.hasOwn(ROCKET_COUNTRIES, rocket.id), `${rocket.id} has its line in ROCKET_COUNTRIES`);
  for (const id of Object.keys(ROCKET_COUNTRIES)) assert.ok(ALL.some((rocket) => rocket.id === id), `${id} is a rocket`);
});

test("the ones with none: several countries or an international body, a source with two countries, and the SPX fleet", () => {
  const none = ALL.filter((rocket) => rocket.country.value === null && !isFleet(rocket.id)).map((rocket) => rocket.id);
  assert.deepEqual(none.sort(), ["apollo-soyuz", "ariane-6", "electron", "hubble", "iss"]);
  for (const id of Object.keys(ROCKETS).filter(isFleet)) assert.equal(ROCKETS[id]?.country.value, null, id);
  assert.equal(countryOf("falcon-9").value, "US");
  assert.equal(countryOf("soyuz").value, "RU");
  assert.equal(countryOf("tiangong").value, "CN");
  assert.equal(countryOf("starbase").value, "US");
  assert.equal(countryOf("nothing").value, null);
});

test("every maker has a code with a source, but the SPX fleet and the sites, which have none", () => {
  for (const maker of Object.keys(MAKERS) as MakerId[]) {
    const { value, source } = MAKER_COUNTRIES[maker];
    if (maker === "fleet" || maker === "sites") assert.equal(value, null, maker);
    else assert.ok(value && (COUNTRY_CODES as readonly string[]).includes(value) && source && source in SOURCES, maker);
  }
  assert.deepEqual(Object.keys(MAKER_COUNTRIES).sort(), Object.keys(MAKERS).sort());
});
