// A hardpoint takes another module, and the build names the flight that is underway.
import { expect, test } from "@playwright/test";
import { buildOf, flightNow } from "../src/buildPlay.ts";

const miyamoto = "/uchusen-rockets/?rocket=fleet-ship-03&variant=miyamoto&look=line";

test("the mission pod swaps, and the choice stays in the address", async ({ page }) => {
  await page.goto(miyamoto);
  await expect(page.getByTestId("swap-field")).toBeVisible();
  await expect(page.getByTestId("swap-pod-relay")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("swap-pod-relief").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("swap")).toBe("pod:relief");
  await expect(page.getByTestId("swap-pod-relief")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => page.locator("#hero").evaluate((node) => {
    const report = (node as unknown as { report: { parts: { slot: string; part: { id: string } }[] } | null }).report;
    return report?.parts.find((part) => part.slot === "pod")?.part.id ?? "";
  }), { timeout: 20000 }).toBe("fleet-ship-03-pod-relief");
});

test("a click on a hardpoint opens that hardpoint's modules", async ({ page }) => {
  await page.goto(miyamoto);
  await expect(page.getByTestId("swap-field")).toBeVisible();
  await page.locator("#hero").evaluate((node) => node.dispatchEvent(new CustomEvent("uchusen-slot", { detail: "pod", bubbles: true })));
  await expect(page.locator("[data-slot=pod]")).toHaveAttribute("data-picked", "on");
  await expect(page.locator("[data-slot=pod] [data-testid=swap-pod-survey]")).toBeVisible();
});

test("the build row names the assembly flight", async ({ page }) => {
  const steps = buildOf("miyamoto");
  if (!steps) throw new Error("Miyamoto has no build");
  const flight = flightNow(steps, 0.25);
  if (!flight) throw new Error("no flight");
  await page.goto(`${miyamoto}&build=on&at=0.25`);
  await page.locator('[data-testid="panel-build"]').click();
  await expect(page.locator("uchusen-build").getByTestId("build-now")).toContainText(`Flight ${flight.n}:`);
});
