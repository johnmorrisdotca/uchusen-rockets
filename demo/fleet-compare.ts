// The three SPX ships side by side, upright, at one scale taken from their own models. The view stays in the address. The table adds the record each ship already carries. Nothing new is drawn.
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import { defineUchusenRocket } from "../src/element.ts";
import { ROCKETS, variantOf } from "../src/index.ts";
import { fleetSize } from "./sizes.ts";
import { WORDS } from "./words.js";

defineUchusenRocket();

const SHIPS = ["fleet-ship-01", "fleet-ship-03", "fleet-kaminari"] as const;
type ShipId = (typeof SHIPS)[number];
const VIEWS = ["front", "side", "three-quarter", "below"] as const;
type View = (typeof VIEWS)[number];

/** Record rows, in order. A ship with none of the names leaves that cell empty. The label is whichever of the names the records use. */
const RECORD: readonly (readonly string[])[] = [
  ["Dry mass"],
  ["Full mass"],
  ["Crew", "Crew and passengers"],
  ["Cargo"],
  ["Main drive", "Drive"],
  ["Peak speed"],
];

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

const specOf = (id: ShipId): readonly (readonly [string, string])[] => variantOf(id, ROCKETS[id].defaultVariant)?.inspector?.spec ?? [];

const recorded = (id: ShipId, names: readonly string[]): string => {
  const spec = specOf(id);
  for (const name of names) {
    const found = spec.find((row) => row[0] === name);
    if (found) return found[1];
  }
  return "";
};

const cell = (text: string, testid: string): HTMLTableCellElement => {
  const td = document.createElement("td");
  td.dataset.testid = testid;
  td.textContent = text;
  return td;
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
  const head = document.createElement("tr");
  head.append(document.createElement("th"));
  for (const id of SHIPS) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = ROCKETS[id].name;
    head.append(th);
  }
  byId("cmp-head").replaceChildren(head);
  const sizeRow = (label: string, key: string, value: (id: ShipId) => string): HTMLTableRowElement => {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    row.append(th, ...SHIPS.map((id) => cell(value(id), `cmp-${key}-${id}`)));
    return row;
  };
  const variant = (id: ShipId) => variantOf(id, ROCKETS[id].defaultVariant);
  byId("cmp-rows").replaceChildren(
    sizeRow(say("length"), "length", (id) => { const one = variant(id); return one ? metres(fleetSize(one).length) : ""; }),
    sizeRow(say("beam"), "beam", (id) => { const one = variant(id); return one ? metres(fleetSize(one).beam) : ""; }),
    sizeRow(say("heightStowed"), "height", (id) => { const one = variant(id); return one ? metres(fleetSize(one).height) : ""; }),
    ...RECORD.map((names) => {
      const label = names.find((name) => SHIPS.some((id) => specOf(id).some((row) => row[0] === name))) ?? names[0];
      const key = names[0].toLowerCase().replaceAll(" ", "-");
      return sizeRow(label, key, (id) => recorded(id, names));
    }),
  );
};

draw();
window.addEventListener("resize", () => byId("lineup").setAttribute("fit", fitOf()));
