// Real craft for scale lie lengthwise in the fleet band: on unless the address says real=off, and Fit keeps Hanabusa and Kaminari inside the frame.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

test("real craft lie in the fleet band, the switch is in the address, and the band fits the frame", async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-testid="more-compare"]').click();
  const lineup = page.locator('[data-testid="lineup"]');
  const frame = page.locator('[data-testid="compare-view"]');
  await lineup.scrollIntoViewIfNeeded();
  await page.locator('[data-testid="compare-fleet-kaminari:fleet-kaminari"]').click();
  await page.locator('[data-testid="compare-fleet-ship-01:hanabusa"]').click();
  await expect(lineup).toHaveAttribute("data-real", "4");
  const words = () => lineup.evaluate((node) => [...(node.shadowRoot?.querySelectorAll("text") ?? [])].map((el) => el.textContent ?? "").join("\n"));
  const labelled = await words();
  for (const name of ["Starship with Super Heavy", "Saturn V", "SLS Block 1", "ISS"]) expect(labelled, name).toContain(name);
  const fit = await lineup.evaluate((node) => {
    const svg = node.shadowRoot?.querySelector("svg");
    const box = document.querySelector('[data-testid="compare-view"]');
    if (!svg || !box) return null;
    return { width: Number(svg.getAttribute("width")), height: Number(svg.getAttribute("height")), roomW: (box as HTMLElement).clientWidth, roomH: (box as HTMLElement).clientHeight };
  });
  expect(fit).not.toBeNull();
  // a desk's frame holds the band; a phone's frame scrolls a wide band itself, and the page does not
  if (test.info().project.name === "chromium-phone") {
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(frame).toHaveCSS("overflow-x", "auto");
  } else {
    expect(fit!.width).toBeLessThanOrEqual(fit!.roomW + 1);
    expect(fit!.height).toBeLessThanOrEqual(fit!.roomH + 1);
  }
  await page.getByTestId("compare-real").click();
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("real")).toBe("off");
  await expect(lineup).toHaveAttribute("data-real", "0");
  expect(await words()).not.toContain("Saturn V");
  await page.getByTestId("compare-real").click();
  await expect(lineup).toHaveAttribute("data-real", "4");
  await expect.poll(() => new globalThis.URL(page.url()).searchParams.get("real")).toBeNull();
});
