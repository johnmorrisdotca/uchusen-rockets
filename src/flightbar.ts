// `<uchusen-flight for="rocket">`: the play, pause and scrub of a rocket's flight, with where it is, what happens there and which engines burn, engine by engine. It draws nothing and has no clock of its own: the rocket's own frame loop moves the timeline and tells it, so it adds no frame request. Importing the element's module defines it.
import { SOURCES } from "./data/sources.ts";
import { clockWords, lastPosition, phaseAt, type Flight } from "./flight.ts";
import type { UchusenRocket } from "./element.ts";

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const CSS = `
:host { display: block; color: inherit; font-size: 0.9rem; line-height: 1.4; }
:host([hidden]) { display: none; }
[hidden] { display: none !important; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
button { min-width: 44px; min-height: 44px; padding: 0.3rem 0.75rem; border: 1px solid currentColor; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
button:disabled { opacity: 0.45; cursor: default; }
button:focus-visible, input:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
input[type="range"] { flex: 1 1 10rem; min-width: 8rem; min-height: 44px; margin: 0; accent-color: var(--uchusen-accent, currentColor); }
.now { margin: 0.45rem 0 0.1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.what, .fine { margin: 0; }
.fine { margin-top: 0.3rem; font-size: 0.78rem; opacity: 0.78; }
.charts { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-top: 0.5rem; }
figure { margin: 0; width: 5.5rem; }
figure svg { display: block; width: 100%; height: auto; }
figcaption { font-size: 0.74rem; line-height: 1.25; margin-top: 0.2rem; }
a { color: inherit; }
`;

const sheet: { made: CSSStyleSheet | null } = { made: null };

export class UchusenFlight extends HTMLBase {
  static readonly observedAttributes = ["for"];
  private rocket: UchusenRocket | null = null;
  private drawnFor = "";
  private chartKey = "";
  private parts: { play: HTMLButtonElement; back: HTMLButtonElement; next: HTMLButtonElement; leave: HTMLButtonElement; range: HTMLInputElement; now: HTMLElement; what: HTMLElement; charts: HTMLElement; about: HTMLElement; none: HTMLElement; body: HTMLElement } | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) this.build();
    this.bind();
  }

  disconnectedCallback(): void {
    this.rocket?.removeEventListener("uchusen-flight", this.update);
    this.rocket = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.shadowRoot) this.bind();
  }

  private bind(): void {
    this.rocket?.removeEventListener("uchusen-flight", this.update);
    const id = this.getAttribute("for");
    this.rocket = id ? ((this.getRootNode() as Document | ShadowRoot).getElementById?.(id) as UchusenRocket | null) : null;
    this.rocket?.addEventListener("uchusen-flight", this.update);
    queueMicrotask(this.update);
  }

  private build(): void {
    const root = this.attachShadow({ mode: "open" });
    try {
      if (!sheet.made) {
        sheet.made = new CSSStyleSheet();
        sheet.made.replaceSync(CSS);
      }
      root.adoptedStyleSheets = [sheet.made];
    } catch {
      const style = document.createElement("style");
      style.textContent = CSS;
      root.append(style);
    }
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, id: string, text = ""): HTMLElementTagNameMap[K] => {
      const node = document.createElement(tag);
      node.dataset.testid = id;
      node.setAttribute("part", id);
      node.textContent = text;
      return node;
    };
    const button = (id: string, text: string, on: () => void) => {
      const node = make("button", id, text);
      node.type = "button";
      node.addEventListener("click", on);
      return node;
    };
    const play = button("flight-play", "Play", () => {
      if (this.rocket?.flightState.playing) this.rocket.pause();
      else this.rocket?.play();
    });
    const position = () => this.rocket?.flightState.position ?? 0;
    const back = button("flight-back", "Back", () => this.rocket?.seek(Math.ceil(position()) - 1));
    const next = button("flight-next", "Next", () => this.rocket?.seek(Math.floor(position()) + 1));
    const leave = button("flight-leave", "Back to the rocket", () => this.rocket?.endFlight());
    const range = make("input", "flight-range");
    range.type = "range";
    range.min = "0";
    range.step = "0.01";
    range.value = "0";
    range.setAttribute("aria-label", "Where along the flight");
    range.addEventListener("input", () => this.rocket?.seek(Number(range.value)));
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("part", "flight-row");
    row.append(play, back, range, next, leave);
    const now = make("p", "flight-now");
    now.className = "now";
    now.setAttribute("aria-live", "polite");
    const what = make("p", "flight-what");
    what.className = "what";
    const charts = make("div", "flight-charts");
    charts.className = "charts";
    const about = make("p", "flight-about");
    about.className = "fine";
    const body = document.createElement("div");
    body.setAttribute("part", "flight-body");
    body.append(row, now, what, charts, about);
    const none = make("p", "flight-none", "No flight timeline for this version yet: no page read here gives one.");
    none.className = "fine";
    root.append(body, none);
    this.parts = { play, back, next, leave, range, now, what, charts, about, none, body };
  }

  private drawAbout(flight: Flight, reduced: boolean): void {
    if (!this.parts) return;
    const source = SOURCES[flight.source];
    const link = document.createElement("a");
    link.href = source.url;
    link.rel = "noopener";
    link.textContent = `${source.publisher}: ${source.title}`;
    this.parts.about.replaceChildren(`${flight.basis} The times and engine counts are sourced; how the picture moves between them is illustrative, not to scale. ${flight.note ?? ""} ${reduced ? "This device asks for reduced motion, so nothing plays and no flame shows: move the slider or step through, and the charts say which engines burn. " : ""}From `, link, ".");
  }

  private update = (): void => {
    const parts = this.parts;
    const rocket = this.rocket;
    if (!parts) return;
    const flight = rocket?.flight ?? null;
    parts.body.hidden = !flight;
    parts.none.hidden = Boolean(flight);
    if (!rocket || !flight) {
      this.drawnFor = "";
      this.dataset.flight = "";
      return;
    }
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (this.drawnFor !== flight.id) {
      this.drawnFor = flight.id;
      parts.range.max = String(lastPosition(flight));
      parts.play.disabled = reduced;
      this.drawAbout(flight, reduced);
    }
    const state = rocket.flightState;
    const { index, phase } = phaseAt(flight, state.position);
    this.dataset.flight = flight.id;
    this.dataset.phase = state.active ? phase.id : "";
    this.dataset.playing = String(state.playing);
    parts.play.textContent = state.playing ? "Pause" : state.ended ? "Play again" : "Play";
    parts.play.setAttribute("aria-pressed", String(state.playing));
    parts.back.disabled = state.position <= 0;
    parts.next.disabled = state.position >= lastPosition(flight);
    parts.leave.disabled = !state.active;
    parts.range.value = String(state.position);
    parts.range.setAttribute("aria-valuetext", `${clockWords(phase.at)}, ${phase.name}`);
    parts.now.textContent = `${clockWords(phase.at)}, ${phase.name}${phase.altitude?.value ? `, ${phase.altitude.value}` : ""}`;
    parts.what.textContent = phase.what;
    const chartKey = `${flight.id}/${index}/${state.active}`;
    if (chartKey !== this.chartKey) {
      this.chartKey = chartKey;
      // nothing started yet: what burns in the first phase
      const charts = rocket.engineCharts(state.active ? null : flight.phases[0].id);
      const template = document.createElement("template");
      template.innerHTML = charts.map((chart) => `<figure data-slot="${chart.slot}" data-burning="${chart.burning}">${chart.svg}<figcaption></figcaption></figure>`).join("");
      for (const [i, node] of [...template.content.querySelectorAll("figcaption")].entries()) node.textContent = charts[i].words;
      parts.charts.replaceChildren(template.content);
    }
  };
}

export function defineUchusenFlight(): void {
  if (typeof customElements !== "undefined" && !customElements.get("uchusen-flight")) customElements.define("uchusen-flight", UchusenFlight);
}

declare global {
  interface HTMLElementTagNameMap {
    "uchusen-flight": UchusenFlight;
  }
}
