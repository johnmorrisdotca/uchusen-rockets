// On a phone the maker and rocket choices sit under the picture. Choosing one below the fold must leave the picture on screen.
import { expect } from "@playwright/test";
import { test } from "./base.ts";

const noWebGL = () => {
  const getContext = HTMLCanvasElement.prototype.getContext;
  // @ts-expect-error the canvas overloads stay; WebGL is refused so the test reads layout, not a drawn frame
  HTMLCanvasElement.prototype.getContext = function (kind: string, ...rest: unknown[]) {
    if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
    return getContext.call(this, kind, ...rest);
  };
};

/** The first maker or rocket whose top is at or below the window. */
const belowFold = (page: import("@playwright/test").Page) => page.evaluate(() => {
  const chips = [...document.querySelectorAll<HTMLElement>("#makers .chip, #rockets .chip")];
  return chips.find((chip) => chip.getBoundingClientRect().top >= innerHeight)?.dataset.testid ?? null;
});

test("choosing a maker or rocket below the fold keeps the stage on screen", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-phone", "390 px");
  await page.addInitScript(noWebGL);
  await page.goto("/uchusen-rockets/?picker=off");
  await expect(page.locator("#makers .chip").first()).toBeVisible();

  const choose = async () => {
    const id = await belowFold(page);
    expect(id, "a maker or rocket starts below the fold").toBeTruthy();
    await page.getByTestId(id!).click();
    const seen = await page.evaluate((chosen) => {
      const stage = document.querySelector(".stage-box")!.getBoundingClientRect();
      const hero = document.querySelector("#hero")!.getBoundingClientRect();
      const chip = document.querySelector(`[data-testid="${chosen}"]`)!.getBoundingClientRect();
      return {
        heroSeen: Math.min(hero.bottom, innerHeight) - Math.max(hero.top, 0),
        heroHeight: hero.height,
        heroBottom: hero.bottom,
        stageTop: stage.top,
        stageBottom: stage.bottom,
        chipTop: chip.top,
        chipBottom: chip.bottom,
        vh: innerHeight,
        vw: innerWidth,
      };
    }, id);
    expect(seen.vw).toBe(390);
    expect(seen.stageTop).toBeGreaterThanOrEqual(-1);
    expect(seen.stageBottom).toBeLessThanOrEqual(seen.vh + 1);
    expect(seen.heroSeen).toBeGreaterThan(seen.heroHeight * 0.85);
    expect(seen.chipTop).toBeGreaterThanOrEqual(Math.max(seen.stageBottom, seen.heroBottom) - 2);
    expect(seen.chipBottom).toBeLessThanOrEqual(seen.vh + 1);
  };

  await choose();
  await choose();
});
