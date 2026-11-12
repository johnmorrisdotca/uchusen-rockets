// The ship picker, drawn two ways from one model. layout=browser is the three columns John picked. layout=card is the Card stack. The window around it is the Card frame.
import "@johnmorrisdotca/kazoku-ui/options-window/define";
import { MAKERS, ROCKETS, variantOf, type MakerId } from "../src/index.ts";
import { WORDS } from "./words.js";
import { craftPicture } from "./shipPicker.ts";
import { familiesOf, filterCraft, parseLayout, pickerCatalogue, pickerKind, pickerKinds, type PickerCraft, type PickerKind, type PickerLayout } from "./pickerModel.ts";

type Chooser = { word(key: string): string | undefined };

const word = (key: string): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return chooser?.word(key) ?? (WORDS.en as Record<string, string>)[key] ?? key;
};

const KIND_KEY: Record<PickerKind, string> = { rocket: "pickerKindRocket", craft: "pickerKindCraft", station: "pickerKindStation", fleet: "pickerKindFleet" };

export interface ShipChoice {
  rocket: string;
  variant: string;
}

export class ShipPickerElement extends HTMLElement {
  static observedAttributes = ["layout"];

  #rows = pickerCatalogue();
  #rocket = "starship";
  #variant = "v3";
  #search = "";
  #kind: PickerKind | "all" = "rocket";
  #family: MakerId | "all" = "all";
  #ready = false;
  #focusSearch = false;
  onChoose: (choice: ShipChoice) => void = () => {};

  connectedCallback(): void {
    this.#ready = true;
    const current = this.#rows.find((row) => row.rocket === this.#rocket);
    if (current) this.#kind = current.kind;
    this.#paint();
  }

  attributeChangedCallback(): void {
    if (this.#ready) this.#paint();
  }

  /** The page changed the craft. The window follows, and skips a paint when nothing moved. */
  sync(choice: ShipChoice): void {
    if (this.#ready && this.childElementCount > 0 && choice.rocket === this.#rocket && choice.variant === this.#variant) return;
    const changed = choice.rocket !== this.#rocket;
    this.#rocket = choice.rocket;
    this.#variant = choice.variant;
    if (changed) {
      const row = this.#rows.find((one) => one.rocket === choice.rocket);
      if (row) this.#kind = row.kind;
      this.#family = "all";
    }
    if (this.#ready) this.#paint();
  }

  /** Draw again, for a language change. */
  refresh(): void {
    if (this.#ready) this.#paint();
  }

  #layout(): PickerLayout {
    return parseLayout(this.getAttribute("layout"));
  }

  #paint(): void {
    const layout = this.#layout();
    const focus = this.#focusSearch || this.querySelector(".pk-search") === document.activeElement;
    this.#focusSearch = false;
    this.dataset.layout = layout;
    this.dataset.testid = "ship-picker";
    const root = document.createElement("div");
    root.className = `pk pk-${layout}`;
    const shown = filterCraft(this.#rows, { kind: this.#kind, family: this.#family, search: this.#search });
    if (layout === "browser") root.append(this.#side());
    const mid = document.createElement("div");
    mid.className = "pk-mid";
    mid.append(this.#searchBox(), ...(layout === "card" || layout === "grid" ? [this.#chips()] : []), this.#grid(shown));
    root.append(mid, this.#facts());
    this.replaceChildren(root);
    if (focus) this.querySelector<HTMLInputElement>(".pk-search")?.focus();
  }

  #searchBox(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "search";
    input.className = "pk-search";
    input.dataset.testid = "ship-picker-search";
    input.setAttribute("aria-label", word("pickerSearch"));
    input.placeholder = word("pickerSearch");
    input.value = this.#search;
    input.addEventListener("input", () => {
      this.#search = input.value;
      this.#focusSearch = true;
      this.#paint();
    });
    return input;
  }

  #side(): HTMLElement {
    const side = document.createElement("div");
    side.className = "pk-side";
    side.setAttribute("role", "group");
    side.setAttribute("aria-label", word("pickerKinds"));
    side.append(...this.#kindButtons(), ...this.#familyButtons());
    return side;
  }

  #chips(): HTMLElement {
    const box = document.createElement("div");
    box.className = "pk-kinds";
    box.append(...this.#kindButtons(), ...this.#familyButtons());
    return box;
  }

  #kindButtons(): HTMLButtonElement[] {
    const all = this.#press(word("pickerAllKinds"), this.#kind === "all", () => {
      this.#kind = "all";
      this.#paint();
    });
    all.dataset.testid = "pick-kind-all";
    return [all, ...pickerKinds().map((kind) => {
      const button = this.#press(word(KIND_KEY[kind]), this.#kind === kind, () => {
        this.#kind = kind;
        if (this.#family !== "all" && !familiesOf(this.#rows, kind).includes(this.#family)) this.#family = "all";
        this.#paint();
      });
      button.dataset.testid = `pick-kind-${kind}`;
      return button;
    })];
  }

  #familyButtons(): HTMLButtonElement[] {
    const families = familiesOf(this.#rows, this.#kind);
    const all = this.#press(word("pickerAllFamilies"), this.#family === "all", () => {
      this.#family = "all";
      this.#paint();
    });
    all.dataset.testid = "pick-family-all";
    return [all, ...families.map((id) => {
      const button = this.#press(MAKERS[id], this.#family === id, () => {
        this.#family = id;
        this.#paint();
      });
      button.dataset.testid = `pick-family-${id}`;
      return button;
    })];
  }

  #grid(shown: readonly PickerCraft[]): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "pk-grid";
    grid.setAttribute("role", "listbox");
    grid.setAttribute("aria-label", word("pickerTitle"));
    if (shown.length === 0) {
      const empty = document.createElement("p");
      empty.className = "pk-empty";
      empty.textContent = word("pickerEmpty");
      grid.append(empty);
      return grid;
    }
    for (const row of shown) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pk-craft";
      button.dataset.testid = `pick-${row.rocket}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(row.rocket === this.#rocket));
      button.append(craftPicture(row.rocket, row.variant), document.createElement("span"));
      button.lastElementChild!.textContent = row.name;
      button.addEventListener("click", () => this.#choose(row.rocket, ROCKETS[row.rocket]?.defaultVariant ?? row.variant));
      grid.append(button);
    }
    return grid;
  }

  #facts(): HTMLElement {
    const facts = document.createElement("div");
    facts.className = "pk-facts";
    facts.dataset.testid = "ship-picker-facts";
    const row = this.#rows.find((one) => one.rocket === this.#rocket);
    const entry = ROCKETS[this.#rocket];
    const variant = variantOf(this.#rocket, this.#variant);
    const name = document.createElement("strong");
    name.textContent = variant?.name ?? row?.name ?? this.#rocket;
    const kind = document.createElement("span");
    kind.textContent = word(KIND_KEY[row?.kind ?? pickerKind(this.#rocket)]);
    const fact = document.createElement("span");
    fact.textContent = row?.fact ?? "";
    const family = document.createElement("span");
    family.textContent = row?.familyName ?? "";
    facts.append(name, kind, family, fact);
    const variants = document.createElement("div");
    variants.className = "pk-variants";
    for (const one of entry?.variants ?? []) {
      const button = this.#press(one.name, one.id === this.#variant, () => this.#choose(this.#rocket, one.id));
      button.dataset.testid = `pick-variant-${one.id}`;
      variants.append(button);
    }
    facts.append(variants);
    return facts;
  }

  #press(label: string, on: boolean, run: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pk-pill";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(on));
    button.addEventListener("click", run);
    return button;
  }

  #choose(rocket: string, variant: string): void {
    this.#rocket = rocket;
    this.#variant = variant;
    this.onChoose({ rocket, variant });
    this.#paint();
  }
}

const TAG = "uchusen-ship-picker";

export function defineShipPicker(): void {
  if (customElements.get(TAG) === undefined) customElements.define(TAG, ShipPickerElement);
}

/**
 * The floating Ship picker, on the Card window. `layout` on the picker switches Card and Browser.
 * @param host The view the window floats over. A static host is made the positioning parent.
 * @param choice The craft on screen now.
 * @param onChoose What the page does with a new craft.
 */
export function mountShipPicker(host: HTMLElement, choice: ShipChoice, onChoose: (choice: ShipChoice) => void): ShipPickerElement {
  defineShipPicker();
  if (getComputedStyle(host).position === "static") host.classList.add("picker-host");
  const frame = document.createElement("kazoku-options-window");
  frame.className = "picker-frame";
  frame.dataset.testid = "ship-picker-window";
  frame.setAttribute("variant", "card");
  frame.setAttribute("title", word("pickerTitle"));
  frame.setAttribute("address", "");
  frame.setAttribute("address-keys", "open:picker,place:picker-at");
  const picker = document.createElement(TAG) as ShipPickerElement;
  const asked = parseLayout(new URLSearchParams(location.search).get("layout"));
  picker.setAttribute("layout", asked);
  picker.onChoose = onChoose;
  const help = document.createElement("p");
  help.slot = "help";
  help.dataset.say = "pickerHelp";
  help.textContent = word("pickerHelp");
  frame.append(picker, help);
  host.append(frame);
  // The window's title is a disclosure (aria-expanded). The journey page allows one only inside the view controls, so this title stays a label.
  const root = frame.shadowRoot;
  if (root) {
    const dropDisclosure = (): void => {
      for (const node of root.querySelectorAll("[aria-expanded]")) node.removeAttribute("aria-expanded");
    };
    dropDisclosure();
    new MutationObserver(dropDisclosure).observe(root, { subtree: true, attributes: true, attributeFilter: ["aria-expanded"] });
  }
  const width = (): void => {
    const layout = parseLayout(picker.getAttribute("layout"));
    frame.dataset.layout = layout;
    frame.style.width = layout === "card" ? "min(340px, calc(100% - 16px))" : "min(720px, calc(100% - 16px))";
  };
  width();
  picker.sync(choice);
  new MutationObserver(width).observe(picker, { attributes: true, attributeFilter: ["layout"] });
  document.addEventListener("kazoku-languagechange", () => {
    frame.setAttribute("title", word("pickerTitle"));
    help.textContent = word("pickerHelp");
    picker.refresh();
  });
  return picker;
}
