import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPANIES, COMPANY_KINDS, companyOf } from "../src/model/fleet/company.ts";
import { MASS } from "../src/model/fleet/ship-01/specs.ts";
import { SPEC } from "../src/model/fleet/ship-02/specs.ts";
import { PEOPLE } from "../src/model/fleet/kaminari-concepts/specs.ts";

test("every shipped ship has each room a crew needs, on a real deck, for its own crew", () => {
  assert.deepEqual(COMPANIES.map((company) => company.ship), ["miyamoto", "ariake", "hanabusa", "kaminari", "emiake", "romaryu"]);
  assert.equal(companyOf("hanabusa").crew, MASS.crew);
  assert.equal(companyOf("kaminari").crew, SPEC.crewNominal);
  assert.equal(companyOf("emiake").crew, PEOPLE.crew);
  assert.equal(companyOf("romaryu").crew, PEOPLE.crew);
  assert.equal(companyOf("miyamoto").crew, companyOf("ariake").crew);
  assert.ok(companyOf("miyamoto").crew > 0);
  for (const company of COMPANIES) {
    const kinds = new Set(company.spaces.map((space) => space.kind));
    for (const kind of COMPANY_KINDS) assert.ok(kinds.has(kind), `${company.ship} has no ${kind}`);
    for (const space of company.spaces) {
      assert.equal(space.serves, company.crew);
      assert.ok(Number.isFinite(space.at[1]), space.name);
      assert.ok(space.deck.length > 0);
    }
  }
});
