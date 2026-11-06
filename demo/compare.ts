// The wide comparison page: up to eight craft, chosen from one browser, stand in one 3D view at their true size, with the Earth behind them and one set of view controls. What is chosen is kept in the address. A phone shows one craft on the stage and the rest in the line.
import { BESIDE_MOST, LOOK_NAMES, MAKERS, ROCKETS, variantOf, type LookName, type MakerId, type Variant } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import type { EarthForm, EarthShow } from "./earth.ts";
import { isListed } from "./listed.ts";
import { fleetSize, isFleetVariant } from "./sizes.ts";
import { applyTurn, companionsFor, frameSky, paceFromStep, paceNamed, paceStep, paintThumbs, placeSky, setTurnPace, skyCredit, skyList, type SkyList } from "./sky.ts";
import "@johnmorrisdotca/kazoku-ui/speed-buttons/define";
import { WORDS } from "./words.js";
import { craftBudget, craftPicture, kindOf, type PickerKind } from "./shipPicker.ts";

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
const hero = byId<UchusenRocket>("hero");
const bar = byId<HTMLElement>("view-bar") as ViewControlsElement;
// A plain drag turns the picture. Move, a second finger, Shift and the other mouse buttons still pan. A drag that starts on a craft throws that craft.
bar.set({ drag: "turn" });
bar.addEventListener("kazoku-viewchange", (event) => {
  const detail = (event as CustomEvent).detail as { zoom?: number };
  hero.drive(detail);
  const zoom = Math.max(0.25, detail.zoom ?? 1);
  const sky = byId("sky-back");
  sky.dataset.viewZoom = String(zoom);
  const node = sky.querySelector("wakusei-body:not([data-moon])");
  if (node instanceof HTMLElement) frameSky(node, sky, zoom);
});
const address = createAddressState({ defaults: { rocket: "starship", variant: "v3", with: "saturn-v:saturn-v", look: "line", background: "earth", moon: "", place: "float", labels: "on", spin: "slow" } });
setTurnPace(paceNamed(address.get("spin")));
const turnButtons = byId<HTMLElement & { value: number }>("turn-pace");
turnButtons.value = paceStep(paceNamed(address.get("spin")));
turnButtons.addEventListener("kazoku-speedchange", (event) => {
  const detail = (event as CustomEvent<{ value: number; reason: string }>).detail;
  if (detail?.reason !== "user") return;
  const pace = paceFromStep(detail.value);
  setTurnPace(pace);
  address.set("spin", pace === "slow" ? null : pace);
  applyTurn(document);
});

const known = (rocket: string | null | undefined, variant: string | null | undefined): Craft | null => {
  if (!rocket || !Object.hasOwn(ROCKETS, rocket)) return null;
  const found = variantOf(rocket, variant || undefined);
  return found ? { rocket, variant: found.id } : null;
};
const first = known(address.get("rocket"), address.get("variant")) ?? { rocket: "starship", variant: "v3" };
// `with` lists the craft beside the first: absent is Saturn V, `none` is nothing. `craft=0` is an empty stage.
const asked = new URLSearchParams(location.search);
const askedWith = asked.get("with");
const others = (askedWith === null ? "saturn-v:saturn-v" : askedWith).split(",").flatMap((key) => {
  const [rocket, variant] = key.split(":");
  const one = known(rocket, variant);
  return one ? [one] : [];
});
const room = () => Math.min(MOST, craftBudget());
const state = {
  craft: asked.get("craft") === "0" ? [] : [first, ...others].slice(0, room()),
  editing: 0,
  maker: ROCKETS[first.rocket].maker as MakerId,
  kind: kindOf(first.rocket) as PickerKind,
  query: "",
  asking: null as number | null,
  refused: "",
  chipNames: true,
  glass: null as number | null,
  look: ((LOOK_NAMES as readonly string[]).includes(address.get("look") ?? "") ? address.get("look") : "line") as LookName,
  background: address.get("background") || "earth",
  moon: address.get("moon") || "",
  place: (address.get("place") === "ground" ? "ground" : "float") as "ground" | "float",
  labels: address.get("labels") !== "off",
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
let skyBodies: SkyList | null = null;
let skyKey = "";
function syncSky() {
  const sky = byId("sky-back");
  const moons = byId("sky-moons");
  const credit = byId("sky-credit");
  if (state.background === "none" || state.background === "earth") {
    sky.hidden = true;
    moons.hidden = true;
    credit.hidden = true;
    skyKey = "";
    return;
  }
  const lang = (window as unknown as { uchusenLanguage?: { lang: string } }).uchusenLanguage?.lang === "ja" ? "ja" : "en";
  const form = state.look === "painted" && !realisticBarred ? "painted" : "line";
  const companions = skyBodies ? companionsFor(state.background, state.moon, (id) => skyBodies?.moonsOf(id) ?? []) : state.moon && state.moon !== "all" ? [state.moon] : [];
  const key = `${state.background}|${companions.join(",")}|${form}|${lang}`;
  if (key === skyKey) return;
  skyKey = key;
  placeSky(sky, moons, state.background, companions, form, lang, state.moon);
  credit.hidden = false;
  credit.textContent = "";
  void skyCredit(state.background, state.moon, form).then((text) => {
    if (skyKey !== key) return;
    credit.textContent = text.trim();
    credit.hidden = credit.textContent === "";
  });
}
function syncEarth() {
  byId("earth-credit").hidden = state.background !== "earth";
  syncSky();
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
  if (state.craft.length === 0) {
    address.set("craft", "0");
    address.set("with", "none");
  } else {
    address.set("craft", null);
    address.set("rocket", state.craft[0].rocket);
    address.set("variant", state.craft[0].variant);
    address.set("with", state.craft.slice(1).map((craft) => `${craft.rocket}:${craft.variant}`).join(",") || "none");
  }
  address.set("look", state.look);
  address.set("background", state.background);
  address.set("moon", state.moon);
  address.set("place", state.place);
  address.set("labels", state.labels ? "on" : "off");
}

function renderCraft() {
  const row = byId("cw-craft");
  const limit = room();
  const chips: HTMLElement[] = [];
  for (const [index, craft] of state.craft.entries()) {
    const name = variantFor(craft).name;
    const group = document.createElement("span");
    group.className = "cw-craft-chip";
    group.dataset.testid = `cw-craft-${index}`;
    group.tabIndex = 0;
    group.append(craftPicture(craft.rocket, craft.variant));
    const label = document.createElement("button");
    label.type = "button";
    label.className = "chip";
    label.textContent = `${index + 1}. ${name}`;
    label.hidden = !state.chipNames;
    label.setAttribute("aria-pressed", String(index === state.editing));
    label.addEventListener("click", () => edit(index));
    group.append(label);
    const remove = chip("×", `cw-remove-${index}`, () => askRemove(index));
    remove.classList.add("cw-remove");
    remove.setAttribute("aria-label", say("cmpRemove", { name }));
    group.append(remove);
    const glass = chip(say("cmpGlass"), `cw-glass-${index}`, () => {
      state.glass = state.glass === index ? null : index;
      renderGlass();
    });
    group.append(glass);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Delete") askRemove(index);
    });
    if (state.asking === index) {
      const ask = document.createElement("span");
      ask.className = "cw-ask";
      ask.dataset.testid = "cw-ask";
      ask.append(document.createTextNode(say("cmpAsk", { name })), chip(say("cmpYes"), "cw-remove-yes", confirmRemove), chip(say("cmpNo"), "cw-remove-no", cancelRemove));
      group.append(ask);
    }
    chips.push(group);
  }
  const count = document.createElement("p");
  count.dataset.testid = "cw-count";
  count.textContent = say("cmpCount", { n: state.craft.length, limit });
  chips.push(count);
  if (state.craft.length < limit) chips.push(chip(say("cmpAdd"), "cw-add", add));
  if (state.refused) {
    const note = document.createElement("p");
    note.dataset.testid = "cw-budget";
    note.textContent = state.refused;
    chips.push(note);
  }
  row.replaceChildren(...chips);
  byId("cw-chip-look").replaceChildren(
    chip(say("cmpNamed"), "cw-named", () => {
      state.chipNames = true;
      renderCraft();
    }, state.chipNames),
    chip(say("cmpPicture"), "cw-picture", () => {
      state.chipNames = false;
      renderCraft();
    }, !state.chipNames),
  );
  renderGlass();
}

function renderGlass() {
  const box = byId("cw-glass");
  const craft = state.glass === null ? undefined : state.craft[state.glass];
  box.hidden = !craft;
  box.replaceChildren();
  if (!craft) return;
  box.append(craftPicture(craft.rocket, craft.variant));
  const note = document.createElement("p");
  const variant = variantFor(craft);
  const height = isFleetVariant(variant) ? Math.round(fleetSize(variant).length) : variant.facts.height.value;
  note.textContent = typeof height === "number" ? `${variant.name}, ${height.toLocaleString("en-US")} m` : variant.name;
  box.append(note);
}

function renderPickers() {
  const editing = state.craft[state.editing];
  const listed = Object.values(ROCKETS).filter((rocket) => isListed(rocket.id));
  const kinds: PickerKind[] = ["rocket", "station", "fleet"];
  byId("kinds").replaceChildren(
    ...kinds.map((kind) => chip(say(kind === "rocket" ? "cmpKindRocket" : kind === "station" ? "cmpKindStation" : "cmpKindFleet"), `kind-${kind}`, () => pickKind(kind), kind === state.kind)),
  );
  const makers = (Object.keys(MAKERS) as MakerId[]).filter((maker) => listed.some((rocket) => rocket.maker === maker && kindOf(rocket.id) === state.kind));
  byId("makers").replaceChildren(...makers.map((maker) => chip(say(`maker_${maker}`), `maker-${maker}`, () => pickMaker(maker), maker === state.maker)));
  const query = state.query.trim().toLowerCase();
  const rockets = listed.filter((rocket) => rocket.maker === state.maker && kindOf(rocket.id) === state.kind && (query === "" || rocket.name.toLowerCase().includes(query)));
  byId("rockets").replaceChildren(
    ...rockets.map((rocket) => {
      const button = chip(rocket.name, `rocket-${rocket.id}`, () => toggleRocket(rocket.id), state.craft.some((craft) => craft.rocket === rocket.id));
      button.prepend(craftPicture(rocket.id, rocket.defaultVariant));
      return button;
    }),
  );
  const facts = byId("cw-facts");
  facts.replaceChildren();
  if (editing) {
    const variant = variantFor(editing);
    const height = isFleetVariant(variant) ? Math.round(fleetSize(variant).length) : variant.facts.height.value;
    const name = document.createElement("p");
    name.textContent = variant.name;
    const size = document.createElement("p");
    size.textContent = typeof height === "number" ? `${height.toLocaleString("en-US")} m` : say("noSource");
    const made = document.createElement("p");
    made.textContent = ROCKETS[editing.rocket].madeBy.value ?? "";
    facts.append(name, size, made);
  }
  byId("variants").replaceChildren(
    ...(editing ? ROCKETS[editing.rocket].variants.map((one) => chip(one.name, `variant-${one.id}`, () => pickVariant(one.id), one.id === editing.variant)) : []),
  );
  byId("places").replaceChildren(
    chip(say("cmpFloat"), "place-float", () => pickPlace("float"), state.place === "float"),
    chip(say("cmpGround"), "place-ground", () => pickPlace("ground"), state.place === "ground"),
  );
  byId("label-toggle").replaceChildren(
    chip(say("cmpLabelsOn"), "labels-on", () => pickLabels(true), state.labels),
    chip(say("cmpLabelsOff"), "labels-off", () => pickLabels(false), !state.labels),
  );
  byId("looks").replaceChildren(...LOOK_NAMES.map((look) => chip(say(`look_${look}`), `look-${look}`, () => pickLook(look), look === state.look)));
  drawSky();
}

function skyName(id: string): string {
  if (id === "none" || id === "earth" || id === "moon") return say(`background_${id}`);
  if (id === "all") return say("moonsAll");
  const lang = (window as unknown as { uchusenLanguage?: { lang: string } }).uchusenLanguage?.lang === "ja" ? "ja" : "en";
  return skyBodies?.name(id, lang) ?? id;
}
function skyButton(id: string, testid: string, on: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = id === "none" ? "thumb thumb-none" : "thumb";
  button.dataset.testid = testid;
  button.dataset.sky = id;
  button.setAttribute("aria-label", skyName(id));
  const dot = document.createElement("span");
  dot.className = "thumb-dot";
  const name = document.createElement("span");
  name.className = "thumb-name";
  name.textContent = skyName(id);
  button.append(dot, name);
  button.addEventListener("click", on);
  if ((id !== "all" && id === state.background) || (id === "all" && state.moon === "all") || (id !== "all" && id === state.moon)) button.setAttribute("aria-pressed", "true");
  return button;
}
function drawSky() {
  const order = skyBodies?.order ?? ["none", "earth"];
  const lang = (window as unknown as { uchusenLanguage?: { lang: string } }).uchusenLanguage?.lang === "ja" ? "ja" : "en";
  byId("backgrounds").replaceChildren(...order.map((id) => skyButton(id, `background-${id}`, () => pickBackground(id))));
  const moons = skyBodies && state.background !== "none" && state.background !== "sun" ? skyBodies.moonsOf(state.background) : [];
  const row = byId("moons");
  const heading = byId("moon-heading");
  heading.hidden = moons.length === 0;
  row.hidden = moons.length === 0;
  const planet = skyBodies?.name(state.background, lang) ?? "";
  heading.textContent = moons.length === 0 ? "" : say("moonsOf", { name: planet });
  row.replaceChildren(skyButton("all", "moon-all", () => pickMoon(state.moon === "all" ? "" : "all")), ...moons.map((id) => skyButton(id, `moon-${id}`, () => pickMoon(state.moon === id ? "" : id))));
  void paintThumbs(byId("backgrounds"), lang);
  void paintThumbs(row, lang);
}
void skyList().then((got) => {
  skyBodies = got;
  if (!got.known(state.background)) {
    state.background = "earth";
    state.moon = "";
  } else if (state.moon && state.moon !== "all" && !got.moonsOf(state.background).includes(state.moon)) state.moon = "";
  skyKey = "";
  drawSky();
  syncEarth();
});

function renderTable() {
  const head = document.createElement("tr");
  for (const text of ["", say("length"), say("madeBy")]) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = text;
    head.append(th);
  }
  const rows = state.craft.map((craft) => {
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
  if (!state.craft[0]) return;
  const max = variantFor(state.craft[0]).view?.tiltMax ?? 45;
  if (bar.getAttribute("tilt-max") !== String(max)) bar.setAttribute("tilt-max", String(max));
  if (Math.abs(bar.state.tilt) > max) bar.set({ tilt: Math.sign(bar.state.tilt) * max });
}

let framed = "";
function renderStage() {
  const list = shown();
  const empty = byId("cw-empty");
  if (list.length === 0) {
    hero.hidden = true;
    empty.hidden = false;
    return;
  }
  hero.hidden = false;
  empty.hidden = true;
  const [one, ...rest] = list;
  limitTilt();
  hero.setAttribute("rocket", one.rocket);
  hero.setAttribute("variant", one.variant);
  hero.setAttribute("show", "together");
  hero.setAttribute("look", state.look);
  hero.setAttribute("beside", rest.length ? rest.map((craft) => `${craft.rocket}:${craft.variant}`).join(",") : "off");
  if (state.place === "float") hero.setAttribute("float", "");
  else hero.removeAttribute("float");
  if (state.labels) hero.removeAttribute("names");
  else hero.setAttribute("names", "off");
  hero.setAttribute("scale-note", say("cmpPlinth"));
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
  const craft = state.craft[index];
  if (!craft) return;
  state.maker = ROCKETS[craft.rocket].maker;
  state.kind = kindOf(craft.rocket);
  renderAll();
}
function askRemove(index: number) {
  state.asking = index;
  renderCraft();
}
function cancelRemove() {
  state.asking = null;
  renderCraft();
}
function confirmRemove() {
  const index = state.asking;
  if (index === null) return;
  state.asking = null;
  state.craft.splice(index, 1);
  state.editing = Math.max(0, Math.min(state.editing, state.craft.length - 1));
  state.glass = null;
  const left = state.craft[state.editing];
  if (left) {
    state.maker = ROCKETS[left.rocket].maker;
    state.kind = kindOf(left.rocket);
  }
  renderAll();
}
function add() {
  if (state.craft.length >= room()) {
    state.refused = say("cmpBudget", { limit: room() });
    renderCraft();
    return;
  }
  state.refused = "";
  const taken = new Set(state.craft.map((craft) => `${craft.rocket}:${craft.variant}`));
  const next = NEXT.find((craft) => !taken.has(`${craft.rocket}:${craft.variant}`)) ?? NEXT[0];
  state.craft.push({ ...next });
  state.editing = state.craft.length - 1;
  state.maker = ROCKETS[next.rocket].maker;
  state.kind = kindOf(next.rocket);
  renderAll();
}
function pickKind(kind: PickerKind) {
  state.kind = kind;
  const makers = (Object.keys(MAKERS) as MakerId[]).filter((maker) => Object.values(ROCKETS).some((rocket) => rocket.maker === maker && isListed(rocket.id) && kindOf(rocket.id) === kind));
  if (!makers.includes(state.maker) && makers[0]) state.maker = makers[0];
  renderPickers();
}
function pickMaker(maker: MakerId) {
  state.maker = maker;
  const theirs = Object.values(ROCKETS).filter((rocket) => rocket.maker === maker && isListed(rocket.id) && kindOf(rocket.id) === state.kind);
  if (theirs.length === 1) return toggleRocket(theirs[0].id);
  renderPickers();
}
function toggleRocket(id: string) {
  const at = state.craft.findIndex((craft) => craft.rocket === id);
  if (at >= 0) return askRemove(at);
  if (state.craft.length >= room()) {
    state.refused = say("cmpBudget", { limit: room() });
    renderCraft();
    return;
  }
  state.refused = "";
  state.craft.push({ rocket: id, variant: ROCKETS[id].defaultVariant });
  state.editing = state.craft.length - 1;
  state.maker = ROCKETS[id].maker;
  state.kind = kindOf(id);
  renderAll();
}
function pickVariant(id: string) {
  const craft = state.craft[state.editing];
  if (!craft) return;
  state.craft[state.editing] = { rocket: craft.rocket, variant: id };
  renderAll();
}
function pickPlace(place: "ground" | "float") {
  state.place = place;
  renderAll();
}
function pickLabels(on: boolean) {
  state.labels = on;
  renderAll();
}
function pickLook(look: LookName) {
  state.look = look;
  renderAll();
}
function pickBackground(background: string) {
  state.background = background;
  state.moon = "";
  skyKey = "";
  renderAll();
}
function pickMoon(moon: string) {
  state.moon = moon;
  skyKey = "";
  renderAll();
}

phone.addEventListener("change", renderAll);
document.addEventListener("kazoku-languagechange", () => queueMicrotask(renderAll));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.asking !== null) cancelRemove();
});
const search = byId<HTMLInputElement>("cw-search");
search.placeholder = say("cmpSearch");
search.addEventListener("input", () => {
  state.query = search.value;
  renderPickers();
});
renderAll();
document.documentElement.dataset.ready = "true";
