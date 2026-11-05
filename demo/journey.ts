// The journey page: choose a start, an end and a craft, then fly the trip. The line views draw with one 2D canvas and the package's own line drawing. The painted side view is the package's element, loaded the first time it is asked for and dropped on leaving, so it is the page's one WebGL context.
// It asks for a frame only while the trip plays and the page can be seen, at most 30 a second, and never when nothing moves.
import { ROCKETS, SOURCES } from "../src/index.ts";
import {
  astronomicalUnits,
  bestDate,
  burnTimer,
  CRAFTS,
  craftOf,
  duration,
  gWords,
  ignition,
  kilometres,
  lightTime,
  percentOfLight,
  planTrip,
  playSeconds,
  preheat,
  speedWords,
  stageOf,
  stateAt,
  tonnesWords,
  windows,
  type Craft,
  type PlaySpeed,
  type Quantity,
  type State,
  type Trip,
} from "../src/journey/index.ts";
import { conicPoint } from "../src/journey/lunar.ts";
import { transferPoint } from "../src/journey/physics.ts";
import { WAKUSEI_SOURCE as SOURCE } from "./journey-bodies.ts";
import { hidePainted, showPainted } from "./journey-painted.ts";
import { viewOf, stagedSvg } from "./journey-craft.ts";
import { WORDS } from "./words.js";
import { destinationGrow, forwardStar } from "../src/journey/forward.ts";

const byId = <T extends Element = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node as unknown as T;
};
type Chooser = { word(key: string): string | undefined; lang: string };
const say = (key: string, values: Record<string, string | number> = {}): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return (chooser?.word(key) ?? WORDS.en[key] ?? key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
};
const japanese = () => document.documentElement.lang === "ja";
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag: string, attrs: Record<string, string | number> = {}, text?: string): SVGElement => {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};
const setText = (node: Element, text: string): void => {
  if (node.textContent !== text) node.textContent = text;
};
const reduced = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
const VIEWS = ["side", "front", "rear", "cockpit", "map"] as const;
type JourneyView = (typeof VIEWS)[number];
const VIEW_WORD: Record<JourneyView, string> = { side: "jSide", front: "jFront", rear: "jRear", cockpit: "jCockpit", map: "jMap" };
const isView = (value: string | null): value is JourneyView => VIEWS.some((view) => view === value);
const C_MS = 299_792_458;
const DAY = 86_400_000;
const AU_KM = 149_597_870.7;

// ---- the choices, kept in the address ----
const query = new URLSearchParams(location.search);
const stopIds = SOURCE.stops.map((stop) => stop.id);
const pickOf = (key: string, allowed: readonly string[], fallback: string): string => (allowed.includes(query.get(key) ?? "") ? (query.get(key) as string) : fallback);
const todayUtc = (): number => {
  const text = query.get("date");
  if (text && /^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(`${text}T00:00:00Z`);
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};
const askedView = query.get("view");
const choice = {
  from: pickOf("from", stopIds, "earth"),
  to: pickOf("to", stopIds, "mars"),
  craft: pickOf("craft", CRAFTS.map((craft) => craft.id), "falcon-heavy"),
  pull: query.get("pull") === "1" ? "1" : "ship",
  when: Math.max(0, Math.min(3, Number(query.get("w") ?? 0) || 0)),
  view: isView(askedView) ? askedView : "side",
  look: query.get("look") === "painted" ? "painted" : "line",
  base: todayUtc(),
};
if (choice.to === choice.from) choice.to = choice.from === "earth" ? "mars" : "earth";
let speed: PlaySpeed = [0.5, 1, 2, 4].includes(Number(query.get("speed"))) ? (Number(query.get("speed")) as PlaySpeed) : 1;

function writeAddress(): void {
  const next = new URLSearchParams();
  next.set("from", choice.from);
  next.set("to", choice.to);
  next.set("craft", choice.craft);
  if (choice.pull === "1" && craftNow().drive === "continuous") next.set("pull", "1");
  if (choice.when > 0) next.set("w", String(choice.when));
  if (query.get("date")) next.set("date", query.get("date") as string);
  if (choice.view !== "side") next.set("view", choice.view);
  if (choice.look === "painted") next.set("look", "painted");
  if (speed !== 1) next.set("speed", String(speed));
  const text = `${location.pathname}?${next.toString()}`;
  history.replaceState(null, "", text);
}

// ---- the plan ----
interface Option {
  id: string;
  label: string;
  ms: number;
}
let options: Option[] = [];
let trip!: Trip;
let total = 1;
const stopName = (id: string): string => {
  const stop = SOURCE.stops.find((one) => one.id === id);
  return stop ? (japanese() ? stop.name.ja : stop.name.en) : id;
};
const craftNow = (): Craft => craftOf(choice.craft) ?? CRAFTS[0]!;
const craftName = (craft: Craft): string => ROCKETS[craft.rocket]?.name ?? craft.name;
const dateWords = (ms: number, time = false): string =>
  new Intl.DateTimeFormat(japanese() ? "ja" : "en-GB", { year: "numeric", month: "short", day: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}), timeZone: "UTC" }).format(ms) + (time ? " UTC" : "");

function whenOptions(): Option[] {
  const craft = craftNow();
  const base = choice.base;
  // The Moon travels with the Earth, and the window search uses a heliocentric period. A lunar period would put the windows a month apart, so a departure from the Moon uses the Earth's windows.
  if ((choice.from === "earth" || choice.from === "moon") && craft.drive === "ballistic" && choice.to !== "moon" && choice.to !== "earth") {
    return windows(SOURCE, "earth", choice.to, base, 3).map((one, index) => ({ id: `w${index}`, label: dateWords(one.dateMs), ms: one.dateMs }));
  }
  if (craft.drive === "continuous" && choice.to !== "moon") {
    const best = bestDate(SOURCE, craft, choice.from, choice.to, base, choice.pull === "1" ? 1 : undefined);
    const list = [{ id: "w0", label: say("jSoonest"), ms: base }];
    if (best > base) list.push({ id: "w1", label: say("jShortest"), ms: best });
    return list;
  }
  return [0, 7, 14].map((days, index) => ({ id: `w${index}`, label: dateWords(base + days * DAY), ms: base + days * DAY }));
}

function plan(): void {
  options = whenOptions();
  if (choice.when >= options.length) choice.when = 0;
  const date = options[choice.when]?.ms ?? choice.base;
  const flown = craftNow();
  trip = planTrip(SOURCE, flown, choice.from, choice.to, date, flown.drive === "continuous" && choice.pull === "1" ? 1 : undefined);
  total = Math.max(1, playSeconds(trip));
}

// ---- the pickers ----
function chip(label: string, testid: string, pressed: boolean, on: () => void, disabled = false): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.testid = testid;
  button.setAttribute("aria-pressed", String(pressed));
  if (disabled) button.disabled = true;
  button.addEventListener("click", on);
  return button;
}

function drawPickers(): void {
  byId("from").replaceChildren(...SOURCE.stops.filter((stop) => stop.id !== choice.to).map((stop) => chip(stopName(stop.id), `from-${stop.id}`, stop.id === choice.from, () => change({ from: stop.id }))));
  byId("to").replaceChildren(...SOURCE.stops.filter((stop) => stop.id !== choice.from).map((stop) => chip(stopName(stop.id), `to-${stop.id}`, stop.id === choice.to, () => change({ to: stop.id }))));
  byId("crafts").replaceChildren(...CRAFTS.map((craft) => chip(craftName(craft), `craft-${craft.id}`, craft.id === choice.craft, () => change({ craft: craft.id }))));
  const continuous = craftNow().drive === "continuous";
  byId("pull-field").hidden = !continuous;
  byId("pulls").replaceChildren(
    ...(continuous
      ? [
          chip(say("jPullShip"), "pull-ship", choice.pull !== "1", () => change({ pull: "ship" })),
          chip(say("jPullOne"), "pull-1", choice.pull === "1", () => change({ pull: "1" })),
        ]
      : []),
  );
  byId("when").replaceChildren(...options.map((option, index) => chip(option.label, `when-${index}`, index === choice.when, () => change({ when: index }))));
  byId("views").replaceChildren(...VIEWS.map((view) => chip(say(VIEW_WORD[view]), `view-${view}`, choice.view === view, () => setView(view))));
  const painted = choice.look === "painted";
  byId("looks").replaceChildren(chip(say(painted ? "look_line" : "look_painted"), "look-painted", painted, () => setLook(painted ? "line" : "painted")));
  byId("speeds").replaceChildren(...([0.5, 1, 2, 4] as const).map((value) => chip(`×${value}`, `speed-${value}`, speed === value, () => setSpeed(value))));
}

function change(next: Partial<{ from: string; to: string; craft: string; when: number; pull: "ship" | "1" }>): void {
  if (next.from !== undefined) {
    choice.from = next.from;
    choice.when = 0;
  }
  if (next.to !== undefined) {
    choice.to = next.to;
    choice.when = 0;
  }
  if (next.craft !== undefined) {
    choice.craft = next.craft;
    choice.when = 0;
  }
  if (next.when !== undefined) choice.when = next.when;
  if (next.pull !== undefined) choice.pull = next.pull;
  stop();
  playhead = 0;
  hideSummary();
  start();
}

function setView(view: JourneyView): void {
  choice.view = view;
  stage.dataset.view = view;
  for (const button of byId("views").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === `view-${view}`));
  writeAddress();
  layout();
  draw(true);
}

function syncPainted(turn: string, lit: boolean, phase: string): void {
  const host = byId("painted");
  const bar = byId("painted-bar");
  const credit = byId("painted-credit");
  const note = byId("painted-note");
  const on = choice.look === "painted" && choice.view === "side";
  stage.dataset.look = on ? "painted" : "line";
  if (!on) {
    if (!host.hidden || host.childElementCount > 0) hidePainted(host, bar, credit);
    note.hidden = true;
    note.textContent = "";
    return;
  }
  const craft = craftNow();
  const shown = stageOf(craft, phase, onPad());
  showPainted(host, bar, credit, { rocket: shown.rocket, variant: shown.variant, view: onPad() ? viewOf(craft) : "side", engines: lit ? "on" : "off" }, turn, craft.drive === "continuous" ? 90 : 45);
  const whole = shown.slots != null;
  note.hidden = !whole;
  note.textContent = whole ? say("jPaintWhole") : "";
}

function setLook(look: "line" | "painted"): void {
  choice.look = look;
  for (const button of byId("looks").querySelectorAll("button")) button.setAttribute("aria-pressed", String(choice.look === "painted"));
  writeAddress();
  draw(true);
}

function setSpeed(value: PlaySpeed): void {
  speed = value;
  for (const button of byId("speeds").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.testid === `speed-${value}`));
  writeAddress();
}

// ---- the stage ----
const stage = byId("stage");
const sky = byId<HTMLCanvasElement>("sky");
const craftBox = byId("craft");
const mapSvg = byId<SVGSVGElement>("map");
const routeSvg = byId<SVGSVGElement>("route");
let litNow = false;
let stageNow = "";

/** A ballistic craft leaving the Moon is already in orbit, so the drawing is the payload, seen from the side, for the whole trip. */
function onPad(): boolean {
  return !(trip.from === "moon" && craftNow().drive === "ballistic");
}

let faceNow = "";

function setCraft(lit: boolean, phase = "ascent"): void {
  litNow = lit;
  const facing = choice.view === "front" ? "front" : choice.view === "rear" ? "back" : "side";
  faceNow = facing;
  const shown = stagedSvg(craftNow(), phase, lit, onPad(), facing);
  stageNow = shown.stage.name;
  const template = document.createElement("template");
  template.innerHTML = shown.svg;
  craftBox.replaceChildren(template.content);
  craftBox.setAttribute("aria-label", `${craftName(craftNow())}: ${shown.stage.name}`);
  craftBox.dataset.stage = shown.stage.name;
  layout();
}

function layout(): void {
  const box = stage.getBoundingClientRect();
  const length = Math.max(120, Math.min(box.width * 0.86, box.height * 1.45));
  stage.style.setProperty("--len", `${Math.round(length)}px`);
  const ratio = Math.min(2, devicePixelRatio || 1);
  const w = Math.round(box.width * ratio);
  const h = Math.round(box.height * ratio);
  if (sky.width !== w || sky.height !== h) {
    sky.width = w;
    sky.height = h;
  }
}

// the stars: placed by a fixed seed so every visit and every picture has the same sky
const stars = (() => {
  let seed = 20261104;
  const next = (): number => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 460 }, () => ({ x: next(), y: next(), size: 0.6 + next() * 1.6, alpha: 0.25 + next() * 0.7, depth: 0.3 + next() * 1.2, warm: next() < 0.16 }));
})();
let skyOffset = 0;

function drawSky(streak: number, forward: boolean, beta: number): void {
  const ctx = sky.getContext("2d");
  if (!ctx) return;
  const w = sky.width;
  const h = sky.height;
  const ratio = w / Math.max(1, stage.clientWidth);
  ctx.clearRect(0, 0, w, h);
  for (const star of stars) {
    if (forward) {
      const place = forwardStar(star.x, star.y, beta);
      const red = Math.round(255 - place.blue * 90);
      const green = Math.round(200 + place.blue * 30);
      const blue = Math.round(170 + place.blue * 85);
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${star.alpha})`;
      const size = Math.max(1, star.size * ratio * (1 + place.blue * beta));
      ctx.fillRect(place.x * w, place.y * h, size, size);
      continue;
    }
    const x = (((star.x * w - skyOffset * star.depth * ratio) % w) + w) % w;
    const y = star.y * h;
    ctx.fillStyle = star.warm ? `rgba(255, 214, 160, ${star.alpha})` : `rgba(206, 224, 255, ${star.alpha})`;
    if (streak > 1) ctx.fillRect(x, y, streak * star.depth * ratio, Math.max(1, star.size * 0.6 * ratio));
    else ctx.fillRect(x, y, star.size * ratio, star.size * ratio);
  }
}

// ---- the map ----
interface MapParts {
  scale: number;
  cx: number;
  cy: number;
  bodies: Map<string, SVGElement>;
  doneLine: SVGElement;
  mark: SVGElement;
  rule: SVGElement;
  ruleText: SVGElement;
  points: [number, number][];
}
let map: MapParts | null = null;

const BODY_COLOUR: Record<string, string> = { sun: "#ffcf4d" };

function buildMap(): void {
  mapSvg.replaceChildren();
  const earthFrame = trip.frame === "earth";
  const W = 1000;
  const H = 560;
  const cx = W / 2;
  const cy = H * 0.46;
  const sunFrame = !earthFrame;
  const ids = sunFrame ? SOURCE.stops.filter((stop) => stop.kind === "planet" && SOURCE.positionAu(stop.id, trip.departMs).length > 0).map((stop) => stop.id) : ["moon"];
  const orbit = (id: string): [number, number][] => {
    const days = id === "moon" ? 27.32 * DAY : ({ mercury: 87.969, venus: 224.701, earth: 365.256, mars: 686.98, jupiter: 4332.589, saturn: 10759.22, uranus: 30685.4, neptune: 60189 }[id] ?? 365.256) * DAY;
    return Array.from({ length: 181 }, (_, i) => {
      const t = trip.departMs + (i / 180) * days;
      if (id === "moon") {
        const p = SOURCE.offsetKm("moon", t);
        return [p[0], p[1]] as [number, number];
      }
      const p = SOURCE.positionAu(id, t);
      return [p[0] * AU_KM, p[1] * AU_KM] as [number, number];
    });
  };
  // In the Earth's frame the Moon's orbit is the whole map: the Earth's own reach is its path round the Sun, which would shrink the Moon to a dot. In the Sun's frame, keep the planets out to the far end of the route and no farther.
  const reach = (id: string): number => Math.max(...orbit(id).map(([x, y]) => Math.hypot(x, y)));
  const farthest = earthFrame ? reach("moon") : Math.max(reach(trip.from), reach(trip.to));
  const shown = sunFrame ? ids.filter((id) => reach(id) <= farthest * 1.02) : ids;
  const scale = Math.min(W * 0.4, H * 0.34) / (farthest * 1.04);
  const bodies = new Map<string, SVGElement>();
  const defs = svgEl("defs");
  const glow = svgEl("radialGradient", { id: "jr-sunglow" });
  glow.append(svgEl("stop", { offset: "0", "stop-color": "#ffd77a", "stop-opacity": "0.9" }), svgEl("stop", { offset: "0.4", "stop-color": "#ffb457", "stop-opacity": "0.25" }), svgEl("stop", { offset: "1", "stop-color": "#ffb457", "stop-opacity": "0" }));
  defs.append(glow);
  mapSvg.append(defs);
  const point = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
  // the orbits
  for (const id of shown) {
    const pts = orbit(id).map(([x, y]) => point(x, y));
    mapSvg.append(svgEl("path", { class: id === trip.from || id === trip.to ? "orbit orbit-lit" : "orbit", d: `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z` }));
  }
  const centre = point(0, 0);
  if (sunFrame) {
    mapSvg.append(svgEl("circle", { cx: centre[0], cy: centre[1], r: 46, fill: "url(#jr-sunglow)" }), svgEl("circle", { cx: centre[0], cy: centre[1], r: 9, fill: "#fff1c4" }));
    mapSvg.append(svgEl("text", { x: centre[0], y: centre[1] + 30, "text-anchor": "middle", class: "warm" }, say("jSun").toUpperCase()));
  } else {
    mapSvg.append(svgEl("circle", { cx: centre[0], cy: centre[1], r: 9, fill: "#4c88c4" }), svgEl("circle", { cx: centre[0] - 2.5, cy: centre[1] - 2.5, r: 4, fill: "#9ed0ff", opacity: 0.8 }));
  }
  // the path
  const pathPoints: [number, number][] = [];
  if (trip.ballistic) {
    const b = trip.ballistic;
    for (let i = 0; i <= 360; i += 1) {
      const t = (b.transitS * i) / 360;
      const p = b.conic ? conicPoint(b.mu, b.conic, t) : transferPoint(b.mu, b.r1, b.r2, b.theta0, t);
      const [x, y] = point(p.r * Math.cos(p.theta), p.r * Math.sin(p.theta));
      pathPoints.push([x, y]);
    }
  } else if (trip.continuous) {
    const c = trip.continuous;
    for (let i = 0; i <= 2; i += 1) {
      const f = i / 2;
      pathPoints.push(point(c.from[0] + (c.to[0] - c.from[0]) * f, c.from[1] + (c.to[1] - c.from[1]) * f));
    }
  }
  const ahead = svgEl("path", { class: "path-ahead", d: `M${pathPoints.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` });
  const doneLine = svgEl("path", { class: "path-done", d: "" });
  mapSvg.append(ahead, doneLine);
  // a ruler: one astronomical unit from the Sun, or the Moon's distance from the Earth
  const ruleLen = sunFrame ? AU_KM : 384_400;
  const x0 = 40;
  const rule = svgEl("line", { class: "rule", x1: x0, y1: H - 40, x2: x0 + ruleLen * scale, y2: H - 40 });
  mapSvg.append(rule, svgEl("line", { class: "rule", x1: x0, y1: H - 46, x2: x0, y2: H - 34 }), svgEl("line", { class: "rule", x1: x0 + ruleLen * scale, y1: H - 46, x2: x0 + ruleLen * scale, y2: H - 34 }));
  const ruleText = svgEl("text", { x: x0, y: H - 52, "text-anchor": "start" }, sunFrame ? `1 AU · ${kilometres(AU_KM)}` : kilometres(384_400));
  mapSvg.append(ruleText);
  // the places
  const labelled = new Set([trip.from, trip.to]);
  for (const id of earthFrame ? ["moon"] : shown) {
    const stop = SOURCE.stops.find((one) => one.id === id);
    const group = svgEl("g", { class: "body" });
    const r = id === trip.to ? 7 : 5;
    group.append(svgEl("circle", { r, fill: BODY_COLOUR[id] ?? stop?.colour ?? "#aab", stroke: "#05080f", "stroke-width": 1.5 }));
    if (labelled.has(id)) group.append(svgEl("text", { x: 12, y: -10, class: id === trip.to ? "warm" : "" }, stopName(id).toUpperCase()));
    mapSvg.append(group);
    bodies.set(id, group);
  }
  if (earthFrame) mapSvg.append(svgEl("text", { x: centre[0] + 14, y: centre[1] + 26 }, stopName("earth").toUpperCase()));
  const mark = svgEl("g", { class: "craft-mark-group" });
  mark.append(svgEl("path", { class: "craft-mark", d: "M-9 -8L1 0L-9 8M-2 -8L8 0L-2 8" }));
  mapSvg.append(mark);
  map = { scale, cx, cy, bodies, doneLine, mark, rule, ruleText, points: pathPoints };
}

function drawMap(state: State): void {
  if (!map) return;
  const { scale, cx, cy } = map;
  const at = (x: number, y: number): [number, number] => [cx + x * scale, cy - y * scale];
  for (const [id, node] of map.bodies) {
    const p: readonly [number, number, number] = id === "moon" ? SOURCE.offsetKm("moon", state.dateMs) : (SOURCE.positionAu(id, state.dateMs).map((v) => v * AU_KM) as unknown as readonly [number, number, number]);
    const [x, y] = at(p[0], p[1]);
    node.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
  const [mx, my] = at(state.positionKm[0], state.positionKm[1]);
  const ahead = map.points;
  let whole = 0;
  const arc = trip.ballistic?.arc;
  if (arc) while (whole < arc.length - 1 && arc[whole + 1]! <= state.doneKm) whole += 1;
  const done = arc ? ahead.slice(0, whole + 1) : [ahead[0]!];
  done.push([mx, my]);
  map.doneLine.setAttribute("d", done.length > 1 ? `M${done.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}` : "");
  const next = ahead[Math.min(ahead.length - 1, whole + 1)]!;
  const prev = ahead[Math.min(ahead.length - 1, whole)]!;
  const angle = (Math.atan2(next[1] - prev[1], next[0] - prev[0]) * 180) / Math.PI;
  map.mark.setAttribute("transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${angle.toFixed(1)})`);
}

// ---- the route bar ----
const ROUTE_X0 = 70;
const ROUTE_X1 = 930;
let routeMarker: SVGElement | null = null;
let routeDone: SVGElement | null = null;

function buildRoute(): void {
  routeSvg.replaceChildren();
  const y = 70;
  const x = (f: number): number => ROUTE_X0 + (ROUTE_X1 - ROUTE_X0) * f;
  const add = (...nodes: SVGElement[]): void => routeSvg.append(...nodes);
  add(svgEl("line", { class: "rail", x1: ROUTE_X0, y1: y, x2: ROUTE_X1, y2: y }));
  routeDone = svgEl("line", { class: "rail-done", x1: ROUTE_X0, y1: y, x2: ROUTE_X0, y2: y });
  add(routeDone);
  const bracket = (f0: number, f1: number, label: string): void => {
    add(svgEl("path", { class: "bracket", d: `M${x(f0)} ${y - 18}V${y - 28}H${x(f1)}V${y - 18}` }), svgEl("text", { x: x((f0 + f1) / 2), y: y - 36, "text-anchor": "middle" }, label));
  };
  if (trip.continuous) {
    bracket(0.01, 0.485, say("jPhase_accelerate"));
    bracket(0.515, 0.99, say("jPhase_decelerate"));
  } else if (trip.ballistic) {
    bracket(0.04, 0.96, say("jPhase_coast"));
  }
  add(svgEl("line", { class: "tick", x1: x(0.5), y1: y - 8, x2: x(0.5), y2: y + 8 }), svgEl("text", { x: x(0.5), y: y + 30, "text-anchor": "middle" }, say("jHalfway")));
  if (trip.ballistic) {
    add(svgEl("text", { x: ROUTE_X0, y: y + 56, "text-anchor": "start", class: "warm burn-label" }, `${say("jPhase_burn")} · ${speedWords(trip.dv.departure)}`));
    const arrival = trip.ballistic.entry ? say("jEntry") : trip.verdict.level === "flyby" ? say("jPhase_flyby") : `${say("jPhase_brake")} · ${speedWords(trip.dv.arrival)}`;
    add(svgEl("text", { x: ROUTE_X1, y: y + 56, "text-anchor": "end", class: "warm burn-label" }, arrival));
  }
  add(svgEl("circle", { cx: ROUTE_X0, cy: y, r: 9, fill: SOURCE.stops.find((s) => s.id === trip.from)?.colour ?? "#8fc9ff" }), svgEl("circle", { cx: ROUTE_X1, cy: y, r: 9, fill: SOURCE.stops.find((s) => s.id === trip.to)?.colour ?? "#ffb457" }));
  add(svgEl("text", { x: ROUTE_X0, y: y + 30, "text-anchor": "middle" }, stopName(trip.from).toUpperCase()), svgEl("text", { x: ROUTE_X1, y: y + 30, "text-anchor": "middle", class: "warm" }, stopName(trip.to).toUpperCase()));
  routeMarker = svgEl("g", { transform: `translate(${ROUTE_X0} ${y})` });
  routeMarker.append(svgEl("path", { class: "chev", d: "M-9 -10L2 0L-9 10M-1 -10L10 0L-1 10" }));
  add(routeMarker);
  routeSvg.setAttribute("viewBox", "0 0 1000 138");
}

function drawRoute(state: State): void {
  const x = ROUTE_X0 + (ROUTE_X1 - ROUTE_X0) * state.progress;
  routeMarker?.setAttribute("transform", `translate(${x.toFixed(1)} 70)`);
  routeDone?.setAttribute("x2", x.toFixed(1));
}

// ---- the panel ----
type Row = { dd: HTMLElement; est?: HTMLElement };
const nowRows = new Map<string, Row>();

function rows(listId: string, spec: [string, string][]): Map<string, Row> {
  const list = byId(listId);
  const map2 = new Map<string, Row>();
  list.replaceChildren(
    ...spec.map(([key, label]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.dataset.testid = `${listId}-${key}`;
      wrap.append(dt, dd);
      map2.set(key, { dd });
      return wrap;
    }),
  );
  return map2;
}

function buildPanel(): void {
  const keys: [string, string][] = [
    ["date", "jDate"],
    ["since", trip.from === "moon" ? "jSinceDepart" : "jSince"],
    ["speed", "jSpeed"],
    ["light", "jLight"],
    ["gamma", "jGamma"],
    ["accel", "jAccelNow"],
    ["flown", "jFlown"],
    ["togo", "jToGo"],
    ["signal", "jSignal"],
    ["ship", "jShip"],
    ["frame", "jEarthT"],
  ];
  nowRows.clear();
  for (const [key, row] of rows("now", keys.map(([k, w]) => [k, say(w)]))) nowRows.set(key, row);
  const tripRows: [string, string, string, boolean?][] = [
    ["leaves", say("jDeparts"), dateWords(trip.departMs, true)],
    ["arrives", say("jArrives"), dateWords(trip.departMs - trip.liftoffBeforeS * 1000 + trip.frameS * 1000, true)],
    ["straight", say("jStraight"), `${kilometres(trip.straightKm)} · ${astronomicalUnits(trip.straightKm)} · ${lightTime(trip.straightKm)}`],
    ["path", say("jPath"), kilometres(trip.pathKm)],
    ["time", say("jDuration"), trip.drive === "continuous" ? `${duration(trip.shipS)} / ${duration(trip.frameS)}` : duration(trip.frameS)],
    ["dvout", say("jDvOut"), speedWords(trip.dv.departure)],
    ["dvin", say("jDvIn"), speedWords(trip.dv.arrival)],
    ...(trip.ballistic ? ([["burnout", say("jBurnOut"), duration(trip.ballistic.burnS), trip.estimated.includes("departure burn length")], ["burnin", say("jBurnIn2"), trip.ballistic.brakeS > 0 ? duration(trip.ballistic.brakeS) : "–", trip.estimated.includes("braking acceleration")]] as [string, string, string, boolean][]) : []),
    ["peakg", say("jPeakG"), gWords(trip.peakG), trip.estimated.includes("departure burn length") || trip.estimated.includes("braking acceleration")],
    ["peak", say("jPeakSpeed"), `${speedWords(trip.peakSpeed)} · ${percentOfLight(trip.peakSpeed)}`],
    ["fuel", say("jFuel"), fuelWords()],
    ["ratio", say("jMassRatio"), ratioWords()],
    ["payload", say("jPayloadTo", { to: stopName(trip.to) }), payloadWords()],
  ];
  const list = byId("trip");
  list.replaceChildren(
    ...tripRows.map(([key, label, value, estimated]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.dataset.testid = `trip-${key}`;
      dd.textContent = value;
      if (estimated) {
        const est = document.createElement("span");
        est.className = "est";
        est.textContent = say("jEst");
        dd.append(est);
      }
      wrap.append(dt, dd);
      return wrap;
    }),
  );
}

function ratioWords(): string {
  if (trip.massRatio === null) return `${say("jNA")}: ${trip.fuel.note}`;
  const text = trip.massRatio >= 100 ? trip.massRatio.toFixed(0) : trip.massRatio.toFixed(3);
  return trip.drive === "ballistic" ? `${text}${japanese() ? "、" : ", "}${say("jBrakeOnly")}` : text;
}

function fuelWords(): string {
  const fuel = trip.fuel;
  if (fuel.usedT === null) return `${say("jNA")}: ${fuel.note}`;
  if (fuel.carriedT !== null) return `${tonnesWords(fuel.usedT)} / ${tonnesWords(fuel.carriedT)}`;
  return `${tonnesWords(fuel.usedT)}${japanese() ? "、" : ", "}${say("jBrakeOnly")}`;
}

function payloadWords(): string {
  const payload = trip.payload;
  if (payload.kg === null) return `${say("jNA")}: ${payload.note}`;
  const t = tonnesWords(payload.kg / 1000);
  return payload.atLeast ? say("jAtLeast", { t }) : t;
}

function drawPanel(state: State): void {
  const set = (key: string, text: string): void => {
    const row = nowRows.get(key);
    if (row) setText(row.dd, text);
  };
  const t = state.missionS;
  set("date", dateWords(state.dateMs, true));
  set("since", t < 0 ? `T−${duration(-t)}` : `T+${duration(t)}`);
  set("speed", speedWords(state.speedMs));
  set("light", percentOfLight(state.speedMs));
  set("gamma", state.gamma.toFixed(state.gamma < 1.0001 ? 9 : 6).replace(/(\d{3})(?=\d)/g, "$1\u202f").replace(/^(\d)\u202f/, "$1"));
  set("accel", state.accelG === 0 ? "0 g" : `${state.accelG < 0 ? "−" : "+"}${gWords(state.accelG)}`);
  set("flown", `${kilometres(state.doneKm)} · ${astronomicalUnits(state.doneKm)}`);
  set("togo", `${kilometres(state.toDestinationKm)} · ${lightTime(state.toDestinationKm)}`);
  set("signal", duration(state.signalS));
  set("ship", duration(state.shipS));
  set("frame", duration(state.frameS));
}

// ---- the verdict ----
function drawVerdict(): void {
  const box = byId("verdict");
  box.dataset.level = trip.verdict.level;
  setText(byId("verdict-level"), say(`jLevel_${trip.verdict.level}`));
  setText(byId("verdict-line"), trip.verdict.line);
  byId("verdict-because").replaceChildren(
    ...trip.verdict.because
      .filter((line) => line !== trip.verdict.line)
      .map((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        return li;
      }),
  );
}

// ---- the credit: every figure of the craft, and where it is from ----
function drawCredit(): void {
  const craft = craftNow();
  const ids = new Set<string>();
  const walk = (value: unknown): void => {
    if (value && typeof value === "object") {
      const q = value as Quantity;
      if (typeof q.value === "number" && "source" in q) {
        if (q.source) ids.add(q.source);
      } else for (const inner of Object.values(value)) walk(inner);
    }
  };
  walk(craft);
  const credit = byId("jr-credit");
  credit.replaceChildren(document.createTextNode(`${say("jCredit")} `));
  let first = true;
  for (const id of ids) {
    const source = SOURCES[id as keyof typeof SOURCES];
    if (!source) continue;
    if (!first) credit.append(document.createTextNode("; "));
    first = false;
    const a = document.createElement("a");
    a.href = source.url;
    a.rel = "noopener";
    a.textContent = `${source.publisher}, ${source.title.replace(/\s*\(.*$/, "")}`;
    credit.append(a);
  }
}

// ---- the summary ----
const VOYAGER_KMS = 17.11;
function showSummary(): void {
  const end = stateAt(trip, SOURCE, total);
  setText(byId("summary-route"), `${stopName(trip.from)} → ${stopName(trip.to)} · ${craftName(craftNow())}`);
  const facts: [string, string][] = [
    [say(`jLevel_${trip.verdict.level}`), trip.verdict.line],
    [say("jStraight"), `${kilometres(trip.straightKm)} (${astronomicalUnits(trip.straightKm)})`],
    [say("jPath"), kilometres(trip.pathKm)],
    [say("jShip"), duration(trip.shipS)],
    [say("jEarthT"), duration(trip.frameS)],
    [say("jTopSpeed"), `${speedWords(trip.peakSpeed)} · ${percentOfLight(trip.peakSpeed)}`],
    [say("jPeakG"), gWords(trip.peakG)],
    [say("jDvAll"), speedWords(trip.dv.total)],
    [say("jFuel"), fuelWords()],
    [say("jPayloadTo", { to: stopName(trip.to) }), payloadWords()],
    [say("jSignalEnd"), duration(end.signalS)],
    [say("jCompare"), `${say("jLightTakes", { t: duration(trip.pathKm / 299_792.458) })} ${say("jVoyager", { t: duration(trip.pathKm / VOYAGER_KMS) })}`],
  ];
  byId("summary-facts").replaceChildren(
    ...facts.map(([label, value]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      wrap.append(dt, dd);
      return wrap;
    }),
  );
  byId("summary").hidden = false;
}
function hideSummary(): void {
  byId("summary").hidden = true;
}

// ---- drawing a frame ----
let playhead = 0;
let playing = false;
let raf = 0;
let lastTs = 0;
let lastDraw = 0;
let visible = true;
let lastPhase = "";

function draw(force = false): void {
  if (!trip.verdict.playable || trip.phases.length === 0) {
    syncPainted("90deg", false, "ascent");
    return;
  }
  const state = stateAt(trip, SOURCE, playhead);
  const id = state.phase.id;
  if (id !== lastPhase || force) {
    lastPhase = id;
    stage.dataset.phase = id;
  }
  setText(byId("phase"), playhead === 0 && !playing ? say("jPhase_ready") : say(`jPhase_${id}`));
  // the countdown
  const pre = byId("preheat");
  pre.hidden = id !== "preheat" || (playhead === 0 && !playing);
  if (!pre.hidden) {
    const p = preheat(state.missionS);
    const segments = byId("segments");
    if (segments.childElementCount !== 10) segments.replaceChildren(...Array.from({ length: 10 }, () => document.createElement("i")));
    [...segments.children].forEach((node, i) => ((node as HTMLElement).dataset.on = i < p.full ? "1" : i === p.full && p.partial > 0.2 ? "half" : "0"));
    setText(byId("preheat-percent"), `${p.percent} %`);
  }
  const ign = byId("ignition");
  ign.hidden = id !== "ignition";
  if (!ign.hidden) {
    const g = ignition(state.missionS);
    setText(byId("count"), String(g.count));
    byId("ring").style.strokeDashoffset = String(reduced() ? 0 : 100 - g.ring * 100);
  }
  // the engine's push
  const acc = byId("accel");
  const pushing = state.burn !== "off";
  acc.hidden = !pushing;
  if (pushing) {
    acc.dataset.way = state.accelG < 0 ? "back" : "forward";
    setText(byId("accel-label"), say(state.accelG < 0 ? "jDecel" : "jAccel"));
    setText(byId("accel-value"), gWords(state.accelG));
  }
  const timer = burnTimer(trip, state.missionS);
  const timerBox = byId("timer");
  timerBox.hidden = timer === null;
  if (timer) {
    setText(byId("timer-label"), say(trip.verdict.level === "flyby" ? "jFlybyIn" : timer.kind === "burn-in" ? "jBurnIn" : "jCompleteIn"));
    setText(byId("timer-value"), duration(timer.seconds));
  }
  setText(byId("speed-label"), say(`jSpeedFrame_${state.speedFrame}`));
  setText(byId("speed-value"), speedWords(state.speedMs));
  setText(byId("speed-sub"), say("jOfLight", { pct: percentOfLight(state.speedMs) }));
  // the craft: which way it faces, and whether its engines burn
  const lit = state.burn !== "off";
  const facing = choice.view === "front" ? "front" : choice.view === "rear" ? "back" : "side";
  if (lit !== litNow || stageOf(craftNow(), id, onPad()).name !== stageNow || facing !== faceNow) setCraft(lit, id);
  const turn = `${(90 - 180 * state.turned).toFixed(1)}deg`;
  craftBox.style.setProperty("--turn", turn);
  syncPainted(turn, lit, id);
  drawRoute(state);
  if (choice.view === "map") drawMap(state);
  drawPanel(state);
  const scrub = byId<HTMLInputElement>("scrub");
  scrub.value = String(Math.round((playhead / total) * 1000));
  scrub.setAttribute("aria-valuetext", `${say(`jPhase_${id}`)}, ${duration(Math.abs(state.missionS))}`);
  // the sky: still when nothing moves, and always still for a reader who asked for less motion
  const moving = playing && !reduced() && state.speedMs > 0;
  const streak = moving ? Math.min(70, Math.log10(1 + state.speedMs / 50) * 14) : 0;
  const forward = choice.view === "cockpit";
  const beta = Math.min(0.99, Math.max(0, state.speedMs / C_MS));
  const dest = byId("dest");
  dest.style.setProperty("--grow", destinationGrow(total > 0 ? playhead / total : 0).toFixed(4));
  setText(byId("dest-name"), stopName(trip.to));
  if (choice.view !== "map") drawSky(forward || reduced() ? 0 : streak, forward, beta);
  else if (force) drawSky(0, false, 0);
}

function frame(ts: number): void {
  raf = 0;
  if (!playing) return;
  if (document.hidden || !visible) {
    lastTs = 0;
    return;
  }
  if (lastTs === 0) {
    lastTs = ts;
    lastDraw = 0;
  }
  if (ts - lastDraw < 33) {
    raf = requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.25, (ts - lastTs) / 1000);
  lastTs = ts;
  lastDraw = ts;
  playhead = Math.min(total, playhead + dt * speed);
  skyOffset += dt * 60 * Math.min(2, Math.log10(1 + (stateAt(trip, SOURCE, playhead).speedMs || 0) / 50));
  draw();
  if (playhead >= total) {
    playing = false;
    syncPlay();
    showSummary();
    return;
  }
  raf = requestAnimationFrame(frame);
}

function syncPlay(): void {
  const button = byId("play");
  button.setAttribute("aria-pressed", String(playing));
  button.textContent = playing ? say("jPause") : playhead >= total ? say("jAgain") : say("jPlay");
  button.toggleAttribute("disabled", !trip.verdict.playable);
}

function play(): void {
  if (!trip.verdict.playable) return;
  if (playhead >= total) {
    playhead = 0;
    hideSummary();
  }
  playing = true;
  lastTs = 0;
  syncPlay();
  if (!raf) raf = requestAnimationFrame(frame);
}
function pause(): void {
  playing = false;
  syncPlay();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
function stop(): void {
  pause();
}

function start(): void {
  plan();
  writeAddress();
  drawPickers();
  drawVerdict();
  drawCredit();
  stage.dataset.view = choice.view;
  hideSummary();
  const ok = trip.verdict.playable && trip.phases.length > 0;
  byId("controls").toggleAttribute("data-off", !ok);
  byId<HTMLInputElement>("scrub").disabled = !ok;
  byId("restart").toggleAttribute("disabled", !ok);
  litNow = false;
  setCraft(false);
  if (ok) {
    buildMap();
    buildRoute();
    buildPanel();
    setCraft(false);
  } else {
    routeSvg.replaceChildren();
    mapSvg.replaceChildren();
    byId("now").replaceChildren();
    byId("trip").replaceChildren();
    for (const id of ["accel", "timer", "preheat", "ignition"]) byId(id).hidden = true;
    setText(byId("phase"), say("jPhase_none"));
    setText(byId("speed-label"), "");
    setText(byId("speed-value"), "");
    setText(byId("speed-sub"), "");
  }
  syncPlay();
  lastPhase = "";
  layout();
  draw(true);
  if (!ok) drawSky(0, false, 0);
}

byId("play").addEventListener("click", () => (playing ? pause() : play()));
byId("restart").addEventListener("click", () => {
  pause();
  playhead = 0;
  skyOffset = 0;
  hideSummary();
  syncPlay();
  draw(true);
});
byId("again").addEventListener("click", () => {
  hideSummary();
  playhead = 0;
  play();
});
byId("copy").addEventListener("click", () => {
  const done = (): void => {
    setText(byId("copied"), say("jCopied"));
    setTimeout(() => setText(byId("copied"), ""), 2500);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => undefined);
});
byId<HTMLInputElement>("scrub").addEventListener("input", (event) => {
  const was = playing;
  if (was) pause();
  playhead = (Number((event.target as HTMLInputElement).value) / 1000) * total;
  hideSummary();
  syncPlay();
  draw(true);
  if (playhead >= total) showSummary();
});
new ResizeObserver(() => {
  layout();
  draw(true);
}).observe(stage);
new IntersectionObserver((entries) => {
  visible = entries.some((entry) => entry.isIntersecting);
  if (visible && playing && !raf) {
    lastTs = 0;
    raf = requestAnimationFrame(frame);
  }
}).observe(stage);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && playing && !raf) {
    lastTs = 0;
    raf = requestAnimationFrame(frame);
  }
});
document.addEventListener("kazoku-languagechange", () =>
  queueMicrotask(() => {
    options = whenOptions();
    drawPickers();
    drawVerdict();
    drawCredit();
    if (trip.verdict.playable && trip.phases.length > 0) {
      buildMap();
      buildRoute();
      buildPanel();
    }
    syncPlay();
    draw(true);
    if (!byId("summary").hidden) showSummary();
  }),
);

start();
const seek = Number(query.get("t"));
if (Number.isFinite(seek) && seek > 0 && trip.verdict.playable) {
  playhead = Math.min(total, seek);
  draw(true);
  if (playhead >= total) showSummary();
}
