// `<uchusen-build>`: play, pause, scrub and a rate for one ship's build. It keeps the story clock and how many slots are built. Reduced motion shows numbered stills and does not play. The page hides it for a ship with no build order, and writes `build` and `at` on the address.
import { PLAY_RATES, playFrame, stills, type PlayStep } from "./buildPlay.ts";

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const CSS = `
:host { display: block; color: inherit; font-size: 0.9rem; line-height: 1.4; }
:host([hidden]) { display: none; }
.row, .rates, .stills { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.rates, .stills { margin-top: 0.4rem; }
button { min-width: 44px; min-height: 44px; padding: 0.3rem 0.75rem; border: 1px solid currentColor; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
button[aria-pressed="true"] { font-weight: 700; }
button:disabled { opacity: 0.45; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
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
  range: string;
  day: string;
  done: string;
  rate: string;
}

const WORDS: BuildWords = {
  play: "Play",
  pause: "Pause",
  range: "Where in the build",
  day: "Day {day}",
  done: "{done} of {total} built",
  rate: "x{rate}",
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
  private order: readonly PlayStep[] | null = null;
  private place = 0;
  private rate: number = PLAY_RATES[0];
  private timer: ReturnType<typeof setInterval> | null = null;
  private said: Partial<BuildWords> = {};
  private parts: { play: HTMLButtonElement; range: HTMLInputElement; now: HTMLElement; rates: HTMLElement; stills: HTMLElement } | null = null;

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

  /** The words this bar says. Anything left out stays English. */
  get words(): Partial<BuildWords> {
    return this.said;
  }

  set words(words: Partial<BuildWords>) {
    this.said = { ...words };
    if (this.parts) this.draw();
  }

  connectedCallback(): void {
    if (!this.shadowRoot) this.build();
    this.draw();
  }

  disconnectedCallback(): void {
    this.stop();
  }

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
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.dataset.playing = "false";
  }

  private start(): void {
    if (this.reduced() || !this.order || this.timer) return;
    this.dataset.playing = "true";
    this.timer = setInterval(() => {
      const total = Math.max(1, playFrame(this.order ?? [], 1).total);
      this.place = Math.min(1, this.place + (this.rate * 0.1) / total);
      this.draw();
      this.onMove?.(this.place);
      if (this.place >= 1) this.stop();
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
    const row = document.createElement("div");
    row.className = "row";
    row.append(play, range);
    const rates = make("div", "build-rates");
    rates.className = "rates";
    for (const rate of PLAY_RATES) {
      const button = make("button", `build-rate-${rate}`);
      button.type = "button";
      button.addEventListener("click", () => {
        this.rate = rate;
        this.draw();
      });
      rates.append(button);
    }
    const stillsRow = make("div", "build-stills");
    stillsRow.className = "stills";
    const now = make("p", "build-now");
    now.className = "now";
    now.setAttribute("aria-live", "polite");
    root.append(style, row, rates, stillsRow, now);
    this.parts = { play, range, now, rates, stills: stillsRow };
  }

  private draw(): void {
    const parts = this.parts;
    const order = this.order;
    if (!parts || !order) return;
    const reduced = this.reduced();
    const frame = playFrame(order, this.place);
    const playing = this.dataset.playing === "true";
    parts.play.textContent = this.word(playing ? "pause" : "play");
    parts.play.disabled = reduced;
    parts.play.setAttribute("aria-pressed", String(playing));
    parts.range.value = String(this.place);
    parts.range.setAttribute("aria-label", this.word("range"));
    parts.range.setAttribute("aria-valuetext", this.fill("day", { day: Math.round(frame.day) }));
    for (const button of parts.rates.querySelectorAll("button")) {
      const rate = Number(button.dataset.testid?.replace("build-rate-", ""));
      button.textContent = this.fill("rate", { rate });
      button.setAttribute("aria-pressed", String(rate === this.rate));
    }
    parts.stills.replaceChildren();
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
    parts.now.textContent = `${this.fill("day", { day: Math.round(frame.day) })}, ${this.fill("done", { done: frame.done.length, total: order.length })}`;
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
