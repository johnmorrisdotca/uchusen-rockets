// The poster page: the package's rockets at one scale, a zoom, and a download of the drawing.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/poster.html";

test("the poster shows the rockets, the fleet and what is still to add, and the zoom changes the picture", async ({ page }) => {
  await page.goto(URL);
  const poster = page.getByTestId("poster");
  await expect(poster).toContainText("Saturn V");
  await expect(poster).toContainText("SPX-207");
  await expect(poster).toContainText("To add later");
  await expect(poster).toContainText("Vulcan Centaur");
  const before = await poster.locator("svg").evaluate((node) => node.getBoundingClientRect().width);
  await page.getByTestId("poster-zoom").fill("50");
  const after = await poster.locator("svg").evaluate((node) => node.getBoundingClientRect().width);
  expect(after).toBeLessThan(before);
});

test("no two rocket labels touch", async ({ page }) => {
  await page.goto(URL);
  const boxes = await page.locator("[data-poster-label]").evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, name: node.textContent ?? "" };
  }));
  expect(boxes.length).toBeGreaterThan(8);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const clear = a.right + 1 <= b.left || b.right + 1 <= a.left || a.bottom + 1 <= b.top || b.bottom + 1 <= a.top;
      expect(clear, `${a.name} overlaps ${b.name}`).toBe(true);
    }
  }
});

test("the drawing downloads as an SVG and as a PNG", async ({ page }) => {
  await page.goto(URL);
  const svg = page.waitForEvent("download");
  await page.getByTestId("poster-svg").click();
  expect((await svg).suggestedFilename()).toBe("rockets-of-the-world.svg");
  const png = page.waitForEvent("download");
  await page.getByTestId("poster-a2").click();
  expect((await png).suggestedFilename()).toBe("rockets-of-the-world-a2.png");
});
