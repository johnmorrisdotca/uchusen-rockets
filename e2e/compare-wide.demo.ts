// The wide comparison page: two or three craft in one 3D view, each at its true size, floating, with the Earth behind, one set of view controls, the choices in rows and in the address. A phone shows one craft.
import { expect, type Page, test } from "@playwright/test";
import { foldPicker } from "./picker.ts";
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
  test.skip(info.project.name.endsWith("phone"), "A desk's layout: a phone's width shows one craft");
  const problems = watch(page);
  await page.goto(URL);
  await foldPicker(page);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(2);
  await expect(page.locator('[data-testid="cw-add"]')).toBeVisible();
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(2);
  await expect(hero(page)).toHaveAttribute("data-beside", "on");
  // two to two and a half times the main view's 620 px
  const box = await hero(page).boundingBox();
  expect(box!.width).toBeGreaterThan(1000);
  // the Earth is a globe in the scene, so the flat picture stays hidden
  await expect(hero(page)).toHaveAttribute("world", "earth");
  await expect(page.locator('[data-testid="earth"]')).toBeHidden();
  if (is3d(browserName)) {
    await reach3d(page);
    // every craft is named in the picture, the first too
    await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelectorAll("[data-beside-label]").length ?? 0), { timeout: 30_000 }).toBe(2);
  }
  expect(problems).toEqual([]);
});

test("a third craft is added, the choices are kept in the address, and a reload brings them back", async ({ page }, info) => {
  test.skip(info.project.name.endsWith("phone"), "A desk's layout: a phone's width shows one craft");
  await page.goto(URL);
  await foldPicker(page);
  await page.locator('[data-testid="cw-add"]').click();
  await expect(craftChips(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="cw-add"]')).toBeVisible();
  await expect(page.locator('[data-testid="cw-count"]')).toContainText("3 of up to");
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(3);
  // the added craft is a fleet ship, so the browser is on that kind: come back to the real rockets, then SLS joins the row
  await page.locator('[data-testid="kind-rocket"]').click();
  await page.locator('[data-testid="maker-nasa"]').click();
  await page.locator('[data-testid="rocket-sls"]').click();
  await expect.poll(() => param(page, "with")).toContain("sls:");
  expect(param(page, "with")?.split(",").length).toBe(3);
  const kept = page.url();
  await page.goto(kept);
  await foldPicker(page);
  await expect(craftChips(page)).toHaveCount(4);
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(4);
  // remove asks first, and Cancel keeps the craft
  await page.locator('[data-testid="cw-remove-1"]').click();
  await expect(page.locator('[data-testid="cw-ask"]')).toBeVisible();
  const yesBox = await page.locator('[data-testid="cw-remove-yes"]').boundingBox();
  const noBox = await page.locator('[data-testid="cw-remove-no"]').boundingBox();
  expect(Math.abs((yesBox?.y ?? 0) - (noBox?.y ?? 0))).toBeLessThan(4);
  expect(yesBox?.height ?? 99).toBeLessThan(40);
  const readable = await page.locator('[data-testid="cw-ask"]').evaluate((node) => {
    const style = getComputedStyle(node);
    const parse = (value: string): number[] => (value.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const lum = (channel: number): number => (channel / 255) ** 2.2;
    const light = (rgb: number[]): number => 0.2126 * lum(rgb[0] ?? 0) + 0.7152 * lum(rgb[1] ?? 0) + 0.0722 * lum(rgb[2] ?? 0);
    return Math.abs(light(parse(style.color)) - light(parse(style.backgroundColor))) > 0.2;
  });
  expect(readable).toBe(true);
  await page.locator('[data-testid="cw-remove-no"]').click();
  await expect(craftChips(page)).toHaveCount(4);
  await page.locator('[data-testid="cw-remove-1"]').click();
  await page.locator('[data-testid="cw-remove-yes"]').click();
  await expect(craftChips(page)).toHaveCount(3);
  await page.locator('[data-testid="cw-remove-1"]').click();
  await page.locator('[data-testid="cw-remove-yes"]').click();
  await page.locator('[data-testid="cw-remove-1"]').click();
  await page.locator('[data-testid="cw-remove-yes"]').click();
  await expect(craftChips(page)).toHaveCount(1);
  await expect.poll(() => param(page, "with")).toBe("none");
  await page.locator('[data-testid="cw-remove-0"]').click();
  await page.locator('[data-testid="cw-remove-yes"]').click();
  await expect(craftChips(page)).toHaveCount(0);
  await expect(page.locator('[data-testid="cw-empty"]')).toBeVisible();
  await expect(hero(page)).toBeHidden();
});

test("a hostile address leaves one craft and no error", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}?rocket=__proto__&variant=<img src=x onerror=alert(1)>&with=<script>alert(1)</script>,constructor:x,toString`);
  await foldPicker(page);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(1);
  expect(await page.locator('[data-testid="cw-craft-0"]').innerText()).toContain("Block 3");
  expect(problems).toEqual([]);
});

test("the view controls tip as far as the first craft allows, and Fit holds all three craft", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "WebGL is drawn in Chromium here, at a desk's width");
  const problems = watch(page);
  await page.goto(`${URL}?rocket=iss&variant=iss&with=saturn-v:saturn-v,hubble:hubble`);
  await foldPicker(page);
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
  await foldPicker(page);
  await expect(bar(page)).toHaveAttribute("tilt-max", "45");
  expect(problems).toEqual([]);
});

test("on a phone one craft is on the stage, the others stay in the line, and the page does not scroll sideways", async ({ page }, info) => {
  test.skip(!info.project.name.endsWith("phone"), "A phone's width");
  await page.goto(`${URL}?with=saturn-v:saturn-v,iss:iss`);
  await foldPicker(page);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
  await expect(craftChips(page)).toHaveCount(3);
  await expect(page.locator('[data-testid="cw-add"]')).toBeVisible();
  await expect(hero(page)).toHaveAttribute("data-beside", "off");
  await expect(page.locator('[data-testid="cw-table"] tbody tr')).toHaveCount(3);
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
  await foldPicker(page);
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
  await foldPicker(page);
  await reach3d(page);
  await expect.poll(async () => (await captions(page))?.names.length ?? 0, { timeout: 30_000 }).toBe(1);
  const shot = (await captions(page)) as Shot;
  expect(inside(shot.names[0], shot.frame)).toBe(true);
  expect(shot.plinth).toBe("off");
});

test("any craft on the main page can be taken to the wide one", async ({ page }, info) => {
  test.skip(info.project.name === "chromium-phone", "A desk's layout");
  await page.goto("/uchusen-rockets/?rocket=saturn-v&variant=saturn-v");
  await foldPicker(page);
  const link = page.locator('[data-testid="compare-open"]');
  await expect(link).toHaveAttribute("href", /compare\.html\?rocket=saturn-v&variant=saturn-v/);
  await link.click();
  await expect(page).toHaveURL(/compare\.html/);
  await expect(page.locator('[data-testid="cw-craft-0"]')).toContainText("Saturn V");
});

test("six craft stay on the page at a desk's width", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "A desk's width");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  await foldPicker(page);
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="rocket-sls"]').click();
  await expect(craftChips(page)).toHaveCount(6);
  await expect(page.locator('[data-testid="cw-count"]')).toContainText("6 of up to");
  await expect(page.locator('[data-testid="cw-craft-0"] .craft-pic svg')).toHaveCount(1);
  const frame = await page.locator('[data-testid="cw-craft"]').evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  });
  const boxes = await craftChips(page).evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(frame.left - 1);
    expect(box.right).toBeLessThanOrEqual(frame.right + 1);
    expect(box.bottom).toBeLessThanOrEqual(frame.bottom + 1);
  }
  await expect(page.locator(".cw-craft-list")).toHaveCount(0);
  await expect.poll(() => hero(page).evaluate((node) => node.shadowRoot?.querySelectorAll("[data-beside-label]").length ?? 0), { timeout: 30_000 }).toBe(6);
  const off = await hero(page).evaluate((node) => [...(node.shadowRoot?.querySelectorAll("[data-beside-label]") ?? [])].some((el) => (el.textContent ?? "").includes("off screen")));
  expect(off).toBe(false);
  const stage = await page.locator(".cw-stage").boundingBox();
  expect(stage?.y ?? 999).toBeLessThan(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("on a phone the craft line is one row that scrolls", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-phone", "A phone's width");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await foldPicker(page);
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="rocket-sls"]').click();
  await expect(craftChips(page)).toHaveCount(6);
  const row = page.locator('[data-testid="cw-craft"]');
  const scrolling = await row.evaluate((node) => {
    const parent = node.parentElement;
    const mask = parent ? getComputedStyle(parent).maskImage : "none";
    const view = node.getBoundingClientRect();
    const seen = [...node.children].filter((child) => {
      const box = child.getBoundingClientRect();
      return Math.min(box.right, view.right) - Math.max(box.left, view.left) >= 40;
    }).length;
    return { over: node.scrollWidth > node.clientWidth + 1, mask, wrap: getComputedStyle(node).flexWrap, seen };
  });
  expect(scrolling.wrap).toBe("nowrap");
  expect(scrolling.over).toBe(true);
  expect(scrolling.mask).not.toBe("none");
  expect(scrolling.seen).toBeGreaterThanOrEqual(2);
});

test("past the device's budget, adding says why", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-desk", "The budget message");
  await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 0.25 }));
  await page.goto(URL);
  await foldPicker(page);
  await page.locator('[data-testid="cw-add"]').click();
  await page.locator('[data-testid="cw-add"]').click();
  await expect(craftChips(page)).toHaveCount(4);
  await expect(page.locator('[data-testid="cw-add"]')).toHaveCount(0);
  await page.locator('[data-testid="kind-rocket"]').click();
  await page.locator('[data-testid="maker-nasa"]').click();
  await page.locator('[data-testid="rocket-sls"]').click();
  await expect(page.locator('[data-testid="cw-budget"]')).toContainText("4");
  await expect(craftChips(page)).toHaveCount(4);
});

test("a craft under about 12 px is marked with its name and size, and its chip opens a magnifier", async ({ page, browserName }, info) => {
  test.skip(!is3d(browserName) || info.project.name !== "chromium-desk", "WebGL is drawn in Chromium here, at a desk's width");
  await page.goto(`${URL}?rocket=starship&variant=v3&with=fleet-drone:repair-drone`);
  await foldPicker(page);
  await reach3d(page);
  await page.locator('[data-testid="cam-all"]').click();
  const mark = hero(page).locator("[data-craft-mark]");
  await expect(mark).toBeVisible({ timeout: 30_000 });
  await expect(mark).toContainText("1 m");
  await expect(hero(page).locator("[data-beside-label]")).toHaveCount(2);
  await expect(hero(page).locator("[data-beside-label]").filter({ hasText: "off screen" })).toHaveCount(0);
  await page.locator('[data-testid="cw-craft-1"]').hover();
  await page.locator('[data-testid="cw-glass-1"]').click();
  await expect(page.locator('[data-testid="cw-glass"]')).toBeVisible();
  await expect(page.locator('[data-testid="cw-glass"]')).toContainText("1 m");
});
