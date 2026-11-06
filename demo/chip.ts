// One chip for every demo page. A page passes the press first when the row shows which one is on, or a word key when the language script fills the label.
import { LOOK_NAMES } from "../src/looks.ts";
import { WORDS } from "./words.js";

type Chooser = { word(key: string): string | undefined };

function word(key: string): string {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return chooser?.word(key) ?? (WORDS.en as Record<string, string>)[key] ?? key;
}

/**
 * A choice button. The third argument is the press, or whether this one is on when the press comes fourth.
 * A word key in the fourth place sets the label and `data-say`, so the language script can replace it.
 */
export function chip(label: string, testid: string, third: (() => void) | boolean, fourth?: (() => void) | string | boolean, disabled = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.dataset.testid = testid;
  if (typeof third === "boolean") {
    button.textContent = label;
    button.setAttribute("aria-pressed", String(third));
    if (disabled) button.disabled = true;
    button.addEventListener("click", fourth as () => void);
  } else {
    const sayKey = typeof fourth === "string" ? fourth : undefined;
    button.textContent = sayKey ? word(sayKey) : label;
    if (sayKey) button.dataset.say = sayKey;
    if (typeof fourth === "boolean") button.setAttribute("aria-pressed", String(fourth));
    button.addEventListener("click", third);
  }
  return button;
}

/** One row of choices. The pressed chip is the one whose id is `chosen`, and its test id is `prefix-id`. */
export function fillChoices(group: HTMLElement, choices: readonly { id: string; label: string; say?: string }[], chosen: string, prefix: string, on: (id: string) => void): void {
  group.replaceChildren(...choices.map((choice) => {
    const button = chip(choice.label, `${prefix}-${choice.id}`, () => on(choice.id), choice.say);
    button.setAttribute("aria-pressed", String(choice.id === chosen));
    return button;
  }));
}

/** The look row: line, thick lines, painted. The same three words on every page that offers all three. */
export function fillLooks(group: HTMLElement, chosen: string, on: (look: string) => void): void {
  fillChoices(group, LOOK_NAMES.map((id) => ({ id, label: "", say: `look_${id}` })), chosen, "look", on);
}
