// The 3D stage keeps its height from the first paint. The craft files are held back, the box is measured, then they are let through.
import { expect, test, type Route } from "@playwright/test";

const pages = [
  { path: "/uchusen-rockets/", rocket: "#hero" },
  { path: "/uchusen-rockets/compare.html", rocket: "#hero" },
  { path: "/uchusen-rockets/builder.html", rocket: "#rocket" },
  { path: "/uchusen-rockets/fleet-db.html", rocket: "#hero" },
];

for (const one of pages) {
  test(`${one.path} reserves the stage before the craft loads`, async ({ page }) => {
    let hold = true;
    const waiting: Route[] = [];
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (!hold || type === "document" || type === "stylesheet") return route.continue();
      waiting.push(route);
    });
    await page.goto(one.path, { waitUntil: "commit" });
    const rocket = page.locator(one.rocket);
    await expect(rocket).toBeAttached();
    await expect.poll(() => rocket.evaluate((el) => getComputedStyle(el).aspectRatio)).not.toBe("auto");
    const before = await rocket.evaluate((el) => el.getBoundingClientRect().height);
    expect(before).toBeGreaterThan(80);
    hold = false;
    await Promise.all(waiting.splice(0).map((route) => route.continue()));
    await page.unroute("**/*");
    await expect.poll(() => rocket.evaluate((el) => el.shadowRoot?.querySelector(".picture")?.getBoundingClientRect().height ?? 0), { timeout: 30_000 }).toBeGreaterThan(80);
    const picture = await rocket.evaluate((el) => el.shadowRoot?.querySelector(".picture")?.getBoundingClientRect().height ?? 0);
    expect(Math.abs(picture - before)).toBeLessThanOrEqual(2);
  });
}
