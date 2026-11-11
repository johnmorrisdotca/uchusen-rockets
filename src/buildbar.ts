// `<uchusen-build>`: play, pause, scrub and a rate for one ship's build. It keeps the story clock and how many slots are built. Reduced motion shows numbered stills and does not play. The page hides it for a ship with no build order, and writes `build` and `at` on the address.
import { flightNow, playFrame, steppedPlace, stills, type PlayStep } from "./buildPlay.ts";

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const CSS = `
:host { display: block; color: inherit; font-size: 0.9rem; line-height: 1.4; }
:host([hidden]) { display: none; }
.row, .stills { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.stills { margin-top: 0.4rem; }
slot[name="speed"] { display: contents; }
button { display: inline-flex; align-items: center; gap: 0.35rem; min-width: 44px; min-height: 44px; padding: 0.3rem 0.75rem; border: 1px solid currentColor; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
button svg { width: 0.9rem; height: 0.9rem; fill: currentColor; flex: none; }
button[aria-pressed="true"] { font-weight: 700; }
button:disabled { opacity: 0.45; cursor: default; }
button:focus-visible, input:focus-visible, ::slotted(button:focus-visible) { outline: 2px solid currentColor; outline-offset: 2px; }
::slotted(button) { min-width: 44px; min-height: 44px; padding: 0.3rem 0.75rem; border: 1px solid currentColor; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
::slotted(button[aria-pressed="true"]) { font-weight: 700; }
input[type="range"] { flex: 1 1 10rem; min-width: 8rem; min-height: 44px; margin: 0; accent-color: var(--uchusen-accent, currentColor); }
.now { margin: 0.45rem 0 0; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

/**
 * The words the build bar says, each of which a page can replace. `{day}`, `{done}`, `{total}` and `{rate}` are filled in.
 *
 * @example
 * ```ts
 * import type { BuildWords } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const words: Partial<BuildWords> = { play: "Start" };
 * console.log(words.play);
 * ```
 */
export interface BuildWords {
  play: string;
  pause: string;
  start: string;
  repeat: string;
  range: string;
  day: string;
  done: string;
  rate: string;
  /** `{n}` is the flight number and `{name}` the module. */
  flight: string;
}

const NS = "http://www.w3.org/2000/svg";
const ICON = { play: "M4 2.2 13 8 4 13.8z", pause: "M3 2h3.2v12H3zM9.8 2H13v12H9.8z", back: "M2 2h2.2v12H2zM14 3 6.2 8 14 13z" };

function icon(kind: keyof typeof ICON): SVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", ICON[kind]);
  svg.append(path);
  return svg;
}

function labelled(kind: keyof typeof ICON, text: string): Node[] {
  const word = document.createElement("span");
  word.textContent = text;
  return [icon(kind), word];
}

/**
 * Sets a button's icon and word only when they are not already there. The playing bar draws every tenth of a second, and a button whose children are replaced under a finger that is already down loses the click (WebKit sends none when
 * the node the press began on has left the page), so a redraw that changes nothing must touch nothing.
 */
function setLabel(button: HTMLElement, kind: keyof typeof ICON, text: string): void {
  const key = `${kind}\u0001${text}`;
  if (button.dataset.label === key) return;
  button.dataset.label = key;
  button.replaceChildren(...labelled(kind, text));
}

/** Sets a node's text only when it differs, so an unchanged text is not replaced. */
function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

const DAY_S = 86_400;

function clockOf(day: number): { day: number; clock: string } {
  const whole = Math.floor(Math.max(0, day));
  const seconds = Math.min(DAY_S - 1, Math.floor((day - whole) * DAY_S));
  const pad = (n: number) => String(n).padStart(2, "0");
  return { day: whole, clock: `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}` };
}

const WORDS: BuildWords = {
  play: "Play",
  pause: "Pause",
  start: "Back to start",
  repeat: "Repeat",
  range: "Where in the build",
  day: "Day {day}, {clock}",
  done: "{done} of {total} built",
  rate: "x{rate}",
  flight: "Flight {n}: {name}",
};

/**
 * The `<uchusen-build>` element: one row for a ship's build. Set `steps` from `buildOf`. `onMove` hears the place, from 0 to 1.
 *
 * @example
 * ```ts no-run
 * import { UchusenBuild } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * const bar: UchusenBuild = document.createElement("uchusen-build") as UchusenBuild;
 * bar.steps = [];
 * document.body.append(bar);
 * ```
 */
export class UchusenBuild extends HTMLBase {
  /** Called with the place, from 0 to 1, when the reader scrubs, plays or picks a still. */
  onMove: ((at: number) => void) | null = null;
  /** Called when Repeat is pressed. The page keeps it in the address. */
  onRepeat: ((on: boolean) => void) | null = null;
  /** Called when play starts or stops, so a page can keep drawing while the story clock runs. */
  onPlay: ((playing: boolean) => void) | null = null;
  /** A short state after the day line, such as the ring being sealed. Empty shows nothing. */
  private stageText = "";
  /** The ship and the bay, shown before the day. Empty shows nothing. */
  private leadText = "";
  private order: readonly PlayStep[] | null = null;
  private place = 0;
  /** Story seconds in one real second. 1 is real time. 86400 is one story day a real second. */
  private rate = 1;
  /** One flight takes about 30 real seconds, whatever the speed buttons say. */
  private watchOn = false;
  private repeatOn = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** The last tick. A late tick counts at most two real seconds, so a stall does not skip the build. */
  private mark = 0;
  private said: Partial<BuildWords> = {};
  /** A page's names for flight slots, in the reader's language. A missing slot keeps the English title. */
  private named: Readonly<Record<string, string>> = {};
  private parts: { play: HTMLButtonElement; start: HTMLButtonElement; repeat: HTMLButtonElement; range: HTMLInputElement; now: HTMLElement; stills: HTMLElement } | null = null;

  /** The build order. `null` hides the bar and stops the clock. */
  get steps(): readonly PlayStep[] | null {
    return this.order;
  }

  set steps(value: readonly PlayStep[] | null) {
    this.order = value;
    this.stop();
    this.place = 0;
    this.hidden = value === null;
    if (this.parts) this.draw();
  }

  /** How far through the build, from 0 to 1. */
  get at(): number {
    return this.place;
  }

  set at(value: number) {
    this.place = Math.min(1, Math.max(0, value));
    if (this.parts) this.draw();
  }

  /** True while Watch a flight is on. */
  get watch(): boolean {
    return this.watchOn;
  }

  set watch(on: boolean) {
    this.watchOn = on;
  }

  /** Play again from the keel when the build reaches the end. */
  get repeat(): boolean {
    return this.repeatOn;
  }

  set repeat(on: boolean) {
    this.repeatOn = on;
    if (this.parts) this.draw();
  }

  /** The words this bar says. Anything left out stays English. */
  get words(): Partial<BuildWords> {
    return this.said;
  }

  set words(words: Partial<BuildWords>) {
    this.said = { ...words };
    if (this.parts) this.draw();
  }

  /** Slot titles in the reader's language. Anything left out keeps its English title. */
  set titles(value: Readonly<Record<string, string>>) {
    this.named = value;
    if (this.parts) this.draw();
  }

  connectedCallback(): void {
    if (!this.shadowRoot) this.build();
    this.addEventListener("kazoku-speedchange", this.onSpeed);
    this.draw();
  }

  disconnectedCallback(): void {
    this.removeEventListener("kazoku-speedchange", this.onSpeed);
    this.stop();
  }

  private onSpeed = (event: Event): void => {
    const value = (event as CustomEvent<{ value?: number }>).detail?.value;
    if (typeof value === "number" && Number.isFinite(value)) this.rate = value;
  };

  private word(key: keyof BuildWords): string {
    return this.said[key] ?? WORDS[key];
  }

  private fill(key: keyof BuildWords, values: Record<string, string | number>): string {
    return this.word(key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
  }

  private reduced(): boolean {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private stop(): void {
    const was = this.timer !== null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.dataset.playing = "false";
    if (was) this.onPlay?.(false);
  }

  private start(): void {
    if (this.reduced() || !this.order || this.timer) return;
    if (this.place >= 1) this.place = 0;
    this.dataset.playing = "true";
    this.mark = globalThis.performance?.now() ?? Date.now();
    this.onPlay?.(true);
    this.draw();
    this.onMove?.(this.place);
    this.timer = setInterval(() => {
      const now = globalThis.performance?.now() ?? Date.now();
      const elapsed = Math.min(2, Math.max(0, (now - this.mark) / 1000));
      this.mark = now;
      this.place = steppedPlace(this.order ?? [], this.place, elapsed, this.rate, this.watchOn);
      if (this.place >= 1 && this.repeatOn) this.place = 0;
      this.draw();
      this.onMove?.(this.place);
      if (this.place >= 1) {
        this.stop();
        this.draw();
      }
    }, 100);
  }

  private move(at: number): void {
    this.stop();
    this.place = Math.min(1, Math.max(0, at));
    this.draw();
    this.onMove?.(this.place);
  }

  private build(): void {
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, id: string): HTMLElementTagNameMap[K] => {
      const node = document.createElement(tag);
      node.dataset.testid = id;
      node.setAttribute("part", id);
      return node;
    };
    const play = make("button", "build-play");
    play.type = "button";
    play.addEventListener("click", () => {
      if (this.dataset.playing === "true") this.stop();
      else this.start();
      this.draw();
    });
    const range = make("input", "build-range");
    range.type = "range";
    range.min = "0";
    range.max = "1";
    range.step = "0.001";
    range.addEventListener("input", () => this.move(Number(range.value)));
    const start = make("button", "build-start");
    start.type = "button";
    start.addEventListener("click", () => this.move(0));
    const repeat = make("button", "build-repeat");
    repeat.type = "button";
    repeat.addEventListener("click", () => {
      this.repeatOn = !this.repeatOn;
      this.draw();
      this.onRepeat?.(this.repeatOn);
    });
    const speed = document.createElement("slot");
    speed.name = "speed";
    const row = document.createElement("div");
    row.className = "row";
    row.append(play, start, range, speed, repeat);
    const stillsRow = make("div", "build-stills");
    stillsRow.className = "stills";
    const now = make("p", "build-now");
    now.className = "now";
    now.setAttribute("aria-live", "polite");
    root.append(style, row, stillsRow, now);
    this.parts = { play, start, repeat, range, now, stills: stillsRow };
  }

  private draw(): void {
    const parts = this.parts;
    const order = this.order;
    if (!parts || !order) return;
    const reduced = this.reduced();
    const frame = playFrame(order, this.place);
    const playing = this.dataset.playing === "true";
    const playWord = this.word(playing ? "pause" : "play");
    const startWord = this.word("start");
    setLabel(parts.play, playing ? "pause" : "play", playWord);
    parts.play.title = playWord;
    parts.play.disabled = reduced;
    parts.play.setAttribute("aria-pressed", String(playing));
    setLabel(parts.start, "back", startWord);
    parts.start.title = startWord;
    setText(parts.repeat, this.word("repeat"));
    parts.repeat.setAttribute("aria-pressed", String(this.repeatOn));
    parts.range.value = String(this.place);
    parts.range.setAttribute("aria-label", this.word("range"));
    const dayText = this.dayText(frame.day);
    const flight = flightNow(order, this.place);
    const flightText = flight ? this.fill("flight", { n: flight.n, name: this.named[flight.slot] || flight.title }) : "";
    parts.range.setAttribute("aria-valuetext", flightText ? `${flightText}. ${dayText}` : dayText);
    if (parts.stills.childNodes.length) parts.stills.replaceChildren();
    if (reduced) {
      const frames = stills(order);
      for (const [index, still] of frames.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.testid = `build-still-${index + 1}`;
        button.textContent = String(index + 1);
        button.setAttribute("aria-pressed", String(Math.abs(still.day - frame.day) < 0.5));
        button.addEventListener("click", () => this.move(index / (frames.length - 1)));
        parts.stills.append(button);
      }
    }
    const doneText = this.fill("done", { done: frame.done.length, total: order.length });
    const line = flightText ? `${flightText}. ${dayText}, ${doneText}` : `${dayText}, ${doneText}`;
    const body = this.stageText ? `${line}, ${this.stageText}` : line;
    setText(parts.now, this.leadText ? `${this.leadText}. ${body}` : body);
  }

  /** The ship and the bay, already in the reader's language. Empty leaves the day line as it was. */
  set lead(text: string) {
    if (text === this.leadText) return;
    this.leadText = text;
    if (this.parts) this.draw();
  }

  /** The ring's state, already in the reader's language. Set by the page from the view. */
  set stage(text: string) {
    if (text === this.stageText) return;
    this.stageText = text;
    if (this.parts) this.draw();
  }

  /** Whole days at a day a second or faster. Slower rates show the time within the day, so 1× is seen to move. */
  private dayText(day: number): string {
    if (this.rate >= DAY_S) return this.fill("day", { day: Math.round(day), clock: "" }).replace(/[,、]\s*$/u, "").trim();
    const clock = clockOf(day);
    return this.fill("day", { day: clock.day, clock: clock.clock });
  }
}

/** Defines `<uchusen-build>` once. */
export function defineUchusenBuild(): void {
  if (typeof customElements !== "undefined" && !customElements.get("uchusen-build")) customElements.define("uchusen-build", UchusenBuild);
}

declare global {
  interface HTMLElementTagNameMap {
    "uchusen-build": UchusenBuild;
  }
}
