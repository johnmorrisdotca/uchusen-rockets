// The demo page: a rocket large with its controls, a comparison to scale, the part builder, the parts alone and every source. Everything comes from the package's own entries.
import { builderState, check, flightOf, MAKERS, type MakerId, embedCode, embedNote, paintedCredit, rocketToParams, type RocketOptions, type Figure, figureWords, LOOK_NAMES, type LookName, MODEL_CREDITS, PART_ENTRIES, PLANNED_ROCKETS, ROCKETS, SLOT_NAMES, SOURCES, type SourceId, type Variant, VIEW_NAMES, type ViewName, showsOf, variantOf, creditLine, type CreditId, buildOf, playFrom } from "../src/index.ts";
import { besideBounds, besideLayout, craftName } from "../src/beside.ts";
import { canScale, SCALE_PERCENT, scalePercent } from "../src/concepts.ts";
import { dockMenu, dockPlan } from "../src/model/fleet/docked.ts";
import { motionNote, motionsOf } from "../src/model/fleet/motion.ts";
import { PICTURE_H, PICTURE_W } from "../src/framing.ts";
import { setAssetBase, setFlagLoader, type UchusenLineup, type UchusenRocket } from "../src/element.ts";
import { downloadBlob, svgToPng } from "@johnmorrisdotca/kazoku-ui/save-image";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/wide-layout/define";
import "@johnmorrisdotca/kazoku-ui/speed-buttons/define";
import { bindStage, placeZoom } from "./viewBinder.ts";
import "@johnmorrisdotca/kazoku-ui/embed-panel/define";
import type { EmbedPanelElement } from "@johnmorrisdotca/kazoku-ui/embed-panel/element";
import { hasLaunchStack, isSpacecraft } from "./craftKind.ts";
import { isListed } from "./listed.ts";
import { fleetSize, isFleetVariant, keyOf } from "./sizes.ts";
import { FLEET_KIT_ROCKETS } from "../src/data/fleet.ts";
import { KINDS, LABELS, packageKind, panelCode, pictureOf, SIZES, type Kind } from "./embed-code.ts";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import type { EarthForm, EarthShow } from "./earth.ts";
import { aimOrbit, applyTurn, companionsFor, frameSky, orbitCatalogue, paceFromStep, paceNamed, paceStep, paintThumbs, placeSky, setTurnPace, skyCredit, skyList, type SkyList } from "./sky.ts";
import { EARTH_ORBIT, groupKm, nearestOrbit, orbitOpen, orbitQuery, parseOrbitKm, type OrbitStep } from "./orbit.ts";
import { defineUchusenBuild, type UchusenBuild } from "../src/buildbar.ts";
import { WORDS } from "./words.js";
import { chip, fillEngines, fillLooks, fillParts, fillViews, PAGE_LOOK, partLabel } from "./chip.ts";
import { mountShipPicker, type ShipPickerElement } from "./pickerView.ts";
import { hasThrusters } from "../src/thrusters.ts";
import { chosenSwap, mountsOf, swapParts, swapQuery } from "../src/swap.ts";
import { separationOf } from "../src/separation.ts";

defineUchusenBuild();

setAssetBase(new URL("assets/", document.baseURI).href);
setFlagLoader(() => import("./flags.ts"));

const byId = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node as T;
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
};

type Chooser = { word(key: string): string | undefined; lang: string };
/** A word of the page in the language it is in now (the family's chooser), English where the chooser is not there or has none. */
const say = (key: string, values: Record<string, string | number> = {}): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return (chooser?.word(key) ?? WORDS.en[key] ?? key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
};
const japanese = () => document.documentElement.lang === "ja";
const slotWord = (slot: string) => (`slot_${slot}` in WORDS.en ? say(`slot_${slot}`) : (SLOT_NAMES[slot] ?? slot));
const showWord = partLabel;
/** The English name of a slot is what a builder row says; find the slot again to say it in the page's language. */
const slotOfName = new Map(Object.entries(SLOT_NAMES).map(([slot, name]) => [name, slot]));
const wordsKey = (text: string) => text.toLowerCase().replaceAll(" ", "_");
/** A source's own label (a size, a first-flight word) in the page's language when the page knows it. */
const knownWord = (prefix: string, text: string) => (`${prefix}_${wordsKey(text)}` in WORDS.en ? say(`${prefix}_${wordsKey(text)}`) : text);

const hero = byId<UchusenRocket>("hero");
const bar = byId<HTMLElement>("view-bar") as ViewControlsElement;
// The family's view controls turn, tip, zoom and move it; the rocket follows.
/** A size change calls `fit()` to hold the new ship. That is not the Fit button, so it must not turn true scale off or replace a concept's percent. */
let fittingForSize = false;
bindStage(hero, (detail) => {
  if (detail.reason === "fit" && !fittingForSize) setScale(false);
  hero.drive(detail);
  const zoom = Math.max(0.25, detail.zoom ?? 1);
  const sky = byId("sky-back");
  sky.dataset.viewZoom = String(zoom);
  const earth = document.getElementById("earth-back");
  if (earth instanceof HTMLElement) earth.dataset.viewZoom = String(zoom);
  const node = sky.querySelector("wakusei-body:not([data-moon])");
  if (node instanceof HTMLElement) frameSky(node, sky, zoom);
  else earth?.dispatchEvent(new Event("orbit"));
  drawTurn();
});
// The auto-turn is an introduction: the controls stop it after a minute (`autoplay-for`) and keep it idle while the view is out of sight, and the Play button starts it again.
const address = createAddressState({ defaults: { background: "none", moon: "", beside: "off", motion: "on", scale: "false", kscale: String(SCALE_PERCENT.default), rocket: "starship", variant: "v3", show: "together", look: PAGE_LOOK, view: "three-quarter", panel: "look", spin: "slow" } });
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
/** What can stand beside the craft on screen. `on` is Starship with Super Heavy, the one the address has always used. The others are the same real craft the fleet band lies down. */
const BESIDE_CHOICES: readonly { id: string; rocket: string; variant: string; testid: string; key?: string }[] = [
  { id: "on", rocket: "starship", variant: "v3", testid: "beside-on", key: "beside" },
  { id: "saturn-v:saturn-v", rocket: "saturn-v", variant: "saturn-v", testid: "beside-saturn-v" },
  { id: "sls:block-1", rocket: "sls", variant: "block-1", testid: "beside-sls" },
  { id: "iss:iss", rocket: "iss", variant: "iss", testid: "beside-iss" },
];
const scaleButton = document.createElement("button");
scaleButton.type = "button";
scaleButton.className = "chip";
scaleButton.dataset.testid = "true-scale";
scaleButton.dataset.say = "trueScale";
scaleButton.textContent = say("trueScale");
byId("turn").append(scaleButton);
function setScale(on: boolean): void {
  // A Kaminari concept's size is `scale` too, so turning the true-scale view off (every Fit does) gives the size back and does not write "false" over it.
  const size = canScale(address.get("rocket") ?? "starship", address.get("variant") ?? "v3") ? String(scalePercent(address.get("kscale"))) : "false";
  hero.setAttribute("scale", on ? "true" : size);
  scaleButton.setAttribute("aria-pressed", String(on));
  address.set("scale", on ? "true" : null);
}
scaleButton.addEventListener("click", () => setScale(hero.getAttribute("scale") !== "true"));
setScale(address.get("scale") === "true");
const PANELS = ["look", "background", "motion", "build", "lights", "thrusters", "docked"] as const;
type PanelName = (typeof PANELS)[number];

/** A tab is offered when its group has something for this craft. Lights stays hidden until a choice is put in `#lights-field`. Thrusters share that panel when Lights is already there, so the tab row does not grow a line. */
function panelOffered(name: PanelName): boolean {
  if (name === "motion") return !byId("motion-field").hidden;
  if (name === "build") return !byId("build-field").hidden;
  if (name === "lights" || name === "docked" || name === "thrusters") {
    const field = byId(name === "lights" ? "lights-field" : name === "thrusters" ? "thrusters-field" : "docked-field");
    const shown = !field.hidden && [...field.children].some((node) => !node.hasAttribute("hidden"));
    if (name === "thrusters" && shown && !byId("lights-field").hidden) return false;
    return shown;
  }
  return true;
}

/** One group at a time. The choice is `panel` in the address, and Look is left off it. Thrusters live in the lights group. */
function showPanels(): void {
  const asked = address.get("panel") ?? "look";
  const current: PanelName = (PANELS as readonly string[]).includes(asked) && panelOffered(asked as PanelName) ? (asked as PanelName) : "look";
  for (const name of PANELS) {
    const tab = document.querySelector(`[data-testid="panel-${name}"]`);
    const group = document.querySelector(`[data-panel="${name}"]`);
    const offered = panelOffered(name);
    if (tab instanceof HTMLButtonElement) {
      tab.hidden = !offered;
      tab.setAttribute("aria-selected", String(name === current));
    }
    if (group instanceof HTMLElement) group.hidden = name !== current && !(name === "lights" && current === "thrusters");
  }
  if (asked !== current) address.set("panel", current === "look" ? null : current);
}

for (const name of PANELS) {
  document.querySelector(`[data-testid="panel-${name}"]`)?.addEventListener("click", () => {
    if (!panelOffered(name)) return;
    address.set("panel", name === "look" ? null : name);
    showPanels();
  });
}
new MutationObserver(() => showPanels()).observe(byId("lights-field"), { attributes: true, attributeFilter: ["hidden"], childList: true });
new MutationObserver(() => showPanels()).observe(byId("thrusters-field"), { attributes: true, attributeFilter: ["hidden"], childList: true });
new MutationObserver(() => showPanels()).observe(byId("docked-field"), { attributes: true, attributeFilter: ["hidden"], childList: true });
const askedRocket = address.get("rocket") ?? "starship";
const firstRocket = Object.hasOwn(ROCKETS, askedRocket) ? askedRocket : "starship";
const askedMaker = new URLSearchParams(location.search).get("maker") ?? "";
const askedBeside = address.get("beside") ?? "off";
const state = { rocket: firstRocket, variant: address.get("variant") ?? "v3", maker: Object.hasOwn(MAKERS, askedMaker) ? (askedMaker as MakerId) : ROCKETS[firstRocket].maker, show: address.get("show") ?? "together", form: (address.get("form") === "space" ? "space" : "stack") as "stack" | "space", look: ((LOOK_NAMES as readonly string[]).includes(address.get("look") ?? "") ? address.get("look") : PAGE_LOOK) as LookName, view: ((VIEW_NAMES as readonly string[]).includes(address.get("view") ?? "") ? address.get("view") : "three-quarter") as ViewName, background: address.get("background") ?? "none", moon: address.get("moon") ?? "", beside: BESIDE_CHOICES.some((choice) => choice.id === askedBeside) ? askedBeside : null, kscale: scalePercent(address.get("kscale")), orbitKm: parseOrbitKm(address.get("orbit")) ?? 0, docked: address.get("docked") ?? dockPlan(firstRocket) };

/** The craft standing beside the one on screen, or nothing when the choice is off or is the craft itself. */
function besideNow(): { id: string; rocket: string; variant: string } | null {
  const choice = BESIDE_CHOICES.find((one) => one.id === state.beside);
  return choice && choice.rocket !== state.rocket ? choice : null;
}
if (state.background === "earth") state.orbitKm = nearestOrbit(state.orbitKm || EARTH_ORBIT[0].km, EARTH_ORBIT);

/** A rocket is thin: the controls hold a pan so that a quarter of it stays in view. Its size on the screen: the picture is as wide as the box and a third taller, and the framing leaves 8% round the rocket. */
function sizeObject() {
  const variant = variantOf(state.rocket, state.variant);
  const box = hero.getBoundingClientRect();
  const size = canScale(state.rocket, state.variant) ? state.kscale / 100 : 1;
  const height = state.show === "together" ? variant?.facts.height.value : state.show === "apart" ? null : variant?.facts.parts[state.show]?.value;
  const diameter = variant?.facts.diameter.value;
  if (!box.width || typeof height !== "number" || typeof diameter !== "number") return bar.removeAttribute("object-size");
  // with a real craft beside it the picture holds both
  const chosenBeside = besideNow();
  const beside = chosenBeside ? variantOf(chosenBeside.rocket, chosenBeside.variant)?.facts : null;
  const craft: Parameters<typeof besideBounds>[0] = { min: [(-diameter * size) / 2, 0, (-diameter * size) / 2], max: [(diameter * size) / 2, height * size, (diameter * size) / 2] };
  const both = beside && typeof beside.height.value === "number" && typeof beside.diameter.value === "number" ? besideBounds(craft, besideLayout(craft, { min: [-beside.diameter.value / 2, 0, 0], max: [beside.diameter.value / 2, beside.height.value, 0] }).bounds) : craft;
  const width = both.max[0] - both.min[0];
  const tall = both.max[1];
  const scale = Math.min(box.width / width, (box.width * 4) / 3 / tall) / 1.08;
  bar.setAttribute("object-size", `${Math.round(width * scale)},${Math.round(tall * scale)}`);
}
new ResizeObserver(sizeObject).observe(hero);

/** A chip. `say` is the key of its words where the family's chooser should keep them up to date. */
const press = (group: HTMLElement, chosen: string) => {
  for (const button of group.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === chosen));
};

/** One row of modules for each hardpoint the ship can change. The choice stays in the address. */
function drawSwaps(): void {
  const mounts = mountsOf(state.rocket);
  byId("swap-field").hidden = mounts.length === 0;
  const box = byId("swaps");
  box.replaceChildren();
  if (mounts.length === 0) return;
  const chosen = chosenSwap(state.rocket, state.variant, address.get("swap"));
  for (const mount of mounts) {
    const row = el("div", { className: "chips" });
    row.dataset.slot = mount.slot;
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", say(`swapSlot_${mount.slot}`));
    for (const one of mount.choices) {
      row.append(chip(one.name, `swap-${mount.slot}-${one.id}`, () => {
        address.set("swap", swapQuery(state.rocket, state.variant, { ...chosen, [mount.slot]: one.id }));
        renderMain();
      }, `swap_${one.id}`));
    }
    press(row, `swap-${mount.slot}-${chosen[mount.slot]}`);
    box.append(row);
  }
}

/** Slides the planned module clear of the ship. The distance stays in the address. */
function applyLeave(): void {
  const plan = separationOf(state.rocket);
  const field = byId("leave-field");
  field.hidden = plan === null;
  const range = byId<HTMLInputElement>("leave-range");
  if (!plan) {
    if (address.get("leave")) address.set("leave", null);
    hero.removeAttribute("leave");
    return;
  }
  const reason = byId("leave-reason");
  reason.dataset.say = plan.reason;
  reason.textContent = say(plan.reason);
  range.setAttribute("aria-label", say("leaveTitle"));
  const at = Math.min(1, Math.max(0, Number(address.get("leave") ?? "0") || 0));
  if (document.activeElement !== range) range.value = String(at);
  if (at > 0) hero.setAttribute("leave", `${plan.slot}:${at.toFixed(2)}`);
  else hero.removeAttribute("leave");
}

byId<HTMLInputElement>("leave-range").addEventListener("input", () => {
  const value = Number(byId<HTMLInputElement>("leave-range").value);
  address.set("leave", value > 0 ? value.toFixed(2) : null);
  applyLeave();
});

/** Puts the address's modules on the ship. A choice that is already the variant is dropped. */
function applySwap(): void {
  const raw = address.get("swap");
  const parts = swapParts(state.rocket, state.variant, raw);
  if (raw && !parts) address.set("swap", null);
  const next = parts ? { rocket: state.rocket, variant: state.variant, parts } : null;
  if (JSON.stringify(hero.description) !== JSON.stringify(next)) hero.description = next;
  drawSwaps();
}

const metres = (value: number) => `${value} m`;

/** A blank figure says why in its own English; the one blank the page words itself, "No source", is said in the page's language. */
const blankWords = (figure: Figure<number | string> | undefined) => (!figure?.brief ? say("noSource") : figureWords(figure));

const sizeFigure = (variant: Variant, pick: "length" | "beam" | "height"): Figure<number | string> => (isFleetVariant(variant) ? { value: Math.round(fleetSize(variant)[pick]), source: variant.facts.height.source, note: undefined } : { value: null, source: null, brief: say("compareNotFleet") });

function figureCell(figure: Figure<number | string> | undefined, unit: (v: number) => string = metres, plain = false): HTMLElement {
  const cell = el("td");
  if (!figure || figure.value === null) {
    cell.append(el("span", { className: "blank", textContent: blankWords(figure) }));
    if (figure?.note) cell.append(el("span", { className: "src", textContent: figure.note }));
    return cell;
  }
  cell.append(el("span", { className: "value", textContent: typeof figure.value === "number" ? unit(figure.value) : figure.value }));
  if (figure.brief) cell.append(el("span", { className: "brief", textContent: `, ${figure.brief}` }));
  // the SPX fleet is this package's own design, not something read from outside: it says SPX, with no date read, and a maker's line says it once
  const own = figure.source?.startsWith("uchusen-") === true;
  if (figure.source && !(own && plain)) {
    const source = SOURCES[figure.source];
    const link = el("a", { href: source.url, textContent: own ? "SPX" : `${source.publisher}${figure.date ? `, ${figure.date}` : source.date ? `, ${say("read", { date: source.date })}` : ""}`, rel: "noopener" });
    cell.append(el("span", { className: "src" }, link));
  }
  if (figure.note) cell.append(el("span", { className: "src", textContent: figure.note }));
  for (const other of figure.others ?? []) cell.append(el("span", { className: "other", textContent: `${SOURCES[other.source].publisher}: ${typeof other.value === "number" ? unit(other.value) : other.value}. ${other.note}` }));
  return cell;
}

function factsFor(variant: Variant): HTMLElement[] {
  const show = state.show;
  const name = showWord;
  // a row is found by its English label, whatever language it is said in
  const rows2: [string, string, Figure<number | string> | undefined][] = [];
  const fleet = isFleetVariant(variant) && !Object.hasOwn(FLEET_KIT_ROCKETS, variant.rocket) && variant.rocket !== "fleet-insets-ship-03";
  if (fleet && (show === "together" || show === "apart")) rows2.push(["Length", say("length"), sizeFigure(variant, "length")], ["Beam", say("beam"), sizeFigure(variant, "beam")], ["Height", say("heightStowed"), sizeFigure(variant, "height")]);
  else if (show === "together" || show === "apart") {
    rows2.push(["Whole height", say("wholeHeight"), variant.facts.height]);
    // a ship of many modules has its heights in the apart view and its parts list, not a row each: the facts stay on the screen
    if (variant.slots.length <= 12) for (const slot of variant.slots) rows2.push([`${SLOT_NAMES[slot] ?? slot} height`, say("partHeight", { name: name(slot) }), variant.facts.parts[slot]]);
  } else if (variant.heightLabel && variant.slots.length === 1 && show === variant.slots[0]) rows2.push([variant.heightLabel, knownWord("heightLabel", variant.heightLabel), variant.facts.parts[show]]);
  else rows2.push([`${SLOT_NAMES[show] ?? show} height`, say("partHeight", { name: name(show) }), variant.facts.parts[show]]);
  if (!fleet || (show !== "together" && show !== "apart")) rows2.push(["Diameter", say("diameter"), variant.facts.diameter]);
  for (const [label, figure] of Object.entries(variant.facts.sizes ?? {})) rows2.push([label, knownWord("size", label), figure]);
  // a part with no engines of its own has no row for them
  for (const slot of show === "together" || show === "apart" ? variant.slots : [show]) if (variant.facts.engines[slot]) rows2.push([`${SLOT_NAMES[slot] ?? slot} engines`, say("partEngines", { name: name(slot) }), variant.facts.engines[slot]]);
  rows2.push([variant.firstWord ?? "First flew", knownWord("first", variant.firstWord ?? "First flew"), variant.firstFlight]);
  if (ROCKETS[variant.rocket].madeBy.value !== null) rows2.push(["Made by", say("madeBy"), ROCKETS[variant.rocket].madeBy]);
  const table = el("table", { className: "sizes" });
  for (const [key, label, figure] of rows2) {
    const row = el("tr");
    row.append(el("th", { scope: "row", textContent: label }), figureCell(figure, metres, key === "Made by"));
    row.dataset.row = key;
    table.append(row);
  }
  const heading = el("h3", { textContent: show === "together" || show === "apart" ? variant.name : `${name(show)}: ${variant.name}` });
  const out: HTMLElement[] = [heading, table];
  if (variant.note) out.push(el("p", { className: "note", textContent: variant.note }));
  return out;
}

const credit = byId("credit");
const creditsFor = (variant: Variant) => check({ rocket: variant.rocket, variant: variant.id }).credits;

// ------------------------------------------------------------- the Earth behind it: nothing of it is loaded or runs until it is chosen
const earthHolder = byId("earth-back");
let earthShown: EarthShow | null = null;
let earthForm: EarthForm | null = null;
let earthAsked = 0;
/** No WebGL here, or a picture would not load: the line globe needs neither. */
let realisticBarred = false;
hero.addEventListener("uchusen-slot", (event) => {
  const slot = (event as CustomEvent<string>).detail;
  const row = document.querySelector(`[data-slot="${slot}"]`);
  if (!(row instanceof HTMLElement)) return;
  for (const one of document.querySelectorAll("[data-slot]")) one.removeAttribute("data-picked");
  row.dataset.picked = "on";
});
hero.addEventListener("uchusen-fallback", () => {
  realisticBarred = true;
  syncEarth();
});
let skyKey = "";
let skyBodies: SkyList | null = null;
type OrbitFacts = { steps: OrbitStep[]; moons: { id: string; km: number }[] };
const orbitCache = new Map<string, OrbitFacts>();
const orbitPending = new Set<string>();
let orbitAnimate = false;
let moonOpensOrbit = state.moon !== "" && parseOrbitKm(address.get("orbit")) === null;
const factsNow = (): OrbitFacts => (state.background === "earth" ? { steps: EARTH_ORBIT.map((step) => ({ ...step })), moons: [{ id: "moon", km: 384400 }] } : (orbitCache.get(state.background) ?? { steps: [], moons: [] }));
const visibleMoonIds = (): string[] => {
  const facts = factsNow();
  const km = state.orbitKm || facts.steps[0]?.km || 0;
  return facts.moons.filter((moon) => moon.km <= km).map((moon) => moon.id);
};
const orbitLabel = (step: OrbitStep, earth: boolean) => (step.name === "low" ? say("orbitLow") : step.name === "moon" ? say("orbitMoon") : step.name === "geo" && earth ? say("orbitGeo") : say("orbitKm", { km: groupKm(step.km) }));
function drawOrbitButtons() {
  const facts = state.background === "none" ? { steps: [] as OrbitStep[], moons: [] } : factsNow();
  const row = byId("orbits");
  const heading = byId("orbit-heading");
  const note = byId("orbit-altitude");
  const show = facts.steps.length > 0;
  row.hidden = !show;
  heading.hidden = !show;
  note.hidden = !show;
  if (!show) {
    row.replaceChildren();
    return;
  }
  row.replaceChildren(
    ...facts.steps.map((step) => {
      const button = chip(orbitLabel(step, state.background === "earth"), `orbit-${step.km}`, () => pick({ orbitKm: step.km }));
      button.dataset.km = String(step.km);
      return button;
    }),
  );
  press(row, `orbit-${state.orbitKm}`);
  note.dataset.km = String(state.orbitKm);
  note.textContent = say("orbitNow", { km: groupKm(state.orbitKm) });
}
function settleOrbit(animate: boolean) {
  const facts = factsNow();
  if (facts.steps.length === 0) return;
  if (moonOpensOrbit) {
    moonOpensOrbit = false;
    const chosen = state.moon === "all" ? facts.moons : facts.moons.filter((moon) => moon.id === state.moon);
    const far = chosen.reduce((best, moon) => (moon.km > best ? moon.km : best), 0);
    if (far > state.orbitKm) state.orbitKm = far;
  }
  state.orbitKm = nearestOrbit(state.orbitKm || facts.steps[0].km, facts.steps);
  address.set("orbit", orbitQuery(state.orbitKm, facts.steps));
  drawOrbitButtons();
  const holder = state.background === "earth" ? earthHolder : byId("sky-back");
  holder.dataset.altitude = String(state.orbitKm);
  aimOrbit(orbitOpen(state.orbitKm, facts.steps), holder, animate);
}
function ensureOrbit(body: string, animate: boolean) {
  if (body === "none" || body === "earth" || orbitCache.has(body) || orbitPending.has(body)) return;
  orbitPending.add(body);
  void orbitCatalogue(body).then((facts) => {
    orbitPending.delete(body);
    orbitCache.set(body, facts);
    if (state.background !== body) return;
    settleOrbit(animate);
    skyKey = "";
    syncSky();
  });
}
/** One body at a time, from wakusei-planets. The Earth keeps the picture it already had. */
function syncSky() {
  if (state.background !== "none" && state.background !== "earth" && !orbitCache.has(state.background)) {
    ensureOrbit(state.background, orbitAnimate);
    return;
  }
  const lang = japanese() ? "ja" : "en";
  const painted = state.background !== "none" && state.look === "painted" && !realisticBarred;
  const form = painted ? "painted" : "line";
  const chosen = skyBodies ? companionsFor(state.background, state.moon, (id) => skyBodies?.moonsOf(id) ?? []) : state.moon && state.moon !== "all" ? [state.moon] : [];
  const companions = [...chosen];
  for (const id of visibleMoonIds()) if (!companions.includes(id)) companions.push(id);
  const key = `${state.background}|${companions.join(",")}|${form}|${lang}`;
  const credit = byId("sky-credit");
  const showCredit = state.background !== "none";
  if (key === skyKey) return;
  skyKey = key;
  placeSky(byId("sky-back"), byId("sky-moons"), state.background, companions, form, lang, state.moon);
  credit.hidden = !showCredit;
  credit.textContent = "";
  if (!showCredit) return;
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

/** How far the view may be tipped follows the craft: the controls' slider and drag take the limit, and a tip beyond it, or one the address asked for before the craft was known, is brought to it. */
let askedTilt = Number(new URLSearchParams(location.search).get("tilt")) || 0;
function limitTilt(max: number) {
  if (bar.getAttribute("tilt-max") !== String(max)) bar.setAttribute("tilt-max", String(max));
  const tilt = askedTilt || bar.state.tilt;
  askedTilt = 0;
  if (Math.abs(tilt) > max || tilt !== bar.state.tilt) bar.set({ tilt: Math.max(-max, Math.min(max, tilt)) });
}

function renderMain() {
  const rocket = ROCKETS[state.rocket];
  if (!rocket.variants.some((one) => one.id === state.variant)) state.variant = rocket.defaultVariant;
  const variant = variantOf(state.rocket, state.variant) as Variant;
  const variantBox = byId("variants");
  variantBox.replaceChildren(...rocket.variants.map((one) => chip(one.name, `variant-${one.id}`, () => pick({ variant: one.id }))));
  drawMakers();
  const shows = showsOf(variant.slots);
  if (!shows.includes(state.show)) state.show = shows[0];
  const showBox = byId("shows");
  // a ship of dozens of parts would fill the page with chips: it gets together, apart and one menu for the rest
  const MANY = 16;
  const listed = shows.length > MANY ? shows.slice(0, 2) : shows;
  fillParts(showBox, listed, state.show, (show) => pick({ show }));
  if (shows.length > MANY) {
    const rest = shows.slice(2);
    const menu = el("select", { className: "chip", ariaLabel: "Show one part alone" }) as HTMLSelectElement;
    menu.dataset.testid = "show-menu";
    menu.append(el("option", { value: "", textContent: "One part alone..." }));
    for (const show of rest) menu.append(el("option", { value: show, textContent: showWord(show) }));
    menu.value = rest.includes(state.show) ? state.show : "";
    menu.addEventListener("change", () => (menu.value ? pick({ show: menu.value }) : pick({ show: shows[0] })));
    showBox.append(menu);
  }
  press(showBox, `show-${state.show}`);
  press(byId("variants"), `variant-${state.variant}`);
  press(byId("looks"), `look-${state.look}`);
  press(byId("forms"), `form-${state.form}`);
  // a lone craft has no stack that leaves it, so "Launch stack" and "In space" would be the same picture
  (byId("forms").closest(".field") as HTMLElement).hidden = !hasLaunchStack(state.rocket, state.variant);
  press(byId("views"), `view-${state.view}`);
  drawSkyButtons();
  limitTilt(variant.view?.tiltMax ?? 45);
  (byId("turn").querySelector('[data-testid="compare-open"]') as HTMLAnchorElement).href = `compare.html?${new URLSearchParams({ rocket: state.rocket, variant: state.variant })}`;
  hero.setAttribute("rocket", state.rocket);
  hero.setAttribute("variant", state.variant);
  applySwap();
  applyLeave();
  hero.setAttribute("show", state.show);
  hero.setAttribute("look", state.look);
  if (state.form === "space") hero.setAttribute("form", "space");
  else hero.removeAttribute("form");
  hero.setAttribute("view", state.view);
  // a craft is not offered beside itself: Starship's own chip stays "Beside it", and the other three are Saturn V, SLS and the ISS
  const chosen = besideNow();
  for (const choice of BESIDE_CHOICES) {
    const button = byId("beside").querySelector(`[data-testid="${choice.testid}"]`);
    if (button) (button as HTMLElement).hidden = choice.rocket === state.rocket;
  }
  byId("beside-field").hidden = BESIDE_CHOICES.every((choice) => choice.rocket === state.rocket);
  hero.setAttribute("beside", chosen ? chosen.id : "off");
  const note = byId("beside-note");
  note.hidden = !chosen;
  if (chosen?.id === "on") {
    note.dataset.say = "besideNote";
    note.textContent = say("besideNote");
  } else if (chosen) {
    delete note.dataset.say;
    const tall = variantOf(chosen.rocket, chosen.variant)?.facts.height.value;
    note.textContent = craftName({ rocket: chosen.rocket, variant: chosen.variant }, typeof tall === "number" ? tall : 0);
  }
  press(byId("beside"), chosen ? (BESIDE_CHOICES.find((choice) => choice.id === chosen.id)?.testid ?? "") : "");
  showMotion();
  showDocked();
  showLights();
  showThrusters();
  // the Kaminari concepts take a size, 60 to 100 per cent. scale="true" is the true-scale view, kept in the address apart from that size; a redraw must not clear it.
  const sizeHere = canScale(state.rocket, state.variant);
  byId("kscale-field").hidden = !sizeHere;
  if (address.get("scale") === "true") hero.setAttribute("scale", "true");
  else if (sizeHere) hero.setAttribute("scale", String(state.kscale));
  else hero.removeAttribute("scale");
  byId<HTMLInputElement>("kscale").value = String(state.kscale);
  byId("kscale-out").textContent = `${state.kscale}%`;
  const full = variant.facts.height.value;
  byId("kscale-note").hidden = !sizeHere;
  if (sizeHere && typeof full === "number") byId("kscale-note").textContent = say("kscaleNote", { percent: state.kscale, length: Math.round((full * state.kscale) / 100).toLocaleString("en-US") });
  byId("facts").replaceChildren(...factsFor(variant));
  byId("flight-field").classList.toggle("has-flight", flightOf(state.rocket, state.variant) !== null);
  const built = buildOf(state.variant) ?? null;
  const buildBar = byId<UchusenBuild>("build-bar");
  byId("build-field").hidden = built === null;
  const showProgress = (at: number) => {
    address.set("build", at > 0 ? "on" : null);
    address.set("at", at > 0 ? at.toFixed(4) : null);
    if (built) hero.setAttribute("progress", at.toFixed(4));
    else hero.removeAttribute("progress");
    const fit = (hero.shadowRoot?.querySelector("canvas")?.dataset.fitout ?? "").split(" ")[0] ?? "";
    buildBar.stage = fit === "sealed" ? say("buildSealed") : fit === "air" ? say("buildAir") : fit === "pressure" ? say("buildPressure") : fit === "spin" ? say("buildSpin") : "";
  };
  buildBar.onMove = showProgress;
  buildBar.onRepeat = (on) => address.set("repeat", on ? "on" : null);
  if (buildBar.dataset.repeatReady !== "yes") {
    buildBar.dataset.repeatReady = "yes";
    buildBar.repeat = new URLSearchParams(location.search).get("repeat") === "on";
  }
  if (buildBar.dataset.forVariant !== state.variant) {
    const previous = buildBar.dataset.forVariant ?? "";
    buildBar.dataset.forVariant = state.variant;
    buildBar.steps = built;
    if (built) {
      const asked = playFrom(new URLSearchParams(location.search));
      if (asked.on) {
        buildBar.at = asked.at;
        hero.setAttribute("progress", asked.at.toFixed(4));
      } else hero.removeAttribute("progress");
    } else if (previous) {
      address.set("build", null);
      address.set("at", null);
      hero.removeAttribute("progress");
    }
  }
  credit.hidden = state.look !== "painted";
  const credits = creditsFor(variant);
  if (credits.length) {
    credit.replaceChildren(
      ...credits.flatMap((c) => [
        el(
          "span",
          { className: "one-credit" },
          say(c.usedFor.length > 1 ? "creditAll" : "creditPart"),
          el("a", { href: c.sourceUrl, textContent: c.title, rel: "noopener" }),
          say("creditBy"),
          el("a", { href: c.creatorUrl, textContent: c.creator, rel: "noopener" }),
          ", ",
          el("a", { href: c.licenceUrl, textContent: c.licence, rel: "noopener" }),
          `. ${c.changes}`,
        ),
      ]),
    );
  } else credit.textContent = say("creditOwn");
  drawEmbed();
  syncEarth();
  sizeObject();
  byId("lights-field").hidden = !state.rocket.startsWith("fleet-");
  byId("thrusters-field").hidden = !hasThrusters(state.rocket);
  showPanels();
  shipPicker?.sync({ rocket: state.rocket, variant: state.variant });
}

/** The maker's row, and in the rocket's row only that maker's rockets. */
function drawMakers() {
  press(byId("makers"), `maker-${state.maker}`);
  press(byId("rockets"), `rocket-${state.rocket}`);
  press(byId("crafts"), `rocket-${state.rocket}`);
  // the lone spacecraft have their own row under the Rocket row, so a launcher is never mistaken for one
  for (const group of [byId("rockets"), byId("crafts")]) {
    for (const button of group.querySelectorAll("button")) {
      const id = (button.dataset.testid ?? "").replace("rocket-", "");
      button.hidden = ROCKETS[id]?.maker !== state.maker || !isListed(id);
    }
  }
  byId("craft-field").hidden = [...byId("crafts").querySelectorAll("button")].every((button) => button.hidden);
  // the address has the rocket, and the maker only when it is not that rocket's own
  address.set("maker", state.maker === ROCKETS[state.rocket].maker ? null : state.maker);
}

function pick(change: Partial<typeof state>) {
  // A new craft, variant or view is a new picture: zoom and pan go back to Fit. The angle stays, except a new view, which is itself the angle. A page opened at a zoom (a shared link) is left as it was until one of these changes.
  const craft = (change.rocket !== undefined && change.rocket !== state.rocket) || (change.variant !== undefined && change.variant !== state.variant) || (change.form !== undefined && change.form !== state.form);
  const viewChanged = change.view !== undefined && change.view !== state.view;
  if (viewChanged) bar.set({ yaw: 0, tilt: 0, zoom: 1, panX: 0, panY: 0 });
  else if (craft) bar.set({ zoom: 1, panX: 0, panY: 0 });
  let orbitChanged = change.orbitKm !== undefined || change.background !== undefined;
  if (change.moon && change.orbitKm === undefined) {
    const moons = factsNow().moons;
    const chosen = change.moon === "all" ? moons : moons.filter((moon) => moon.id === change.moon);
    const far = chosen.reduce((best, moon) => (moon.km > best ? moon.km : best), 0);
    if (far > 0) {
      change = { ...change, orbitKm: far };
      orbitChanged = true;
    }
  }
  Object.assign(state, change);
  if (change.rocket) state.maker = ROCKETS[change.rocket].maker;
  if (change.rocket !== undefined && change.docked === undefined) state.docked = dockPlan(state.rocket);
  if (change.background !== undefined && change.moon === undefined) state.moon = "";
  if (change.background !== undefined && change.orbitKm === undefined) state.orbitKm = 0;
  if (change.background !== undefined) address.set("background", state.background);
  if (change.background !== undefined || change.moon !== undefined) address.set("moon", state.moon ? state.moon : null);
  if (change.beside !== undefined) {
    address.set("beside", state.beside ?? "off");
    // both craft are to be in the picture
    if (hero.getAttribute("scale") !== "true") bar.fit();
  }
  if (change.kscale !== undefined) address.set("kscale", String(state.kscale));
  if (orbitChanged) orbitAnimate = true;
  renderMain();
  if (orbitChanged) {
    if (state.background === "none") {
      address.set("orbit", null);
      drawOrbitButtons();
    } else if (state.background === "earth" || orbitCache.has(state.background)) settleOrbit(true);
    orbitAnimate = false;
  }
  // the ship is a new size: Fit holds it, and Starship beside it, again. This fit is the camera, not the Fit button.
  if (change.kscale !== undefined) {
    fittingForSize = true;
    bar.fit();
    fittingForSize = false;
  }
  address.set("rocket", state.rocket);
  address.set("variant", state.variant);
  address.set("show", state.show);
  address.set("look", state.look);
  address.set("form", state.form === "space" ? "space" : null);
  address.set("view", state.view);
}

/** A maker with one rocket has one answer, and it is chosen for the reader; otherwise the rocket on screen stays until another is pressed. */
function pickMaker(maker: MakerId) {
  const theirs = Object.values(ROCKETS).filter((rocket) => rocket.maker === maker && isListed(rocket.id));
  if (theirs.length === 1) {
    if (state.rocket !== theirs[0].id) pick({ rocket: theirs[0].id, variant: theirs[0].defaultVariant });
    return;
  }
  state.maker = maker;
  drawMakers();
}

let shipPicker: ShipPickerElement | undefined;
const stageBox = document.querySelector<HTMLElement>(".stage-box .view-space");
if (stageBox) shipPicker = mountShipPicker(stageBox, { rocket: state.rocket, variant: state.variant }, (choice) => pick(choice));
byId("makers").append(...(Object.keys(MAKERS) as MakerId[]).map((maker) => chip(MAKERS[maker], `maker-${maker}`, () => pickMaker(maker), `maker_${maker}`)));
for (const rocket of Object.values(ROCKETS)) byId(isSpacecraft(rocket.id) ? "crafts" : "rockets").append(chip(rocket.name, `rocket-${rocket.id}`, () => pick({ rocket: rocket.id, variant: rocket.defaultVariant })));
byId("forms").append(chip(WORDS.en.cmpStack, "form-stack", () => pick({ form: "stack" }), "cmpStack"), chip(WORDS.en.cmpSpace, "form-space", () => pick({ form: "space" }), "cmpSpace"));
fillLooks(byId("looks"), state.look, (look) => pick({ look: look as LookName }));
fillViews(byId("views"), state.view, (view) => pick({ view: view as ViewName }));
const skyButton = (id: string, testid: string, on: () => void): HTMLButtonElement => {
  const button = el("button", { type: "button", className: id === "none" ? "thumb thumb-none" : "thumb" });
  button.dataset.testid = testid;
  button.dataset.sky = id;
  const named = id === "none" || id === "earth" || id === "moon" ? say(`background_${id}`) : id === "all" ? say("moonsAll") : (skyBodies?.name(id, japanese() ? "ja" : "en") ?? id);
  button.setAttribute("aria-label", named);
  button.append(el("span", { className: "thumb-dot" }), el("span", { className: "thumb-name", textContent: named }));
  button.addEventListener("click", on);
  return button;
};
const drawSkyButtons = () => {
  const order = skyBodies?.order ?? ["none", "earth"];
  const lang = japanese() ? "ja" : "en";
  byId("backgrounds").replaceChildren(...order.map((id) => skyButton(id, `background-${id}`, () => pick({ background: id }))));
  const moons = skyBodies && state.background !== "none" && state.background !== "sun" ? skyBodies.moonsOf(state.background) : [];
  const row = byId("moons");
  const heading = byId("moon-heading");
  const planet = skyBodies?.name(state.background, lang) ?? "";
  row.hidden = moons.length === 0;
  heading.hidden = moons.length === 0;
  heading.textContent = moons.length === 0 ? "" : say("moonsOf", { name: planet });
  row.setAttribute("aria-label", heading.textContent);
  row.replaceChildren(skyButton("all", "moon-all", () => pick({ moon: state.moon === "all" ? "" : "all" })), ...moons.map((id) => skyButton(id, `moon-${id}`, () => pick({ moon: state.moon === id ? "" : id }))));
  press(byId("backgrounds"), `background-${state.background}`);
  press(row, state.moon ? `moon-${state.moon}` : "");
  void paintThumbs(byId("backgrounds"), lang);
  void paintThumbs(row, lang);
  drawOrbitButtons();
};
drawSkyButtons();
void skyList().then((got) => {
  skyBodies = got;
  if (!got.known(state.background)) {
    state.background = "none";
    state.moon = "";
  } else if (state.moon && state.moon !== "all" && !got.moonsOf(state.background).includes(state.moon)) state.moon = "";
  skyKey = "";
  drawSkyButtons();
  syncEarth();
});

byId("beside").append(
  ...BESIDE_CHOICES.map((choice) => chip(variantOf(choice.rocket, choice.variant)?.name ?? choice.rocket, choice.testid, () => pick({ beside: state.beside === choice.id ? null : choice.id }), choice.key)),
);
// the size slider: the number follows the thumb at once, and the ship is rebuilt at the size when it is let go
byId<HTMLInputElement>("kscale").addEventListener("input", (event) => (byId("kscale-out").textContent = `${scalePercent((event.target as HTMLInputElement).value)}%`));
byId<HTMLInputElement>("kscale").addEventListener("change", (event) => pick({ kscale: scalePercent((event.target as HTMLInputElement).value) }));

// ------------------------------------------------------------- which way it turns
// The family's controls turn it at their `speed` times the speed buttons' `pace` (0.5×, 1×, 2×): positive takes the near side to the right, negative to the left. A press changes the way at once, from where it is, and starts the turn if it had stopped.
const TURN_SPEED = 5;
const turnBox = byId("turn");
const TURN_FOR_MS = 60_000;
let turnTimer = 0;
let turnWay: "left" | "right" = "right";
function drawTurn() {
  const turning = bar.state.turning;
  for (const way of ["left", "right"] as const) {
    const button = turnBox.querySelector<HTMLButtonElement>(`[data-testid="turn-${way}"]`);
    const pressed = String(turning && turnWay === way);
    if (button && button.getAttribute("aria-pressed") !== pressed) button.setAttribute("aria-pressed", pressed);
  }
}
function turnTo(way: "left" | "right") {
  turnWay = way;
  bar.setAttribute("speed", String(way === "left" ? -TURN_SPEED : TURN_SPEED));
  if (!bar.state.turning) bar.play();
  // a turn someone asked for ends too, as the first one does: a tab left open draws nothing for ever
  window.clearTimeout(turnTimer);
  turnTimer = window.setTimeout(() => bar.pause(), TURN_FOR_MS);
  drawTurn();
  drawEmbed();
}
turnBox.append(chip("Turn left", "turn-left", () => turnTo("left"), "turnLeft"), chip("Turn right", "turn-right", () => turnTo("right"), "turnRight"));
// any craft can be taken to the wide page to stand beside another
const compareLink = el("a", { className: "chip compare-open", href: "compare.html", textContent: say("cmpOpen") });
compareLink.dataset.testid = "compare-open";
compareLink.dataset.say = "cmpOpen";
turnBox.append(compareLink);
// the speed buttons write the speed to the bar's `pace`
new MutationObserver(() => drawEmbed()).observe(bar, { attributes: true, attributeFilter: ["pace"] });

// ------------------------------------------------------------- the engines
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const enginesBox = byId("engines");
function lightEngines(on: boolean) {
  hero.setAttribute("engines", on ? "on" : "off");
  press(enginesBox, `engines-${on ? "on" : "off"}`);
  const note = byId("engines-note");
  note.hidden = !(on && reducedMotion);
  note.textContent = say("enginesNote");
  drawEmbed();
}
fillEngines(enginesBox, "off", (id) => lightEngines(id === "on"));

// ------------------------------------------------------------- the lamps
const lightsBox = byId("lights");
/** `off`, `running` (position lights, the white flash and the red beacon) or `all` (those plus floods and work lights). The same words as the element's `lights` attribute and the address. Left out of the address, it is `all`. */
let lightsChoice = ["off", "running", "all"].includes(address.get("lights") ?? "") ? (address.get("lights") as string) : "all";
function showLights() {
  hero.setAttribute("lights", lightsChoice);
  press(lightsBox, `lights-${lightsChoice}`);
  const note = byId("lights-note");
  note.hidden = !reducedMotion;
  note.textContent = say("lightsNote");
  address.set("lights", lightsChoice === "all" ? null : lightsChoice);
}
function chooseLights(choice: string) {
  lightsChoice = choice;
  showLights();
  drawEmbed();
}
lightsBox.append(chip("Off", "lights-off", () => chooseLights("off"), "lights_off"), chip("Running only", "lights-running", () => chooseLights("running"), "lights_running"), chip("All", "lights-all", () => chooseLights("all"), "lights_all"));

// ------------------------------------------------------------- the thrusters
const thrustersBox = byId("thrusters");
const THRUSTER_CHOICES = ["off", "show", "station-keeping"] as const;
/** `off`, `show` or `station-keeping`: the same words as the element's `thrusters` attribute. Left out of the address, it is off. */
let thrusterChoice = THRUSTER_CHOICES.includes(address.get("thrusters") as (typeof THRUSTER_CHOICES)[number]) ? (address.get("thrusters") as (typeof THRUSTER_CHOICES)[number]) : "off";
function showThrusters() {
  hero.setAttribute("thrusters", thrusterChoice);
  press(thrustersBox, thrusterChoice === "station-keeping" ? "thrusters-keep" : `thrusters-${thrusterChoice}`);
  const note = byId("thrusters-note");
  note.hidden = !reducedMotion;
  note.textContent = say("thrustersNote");
  address.set("thrusters", thrusterChoice === "off" ? null : thrusterChoice);
}
function chooseThrusters(choice: (typeof THRUSTER_CHOICES)[number]) {
  thrusterChoice = choice;
  showThrusters();
  drawEmbed();
}
thrustersBox.append(chip("Off", "thrusters-off", () => chooseThrusters("off"), "thrusters_off"), chip("Show", "thrusters-show", () => chooseThrusters("show"), "thrusters_show"), chip("Station-keeping", "thrusters-keep", () => chooseThrusters("station-keeping"), "thrusters_keep"));

// ------------------------------------------------------------- the motion of a fleet ship's moving parts
const motionBox = byId("motion");
const speedBox = byId("motion-speed");
/** `on` (real speed), `fast` (ten times) or `off`: the same words as the element's `motion` attribute and the address. */
let motionChoice = ["on", "fast", "off"].includes(address.get("motion") ?? "") ? (address.get("motion") as string) : "on";
/** One row of buttons for each port that can take a craft. The choice is `docked` on the ship and in the address. */
function showDocked() {
  const menu = dockMenu(state.rocket);
  const field = byId("docked-field");
  field.hidden = menu.length === 0;
  const box = byId("docked");
  if (menu.length === 0) {
    hero.removeAttribute("docked");
    address.set("docked", null);
    box.replaceChildren();
    return;
  }
  const chosen = new Map(state.docked.split(",").filter(Boolean).map((pair) => {
    const [craft, port] = pair.split("@");
    return [port, craft] as const;
  }));
  box.replaceChildren(...menu.map((port) => {
    const row = el("div", { className: "chips" });
    row.dataset.testid = `docked-${port.id}`;
    const current = chosen.get(port.id) ?? "";
    const set = (craft: string) => {
      const next = new Map(chosen);
      if (craft) next.set(port.id, craft);
      else next.delete(port.id);
      const spec = menu.flatMap((one) => (next.get(one.id) ? [`${next.get(one.id)}@${one.id}`] : [])).join(",");
      pick({ docked: spec });
    };
    row.append(el("span", { className: "docked-port", textContent: port.name }), chip(say("dockedNone"), `docked-${port.id}-none`, () => set(""), "dockedNone"), ...port.craft.map((craft) => chip(craft.label, `docked-${port.id}-${craft.id}`, () => set(craft.id))));
    press(row, `docked-${port.id}-${current || "none"}`);
    return row;
  }));
  hero.setAttribute("docked", state.docked);
  address.set("docked", state.docked ? state.docked : null);
}

function showMotion() {
  const moves = motionsOf(state.rocket).length > 0;
  byId("motion-field").hidden = !moves;
  byId("motion-speed-field").hidden = !moves || motionChoice === "off";
  const note = byId("motion-note");
  note.hidden = !moves;
  note.textContent = moves ? `${reducedMotion ? `${say("motionReduced")} ` : ""}${motionNote(state.rocket)}` : "";
  hero.setAttribute("motion", moves ? motionChoice : "off");
  press(motionBox, motionChoice === "off" ? "motion-off" : "motion-on");
  press(speedBox, motionChoice === "fast" ? "motion-fast" : "motion-real");
  address.set("motion", motionChoice === "on" ? null : motionChoice);
  showPanels();
}
function chooseMotion(choice: string) {
  motionChoice = choice;
  showMotion();
  drawEmbed();
}
motionBox.append(chip("", "motion-off", () => chooseMotion("off"), "motion_off"), chip("", "motion-on", () => chooseMotion(motionChoice === "off" ? "on" : motionChoice), "motion_on"));
speedBox.append(chip("", "motion-real", () => chooseMotion("on"), "motion_real"), chip("", "motion-fast", () => chooseMotion("fast"), "motion_fast"));

// ------------------------------------------------------------- copy the rocket that is on screen
const embedStatus = byId("embed-status");
const panel = byId<EmbedPanelElement>("embed-panel");
const here = new URL(".", location.href).href;
function embedOptions(): RocketOptions {
  const flying = hero.flightState;
  const engines = hero.getAttribute("engines");
  const lights = hero.getAttribute("lights");
  const thrusters = hero.getAttribute("thrusters");
  const motion = hero.getAttribute("motion");
  // what turns here by the controls turns there by itself, as fast: left is `cw`, the near side going left
  const turning = bar.state.turning ? { spin: String(Math.round(360 / (TURN_SPEED * (Number(bar.getAttribute("pace")) || 1)))), way: turnWay === "left" ? "cw" : "ccw" } : {};
  return { rocket: state.rocket, variant: state.variant, show: state.show, look: state.look, view: state.view, ...turning, ...(engines === "on" ? { engines } : {}), ...(lights === "off" || lights === "running" ? { lights } : {}), ...(thrusters === "show" || thrusters === "station-keeping" ? { thrusters } : {}), ...(motion === "on" || motion === "fast" ? { motion } : {}), ...(flying.active ? { phase: flying.phase } : {}) };
}
panel.kinds = KINDS;
panel.labels = LABELS;
panel.sizes = SIZES;
panel.size = 480;
panel.generate = ({ kind, size, preview }) => panelCode(kind as Kind, embedOptions(), { size, ...(preview ? { site: here } : {}) });
// The picture is the drawing itself, never the 3D view or an iframe: it adds no WebGL context and no frame loop to the page.
panel.preview = () => {
  const holder = document.createElement("div");
  holder.innerHTML = embedCode(embedOptions(), "svg");
  return pictureOf(holder);
};
panel.note = ({ kind }) => {
  const options = embedOptions();
  const own = kind === "html" || kind === "iframe" || kind === "module" || kind === "svg" || kind === "data" || kind === "link";
  const noteKey = kind === "link" && options.view && options.view !== "three-quarter" ? "note_linkView" : own ? `note_${packageKind(kind as Kind)}` : "note_framework";
  const text = japanese() || !own ? say(noteKey) : embedNote(packageKind(kind as Kind), options);
  return `${text}${state.background === "earth" ? say("embedEarth") : ""}`;
};
panel.credits = () => {
  const credit = paintedCredit(embedOptions());
  return credit === "" ? "" : `${say("embedKeep")}${credit}`;
};
// The panel is kept up to date only while it is near the screen: a page of 3D views changes the code often (every phase of a flight), and nothing is made for a section nobody can see.
// It catches up when it comes near. The drawing beside the code appears with it.
let embedNear = false;
let embedStale = true;
panel.setAttribute("no-preview", "");
new IntersectionObserver((seen) => {
  embedNear = seen.some((one) => one.isIntersecting);
  if (!embedNear) return;
  panel.removeAttribute("no-preview");
  if (embedStale) drawEmbed();
}, { rootMargin: "400px" }).observe(panel);
function drawEmbed() {
  if (!embedNear) {
    embedStale = true;
    return;
  }
  embedStale = false;
  panel.setAttribute("lang", japanese() ? "ja" : "en");
  panel.openHref = `embed.html?${rocketToParams(embedOptions()).toString()}`;
  embedStatus.textContent = "";
  panel.update();
}
const fileName = () => ["uchusen", state.rocket, state.variant, state.show === "together" ? "" : state.show, state.look].filter(Boolean).join("-");
const drawingText = () => embedCode(embedOptions(), "svg");
byId("embed-svg").addEventListener("click", () => {
  downloadBlob(new Blob([drawingText()], { type: "image/svg+xml" }), `${fileName()}.svg`);
  embedStatus.textContent = say("saved");
});
byId("embed-png").addEventListener("click", async () => {
  try {
    downloadBlob((await svgToPng(drawingText(), PICTURE_W, PICTURE_H, 2)).blob, `${fileName()}.png`);
    embedStatus.textContent = say("saved");
  } catch {
    embedStatus.textContent = say("pngFail");
  }
});
// a phase of flight is part of what is copied: it is said when it changes, not on every step of the slider
let embedPhase = "";
hero.addEventListener("uchusen-flight", () => {
  const { active, phase } = hero.flightState;
  const now = active ? phase : "";
  if (now === embedPhase) return;
  embedPhase = now;
  drawEmbed();
});
if (state.background === "earth") {
  address.set("orbit", orbitQuery(state.orbitKm, EARTH_ORBIT));
  earthHolder.dataset.altitude = String(state.orbitKm);
  aimOrbit(orbitOpen(state.orbitKm, EARTH_ORBIT), earthHolder, false);
}
renderMain();

// ------------------------------------------------------------- compare
const lineup = byId<UchusenLineup>("lineup");
const every = Object.values(ROCKETS).flatMap((rocket) => rocket.variants);
const compared = new Set(["starship:v1-flight1", "starship:v1", "starship:v2", "starship:v3", "starship:v4"]);
const comparePicks = byId("compare-picks");
type CompareFilter = "all" | "rockets" | "fleet";
const FILTERS: readonly CompareFilter[] = ["all", "rockets", "fleet"];
const askedFilter = new URLSearchParams(location.search).get("cmp") ?? "all";
let compareFilter: CompareFilter = (FILTERS as readonly string[]).includes(askedFilter) ? (askedFilter as CompareFilter) : "all";
// real craft for scale lie in the fleet band: on unless the address says `real=off`
let compareReal = new URLSearchParams(location.search).get("real") !== "off";
const compareFrame = byId("compare-view");
// the family's controls zoom and pan the whole lineup; Fit is the lineup fitted to the frame
bindStage(compareFrame, (detail) => placeZoom(lineup, detail));
function renderCompare() {
  for (const button of comparePicks.querySelectorAll("button")) {
    const key = (button.dataset.testid as string).slice(8);
    button.setAttribute("aria-pressed", String(compared.has(key)));
    const fleet = key.startsWith("fleet-");
    (button as HTMLElement).hidden = (compareFilter === "rockets" && fleet) || (compareFilter === "fleet" && !fleet);
  }
  press(byId("compare-filter"), `compare-filter-${compareFilter}`);
  // they lie in the fleet band, which Rockets alone does not have
  byId("compare-real").hidden = compareFilter === "rockets";
  press(byId("compare-real"), compareReal ? "compare-real" : "");
  lineup.setAttribute("real", compareReal ? "on" : "off");
  const chosen = every.filter((variant) => compared.has(keyOf(variant)) && (compareFilter === "all" || (compareFilter === "fleet") === isFleetVariant(variant)));
  lineup.setAttribute("items", [...chosen.map(keyOf), ...(compareFilter === "fleet" ? [] : ["building", "person"])].join(","));
  lineup.setAttribute("filter", compareFilter);
  // rockets alone keep today's scale; with the fleet in, the scale fits whatever is shown into the frame
  if (compareFilter === "rockets") lineup.removeAttribute("fit");
  else lineup.setAttribute("fit", `${Math.max(200, Math.floor(compareFrame.clientWidth) - 16)},${Math.max(200, Math.floor(compareFrame.clientHeight) - 12)}`);
  lineup.setAttribute("look", state.look === "painted" ? "painted" : "line");
  const table = byId("compare-table");
  const head = el("tr", {}, el("th", { textContent: "" }), ...chosen.map((variant) => el("th", { scope: "col", textContent: variant.name })));
  const slots = [...new Set(chosen.flatMap((variant) => variant.slots))];
  const anyFleet = chosen.some(isFleetVariant);
  const rows: [string, (variant: Variant) => Figure<number | string> | undefined][] = [
    [say("wholeHeight"), (variant) => (isFleetVariant(variant) ? { value: null, source: null, brief: say("compareLengthwise") } : variant.facts.height)],
    ...(anyFleet ? ([[say("length"), (variant) => sizeFigure(variant, "length")], [say("beam"), (variant) => sizeFigure(variant, "beam")], [say("heightStowed"), (variant) => sizeFigure(variant, "height")]] as [string, (variant: Variant) => Figure<number | string> | undefined][]) : []),
    ...slots.map((slot): [string, (variant: Variant) => Figure<number | string> | undefined] => [slotWord(slot), (variant) => (variant.slots.includes(slot) ? variant.facts.parts[slot] : { value: null, source: null, brief: say("compareNone") })]),
    [say("diameter"), (variant) => variant.facts.diameter],
    [say("first_first_flew"), (variant) => variant.firstFlight],
  ];
  const body = rows.map(([label, read]) =>
    el(
      "tr",
      {},
      el("th", { scope: "row", textContent: label }),
      ...chosen.map((variant) => {
        const figure = read(variant);
        const cell = el("td");
        if (!figure || figure.value === null) cell.append(el("span", { className: "blank", textContent: blankWords(figure) }));
        else cell.textContent = figureWords(figure, " m");
        return cell;
      }),
    ),
  );
  table.replaceChildren(el("thead", {}, head), el("tbody", {}, ...body));
}
byId("compare-filter").replaceChildren(
  ...FILTERS.map((filter) =>
    chip("", `compare-filter-${filter}`, () => {
      compareFilter = filter;
      const params = new URLSearchParams(location.search);
      if (filter === "all") params.delete("cmp");
      else params.set("cmp", filter);
      history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
      renderCompare();
    }, `compare${filter === "all" ? "All" : filter === "rockets" ? "Rockets" : "Fleet"}`),
  ),
);
byId("compare-real").replaceChildren(
  chip("", "compare-real", () => {
    compareReal = !compareReal;
    const params = new URLSearchParams(location.search);
    if (compareReal) params.delete("real");
    else params.set("real", "off");
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
    renderCompare();
  }, "compareReal"),
);
new ResizeObserver(() => renderCompare()).observe(compareFrame);
comparePicks.append(
  ...every.filter((variant) => isListed(variant.rocket)).map((variant) =>
    chip(variant.name, `compare-${keyOf(variant)}`, () => {
      if (compared.has(keyOf(variant))) compared.delete(keyOf(variant));
      else compared.add(keyOf(variant));
      renderCompare();
    }),
  ),
);
renderCompare();

// ------------------------------------------------------------- builder
const builderRocket = byId<UchusenRocket>("builder-rocket");
const builderRows = byId("builder-rows");
let builderPicks: string[] = [];
function renderBuilder() {
  const { rows, description, report } = builderState(builderPicks);
  // what the builder chose is what stands: a later change starts from here
  builderPicks = rows.map((row) => row.chosen);
  builderRows.replaceChildren(
    ...rows.map((row, index) => {
      const label = el("label", {}, row.label.split(" or ").map((name) => (slotOfName.has(name) ? slotWord(slotOfName.get(name) as string) : name)).join(say("builderOr")));
      if (row.auto) {
        // one answer: no question to ask
        label.append(el("output", { className: "builder-only", textContent: row.options[0].name }));
        label.dataset.testid = `pick-${index}-only`;
        return label;
      }
      const select = el("select");
      select.dataset.testid = `pick-${index}`;
      for (const rocket of new Set(row.options.map((option) => option.rocket))) {
        const group = el("optgroup", { label: rocket });
        for (const option of row.options) if (option.rocket === rocket) group.append(el("option", { value: option.id, textContent: option.name }));
        select.append(group);
      }
      select.value = row.chosen;
      select.addEventListener("change", () => {
        builderPicks[index] = select.value;
        renderBuilder();
      });
      label.append(select);
      return label;
    }),
  );
  const box = byId("builder-report");
  box.dataset.kind = report.custom ? "custom" : "real";
  box.textContent = say("builderReport", { label: report.label, height: report.size?.height.toFixed(1) ?? "" });
  byId("builder-code").textContent = `build(${JSON.stringify(description)})`;
  builderRocket.description = description;
}
renderBuilder();

// ------------------------------------------------------------- the parts alone
const assets = new URL("assets/", document.baseURI).href;
const gallery = () =>
  PART_ENTRIES.filter(({ record }) => record.trueTo.length === 0).map(({ record }) =>
    el(
      "figure",
      { className: "tile" },
      el("img", { src: `${assets}parts/${record.id}.svg`, alt: record.name, loading: "lazy", width: 240, height: 320 }),
      el("figcaption", {}, record.name, el("small", { textContent: record.sourced.height.value === null ? say("partJudged") : say("partSize", { height: record.sourced.height.value, width: record.sourced.diameter.value as number }) })),
    ),
  );
byId("gallery").append(...gallery());

// ------------------------------------------------------------- what is coming, and where it all comes from
byId("planned").hidden = PLANNED_ROCKETS.length === 0;
const planned = () =>
  PLANNED_ROCKETS.map((rocket) =>
    el(
      "li",
      {},
      el("strong", { textContent: rocket.name }),
      say("plannedLine", { height: rocket.height.value as number, width: rocket.diameter.value as number, note: rocket.diameter.note ? ` (${rocket.diameter.note.toLowerCase()})` : "", first: rocket.firstFlight.value as string }),
      el("a", { href: SOURCES[rocket.source].url, textContent: SOURCES[rocket.source].publisher, rel: "noopener" }),
      say("plannedEnd"),
    ),
  );
byId("planned-list").append(...planned());
const sourceItems = () =>
  (Object.keys(SOURCES) as SourceId[]).map((id) => {
    const source = SOURCES[id];
    return el("li", {}, el("a", { href: source.url, textContent: source.title, rel: "noopener" }), `, ${source.publisher}${source.date ? `, ${source.date}` : ""}.${source.read === "search" ? say("sourceSearch") : source.read === "cited" ? say("sourceCited") : ""}`);
  });
byId("source-list").append(...sourceItems());
byId("credit-list").append(...(Object.keys(MODEL_CREDITS) as CreditId[]).map((id) => el("li", { textContent: creditLine(id) })));

// ------------------------------------------------------------- one section at a time, chosen in a row, and kept in the address
const MORE: readonly (readonly [string, string])[] = ["embed", "compare", "builder", "details", "planned", "sources"].map((id) => [id, WORDS.en[`more_${id}`]] as const);
const moreTabs = byId("more-tabs");
function showMore(chosen: string) {
  for (const [id] of MORE) {
    byId(id).hidden = id !== chosen;
    moreTabs.querySelector(`[data-testid="more-${id}"]`)?.setAttribute("aria-selected", String(id === chosen));
  }
}
for (const [id, words] of MORE) {
  const tab = chip(words, `more-${id}`, () => {
    showMore(id);
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`);
  }, `more_${id}`);
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", id);
  moreTabs.append(tab);
}
const askedTab = location.hash.slice(1);
showMore(MORE.some(([id]) => id === askedTab) ? askedTab : MORE[0][0]);

// ------------------------------------------------------------- the language: the family's chooser has filled every data-say; what the page draws itself is drawn again
const flightBar = byId<HTMLElement & { words: Record<string, string> }>("flight");
function setWords() {
  byId("data-note").hidden = !japanese();
  flightBar.words = Object.fromEntries(["play", "pause", "again", "back", "next", "leave", "range", "none", "sourced", "reduced", "from"].map((key) => [key, say(`flight${key[0].toUpperCase()}${key.slice(1)}`)]));
  byId<UchusenBuild>("build-bar").words = {
    play: say("buildPlay"),
    pause: say("buildPause"),
    start: say("buildStart"),
    repeat: say("buildRepeat"),
    range: say("buildRange"),
    day: say("buildDay"),
    done: say("buildDone"),
    rate: say("buildRate"),
    flight: say("buildFlight"),
  };
  const titles: Record<string, string> = {};
  for (const key of Object.keys(WORDS.en)) if (key.startsWith("flight_")) titles[key.slice("flight_".length)] = say(key);
  byId<UchusenBuild>("build-bar").titles = titles;
}
function speak() {
  setWords();
  renderMain();
  renderCompare();
  renderBuilder();
  lightEngines(hero.getAttribute("engines") === "on");
  showMotion();
  showLights();
  showThrusters();
  drawTurn();
  byId("gallery").replaceChildren(...gallery());
  byId("planned-list").replaceChildren(...planned());
  byId("source-list").replaceChildren(...sourceItems());
}
document.addEventListener("kazoku-languagechange", () => queueMicrotask(speak));
setWords();
