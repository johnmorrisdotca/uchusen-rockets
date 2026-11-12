// The comparison page and the picker, cleaned: the Starship versions band reads (numbers apart, labels in their own cells, the unit inside the picture), a phone's frame scrolls the drawing by itself and the page never scrolls sideways, the kit's sample modules are not offered as craft, a fleet ship's panel says Length, Beam and Height and "SPX" plainly, no part chip shows a raw id, and the viewer's panel is compact enough for a wide font.
import { expect, type Page, test } from "@playwright/test";
import { FLEET_KIT_ROCKETS } from "../src/data/fleet.ts";
import { ROCKETS } from "../src/rockets.ts";

const URL = "/uchusen-rockets/";
const lineup = (page: Page) => page.locator('[data-testid="lineup"]');
const openCompare = async (page: Page) => {
  await page.goto(URL);
  await page.locator('[data-testid="more-compare"]').click();
  await lineup(page).scrollIntoViewIfNeeded();
  await expect(lineup(page)).toHaveAttribute("data-count", /^[1-9]/);
};

test("the Starship versions band: the numbers on the ruler are apart, each label has its own cell, and the unit is inside the picture", async ({ page }) => {
  await openCompare(page);
  await page.locator('[data-testid="compare-fleet-ship-01:hanabusa"]').click();
  const boxes = await lineup(page).evaluate((node) => {
    const root = node.shadowRoot as ShadowRoot;
    const svg = root.querySelector("svg") as SVGSVGElement;
    const rect = (t: Element) => t.getBoundingClientRect().toJSON() as DOMRect;
    const texts = [...root.querySelectorAll("text")];
    return {
      width: svg.getBoundingClientRect().width,
      left: svg.getBoundingClientRect().left,
      numbers: texts.filter((t) => t.getAttribute("text-anchor") === "end" && /^\d+$/.test(t.textContent ?? "")).map(rect),
      labels: texts.filter((t) => t.getAttribute("text-anchor") === "middle" && t.getAttribute("font-size") === "11").map((t) => ({ ...rect(t), words: t.textContent })),
      unit: texts.filter((t) => t.textContent === "m").map(rect),
      all: texts.map(rect),
    };
  });
  const sorted = [...boxes.numbers].sort((a, b) => a.top - b.top);
  for (let i = 1; i < sorted.length; i++) expect(sorted[i].top, "ruler numbers do not overlap").toBeGreaterThanOrEqual(sorted[i - 1].bottom - 0.5);
  const labels = [...boxes.labels].sort((a, b) => a.left - b.left);
  expect(labels.length).toBeGreaterThanOrEqual(3);
  for (let i = 1; i < labels.length; i++) expect(labels[i].left, `${labels[i - 1].words} / ${labels[i].words}`).toBeGreaterThanOrEqual(labels[i - 1].right - 0.5);
  for (const box of boxes.all) expect(box.right, "every word is inside the picture").toBeLessThanOrEqual(boxes.left + boxes.width + 0.5);
});

test("on a phone the drawing never makes the page scroll sideways, and its frame scrolls it by itself when it is wider", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-phone", "A phone's width");
  await openCompare(page);
  const frame = page.locator('[data-testid="compare-view"]');
  const read = () => page.evaluate(() => ({ page: document.documentElement.scrollWidth - innerWidth, frame: (document.querySelector('[data-testid="compare-view"]') as HTMLElement).scrollWidth - (document.querySelector('[data-testid="compare-view"]') as HTMLElement).clientWidth }));
  const now = await read();
  expect(now.page).toBeLessThanOrEqual(0);
  if (now.frame > 0) {
    expect(await frame.evaluate((node) => getComputedStyle(node).overflowX)).toBe("auto");
    await frame.evaluate((node) => node.scrollTo({ left: node.scrollWidth }));
    expect(await frame.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  }
  expect((await read()).page).toBeLessThanOrEqual(0);
});

test("the kit's sample modules are not craft to compare, and every part chip has a name", async ({ page }) => {
  await openCompare(page);
  for (const id of Object.keys(FLEET_KIT_ROCKETS)) for (const variant of ROCKETS[id].variants) await expect(page.locator(`[data-testid="compare-${id}:${variant.id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-testid="compare-picks"], #compare-picks')).not.toContainText("Fleet kit");
  for (const rocket of ["fleet-02", "fleet-ship-ariake", "fleet-ship-03", "apollo-soyuz"]) {
    await page.goto(`${URL}?rocket=${rocket}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#shows button, #shows option").nth(1), rocket).toBeAttached({ timeout: 60_000 });
    const chips = await page.locator("#shows button, #shows option").allTextContents();
    expect(chips.length, rocket).toBeGreaterThan(1);
    for (const text of chips) expect(text, `${rocket}: "${text}"`).not.toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/);
  }
});

test("a fleet ship's panel says Length, Beam and Height, and its maker plainly as SPX", async ({ page }) => {
  for (const rocket of ["fleet-ship-03", "fleet-02"]) {
    await page.goto(`${URL}?rocket=${rocket}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('#facts tr[data-row="Made by"] td'), rocket).toBeAttached({ timeout: 60_000 });
    const heads = await page.locator("#facts th").allTextContents();
    expect(heads.map((text) => text.trim().toLowerCase()), rocket).toEqual(expect.arrayContaining(["length", "beam", "height (stowed)"]));
    expect(heads.map((text) => text.trim().toLowerCase())).not.toContain("whole height");
    expect(heads.map((text) => text.trim().toLowerCase())).not.toContain("diameter");
    const made = page.locator('#facts tr[data-row="Made by"] td');
    // SPX, and for Kaminari its own note; never a source's name or a date it was read
    expect((await made.innerText()).trim()).toMatch(/^SPX(\n|$)/);
    expect(await made.innerText()).not.toMatch(/read|20\d\d/);
    await expect(page.locator("#facts")).not.toContainText(/SPX, read/);
  }
  // a real rocket keeps its whole height and its diameter, and its source with the date it was read
  await page.goto(`${URL}?rocket=saturn-v`);
  const heads = await page.locator("#facts th").allTextContents();
  expect(heads.map((text) => text.trim().toLowerCase())).toEqual(expect.arrayContaining(["whole height", "diameter"]));
  await expect(page.locator("#facts")).toContainText(/Wikipedia, read/);
});

// A hosted runner's font is wider than a Mac's: the same page set in a wide one, to hold the stage inside the window without raising the limit.
test("with a wide font the viewer's panel still keeps the stage inside 1010 px at 1440 by 900", async ({ browser }, info) => {
  test.skip(info.project.name !== "chromium-desk", "Once");
  test.setTimeout(240_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route(/\.(css|js)(\?.*)?$/, async (route) => {
    try {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replaceAll("system-ui", "Verdana") });
    } catch {
      // a goto starts the next rocket while the last one's files are still arriving
      await route.abort();
    }
  });
  let most = 0;
  let where = "";
  for (const rocket of ["fleet-ship-03", "fleet-ship-ariake", "fleet-02", "starship", "saturn-v"]) {
    await page.goto(`${URL}?rocket=${rocket}&background=earth`);
    // a ship's panel is part of what is measured
    if (rocket.startsWith("fleet-")) await expect(page.locator('[data-testid="hero"]')).toHaveAttribute("data-panel", "on", { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const reading = await page.evaluate(() => ({ stage: (document.querySelector(".stage-box") as HTMLElement).getBoundingClientRect().bottom + scrollY, sideways: document.documentElement.scrollWidth - innerWidth, font: getComputedStyle(document.body).fontFamily }));
    expect(reading.font).toContain("Verdana");
    expect(reading.sideways).toBeLessThanOrEqual(0);
    if (reading.stage > most) [most, where] = [reading.stage, rocket];
  }
  console.log(`wide font: the stage ends at ${most} px (${where})`);
  expect(most).toBeLessThanOrEqual(1010);
  await context.close();
});
