// Renders and drawing sheets of ISV 加美鳴 (かみなり) Kaminari, SPX-207 from the real 3D model, in one headless browser drawing in software (SwiftShader), never on the graphics card. One browser at a time; no port is opened.
//
//   node scripts/fleet-render.ts <folder> [name,name,...]
//
// Raw renders (side, top, module and close-up shots) come from scripts/fleet-view.page.ts; the sheets put labels, leaders, a ruler, a spec block, a legend, notes and a title block round them.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { build } from "esbuild";
import { chromium, type Page } from "@playwright/test";
import type { Spec } from "./fleet-view.page.ts";
import { SHIP_02_SLOTS } from "../src/model/fleet/ship-02/index.ts";
import { HABITAT } from "../src/model/fleet/ship-02/dims.ts";
import { DECKS, ENGINE_CARDS, HULL_STACK_RING, HULL_STACK_TANK, INSETS, NOTES, SPEC } from "../src/model/fleet/ship-02/specs.ts";
import { SECTIONS, type Section } from "../src/model/fleet/ship-02/sections.ts";

const out = process.argv[2] ?? "renders";
const only = process.argv[3]?.split(",");
mkdirSync(out, { recursive: true });
const want = (name: string) => !only || only.includes(name);

type V3 = [number, number, number];
const Z: V3 = [0, 0, 1];
const SIDE = { from: [1, 0, 0] as V3, up: Z };
const TOP = { from: [0, 0, 1] as V3, up: [-1, 0, 0] as V3 };
const FRONT = { from: [0, 1, 0] as V3, up: Z };
const REAR = { from: [0, -1, 0] as V3, up: Z };
const PX = 1.4; // pixels a metre in the general-arrangement views
const half = (h: number) => h / (2 * PX);
const CUTS = { tank: -80, cargo: -37 };
const mark = (s: Section) => ({ id: s.id, at: [...s.at] as V3, slot: s.slot });

interface Raw {
  spec: Spec;
  marks?: Section[];
}
const RAW: Record<string, Raw> = {
  side: { spec: { w: 3000, h: 700, camera: "ortho", target: [0, 910, 0], ...SIDE, half: half(700), shadow: 1300, light: [0.35, -0.25, 0.9], marks: SECTIONS.filter((s) => !s.inside).map(mark) } },
  top: { spec: { w: 3000, h: 1300, camera: "ortho", target: [0, 910, 0], ...TOP, half: half(1300), shadow: 1300, light: [0.25, -0.25, 1] } },
  front: { spec: { w: 1400, h: 700, camera: "ortho", target: [0, 910, 0], ...FRONT, half: half(700), shadow: 1300, light: [0.5, 0.35, 0.8] } },
  rear: { spec: { w: 1400, h: 700, camera: "ortho", target: [0, 910, 0], ...REAR, half: half(700), shadow: 1300, light: [0.5, -0.35, 0.8] } },
  three_quarter: { spec: { w: 2600, h: 1400, camera: "persp", target: [0, 860, 0], from: [0.9, -0.75, 0.55], up: Z, fov: 28, dist: 2300, shadow: 1400, light: [0.7, -0.1, 0.8], marks: SECTIONS.filter((x) => !x.inside).map(mark) } },
  cutaway_side: { spec: { w: 3000, h: 700, camera: "ortho", target: [0, 910, 0], ...SIDE, half: half(700), cut: 0, cuts: CUTS, shadow: 1300, light: [0.3, -0.2, 1], marks: SECTIONS.filter((s) => s.inside).map(mark) } },
  cutaway_three_quarter: { spec: { w: 2600, h: 1400, camera: "persp", target: [0, 860, 0], from: [0.9, -0.75, 0.55], up: Z, fov: 28, dist: 2300, cut: 0, cuts: CUTS, shadow: 1500, light: [0.7, -0.1, 0.8], marks: SECTIONS.filter((s) => s.inside).map(mark) } },
  exploded: { spec: { w: 3400, h: 1000, camera: "ortho", target: [0, 1950, 0], ...SIDE, half: 540, explode: 90, shadow: 2700, light: [0.35, -0.25, 0.9] } },
  // three distances
  module_cargo: { spec: { w: 1800, h: 1200, camera: "persp", target: [40, 868, 40], from: [0.9, -0.45, 0.6], up: Z, fov: 30, dist: 340, shadow: 260, slots: ["spine", "cargo-1", "cargo-2"] } },
  module_drive: { spec: { w: 1800, h: 1200, camera: "persp", target: [0, 90, 0], from: [0.6, -0.9, 0.35], up: Z, fov: 30, dist: 520, shadow: 330, slots: ["spine", "drive", "drive-engines", "verniers", "header-tanks", "reactor", "shadow-shield", "propellant-lines"] } },
  module_habitat: { spec: { w: 1800, h: 1200, camera: "persp", target: [0, 1625, 0], from: [0.5, -0.9, 0.5], up: Z, fov: 30, dist: 900, shadow: 520, slots: ["spine", "farm", "habitat-a", "habitat-b", "command"] } },
  close_cargo: { spec: { w: 1800, h: 1200, camera: "persp", target: [76, 860, 44], from: [0.8, -0.35, 0.5], up: Z, fov: 36, dist: 24, shadow: 34, slots: ["cargo-1"] } },
  close_drive: { spec: { w: 1800, h: 1200, camera: "persp", target: [-100, 112, 60.5], from: [0.12, -0.5, 1], up: [0, 1, 0], fov: 38, dist: 15, shadow: 22, slots: ["drive"] } },
  // a pipe run and strut of ISV 加美鳴 (かみなり) Kaminari, SPX-207 beside the code-drawn Apollo lunar module descent stage, at a similar scale on screen
  pipes_beside_lunar_module: { spec: { w: 1800, h: 1200, camera: "persp", target: [-96, 116, 64], from: [0.1, -0.55, 1], up: [0, 1, 0], fov: 38, dist: 22, shadow: 30, slots: ["drive"], extra: [{ id: "lunar-module-lunar-module-descent", at: [-92, 119, 61] }] } },
  close_layers: { spec: { w: 1800, h: 1200, camera: "persp", target: [0, 1610, -180], from: [1, 0, 0.1], up: Z, fov: 32, dist: 34, cut: 0, shadow: 40, slots: ["habitat-a"] } },
  beside_starship: { spec: { w: 2000, h: 1200, camera: "persp", target: [60, 880, 30], from: [1, -0.05, 0.05], up: Z, fov: 36, dist: 300, shadow: 260, slots: ["spine", "cargo-1", "cargo-2"], starship: [150, 860, 0] } },
  family: { spec: { w: 2800, h: 1200, camera: "persp", target: [0, 700, 0], from: [0.9, -0.5, 0.5], up: Z, fov: 30, dist: 3000, shadow: 1500, starship: [-260, 400, 0], ghosts: [{ size: [118, 380, 74], at: [260, 200, 0], color: "#7fc8ff" }] } },
  // the swappable pod, two variants, and the engines on their own
  pod_survey: { spec: { w: 1400, h: 900, camera: "persp", target: [0, 540, 66], from: [0.8, -0.55, 0.45], up: Z, fov: 30, dist: 260, shadow: 200, slots: ["spine", "pod"] } },
  pod_settlement: { spec: { w: 1400, h: 900, camera: "persp", target: [0, 540, 66], from: [0.8, -0.55, 0.45], up: Z, fov: 30, dist: 260, shadow: 200, slots: ["spine"], extra: [{ id: "fleet-02-fleet-02-pod-settlement", at: [0, 480, 62] }] } },
  engine_main: { spec: { w: 1100, h: 1100, camera: "persp", target: [0, 58, 0], from: [0.8, -0.7, 0.35], up: Z, fov: 30, dist: 300, shadow: 150, slots: [], extra: [{ id: "fleet-02-nozzle-main", at: [0, 0, 0] }] } },
  engine_vernier: { spec: { w: 1100, h: 1100, camera: "persp", target: [0, 40, 0], from: [0.8, -0.7, 0.35], up: Z, fov: 30, dist: 190, shadow: 100, slots: [], extra: [{ id: "fleet-02-vernier-cluster", at: [0, 0, 0] }] } },
};
for (const inset of INSETS)
  RAW[`inset_${inset.id}`] = {
    spec: { w: 1700, h: 1100, camera: "persp", target: [...inset.view.target] as V3, from: [...inset.view.from] as V3, up: Z, fov: 30, dist: inset.view.dist, shadow: inset.view.dist * 0.7, slots: [...inset.slots], ...(inset.cut === undefined ? {} : { cut: inset.cut, cuts: CUTS }), marks: inset.parts.map((p) => ({ id: String(p.n), at: [...p.at] as V3 })) },
  };
// the ring wall's layers, numbered outside to inside: the anchor of each is the middle of its shell on the cut plane
{
  let rr = HABITAT.radius + HABITAT.tube / 2;
  RAW.close_layers.spec.marks = HULL_STACK_RING.map((l) => {
    const centre = rr - l.thicknessM / 2;
    rr -= l.thicknessM;
    return { id: String(l.n), at: [0, 1608, -centre] as V3 };
  });
  RAW.close_layers.spec.dist = 20;
  RAW.close_layers.spec.target = [0, 1608, -179.5];
}
// the module names for the exploded view
const moduleMarks = SHIP_02_SLOTS.filter((s) => !s.inside).map((s) => ({ id: s.slot, at: [s.at[0], s.at[1] + s.height / 2, s.at[2] + (s.slot.startsWith("radiator") ? 0 : 0)] as V3, slot: s.slot }));
RAW.exploded.spec.marks = moduleMarks;

interface Mark {
  id: string;
  x: number;
  y: number;
}
const bundle = await build({ entryPoints: ["scripts/fleet-view.page.ts"], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "error" });
const script = bundle.outputFiles[0].text;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const marksOf: Record<string, Mark[]> = {};

async function renderRaw(page: Page, name: string): Promise<void> {
  const raw = RAW[name];
  const t = Date.now();
  const result = await page.evaluate((s) => (window as unknown as { shoot: (s: unknown) => { dataUrl: string; pxPerMetre: number; triangles: number; marks: Mark[] } }).shoot(s), raw.spec as unknown as Record<string, unknown>);
  writeFileSync(join(out, `${name}.png`), Buffer.from(result.dataUrl.split(",")[1], "base64"));
  marksOf[name] = result.marks;
  console.log(name, `${raw.spec.w}x${raw.spec.h}`, `${result.triangles} triangles`, `${Math.round((Date.now() - t) / 100) / 10}s`);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// sheets
const FONT = `font-family: "SF Mono", Menlo, Consolas, monospace;`;
const t = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} million t` : `${Math.round(n).toLocaleString("en-US")} t`);
const img = (name: string) => `data:image/png;base64,${readFileSync(join(out, `${name}.png`)).toString("base64")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const specRows: [string, string][] = [
  ["Designation", "SPX-207 · IHT class"],
  ["Operator", "SPX"],
  ["Computer", "KAZE core v4"],
  ["Length", `${SPEC.length.toLocaleString("en-US")} m`],
  ["Beam (radiators out)", `${SPEC.beam} m (${SPEC.beamRadiatorsOut} m)`],
  ["Height", `${SPEC.height} m`],
  ["Dry mass", t(SPEC.dryMassT)],
  ["Full mass", t(SPEC.fullMassT)],
  ["Crew", `${SPEC.crewNominal} (max ${SPEC.crewMax})`],
  ["Passengers", SPEC.passengers.toLocaleString("en-US")],
  ["Cargo", `${t(SPEC.cargoT)}, ${SPEC.containers} containers`],
  ["Propellant", `${t(SPEC.propellantT)} of ${t(SPEC.tankCapacityT)}`],
  ["Main drive", `FTD ×8 (Fusion Torch Drive), ${(SPEC.mainThrustN / 1e9).toFixed(2)} GN`],
  ["Manoeuvring", `4 vernier clusters (12 nozzles), ${SPEC.maneuverThrustN / 1e6} MN; 32 attitude thrusters`],
  ["Acceleration", `${SPEC.maxG} g`],
  ["Cruise / top speed", `${SPEC.cruiseC.toFixed(3)} c / ${SPEC.topC} c (shield rating)`],
  ["Proxima, 4.37 ly", `${SPEC.proxima.shipYears.toFixed(1)} y on board, ${SPEC.proxima.earthYears.toFixed(1)} y Earth`],
  ["Range, full payload", `${SPEC.rangeLy} ly`],
  ["Endurance", `${SPEC.enduranceYears} years sealed`],
];
const specBlock = `<table class="spec"><caption>SPECIFICATION</caption>${specRows.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</table>`;
const legendItems: [string, string][] = [
  ["#b8672a", "Removable shield or shutter"], ["#cfcfca", "Protected volume (ceramic white)"], ["#8a8f95", "Structure and plating"], ["#3f6e72", "Coolant and feed line"], ["#c8a24c", "Copper field coil"], ["#c9a227", "Service access, rail"], ["#1c1d20", "Heat sink, blast door"], ["#3c6b39", "Farm"], ["#2c5f86", "Propellant, water"], ["#9fe4ff", "Light, window"],
];
const legend = `<div class="legend"><b>SYMBOLS</b>${legendItems.map(([c, n]) => `<div><i style="background:${c}"></i>${esc(n)}</div>`).join("")}<div><i class="leader"></i>Leader to part</div><div><i class="num">1</i>Numbered sub-part</div></div>`;
const notes = `<div class="notes">${(["propulsion", "construction", "history", "equipment"] as const).map((k) => `<div><b>${k === "propulsion" ? "PROPULSION AND LIMITS" : k.toUpperCase()}</b>${NOTES[k].map((p) => `<p>${esc(p)}</p>`).join("")}</div>`).join("")}</div>`;
const titleBlock = (sheet: string, scale: string) => `<table class="title"><tr><td colspan="2" class="big">SPX FLEET DRAWING OFFICE</td></tr><tr><th>Ship</th><td>ISV <ruby>加美鳴<rt>かみなり</rt></ruby> KAMINARI</td></tr><tr><th>Role</th><td>大型輸送船 · IHT class, Interstellar Heavy Transport</td></tr><tr><th>Operator</th><td>SPX</td></tr><tr><th>Drive</th><td>FTD ×8 (Fusion Torch Drive)</td></tr><tr><th>Computer</th><td>KAZE core v4</td></tr><tr><th>Small craft</th><td>ATC (Auxiliary Transfer Craft)</td></tr><tr><th>Designation</th><td>SPX-207</td></tr><tr><th>Sheet</th><td>${esc(sheet)}</td></tr><tr><th>Scale</th><td>${esc(scale)}</td></tr><tr><th>Revision</th><td>A · 2026-11-04</td></tr><tr><th>Status</th><td>PLANNED · FIRST FLIGHT 2520</td></tr></table>`;
const CSS = `body{margin:0;background:#0b111b;color:#d5dde8;${FONT}font-size:15px}.sheet{position:relative;padding:28px;background:#0b111b}h1{margin:0 0 6px;font-size:30px;letter-spacing:.08em;font-weight:600}h2{margin:18px 0 6px;font-size:18px;letter-spacing:.1em;color:#f2c14e}table{border-collapse:collapse}.spec th,.spec td,.title th,.title td{border:1px solid #3a4a5e;padding:3px 8px;text-align:left;vertical-align:top}.spec th,.title th{color:#9fb2c8;font-weight:500;white-space:nowrap}.spec caption{text-align:left;color:#f2c14e;padding:4px 0;letter-spacing:.1em}.title .big{font-size:18px;letter-spacing:.12em;background:#16202f}.legend div{margin:3px 0;display:flex;align-items:center;gap:8px}.legend i{width:22px;height:12px;border:1px solid #607085;display:inline-block}.legend i.leader{height:0;border-top:2px solid #f2c14e;border-bottom:0;border-left:0;border-right:0;margin-top:2px}.legend i.num{width:20px;height:20px;border-radius:10px;background:#f2c14e;color:#0b111b;text-align:center;line-height:20px;font-style:normal;font-weight:700;font-size:13px}.legend b,.notes b{display:block;color:#f2c14e;letter-spacing:.1em;margin-bottom:6px}.notes{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}.notes p{margin:0 0 8px;font-size:13px;line-height:1.45}.row{display:flex;gap:30px;align-items:flex-start;margin-top:24px}svg text{${FONT}}`;

function place(items: { id: string; label: string; x: number; y: number }[], W: number, topH: number, bottomH: number, imgY: number, imgH: number) {
  // alternate above and below, three staggered levels each side, in order along x
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const rows = { top: [] as number[], bottom: [] as number[] };
  const levels = 5;
  const gap = 8;
  const lines: { id: string; label: string; ax: number; ay: number; lx: number; ly: number; w: number; top: boolean }[] = [];
  const ends: Record<string, number[]> = {};
  void rows;
  sorted.forEach((it, i) => {
    const top = i % 2 === 0 ? it.y < imgY + imgH / 2 + 80 : it.y >= imgY + imgH / 2 - 80;
    const side = i % 2 === 0 ? "top" : "bottom";
    const w = it.label.length * 8.1 + 14;
    const key = (top ? side : side) + "";
    const list = (ends[key] ??= new Array(levels).fill(-1e9));
    let lvl = list.findIndex((end) => end + gap < it.x - w / 2);
    if (lvl < 0) lvl = list.indexOf(Math.min(...list));
    list[lvl] = it.x + w / 2;
    const above = side === "top";
    const ly = above ? imgY - 30 - lvl * 34 : imgY + imgH + 30 + lvl * 34;
    lines.push({ id: it.id, label: it.label, ax: it.x, ay: it.y, lx: Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, it.x)), ly, w, top: above });
  });
  void topH;
  void bottomH;
  return lines;
}

async function sheetPage(browserPage: Page, name: string, html: string, width: number): Promise<void> {
  await browserPage.setViewportSize({ width, height: 800 });
  await browserPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
  await browserPage.waitForLoadState("load");
  const el = await browserPage.$(".sheet");
  await el!.screenshot({ path: join(out, `${name}.png`) });
  console.log(name, "sheet");
}

function annotated(name: string, W: number, H: number, anchors: Mark[], labelOf: (id: string) => string, extraSvg = ""): string {
  const pad = 190;
  const items = anchors.filter((m) => m.x > -50 && m.x < W + 50 && m.y > -50 && m.y < H + 50).map((m) => ({ id: m.id, label: labelOf(m.id), x: m.x, y: m.y }));
  const lines = place(items, W, pad, pad, pad, H);
  const svg = `<svg width="${W}" height="${H + 2 * pad}" style="position:absolute;left:0;top:0">${lines.map((l) => `<polyline points="${l.lx},${l.ly + (l.top ? 6 : -14)} ${l.ax},${l.ay + pad}" fill="none" stroke="#f2c14e" stroke-width="1.1" opacity=".8"/><circle cx="${l.ax}" cy="${l.ay + pad}" r="3.4" fill="#f2c14e"/><text x="${l.lx}" y="${l.ly + 4}" font-size="13" text-anchor="middle" fill="#e6edf6" stroke="#0b111b" stroke-width="3" paint-order="stroke">${esc(l.label)}</text>`).join("")}${extraSvg}</svg>`;
  return `<div style="position:relative;width:${W}px;height:${H + 2 * pad}px"><img src="${img(name)}" style="position:absolute;left:0;top:${pad}px"/>${svg}</div>`;
}

function ruler(W: number, targetY: number, pxPerM: number, length: number): string {
  const x = (m: number) => W / 2 + (m - targetY) * pxPerM;
  let s = `<line x1="${x(0)}" y1="30" x2="${x(length)}" y2="30" stroke="#d5dde8"/>`;
  for (let m = 0; m <= length; m += 50) s += `<line x1="${x(m)}" y1="${m % 100 === 0 ? 20 : 25}" x2="${x(m)}" y2="30" stroke="#d5dde8"/>${m % 200 === 0 ? `<text x="${x(m)}" y="14" font-size="13" text-anchor="middle" fill="#d5dde8">${m} m</text>` : ""}`;
  return `<svg width="${W}" height="42">${s}</svg>`;
}

const labelOfSection = (id: string) => SECTIONS.find((s) => s.id === id)?.name ?? id;

async function sheets(page: Page): Promise<void> {
  if (want("sheet_side") && marksOf.side) {
    const W = 3000;
    const html = `<div class="sheet" style="width:${W}px"><h1>ISV KAMINARI · SPX-207 · INTERSTELLAR HEAVY TRANSPORT · GENERAL ARRANGEMENT, SIDE (STARBOARD)</h1>${annotated("side", W, 700, marksOf.side, labelOfSection)}${ruler(W, 910, PX, 1820)}<div class="row"><div>${specBlock}</div><div>${legend}</div><div style="flex:1">${notes}</div><div>${titleBlock("1 of 8 · exterior with callouts", `${PX} px per metre; 1,820 m length ruler above`)}</div></div></div>`;
    await sheetPage(page, "sheet_side", html, W + 56);
  }
  if (want("sheet_cutaway") && marksOf.cutaway_side) {
    const W = 3000;
    const html = `<div class="sheet" style="width:${W}px"><h1>ISV KAMINARI · SPX-207 · CUTAWAY, NAMED ROOMS AND SYSTEMS</h1>${annotated("cutaway_side", W, 700, marksOf.cutaway_side, labelOfSection)}${ruler(W, 910, PX, 1820)}<div class="row"><div>${specBlock}</div><div style="flex:1"><h2>DECKS, BOW TO STERN</h2><table class="spec">${DECKS.map((d) => `<tr><th>${d.n}</th><td>${esc(d.name)}</td><td>${d.from}–${d.to} m</td></tr>`).join("")}</table></div><div style="flex:1"><h2>WALL OF THE CREW RINGS, OUTSIDE TO INSIDE</h2><table class="spec">${HULL_STACK_RING.map((l) => `<tr><th>${l.n}</th><td>${esc(l.name)}</td><td>${l.thicknessM} m</td><td>${esc(l.job)}</td></tr>`).join("")}</table><h2>WALL OF THE TANKS</h2><table class="spec">${HULL_STACK_TANK.map((l) => `<tr><th>${l.n}</th><td>${esc(l.name)}</td><td>${l.thicknessM} m</td></tr>`).join("")}</table></div><div>${titleBlock("2 of 8 · cutaway", `${PX} px per metre`)}</div></div></div>`;
    await sheetPage(page, "sheet_cutaway", html, W + 56);
  }
  for (const [name, raw, title, n] of [["sheet_tq", "three_quarter", "EXTERIOR, THREE-QUARTER VIEW, WITH CALLOUTS", "7 of 8 · exterior three-quarter"], ["sheet_cut_tq", "cutaway_three_quarter", "CUTAWAY, THREE-QUARTER VIEW, NAMED ROOMS", "8 of 8 · cutaway three-quarter"]] as const) {
    if (!want(name) || !marksOf[raw]) continue;
    const W = 2600;
    const html = `<div class="sheet" style="width:${W}px"><h1>ISV KAMINARI · SPX-207 · ${title}</h1>${annotated(raw, W, 1400, marksOf[raw], labelOfSection)}<div class="row"><div>${specBlock}</div><div>${legend}</div><div>${titleBlock(n, "perspective, not to scale")}</div></div></div>`;
    await sheetPage(page, name, html, W + 56);
  }
  if (want("sheet_ga") && marksOf.top) {
    const W = 3000;
    const front = `<div style="width:1400px;height:700px;position:relative"><img src="${img("front")}"/></div>`;
    const rear = `<div style="width:1400px;height:700px;position:relative"><img src="${img("rear")}"/></div>`;
    const html = `<div class="sheet" style="width:${W}px"><h1>ISV KAMINARI · SPX-207 · GENERAL ARRANGEMENT: TOP, SIDE, FRONT AND REAR AT ONE SCALE (${PX} PX PER METRE)</h1><h2>TOP (PORT AT THE TOP)</h2><img src="${img("top")}"/>${ruler(W, 910, PX, 1820)}<h2>SIDE (STARBOARD)</h2><img src="${img("side")}"/>${ruler(W, 910, PX, 1820)}<div class="row"><div><h2>FRONT (FROM THE BOW)</h2>${front}</div><div><h2>REAR (FROM THE STERN)</h2>${rear}</div><div>${specBlock}</div><div>${titleBlock("3 of 8 · general arrangement", `${PX} px per metre; 100 m = ${Math.round(PX * 100)} px`)}</div></div></div>`;
    await sheetPage(page, "sheet_ga", html, W + 56);
  }
  if (want("sheet_exploded") && marksOf.exploded) {
    const W = 3400;
    const labels = Object.fromEntries(SHIP_02_SLOTS.map((s) => [s.slot, s.name]));
    const html = `<div class="sheet" style="width:${W}px"><h1>ISV KAMINARI · SPX-207 · EXPLODED ASSEMBLY: EVERY MODULE ON ITS MOUNTING AXIS (YELLOW MARKS ARE THE MOUNTING POINTS)</h1>${annotated("exploded", W, 1000, marksOf.exploded, (id) => labels[id] ?? id)}<div class="row"><div>${legend}</div><div>${titleBlock("4 of 8 · exploded assembly", "90 m added between modules; the spine is not exploded")}</div></div></div>`;
    await sheetPage(page, "sheet_exploded", html, W + 56);
  }
  if (want("sheet_pods") && marksOf.pod_survey) {
    const html = `<div class="sheet" style="width:2900px"><h1>ISV KAMINARI · SPX-207 · SWAPPABLE MISSION POD: TWO VARIANTS ON ONE MOUNT</h1><div class="row"><div><h2>SURVEY POD</h2><img src="${img("pod_survey")}"/><p>Three laboratory decks, sample hangar, sensor masts, two dishes and a telescope barrel.</p></div><div><h2>SETTLEMENT POD</h2><img src="${img("pod_settlement")}"/><p>Two decks of round windows, a glazed greenhouse band and two docking ports.</p></div><div>${titleBlock("5 of 8 · mission pod", "same mount, same three clamp arms, same 12 m collar")}</div></div></div>`;
    await sheetPage(page, "sheet_pods", html, 2956);
  }
  if (want("sheet_engines") && marksOf.engine_main) {
    const card = (c: (typeof ENGINE_CARDS)[number], image: string) => `<div style="width:1130px"><h2>${esc(c.name.toUpperCase())}</h2><img src="${img(image)}"/><table class="spec"><tr><th>Count</th><td>${c.count}</td></tr><tr><th>Thrust, each</th><td>${(c.thrustEachN / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })} MN (${(c.thrustEachN * c.count / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })} MN together)</td></tr><tr><th>Specific impulse</th><td>${Math.round(c.isp).toLocaleString("en-US")} s (exhaust ${c.exhaust < 0.001 ? `${(c.exhaust * 299792.458).toFixed(0)} km/s` : `${c.exhaust.toFixed(2)} c`})</td></tr><tr><th>Fuel</th><td>${esc(c.fuel)}</td></tr><tr><th>Fuel capacity</th><td>${t(c.fuelCapacityT)}</td></tr><tr><th>Operation</th><td>${esc(c.operation)}</td></tr><tr><th>Numbered parts</th><td>${c.parts.map((p, i) => `${i + 1}. ${esc(p)}`).join("<br>")}</td></tr></table><p>${esc(c.note)}</p></div>`;
    const html = `<div class="sheet" style="width:2480px"><h1>ISV KAMINARI · SPX-207 · PROPULSION CARDS</h1><div class="row">${card(ENGINE_CARDS[0], "engine_main")}${card(ENGINE_CARDS[1], "engine_vernier")}<div>${titleBlock("6 of 8 · propulsion", "single engines at their own scale")}</div></div></div>`;
    await sheetPage(page, "sheet_engines", html, 2536);
  }
  if (want("sheet_layers") && marksOf.close_layers) {
    const circles = marksOf.close_layers.map((m) => `<circle cx="${m.x}" cy="${m.y}" r="16" fill="#f2c14e" stroke="#0b111b" stroke-width="2"/><text x="${m.x}" y="${m.y + 5}" font-size="17" font-weight="700" text-anchor="middle" fill="#0b111b">${m.id}</text>`).join("");
    const html = `<div class="sheet" style="width:2400px"><h1>HULL LAYERS · THE CREW RINGS' OUTER WALL, OUTSIDE TO INSIDE</h1><div class="row"><div style="position:relative;width:1800px;height:1200px"><img src="${img("close_layers")}"/><svg width="1800" height="1200" style="position:absolute;left:0;top:0">${circles}</svg></div><div><table class="spec"><caption>HEAVY RADIATION SHIELDING, 10 LAYERS</caption>${HULL_STACK_RING.map((l) => `<tr><th>${l.n}</th><td>${esc(l.name)}</td><td>${l.thicknessM} m</td><td>${esc(l.job)}</td></tr>`).join("")}</table><br>${titleBlock("hull layers", "cut at the ring's middle; 20 m from the wall")}</div></div></div>`;
    await sheetPage(page, "sheet_layers", html, 2456);
  }
  for (const inset of INSETS) {
    const key = `inset_${inset.id}`;
    if (!want("sheet_insets") || !marksOf[key]) continue;
    const circles = marksOf[key].map((m) => `<circle cx="${m.x}" cy="${m.y}" r="15" fill="#f2c14e" stroke="#0b111b" stroke-width="2"/><text x="${m.x}" y="${m.y + 5}" font-size="16" font-weight="700" text-anchor="middle" fill="#0b111b">${m.id}</text>`).join("");
    const html = `<div class="sheet" style="width:2300px"><h1>INSET · ${esc(inset.name.toUpperCase())}</h1><div class="row"><div style="position:relative;width:1700px;height:1100px"><img src="${img(key)}"/><svg width="1700" height="1100" style="position:absolute;left:0;top:0">${circles}</svg></div><div><table class="spec"><caption>NUMBERED PARTS</caption>${inset.parts.map((p) => `<tr><th>${p.n}</th><td>${esc(p.name)}</td></tr>`).join("")}</table><br>${titleBlock(`inset · ${inset.name}`, "perspective, from the real model")}</div></div></div>`;
    await sheetPage(page, `inset_sheet_${inset.id}`, html, 2356);
  }
}

try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on("console", (m) => (m.text().includes("GL Driver") ? undefined : console.log("page:", m.text())));
  page.on("pageerror", (e) => console.log("page error:", e.message));
  await page.setContent(`<!doctype html><html><body></body></html>`);
  await page.addScriptTag({ content: script });
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  for (const name of Object.keys(RAW)) {
    if (!want(name) && !(only && only.some((o) => o.startsWith("sheet")) )) continue;
    await renderRaw(page, name);
  }
  const sheetPageHandle = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await sheets(sheetPageHandle);
} finally {
  await browser.close();
}
