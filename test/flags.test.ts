import assert from "node:assert/strict";
import { test } from "node:test";
import { flag } from "@johnmorrisdotca/hata/load";
import { MAKER_COUNTRIES, PLANNED_ROCKETS, ROCKETS } from "../src/index.ts";
import { flagSvg, setFlagLoader } from "../src/element/flag.ts";
import { flag as demoFlag } from "../demo/flags.ts";

const ALL = [...Object.values(ROCKETS), ...PLANNED_ROCKETS];

test("hata has a flag for every code given, and the demo's few flags cover them all", async () => {
  const codes = [...new Set([...ALL.map((rocket) => rocket.country.value), ...Object.values(MAKER_COUNTRIES).map((one) => one.value)].filter((code) => code !== null))];
  assert.deepEqual(codes.sort(), ["CN", "JP", "RU", "US"]);
  for (const code of codes) {
    assert.match((await flag(code, { shape: "4:3" })) ?? "", /^<svg/, code);
    assert.match((await demoFlag(code)) ?? "", /^<svg/, `the demo has ${code}`);
  }
});

test("the element's flags come from hata by a dynamic import, and a failed import gives no flag and logs nothing", async () => {
  assert.match((await flagSvg("US")) ?? "", /^<svg/);
  assert.equal(await flagSvg("XX"), null);
  const logged: unknown[] = [];
  const error = console.error;
  const warn = console.warn;
  console.error = (...args: unknown[]) => logged.push(args);
  console.warn = (...args: unknown[]) => logged.push(args);
  try {
    setFlagLoader(() => Promise.reject(new Error("hata is not installed")));
    assert.equal(await flagSvg("US"), null);
    setFlagLoader(() => Promise.resolve({ flag: () => Promise.reject(new Error("a broken flag")) }));
    assert.equal(await flagSvg("US"), null);
  } finally {
    console.error = error;
    console.warn = warn;
    setFlagLoader(() => import("@johnmorrisdotca/hata/load"));
  }
  assert.deepEqual(logged, []);
});
