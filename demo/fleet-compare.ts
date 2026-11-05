// The three SPX ships side by side, upright, at one scale taken from their own models. The view stays in the address. Nothing new is drawn.
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import { ROCKETS, variantOf } from "../src/index.ts";
import { defineUchusenRocket } from "../src/element.ts";

defineUchusenRocket();
import { fleetSize } from "./sizes.ts";
import { WORDS } from "./words.js";

const SHIPS = ["fleet-ship-01", "fleet-ship-03", "fleet-kaminari"] as const;
const VIEWS = ["front", "side", "three-quarter", "below"] as const;
type View = (typeof VIEWS)[number];

type Chooser = { word(key: string): string | undefined };
const say = (key: string): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return chooser?.word(key) ?? WORDS.en[key] ?? key;
};
const byId = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node;
};
const metres = (n: number) => `${n >= 100 ? Math.round(n) : Number(n.toFixed(1))} m`;

const address = createAddressState({ defaults: { view: "three-quarter" } });

const chosen = (): View => {
  const asked = address.get("view") ?? "";
  return (VIEWS as readonly string[]).includes(asked) ? (asked as View) : "three-quarter";
};

const chip = (label: string, testid: string, pressed: boolean, on: () => void): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.testid = testid;
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  button.addEventListener("click", on);
  return button;
};

const fitOf = (): string => {
  const frame = byId("cmp-view");
  return `${Math.max(200, Math.floor(frame.clientWidth) - 16)},${Math.max(200, Math.floor(frame.clientHeight) - 12)}`;
};

const draw = (): void => {
  const view = chosen();
  byId("cmp-views").replaceChildren(...VIEWS.map((one) => chip(say(`view_${one.replaceAll("-", "_")}`), `cmp-view-${one}`, one === view, () => {
    address.set("view", one);
    draw();
  })));
  const lineup = byId("lineup");
  const items = SHIPS.flatMap((id) => {
    const variant = variantOf(id, ROCKETS[id].defaultVariant);
    return variant ? [`${id}:${variant.id}`] : [];
  });
  lineup.setAttribute("items", items.join(","));
  lineup.setAttribute("view", view);
  lineup.setAttribute("fit", fitOf());
  const rows = byId("cmp-rows");
  rows.replaceChildren(...SHIPS.flatMap((id) => {
    const variant = variantOf(id, ROCKETS[id].defaultVariant);
    if (!variant) return [];
    const size = fleetSize(variant);
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.textContent = ROCKETS[id].name;
    name.scope = "row";
    const length = document.createElement("td");
    length.dataset.testid = `cmp-length-${id}`;
    length.textContent = metres(size.length);
    const beam = document.createElement("td");
    beam.textContent = metres(size.beam);
    const height = document.createElement("td");
    height.textContent = metres(size.height);
    row.append(name, length, beam, height);
    return [row];
  }));
};

draw();
window.addEventListener("resize", () => byId("lineup").setAttribute("fit", fitOf()));
