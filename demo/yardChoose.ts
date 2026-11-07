// A ship and a named bay. The choice stays in the address. Building anywhere else is not this page.
import { ROCKETS } from "../src/index.ts";
import type { UchusenBuild } from "../src/buildbar.ts";
import { isListed } from "./listed.ts";
import { WORDS } from "./words.js";
import { BUILDABLE, type BayId } from "./yardShips.ts";

const BAYS: BayId[] = ["hall", "spine", "dock"];
const BAY_WORD: Record<BayId, string> = { hall: "yardHall", spine: "yardSpine", dock: "yardDock" };

type Chooser = { word(key: string): string | undefined };

/** The bay's name in the reader's language. */
export function bayWord(id: BayId): string {
  const key = BAY_WORD[id];
  const said = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage?.word(key);
  return said || WORDS.en[key] || key;
}

/** The build bar's own words, from the same table as the rest of the page. */
export function buildBarWords(bar: UchusenBuild): void {
  const say = (key: string): string => (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage?.word(key) ?? WORDS.en[key] ?? key;
  bar.words = {
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
}

/** The ship menu. A choice, or an address that already has one, puts that ship in the named bay. */
export function mountYardChoice(onChoice: (bay: BayId, rocket: string, variant: string) => void): void {
  const select = document.querySelector<HTMLSelectElement>("[data-testid=yard-ship]");
  if (!select) return;
  const seen = new Set<string>();
  for (const rocket of Object.values(ROCKETS)) {
    if (rocket.status !== "built" || !isListed(rocket.id)) continue;
    for (const variant of rocket.variants) {
      if (seen.has(variant.id)) continue;
      seen.add(variant.id);
      const option = document.createElement("option");
      option.value = variant.id;
      option.dataset.rocket = rocket.id;
      const extra = variant.name && !rocket.name.includes(variant.name) ? `, ${variant.name}` : "";
      option.textContent = `${rocket.name}${extra}`;
      select.append(option);
    }
  }
  const params = new URLSearchParams(location.search);
  const asked = params.get("bay");
  const bay = BAYS.find((id) => id === asked) ?? "spine";
  const ship = params.get("ship");
  const variant = ship && seen.has(ship) ? ship : (BUILDABLE.find((one) => one.bay === bay)?.variant ?? "miyamoto");
  select.value = variant;
  const apply = (nextBay: BayId) => {
    const chosen = select.selectedOptions[0];
    const rocket = chosen?.dataset.rocket;
    if (!chosen || !rocket) return;
    const address = new URL(location.href);
    address.searchParams.set("bay", nextBay);
    address.searchParams.set("ship", chosen.value);
    history.replaceState(null, "", address);
    onChoice(nextBay, rocket, chosen.value);
  };
  select.addEventListener("change", () => {
    const shot = document.querySelector("[data-testid=yard-stage]")?.getAttribute("data-shot");
    apply(BAYS.find((id) => id === shot) ?? bay);
  });
  if (params.has("bay") || params.has("ship")) apply(bay);
}
