// Throwaway: Control, Meta and Space drags one after the other on one page, as the gesture check does, on Linux.
import { test } from "@playwright/test";

for (const variant of ["plain", "no-select"]) test(`drags one after the other: ${variant}`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3400 });
  await page.goto("/uchusen-rockets/fleet-compare.html");
  const view = page.locator("#cmp-view");
  if (variant === "no-select") await page.addStyleTag({ content: "#cmp-view, #cmp-view * { user-select: none !important; -webkit-user-select: none !important; -webkit-user-drag: none !important; }" });
  await view.scrollIntoViewIfNeeded();
  await page.locator("#cmp-bar").evaluate((el) => (el as unknown as { pause?: () => void }).pause?.());
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { log: string[] }).log = log;
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "keydown", "keyup", "blur", "focusout", "dragstart", "selectstart", "contextmenu"]) {
      window.addEventListener(type, (event) => log.push(`${type}${event instanceof KeyboardEvent ? ":" + event.key + " ctrl=" + event.ctrlKey + " meta=" + event.metaKey : ""}${event instanceof PointerEvent ? ` ${Math.round(event.clientX)},${Math.round(event.clientY)} b${event.buttons} ctrl=${event.ctrlKey} meta=${event.metaKey}` : ""}`), true);
    }
  });
  const put = () => page.evaluate(() => (document.querySelector("#cmp-bar") as unknown as { controller: { set(v: object, a: boolean, r: string): void } }).controller.set({ yaw: 0, tilt: 0, roll: 0, zoom: 3, panX: 0, panY: 0 }, true, "set"));
  const pan = () => page.evaluate(() => { const s = (document.querySelector("#cmp-bar") as unknown as { state: { panX: number; panY: number } }).state; return `${s.panX},${s.panY}`; });
  for (const key of ["Control", "Meta", "Space", "Meta", "Space", "Control"]) {
    await put();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
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
    await page.mouse.up();
    await page.keyboard.up(key);
    console.log(`DIAG ${variant} ${key}: ${pans.join(" | ")}`);
  }
  const log = await page.evaluate(() => (window as unknown as { log: string[] }).log);
  console.log(`DIAG ${variant} log (${log.length}):\n${log.filter((line) => /^(keydown|keyup|pointercancel|blur|focusout|dragstart|selectstart|contextmenu)/.test(line) || /pointerdown/.test(line)).join("\n")}`);
});
