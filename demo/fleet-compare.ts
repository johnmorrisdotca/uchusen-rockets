// The three SPX ships side by side, upright, at one scale taken from their own models. The view stays in the address. The table adds the record each ship already carries. Nothing new is drawn.
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { defineUchusenRocket } from "../src/element.ts";
import { ROCKETS, variantOf, type LookName } from "../src/index.ts";
import { isListed } from "./listed.ts";
import { fleetSize } from "./sizes.ts";
import { WORDS } from "./words.js";
import { chip, fillLooks, PAGE_LOOK } from "./chip.ts";

defineUchusenRocket();

const FIRST = ["fleet-ship-01", "fleet-ship-03", "fleet-kaminari", "fleet-emiake", "fleet-romaryu", "fleet-ship-ariake", "fleet-kyotori", "fleet-drone"];
const DEFAULT_SHIPS = "fleet-ship-01,fleet-ship-03,fleet-kaminari";
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

const address = createAddressState({ defaults: { view: "three-quarter", ships: DEFAULT_SHIPS, look: PAGE_LOOK } });

const listed = (): string[] => {
  const fleet = (id: string) => id in ROCKETS && isListed(id) && ROCKETS[id].maker === "fleet";
  const rest = Object.keys(ROCKETS).filter((id) => fleet(id) && !FIRST.includes(id));
  return [...FIRST.filter(fleet), ...rest];
};

/** Three listed ships. A short or unknown address is filled from the default three. */
const picked = (): string[] => {
  const known = listed();
  const asked = (address.get("ships") ?? DEFAULT_SHIPS).split(",").map((id) => id.trim()).filter((id) => known.includes(id));
  const unique = [...new Set(asked)];
  for (const id of DEFAULT_SHIPS.split(",")) if (unique.length < 3 && !unique.includes(id)) unique.push(id);
  for (const id of known) if (unique.length < 3 && !unique.includes(id)) unique.push(id);
  return unique.slice(0, 3);
};

const chosen = (): View => {
  const asked = address.get("view") ?? "";
  return (VIEWS as readonly string[]).includes(asked) ? (asked as View) : "three-quarter";
};

const looked = (): LookName => {
  const asked = address.get("look") ?? PAGE_LOOK;
  return asked === "line" || asked === "thick" || asked === "painted" ? asked : PAGE_LOOK;
};

const fitOf = (): string => {
  const frame = byId("cmp-view");
  return `${Math.max(200, Math.floor(frame.clientWidth) - 16)},${Math.max(200, Math.floor(frame.clientHeight) - 12)}`;
};

const specOf = (id: string): readonly (readonly [string, string])[] => variantOf(id, ROCKETS[id].defaultVariant)?.inspector?.spec ?? [];

const recorded = (id: string, names: readonly string[]): string => {
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
  const look = looked();
  const ships = picked();
  fillLooks(byId("cmp-looks"), look, (next) => {
    address.set("look", next === PAGE_LOOK ? null : next);
    draw();
  });
  byId("cmp-picks").replaceChildren(...listed().map((id) => chip(ROCKETS[id].name, `cmp-ship-${id}`, ships.includes(id), () => {
    if (ships.includes(id)) return;
    address.set("ships", [...ships.slice(1), id].join(","));
    draw();
  })));
  byId("cmp-views").replaceChildren(...VIEWS.map((one) => chip(say(`view_${one.replaceAll("-", "_")}`), `cmp-view-${one}`, one === view, () => {
    address.set("view", one);
    draw();
  })));
  const lineup = byId("lineup");
  const items = ships.flatMap((id) => {
    const variant = variantOf(id, ROCKETS[id].defaultVariant);
    return variant ? [`${id}:${variant.id}`] : [];
  });
  lineup.setAttribute("items", items.join(","));
  lineup.setAttribute("view", view);
  lineup.setAttribute("look", look);
  lineup.setAttribute("fit", fitOf());
  const head = document.createElement("tr");
  head.append(document.createElement("th"));
  for (const id of ships) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = ROCKETS[id].name;
    head.append(th);
  }
  byId("cmp-head").replaceChildren(head);
  const sizeRow = (label: string, key: string, value: (id: string) => string): HTMLTableRowElement => {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    row.append(th, ...ships.map((id) => cell(value(id), `cmp-${key}-${id}`)));
    return row;
  };
  const variant = (id: string) => variantOf(id, ROCKETS[id].defaultVariant);
  byId("cmp-rows").replaceChildren(
    sizeRow(say("length"), "length", (id) => {
      const fromRecord = recorded(id, ["Length"]);
      const one = variant(id);
      return fromRecord || (one ? metres(fleetSize(one).length) : "");
    }),
    sizeRow(say("beam"), "beam", (id) => { const one = variant(id); return one ? metres(fleetSize(one).beam) : ""; }),
    sizeRow(say("heightStowed"), "height", (id) => { const one = variant(id); return one ? metres(fleetSize(one).height) : ""; }),
    ...RECORD.map((names) => {
      const label = names.find((name) => ships.some((id) => specOf(id).some((row) => row[0] === name))) ?? names[0];
      const key = names[0].toLowerCase().replaceAll(" ", "-");
      return sizeRow(label, key, (id) => recorded(id, names) || say("recordNotGiven"));
    }),
  );
};

draw();
window.addEventListener("resize", () => byId("lineup").setAttribute("fit", fitOf()));

const lineup = byId("lineup");
byId("cmp-bar").addEventListener("kazoku-viewchange", (event) => {
  const zoom = (event as CustomEvent<{ zoom?: number }>).detail.zoom;
  const svg = lineup.shadowRoot?.querySelector("svg");
  if (!(svg instanceof SVGElement) || typeof zoom !== "number") return;
  svg.style.transform = Math.abs(zoom - 1) < 0.001 ? "" : `scale(${zoom})`;
});
