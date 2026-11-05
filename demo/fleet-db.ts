// The fleet record: the SPX ships already in the package, then one ship's sections, chosen in one row and kept in the address. Nothing new is drawn.
import { ROCKETS, SLOT_NAMES, variantOf } from "../src/index.ts";
import { setAssetBase, type UchusenRocket } from "../src/element.ts";
import { build } from "../src/build/index.ts";
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { isListed } from "./listed.ts";
import { fleetSize } from "./sizes.ts";
import { WORDS } from "./words.js";

setAssetBase(new URL("assets/", document.baseURI).href);

const FIRST = ["fleet-ship-01", "fleet-ship-03", "fleet-kaminari", "fleet-emiake", "fleet-romaryu", "fleet-ship-ariake", "fleet-kyotori", "fleet-drone"];
const fleetShip = (id: string) => id in ROCKETS && isListed(id) && ROCKETS[id].maker === "fleet";
const ships = () => {
  const rest = Object.keys(ROCKETS).filter((id) => fleetShip(id) && !FIRST.includes(id));
  return [...FIRST.filter(fleetShip), ...rest].map((id) => ROCKETS[id]);
};

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
const slotLabel = (slot: string) => (slot === "together" ? say("show_together") : (`slot_${slot}` in WORDS.en ? say(`slot_${slot}`) : (SLOT_NAMES[slot] ?? slot)));

const address = createAddressState({ defaults: { ship: "fleet-ship-01", show: "together", module: "" } });

const modulesOf = (variant: ReturnType<typeof variantOf>, show: string) =>
  show === "together" ? [] : (variant?.inspector?.sections.filter((section) => section.slot === show) ?? []);

const chosen = () => {
  const list = ships();
  const asked = address.get("ship") ?? "";
  const ship = list.some((rocket) => rocket.id === asked) ? asked : list[0].id;
  const rocket = ROCKETS[ship];
  const variant = variantOf(ship, rocket.defaultVariant);
  const slots = ["together", ...(variant?.slots ?? [])];
  const askedShow = address.get("show") ?? "";
  const show = slots.includes(askedShow) ? askedShow : "together";
  const modules = modulesOf(variant, show);
  const askedModule = address.get("module") ?? "";
  const moduleId = modules.some((section) => section.id === askedModule) ? askedModule : "";
  return { ship, rocket, variant, show, slots, modules, moduleId };
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

const draw = (): void => {
  const { ship, rocket, variant, show, slots, modules, moduleId } = chosen();
  const shipsRow = byId("db-ships");
  const sectionsRow = byId("db-sections");
  const modulesRow = byId("db-modules");
  shipsRow.replaceChildren(...ships().map((one) => chip(one.name, `db-ship-${one.id}`, one.id === ship, () => {
    address.set("ship", one.id);
    address.set("show", "together");
    address.set("module", "");
    draw();
  })));
  sectionsRow.replaceChildren(...slots.map((slot) => chip(slotLabel(slot), `db-show-${slot}`, slot === show, () => {
    address.set("ship", ship);
    address.set("show", slot);
    address.set("module", "");
    draw();
  })));
  modulesRow.replaceChildren(...modules.map((section) => chip(section.name, `db-module-${section.id}`, section.id === moduleId, () => {
    address.set("ship", ship);
    address.set("show", show);
    address.set("module", section.id);
    draw();
  })));
  const picked = modules.find((section) => section.id === moduleId);
  byId("db-module-job").textContent = picked?.job ?? "";
  byId("db-profile-rows").replaceChildren(...(variant?.inspector?.spec ?? []).map(([name, value]) => {
    const row = document.createElement("tr");
    const head = document.createElement("th");
    head.textContent = name;
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(head, cell);
    return row;
  }));
  const hero = byId("hero") as UchusenRocket;
  hero.setAttribute("rocket", ship);
  hero.setAttribute("variant", rocket.defaultVariant);
  hero.setAttribute("show", show);
  if (variant) {
    const size = fleetSize(variant);
    byId("db-length").textContent = metres(size.length);
    byId("db-beam").textContent = metres(size.beam);
    byId("db-height").textContent = metres(size.height);
    const part = byId("db-part-facts");
    if (show === "together") {
      part.hidden = true;
      part.replaceChildren();
    } else {
      const box = build({ rocket: variant.rocket, variant: variant.id }).boundsOf(show);
      const row = (key: string, n: number) => {
        const tr = document.createElement("tr");
        const head = document.createElement("th");
        head.textContent = say(key);
        const cell = document.createElement("td");
        cell.textContent = metres(n);
        tr.append(head, cell);
        return tr;
      };
      const caption = document.createElement("tr");
      const title = document.createElement("th");
      title.colSpan = 2;
      title.textContent = slotLabel(show);
      caption.append(title);
      part.replaceChildren(caption, row("length", box.max[1] - box.min[1]), row("beam", box.max[0] - box.min[0]), row("heightStowed", box.max[2] - box.min[2]));
      part.hidden = false;
    }
  }
  if (picked && variant) {
    const box = build({ rocket: variant.rocket, variant: variant.id }).boundsOf(picked.slot);
    const span = Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2], 8);
    hero.focusAt({ slots: [picked.slot], target: [picked.at[0], picked.at[1], picked.at[2]], direction: [0.35, 0.25, 1], distance: span * 1.6 });
  } else hero.focusAt(null);
};

draw();
