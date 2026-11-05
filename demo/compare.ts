// The wide comparison page: two or three craft chosen from the picker stand on one ground in one 3D view, each at its true size, with the Earth behind them and one set of view controls. What is chosen is kept in the address. A phone shows one craft.
import { BESIDE_MOST, LOOK_NAMES, MAKERS, ROCKETS, variantOf, type LookName, type MakerId, type Variant } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import type { EarthForm, EarthShow } from "./earth.ts";
import { isListed } from "./listed.ts";
import { fleetSize, isFleetVariant } from "./sizes.ts";
import { WORDS } from "./words.js";

setAssetBase(new URL("assets/", document.baseURI).href);

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node as T;
};
type Chooser = { word(key: string): string | undefined; lang: string };
const say = (key: string, values: Record<string, string | number> = {}): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return (chooser?.word(key) ?? WORDS.en[key] ?? key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
};
const chip = (label: string, testid: string, on: () => void, pressed?: boolean): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.testid = testid;
  if (pressed !== undefined) button.setAttribute("aria-pressed", String(pressed));
  button.addEventListener("click", on);
  return button;
};

type Craft = { rocket: string; variant: string };
const MOST = BESIDE_MOST + 1;
/** What a craft added is, in turn: the first of these that is not on screen yet. */
const NEXT: readonly Craft[] = [
  { rocket: "saturn-v", variant: "saturn-v" },
  { rocket: "starship", variant: "v3" },
  { rocket: "fleet-ship-03", variant: "miyamoto" },
  { rocket: "iss", variant: "iss" },
  { rocket: "space-shuttle", variant: "stack" },
];
const BACKGROUNDS = ["none", "earth"] as const;

const hero = byId<UchusenRocket>("hero");
const bar = byId<HTMLElement>("view-bar") as ViewControlsElement;
bar.addEventListener("kazoku-viewchange", (event) => hero.drive((event as CustomEvent).detail));
const address = createAddressState({ defaults: { rocket: "starship", variant: "v3", with: "saturn-v:saturn-v", look: "line", background: "earth" } });

const known = (rocket: string | null | undefined, variant: string | null | undefined): Craft | null => {
  if (!rocket || !Object.hasOwn(ROCKETS, rocket)) return null;
  const found = variantOf(rocket, variant || undefined);
  return found ? { rocket, variant: found.id } : null;
};
const first = known(address.get("rocket"), address.get("variant")) ?? { rocket: "starship", variant: "v3" };
// `with` lists the craft beside the first: absent is Saturn V, `none` is nothing
const askedWith = new URLSearchParams(location.search).get("with");
const others = (askedWith === null ? "saturn-v:saturn-v" : askedWith).split(",").flatMap((key) => {
  const [rocket, variant] = key.split(":");
  const one = known(rocket, variant);
  return one ? [one] : [];
});
const state = {
  craft: [first, ...others].slice(0, MOST),
  editing: 0,
  maker: ROCKETS[first.rocket].maker as MakerId,
  look: ((LOOK_NAMES as readonly string[]).includes(address.get("look") ?? "") ? address.get("look") : "line") as LookName,
  background: (address.get("background") === "none" ? "none" : "earth") as (typeof BACKGROUNDS)[number],
};
// one craft on a phone
const phone = matchMedia("(max-width: 820px)");
const shown = (): Craft[] => (phone.matches ? state.craft.slice(0, 1) : state.craft);
const variantFor = (craft: Craft) => variantOf(craft.rocket, craft.variant) as Variant;

// ------------------------------------------------------------- the Earth behind: nothing of it is loaded until it is chosen
const earthHolder = byId("earth-back");
let earthShown: EarthShow | null = null;
let earthForm: EarthForm | null = null;
let earthAsked = 0;
let realisticBarred = false;
hero.addEventListener("uchusen-fallback", () => {
  realisticBarred = true;
  syncEarth();
});
function syncEarth() {
  byId("earth-credit").hidden = state.background !== "earth";
  const form: EarthForm | null = state.background !== "earth" ? null : state.look === "line" ? "line" : state.look === "thick" || realisticBarred ? "thick" : "realistic";
  if (form === earthForm) return;
  earthForm = form;
  const asked = ++earthAsked;
  earthShown?.stop();
  earthShown = null;
  earthHolder.hidden = form === null;
  if (form)
    void import("./earth.ts").then(({ showEarth }) => {
      if (asked === earthAsked)
        earthShown = showEarth(earthHolder, form, () => {
          realisticBarred = true;
          syncEarth();
        });
    });
}

// ------------------------------------------------------------- what is chosen
function keep() {
  address.set("rocket", state.craft[0].rocket);
  address.set("variant", state.craft[0].variant);
  address.set("with", state.craft.slice(1).map((craft) => `${craft.rocket}:${craft.variant}`).join(",") || "none");
  address.set("look", state.look);
  address.set("background", state.background);
}

function renderCraft() {
  const row = byId("cw-craft");
  const chips: HTMLElement[] = [];
  for (const [index, craft] of shown().entries()) {
    const name = variantFor(craft).name;
    const group = document.createElement("span");
    group.className = "cw-craft-chip";
    group.append(chip(`${index + 1}. ${name}`, `cw-craft-${index}`, () => edit(index), index === state.editing));
    if (shown().length > 1) {
      const remove = chip("×", `cw-remove-${index}`, () => remove_(index));
      remove.classList.add("cw-remove");
      remove.setAttribute("aria-label", say("cmpRemove", { name }));
      group.append(remove);
    }
    chips.push(group);
  }
  if (!phone.matches && state.craft.length < MOST) chips.push(chip(say("cmpAdd"), "cw-add", add));
  row.replaceChildren(...chips);
}

function renderPickers() {
  const editing = state.craft[Math.min(state.editing, state.craft.length - 1)];
  const makers = (Object.keys(MAKERS) as MakerId[]).filter((maker) => Object.values(ROCKETS).some((rocket) => rocket.maker === maker && isListed(rocket.id)));
  byId("makers").replaceChildren(...makers.map((maker) => chip(say(`maker_${maker}`), `maker-${maker}`, () => pickMaker(maker), maker === state.maker)));
  byId("rockets").replaceChildren(
    ...Object.values(ROCKETS)
      .filter((rocket) => rocket.maker === state.maker && isListed(rocket.id))
      .map((rocket) => chip(rocket.name, `rocket-${rocket.id}`, () => pickRocket(rocket.id), rocket.id === editing.rocket)),
  );
  byId("variants").replaceChildren(...ROCKETS[editing.rocket].variants.map((one) => chip(one.name, `variant-${one.id}`, () => pickVariant(one.id), one.id === editing.variant)));
  byId("looks").replaceChildren(...LOOK_NAMES.map((look) => chip(say(`look_${look}`), `look-${look}`, () => pickLook(look), look === state.look)));
  byId("backgrounds").replaceChildren(...BACKGROUNDS.map((background) => chip(say(`background_${background}`), `background-${background}`, () => pickBackground(background), background === state.background)));
}

function renderTable() {
  const head = document.createElement("tr");
  for (const text of ["", say("length"), say("madeBy")]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = text;
    head.append(th);
  }
  const rows = shown().map((craft) => {
    const variant = variantFor(craft);
    const tr = document.createElement("tr");
    tr.dataset.craft = `${craft.rocket}:${craft.variant}`;
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = variant.name;
    const height = isFleetVariant(variant) ? Math.round(fleetSize(variant).length) : variant.facts.height.value;
    const length = tr.insertCell();
    length.textContent = typeof height === "number" ? `${height.toLocaleString("en-US")} m` : say("noSource");
    const made = tr.insertCell();
    made.textContent = ROCKETS[craft.rocket].madeBy.value ?? "";
    tr.prepend(name);
    return tr;
  });
  const table = byId("cw-table");
  const thead = document.createElement("thead");
  thead.append(head);
  const tbody = document.createElement("tbody");
  tbody.append(...rows);
  table.replaceChildren(thead, tbody);
}

/** The view controls tip as far as the first craft allows. */
function limitTilt() {
  const max = variantFor(state.craft[0]).view?.tiltMax ?? 45;
  if (bar.getAttribute("tilt-max") !== String(max)) bar.setAttribute("tilt-max", String(max));
  if (Math.abs(bar.state.tilt) > max) bar.set({ tilt: Math.sign(bar.state.tilt) * max });
}

let framed = "";
function renderStage() {
  const list = shown();
  const [one, ...rest] = list;
  limitTilt();
  hero.setAttribute("rocket", one.rocket);
  hero.setAttribute("variant", one.variant);
  hero.setAttribute("show", "together");
  hero.setAttribute("look", state.look);
  hero.setAttribute("beside", rest.length ? rest.map((craft) => `${craft.rocket}:${craft.variant}`).join(",") : "off");
  // the whole row is in the picture whenever it changes
  const now = list.map((craft) => `${craft.rocket}:${craft.variant}`).join(",");
  if (now !== framed) {
    framed = now;
    bar.fit();
  }
  syncEarth();
}

function renderAll() {
  if (phone.matches) state.editing = 0;
  renderCraft();
  renderPickers();
  renderTable();
  renderStage();
  keep();
}

// ------------------------------------------------------------- the choices
function edit(index: number) {
  state.editing = index;
  state.maker = ROCKETS[state.craft[index].rocket].maker;
  renderAll();
}
function remove_(index: number) {
  if (state.craft.length < 2) return;
  state.craft.splice(index, 1);
  state.editing = Math.min(state.editing, state.craft.length - 1);
  state.maker = ROCKETS[state.craft[state.editing].rocket].maker;
  renderAll();
}
function add() {
  if (state.craft.length >= MOST) return;
  const taken = new Set(state.craft.map((craft) => `${craft.rocket}:${craft.variant}`));
  const next = NEXT.find((craft) => !taken.has(`${craft.rocket}:${craft.variant}`)) ?? NEXT[0];
  state.craft.push({ ...next });
  state.editing = state.craft.length - 1;
  state.maker = ROCKETS[next.rocket].maker;
  renderAll();
}
function pickMaker(maker: MakerId) {
  state.maker = maker;
  const theirs = Object.values(ROCKETS).filter((rocket) => rocket.maker === maker && isListed(rocket.id));
  if (theirs.length === 1 && state.craft[state.editing].rocket !== theirs[0].id) return pickRocket(theirs[0].id);
  renderPickers();
}
function pickRocket(id: string) {
  state.craft[state.editing] = { rocket: id, variant: ROCKETS[id].defaultVariant };
  state.maker = ROCKETS[id].maker;
  renderAll();
}
function pickVariant(id: string) {
  state.craft[state.editing] = { rocket: state.craft[state.editing].rocket, variant: id };
  renderAll();
}
function pickLook(look: LookName) {
  state.look = look;
  renderAll();
}
function pickBackground(background: (typeof BACKGROUNDS)[number]) {
  state.background = background;
  renderAll();
}

phone.addEventListener("change", renderAll);
document.addEventListener("kazoku-languagechange", () => queueMicrotask(renderAll));
renderAll();
document.documentElement.dataset.ready = "true";
