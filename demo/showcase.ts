import { defineUchusenRocket, type UchusenRocket } from "../src/element.ts";
import { bindStage } from "./viewBinder.ts";

defineUchusenRocket();

const ship = document.querySelector<UchusenRocket>("#ship")!;
bindStage(ship, (detail) => ship.drive(detail), { overlay: true, theme: "dark", controls: "basic", zoomMin: "0.25", zoomMax: "8" });
const exhaust = document.querySelector<HTMLButtonElement>("#exhaust")!;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const language = (window as unknown as { uchusenLanguage?: { word(key: string): string | undefined } }).uchusenLanguage;

function syncControl(): void {
  exhaust.hidden = reduced.matches || ship.dataset.state !== "3d";
  const paused = ship.hasAttribute("showcase-paused");
  const key = paused ? "showcaseResume" : "showcasePause";
  exhaust.dataset.say = key;
  exhaust.textContent = language?.word(key) ?? (paused ? "Resume exhaust" : "Pause exhaust");
}

exhaust.addEventListener("click", () => {
  ship.toggleAttribute("showcase-paused");
  syncControl();
});
ship.addEventListener("uchusen-ready", syncControl);
ship.addEventListener("uchusen-fallback", syncControl);
reduced.addEventListener("change", syncControl);
syncControl();
