// Renders and review sheets of the small craft (ATC, MODULES-418) from the real model, in one headless browser drawing in software (SwiftShader), never on the graphics card. One browser at a time; no port is opened.
//
//   node scripts/craft-render.ts <folder> [name,name,...]
//
// It does not take the browser lock itself: run it under the one that serves the Mac's browsers in turn.
//
// For each craft: side, top, front, rear and three-quarter views, the cutaway where it has one, a 10 m close-up, a frame beside Starship Block 3, its propulsion card and its hull layers; for the family, one frame at true scale
// and, when the docking scene exists, the scene. A sheet for each craft puts its labelled sections, a spec table and its cards round them. The page is scripts/fleet-view.page.ts, which draws any registry part.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { build } from "esbuild";
import { chromium, type Page } from "@playwright/test";
import { ATC_SLOT, extraSlot } from "../src/data/atc.ts";
import { CRAFT_STACKS, gapOf, placeOf, PROPULSION, SECTIONS, STACK_OF } from "../src/model/fleet/craft/cards.ts";
import { ATC, ATC_NAMES, BUILT, specRows, type AtcId } from "../src/model/fleet/craft/index.ts";
import { ENGINE_CARD, LAYER_SCALE } from "../src/model/fleet/craft/extras.ts";
import { SHIPS, TRIPS, tripAt } from "../src/model/fleet/scene.ts";
import { kaminariBoxes, miyamotoBoxes, sceneTop } from "../src/model/fleet/sceneBounds.ts";
import { check } from "../src/index.ts";
import { variantOf } from "../src/rockets.ts";
import { doorOfShip } from "../src/model/fleet/scene.ts";
import type { Spec } from "./fleet-view.page.ts";

const out = process.argv[2] ?? "renders";
const only = process.argv[3]?.split(",");
mkdirSync(out, { recursive: true });
const want = (name: string) => !only || only.some((o) => name.startsWith(o));

type V3 = [number, number, number];
const Z: V3 = [0, 0, 1];
const part = (id: AtcId, which?: "inside" | "engine" | "layers") => `fleet-atc-${id}-${which ? extraSlot(id, which) : ATC_SLOT[id]}`;
const size = (id: AtcId) => {
  const c = ATC[id];
  if (!c) throw new Error(`no craft ${id}`);
  const wide = Math.max(c.envelope.across, c.envelope.deep);
  return { long: c.envelope.long, wide, deep: c.envelope.deep, gap: gapOf(wide), crewed: c.crewed, where: placeOf(wide, c.crewed) };
};

const RAW: Record<string, Spec> = {};
const marks: Record<string, { id: string; at: V3; slot?: string }[]> = {};
for (const id of BUILT) {
  const s = size(id);
  const centre: V3 = [0, s.long / 2, s.deep * 0.25];
  const half = Math.max(s.long * 0.34, s.deep * 0.8);
  const base = { w: 2000, h: 1000, shadow: Math.max(s.long, 8) * 1.2 };
  const sections = SECTIONS[id].filter((x) => !x.inside).map((x) => ({ id: x.id, at: [...x.at] as V3 }));
  marks[id] = sections;
  const withInside = s.crewed ? [{ id: part(id, "inside"), at: [s.where.inside, 0, 0] as V3 }] : [];
  RAW[`${id}_side`] = { ...base, camera: "ortho", target: centre, from: [1, 0, 0], up: Z, half, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], marks: sections, light: [0.35, -0.25, 0.9] };
  RAW[`${id}_top`] = { ...base, camera: "ortho", target: centre, from: [0, 0, 1], up: [-1, 0, 0], half, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], light: [0.25, -0.25, 1] };
  RAW[`${id}_front`] = { w: 1000, h: 1000, shadow: base.shadow, camera: "ortho", target: [0, s.long / 2, s.deep * 0.25], from: [0, 1, 0], up: Z, half: Math.max(s.wide, s.deep) * 0.7, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], light: [0.5, 0.35, 0.8] };
  RAW[`${id}_rear`] = { w: 1000, h: 1000, shadow: base.shadow, camera: "ortho", target: [0, s.long / 2, s.deep * 0.25], from: [0, -1, 0], up: Z, half: Math.max(s.wide, s.deep) * 0.7, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], light: [0.5, -0.35, 0.8] };
  RAW[`${id}_three_quarter`] = { ...base, camera: "persp", target: centre, from: [0.9, -0.75, 0.55], up: Z, fov: 28, dist: Math.max(s.long, s.wide) * 2.3, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }, ...withInside], light: [0.7, -0.1, 0.8] };
  if (s.crewed) RAW[`${id}_cutaway`] = { ...base, camera: "persp", target: [s.where.inside, s.long / 2, 0], from: [0.1, -0.9, 0.35], up: Z, fov: 30, dist: Math.max(s.long, s.wide) * 1.7, slots: [], extra: [{ id: part(id, "inside"), at: [s.where.inside, 0, 0] }], marks: SECTIONS[id].filter((x) => x.inside).map((x) => ({ id: x.id, at: [x.at[0] + s.where.inside, x.at[1], x.at[2]] as V3 })), light: [0.3, -0.2, 1] };
  // the 10 m close-up: the camera 10 m from a detail with real depth, the nearest hardware of the craft's most worked section
  const detail = SECTIONS[id].find((x) => !x.inside && x.id !== "collar") ?? SECTIONS[id][0];
  RAW[`${id}_close_10m`] = { w: 1800, h: 1200, camera: "persp", target: [...detail.at] as V3, from: [0.8, -0.5, 0.45], up: Z, fov: 36, dist: Math.min(10, Math.max(s.long, 4)), slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], shadow: 14, light: [0.6, -0.3, 0.8] };
  // beside Starship Block 3, standing, at the same distance: the craft lies on the same ground, nose to the bow
  RAW[`${id}_beside_starship`] = { w: 2000, h: 1200, camera: "persp", target: [0, 40, 30], from: [1, -0.05, 0.05], up: Z, fov: 36, dist: 230, slots: [], extra: [{ id: part(id), at: [0, 0, 0] }], starship: [0, 70, 0], shadow: 140, light: [0.5, -0.3, 0.8] };
  RAW[`${id}_engine`] = { w: 1500, h: 1200, camera: "persp", target: [0, ENGINE_CARD.height / 2, 0], from: [0.5, -0.9, 0.3], up: Z, fov: 30, dist: ENGINE_CARD.height * 2.6, slots: [], extra: [{ id: part(id, "engine"), at: [0, 0, 0] }], shadow: 8, light: [0.5, -0.3, 0.8] };
  RAW[`${id}_layers`] = { w: 1500, h: 1200, camera: "persp", target: [4 * Math.sin(0.5) * 0.9, 0.8, 4 * Math.cos(0.5) * 0.9], from: [0.8, 0.1, 1], up: [0, 1, 0], fov: 30, dist: 6, slots: [], extra: [{ id: part(id, "layers"), at: [0, 0, 0] }], shadow: 8, light: [0.5, 0.3, 0.8] };
}
// the family at true scale: the six craft in a row on one ground, Starship Block 3 standing at the end
const row = BUILT.map((id, i) => ({ id, x: -52 + i * 22 }));
RAW.family = { w: 2800, h: 1200, camera: "persp", target: [10, 10, 12], from: [0.45, -1, 0.3], up: Z, fov: 30, dist: 170, slots: [], extra: row.map((r) => ({ id: part(r.id), at: [r.x, 0, 0] as V3 })), starship: [72, 10, 0], shadow: 140, light: [0.4, -0.5, 0.8] };
// the docking scene: Kaminari's first design with a Miyamoto each side of its dock and the six craft in flight, at one moment of the scene
{
  const boxes = [...kaminariBoxes(), ...miyamotoBoxes()];
  const doors = SHIPS.map(doorOfShip);
  const top = sceneTop(boxes, { x: [Math.min(...boxes.map((b) => b.min[0])), Math.max(...boxes.map((b) => b.max[0]))], y: [Math.min(...doors.map((d) => d.y[0])), Math.max(...doors.map((d) => d.y[1]))] });
  const miyamoto = check({ rocket: "fleet-ship-03", variant: "miyamoto" }).parts;
  const places = variantOf("fleet-ship-03", "miyamoto")?.inspector?.places ?? {};
  const ships = SHIPS.flatMap((ship) => miyamoto.filter((p) => places[p.slot]).map((p) => ({ id: p.part.id, at: [ship.at[0] + places[p.slot][0], ship.at[1] + places[p.slot][1], ship.at[2] + places[p.slot][2]] as V3 })));
  const t = Number(process.env.SCENE_T ?? 20);
  const craft = TRIPS.map((trip) => {
    const now = tripAt(trip, top, t);
    return { id: part(trip.craft), at: now.at, along: now.heading };
  });
  RAW.docking_scene = { w: 3000, h: 1400, camera: "persp", target: [0, 1411, 60], from: [0.15, -0.85, 0.45], up: Z, fov: 30, dist: 1300, extra: [...ships, ...craft], shadow: 900, light: [0.5, -0.4, 0.8] };
}

const bundle = await build({ entryPoints: ["scripts/fleet-view.page.ts"], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "error" });
const script = bundle.outputFiles[0].text;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const projected: Record<string, { id: string; x: number; y: number }[]> = {};

async function renderRaw(page: Page, name: string): Promise<void> {
  const spec = RAW[name];
  const t = Date.now();
  const result = await page.evaluate((s) => (window as unknown as { shoot: (s: unknown) => { dataUrl: string; triangles: number; marks: { id: string; x: number; y: number }[] } }).shoot(s), spec as unknown as Record<string, unknown>);
  writeFileSync(join(out, `${name}.png`), Buffer.from(result.dataUrl.split(",")[1], "base64"));
  projected[name] = result.marks;
  console.log(name, `${spec.w}x${spec.h}`, `${result.triangles} triangles`, `${Math.round((Date.now() - t) / 100) / 10}s`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const img = (name: string) => `data:image/png;base64,${readFileSync(join(out, `${name}.png`)).toString("base64")}`;
const CSS = `body{margin:0;background:#0b111b;color:#d5dde8;font-family:"SF Mono",Menlo,monospace;font-size:15px}.sheet{padding:28px;background:#0b111b;width:2400px}h1{margin:0 0 10px;font-size:28px;letter-spacing:.08em;font-weight:600}h2{margin:14px 0 4px;font-size:16px;letter-spacing:.1em;color:#f2c14e}.row{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}img{display:block;border:1px solid #243247}table{border-collapse:collapse}td,th{border:1px solid #243247;padding:4px 9px;text-align:left;vertical-align:top}th{color:#9fb2c8;font-weight:500;white-space:nowrap}`;

async function sheet(page: Page, id: AtcId): Promise<void> {
  const circle = (m: { id: string; x: number; y: number }, n: number) => `<circle cx="${m.x}" cy="${m.y}" r="15" fill="#f2c14e" stroke="#0b111b" stroke-width="2"/><text x="${m.x}" y="${m.y + 5}" font-size="16" font-weight="700" text-anchor="middle" fill="#0b111b">${n}</text>`;
  const outside = SECTIONS[id].filter((x) => !x.inside);
  const side = projected[`${id}_side`] ?? [];
  const labels = outside.map((s, i) => (side.find((m) => m.id === s.id) ? circle(side.find((m) => m.id === s.id)!, i + 1) : "")).join("");
  const stack = CRAFT_STACKS[STACK_OF[id]];
  const card = PROPULSION[id];
  const html = `<style>${CSS}</style><div class="sheet"><h1>${esc(ATC_NAMES[id].name.toUpperCase())} · SPX FLEET DRAWING OFFICE</h1>
<div class="row"><div style="position:relative"><img src="${img(`${id}_side`)}" width="1600"/><svg width="1600" height="800" viewBox="0 0 2000 1000" style="position:absolute;left:0;top:0">${labels}</svg></div>
<table><caption>SECTIONS</caption>${outside.map((s, i) => `<tr><th>${i + 1}</th><td>${esc(s.name)}</td><td>${esc(s.job)}</td></tr>`).join("")}${SECTIONS[id].filter((x) => x.inside).map((s) => `<tr><th>in</th><td>${esc(s.name)}</td><td>${esc(s.job)}</td></tr>`).join("")}</table></div>
<div class="row"><div><h2>TOP</h2><img src="${img(`${id}_top`)}" width="1000"/></div><div><h2>FRONT</h2><img src="${img(`${id}_front`)}" width="500"/></div><div><h2>REAR</h2><img src="${img(`${id}_rear`)}" width="500"/></div></div>
<div class="row"><div><h2>THREE-QUARTER</h2><img src="${img(`${id}_three_quarter`)}" width="1000"/></div>${ATC[id]?.crewed ? `<div><h2>CUTAWAY</h2><img src="${img(`${id}_cutaway`)}" width="1000"/></div>` : ""}</div>
<div class="row"><div><h2>10 M CLOSE-UP</h2><img src="${img(`${id}_close_10m`)}" width="900"/></div><div><h2>BESIDE STARSHIP BLOCK 3</h2><img src="${img(`${id}_beside_starship`)}" width="900"/></div></div>
<div class="row"><div><h2>PROPULSION CARD: ${esc(card.name.toUpperCase())}</h2><img src="${img(`${id}_engine`)}" width="700"/><table>${card.parts.map((p) => `<tr><th>${p.n}</th><td>${esc(p.name)}</td><td>${esc(p.job)}</td></tr>`).join("")}<tr><th></th><td>Thrust, specific impulse</td><td>Not given: a design of this package, with no source</td></tr></table></div>
<div><h2>HULL LAYERS: ${esc(stack.role.toUpperCase())}, SHOWN AT ${LAYER_SCALE} TIMES THEIR THICKNESS</h2><img src="${img(`${id}_layers`)}" width="700"/><table>${stack.layers.map((l) => `<tr><th>${l.n}</th><td>${esc(l.name)}</td><td>${l.mm} mm</td><td>${esc(l.note)}</td></tr>`).join("")}</table></div>
<div><h2>SPECIFICATION</h2><table>${specRows(id).map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</table></div></div></div>`;
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
  await page.setViewportSize({ width: 2456, height: 1000 });
  await page.screenshot({ path: join(out, `sheet_${id}.png`), fullPage: true });
  console.log(`sheet_${id}`);
}

try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on("console", (m) => (m.text().includes("GL Driver") ? undefined : console.log("page:", m.text())));
  page.on("pageerror", (e) => console.log("page error:", e.message));
  await page.setContent(`<!doctype html><html><body></body></html>`);
  await page.addScriptTag({ content: script });
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  for (const name of Object.keys(RAW)) if (want(name) || want(name.split("_")[0])) await renderRaw(page, name);
  const sheetPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  for (const id of BUILT) if (want(`sheet_${id}`) || (only && want(id))) if (projected[`${id}_side`]) await sheet(sheetPage, id);
} finally {
  await browser.close();
}
