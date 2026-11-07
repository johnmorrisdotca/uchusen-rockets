// The viewer: `<uchusen-rocket rocket="starship" variant="v3" show="together" look="line">` in any page. The drawing first, then, when it comes on screen and the browser can draw WebGL, the 3D view
// crossfading in over it; drag to turn, keyboard, tilt on phones, a slow spin, reduced motion; the drawing stays on no WebGL, Save-Data or any failure. Importing this file defines the elements. three.js is
// loaded only when a 3D view is wanted, and a licensed model only when the painted look asks for one.
import { build, buildPart, type Built, FitError } from "./build/index.ts";
import type { DetailLevel } from "./model/detail.ts";
import { buildOf } from "./buildPlay.ts";
import { bellsOf, enginesWanted, pickBells } from "./engines.ts";
import { lightMode } from "./model/fleet/lights.ts";
import { thrusterMode } from "./thrusters.ts";
import { motionsOf, motionSpeed, motionWanted } from "./model/fleet/motion.ts";
import { engineChart } from "./draw/plume.ts";
import { burnsOf, FlightClock, flightOf, frameAt, phaseAt, phasePosition, type Flight } from "./flight.ts";
import { defineUchusenFlight, UchusenFlight } from "./flightbar.ts";
import { lineupSvg } from "./build/lineup.ts";
import { CROSSFADE_MS, REDUCED_FADE_MS, revealDelay } from "./crossfade.ts";
import type { Description, FitReport } from "./fit.ts";
import { type Angle, cleanView, turnedBy, type ViewChoice, VIEWS } from "./framing.ts";
import { besideCraft } from "./beside.ts";
import { canScale, scalePercent } from "./concepts.ts";
import { cleanShow } from "./layout.ts";
import { cleanLook, type LookName } from "./looks.ts";
import { ROCKETS, SLOT_NAMES } from "./rockets.ts";
import { type Reading, tiltMode, tiltTurn } from "./tilt.ts";
import type { RocketViewer, ViewerFocus } from "./element/scene.ts";
import { Panel } from "./element/panel.ts";
import type { Inspector } from "./data/types.ts";
import { type Spin, spinOf } from "./spin.ts";

/**
 * What a `<uchusen-rocket>` is doing, as its `data-state` attribute says: `picture` (the drawing), `loading` (the 3D view is on its way), `3d`, `fallback` (no WebGL, so the drawing stays) or `error`.
 *
 * @example
 * ```ts
 * import type { RocketState } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * const states: RocketState[] = ["picture", "loading", "3d", "fallback", "error"];
 * console.log(states.length);
 * ```
 */
export type RocketState = "picture" | "loading" | "3d" | "fallback" | "error";

const HTMLBase: typeof HTMLElement = typeof HTMLElement === "undefined" ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/** A view out of sight keeps its WebGL canvas this long before letting it go (a browser allows only a few at a time). */
const RELEASE_MS = 30_000;
/** The drawing, followed along a turn, is made again at most this often. */
const PLACE_MS = 50;

let assetBase: string | null = null;
/**
 * Where the licensed models are, for every element with no `assets` attribute of its own. Left unset: beside this module, in ./assets/.
 *
 * @param url The folder the licensed models are in. A trailing slash is added if it has none.
 * @example
 * ```ts no-run
 * import { setAssetBase } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * setAssetBase("/static/uchusen-assets/");
 * ```
 */
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
:host([data-driven]) .picture { overflow: hidden; }
.canvas { display: block; width: 100%; height: 100%; opacity: 0; filter: blur(3px); cursor: grab; border-radius: inherit; }
.canvas:active { cursor: grabbing; }
.canvas:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
.picture[data-state="3d"] .drawing { opacity: 0; filter: blur(2px); }
.picture[data-state="3d"] .canvas { opacity: 1; filter: none; }
.panel { font: 0.85rem/1.4 system-ui, sans-serif; margin-top: 0.5rem; }
.panel .bar { display: flex; flex-wrap: nowrap; gap: 0.3rem; overflow-x: auto; padding-bottom: 0.2rem; scrollbar-width: thin; }
.panel button { flex: none; white-space: nowrap; min-height: 1.75rem; padding: 0.1rem 0.6rem; border: 1px solid currentColor; border-radius: 1rem; background: transparent; color: inherit; font: inherit; font-size: 0.8rem; cursor: pointer; }
.panel button[aria-selected="true"], .panel button[aria-pressed="true"] { background: color-mix(in srgb, currentColor 22%, transparent); box-shadow: inset 0 0 0 1px currentColor; font-weight: 600; }
.panel button:disabled { opacity: 0.5; cursor: default; }
.panel .body { margin-top: 0.4rem; max-height: 7rem; overflow: auto; }
.panel .body button { margin: 0 0.35rem 0.35rem 0; }
.panel td button.link { margin: 0; min-height: 0; padding: 0; border: 0; border-radius: 0; text-decoration: underline; text-align: left; }
.panel table { border-collapse: collapse; width: 100%; }
.panel th, .panel td { text-align: left; padding: 0.15rem 0.4rem; border-bottom: 1px solid color-mix(in srgb, currentColor 25%, transparent); vertical-align: top; }
.panel p { margin: 0 0 0.5rem; }
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

/**
 * The `<uchusen-rocket>` element: a rocket as a drawing that a 3D view takes over from when the browser can draw WebGL. Its attributes are the words of `RocketOptions`. It exposes its state as `data-state` and loads three.js only for a 3D view.
 *
 * @example
 * ```ts no-run
 * import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * const rocket: UchusenRocket = document.createElement("uchusen-rocket") as UchusenRocket;
 * rocket.setAttribute("rocket", "starship");
 * rocket.setAttribute("variant", "v3");
 * rocket.setAttribute("look", "painted");
 * document.body.append(rocket);
 * ```
 */
export class UchusenRocket extends HTMLBase {
  static readonly observedAttributes = ["rocket", "variant", "show", "look", "view", "build", "mode", "assets", "spin", "way", "label", "engines", "lights", "thrusters", "phase", "motion", "labels", "inspector", "beside", "captions", "scale-note", "off-screen", "scale", "progress", "float", "names", "leave", "docked", "edges", "world"];

  private descriptionValue: Description | null = null;
  private picture: HTMLElement | null = null;
  private holder: HTMLElement | null = null;
  private drawing: HTMLElement | null = null;
  private viewer: RocketViewer | null = null;
  /** The inset the page asked for, put back after a rocket loads, and the words that mark its point. */
  private framed: ViewerFocus | null = null;
  private frameLabel = "";
  private watch: IntersectionObserver | null = null;
  private releaseTimer = 0;
  private revealTimer = 0;
  private generation = 0;
  private builtNow: Built | null = null;
  private queued = false;
  private stateNow: RocketState = "picture";
  private shownAt = 0;
  private starting = false;
  private key = "";
  private driven: ViewChoice | null = null;
  private placeFrame = 0;
  private placedAt = 0;
  private stale = false;
  private onScreen = true;
  private drawn = { key: "", box: [0, 0, 1, 1] as [number, number, number, number] };
  private tiltCleanups: (() => void)[] = [];
  private clock: FlightClock | null = null;
  private flightFrame = 0;
  private flightLast = 0;
  private flightDrawn = -1;
  private noted = { index: -1, at: 0 };
  private phaseSeen: string | null = null;
  private flightSeen: string | null = null;

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

  /**
   * Where a point of the model, in metres, is on the picture now: in CSS pixels from the element's top left, and whether it is in front and inside. A page's label that follows a part calls it each time the element
   * says `uchusen-draw`, so the label moves as the model turns and stands still when it does not. Without a 3D view it gives null.
   *
   * @param point A point of the model in metres, as `labelsOf` gives them.
   * @returns The place on the picture, or null.
   */
  screenPoint(point: readonly [number, number, number]): { x: number; y: number; visible: boolean } | null {
    return this.viewer?.screenPoint([point[0], point[1], point[2]]) ?? null;
  }

  /**
   * Points the camera at one point of the model, in metres, and keeps every part on screen. A close picture of a lamp uses it, because the bow view frames the dome.
   *
   * @param target The point to look at.
   * @param direction From that point toward the camera.
   * @param distance How far the camera stands, in metres.
   */
  lookAt(target: readonly [number, number, number], direction: readonly [number, number, number], distance: number): void {
    const slots = this.builtNow?.parts.map((part) => part.slot) ?? [];
    if (slots.length === 0 || !this.viewer) return;
    const aim = { slots, target: [target[0], target[1], target[2]] as [number, number, number], direction: [direction[0], direction[1], direction[2]] as [number, number, number], distance };
    void this.upgrade().then(() => this.viewer?.focusOn(aim));
  }

  /** Isolate the named slots, look at a point and, when `label` is given, mark that point. `null` shows the whole ship again. */
  focusAt(focus: ViewerFocus | null, label = ""): void {
    this.framed = focus;
    this.frameLabel = label;
    if (focus) this.endFlight();
    this.applyFrame();
  }

  private applyFrame(): void {
    const focus = this.framed;
    if (focus) this.dataset.focus = focus.slots.join(" ");
    else delete this.dataset.focus;
    this.viewer?.focusOn(focus);
    const slot = focus?.slots[0];
    this.viewer?.setMarks(focus && slot && this.frameLabel ? [{ id: "module", text: this.frameLabel, at: focus.target, slot }] : null);
  }

  /** Lets a page choose the turn, tip, roll, zoom and pan, as the family's `<kazoku-view-controls>` reports them in `kazoku-viewchange` (`element.drive(event.detail)`): the element's own drag, wheel, keys and spin stand down, and the 3D view and the drawing both follow. `null` takes them back. */
  drive(choice: (Partial<ViewChoice> & { reason?: string }) | null): void {
    const reason = typeof choice?.reason === "string" ? choice.reason : "";
    const before = this.driven;
    if (choice === null) {
      this.driven = null;
      delete this.dataset.driven;
    } else {
      const number = (value: unknown, fallback: number, lo: number, hi: number) => (typeof value === "number" && Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : fallback);
      this.driven = {
        yaw: number(choice.yaw, this.driven?.yaw ?? 0, -3600, 3600),
        tilt: number(choice.tilt, this.driven?.tilt ?? 0, -90, 90),
        roll: number(choice.roll, this.driven?.roll ?? 0, -180, 180),
        zoom: number(choice.zoom, this.driven?.zoom ?? 1, 0.000001, 8),
        panX: number(choice.panX, this.driven?.panX ?? 0, -5000, 5000),
        panY: number(choice.panY, this.driven?.panY ?? 0, -5000, 5000),
      };
      this.dataset.driven = "true";
    }
    const now = this.driven;
    if (before && now && (Object.keys(now) as (keyof ViewChoice)[]).every((key) => before[key] === now[key])) return;
    this.viewer?.drive(this.driven, reason);
    this.place();
  }

  /** The drawing, turned and moved to the chosen view. The 3D view moves itself, so only the drawing needs it, and only until the 3D view shows. It is drawn at most about 20 times a second and never while out of sight: it is made again when it comes back. */
  private place(): void {
    if (this.stateNow === "3d" && this.viewer) return;
    if (!this.onScreen || document.hidden) {
      this.stale = true;
      return;
    }
    window.cancelAnimationFrame(this.placeFrame);
    const frame = (time: number) => {
      if (time - this.placedAt < PLACE_MS) {
        this.placeFrame = window.requestAnimationFrame(frame);
        return;
      }
      this.placedAt = time;
      this.stale = false;
      this.redraw();
    };
    this.placeFrame = window.requestAnimationFrame(frame);
  }

  private seen = () => {
    if (!document.hidden && this.stale) this.place();
    this.kickFlight();
  };

  /** A reader who changes the setting while the page is open is followed at once. */
  private motionChanged = () => this.queue();
  private motion: MediaQueryList | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) adopt(this.attachShadow({ mode: "open" }), CSS, rocketSheet);
    document.addEventListener("visibilitychange", this.seen);
    this.motion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.motion?.addEventListener("change", this.motionChanged);
    this.queue();
  }

  disconnectedCallback(): void {
    document.removeEventListener("visibilitychange", this.seen);
    this.motion?.removeEventListener("change", this.motionChanged);
    this.teardown();
    this.key = "";
  }

  attributeChangedCallback(name: string, before: string | null, after: string | null): void {
    if (before === after) return;
    if (name === "scale") {
      this.viewer?.setScaleMode(after === "true");
      // `scale="true"` is the true-scale view. A number is a Kaminari size, which rebuilds the craft.
      if (after !== "true" && after !== "false") this.queue();
    }
    else if (name === "spin" || name === "way") this.viewer?.setSpin(this.spin());
    else if (name === "motion") {
      if (this.viewer) this.lightViewer(this.viewer);
      this.dataset.motion = motionWanted(after, media("(prefers-reduced-motion: reduce)")) ? (motionSpeed(after) === 10 ? "fast" : "on") : "off";
    } else if (name === "lights" || name === "thrusters") {
      if (this.viewer) this.lightViewer(this.viewer);
    } else if (name === "scale-note") this.viewer?.setScaleNote(after);
    else if (name === "off-screen") this.viewer?.setOffScreen(after);
    else if (name === "float") this.viewer?.setFloating(after !== null);
    else if (name === "edges") this.viewer?.setEdges(after === "open");
    else if (name === "world") this.viewer?.setOrbit(after === "earth");
    else if (name === "names") this.viewer?.setNameLabels(after !== "off");
    else if (name === "progress") this.viewer?.setProgress(this.progress(), buildOf(this.getAttribute("variant") ?? "") ?? null);
    else if (name === "leave") this.viewer?.setLeave(...this.leaveNow());
    else if (name === "labels" || name === "inspector") this.syncPanel();
    else {
      // choosing what to show leaves the flight
      if (name === "show") this.endFlight();
      this.queue();
    }
  }

  // ---------------------------------------------------------------------------------------------------------------------------------

  private leaveNow(): [string | null, number] {
    const raw = this.getAttribute("leave");
    if (!raw) return [null, 0];
    const [slot, at] = raw.split(":");
    const value = Number(at);
    if (!slot || !Number.isFinite(value)) return [null, 0];
    return [slot, value];
  }

  private progress(): number | null {
    const raw = this.getAttribute("progress");
    if (raw === null || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
  }

  private spin(): Spin {
    return spinOf(this.getAttribute("spin"), this.getAttribute("way"));
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
    window.cancelAnimationFrame(this.placeFrame);
    window.cancelAnimationFrame(this.flightFrame);
    this.flightFrame = 0;
    this.stopTilt();
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

  // ---------------------------------------------------------------------------------------------------------------------------------
  // the flight

  /** The flight a page gives for what is showing, or null: a custom build never has one. */
  get flight(): Flight | null {
    const report = this.builtNow?.report;
    return report && !report.custom && report.variant ? flightOf(report.variant.rocket, report.variant.id) : null;
  }

  /** Where the timeline is: `active` once it has been started or moved, until `endFlight`. */
  get flightState(): { active: boolean; playing: boolean; ended: boolean; position: number; phase: string } {
    const clock = this.clock;
    const flight = this.flight;
    return { active: clock !== null, playing: clock?.playing ?? false, ended: clock?.ended ?? false, position: clock?.position ?? 0, phase: clock ? phaseAt(clock.flight, clock.position).phase.id : (flight?.phases[0].id ?? "") };
  }

  /** Plays the flight from where it is. It stands still out of sight, and does not play at all for a reader who asked for reduced motion: `seek` still moves it, by hand. */
  play(): void {
    const flight = this.flight;
    if (!flight || media("(prefers-reduced-motion: reduce)")) return;
    this.clock ??= new FlightClock(flight);
    this.clock.play();
    this.flightMoved();
  }

  pause(): void {
    this.clock?.pause();
    this.flightMoved();
  }

  /** Moves the timeline to a place, where 0 is the first phase, 1 the next and so on: `2.5` is half way from the third to the fourth. */
  seek(position: number): void {
    const flight = this.flight;
    if (!flight) return;
    this.clock ??= new FlightClock(flight);
    this.clock.seek(position);
    this.flightMoved();
  }

  /** Leaves the flight: the rocket as it was. */
  endFlight(): void {
    if (!this.clock) return;
    this.clock = null;
    this.phaseSeen = null;
    window.cancelAnimationFrame(this.flightFrame);
    this.flightFrame = 0;
    this.viewer?.setFlight(null);
    this.place();
    this.mark();
    this.noteFlight(true);
  }

  /** For each part with engines, which burn: at a named phase, where the timeline is, or else as the attributes have them. */
  engineCharts(phaseId: string | null = null): { slot: string; burning: number; total: number; words: string; svg: string }[] {
    const built = this.builtNow;
    if (!built) return [];
    const flight = this.flight;
    const fromPhase = phaseId && flight ? flight.phases.find((phase) => phase.id === phaseId) : null;
    const phase = fromPhase ?? (this.clock ? phaseAt(this.clock.flight, this.clock.position).phase : null);
    const burns = phase ? burnsOf(phase) : null;
    return built.parts.flatMap((part) => {
      const bells = bellsOf(part.pieces);
      if (bells.length === 0) return [];
      const fired = pickBells(bells, burns ? (burns[part.slot] ?? 0) : this.engineLights() ? bells.length : 0);
      const name = SLOT_NAMES[part.slot] ?? part.slot;
      const figure = phase?.burns[part.slot]?.engines;
      const words = `${name}: ${figure && figure.value === null ? `${fired.length} drawn, no source says how many` : `${fired.length} of ${bells.length}`}`;
      return [{ slot: part.slot, burning: fired.length, total: bells.length, words, svg: engineChart(bells, fired, words) }];
    });
  }

  private flightMoved(): void {
    if (this.clock) this.viewer?.setFlight(this.clock);
    if (this.viewer) this.noteFlight(true);
    else {
      this.place();
      this.noteFlight(true);
      this.kickFlight();
    }
    this.mark();
  }

  /** With no 3D view the drawing follows the timeline, by one frame request at a time, at most 20 drawings a second, never out of sight. */
  private kickFlight(): void {
    if (this.viewer || this.flightFrame || !this.clock?.playing || !this.onScreen || document.hidden) return;
    this.flightLast = 0;
    this.flightFrame = window.requestAnimationFrame(this.flightStep);
  }

  private flightStep = (time: number): void => {
    this.flightFrame = 0;
    const clock = this.clock;
    if (!clock?.playing || this.viewer || !this.onScreen || document.hidden) return;
    if (this.flightLast) clock.advance(Math.min(0.1, (time - this.flightLast) / 1000));
    this.flightLast = time;
    if (phaseAt(clock.flight, clock.position).index !== this.flightDrawn) {
      this.flightDrawn = phaseAt(clock.flight, clock.position).index;
      this.place();
    }
    this.noteFlight(!clock.playing);
    if (clock.playing) this.flightFrame = window.requestAnimationFrame(this.flightStep);
  };

  /** Tells the page where the timeline is: at once for a new phase or a stop, otherwise at most 8 times a second. */
  private noteFlight(now = false): void {
    const clock = this.clock;
    const index = clock ? phaseAt(clock.flight, clock.position).index : -1;
    const time = performance.now();
    if (!now && index === this.noted.index && time - this.noted.at < 125) return;
    this.noted = { index, at: time };
    this.dataset.phase = this.flightState.active ? this.flightState.phase : "";
    this.emit("uchusen-flight", this.flightState);
  }

  /** The craft that stand beside it: `beside="on"` is Starship (never beside Starship itself), and a list such as `beside="saturn-v:saturn-v,iss:iss"` is those craft, at most seven, each named in the picture. */
  private besideList(description: Description): Description[] {
    return besideCraft(this.getAttribute("beside"), description.rocket);
  }

  /** The options of a build for what stands beside it. */
  private besideOptions(description: Description): { beside: readonly Description[]; named: boolean } {
    const beside = this.besideList(description);
    // `captions` names the craft on screen even when it stands alone, so a phone's one craft still has its name
    const named = this.hasAttribute("captions") || (beside.length > 0 && this.getAttribute("beside") !== "on");
    return { beside, named };
  }

  /** The size of a Kaminari concept hull in per cent, `scale="80"`: 60 to 100 in steps of 5. Any other craft stays at 100. */
  private sizeNow(description: Description): number {
    const variant = description.variant ?? ROCKETS[description.rocket]?.defaultVariant ?? "";
    return canScale(description.rocket, variant) ? scalePercent(this.getAttribute("scale")) : 100;
  }

  /** Whether the engines are lit: `engines="on"`, and never for a reader who asked for reduced motion. */
  private engineLights(): boolean {
    return enginesWanted(this.getAttribute("engines"), media("(prefers-reduced-motion: reduce)"));
  }

  /** Hands the 3D view what the attributes say about the engines, and its reader's motion setting. */
  private lightViewer(viewer: RocketViewer): void {
    viewer.setReduced(media("(prefers-reduced-motion: reduce)"));
    viewer.setScaleMode(this.getAttribute("scale") === "true");
    viewer.setEngines(this.engineLights() ? "full" : null);
    viewer.setLights(lightMode(this.getAttribute("lights")));
    viewer.setThrusters(thrusterMode(this.getAttribute("thrusters")));
    viewer.setMotion(motionsOf(this.descriptionNow().rocket), motionWanted(this.getAttribute("motion"), media("(prefers-reduced-motion: reduce)")), motionSpeed(this.getAttribute("motion")));
  }

  /** `docked="dragon@crew-s"` mates those craft. Absent: the ship keeps the visitors it already draws. */
  private dockedOption(): { docked?: string } {
    return this.hasAttribute("docked") ? { docked: this.getAttribute("docked") ?? "" } : {};
  }

  private update(): void {
    const description = this.descriptionNow();
    const size = this.sizeNow(description);
    const docked = this.dockedOption();
    const key = `${JSON.stringify(description)}|${JSON.stringify(this.besideOptions(description))}|${size}|${docked.docked ?? "-"}`;
    if (key !== this.key || !this.builtNow) {
      this.key = key;
      try {
        this.builtNow = build(description, { detail: this.detailFor(description), ...this.besideOptions(description), scale: size, ...docked });
      } catch (error) {
        this.builtNow = null;
        this.renderShell();
        this.setState("error", error instanceof FitError ? error.report.issues[0]?.code ?? "error" : "error");
        this.emit("uchusen-error", { error });
        return;
      }
      if (!this.picture) this.renderShell();
      void this.applyRocket();
      this.settleFlight();
      return;
    }
    this.applySettings();
    this.settleFlight();
  }

  /** After a change: a timeline of another rocket ends, and the `phase` attribute moves it. */
  private settleFlight(): void {
    const flight = this.flight;
    if (this.clock && this.clock.flight.id !== flight?.id) this.endFlight();
    if ((flight?.id ?? null) !== this.flightSeen) {
      this.flightSeen = flight?.id ?? null;
      this.phaseSeen = null;
      this.noteFlight(true);
    }
    const asked = this.getAttribute("phase");
    if (asked !== this.phaseSeen) {
      this.phaseSeen = asked;
      const place = flight ? phasePosition(flight, asked) : null;
      if (place !== null) this.seek(place);
      else if (asked === null) this.endFlight();
    }
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

  /** The drawing for what the attributes say now. It is made from code, so it needs no file. A zoom or a move only changes which part of it the box shows (its viewBox), so the drawing is as sharp as the box and never grows past it. */
  private redraw(): void {
    if (!this.builtNow || !this.drawing) return;
    const { look, show: chosen, angle } = this.settings(this.builtNow);
    const flying = this.clock ? frameAt(this.clock.flight, this.clock.position, this.builtNow.parts.map((part) => ({ slot: part.slot, baseY: 0 })), 1) : null;
    const show = flying ? (flying.separated ? "apart" : "together") : chosen;
    // when a 3D view is showing, a drawing of the same angle is ready behind it
    const from = this.driven ? turnedBy(angle, this.driven.yaw, this.driven.tilt) : (this.viewer?.currentAngle() ?? angle);
    const label = this.getAttribute("label") ?? this.builtNow.report.label;
    const lit = flying ? (media("(prefers-reduced-motion: reduce)") ? false : flying.burns) : this.engineLights();
    // the angles the 3D view has now, to 5 degrees: the drawing changes a few times a phase, not once a frame
    const moves = flying ? Object.fromEntries(Object.entries(flying.poses).flatMap(([slot, pose]) => { const turned = Object.entries(pose.moves).map(([name, angle]) => [name, Math.round(angle / 5) * 5] as const).filter(([, angle]) => angle !== 0); return turned.length ? [[slot, Object.fromEntries(turned)]] : []; })) : undefined;
    const key = `${this.key}|${look}|${show}|${from.az.toFixed(2)}|${from.el.toFixed(2)}|${label}|${flying ? flying.index : ""}|${JSON.stringify(lit)}|${JSON.stringify(moves ?? {})}`;
    let node = this.drawing.firstElementChild;
    if (key !== this.drawn.key || !node) {
      const template = document.createElement("template");
      template.innerHTML = this.builtNow.svg({ look, show, view: from, engines: lit, ...(moves ? { moves } : {}) });
      node = template.content.firstElementChild;
      if (!node) return;
      node.setAttribute("aria-label", label);
      this.drawing.replaceChildren(node);
      const [x = 0, y = 0, w = 1, h = 1] = (node.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
      this.drawn = { key, box: [x, y, w, h] };
    }
    const { zoom = 1, panX = 0, panY = 0 } = this.driven ?? {};
    const [x, y, w, h] = this.drawn.box;
    // the picture fits the box (meet), so a user unit is `unit` pixels; the zoom is about the box's middle and the move is in pixels
    const unit = Math.min(this.drawing.clientWidth / w, this.drawing.clientHeight / h) || 1;
    const view = zoom === 1 && panX === 0 && panY === 0 ? [x, y, w, h] : [x + w / 2 - w / (2 * zoom) - panX / (unit * zoom), y + h / 2 - h / (2 * zoom) - panY / (unit * zoom), w / zoom, h / zoom];
    node.setAttribute("viewBox", view.map((n) => +n.toFixed(3)).join(" "));
    if (node instanceof SVGElement) node.style.transform = (this.driven?.roll ?? 0) === 0 ? "" : `rotate(${this.driven?.roll}deg)`;
    this.drawing.dataset.zoom = zoom.toFixed(2);
    this.drawing.dataset.pan = `${Math.round(panX)},${Math.round(panY)}`;
  }

  private mark(): void {
    if (!this.builtNow) return;
    const { look, show, viewName } = this.settings(this.builtNow);
    this.dataset.look = look;
    this.dataset.engines = this.engineLights() ? "on" : "off";
    this.dataset.motion = motionWanted(this.getAttribute("motion"), media("(prefers-reduced-motion: reduce)")) ? (motionSpeed(this.getAttribute("motion")) === 10 ? "fast" : "on") : "off";
    this.dataset.beside = this.builtNow.beside.length ? "on" : "off";
    this.dataset.size = String(this.sizeNow(this.descriptionNow()));
    this.dataset.flight = this.flight?.id ?? "";
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
      const { look, show, viewName, angle } = this.settings(this.builtNow);
      this.viewer.setLabel(this.getAttribute("label") ?? this.builtNow.report.label);
      // a new rocket keeps the angle, unless the same change named another view
      const from = viewName !== this.lastView || this.driven ? angle : this.viewer.currentAngle();
      this.lastView = viewName;
      const viewer = this.viewer;
      await viewer.load(this.builtNow, show, look, from);
      if (this.viewer === viewer && this.builtNow) {
        // a look or part chosen while the rocket loaded
        const now = this.settings(this.builtNow);
        if (now.look !== look) viewer.setLook(now.look);
        if (now.show !== show) viewer.setShow(now.show);
        viewer.setProgress(this.progress(), buildOf(this.builtNow.report.variant?.id ?? "") ?? null);
        viewer.setLeave(...this.leaveNow());
        this.lightViewer(viewer);
        this.applyFrame();
      }
      this.emit("uchusen-change", { report: this.builtNow.report });
    }
    this.syncPanel();
    this.panel?.refresh();
  }

  /** A fleet ship is built coarse first (the first picture and the far view) and fine when the camera comes near, an inset opens or one part is shown alone: once per visit, never on a turn or a look change. */
  private fine = false;
  private detailFor(description: Description): DetailLevel {
    const fictional = ROCKETS[description.rocket]?.variants.some((v) => v.status === "fictional");
    return fictional && !this.fine ? "coarse" : "full";
  }

  private async upgrade(): Promise<void> {
    if (this.fine || !this.builtNow) return;
    const description = this.descriptionNow();
    if (this.detailFor(description) === "full") return;
    this.fine = true;
    try {
      this.builtNow = build(description, { detail: "full", ...this.besideOptions(description), scale: this.sizeNow(description), ...this.dockedOption() });
    } catch {
      return;
    }
    await this.applyRocket();
  }

  private panel: Panel | null = null;
  private panelFor: Inspector | null = null;

  /** The panel of a ship that has one: tabs, a Labels toggle and insets that open on a click. `inspector="off"` leaves it out; `labels="on"` starts with the labels showing. */
  private syncPanel(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const inspector = this.builtNow?.report.variant?.inspector ?? null;
    if (!inspector || this.getAttribute("inspector") === "off") {
      this.panel?.el.remove();
      this.panel = null;
      this.panelFor = null;
      delete this.dataset.panel;
      if (!this.framed) this.viewer?.setMarks(null);
      return;
    }
    if (this.panelFor !== inspector || !this.panel || !this.panel.el.isConnected) {
      this.panel?.el.remove();
      this.panel = new Panel(inspector, {
        marks: (marks) => this.viewer?.setMarks(marks),
        focus: (focus) => {
          void (focus ? this.upgrade() : Promise.resolve()).then(() => this.viewer?.focusOn(focus));
        },
        drawn: () => Boolean(this.viewer),
        onLabels: (on) => (on ? this.setAttribute("labels", "on") : this.removeAttribute("labels")),
        download: () => this.downloadModel(),
        go: (rocket, variant) => {
          this.setAttribute("rocket", rocket);
          this.setAttribute("variant", variant);
        },
      });
      root.appendChild(this.panel.el);
      this.panelFor = inspector;
    }
    this.dataset.panel = "on";
    this.panel.labels(this.getAttribute("labels") === "on");
  }

  /** Saves the model on screen as a .glb: the whole ship, or the one part shown alone. It is made here, in the browser, from the same parts, because a fleet ship's file is far too big to ship. */
  private downloadModel(): void {
    if (!this.builtNow) return;
    // always the full detail, whatever level is on screen
    const built = build(this.descriptionNow(), { detail: "full" });
    const { show } = this.settings(built);
    const part = built.parts.find((p) => p.slot === show);
    const glb = part ? buildPart(part.record.id).glb() : built.glb();
    const bytes = glb.bytes;
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "model/gltf-binary" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${built.report.variant?.rocket ?? "rocket"}-${built.report.variant?.id ?? "model"}${part ? `-${part.slot}` : ""}.glb`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    this.emit("uchusen-download", { triangles: glb.triangles, bytes: bytes.byteLength });
  }

  private lastView = "";
  private applySettings(): void {
    if (!this.builtNow) return;
    this.mark();
    const { look, show, viewName, angle } = this.settings(this.builtNow);
    if (show !== "together" && show !== "apart") void this.upgrade();
    if (this.viewer) {
      this.viewer.setLook(look);
      this.viewer.setShow(show);
      this.lightViewer(this.viewer);
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
    } else this.setState("picture");
    this.watch = new IntersectionObserver(
      ([seen]) => {
        this.onScreen = seen.isIntersecting;
        if (seen.isIntersecting && this.stale) this.place();
        if (seen.isIntersecting) this.kickFlight();
        if (reason) return;
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
            this.stopTilt();
            this.kickFlight();
            if (generation === this.generation) {
              this.setState("picture");
              if (this.driven) this.place();
            }
          }, RELEASE_MS);
        }
      },
      { rootMargin: "200px 0px" },
    );
    this.watch.observe(this);
  }

  private stopTilt(): void {
    for (const clean of this.tiltCleanups.splice(0)) clean();
  }

  private fallBack(why: string): void {
    this.stopTilt();
    this.viewer?.dispose();
    this.viewer = null;
    this.kickFlight();
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
        onNear: () => void this.upgrade(),
        assets: assets ? `${assets.replace(/\/$/, "")}/` : defaultBase(),
        onPainted: (state) => {
          this.dataset.painted = state;
          if (state) this.emit("uchusen-painted", { state });
        },
        onFlight: () => this.noteFlight(!this.clock?.playing),
        onDraw: () => this.dispatchEvent(new CustomEvent("uchusen-draw")),
        orbit: this.hasAttribute("world"),
      });
      this.viewer = made;
      made.setOrbit(this.getAttribute("world") === "earth");
      window.cancelAnimationFrame(this.flightFrame);
      this.flightFrame = 0;
      if (this.clock) made.setFlight(this.clock);
      if (this.driven) made.drive(this.driven);
      made.setFloating(this.hasAttribute("float"));
      made.setEdges(this.getAttribute("edges") === "open");
      made.setNameLabels(this.getAttribute("names") !== "off");
      made.setVisible(true);
      const { look, show, viewName, angle } = this.settings(this.builtNow ?? built);
      this.lastView = viewName;
      await made.load(this.builtNow ?? built, show, look, angle);
      if (generation !== this.generation || this.viewer !== made) return;
      const now = this.settings(this.builtNow ?? built);
      if (now.look !== look) made.setLook(now.look);
      if (now.show !== show) made.setShow(now.show);
      made.setProgress(this.progress(), buildOf((this.builtNow ?? built).report.variant?.id ?? "") ?? null);
      made.setLeave(...this.leaveNow());
      this.lightViewer(made);
      this.applyFrame();
      made.setSpin(this.spin());
      made.setScaleNote(this.getAttribute("scale-note"));
      made.setOffScreen(this.getAttribute("off-screen"));
      made.setFloating(this.hasAttribute("float"));
      made.setEdges(this.getAttribute("edges") === "open");
      made.setNameLabels(this.getAttribute("names") !== "off");
      const wait = revealDelay(this.shownAt, performance.now(), reduced);
      this.revealTimer = window.setTimeout(() => {
        if (generation === this.generation && this.viewer === made) {
          if (made.fadeHeld()) {
            made.pinFade();
            this.setState("3d");
            made.settleFade();
          } else this.setState("3d");
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
    this.stopTilt();
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
        if (!this.onScreen || document.hidden) return;
        const reading = { beta: event.beta, gamma: event.gamma };
        rest ??= reading;
        const turn = tiltTurn(reading, rest, window.screen.orientation?.angle ?? 0);
        if (turn) this.viewer?.setTilt(turn.azimuth, turn.polar);
      };
      window.addEventListener("deviceorientation", onTilt);
      this.tiltCleanups.push(() => window.removeEventListener("deviceorientation", onTilt));
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
      this.tiltCleanups.push(() => button.remove());
    }
  }
}

const LINEUP_CSS = `
:host { display: block; overflow-x: auto; color: inherit; }
svg { display: block; }
`;

/**
 * Rockets side by side on one baseline at one scale: `<uchusen-lineup items="starship:v1,starship:v3,person,building" unit="4" ruler labels>`. `pose="stand"` draws a fleet ship upright in that row, and `view` turns it; without it a fleet ship still lies in its own band.
 *
 * @example
 * ```ts no-run
 * import { UchusenLineup } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * const lineup: UchusenLineup = document.createElement("uchusen-lineup") as UchusenLineup;
 * lineup.setAttribute("items", "starship:v2,starship:v3,person");
 * lineup.setAttribute("unit", "3");
 * lineup.toggleAttribute("ruler", true);
 * document.body.append(lineup);
 * ```
 */
export class UchusenLineup extends HTMLBase {
  static readonly observedAttributes = ["items", "unit", "look", "view", "show", "ruler", "labels", "filter", "fit", "real", "pose", "wide"];

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
    const { svg, items: shown, real: shownReal, unit: drawnUnit } = lineupSvg({
      real: this.getAttribute("real") === "on",
      items,
      unit,
      look: cleanLook(this.getAttribute("look")),
      view: cleanView(this.getAttribute("view") ?? "front"),
      show: this.getAttribute("show") ?? undefined,
      ruler: this.hasAttribute("ruler"),
      labels: this.hasAttribute("labels"),
      filter: ((value) => (value === "rockets" || value === "fleet" ? value : "all"))(this.getAttribute("filter")),
      ...(this.getAttribute("pose") === "stand" ? { pose: "stand" as const } : {}),
      ...((room) => (room.length === 2 && room.every((v) => Number.isFinite(v) && v > 0) ? { fit: { width: room[0], height: room[1] } } : {}))((this.getAttribute("fit") ?? "").split(",").map(Number)),
    });
    this.dataset.unit = String(Math.round(drawnUnit * 100) / 100);
    const template = document.createElement("template");
    template.innerHTML = svg;
    const node = template.content.firstElementChild;
    if (!node) return;
    // wide: the picture uses the width of its frame and grows taller than the frame, which scrolls. Left out, the picture keeps the pixel size it was drawn at.
    if (this.hasAttribute("wide") && node instanceof SVGElement) {
      node.setAttribute("width", "100%");
      node.removeAttribute("height");
      node.style.width = "100%";
      node.style.height = "auto";
    }
    for (const child of [...root.childNodes]) child.remove();
    root.appendChild(node);
    this.dataset.count = String(shown.length);
    this.dataset.real = String(shownReal.length);
  }
}

/**
 * Defines both elements, once. Importing this module does it.
 *
 * @example
 * ```ts no-run
 * import { defineUchusenRocket } from "@johnmorrisdotca/uchusen-rockets/element";
 *
 * defineUchusenRocket();
 * console.log(customElements.get("uchusen-rocket") !== undefined);
 * ```
 */
export function defineUchusenRocket(): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get("uchusen-rocket")) customElements.define("uchusen-rocket", UchusenRocket);
  if (!customElements.get("uchusen-lineup")) customElements.define("uchusen-lineup", UchusenLineup);
  defineUchusenFlight();
}

defineUchusenRocket();

export { ROCKETS, UchusenFlight };
export type { FlightWords } from "./flightbar.ts";

declare global {
  interface HTMLElementTagNameMap {
    "uchusen-rocket": UchusenRocket;
    "uchusen-lineup": UchusenLineup;
  }
}
