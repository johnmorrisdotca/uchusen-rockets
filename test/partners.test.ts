import assert from "node:assert/strict";
import { test } from "node:test";
import { FLAG_CODES } from "@johnmorrisdotca/hata";
import { flag } from "@johnmorrisdotca/hata/load";
import { COUNTRY_CODES, countryOf, ESA_MEMBER_STATES, FORMER_COUNTRY_CODES, partnersOf, PLANNED_ROCKETS, ROCKET_PARTNERS, ROCKETS, SOURCES } from "../src/index.ts";
import { ROCKET_COUNTRIES } from "../src/data/countries.ts";

const ALL = [...Object.values(ROCKETS), ...PLANNED_ROCKETS];
const isFleet = (id: string) => ROCKETS[id]?.maker === "fleet";
const codes = (id: string) => partnersOf(id).map((partner) => partner.country);

test("the former countries are the ones hata keeps a flag for, by its own codes", () => {
  const hata = FLAG_CODES.filter((code) => /^[A-Z]{3,4}$/.test(code));
  assert.deepEqual([...FORMER_COUNTRY_CODES].sort(), [...hata].sort());
  for (const code of FORMER_COUNTRY_CODES) assert.ok(!(COUNTRY_CODES as readonly string[]).includes(code), code);
});

test("every partner has a valid code, a source, and its contribution in English and Japanese", () => {
  const valid = new Set<string>([...COUNTRY_CODES, ...FORMER_COUNTRY_CODES]);
  for (const [id, partners] of Object.entries(ROCKET_PARTNERS)) {
    assert.ok(partners.length > 0, id);
    for (const partner of partners) {
      const where = `${id} ${partner.country}`;
      assert.ok(valid.has(partner.country), where);
      assert.ok(partner.source in SOURCES, `${where} names a source in SOURCES`);
      assert.ok(partner.contribution.en.trim().length > 0, `${where} has English`);
      assert.match(partner.contribution.ja, /[぀-ヿ一-鿿]/, `${where} has Japanese`);
      assert.doesNotMatch(partner.contribution.en, /[぀-ヿ一-鿿]/, `${where} English is English`);
      if (partner.via) {
        assert.equal(partner.via.group, "esa");
        assert.ok(partner.via.source in SOURCES, `${where} names the page that lists it`);
      }
    }
  }
});

test("a country is listed once for a rocket", () => {
  for (const id of Object.keys(ROCKET_PARTNERS)) assert.equal(new Set(codes(id)).size, codes(id).length, id);
});

test("every rocket that is not the SPX fleet's has partners, and its country of origin is one of them", () => {
  for (const rocket of ALL) {
    if (isFleet(rocket.id)) {
      assert.deepEqual(partnersOf(rocket.id), [], rocket.id);
      continue;
    }
    assert.ok(partnersOf(rocket.id).length > 0, `${rocket.id} has partners`);
    const origin = countryOf(rocket.id).value;
    if (origin !== null) assert.ok(codes(rocket.id).includes(origin), `${rocket.id} has its own country, ${origin}`);
  }
  for (const id of Object.keys(ROCKET_PARTNERS)) assert.ok(Object.hasOwn(ROCKET_COUNTRIES, id), `${id} is a rocket with a line in ROCKET_COUNTRIES`);
  assert.deepEqual(partnersOf("nothing"), []);
  assert.deepEqual(partnersOf("toString"), []);
});

test("the crafts that have no country of their own have the countries their sources name", () => {
  assert.deepEqual(codes("apollo-soyuz"), ["US", "SUHH"]);
  assert.deepEqual(codes("sputnik-1"), ["SUHH"]);
  assert.deepEqual(codes("electron"), ["NZ", "US"]);
  assert.deepEqual(codes("iss").slice(0, 4), ["US", "RU", "JP", "CA"]);
  assert.equal(codes("iss").length, 15);
  assert.ok(codes("jwst").includes("CA") && codes("jwst").includes("US"));
  assert.ok(codes("hubble").includes("US"));
  assert.deepEqual(codes("ariane-6").sort(), ["AT", "BE", "CH", "CZ", "DE", "ES", "FR", "IE", "IT", "NL", "NO", "RO", "SE"]);
});

test("the Space Shuttle has Canada for its arm, and the ten countries of Spacelab", () => {
  const shuttle = partnersOf("space-shuttle");
  assert.deepEqual(codes("space-shuttle").slice(0, 2), ["US", "CA"]);
  assert.match(shuttle[1]?.contribution.en ?? "", /Canadarm/);
  const spacelab = shuttle.filter((partner) => partner.via);
  assert.equal(spacelab.length, 10);
  assert.ok(spacelab.every((partner) => partner.via?.named));
});

test("a country shown through ESA says whether its page names it; ESA's own list is the 23 it gives, each a country code", () => {
  assert.equal(ESA_MEMBER_STATES.value?.length, 23);
  assert.equal(ESA_MEMBER_STATES.source, "esa-member-states");
  for (const code of ESA_MEMBER_STATES.value ?? []) assert.ok((COUNTRY_CODES as readonly string[]).includes(code), code);
  assert.ok(!ESA_MEMBER_STATES.value?.includes("CA"));
  for (const id of ["hubble", "jwst", "sls", "cassini"]) {
    const through = partnersOf(id).filter((partner) => partner.via);
    // Italy is Cassini's own partner through ASI, and is listed once
    const expected: readonly string[] = (ESA_MEMBER_STATES.value ?? []).filter((code) => !(id === "cassini" && code === "IT"));
    assert.deepEqual(through.map((partner) => partner.country), expected, id);
    assert.ok(through.every((partner) => partner.via?.named === false && partner.via.source === "esa-member-states" && partner.note), id);
  }
  // where a craft's own page names the states, they are named
  for (const id of ["iss", "ariane-6", "space-shuttle"]) assert.ok(partnersOf(id).some((partner) => partner.via?.named), id);
});

test("every country of an ESA group has the same line, in both languages", () => {
  for (const id of ["hubble", "jwst", "sls", "cassini", "iss", "space-shuttle", "ariane-6"]) {
    const through = partnersOf(id).filter((partner) => partner.via);
    assert.equal(new Set(through.map((partner) => partner.contribution.en)).size, 1, id);
    assert.equal(new Set(through.map((partner) => partner.contribution.ja)).size, 1, id);
  }
});

test("hata has a flag for every code a partner carries, the Soviet Union's included", async () => {
  const wanted = new Set(Object.values(ROCKET_PARTNERS).flatMap((partners) => partners.map((partner) => partner.country)));
  assert.ok(wanted.has("SUHH") && wanted.has("CA") && wanted.has("NZ"));
  for (const code of wanted) assert.match((await flag(code, { shape: "4:3" })) ?? "", /^<svg/, code);
});
