// A context the test opens is not the page fixture's context. The tiles stub has to answer there too, or that page still asks the live site and CI fails when the request does.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
import { test } from "./base.ts";

const MANIFEST = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/manifest.json";
const TILE = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/mars/1/0/0.webp";
const PUBLISHED = JSON.parse(await readFile(join(fileURLToPath(new URL(".", import.meta.url)), "tiles-manifest.json"), "utf8")) as unknown;

const answered = async (page: import("@playwright/test").Page) => {
  const manifest = await page.goto(MANIFEST);
  expect(manifest?.status()).toBe(200);
  expect(await manifest?.json()).toEqual(PUBLISHED);
  const tile = await page.goto(TILE);
  expect(tile?.status()).toBe(200);
  expect(tile?.headers()["content-type"]).toBe("image/webp");
};

test("the page fixture is answered from this machine", async ({ page }) => {
  await answered(page);
});

test("a context the test opens is answered from this machine", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await answered(page);
  await context.close();
});

test("a page the test opens on the browser is answered from this machine", async ({ browser }) => {
  const page = await browser.newPage();
  await answered(page);
  await page.close();
});
