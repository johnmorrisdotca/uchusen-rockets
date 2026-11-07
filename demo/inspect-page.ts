// A finished ship stays still. Drones fly around it. The ship list is the same catalogue as the other pages.
import "@johnmorrisdotca/kazoku-ui/view-controls/define";
import { ROCKETS } from "../src/index.ts";
import { defineUchusenRocket, setAssetBase, type UchusenRocket } from "../src/element.ts";
import { isListed } from "./listed.ts";
import { WORDS } from "./words.js";

setAssetBase(new URL("assets/", document.baseURI).href);
defineUchusenRocket();

type Chooser = { word(key: string): string | undefined };
const say = (key: string): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return chooser?.word(key) ?? WORDS.en[key] ?? key;
};

const hero = document.querySelector<UchusenRocket>("#hero");
const ship = document.querySelector<HTMLSelectElement>("#inspect-ship");
const countInput = document.querySelector<HTMLInputElement>("#inspect-count");
const rangeInput = document.querySelector<HTMLInputElement>("#inspect-range");
const play = document.querySelector<HTMLButtonElement>("#inspect-play");
const speedInput = document.querySelector<HTMLInputElement>("#inspect-speed");
if (!hero || !ship || !countInput || !rangeInput || !play || !speedInput) throw new Error("inspect page is missing a control");

const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const query = new URLSearchParams(location.search);
let playing = query.get("play") === "0" ? false : !reduced;

for (const rocket of Object.values(ROCKETS)) {
  if (!isListed(rocket.id)) continue;
  for (const variant of rocket.variants) {
    const option = document.createElement("option");
    option.value = `${rocket.id}|${variant.id}`;
    option.textContent = variant.id === rocket.defaultVariant ? rocket.name : `${rocket.name}, ${variant.name}`;
    ship.append(option);
  }
}

const asked = `${query.get("ship") ?? "starship"}|${query.get("variant") ?? "v3"}`;
if ([...ship.options].some((option) => option.value === asked)) ship.value = asked;

const clamp = (value: number): number => Math.max(1, Math.min(100, Math.round(value) || 1));
let count = clamp(Number(query.get("drones") ?? "10"));
countInput.value = String(count);
rangeInput.value = String(count);
let speed = Math.max(0.5, Math.min(3, Number(query.get("speed") ?? "1") || 1));
speedInput.value = String(speed);

const paintPlay = (): void => {
  const key = playing ? "inspectPause" : "inspectPlay";
  play.dataset.say = key;
  play.textContent = say(key);
  play.setAttribute("aria-pressed", playing ? "true" : "false");
};

const remember = (): void => {
  const [rocket, variant] = ship.value.split("|");
  const url = new URL(location.href);
  url.searchParams.set("ship", rocket ?? "starship");
  url.searchParams.set("variant", variant ?? "v3");
  url.searchParams.set("drones", String(count));
  url.searchParams.set("play", playing ? "1" : "0");
  url.searchParams.set("speed", String(speed));
  history.replaceState(null, "", url);
};

const apply = (): void => {
  const [rocket, variant] = ship.value.split("|");
  if (rocket && hero.getAttribute("rocket") !== rocket) hero.setAttribute("rocket", rocket);
  if (variant && hero.getAttribute("variant") !== variant) hero.setAttribute("variant", variant);
  hero.setInspect(count, playing, speed);
  paintPlay();
  remember();
};

ship.addEventListener("change", apply);
countInput.addEventListener("input", () => {
  count = clamp(Number(countInput.value));
  rangeInput.value = String(count);
  apply();
});
rangeInput.addEventListener("input", () => {
  count = clamp(Number(rangeInput.value));
  countInput.value = String(count);
  apply();
});
speedInput.addEventListener("input", () => {
  speed = Math.max(0.5, Math.min(3, Number(speedInput.value) || 1));
  apply();
});
play.addEventListener("click", () => {
  playing = !playing;
  apply();
});

hero.addEventListener("uchusen-ready", apply);
hero.addEventListener("uchusen-change", apply);
apply();
