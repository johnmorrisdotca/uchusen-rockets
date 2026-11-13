import { expect, type Page } from "@playwright/test";

/**
 * A page that should be still has stopped changing: two readings of its picture a second apart come out the same, polled until they do. It waits on what the page shows, not on a fixed time, so a slow machine that is still settling (a model arriving, a first frame) is given until the poll times out, and a page that really moves fails.
 * @param shot Reads the picture, as the bytes of a screenshot.
 */
export async function expectStillPicture(page: Page, shot: () => Promise<Buffer>, message = "the picture has stopped changing"): Promise<void> {
  await expect
    .poll(async () => {
      const first = await shot();
      await page.waitForTimeout(1000);
      return (await shot()).equals(first);
    }, { message, timeout: 30_000 })
    .toBe(true);
}

/**
 * A counter that should have stopped rising has: two readings a second apart come out the same, polled until they do.
 * @param read Reads the count of draws or frames.
 */
export async function expectFlatCount(page: Page, read: () => Promise<number>, message = "the count has stopped rising"): Promise<void> {
  await expect
    .poll(async () => {
      const mark = await read();
      await page.waitForTimeout(1000);
      return (await read()) - mark;
    }, { message, timeout: 30_000 })
    .toBe(0);
}
