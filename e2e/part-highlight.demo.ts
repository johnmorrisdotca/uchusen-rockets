// One part of a station can be picked out. The attribute is `part`, the property is `picked`, and a press sends `uchusen-part`.
import { expect, test } from "@playwright/test";

const URL = "/uchusen-rockets/element-check.html";

test("part draws one module full and the rest dimmed, parts() names it, and a press says which", async ({ page }) => {
  await page.goto(URL);
  const hero = page.locator("#shared");
  await expect(hero).toHaveAttribute("data-state", "picture");
  const plain = await hero.evaluate((node) => node.shadowRoot?.querySelector(".drawing")?.innerHTML ?? "");
  expect(plain).not.toContain('opacity="0.28"');
  await hero.evaluate((node) => {
    (node as HTMLElement & { picked: string }).picked = "zarya";
  });
  await expect.poll(() => hero.evaluate((node) => node.shadowRoot?.querySelector(".drawing")?.innerHTML ?? "")).toContain('<g data-slot="zarya" opacity="1">');
  const info = await hero.evaluate((node) => {
    const el = node as HTMLElement & { picked: string; parts(): { id: string; name: string; nameJa: string | null; launched: string | null; height: number | null }[] };
    return { picked: el.picked, attr: el.getAttribute("part"), zarya: el.parts().find((part) => part.id === "zarya") };
  });
  expect(info.picked).toBe("zarya");
  expect(info.attr).toBe("zarya");
  expect(info.zarya).toMatchObject({ name: "Zarya", nameJa: "ザーリャ", launched: "1998-11-20", height: 12.56 });
  await hero.evaluate((node) => {
    node.addEventListener("uchusen-part", (event) => {
      node.dataset.heard = String((event as CustomEvent<{ id: string }>).detail.id);
    });
    node.shadowRoot?.querySelector('[data-slot="unity"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(hero).toHaveAttribute("data-heard", "unity");
  await expect(hero).toHaveAttribute("part", "unity");
  const dim = await hero.evaluate((node) => node.shadowRoot?.querySelector(".drawing")?.innerHTML ?? "");
  expect(dim).toContain('<g data-slot="unity" opacity="1">');
  expect(dim).toContain('<g data-slot="zarya" opacity="0.28">');
});
