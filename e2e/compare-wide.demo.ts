// The wide comparison page: two or three craft in one 3D view, each at its true size, floating, with the Earth behind, one set of view controls, the choices in rows and in the address. A phone shows one craft.
import { expect, type Page, test } from "@playwright/test";
import { build } from "../src/build/index.ts";

const URL = "/uchusen-rockets/compare.html";
const is3d = (browserName: string) => browserName === "chromium";
const hero = (page: Page) => page.locator('[data-testid="hero"]');
const bar = (page: Page) => page.locator('[data-testid="view-bar"]');
const craftChips = (page: Page) => page.locator('[data-testid^="cw-craft-"]');
const param = (page: Page, name: string) => new globalThis.URL(page.url()).searchParams.get(name);
type Bar = HTMLElement & { set(next: object): void; fit(): void; pause(): void; state: { tilt: number } };
const watch = (page: Page) => {
  const problems: string[] = [];
  page.on("console", (message) => message.type() === "error" && problems.push(message.text()));
  page.on("pageerror", (error) => problems.push(error.message));
  return problems;
};
const reach3d = (page: Page) => expect(hero(page)).toHaveAttribute("data-state", "3d", { timeout: 90_000 });

test("the page opens with two craft on one ground, its stage is wide, and the table names both", async ({ page, browserName }, info) => {
  test.skip(info.project.name === "chromium-phone", "A desk's layout");
  const problems = watch(page);
  await page.goto(URL);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(2);
  await expect(page.locator('[data-testid="cw-add"]')).toBeVisible();
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(2);
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  // two to two and a half times the main view's 620 px
  const box = await hero(page).boundingBox();
  expect(box!.width).toBeGreaterThan(1000);
  // the Earth is behind it by default
  await expect(page.locator('[data-testid="earth"]')).toBeVisible();
  if (is3d(browserName)) {
    await reach3d(page);
    // every craft is named in the picture, the first too
    await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelectorAll("[data-beside-label]").length ?? 0), { timeout: 30_000 }).toBe(2);
  }
  expect(problems).toEqual([]);
});

test("a third craft is added, the choices are kept in the address, and a reload brings them back", async ({ page }, info) => {
  test.skip(info.project.name === "chromium-phone", "A desk's layout");
  await page.goto(URL);
  await page.locator('[data-testid="cw-add"]').click();
  await expect(craftChips(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="cw-add"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(3);
  // the new craft is the one the rows now choose: take its maker's other rocket
  await page.locator('[data-testid="maker-nasa"]').click();
  await page.locator('[data-testid="rocket-sls"]').click();
  await expect.poll(() => param(page, "with")).toContain("sls:");
  expect(param(page, "with")?.split(",").length).toBe(2);
  const kept = page.url();
  await page.goto(kept);
  await expect(craftChips(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(3);
  // remove the middle one
  await page.locator('[data-testid="cw-remove-1"]').click();
  await expect(craftChips(page)).toHaveCount(2);
  await expect.poll(() => param(page, "with")?.split(",").length).toBe(1);
  await page.locator('[data-testid="cw-remove-1"]').click();
  await expect(craftChips(page)).toHaveCount(1);
  await expect.poll(() => param(page, "with")).toBe("none");
  await expect(page.locator('[data-testid="cw-remove-0"]')).toHaveCount(0);
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await page.reload();
  await expect(craftChips(page)).toHaveCount(1);
});

test("a hostile address leaves one craft and no error", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}?rocket=__proto__&variant=<img src=x onerror=alert(1)>&with=<script>alert(1)</script>,constructor:x,toString`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(1);
  expect(await page.locator('[data-testid="cw-craft-0"]').innerText()).toContain("Block 3");
  expect(problems).toEqual([]);
});

test("the view controls tip as far as the first craft allows, and Fit holds all three craft", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "WebGL is drawn in Chromium here, at a desk's width");
  const problems = watch(page);
  await page.goto(`${URL}?rocket=iss&variant=iss&with=saturn-v:saturn-v,hubble:hubble`);
  await bar(page).evaluate((node) => (node as Bar).pause());
  await expect(bar(page)).toHaveAttribute("tilt-max", "90");
  await reach3d(page);
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  await bar(page).evaluate((node) => (node as Bar).set({ zoom: 2, panX: 80, panY: -50, tilt: 10 }));
  await bar(page).evaluate((node) => (node as Bar).fit());
  const { min, max } = build({ rocket: "iss", variant: "iss" }, { beside: [{ rocket: "saturn-v", variant: "saturn-v" }, { rocket: "hubble", variant: "hubble" }] }).boundsOf("together");
  const corners = [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z])));
  await expect
    .poll(() => hero(page).evaluate((node, points) => points.map((point) => (node as HTMLElement & { screenPoint(p: number[]): { visible: boolean } | null }).screenPoint(point)?.visible ?? false), corners), { timeout: 30_000 })
    .toEqual(corners.map(() => true));
  // a rocket first holds the tip to 45
  await page.goto(`${URL}?rocket=saturn-v&variant=saturn-v&with=iss:iss`);
  await expect(bar(page)).toHaveAttribute("tilt-max", "45");
  expect(problems).toEqual([]);
});

test("on a phone one craft is shown, with no way to add another, and the page does not scroll sideways", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-phone", "A phone's width");
  await page.goto(`${URL}?with=saturn-v:saturn-v,iss:iss`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(1);
  await expect(page.locator('[data-testid="cw-add"]')).toHaveCount(0);
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  // the address keeps what was asked for, so a wider screen shows it
  expect(param(page, "with")).toContain("iss:iss");
});

type Shot = {
  frame: { left: number; top: number; right: number; bottom: number };
  names: { text: string; left: number; top: number; right: number; bottom: number; cx: number }[];
  notes: { text: string; left: number; top: number; right: number; bottom: number }[];
  plinth: string;
};
const captions = (page: Page) =>
  hero(page).evaluate((node) => {
    const canvas = node.shadowRoot?.querySelector("canvas");
    if (!canvas) return null;
    const frame = canvas.getBoundingClientRect();
    const read = (selector: string) =>
      [...(node.shadowRoot?.querySelectorAll(selector) ?? [])].map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent ?? "", left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: (r.left + r.right) / 2 };
      });
    return { frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom }, names: read("[data-beside-label]"), notes: read("[data-scale-note]"), plinth: (canvas as HTMLCanvasElement).dataset.plinth ?? "" };
  });
const inside = (box: { left: number; top: number; right: number; bottom: number }, frame: Shot["frame"]) =>
  box.left >= frame.left - 1 && box.top >= frame.top - 1 && box.right <= frame.right + 1 && box.bottom <= frame.bottom + 1;
const apart = (a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) =>
  a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1;

test("each craft is named at the top right, inside the picture, and nothing stands on a plinth", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "WebGL is drawn in Chromium here, at a desk's width");
  await page.goto(URL);
  await page.locator('[data-testid="cw-add"]').click();
  await expect(craftChips(page)).toHaveCount(3);
  await reach3d(page);
  await expect.poll(async () => (await captions(page))?.names.length ?? 0, { timeout: 30_000 }).toBe(3);
  const shot = (await captions(page)) as Shot;
  for (const box of shot.names) expect(inside(box, shot.frame)).toBe(true);
  for (let i = 0; i < shot.names.length; i++) for (let j = i + 1; j < shot.names.length; j++) expect(apart(shot.names[i], shot.names[j])).toBe(true);
  for (const box of shot.names) expect(shot.frame.right - box.right).toBeLessThan(24);
  expect(shot.notes).toEqual([]);
  expect(shot.plinth).toBe("off");
});

test("on a phone the one craft's name stays inside the picture", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-phone", "WebGL is drawn in Chromium here, at a phone's width");
  await page.goto(URL);
  await reach3d(page);
  await expect.poll(async () => (await captions(page))?.names.length ?? 0, { timeout: 30_000 }).toBe(1);
  const shot = (await captions(page)) as Shot;
  expect(inside(shot.names[0], shot.frame)).toBe(true);
  expect(shot.plinth).toBe("off");
});

test("any craft on the main page can be taken to the wide one", async ({ page }, info) => {
  test.skip(info.project.name === "chromium-phone", "A desk's layout");
  await page.goto("/uchusen-rockets/?rocket=saturn-v&variant=saturn-v");
  const link = page.locator('[data-testid="compare-open"]');
  await expect(link).toHaveAttribute("href", /compare\.html\?rocket=saturn-v&variant=saturn-v/);
  await link.click();
  await expect(page).toHaveURL(/compare\.html/);
  await expect(page.locator('[data-testid="cw-craft-0"]')).toContainText("Saturn V");
});
