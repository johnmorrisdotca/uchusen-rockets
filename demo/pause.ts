// A Pause / Play button for a page that moves by itself (WCAG 2.2.2). Paused, the page draws nothing and asks for no frame; the address keeps it as `play=0`, as the line-up keeps `turn=0`.
import { createAddressState } from "@johnmorrisdotca/kazoku-ui/address-state";
import { chip } from "./chip.ts";
import { everyFrame } from "./loop.ts";

/**
 * Runs `draw(ms)` about 30 times a second while the page plays, and adds the button to `controls`.
 * It opens playing, unless the address says `play=0` or the reader asked for less motion: then it opens still, with Play ready, and Play runs it anyway.
 * `ms` is the time the page has played, so Play goes on from where Pause stopped it.
 * @param host The element whose being on screen keeps the loop going.
 * @param controls Where the button goes.
 * @param testid The button's test id.
 * @param draw Draws the picture at that time.
 */
export function playable(host: Element, controls: HTMLElement, testid: string, draw: (ms: number) => void): void {
  const address = createAddressState({ defaults: {} });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let playing = address.get("play") !== "0" && !reduced.matches;
  let wake: (() => void) | null = null;
  let last = 0;
  let lost = 0;
  let resumed = false;
  const button = chip("", testid, () => {
    playing = !playing;
    if (playing) resumed = true;
    address.set("play", playing ? null : "0");
    show();
    if (playing) wake?.();
  }, "jPause");
  const show = (): void => {
    const key = playing ? "jPause" : "jPlay";
    button.dataset.say = key;
    const chooser = (window as unknown as { uchusenLanguage?: { word(key: string): string | undefined } }).uchusenLanguage;
    button.textContent = chooser?.word(key) ?? (playing ? "Pause" : "Play");
    // the name says what a press does (Pause, Play), so the button is not also a toggle: aria-pressed on top would be read twice. `data-on` is only the look of the playing state
    button.toggleAttribute("data-on", playing);
  };
  show();
  controls.append(button);
  // reduced motion switched on while it plays: it stops, and the button says Play
  reduced.addEventListener("change", () => {
    if (!reduced.matches || !playing) return;
    playing = false;
    show();
  });
  wake = everyFrame(host, (ms) => {
    if (resumed) {
      lost += ms - last;
      resumed = false;
    }
    last = ms;
    if (!playing) return false;
    draw(ms - lost);
  }, () => playing);
}
