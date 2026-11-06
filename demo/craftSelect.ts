// Choosing a craft and its properties. Rockets and Compare both mount this. A click chooses a craft and opens the shared card; while one is chosen the view stays still.
import type { UchusenRocket } from "../src/element.ts";
import type { ViewControlsElement, ViewChangeDetail } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import "@johnmorrisdotca/kazoku-ui/options-window/define";
import type { OptionsWindowElement } from "@johnmorrisdotca/kazoku-ui/options-window/element";

export type CraftCardFacts = {
  name: string;
  length: string;
  variant: string;
  look: string;
  variants: readonly { id: string; name: string }[];
  looks: readonly { id: string; name: string }[];
};

type Spin = "off" | "long" | "upright";

const num = (value: string | null): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Mounts the properties card on one picture. `facts` and `apply` are the page's craft. */
export function mountCraftSelect(opts: {
  hero: UchusenRocket;
  bar: ViewControlsElement;
  address: { get(key: string): string | null; set(key: string, value: string | null): void };
  say(key: string): string;
  facts(craft: number): CraftCardFacts | null;
  apply(craft: number, patch: { variant?: string; look?: string }): void;
}): void {
  const { hero, bar, address, say } = opts;
  const stage = hero.parentElement ?? hero;
  const card = document.createElement("kazoku-options-window") as OptionsWindowElement;
  card.dataset.testid = "craft-card";
  card.setAttribute("variant", "card");
  card.setAttribute("theme", "dark");
  card.title = say("craftCard");
  const body = document.createElement("div");
  body.className = "craft-card";
  const help = document.createElement("p");
  help.slot = "help";
  help.textContent = say("craftHelp");
  card.append(body, help);
  document.body.append(card);
  card.open = false;

  let craft: number | null = null;
  let filling = false;
  let wrote = "";
  let wroteAt = 0;
  let hold: { yaw: number; tilt: number; roll: number; zoom: number; panX: number; panY: number } | null = null;

  const field = (key: string, control: HTMLElement): HTMLElement => {
    const row = document.createElement("label");
    row.style.display = "grid";
    row.style.gap = "0.15rem";
    row.style.margin = "0.35rem 0";
    const name = document.createElement("span");
    name.textContent = say(key);
    row.append(name, control);
    return row;
  };
  const read = (key: string, testid: string): HTMLElement => {
    const value = document.createElement("dd");
    value.dataset.testid = testid;
    value.style.margin = "0";
    const row = document.createElement("div");
    row.style.margin = "0.35rem 0";
    const name = document.createElement("div");
    name.textContent = say(key);
    row.append(name, value);
    body.append(row);
    return value;
  };

  const name = read("craftName", "craft-name");
  const length = read("craftLength", "craft-length");
  const variant = document.createElement("select");
  variant.dataset.testid = "craft-variant";
  const look = document.createElement("select");
  look.dataset.testid = "craft-look";
  const spin = document.createElement("select");
  spin.dataset.testid = "craft-spin";
  for (const [id, key] of [["off", "spinOff"], ["long", "spinLong"], ["upright", "spinUpright"]] as const) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = say(key);
    spin.append(option);
  }
  body.append(field("craftVariant", variant), field("craftLook", look), field("craftSpin", spin));
  const place = read("craftPlace", "craft-place");
  const angle = read("craftAngle", "craft-angle");

  const fill = (next: number | null): void => {
    craft = next;
    if (next === null) {
      delete stage.dataset.selected;
      card.open = false;
      address.set("pick", null);
      return;
    }
    stage.dataset.selected = String(next + 1);
    const facts = opts.facts(next);
    filling = true;
    name.textContent = facts?.name ?? "";
    length.textContent = facts?.length ?? "";
    variant.replaceChildren();
    for (const one of facts?.variants ?? []) {
      const option = document.createElement("option");
      option.value = one.id;
      option.textContent = one.name;
      option.selected = one.id === facts?.variant;
      variant.append(option);
    }
    look.replaceChildren();
    for (const one of facts?.looks ?? []) {
      const option = document.createElement("option");
      option.value = one.id;
      option.textContent = one.name;
      option.selected = one.id === facts?.look;
      look.append(option);
    }
    card.title = facts?.name || say("craftCard");
    card.open = true;
    filling = false;
    address.set("pick", String(next));
    readPose();
  };

  const readPose = (): void => {
    const canvas = hero.shadowRoot?.querySelector("canvas");
    const raw = canvas?.dataset.pose ?? "0,0,0,0,0,0";
    const [x, y, z, yaw, tilt, roll] = raw.split(",").map((part) => Number(part));
    place.textContent = `${(x ?? 0).toFixed(1)}, ${(y ?? 0).toFixed(1)}, ${(z ?? 0).toFixed(1)}`;
    angle.textContent = `${(yaw ?? 0).toFixed(1)}, ${(tilt ?? 0).toFixed(1)}, ${(roll ?? 0).toFixed(1)}`;
    const now = performance.now();
    if (craft === null || raw === wrote || now - wroteAt < 300) return;
    wrote = raw;
    wroteAt = now;
    address.set("placeX", (x ?? 0).toFixed(2));
    address.set("placeY", (y ?? 0).toFixed(2));
    address.set("placeZ", (z ?? 0).toFixed(2));
    address.set("aimYaw", (yaw ?? 0).toFixed(2));
    address.set("aimTilt", (tilt ?? 0).toFixed(2));
    address.set("aimRoll", (roll ?? 0).toFixed(2));
  };

  variant.addEventListener("change", () => {
    if (filling || craft === null) return;
    opts.apply(craft, { variant: variant.value });
  });
  look.addEventListener("change", () => {
    if (filling || craft === null) return;
    opts.apply(craft, { look: look.value });
  });
  spin.addEventListener("change", () => {
    const mode = (spin.value === "long" || spin.value === "upright" ? spin.value : "off") as Spin;
    hero.setCraftSpin(mode);
    address.set("craftSpin", mode === "off" ? null : mode);
  });

  new MutationObserver(() => {
    if (craft !== null && !card.open) hero.selectCraft(null);
  }).observe(card, { attributes: true, attributeFilter: ["open"] });

  hero.addEventListener("uchusen-select", (event) => {
    const detail = (event as CustomEvent<{ craft: number | null }>).detail;
    const next = detail?.craft ?? null;
    if (next !== null && hold === null) {
      const now = bar.state;
      hold = { yaw: now.yaw, tilt: now.tilt, roll: now.roll ?? 0, zoom: now.zoom, panX: now.panX, panY: now.panY };
    }
    if (next === null) hold = null;
    fill(next);
  });
  hero.addEventListener("uchusen-draw", () => {
    if (craft !== null) readPose();
  });

  bar.addEventListener("kazoku-viewchange", (event) => {
    if (!hold) return;
    const detail = (event as CustomEvent<ViewChangeDetail>).detail;
    if (!detail || detail.reason === "set") return;
    bar.set(hold);
    event.stopImmediatePropagation();
  }, true);

  const saved = address.get("pick");
  const restore = (): void => {
    if (saved === null || saved === "") return;
    const picked = Number(saved);
    if (!Number.isInteger(picked)) return;
    const mode = address.get("craftSpin");
    hero.restoreCraft(picked, {
      x: num(address.get("placeX")),
      y: num(address.get("placeY")),
      z: num(address.get("placeZ")),
      yaw: num(address.get("aimYaw")),
      tilt: num(address.get("aimTilt")),
      roll: num(address.get("aimRoll")),
    }, mode === "long" || mode === "upright" ? mode : "off");
    spin.value = mode === "long" || mode === "upright" ? mode : "off";
  };
  if (hero.dataset.state === "3d") restore();
  else hero.addEventListener("uchusen-ready", () => restore(), { once: true });
}
