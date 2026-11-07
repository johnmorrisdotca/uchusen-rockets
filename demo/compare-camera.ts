// The compare page's camera. Free is the view as it was. The other choices keep craft in frame, follow one, or keep the planet with them. Follow selected only reads `data-selected` on the stage, which MODULES-476 will set. The camera orbits when Turn is Camera: the craft stay where they are and the Earth moves. Edges Wrap is only the free camera.
import { BODIES, heliocentric, moonGeocentric, type HostId } from "@johnmorrisdotca/wakusei-planets";
import type { UchusenRocket } from "../src/element.ts";
import { bodyScene, moonScene } from "../src/element/solarPlace.ts";
import { frameSky } from "./sky.ts";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";
import { chip } from "./chip.ts";
import { bindStage } from "./viewBinder.ts";

type Detail = { yaw?: number; tilt?: number; roll?: number; zoom?: number; panX?: number; panY?: number; reason?: string };
type Mode = "free" | "all" | "follow" | "selected" | "planet";
type Box = { craft: number; x: number; y: number; w: number; h: number; on: boolean };

const HAND = new Set(["drag", "pinch", "wheel", "key", "pan"]);
const MOON_M = 384_400_000;
const AU = 149_597_870_700;
const ZOOM_MIN = 1e-12;
const MARK_PX = 4;
const SOLAR: ["sun" | HostId, string][] = [
  ["sun", "cmpBodySun"],
  ["mercury", "cmpBodyMercury"],
  ["venus", "cmpBodyVenus"],
  ["mars", "cmpBodyMars"],
  ["jupiter", "cmpBodyJupiter"],
  ["saturn", "cmpBodySaturn"],
  ["uranus", "cmpBodyUranus"],
  ["neptune", "cmpBodyNeptune"],
  ["ceres", "cmpBodyCeres"],
  ["pluto", "cmpBodyPluto"],
  ["haumea", "cmpBodyHaumea"],
  ["makemake", "cmpBodyMakemake"],
  ["eris", "cmpBodyEris"],
];

const byId = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`no #${id}`);
  return node;
};

export function mountCamera(opts: {
  hero: UchusenRocket;
  bar: ViewControlsElement;
  address: { get(key: string): string | null; set(key: string, value: string | null): void };
  say(key: string, values?: Record<string, string | number>): string;
  names(): string[];
  editing(): number;
}): void {
  const { hero, bar, address, say } = opts;
  const stage = hero.parentElement ?? hero;
  let mode: Mode = readMode(address.get("camera"));
  let follow = readFollow(address.get("camera"), opts.editing());
  let held: Mode | null = null;
  let edges: "open" | "wrap" = address.get("edges") === "wrap" ? "wrap" : "open";
  let turn: "craft" | "camera" = address.get("turn") === "craft" ? "craft" : "camera";
  let moving = false;
  let applying = false;
  let when = Date.now();
  let playing = false;
  let paths = true;
  let playFrame = 0;
  let steppedAt = 0;

  const back = byId("cw-camera-back");
  const note = byId("cw-edges-note");
  const arrows = byId("cw-arrows");
  const distance = byId("cw-distance");

  function readBoxes(): Box[] {
    const raw = hero.shadowRoot?.querySelector("canvas")?.dataset.craftBoxes ?? "";
    return raw.split(" ").filter(Boolean).map((part) => {
      const [id, rest] = part.split(":");
      const [x, y, w, h, on] = (rest ?? "").split(",").map(Number);
      return { craft: Number(id), x, y, w, h, on: on === 1 };
    });
  }

  function pageBox(index: number): Box | undefined {
    return readBoxes().find((box) => box.craft === index - 1);
  }

  function selectedIndexes(): number[] {
    const raw = stage.dataset.selected ?? "";
    const indexes = raw.split(",").map((part) => Number(part)).filter((n) => Number.isInteger(n) && n >= 0);
    return indexes;
  }

  function applyEdges(): void {
    const wrapOk = mode === "free";
    if (!wrapOk && edges === "wrap") edges = "open";
    hero.setAttribute("edges", edges);
    address.set("edges", edges === "wrap" ? "wrap" : null);
    note.hidden = wrapOk;
    note.textContent = wrapOk ? "" : say("cmpWrapNote");
    byId("cw-edges").querySelectorAll("button").forEach((button) => {
      const which = (button as HTMLButtonElement).dataset.testid === "edges-wrap" ? "wrap" : "open";
      button.setAttribute("aria-pressed", String(which === edges));
      if (which === "wrap") (button as HTMLButtonElement).disabled = !wrapOk;
    });
  }

  function applyTurn(): void {
    address.set("turn", turn === "craft" ? "craft" : null);
    stage.dataset.turn = turn;
    const yaw = turn === "camera" ? bar.state.yaw : 0;
    for (const id of ["earth-back", "sky-back"]) {
      const node = document.getElementById(id);
      if (!node) continue;
      node.style.translate = turn === "camera" ? `${yaw * 4}px 0` : "";
    }
    byId("cw-turn").querySelectorAll("button").forEach((button) => {
      const which = (button as HTMLButtonElement).dataset.testid === "turn-craft" ? "craft" : "camera";
      button.setAttribute("aria-pressed", String(which === turn));
    });
  }

  function paintModes(): void {
    const modes: [Mode, string, string][] = [
      ["free", "cmpCamFree", "cam-free"],
      ["all", "cmpCamAll", "cam-all"],
      ["follow", "cmpCamFollow", "cam-follow"],
      ["selected", "cmpCamSelected", "cam-selected"],
      ["planet", "cmpCamPlanet", "cam-planet"],
    ];
    byId("cw-camera").replaceChildren(...modes.map(([id, key, testid]) => chip(say(key), testid, mode === id, () => choose(id))));
    const waiting = mode === "selected" && selectedIndexes().length === 0;
    stage.dataset.cameraHook = waiting ? "waiting" : "ready";
    back.hidden = held === null;
    back.textContent = held ? say("cmpCamBack", { mode: say(labelKey(held)) }) : "";
    const camera = mode === "follow" ? `follow:${follow}` : mode === "free" ? null : mode;
    address.set("camera", camera);
    applyEdges();
    applyTurn();
  }

  function choose(next: Mode): void {
    if (next !== "free") held = null;
    if (next === "follow") follow = opts.editing();
    if (edges === "wrap" && next !== "free") edges = "open";
    mode = next;
    paintModes();
    settle();
  }

  function dropToFree(): void {
    if (mode === "free") return;
    held = mode;
    mode = "free";
    paintModes();
  }

  function settle(): void {
    const goal = goalOf();
    if (!goal) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = { ...bar.state };
    const started = performance.now();
    moving = true;
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - started) / 600);
      const ease = t * t * (3 - 2 * t);
      bar.set({
        zoom: from.zoom + (goal.zoom - from.zoom) * ease,
        panX: from.panX + (goal.panX - from.panX) * ease,
        panY: from.panY + (goal.panY - from.panY) * ease,
      });
      if (t < 1) requestAnimationFrame(step);
      else moving = false;
    };
    requestAnimationFrame(step);
  }

  function goalOf(): { zoom: number; panX: number; panY: number } | null {
    const boxes = readBoxes();
    const canvas = hero.shadowRoot?.querySelector("canvas");
    if (!canvas || boxes.length === 0) return null;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const wanted = mode === "all" ? boxes : mode === "selected" ? boxes.filter((box) => selectedIndexes().includes(box.craft + 1)) : mode === "follow" || mode === "planet" ? boxes.filter((box) => box.craft === follow - 1) : [];
    const use = wanted.length ? wanted : mode === "selected" ? [pageBox(opts.editing())].filter((box): box is Box => !!box) : [];
    if (use.length === 0 || mode === "free") return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const box of use) {
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.w);
      maxY = Math.max(maxY, box.y + box.h);
    }
    const span = Math.max((maxX - minX) / (width * 0.84), (maxY - minY) / (height * 0.84), mode === "all" || use.length > 1 ? 1 : 0);
    const zoom = span > 1 ? bar.state.zoom / span : bar.state.zoom;
    const panX = bar.state.panX + (width / 2 - (minX + maxX) / 2);
    const panY = bar.state.panY + (height / 2 - (minY + maxY) / 2);
    return { zoom: Math.max(ZOOM_MIN, zoom), panX, panY };
  }

  function paintOverlay(): void {
    const canvas = hero.shadowRoot?.querySelector("canvas");
    const names = opts.names();
    arrows.replaceChildren();
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    names.forEach((name, index) => {
      const box = pageBox(index);
      const off = Boolean(box && box.on && (box.x + box.w < 0 || box.y + box.h < 0 || box.x > width || box.y > height));
      if (edges === "open" && off && box) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cw-edge";
        button.dataset.testid = `edge-${index}`;
        button.textContent = name;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        button.style.left = `${Math.min(width - 8, Math.max(8, cx))}px`;
        button.style.top = `${cy < 0 ? 8 : cy > height ? height - 8 : cy}px`;
        button.addEventListener("click", () => {
          follow = index;
          mode = "follow";
          held = null;
          paintModes();
          settle();
        });
        arrows.append(button);
      }
      if (box && box.on && box.w < MARK_PX && box.h < MARK_PX) {
        const mark = document.createElement("span");
        mark.className = "cw-mark";
        mark.dataset.testid = `mark-${index}`;
        mark.textContent = name;
        mark.style.left = `${box.x}px`;
        mark.style.top = `${box.y}px`;
        arrows.append(mark);
      }
    });
    const metres = Number(canvas.dataset.distance ?? "0");
    const zoom = Math.max(ZOOM_MIN, bar.state.zoom || 1);
    const far = metres / zoom;
    distance.textContent = far >= 1000 ? say("cmpKm", { n: Math.round(far / 1000).toLocaleString("en-US") }) : say("cmpM", { n: Math.round(far).toLocaleString("en-US") });
    paintMoon(width, height, far);
    paintSolar(width, height, far);
  }

  function paintMoon(width: number, height: number, far: number): void {
    if (hero.getAttribute("world") === "earth") {
      const pivot = hero.shadowRoot?.querySelector("canvas")?.dataset.pivot ?? "craft";
      if (pivot !== "craft" && pivot !== "moon") return;
      if (far < 100_000_000) return;
      const raw = hero.shadowRoot?.querySelector("canvas")?.dataset.moon ?? "";
      const [nx, ny] = raw.split(",").map(Number);
      if (!raw || Math.abs(nx) > 1 || Math.abs(ny) > 1) return;
      const mark = document.createElement("button");
      mark.type = "button";
      mark.className = "cw-mark cw-moon";
      mark.dataset.testid = "moon-mark";
      mark.textContent = say("background_moon");
      mark.style.left = `${((nx + 1) / 2) * width}px`;
      mark.style.top = `${((1 - ny) / 2) * height}px`;
      mark.style.transform = "translate(-50%, -140%)";
      mark.addEventListener("click", () => goTo("moon"));
      arrows.append(mark);
      return;
    }
    if (far < 20_000_000) return;
    const [x, y] = moonGeocentric(when);
    const range = Math.hypot(x, y, 0) * 1000;
    const yaw = ((turn === "camera" ? bar.state.yaw : 0) * Math.PI) / 180;
    const angle = Math.atan2(x, y) - yaw;
    const span = (range / Math.max(far, 1)) * width;
    const px = width / 2 + Math.sin(angle) * span;
    const py = height / 2;
    const mark = document.createElement("span");
    mark.className = "cw-mark cw-moon";
    mark.dataset.testid = "moon-mark";
    mark.textContent = say("background_moon");
    mark.style.left = `${Math.min(width - 8, Math.max(8, px))}px`;
    mark.style.top = `${py}px`;
    arrows.append(mark);
    if (far < MOON_M * 0.5) mark.dataset.place = "far";
  }

  function goTo(id: "sun" | HostId | "moon"): void {
    const canvas = hero.shadowRoot?.querySelector("canvas");
    const fit = Number(canvas?.dataset.distance ?? "400");
    const at = id === "moon" ? moonScene(when) : bodyScene(id, when);
    const km = BODIES[id].radiusKm;
    const reach = Math.max(km * 1000 * (id === "moon" ? 14 : 36), 50_000);
    hero.setPivot(at, id);
    bar.set({ zoom: Math.max(ZOOM_MIN, Math.min(8, fit / Math.max(reach, 1))), tilt: 0 });
  }

  function fromEarth(id: "sun" | HostId, ms: number): [number, number, number] {
    const earth = heliocentric("earth", ms);
    const there = id === "sun" ? [0, 0, 0] : heliocentric(id, ms);
    return [(there[0] - earth[0]) * AU, (there[1] - earth[1]) * AU, (there[2] - earth[2]) * AU];
  }

  function paintSolar(width: number, height: number, far: number): void {
    if (far < 20_000_000) return;
    const ms = when;
    const yaw = ((turn === "camera" ? bar.state.yaw : 0) * Math.PI) / 180;
    let stacked = 0;
    for (const [id, key] of SOLAR) {
      const [x, y] = fromEarth(id, ms);
      const range = Math.hypot(x, y, 0);
      const angle = Math.atan2(x, y) - yaw;
      const span = (range / Math.max(far, 1)) * width;
      const px = width / 2 + Math.sin(angle) * span;
      const left = Math.min(width - 16, Math.max(16, px));
      const off = Math.abs(px - left) > 1;
      const top = off ? 16 + stacked * 22 : height / 2;
      if (off) stacked += 1;
      const mark = document.createElement("button");
      mark.type = "button";
      mark.className = "cw-mark";
      mark.dataset.testid = `body-${id}`;
      mark.dataset.angle = angle.toFixed(5);
      mark.setAttribute("aria-label", say(key));
      mark.style.left = `${left}px`;
      mark.style.top = `${top}px`;
      mark.style.width = "14px";
      mark.style.height = "14px";
      mark.style.padding = "0";
      mark.style.borderColor = id === "sun" ? "#e6d38a" : BODIES[id].colour;
      mark.addEventListener("click", () => goTo(id));
      const name = document.createElement("span");
      name.className = "cw-mark";
      name.textContent = say(key);
      name.style.pointerEvents = "none";
      name.style.left = `${left + 16}px`;
      name.style.top = `${top}px`;
      name.style.border = "0";
      name.style.background = "transparent";
      arrows.append(mark, name);
    }
  }

  function onView(detail: Detail): void {
    if (applying) {
      hero.drive(detail);
      return;
    }
    if (HAND.has(detail.reason ?? "") && mode !== "free" && !moving) dropToFree();
    if (typeof detail.zoom === "number" && detail.zoom < 0.2 && edges === "wrap") {
      edges = "open";
      applyEdges();
    }
    hero.drive(detail);
    const zoom = Math.max(ZOOM_MIN, detail.zoom ?? bar.state.zoom ?? 1);
    const sky = byId("sky-back");
    sky.dataset.viewZoom = String(zoom);
    const node = sky.querySelector("wakusei-body:not([data-moon])");
    if (node instanceof HTMLElement) frameSky(node, sky, zoom);
    applyTurn();
    if (!moving && (mode === "all" || mode === "follow" || mode === "planet" || mode === "selected")) {
      const goal = goalOf();
      if (goal && (Math.abs(goal.panX - bar.state.panX) > 12 || Math.abs(goal.panY - bar.state.panY) > 12 || bar.state.zoom / goal.zoom > 1.08)) {
        applying = true;
        bar.set({ zoom: goal.zoom, panX: goal.panX, panY: goal.panY });
        applying = false;
      }
    }
    paintOverlay();
  }

  byId("cw-camera").replaceChildren();
  byId("cw-edges").replaceChildren(
    chip(say("cmpOpenSpace"), "edges-open", edges === "open", () => {
      edges = "open";
      applyEdges();
    }),
    chip(say("cmpWrap"), "edges-wrap", edges === "wrap", () => {
      edges = "wrap";
      mode = "free";
      held = null;
      paintModes();
    }),
  );
  byId("cw-turn").replaceChildren(
    chip(say("cmpTurnCraft"), "turn-craft", turn === "craft", () => {
      turn = "craft";
      applyTurn();
    }),
    chip(say("cmpTurnCamera"), "turn-camera", turn === "camera", () => {
      turn = "camera";
      applyTurn();
    }),
  );
  const marks: [string, number][] = [
    ["cmpMark100", 100],
    ["cmpMark1k", 1_000],
    ["cmpMark100k", 100_000],
    ["cmpMarkEarth", 12_742_000],
    ["cmpMarkMoon", MOON_M],
    ["cmpMarkAu", AU],
    ["cmpBodyJupiter", 0],
    ["cmpBodyNeptune", 0],
    ["cmpMarkKuiper", 50 * AU],
  ];
  byId("cw-marks").replaceChildren(
    ...marks.map(([key, metres]) => chip(say(key), `mark-${key}`, false, () => {
      const canvas = hero.shadowRoot?.querySelector("canvas");
      const fit = Number(canvas?.dataset.distance ?? "400");
      const live = key === "cmpBodyJupiter" ? "jupiter" : key === "cmpBodyNeptune" ? "neptune" : null;
      if (key === "cmpMarkMoon") {
        goTo("moon");
        return;
      }
      if (live) {
        goTo(live);
        return;
      }
      hero.setPivot(null);
      bar.set({ zoom: Math.max(ZOOM_MIN, Math.min(8, fit / Math.max(metres, 1))) });
    })),
  );
  back.addEventListener("click", () => {
    if (held) choose(held);
  });
  bindStage(hero, onView);
  hero.addEventListener("uchusen-draw", () => paintOverlay());
  const day = document.createElement("button");
  day.type = "button";
  day.className = "chip";
  day.dataset.testid = "cmp-day";
  day.textContent = say("cmpDay");
  const stepDay = (): void => {
    when += 86_400_000;
    hero.setWhen(when);
    paintOverlay();
  };
  day.addEventListener("click", stepDay);
  const pathsButton = chip(say("cmpPaths"), "cmp-paths", true, () => {
    paths = !paths;
    pathsButton.setAttribute("aria-pressed", String(paths));
    hero.setPaths(paths);
  });
  const playButton = chip(say("cmpPlay"), "cmp-play", false, () => {
    playing = !playing;
    playButton.textContent = say(playing ? "cmpPause" : "cmpPlay");
    playButton.setAttribute("aria-pressed", String(playing));
    if (!playing) {
      window.cancelAnimationFrame(playFrame);
      return;
    }
    steppedAt = 0;
    const loop = (now: number): void => {
      if (!playing) return;
      if (!document.hidden && now - steppedAt >= 1000) {
        steppedAt = now;
        stepDay();
      }
      playFrame = window.requestAnimationFrame(loop);
    };
    playFrame = window.requestAnimationFrame(loop);
  });
  distance.insertAdjacentElement("afterend", day);
  day.insertAdjacentElement("afterend", pathsButton);
  pathsButton.insertAdjacentElement("afterend", playButton);
  paintModes();
  hero.setAttribute("edges", edges);
  paintOverlay();
}

function readMode(value: string | null): Mode {
  if (value === "all" || value === "selected" || value === "planet") return value;
  if (value?.startsWith("follow:")) return "follow";
  return "free";
}

function readFollow(value: string | null, editing: number): number {
  if (!value?.startsWith("follow:")) return editing;
  const index = Number(value.slice("follow:".length));
  return Number.isInteger(index) && index >= 0 ? index : editing;
}

function labelKey(mode: Mode): string {
  if (mode === "all") return "cmpCamAll";
  if (mode === "follow") return "cmpCamFollow";
  if (mode === "selected") return "cmpCamSelected";
  if (mode === "planet") return "cmpCamPlanet";
  return "cmpCamFree";
}
