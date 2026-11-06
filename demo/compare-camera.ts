// The compare page's camera. Free is the view as it was. The other choices keep craft in frame, follow one, or keep the planet with them. Follow selected only reads `data-selected` on the stage, which MODULES-476 will set. The camera orbits when Turn is Camera: the craft stay where they are and the Earth moves. Edges Wrap is only the free camera.
import { moonGeocentric } from "@johnmorrisdotca/wakusei-planets";
import type { UchusenRocket } from "../src/element.ts";
import { VIEWS } from "../src/framing.ts";
import { frameSky } from "./sky.ts";
import type { ViewControlsElement } from "@johnmorrisdotca/kazoku-ui/view-controls/element";

type Detail = { yaw?: number; tilt?: number; roll?: number; zoom?: number; panX?: number; panY?: number; reason?: string };
type Mode = "free" | "all" | "follow" | "selected" | "planet";
type Box = { craft: number; x: number; y: number; w: number; h: number; on: boolean };

const HAND = new Set(["drag", "pinch", "wheel", "key", "pan"]);
const MOON_M = 384_400_000;
const MARK_PX = 4;

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

  const back = byId("cw-camera-back");
  const note = byId("cw-edges-note");
  const arrows = byId("cw-arrows");
  const distance = byId("cw-distance");

  const chip = (label: string, testid: string, pressed: boolean, on: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    button.dataset.testid = testid;
    button.setAttribute("aria-pressed", String(pressed));
    button.addEventListener("click", on);
    return button;
  };

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
    return { zoom: Math.max(0.000001, zoom), panX, panY };
  }

  function paintOverlay(): void {
    const canvas = hero.shadowRoot?.querySelector("canvas");
    const names = opts.names();
    arrows.replaceChildren();
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const list = document.createElement("ul");
    list.className = "cw-craft-list";
    // The picture already names a craft that is on screen. This list is only for one the picture is not naming.
    const pictureNames = hero.getAttribute("names") !== "off";
    names.forEach((name, index) => {
      const box = pageBox(index);
      const off = !box || !box.on || box.x + box.w < 0 || box.y + box.h < 0 || box.x > width || box.y > height;
      if (pictureNames && !off) return;
      const showEdge = edges === "open" && off && !!box;
      if (!showEdge) {
        const item = document.createElement("li");
        item.textContent = off ? `${name} · ${say("cmpOffScreen")}` : name;
        list.append(item);
      }
      if (showEdge && box) {
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
    if (list.childElementCount) arrows.append(list);
    const metres = Number(canvas.dataset.distance ?? "0");
    const zoom = Math.max(0.000001, bar.state.zoom || 1);
    const far = metres / zoom;
    distance.textContent = far >= 1000 ? say("cmpKm", { n: Math.round(far / 1000).toLocaleString("en-US") }) : say("cmpM", { n: Math.round(far).toLocaleString("en-US") });
    paintMoon(width, height, far);
  }

  function paintMoon(width: number, height: number, far: number): void {
    if (hero.getAttribute("world") === "earth") {
      if (far < 100_000_000) return;
      const raw = hero.shadowRoot?.querySelector("canvas")?.dataset.moon ?? "";
      const [nx, ny] = raw.split(",").map(Number);
      if (!raw || Math.abs(nx) > 1 || Math.abs(ny) > 1) return;
      const mark = document.createElement("span");
      mark.className = "cw-mark cw-moon";
      mark.dataset.testid = "moon-mark";
      mark.textContent = say("background_moon");
      mark.style.left = `${((nx + 1) / 2) * width}px`;
      mark.style.top = `${((1 - ny) / 2) * height}px`;
      mark.style.transform = "translate(-50%, -140%)";
      arrows.append(mark);
      return;
    }
    if (far < 20_000_000) return;
    const [x, y] = moonGeocentric(Date.now());
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

  function onView(event: Event): void {
    const detail = (event as CustomEvent<Detail>).detail ?? {};
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
    const zoom = Math.max(0.000001, detail.zoom ?? bar.state.zoom ?? 1);
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
  ];
  byId("cw-marks").replaceChildren(
    ...marks.map(([key, metres]) => chip(say(key), `mark-${key}`, false, () => {
      const canvas = hero.shadowRoot?.querySelector("canvas");
      const fit = Number(canvas?.dataset.distance ?? "400");
      const zoom = Math.max(0.000001, Math.min(8, fit / metres));
      if (key !== "cmpMarkMoon") {
        bar.set({ zoom });
        return;
      }
      const [x, y] = moonGeocentric(Date.now());
      const az = (Math.atan2(x, y) * 180) / Math.PI + 180 + 14;
      bar.set({ zoom, yaw: VIEWS["three-quarter"].az - az, tilt: 0 });
    })),
  );
  back.addEventListener("click", () => {
    if (held) choose(held);
  });
  bar.addEventListener("kazoku-viewchange", onView);
  hero.addEventListener("uchusen-draw", () => paintOverlay());
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
