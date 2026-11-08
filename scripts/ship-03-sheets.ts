// The catalogue sheets of ISV Miyamoto, SPX-452, from the real model: `node scripts/ship-03-sheets.ts <folder>`. It builds the .glb files the ship's code makes (stowed, deployed, cutaway, exploded, each insets' sub-part, the engine
// cards), draws them with scripts/ship-03-render.ts, and lays the pictures out with the numbers from `specs.ts` as nine sheets: a three-quarter view with callouts, the general arrangement (front, side and top at one scale
// with a length ruler), the exploded assembly, the variants and the pods, the hull layers, the engine cards, the insets, and the specification with the decks and the legend. The title block is the one every sheet of the fleet has.
// One browser at a time (the caller holds the lock); server ports 7903 (pictures) and 7905 (sheets).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { toGlb } from "../src/build/glb.ts";
import { dockedNow } from "../src/model/fleet/dockedState.ts";
import { FLEET_PALETTE } from "../src/model/fleet/ship-03/adapter.ts";
import { parts, type MiyamotoPart } from "../src/model/fleet/ship-03/index.ts";
import { CARDS, SHIP_INSETS } from "../src/model/fleet/ship-03/insets.ts";
import { ANCESTORS, asBuilt, CLASS_TABLE, deckSummary, ENGINES, HULL, IDENTITY, labels, OPERATOR, specification, STATUS, TITLE_BLOCK } from "../src/model/fleet/ship-03/specs.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { MATERIALS } from "../src/model/materials.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";
import { acquireBrowserLock } from "@johnmorrisdotca/kazoku-ui/testing";

const out = resolve(process.argv[2] ?? "sheets");
const pics = join(out, "pictures");
const sheets = join(out, "sheets");
mkdirSync(pics, { recursive: true });
mkdirSync(sheets, { recursive: true });

type V3 = [number, number, number];
const all = parts();
const byId = new Map(all.map((part) => [part.id, part]));
const placeOf = (part: MiyamotoPart): V3 => (part.place ? [part.place.x, part.y0, part.place.z] : [0, part.y0, 0]);

/** A .glb of some parts of the ship, each at its place or at the place `at` gives it. */
function glb(name: string, ids: readonly string[], at: (part: MiyamotoPart, index: number) => V3 = placeOf): string {
  const list = ids.map((id) => byId.get(id) as MiyamotoPart);
  const file = join(pics, `${name}.glb`);
  writeFileSync(file, toGlb(list.map((part, i) => ({ name: part.id, mesh: meshOf(part.pieces()), at: at(part, i) }))).bytes);
  return file;
}
/** A .glb of loose pieces, with the box they fill. */
function loose(name: string, pieces: Piece[]): { file: string; min: V3; max: V3 } {
  const mesh = meshOf(pieces);
  const file = join(pics, `${name}.glb`);
  writeFileSync(file, toGlb([{ name, mesh, at: [0, 0, 0] }]).bytes);
  const b = boundsOf(mesh);
  return { file, min: b.min as V3, max: b.max as V3 };
}

const explodedAt = (part: MiyamotoPart, i: number): V3 => {
  const [x, y, z] = placeOf(part);
  if (!part.place) return [x, y + i * 18, z];
  if (part.id.includes("collar")) return [x, y + 9, z];
  if (part.id.startsWith("hangar")) return [x + Math.sign(x) * 34, y, z];
  if (part.id.startsWith("pod")) return [x, y + 40, z + 46];
  if (part.id.startsWith("array")) return [x + 56, y, z];
  return [x, y, z + (part.id.includes("ventral") ? -52 : 52)];
};

const slots = (variant: string) => Object.values(MIYAMOTO_VARIANT_SLOTS[variant]);
const files = {
  stowed: glb("stowed", slots("miyamoto")),
  deployed: glb("deployed", slots("miyamoto-deployed")),
  relief: glb("relief", slots("miyamoto-relief")),
  array: glb("array", slots("miyamoto-array")),
  cut: glb("cut", slots("miyamoto-cutaway")),
  exploded: glb("exploded", slots("miyamoto"), explodedAt),
  ariake: glb("ariake", slots("ariake")),
  pods: glb("pods", ["pod-relay", "pod-relief", "pod-survey"], (_, i) => [(i - 1) * 36, 0, 0]),
};
dockedNow.spec = "dragon@dragon-ventral,starship@starship-ventral";
const dockedView = glb("docked", ["fuel-fore"]);
dockedNow.spec = null;
/** A camera that frames a box from a direction, filling about 80% of the picture. */
function frameOf(min: V3, max: V3, dir: V3, fov = 35, aspect = 1.4): { eye: V3; target: V3 } {
  const c: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const r = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  const d = (r / Math.tan((fov * Math.PI) / 360) / Math.min(1, aspect)) * 1.25;
  const l = Math.hypot(...dir);
  return { eye: [c[0] + (dir[0] / l) * d, c[1] + (dir[1] / l) * d, c[2] + (dir[2] / l) * d], target: c };
}

// the pictures ------------------------------------------------------------------------------------------------------------------------------------------------
const PPM = 6;
const labelPoints = labels().map((label) => ({ id: label.id, at: label.at }));
const modulePoints = all.filter((part) => !part.id.endsWith("-cutaway") && !part.id.includes("deployed") && (!part.id.startsWith("pod-") || part.id === "pod-relay") && part.id !== "collar-none" && !part.id.includes("-ariake")).map((part, i) => ({ id: part.id, at: ((): V3 => { const [x, y, z] = explodedAt(part, i); return [x, y + part.height / 2, z + 6]; })() }));
/** Where each difference of the table shows in the class pair (Miyamoto at the origin, Ariake 172 m to starboard); the number is the row of the table. */
const pairPoints: { id: string; n: number; at: V3 }[] = [
  { id: "accent", n: 2, at: [172, 268, 13.6] },
  { id: "array", n: 3, at: [50.6, 276, -3.2] },
  { id: "hex", n: 3, at: [194, 20, 22.4] },
  { id: "nose", n: 4, at: [0, 379, 0] },
  { id: "box-a1", n: 5, at: [41, 154, 28.3] },
  { id: "box-m1", n: 5, at: [-41, 270, 28.3] },
  { id: "box-a2", n: 5, at: [213, 270, 28.3] },
  { id: "box-a3", n: 5, at: [131, 154, 28.3] },
  { id: "pod-m", n: 6, at: [0, 204, 36] },
  { id: "pod-a", n: 6, at: [172, 204, 36] },
  { id: "mast", n: 7, at: [172, 309, 40] },
  { id: "solarium", n: 7, at: [159, 322, 18.5] },
];
const shots = (name: string, size: [number, number], extra: Record<string, unknown>) => ({ name, size, ...extra });
const jobs: { glb: string; shots: Record<string, unknown>[]; more?: { glb: string; at: V3 }[] }[] = [
  { glb: files.stowed, shots: [
    shots("sheet1-tq", [2400, 1300], { fill: 0.8, eye: [290, -75, 190], target: [0, 195, 0], fov: 38, shadow: 300, points: labelPoints }),
    shots("ga-side", [380 * PPM + 120, 100 * PPM], { eye: [800, 190, -3], target: [0, 190, -3], up: [0, 0, 1], ortho: 100, shadow: 300 }),
    shots("ga-top", [380 * PPM + 120, 140 * PPM], { eye: [0, 190, 800], target: [0, 190, 0], up: [-1, 0, 0], ortho: 140, shadow: 300 }),
    shots("ga-front", [150 * PPM, 100 * PPM], { eye: [0, 900, -3], target: [0, 0, -3], up: [0, 0, 1], ortho: 100, shadow: 300 }),
    shots("ga-rear", [150 * PPM, 100 * PPM], { eye: [0, -500, -3], target: [0, 0, -3], up: [0, 0, 1], ortho: 100, shadow: 300 }),
    shots("var-stowed", [1300, 560], { fill: 0.8, eye: [560, 190, 120], target: [0, 190, -3], fov: 22, shadow: 300 }),
  ] },
  { glb: files.array, more: [{ glb: files.ariake, at: [172, 0, 0] }], shots: [
    shots("class-pair", [2400, 1100], { fill: 0.8, eye: [86, 190, 800], target: [86, 190, 0], up: [-1, 0, 0], fov: 24, shadow: 420 }),
    shots("class-pair-three-quarter", [2400, 1300], { fill: 0.8, eye: [376, -72, 250], target: [86, 200, 0], fov: 38, shadow: 420, points: pairPoints.map(({ id, at }) => ({ id, at })) }),
    shots("class-pair-rear", [2000, 1100], { fill: 0.8, eye: [86, -700, 0], target: [86, 0, 0], up: [0, 0, 1], fov: 22, shadow: 420 }),
  ] },
  { glb: files.array, more: [{ glb: files.ariake, at: [0, 0, -120] }], shots: [shots("class-pair-side", [2400, 1100], { fill: 0.8, eye: [900, 190, -60], target: [0, 190, -60], fov: 22, shadow: 420 })] },
  { glb: files.stowed, shots: [shots("var-nose", [1300, 560], { eye: [60, 420, 45], target: [0, 366, 0], fov: 40, shadow: 60 })] },
  { glb: files.array, shots: [shots("var-array", [1300, 560], { fill: 0.8, eye: [330, 40, 330], target: [40, 276, -2], fov: 30, shadow: 320 })] },
  { glb: files.exploded, shots: [shots("sheet3-exploded", [2400, 1300], { fill: 0.8, eye: [620, 210, 330], target: [0, 215, 20], fov: 40, shadow: 420, points: modulePoints })] },
  { glb: files.deployed, shots: [shots("var-deployed", [1300, 560], { fill: 0.8, eye: [420, 140, 220], target: [0, 215, 0], fov: 26, shadow: 420 })] },
  { glb: files.relief, shots: [shots("var-relief", [1300, 560], { fill: 0.8, eye: [560, 190, 120], target: [0, 190, -3], fov: 22, shadow: 300 })] },
  { glb: dockedView, shots: [shots("docked-ventral", [1600, 900], { fill: 0.9, eye: [24, 220, -70], target: [0, 240, -28], fov: 42, shadow: 40 })] },
  { glb: files.cut, shots: [
    shots("var-cut", [1300, 560], { fill: 0.8, eye: [560, 190, 120], target: [0, 190, -3], fov: 22, shadow: 300 }),
    shots("sheet5-edge", [1300, 800], { eye: [48, 322, 32], target: [8, 326, 16], fov: 45, shadow: 30 }),
    shots("sheet5-edge2", [1300, 800], { eye: [40, 110, 24], target: [-4, 126, 6], fov: 45, shadow: 30 }),
  ] },
  { glb: files.pods, shots: [shots("pods", [1800, 800], { eye: [0, 30, 150], target: [0, 30, 22], up: [0, 1, 0], fov: 42, shadow: 110 })] },
];

// the cards and the insets, each part alone, framed by its own box
const cardShots: { glb: string; shots: Record<string, unknown>[] }[] = [];
for (const card of Object.values(CARDS)) {
  const l = loose(card.id, card.pieces());
  const f = frameOf(l.min, l.max, [1, -0.5, 0.45], 36, 1.4);
  cardShots.push({ glb: l.file, shots: [shots(`card-${card.id}`, [1200, 860], { ...f, up: [0, 1, 0], fov: 36, shadow: Math.hypot(l.max[0] - l.min[0], l.max[1] - l.min[1]) })] });
}
for (const inset of Object.values(SHIP_INSETS))
  for (const one of inset.parts) {
    const l = loose(`${inset.id}-${one.n}`, one.pieces());
    const f = frameOf(l.min, l.max, [1, -0.6, 0.7], 34, 1.4);
    cardShots.push({ glb: l.file, shots: [shots(`inset-${inset.id}-${one.n}`, [640, 460], { ...f, up: [0, 1, 0], fov: 34, shadow: Math.hypot(l.max[0] - l.min[0], l.max[1] - l.min[1], l.max[2] - l.min[2]) })] });
  }
const jobsFile = join(out, "jobs.json");
writeFileSync(jobsFile, JSON.stringify([...jobs, ...cardShots]));
const run = spawnSync("node", ["scripts/ship-03-render.ts", jobsFile, join(out, "renders")], { stdio: "inherit" });
if (run.status !== 0) throw new Error("the pictures did not draw");

// the sheets ---------------------------------------------------------------------------------------------------------------------------------------------------
const img = (name: string) => `data:image/png;base64,${readFileSync(join(out, "renders", `${name}.png`)).toString("base64")}`;
const points = (name: string): { id: string; x: number; y: number; behind: boolean }[] => JSON.parse(readFileSync(join(out, "renders", `${name}.points.json`), "utf8"));
const esc = (text: string) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
const NAME = `ISV <ruby>宮本<rt>みやもと</rt></ruby> MIYAMOTO`;
const W = 2800;
const CSS = `
*{box-sizing:border-box} body{margin:0;background:#0a1018;color:#dbe6f2;font:20px/1.35 "Helvetica Neue",Arial,"Hiragino Sans",sans-serif}
.sheet{width:${W}px;position:relative;padding:36px 44px 40px}
.title{display:flex;justify-content:space-between;align-items:flex-end;border:2px solid #31465c;background:#0e1824;padding:16px 26px;margin-bottom:26px}
.title h1{margin:0;font-size:54px;letter-spacing:.06em;font-weight:600} .title rt{font-size:20px;letter-spacing:.2em}
.title .sub{font-size:24px;color:#f0b44c;letter-spacing:.08em;margin-top:4px} .title .meta{text-align:right;font-size:20px;color:#9fb4c8;line-height:1.5}
.title .status{color:#7fd6ff;font-size:24px;letter-spacing:.1em}
h2{font-size:26px;letter-spacing:.12em;color:#f0b44c;margin:0 0 10px;font-weight:600} .panel{border:1px solid #2a3c4f;background:#0d1620;padding:16px 20px}
table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #223446;padding:5px 10px;text-align:left;vertical-align:top;font-size:19px} th{color:#8fa6bd;font-weight:500;width:34%}
.leader{position:absolute;left:0;top:0;pointer-events:none} .label{position:absolute;font-size:17px;line-height:1.15;color:#e8f0f8;white-space:nowrap}
.label b{color:#f0b44c;font-weight:600;margin-right:6px}
.foot{margin-top:18px;display:flex;justify-content:space-between;color:#7f93a8;font-size:17px}
.sw{display:inline-block;width:26px;height:16px;margin-right:10px;vertical-align:-2px;border:1px solid #000}
.grid{display:grid;gap:18px}
`;
const titleBlock = (sheet: number, name: string, scale: string) => `<div class="title"><div><h1>${NAME}</h1><div class="sub">${esc(TITLE_BLOCK)}</div></div><div class="meta"><div class="status">${esc(STATUS)}</div><div>SHEET ${sheet} OF 9 · ${esc(name)}</div><div>${esc(scale)} · REVISION A · 2026-11-04 · ${OPERATOR} DRAWING OFFICE</div></div></div>`;
const foot = (note: string) => `<div class="foot"><div>${esc(IDENTITY.designation)} · ${esc(IDENTITY.prefix)} (${esc(IDENTITY.prefixMeans)}) · ${esc(IDENTITY.class)} class (${esc(IDENTITY.classKanji)}, ${esc(IDENTITY.classMeaning)}) · ${esc(IDENTITY.type)} (${esc(IDENTITY.typeMeans)}) · ${esc(IDENTITY.drive)}: ${esc(IDENTITY.driveMeans)} · ${esc(IDENTITY.computer)}</div><div>${esc(note)}</div></div>`;
const page = (sheet: number, name: string, scale: string, body: string, note = "Dimensions in metres, mass in tonnes. A design for reference; every date is a plan.") => `<!doctype html><meta charset="utf-8"><style>${CSS}</style><div class="sheet">${titleBlock(sheet, name, scale)}${body}${foot(note)}</div>`;

/** Callouts: leaders from the points to two columns of labels. */
function callouts(name: string, width: number, height: number, items: { id: string; text: string; n?: number }[], margin: number) {
  const pts = points(name).filter((p) => !p.behind && p.x > 0 && p.x < width && p.y > 0 && p.y < height);
  const named = pts.map((p) => ({ ...p, item: items.find((one) => one.id === p.id) })).filter((p) => p.item);
  const centre = width / 2;
  const left = named.filter((p) => p.x < centre).sort((a, b) => a.y - b.y);
  const right = named.filter((p) => p.x >= centre).sort((a, b) => a.y - b.y);
  const place = (column: typeof left, side: "l" | "r") => column.map((p, i) => ({ ...p, lx: side === "l" ? margin - 14 : margin + width + 14, ly: 20 + ((i + 0.5) * (height - 40)) / Math.max(1, column.length), side }));
  const placed = [...place(left, "l"), ...place(right, "r")];
  const lines = placed.map((p) => `<polyline points="${p.lx},${p.ly} ${p.side === "l" ? p.lx + 40 : p.lx - 40},${p.ly} ${margin + p.x},${p.y}" fill="none" stroke="#c9a24a" stroke-width="1.2" opacity=".85"/><circle cx="${margin + p.x}" cy="${p.y}" r="4" fill="#f0b44c"/>`).join("");
  const texts = placed.map((p) => `<div class="label" style="top:${p.ly - 10}px;${p.side === "l" ? `left:0;width:${margin - 20}px;text-align:right` : `left:${margin + width + 20}px`}">${p.item?.n ? `<b>${p.item.n}</b>` : ""}${esc(p.item?.text ?? "")}</div>`).join("");
  return { svg: `<svg class="leader" width="${margin * 2 + width}" height="${height}">${lines}</svg>`, texts, count: placed.length };
}

await acquireBrowserLock();
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const tab = await browser.newPage({ viewport: { width: W, height: 1800 } });
async function shoot(file: string, html: string) {
  await tab.setContent(html, { waitUntil: "load" });
  await tab.waitForTimeout(150);
  await tab.screenshot({ path: join(sheets, file), fullPage: true });
  console.log("sheet", file);
}
try {
  // 1: the three-quarter view with callouts
  const decks = new Map(deckSummary().map((d) => [d.id, d.number]));
  const lab = labels().map((l) => ({ id: l.id, text: l.text, n: decks.get(l.id.split("/")[1]) }));
  const c1 = callouts("sheet1-tq", 2400, 1300, lab, 200);
  await shoot("1-exterior-three-quarter.png", page(1, "EXTERIOR, THREE-QUARTER VIEW, WITH CALLOUTS", "PERSPECTIVE · NOT TO SCALE", `<div style="position:relative;width:${W - 88}px;height:1300px"><img src="${img("sheet1-tq")}" style="position:absolute;left:200px;top:0;width:2400px"/>${c1.svg}${c1.texts}</div><div style="margin-top:22px;color:#9fb4c8">${c1.count} callouts; the numbered ones are decks, bow to tail.</div>`));

  // 2: general arrangement at one scale
  const ruler = (len: number, label: string) => `<svg width="${len * PPM + 120}" height="46"><g stroke="#c9a24a" fill="#c9a24a" font-size="15">${Array.from({ length: Math.floor(len / 20) + 1 }, (_, i) => `<line x1="${60 + i * 20 * PPM}" y1="6" x2="${60 + i * 20 * PPM}" y2="${i % 5 === 0 ? 28 : 18}"/><text x="${60 + i * 20 * PPM}" y="42" text-anchor="middle" stroke="none">${i * 20}</text>`).join("")}<line x1="60" y1="6" x2="${60 + len * PPM}" y2="6"/></g><text x="${60 + (len * PPM) / 2}" y="26" fill="#f0b44c" font-size="20" text-anchor="middle">${label}</text></svg>`;
  await shoot("2-general-arrangement.png", page(2, "GENERAL ARRANGEMENT: SIDE, TOP, FRONT AND REAR AT ONE SCALE", `1 : ${Math.round(1000 / PPM)} · ${PPM} PX PER METRE`, `<div class="grid"><div><h2>SIDE (STARBOARD ELEVATION, BOW TO THE RIGHT)</h2><div class="panel" style="padding:0"><img src="${img("ga-side")}"/></div>${ruler(380, "380 m")}</div><div><h2>TOP (PORT UP, BOW TO THE RIGHT)</h2><div class="panel" style="padding:0"><img src="${img("ga-top")}"/></div>${ruler(380, "380 m · BEAM 118 m")}</div><div style="display:flex;gap:24px"><div><h2>FRONT (LOOKING AT THE BOW)</h2><div class="panel" style="padding:0"><img src="${img("ga-front")}"/></div></div><div><h2>REAR (LOOKING AT THE DRIVE)</h2><div class="panel" style="padding:0"><img src="${img("ga-rear")}"/></div></div><div class="panel" style="flex:1"><h2>OVERALL</h2><table>${specification().slice(2, 6).map((l) => `<tr><th>${esc(l.name)}</th><td>${esc(l.value)}${l.note ? `<br><small style="color:#8fa6bd">${esc(l.note)}</small>` : ""}</td></tr>`).join("")}</table></div></div></div>`));

  // 3: the exploded assembly
  const mods = all.filter((part) => !part.id.endsWith("-cutaway") && !part.id.includes("deployed") && (!part.id.startsWith("pod-") || part.id === "pod-relay") && part.id !== "collar-none" && !part.id.includes("-ariake"));
  const c3 = callouts("sheet3-exploded", 2400, 1300, mods.map((m) => ({ id: m.id, text: m.name })), 200);
  await shoot("3-exploded-assembly.png", page(3, "EXPLODED ASSEMBLY", "PERSPECTIVE · NOT TO SCALE", `<div style="position:relative;width:${W - 88}px;height:1300px"><img src="${img("sheet3-exploded")}" style="position:absolute;left:200px;top:0;width:2400px"/>${c3.svg}${c3.texts}</div><div class="panel" style="margin-top:22px"><h2>MOUNTING</h2>Every stacked module meets the next at a class L spine collar (12 m, 24 bolts, 12 latch dogs); the two hangar shoulders hang from braces to the spine; the mission pod stands on the keyed dorsal collar, whose isolator has its own pressure and power locks; each radiator bank sits on rails along the habitation hull.</div>`));

  // the two ships side by side: what each is as built
  const sisterTable = ((): string => {
    const m = asBuilt("miyamoto");
    const a = asBuilt("ariake");
    const lines = { miyamoto: Object.fromEntries(specification("miyamoto").map((l) => [l.name, l.value])), ariake: Object.fromEntries(specification("ariake").map((l) => [l.name, l.value])) };
    const row = (name: string) => `<tr><th>${esc(name)}</th><td>${esc(lines.miyamoto[name])}</td><td>${esc(lines.ariake[name])}</td></tr>`;
    return `<table><tr><th></th><td><b>ISV MIYAMOTO, SPX-452</b></td><td><b>ISV ARIAKE, SPX-186</b></td></tr><tr><th>Hangar boxes</th><td>${m.hangars} (staggered pair)</td><td>${a.hangars} (all four positions)</td></tr>${["Beam", "Cargo", "Dry mass", "Full mass", "Acceleration", "Range"].map(row).join("")}<tr><th>Engine end</th><td>white and gold shrouds and collar</td><td>near-black hexagonal tile shrouds and collar</td></tr></table>`;
  })();
  // 4: variants and pods
  const cell = (title: string, name: string, note: string) => `<div class="panel"><h2>${esc(title)}</h2><img src="${img(name)}" style="width:100%"/><div style="color:#9fb4c8;margin-top:6px">${esc(note)}</div></div>`;
  await shoot("4-variants-and-pods.png", page(4, "VARIANTS AND MISSION PODS", "PERSPECTIVE · NOT TO SCALE", `<div class="grid" style="grid-template-columns:1fr 1fr">${cell("STOWED, RELAY POD", "var-stowed", "Radiators folded on the habitation hull; the relay pod on the collar.")}${cell("RADIATORS OUT", "var-deployed", "Two banks of four leaves, 25 by 60 m, on masts, clear of the bays and the exhaust.")}${cell("SOLAR ARRAY OUT", "var-array", "Ten bays of gold cell blankets on lattice masts along the starboard side, the wing turned to face the star. For time near a star; fusion is the main power (about 2.1 MW(e) at one astronomical unit).")}${cell("ROUNDED NOSE", "var-nose", "Three round shield layers under a dome, every round surface in gold solar cells, an orange removable rim round each layer.")}${cell("RELIEF POD", "var-relief", "Six relief and equipment containers under a gantry replace the relay pod.")}${cell("CUTAWAY, STARBOARD", "var-cut", "Stepped armour layers at the cut, the rooms inside.")}</div><div class="panel" style="margin-top:18px"><h2>THE ROMURUSU CLASS: ISV MIYAMOTO, SPX-452 (ABOVE, SOLAR ARRAY OUT) AND ITS SISTER ISV <ruby>有明<rt>ありあけ</rt></ruby> ARIAKE, SPX-186 (BELOW)</h2><img src="${img("class-pair")}" style="width:100%"/><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:12px"><img src="${img("class-pair-three-quarter")}" style="width:100%"/><img src="${img("class-pair-rear")}" style="width:100%"/></div>${sisterTable}<div style="color:#9fb4c8">One model, two ships: each its own name, registry and hull marks. Ariake wears the dawn-gold livery (a band and two pinstripes) over near-black hexagonal tiles on her drive shrouds and collar, carries the survey pod by default, has four hangar boxes in place of Miyamoto's staggered two (double the cargo), and after her refit has a sensor mast and a solarium on each side of the dome.</div></div><div class="panel" style="margin-top:18px"><h2>THE SWAPPABLE POD: RELAY (LEFT), RELIEF (MIDDLE) AND SURVEY (RIGHT) ON ONE COLLAR</h2><img src="${img("pods")}" style="width:100%"/><div style="color:#9fb4c8">${esc(ANCESTORS.pod)}.</div></div><div class="panel" style="margin-top:18px"><h2>DOCKED CRAFT: A STARSHIP AND A DRAGON ON THE VENTRAL COLLARS</h2><img src="${img("docked-ventral")}" style="width:100%"/><div style="color:#9fb4c8">The two visiting collars ahead of the keel. Each craft's nose meets the ring and the craft hangs below the ship. The collars between modules are joints, not berths.</div></div>`));

  // 5: hull layers
  const total = HULL.layers.reduce((s, l) => s + l.mm, 0);
  const stack = HULL.layers.map((l, i) => { const h = Math.max(26, (l.mm / total) * 560); return `<div style="height:${h}px;display:flex;align-items:center;border-bottom:1px solid #000;background:${MATERIALS[l.material].color};color:#000;padding:0 14px;font-size:19px"><b style="width:36px">${i + 1}</b>${esc(l.name)} · ${l.mm} mm<span style="margin-left:auto;font-size:16px">${esc(l.made)}</span></div>`; }).join("");
  await shoot("5-hull-layers.png", page(5, "HULL LAYERS: ARMOUR", "SECTION · NOT TO SCALE", `<div class="grid" style="grid-template-columns:1fr 1fr"><div class="panel"><h2>THE STACK, OUTSIDE TO INSIDE (${total} mm)</h2>${stack}<div style="margin-top:10px;color:#9fb4c8">${esc(HULL.why)}</div></div><div class="panel"><h2>THE TABLE</h2><table>${HULL.layers.map((l, i) => `<tr><th>${i + 1}. ${esc(l.name)}</th><td>${l.mm} mm, ${esc(l.made)}. ${esc(l.note)}</td></tr>`).join("")}</table></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="panel"><h2>THE CUT EDGE OF THE CITADEL</h2><img src="${img("sheet5-edge")}" style="width:100%"/></div><div class="panel"><h2>THE CUT EDGE OF THE SPINE'S TRUSS AND A BARREL</h2><img src="${img("sheet5-edge2")}" style="width:100%"/></div></div>`));

  // 6: engine cards
  const engineRow = (id: string, title: string, image: string) => { const e = ENGINES[id]; return `<div class="panel"><h2>${esc(title)}</h2><div style="display:flex;gap:24px"><img src="${img(image)}" style="width:55%"/><table style="width:45%"><tr><th>Count</th><td>${e.count}</td></tr><tr><th>Thrust, each</th><td>${(e.thrust / 1e6).toFixed(2)} MN</td></tr><tr><th>Exhaust</th><td>${e.exhaustOfC >= 0.01 ? `${e.exhaustOfC.toFixed(2)} c` : `${Math.round(e.isp).toLocaleString("en-US")} s specific impulse`}</td></tr><tr><th>Mass flow</th><td>${e.massFlow.toFixed(3)} kg/s</td></tr><tr><th>Fuel</th><td>${esc(e.fuel)}</td></tr><tr><th>Capacity</th><td>${e.fuelCapacity.toLocaleString("en-US")} t</td></tr><tr><th>Operation</th><td>${esc(e.operation)}</td></tr><tr><th>Role</th><td>${esc(e.role)}</td></tr></table></div><div style="color:#9fb4c8">${esc(e.note)}</div></div>`; };
  await shoot("6-engine-cards.png", page(6, "PROPULSION CARDS", "NOT TO SCALE", `<div class="grid">${engineRow("miyamoto-main", "MAIN DRIVE: DCD, DIRECTED CONVERSION DRIVE", "card-card-main")}${engineRow("miyamoto-vernier", "PLASMA VERNIER (MANOEUVRING)", "card-card-vernier")}<div class="panel"><h2>ATTITUDE THRUSTER BLOCKS</h2>${esc(ENGINES["miyamoto-attitude"].count.toString())} blocks at ${(ENGINES["miyamoto-attitude"].thrust / 1e3).toFixed(0)} kN, ${esc(ENGINES["miyamoto-attitude"].fuel)}, ${esc(ENGINES["miyamoto-attitude"].operation)}. ${esc(ENGINES["miyamoto-attitude"].note)}</div></div>`));

  // 7: insets
  const inset = (id: string) => { const i = SHIP_INSETS[id]; return `<div class="panel"><h2>${esc(i.name.toUpperCase())}</h2><div style="color:#9fb4c8;margin-bottom:8px">${esc(i.note)}</div><div class="grid" style="grid-template-columns:repeat(6,1fr)">${i.parts.map((p) => `<div><img src="${img(`inset-${id}-${p.n}`)}" style="width:100%;border:1px solid #223446"/><div style="font-size:17px"><b style="color:#f0b44c">${p.n}</b> ${esc(p.name)}</div><div style="font-size:14px;color:#8fa6bd">${esc(p.does)}</div></div>`).join("")}</div></div>`; };
  await shoot("7-system-insets.png", page(7, "SYSTEM INSETS", "NOT TO SCALE", `<div class="grid">${Object.keys(SHIP_INSETS).map(inset).join("")}<div class="panel"><h2>THE FLEET'S FOUR</h2>The reactor core, the navigation and sensor suite, life support and the docking port are shared by every ship of the fleet; their six numbered parts are on the fleet sheets.</div></div>`));

  // 8: specification, decks, legend
  const legend = [["shield", "Removable shield or shutter"], ["protected", "Protected volume (white blanket)"], ["structure", "Structure and plating"], ["coolant", "Coolant and feed line"], ["coil", "Copper field coil, gold foil"], ["service", "Service access, rail"], ["heatSink", "Heat sink, blast door"], ["farm", "Farm"], ["propellant", "Propellant, water"], ["light", "Light, window"]] as const;
  await shoot("8-specification-decks-legend.png", page(8, "SPECIFICATION, DECKS AND LEGEND", "—", `<div class="grid" style="grid-template-columns:1.1fr 1fr"><div class="panel"><h2>SPECIFICATION</h2><table>${specification().map((l) => `<tr><th>${esc(l.name)}</th><td>${esc(l.value)}${l.note ? `<br><small style="color:#8fa6bd">${esc(l.note)}</small>` : ""}</td></tr>`).join("")}</table><h2 style="margin-top:14px">THE SISTER SHIP, AS BUILT</h2>${sisterTable}</div><div><div class="panel"><h2>DECKS, BOW TO TAIL</h2><table>${deckSummary().map((d) => `<tr><th style="width:60px">${d.number}</th><td>${esc(d.name)} <small style="color:#8fa6bd">${esc(d.module)}, ${d.from}–${d.to} m</small></td></tr>`).join("")}</table></div><div class="panel" style="margin-top:18px"><h2>LEGEND</h2>${legend.map(([k, t]) => `<div><span class="sw" style="background:${FLEET_PALETTE[k]}"></span>${t}</div>`).join("")}<div style="margin-top:8px;color:#9fb4c8">— leader to part · <b style="color:#f0b44c">n</b> numbered deck or sub-part</div></div></div></div><div class="panel" style="margin-top:18px"><h2>REAL ANCESTORS</h2><table>${Object.entries(ANCESTORS).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div>`));
  // 9: the class sheet: both ships side by side, a numbered callout at each difference of the table
  const marks = points("class-pair-three-quarter").filter((p) => !p.behind && p.x > 0 && p.x < 2400 && p.y > 0 && p.y < 1300).map((p) => ({ ...p, n: pairPoints.find((one) => one.id === p.id)?.n })).filter((p) => p.n);
  const dots = marks.map((p) => `<div style="position:absolute;left:${p.x - 15}px;top:${p.y - 15}px;width:30px;height:30px;border-radius:15px;background:#f0b44c;color:#071018;border:2px solid #fff;font:700 17px/26px system-ui,sans-serif;text-align:center">${p.n}</div>`).join("");
  const rows = CLASS_TABLE.map((r, i) => `<tr><th><span style="display:inline-block;min-width:24px;margin-right:8px;text-align:center;border-radius:12px;background:${marks.some((m) => m.n === i + 1) ? "#f0b44c" : "#33485c"};color:#071018;font-weight:700">${i + 1}</span>${esc(r.row)}</th><td>${esc(r.miyamoto)}</td><td>${esc(r.ariake)}</td></tr>`).join("");
  await shoot("9-romurusu-class.png", page(9, "THE ROMURUSU CLASS: MIYAMOTO AND ARIAKE", "PERSPECTIVE · NOT TO SCALE", `<div class="panel"><h2>ISV <ruby>宮本<rt>みやもと</rt></ruby> MIYAMOTO, SPX-452 (BEHIND, SOLAR ARRAY OUT) AND ISV <ruby>有明<rt>ありあけ</rt></ruby> ARIAKE, SPX-186 (IN FRONT): THE NUMBERS ARE THE ROWS OF THE TABLE</h2><div style="position:relative;width:${W - 88}px"><img src="${img("class-pair-three-quarter")}" style="width:100%;display:block"/><div style="position:absolute;inset:0;transform-origin:0 0;transform:scale(${(W - 88) / 2400})">${dots}</div></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="panel"><h2>FROM ABOVE</h2><img src="${img("class-pair")}" style="width:100%"/></div><div class="panel"><h2>FROM THE SIDE (ARIAKE BELOW)</h2><img src="${img("class-pair-side")}" style="width:100%"/></div></div><div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px"><div class="panel"><h2>FROM ASTERN: THE ENGINE ENDS</h2><img src="${img("class-pair-rear")}" style="width:100%"/></div><div class="panel"><h2>MIYAMOTO'S ROUNDED NOSE, IN SOLAR CELLS</h2><img src="${img("var-nose")}" style="width:100%"/></div></div><div class="panel" style="margin-top:18px"><h2>HOW THEY DIFFER</h2><table><tr><th></th><td><b>ISV MIYAMOTO, SPX-452</b></td><td><b>ISV ARIAKE, SPX-186</b></td></tr>${rows}</table></div>`));
} finally {
  await browser.close();
}
