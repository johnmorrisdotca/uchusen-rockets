// The viewer: `<uchusen-rocket rocket="starship" variant="v3" show="together" look="line">` in any page. The drawing first, then, when it comes on screen and the browser can draw WebGL, the 3D view
// crossfading in over it; drag to turn, keyboard, tilt on phones, a slow spin, reduced motion; the drawing stays on no WebGL, Save-Data or any failure. Importing this file defines the elements. three.js is
// loaded only when a 3D view is wanted, and a licensed model only when the painted look asks for one.
import { build, type Built, FitError } from "./build/index.ts";
import { lineupSvg } from "./build/lineup.ts";
import { CROSSFADE_MS, REDUCED_FADE_MS, revealDelay } from "./crossfade.ts";
import type { Description, FitReport } from "./fit.ts";
import { type Angle, cleanView, VIEWS } from "./framing.ts";
import { cleanShow } from "./layout.ts";
import { cleanLook, type LookName } from "./looks.ts";
import { ROCKETS } from "./rockets.ts";
import { type Reading, tiltMode, tiltTurn } from "./tilt.ts";
import type { RocketViewer, Spin } from "./element/scene.ts";

export type RocketState = "picture" | "loading" | "3d" | "fallback" | "error";

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/** A view out of sight keeps its WebGL canvas this long before letting it go (a browser allows only a few at a time). */
const RELEASE_MS = 30_000;
const DEFAULT_SPIN: Spin = { seconds: 180, way: "cw" };

let assetBase: string | null = null;
/** Where the licensed models are, for every element with no `assets` attribute of its own. Left unset: beside this module, in ./assets/. */
export function setAssetBase(url: string): void {
  assetBase = url.endsWith("/") ? url : `${url}/`;
}
const defaultBase = () => assetBase ?? new URL("./assets/", import.meta.url).href;

const CSS = `
:host { display: block; position: relative; color: inherit; }
:host([hidden]) { display: none; }
.picture { position: relative; width: 100%; aspect-ratio: var(--uchusen-aspect, 3 / 4); margin: 0; border-radius: inherit; }
.drawing, .drawing svg { display: block; width: 100%; height: 100%; }
.drawing, .canvas { transition: opacity var(--uchusen-fade, 1500ms) ease-in-out, filter var(--uchusen-fade, 1500ms) ease-in-out; }
.stage { position: absolute; inset: 0; }
.canvas { display: block; width: 100%; height: 100%; opacity: 0; filter: blur(3px); cursor: grab; border-radius: inherit; }
.canvas:active { cursor: grabbing; }
.canvas:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
.picture[data-state="3d"] .drawing { opacity: 0; filter: blur(2px); }
.picture[data-state="3d"] .canvas { opacity: 1; filter: none; }
.tilt { position: absolute; right: 0.5rem; bottom: 0.5rem; min-height: 2rem; padding: 0.25rem 0.75rem; border: 1px solid currentColor; border-radius: 1rem; background: transparent; color: inherit; font: inherit; font-size: 0.8rem; cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  .drawing, .canvas { filter: none !important; transition: opacity var(--uchusen-fade, 400ms) ease; }
}
`;

function adopt(root: ShadowRoot, css: string, holder: { sheet: CSSStyleSheet | null }): void {
  try {
    if (!holder.sheet) {
      holder.sheet = new CSSStyleSheet();
      holder.sheet.replaceSync(css);
    }
    root.adoptedStyleSheets = [holder.sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = css;
    root.appendChild(style);
  }
}

const rocketSheet: { sheet: CSSStyleSheet | null } = { sheet: null };
const lineupSheet: { sheet: CSSStyleSheet | null } = { sheet: null };
const media = (query: string): boolean => typeof matchMedia === "function" && matchMedia(query).matches;

let webgl: boolean | null = null;
function webglWorks(): boolean {
  if (webgl !== null) return webgl;
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    webgl = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

function whyNot(mode: string): string {
  if (mode === "drawing") return "off";
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || media("(prefers-reduced-data: reduce)")) return "reduced-data";
  if (!webglWorks()) return "no-webgl";
  return "";
}

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };

export class UchusenRocket extends HTMLBase {
  static readonly observedAttributes = ["rocket", "variant", "show", "look", "view", "build", "mode", "assets", "spin", "way", "label"];

  private descriptionValue: Description | null = null;
  private picture: HTMLElement | null = null;
  private holder: HTMLElement | null = null;
  private drawing: HTMLElement | null = null;
  private viewer: RocketViewer | null = null;
  private watch: IntersectionObserver | null = null;
  private cleanups: (() => void)[] = [];
  private releaseTimer = 0;
  private revealTimer = 0;
  private generation = 0;
  private builtNow: Built | null = null;
  private queued = false;
  private stateNow: RocketState = "picture";
  private shownAt = 0;
  private starting = false;
  private key = "";

  /** What is showing now. */
  get state(): RocketState {
    return this.stateNow;
  }

  /** What the fit check said about what is showing: its label, parts and credits. */
  get report(): FitReport | null {
    return this.builtNow?.report ?? null;
  }

  /** A rocket from parts, as a property: the same as the `build` attribute's JSON. */
  get description(): Description | null {
    return this.descriptionValue;
  }
  set description(value: Description | null) {
    this.descriptionValue = value;
    this.queue();
  }

  /** Where the camera is looking from, while there is a 3D view. */
  get angle(): Angle | null {
    return this.viewer?.currentAngle() ?? null;
  }

  connectedCallback(): void {
    if (!this.shadowRoot) adopt(this.attachShadow({ mode: "open" }), CSS, rocketSheet);
    this.queue();
  }

  disconnectedCallback(): void {
    this.teardown();
    this.key = "";
  }

  attributeChangedCallback(name: string, before: string | null, after: string | null): void {
    if (before === after) return;
    if (name === "spin" || name === "way") this.viewer?.setSpin(this.spin());
    else this.queue();
  }

  // ---------------------------------------------------------------------------------------------------------------------------------

  private spin(): Spin {
    const raw = this.getAttribute("spin");
    const named: Record<string, number> = { off: 0, slow: 180, medium: 67, fast: 20 };
    const seconds = raw === null ? DEFAULT_SPIN.seconds : (named[raw] ?? (Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : DEFAULT_SPIN.seconds));
    return { seconds, way: this.getAttribute("way") === "ccw" ? "ccw" : "cw" };
  }

  private descriptionNow(): Description {
    if (this.descriptionValue) return this.descriptionValue;
    const raw = this.getAttribute("build");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Description>;
        return { rocket: String(parsed.rocket ?? ""), ...(parsed.variant ? { variant: String(parsed.variant) } : {}), ...(parsed.parts ? { parts: parsed.parts } : {}) };
      } catch {
        return { rocket: "" };
      }
    }
    const variant = this.getAttribute("variant");
    return { rocket: this.getAttribute("rocket") ?? "starship", ...(variant ? { variant } : {}) };
  }

  private queue(): void {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (this.isConnected) this.update();
    });
  }

  private teardown(): void {
    this.generation++;
    this.watch?.disconnect();
    this.watch = null;
    window.clearTimeout(this.releaseTimer);
    window.clearTimeout(this.revealTimer);
    for (const clean of this.cleanups.splice(0)) clean();
    this.viewer?.dispose();
    this.viewer = null;
  }

  private setState(state: RocketState, why = ""): void {
    this.stateNow = state;
    if (this.picture) this.picture.dataset.state = state;
    this.dataset.state = state;
    if (why) this.dataset.why = why;
    else delete this.dataset.why;
  }

  private emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /** What to draw from the attributes, every value checked. */
  private settings(built: Built) {
    const look: LookName = cleanLook(this.getAttribute("look"));
    const show = cleanShow(this.getAttribute("show"), built.parts.map((part) => part.slot));
    const viewName = cleanView(this.getAttribute("view"));
    return { look, show, viewName, angle: VIEWS[viewName] };
  }

  private update(): void {
    const description = this.descriptionNow();
    const key = JSON.stringify(description);
    if (key !== this.key || !this.builtNow) {
      this.key = key;
      try {
        this.builtNow = build(description);
      } catch (error) {
        this.builtNow = null;
        this.renderShell();
        this.setState("error", error instanceof FitError ? error.report.issues[0]?.code ?? "error" : "error");
        this.emit("uchusen-error", { error });
        return;
      }
      if (!this.picture) this.renderShell();
      void this.applyRocket();
      return;
    }
    this.applySettings();
  }

  private renderShell(): void {
    const root = this.shadowRoot;
    if (!root) return;
    for (const child of [...root.childNodes]) child.remove();
    const reduced = media("(prefers-reduced-motion: reduce)");
    const picture = document.createElement("figure");
    picture.className = "picture";
    picture.setAttribute("part", "figure");
    picture.style.setProperty("--uchusen-fade", `${reduced ? REDUCED_FADE_MS : CROSSFADE_MS}ms`);
    const drawing = document.createElement("div");
    drawing.className = "drawing";
    drawing.setAttribute("part", "drawing");
    const holder = document.createElement("div");
    holder.className = "stage";
    picture.append(drawing, holder);
    root.appendChild(picture);
    this.picture = picture;
    this.drawing = drawing;
    this.holder = holder;
    this.startWatching();
  }

  /** The drawing for what the attributes say now. It is made from code, so it needs no file. */
  private redraw(): void {
    if (!this.builtNow || !this.drawing) return;
    const { look, show, angle } = this.settings(this.builtNow);
    // when a 3D view is showing, a drawing of the same angle is ready behind it
    const from = this.viewer?.currentAngle() ?? angle;
    const svg = this.builtNow.svg({ look, show, view: from });
    const template = document.createElement("template");
    template.innerHTML = svg;
    const node = template.content.firstElementChild;
    if (!node) return;
    node.setAttribute("aria-label", this.getAttribute("label") ?? this.builtNow.report.label);
    this.drawing.replaceChildren(node);
  }

  private mark(): void {
    if (!this.builtNow) return;
    const { look, show, viewName } = this.settings(this.builtNow);
    this.dataset.look = look;
    this.dataset.show = show;
    this.dataset.viewAngle = viewName;
    this.dataset.variant = this.builtNow.report.variant?.id ?? "";
    this.dataset.custom = String(this.builtNow.report.custom);
  }

  private async applyRocket(): Promise<void> {
    this.mark();
    this.redraw();
    if (!this.builtNow) return;
    if (this.viewer) {
      const { look, show } = this.settings(this.builtNow);
      this.viewer.setLabel(this.getAttribute("label") ?? this.builtNow.report.label);
      await this.viewer.load(this.builtNow, show, look, this.viewer.currentAngle());
      this.emit("uchusen-change", { report: this.builtNow.report });
    }
  }

  private lastView = "";
  private applySettings(): void {
    if (!this.builtNow) return;
    this.mark();
    const { look, show, viewName, angle } = this.settings(this.builtNow);
    if (this.viewer) {
      this.viewer.setLook(look);
      this.viewer.setShow(show);
      if (viewName !== this.lastView) this.viewer.setAngle(angle, true);
      this.viewer.setHome(angle);
    }
    this.lastView = viewName;
    this.redraw();
  }

  private startWatching(): void {
    this.watch?.disconnect();
    const reason = whyNot(this.getAttribute("mode") ?? "auto");
    if (reason) {
      this.setState(reason === "off" ? "picture" : "fallback", reason);
      if (reason !== "off") this.emit("uchusen-fallback", { reason });
      return;
    }
    this.setState("picture");
    this.watch = new IntersectionObserver(
      ([seen]) => {
        if (seen.isIntersecting) {
          this.shownAt ||= performance.now();
          window.clearTimeout(this.releaseTimer);
          if (this.viewer) this.viewer.setVisible(true);
          else if (!this.starting) void this.start();
        } else if (this.viewer) {
          this.viewer.setVisible(false);
          const generation = this.generation;
          this.releaseTimer = window.setTimeout(() => {
            this.viewer?.dispose();
            this.viewer = null;
            if (generation === this.generation) this.setState("picture");
          }, RELEASE_MS);
        }
      },
      { rootMargin: "200px 0px" },
    );
    this.watch.observe(this);
  }

  private fallBack(why: string): void {
    this.viewer?.dispose();
    this.viewer = null;
    this.setState("fallback", why);
    this.emit("uchusen-fallback", { reason: why });
  }

  private async start(): Promise<void> {
    const generation = this.generation;
    const built = this.builtNow;
    const holder = this.holder;
    if (!built || !holder) return;
    this.starting = true;
    this.setState("loading");
    const reduced = media("(prefers-reduced-motion: reduce)");
    try {
      const { RocketViewer } = await import("./element/scene.ts");
      if (generation !== this.generation) return;
      const assets = this.getAttribute("assets");
      const made = new RocketViewer(holder, {
        label: this.getAttribute("label") ?? built.report.label,
        reducedMotion: reduced,
        onLost: () => this.fallBack("context-lost"),
        assets: assets ? `${assets.replace(/\/$/, "")}/` : defaultBase(),
        onPainted: (state) => {
          this.dataset.painted = state;
          this.emit("uchusen-painted", { state });
        },
      });
      this.viewer = made;
      made.setVisible(true);
      const { look, show, viewName, angle } = this.settings(this.builtNow ?? built);
      this.lastView = viewName;
      await made.load(this.builtNow ?? built, show, look, angle);
      if (generation !== this.generation) return;
      made.setSpin(this.spin());
      const wait = revealDelay(this.shownAt, performance.now(), reduced);
      this.revealTimer = window.setTimeout(() => {
        if (generation === this.generation && this.viewer === made) {
          this.setState("3d");
          this.emit("uchusen-ready", { frames: made.frames });
          this.startTilt();
        }
      }, wait);
    } catch (error) {
      if (generation === this.generation) {
        this.emit("uchusen-error", { error });
        this.fallBack("error");
      }
    } finally {
      this.starting = false;
    }
  }

  private startTilt(): void {
    const Orientation = (typeof DeviceOrientationEvent === "undefined" ? undefined : DeviceOrientationEvent) as OrientationCtor | undefined;
    const mode = tiltMode({
      reducedMotion: media("(prefers-reduced-motion: reduce)"),
      coarsePointer: media("(pointer: coarse)"),
      hasOrientation: Orientation !== undefined,
      needsPermission: typeof Orientation?.requestPermission === "function",
    });
    const listen = () => {
      let rest: Reading | null = null;
      const onTilt = (event: DeviceOrientationEvent) => {
        const reading = { beta: event.beta, gamma: event.gamma };
        rest ??= reading;
        const turn = tiltTurn(reading, rest, window.screen.orientation?.angle ?? 0);
        if (turn) this.viewer?.setTilt(turn.azimuth, turn.polar);
      };
      window.addEventListener("deviceorientation", onTilt);
      this.cleanups.push(() => window.removeEventListener("deviceorientation", onTilt));
    };
    if (mode === "on") listen();
    if (mode === "ask" && this.picture) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tilt";
      button.setAttribute("part", "tilt");
      button.textContent = "Tilt to turn";
      button.addEventListener("click", async () => {
        button.remove();
        try {
          if ((await Orientation?.requestPermission?.()) === "granted") listen();
        } catch {
          // no tilt, then: the view still turns by finger
        }
      });
      this.picture.appendChild(button);
      this.cleanups.push(() => button.remove());
    }
  }
}

const LINEUP_CSS = `
:host { display: block; overflow-x: auto; color: inherit; }
svg { display: block; }
`;

/** Rockets side by side on one baseline at one scale: `<uchusen-lineup items="starship:v1,starship:v3,person,building" unit="4" ruler labels>`. */
export class UchusenLineup extends HTMLBase {
  static readonly observedAttributes = ["items", "unit", "look", "view", "show", "ruler", "labels"];

  connectedCallback(): void {
    if (!this.shadowRoot) adopt(this.attachShadow({ mode: "open" }), LINEUP_CSS, lineupSheet);
    this.render();
  }

  attributeChangedCallback(name: string, before: string | null, after: string | null): void {
    if (before !== after && this.shadowRoot) this.render();
  }

  private render(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const raw = Number.parseFloat(this.getAttribute("unit") ?? "3");
    const unit = Number.isFinite(raw) && raw > 0 && raw <= 100 ? raw : 3;
    const items = (this.getAttribute("items") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const { svg, items: shown } = lineupSvg({
      items,
      unit,
      look: cleanLook(this.getAttribute("look")),
      view: cleanView(this.getAttribute("view") ?? "front"),
      show: this.getAttribute("show") ?? undefined,
      ruler: this.hasAttribute("ruler"),
      labels: this.hasAttribute("labels"),
    });
    const template = document.createElement("template");
    template.innerHTML = svg;
    const node = template.content.firstElementChild;
    if (!node) return;
    for (const child of [...root.childNodes]) child.remove();
    root.appendChild(node);
    this.dataset.count = String(shown.length);
  }
}

/** Defines both elements, once. Importing this module does it. */
export function defineUchusenRocket(): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get("uchusen-rocket")) customElements.define("uchusen-rocket", UchusenRocket);
  if (!customElements.get("uchusen-lineup")) customElements.define("uchusen-lineup", UchusenLineup);
}

defineUchusenRocket();

export { ROCKETS };

declare global {
  interface HTMLElementTagNameMap {
    "uchusen-rocket": UchusenRocket;
    "uchusen-lineup": UchusenLineup;
  }
}
