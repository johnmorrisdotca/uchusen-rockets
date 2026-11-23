// A context the test opens is not the page fixture's context. The tiles stub has to answer there too, or that page still asks the live site and CI fails when the request does.
import { expect } from "@playwright/test";
import { test } from "./base.ts";

const MANIFEST = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/manifest.json";
const TILE = "https://johnmorrisdotca.github.io/wakusei-planets/tiles/earth/0/0/0.webp";

const emptyManifest = async (page: import("@playwright/test").Page) => {
  const response = await page.goto(MANIFEST);
  expect(response?.status()).toBe(200);
  expect(await response?.json()).toEqual({ tileSize: 512, bodies: {} });
};

test("the page fixture is answered from this machine", async ({ page }) => {
  await emptyManifest(page);
  await expect(page.goto(TILE)).rejects.toThrow();
});

test("a context the test opens is answered from this machine", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await emptyManifest(page);
  await expect(page.goto(TILE)).rejects.toThrow();
  await context.close();
});

test("a page the test opens on the browser is answered from this machine", async ({ browser }) => {
  const page = await browser.newPage();
  await emptyManifest(page);
  await expect(page.goto(TILE)).rejects.toThrow();
  await page.close();
});
