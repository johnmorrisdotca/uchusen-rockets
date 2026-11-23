// Throwaway: what the page sees when Control or Space is held during a drag on Linux.
import { expect, test } from "@playwright/test";

for (const key of ["Control", "Space"]) {
  test(`events during ${key} and a drag`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 3400 });
    await page.goto("/uchusen-rockets/fleet-compare.html");
    const view = page.locator("#cmp-view");
    await view.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { log: string[] }).log = log;
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "mousedown", "mousemove", "mouseup", "dragstart", "selectstart", "contextmenu", "scroll", "blur", "keydown", "keyup", "lostpointercapture", "gotpointercapture"]) {
        window.addEventListener(type, (event) => log.push(`${type}${event instanceof KeyboardEvent ? ":" + event.key : ""}${event instanceof MouseEvent ? ` ${Math.round(event.clientX)},${Math.round(event.clientY)} b${event.buttons} ctrl=${event.ctrlKey} meta=${event.metaKey} target=${(event.target as HTMLElement).id || (event.target as HTMLElement).tagName}` : ""}${event.defaultPrevented ? " prevented" : ""}`), true);
      }
    });
    await page.locator("#cmp-bar").evaluate((el) => (el as unknown as { pause?: () => void }).pause?.());
    await page.evaluate(() => (document.querySelector("#cmp-bar") as unknown as { controller: { set(v: object, a: boolean, r: string): void } }).controller.set({ yaw: 0, tilt: 0, roll: 0, zoom: 3, panX: 0, panY: 0 }, true, "set"));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const pan = () => page.evaluate(() => { const s = (document.querySelector("#cmp-bar") as unknown as { state: { panX: number; panY: number; zoom: number } }).state; return `pan ${s.panX},${s.panY} zoom ${s.zoom}`; });
    const box = (await view.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.keyboard.down(key);
    await page.mouse.down();
    const pans: string[] = [await pan()];
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(x + 6 * i, y + 3 * i);
      pans.push(await pan());
    }
    console.log(`DIAG ${key} pans: ${pans.join(" | ")}`);
    await page.mouse.up();
    await page.keyboard.up(key);
    const log = await page.evaluate(() => (window as unknown as { log: string[] }).log);
    console.log(`DIAG ${key} (${log.length} events):\n${log.join("\n")}`);
    const active = await page.evaluate(() => `${document.activeElement?.tagName}#${document.activeElement?.id} scrollY=${window.scrollY}`);
    console.log(`DIAG ${key} active: ${active}`);
    expect(log.length).toBeGreaterThan(0);
  });
}
