// The fleet kit's pictures, from the real 3D model in a real browser (software GL): every group of modules, a cutaway and the sample ship are drawn painted and in the line look, each is far from blank, and their
// detail is at least Starship Block 3's, measured as the share of the picture's own pixels that are edges. The line look is as dense as the painted one. Pictures only: the freeze test holds the graphics memory.
import { expect, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/embed.html";
const hero = (page: Page) => page.locator("uchusen-rocket#rocket");

test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "chromium-desk", "WebGL is drawn in the desk Chromium here");
});

/** Draws one choice and reads its picture: how much of the frame is the object, and how many of the object's pixels are edges. */
async function look(page: Page, query: Record<string, string>) {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`${URL}?${new URLSearchParams({ spin: "off", ...query })}`);
  await page.evaluate(() => {
    document.documentElement.style.background = "#101418";
    document.body.style.cssText = "margin:0;background:#101418";
    (document.getElementById("rocket") as HTMLElement).style.cssText = "display:block;width:900px;height:900px;--uchusen-aspect:900 / 900";
  });
  await hero(page).and(page.locator('[data-state="3d"]')).waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => (document.getElementById("rocket") as HTMLElement).dataset.painted !== "loading", undefined, { timeout: 120_000 });
  await page.waitForTimeout(1500);
  const png = await hero(page).screenshot();
  return page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    context.drawImage(bitmap, 0, 0);
    const { data: px, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    const luma = (i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    // the background is the page's own colour: the corners
    const bg = [px[0], px[1], px[2]];
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) mask[i] = Math.abs(px[i * 4] - bg[0]) + Math.abs(px[i * 4 + 1] - bg[1]) + Math.abs(px[i * 4 + 2] - bg[2]) < 24 ? 0 : 1;
    let object = 0;
    let inside = 0;
    let edges = 0;
    for (let y = 1; y < height - 1; y++)
      for (let x = 1; x < width - 1; x++) {
        const at = y * width + x;
        if (!mask[at]) continue;
        object++;
        // only the inside of the shape counts: a pixel whose eight neighbours are the object too, so the outline of a slim shape is not mistaken for detail
        if (!(mask[at - 1] && mask[at + 1] && mask[at - width] && mask[at + width] && mask[at - width - 1] && mask[at - width + 1] && mask[at + width - 1] && mask[at + width + 1])) continue;
        inside++;
        const i = at * 4;
        const gx = luma(i + 4) - luma(i - 4);
        const gy = luma(i + width * 4) - luma(i - width * 4);
        if (Math.abs(gx) + Math.abs(gy) > 28) edges++;
      }
    return { object: object / (width * height), edges: inside ? edges / inside : 0 };
  }, [...png]);
}

test("the fleet's pictures are not blank, and their detail is at least Starship Block 3's, painted and in the line look", async ({ page }) => {
  test.setTimeout(900_000);
  const starship = await look(page, { rocket: "starship", variant: "v3", look: "painted", view: "side" });
  console.log(`Starship Block 3: object ${(starship.object * 100).toFixed(1)}%, edges ${(starship.edges * 100).toFixed(1)}%`);
  expect(starship.object).toBeGreaterThan(0.02);
  const choices: [string, string, string][] = [
    ["fleet-engines", "engine-fusion-7", "side"],
    ["fleet-tanks", "tank-cryo-12-cutaway", "three-quarter"],
    ["fleet-cargo", "cargo-bay-4", "side"],
    ["fleet-habitats", "habitat-ring-16", "three-quarter"],
    ["fleet-habitats", "habitat-drum-large-cutaway", "three-quarter"],
    ["fleet-systems", "mast-sensor-40", "side"],
    ["fleet-systems", "reactor-fusion-cutaway", "three-quarter"],
    ["fleet-structure", "shield-forward", "side"],
    ["fleet-insets", "reactor-core", "three-quarter"],
    ["fleet-samples", "hauler", "side"],
  ];
  for (const [rocket, variant, view] of choices) {
    const painted = await look(page, { rocket, variant, look: "painted", view });
    const lines = await look(page, { rocket, variant, look: "thick", view });
    console.log(`${variant}: painted object ${(painted.object * 100).toFixed(1)}%, edges ${(painted.edges * 100).toFixed(1)}%; lines edges ${(lines.edges * 100).toFixed(1)}%`);
    expect(painted.object, `${variant} is drawn`).toBeGreaterThan(0.02);
    expect(painted.edges, `${variant}: as much detail as Starship Block 3`).toBeGreaterThanOrEqual(starship.edges);
    expect(lines.edges, `${variant}: the line look is as dense as the painted one`).toBeGreaterThanOrEqual(painted.edges * 0.8);
  }
});

test("a label follows its part: the element says when it draws and where a point of the model is on the picture, and the point moves as the model turns", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`${URL}?${new URLSearchParams({ spin: "off", rocket: "fleet-tanks", variant: "tank-cryo-12", look: "painted", view: "three-quarter" })}`);
  await hero(page).and(page.locator('[data-state="3d"]')).waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1500);
  const where = (point: [number, number, number]) => hero(page).evaluate((node, p) => (node as HTMLElement & { screenPoint(q: number[]): { x: number; y: number; visible: boolean } | null }).screenPoint(p), point);
  // the middle of the tank, on its axis: in the picture
  const middle = await where([0, 6, 0]);
  expect(middle?.visible).toBe(true);
  expect(middle?.x).toBeGreaterThan(200);
  expect(middle?.x).toBeLessThan(700);
  // a point on the hull's edge moves across the picture when the model turns, and the axis's middle stays where it was
  const edge = await where([6, 6, 0]);
  const draws = await hero(page).evaluate((node) => {
    (window as unknown as { __draws: number }).__draws = 0;
    node.addEventListener("uchusen-draw", () => ((window as unknown as { __draws: number }).__draws += 1));
    (node as HTMLElement & { drive(c: object): void }).drive({ yaw: 60 });
    return 0;
  });
  expect(draws).toBe(0);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __draws: number }).__draws)).toBeGreaterThan(0);
  const turned = await where([6, 6, 0]);
  const middleAfter = await where([0, 6, 0]);
  expect(Math.abs((turned?.x ?? 0) - (edge?.x ?? 0)) + Math.abs((turned?.y ?? 0) - (edge?.y ?? 0))).toBeGreaterThan(20);
  expect(Math.abs((middleAfter?.x ?? 0) - (middle?.x ?? 0))).toBeLessThan(8);
});
