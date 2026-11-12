// The `flags` attribute: with hata, a national rocket shows its country's flag and an international one none; when hata's import fails the element draws as before, with no flag and no error.
import { expect, type Locator, type Page, test } from "@playwright/test";

const URL = "/uchusen-rockets/";

/** Every console error, page error, failed request and content security policy report. */
function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  void page.addInitScript(() => document.addEventListener("securitypolicyviolation", (event) => console.error(`policy: ${event.violatedDirective} ${event.blockedURI}`), true));
  return problems;
}

const flagOf = (rocket: Locator) =>
  rocket.evaluate((node) => {
    const badge = (node as HTMLElement).shadowRoot?.querySelector(".flag");
    return badge ? { label: badge.getAttribute("aria-label"), role: badge.getAttribute("role"), svg: Boolean(badge.querySelector("svg")) } : null;
  });

test("with hata, a national rocket shows its country's flag and an international one shows none", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}element-check.html`);
  const national = page.locator("#national");
  const shared = page.locator("#shared");
  await expect(national).toHaveAttribute("data-flag", "US");
  expect(await flagOf(national)).toEqual({ label: "United States", role: "img", svg: true });
  await expect(shared).toHaveAttribute("data-flag", "");
  expect(await flagOf(shared)).toBeNull();
  // another rocket brings its own flag, and `flags="off"` takes it away
  await national.evaluate((node) => node.setAttribute("rocket", "soyuz"));
  await expect(national).toHaveAttribute("data-flag", "RU");
  expect((await flagOf(national))?.label).toBe("Russia");
  await national.evaluate((node) => node.setAttribute("flags", "off"));
  await expect(national).not.toHaveAttribute("data-flag", /.*/);
  expect(await flagOf(national)).toBeNull();
  expect(problems).toEqual([]);
});

test("when hata's import fails, the element draws as before, with no flag and no error", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}element-check.html?flags=none`);
  const national = page.locator("#national");
  await expect(national).toHaveAttribute("data-state", "picture");
  await expect(national).toHaveAttribute("data-flag", "");
  expect(await flagOf(national)).toBeNull();
  expect(await national.evaluate((node) => (node as HTMLElement).shadowRoot?.querySelector(".drawing svg") !== null)).toBe(true);
  expect(problems).toEqual([]);
});

test("the demo shows the flag of the rocket it shows", async ({ page }) => {
  const problems = watch(page);
  await page.goto(`${URL}?rocket=tiangong`);
  const hero = page.getByTestId("hero");
  await expect(hero).toHaveAttribute("data-flag", "CN");
  expect((await flagOf(hero))?.svg).toBe(true);
  expect(problems).toEqual([]);
});
