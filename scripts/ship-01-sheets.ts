// The catalogue sheets of ISV Hanabusa, SPX-013, from the real model: `node scripts/ship-01-sheets.ts <folder>`. It builds the .glb files the ship's code makes (together, both ring orders, the section view, exploded, each inset's sub-part, the thruster cards),
// draws them with scripts/ship-01-render.ts, and lays the pictures out with the numbers from `specs.ts` as eight sheets: a three-quarter view with callouts, the general arrangement (side, top, front and rear at one scale with a length ruler), the
// exploded assembly, the variants, the hull layers, the thruster cards, the insets, and the specification with the decks and the legend. One browser at a time (the caller holds the lock); server ports 7915 (pictures) and 7916 (sheets).
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import { toGlb } from "../src/build/glb.ts";
import { FLEET_PALETTE } from "../src/model/fleet/ship-01/adapter.ts";
import { parts, type HanabusaPart } from "../src/model/fleet/ship-01/index.ts";
import { CARDS, SHIP_INSETS } from "../src/model/fleet/ship-01/insets.ts";
import { ENGINES, ENVELOPE, HULL, IDENTITY, labels, deckSummary, OPERATOR, specification, STATUS, TITLE_BLOCK, ANCESTORS } from "../src/model/fleet/ship-01/specs.ts";
import { HANABUSA_VARIANT_SLOTS } from "../src/model/fleet/ship-01/variants.ts";
import { MATERIALS } from "../src/model/materials.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const out = resolve(process.argv[2] ?? "sheets");
const pics = join(out, "pictures");
const sheets = join(out, "sheets");
mkdirSync(pics, { recursive: true });
mkdirSync(sheets, { recursive: true });

type V3 = [number, number, number];
const all = parts();
const byId = new Map(all.map((part) => [part.id, part]));
const placeOf = (part: HanabusaPart): V3 => (part.place ? [part.place.x, part.y0, part.place.z] : [0, part.y0, 0]);

/** A .glb of some parts of the ship, each at its place or at the place `at` gives it. */
function glb(name: string, ids: readonly string[], at: (part: HanabusaPart, index: number) => V3 = placeOf): string {
  const list = ids.map((id) => byId.get(id) as HanabusaPart);
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

// the exploded view: every module of the spine pulled apart along the keel, the booms out to the sides, the hubs up, the rings out of the plane
const explodedAt = (part: HanabusaPart, i: number): V3 => {
  const [x, y, z] = placeOf(part);
  if (!part.place) return [x, y + i * 7, z];
  if (part.id.startsWith("boom")) return [x + Math.sign(x) * 60, y + 80, z];
  if (part.id === "hubs") return [x, y + 80, z + 90];
  if (part.id.startsWith("wheel")) return [x, y - 20, z - 80];
  return [x + (part.id.includes("living") ? 130 : part.id.includes("research") ? -120 : 0), y + 90, z + (part.id.includes("garden") ? 100 : 0)];
};

const slots = (variant: string) => Object.values(HANABUSA_VARIANT_SLOTS[variant]);
const files = {
  together: glb("together", slots("hanabusa")),
  aft: glb("aft", slots("hanabusa-aft")),
  section: glb("section", slots("hanabusa-section")),
  exploded: glb("exploded", slots("hanabusa").filter((id) => !id.endsWith("-aft")), explodedAt),
};
function frameOf(min: V3, max: V3, dir: V3, fov = 35, aspect = 1.4): { eye: V3; target: V3 } {
  const c: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const r = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  const d = (r / Math.tan((fov * Math.PI) / 360) / Math.min(1, aspect)) * 1.25;
  const l = Math.hypot(...dir);
  return { eye: [c[0] + (dir[0] / l) * d, c[1] + (dir[1] / l) * d, c[2] + (dir[2] / l) * d], target: c };
}

// the pictures ------------------------------------------------------------------------------------------------------------------------------------------------
const PPM = 3;
const labelPoints = labels().map((label) => ({ id: label.id, at: label.at }));
const modulePoints = all.filter((part) => slots("hanabusa").includes(part.id)).map((part, i) => ({ id: part.id, at: ((): V3 => { const [x, y, z] = explodedAt(part, i); return [x, y + part.height / 2, z + 6]; })() }));
const shots = (name: string, size: [number, number], extra: Record<string, unknown>) => ({ name, size, shadowBias: 0.004, ...extra });
const jobs: { glb: string; shots: Record<string, unknown>[] }[] = [
  { glb: files.together, shots: [
    shots("sheet1-tq", [2400, 1300], { fill: 0.8, eye: [620, 560, 360], target: [0, 300, 0], fov: 38, shadow: 360, sunDir: [0.35, 1, 0.45], points: labelPoints }),
    shots("ga-side", [ENVELOPE.length * PPM + 120, 240 * PPM], { eye: [900, 300, 0], target: [0, 300, 0], up: [0, 0, 1], ortho: 240, shadow: 340 }),
    shots("ga-top", [ENVELOPE.length * PPM + 120, 240 * PPM], { eye: [0, 300, 900], target: [0, 300, 0], up: [-1, 0, 0], ortho: 240, shadow: 340 }),
    shots("ga-front", [240 * PPM, 240 * PPM], { eye: [0, 900, 0], target: [0, 0, 0], up: [0, 0, 1], ortho: 240, shadow: 340 }),
    shots("ga-rear", [240 * PPM, 240 * PPM], { eye: [0, -500, 0], target: [0, 0, 0], up: [0, 0, 1], ortho: 240, shadow: 340 }),
    shots("var-bow", [1300, 560], { fill: 0.8, eye: [460, 700, 200], target: [0, 330, 0], fov: 30, shadow: 360, sunDir: [0.35, 1, 0.45] }),
    shots("var-lit", [1300, 560], { eye: [330, 120, 130], target: [0, 405, 0], fov: 38, shadow: 330, look: "lit", glow: 3.4, sun: 0.08 }),
  ] },
  { glb: files.aft, shots: [shots("var-aft", [1300, 560], { fill: 0.8, eye: [460, 700, 200], target: [0, 330, 0], fov: 30, shadow: 360, sunDir: [0.35, 1, 0.45] })] },
  { glb: files.section, shots: [shots("var-section", [1300, 560], { fill: 0.8, eye: [460, 700, 200], target: [0, 330, 0], fov: 30, shadow: 360, look: "line" })] },
  { glb: files.exploded, shots: [shots("sheet3-exploded", [2400, 1300], { fill: 0.8, eye: [900, 80, 520], target: [0, 330, 20], fov: 40, shadow: 560, points: modulePoints })] },
];

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
const run = spawnSync("node", ["scripts/ship-01-render.ts", jobsFile, join(out, "renders")], { stdio: "inherit" });
if (run.status !== 0) throw new Error("the pictures did not draw");

// the sheets ---------------------------------------------------------------------------------------------------------------------------------------------------
const img = (name: string) => `data:image/png;base64,${readFileSync(join(out, "renders", `${name}.png`)).toString("base64")}`;
const points = (name: string): { id: string; x: number; y: number; behind: boolean }[] => JSON.parse(readFileSync(join(out, "renders", `${name}.points.json`), "utf8"));
const esc = (text: string) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
const NAME = `ISV <ruby>花房<rt>はなぶさ</rt></ruby> HANABUSA`;
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
const titleBlock = (sheet: number, name: string, scale: string) => `<div class="title"><div><h1>${NAME}</h1><div class="sub">${esc(TITLE_BLOCK)}</div></div><div class="meta"><div class="status">${esc(STATUS)}</div><div>SHEET ${sheet} OF 8 · ${esc(name)}</div><div>${esc(scale)} · REVISION A · 2026-11-05 · ${OPERATOR} DRAWING OFFICE</div></div></div>`;
const foot = (note: string) => `<div class="foot"><div>${esc(IDENTITY.designation)} · ${esc(IDENTITY.prefix)} (${esc(IDENTITY.prefixMeans)}) · ${esc(IDENTITY.class)} class · ${esc(IDENTITY.type)} (${esc(IDENTITY.typeMeans)}) · ${esc(IDENTITY.drive)}: ${esc(IDENTITY.driveMeans)} · ${esc(IDENTITY.computer)}</div><div>${esc(note)}</div></div>`;
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
  await shoot("1-exterior-three-quarter.png", page(1, "EXTERIOR, THREE-QUARTER VIEW, WITH CALLOUTS", "PERSPECTIVE · NOT TO SCALE", `<div style="position:relative;width:${W - 88}px;height:1300px"><img src="${img("sheet1-tq")}" style="position:absolute;left:200px;top:0;width:2400px"/>${c1.svg}${c1.texts}</div>`));

  // 2: general arrangement at one scale
  const ruler = (len: number, label: string) => `<svg width="${len * PPM + 120}" height="46"><g stroke="#c9a24a" fill="#c9a24a" font-size="15">${Array.from({ length: Math.floor(len / 50) + 1 }, (_, i) => `<line x1="${60 + i * 50 * PPM}" y1="6" x2="${60 + i * 50 * PPM}" y2="${i % 2 === 0 ? 28 : 18}"/><text x="${60 + i * 50 * PPM - 8}" y="42" stroke="none">${i * 50}</text>`).join("")}<line x1="60" y1="6" x2="${60 + len * PPM}" y2="6"/><text x="${60 + (len * PPM) / 2 - 60}" y="24" stroke="none" font-size="18">${label}</text></g></svg>`;
  await shoot("2-general-arrangement.png", page(2, "GENERAL ARRANGEMENT: SIDE, TOP, FRONT AND REAR AT ONE SCALE", `1 : ${Math.round(1000 / PPM)} · ${PPM} PX PER METRE`, `<div class="grid"><div><h2>SIDE (BOW TO THE RIGHT)</h2><div class="panel" style="padding:0"><img src="${img("ga-side")}"/></div>${ruler(ENVELOPE.length, `${ENVELOPE.length} m`)}</div><div><h2>TOP (BOW TO THE RIGHT)</h2><div class="panel" style="padding:0"><img src="${img("ga-top")}"/></div>${ruler(ENVELOPE.length, `${ENVELOPE.length} m · BEAM ${ENVELOPE.beam} m`)}</div><div class="grid" style="grid-template-columns:1fr 1fr 1fr"><div><h2>FRONT (LOOKING AT THE BOW)</h2><div class="panel" style="padding:0"><img src="${img("ga-front")}"/></div></div><div><h2>REAR (LOOKING AT THE DRIVE)</h2><div class="panel" style="padding:0"><img src="${img("ga-rear")}"/></div></div><div class="panel"><h2>OVERALL</h2><table>${specification().filter((l) => ["Length", "Beam", "Height", "Dry mass"].includes(l.name)).map((l) => `<tr><th>${esc(l.name)}</th><td>${esc(l.value)}${l.note ? `<br><small style="color:#8fa6bd">${esc(l.note)}</small>` : ""}</td></tr>`).join("")}</table></div></div></div>`));

  // 3: the exploded assembly
  const mods = all.filter((part) => slots("hanabusa").includes(part.id));
  const c3 = callouts("sheet3-exploded", 2400, 1300, mods.map((m) => ({ id: m.id, text: m.name })), 200);
  await shoot("3-exploded-assembly.png", page(3, "EXPLODED ASSEMBLY", "PERSPECTIVE · NOT TO SCALE", `<div style="position:relative;width:${W - 88}px;height:1300px"><img src="${img("sheet3-exploded")}" style="position:absolute;left:200px;top:0;width:2400px"/>${c3.svg}${c3.texts}</div><div class="panel" style="margin-top:22px"><h2>HOW IT COMES APART</h2>Every module of the keel has an L-class or M-class docking collar at both ends and comes off its neighbour at its collar. The two booms and the hubs turn with the rings round the still keel; each ring is one part, and the industrial wheel another.</div>`));

  // 4: variants
  const cell = (title: string, name: string, note: string) => `<div class="panel"><h2>${esc(title)}</h2><img src="${img(name)}" style="width:100%"/><div style="color:#9fb4c8;margin-top:6px">${esc(note)}</div></div>`;
  await shoot("4-variants.png", page(4, "VARIANTS: RING ORDER, SECTION VIEW, LIT", "PERSPECTIVE · NOT TO SCALE", `<div class="grid" style="grid-template-columns:1fr 1fr">${cell("THE RINGS STEP UP FROM THE BOW (DEFAULT)", "var-bow", "Garden 48 m, research 62 m, living 76 m: seen from ahead every ring has open sky above it.")}${cell("THE OTHER ORDER", "var-aft", "The smallest ring at the stern: one choice of the part list.")}${cell("SECTION VIEW OF THE LIVING RING (LINE LOOK)", "var-section", "The glass cut away, the section lines of the floor, the three terrace steps and the canal.")}${cell("LIT: LED LIGHTING", "var-lit", "Window bands, grow-lamps and the thruster coils lit; the glass shows the floors.")}</div>`));

  // 5: hull layers
  const total = HULL.layers.reduce((s, l) => s + l.mm, 0);
  const stack = HULL.layers.map((l, i) => { const h = Math.max(26, (l.mm / total) * 560); return `<div style="height:${h}px;display:flex;align-items:center;border-bottom:1px solid #000;background:${MATERIALS[l.material].color};color:#000;padding:0 14px;font-size:19px"><b style="width:36px">${i + 1}</b>${esc(l.name)} · ${l.mm} mm</div>`; }).join("");
  await shoot("5-hull-layers.png", page(5, "HULL LAYERS: THE EXPLORER'S LIGHT WHIPPLE STACK", "SECTION · NOT TO SCALE", `<div class="grid" style="grid-template-columns:1fr 1fr"><div class="panel"><h2>THE STACK, OUTSIDE TO INSIDE (${total} mm)</h2>${stack}<div style="margin-top:10px;color:#9fb4c8">${esc(HULL.why)}</div></div><div class="panel"><h2>THE TABLE</h2><table>${HULL.layers.map((l, i) => `<tr><th>${i + 1}. ${esc(l.name)}</th><td>${esc(l.made)}, ${l.mm} mm<br><small style="color:#8fa6bd">${esc(l.note)}</small></td></tr>`).join("")}</table></div></div>`));

  // 6: thruster cards
  const engineRow = (id: string, title: string, image: string) => { const e = ENGINES[id]; return `<div class="panel"><h2>${esc(title)}</h2><div style="display:flex;gap:24px"><img src="${img(image)}" style="width:55%"/><table style="width:45%"><tr><th>Count</th><td>${e.count}</td></tr><tr><th>Thrust, each</th><td>${(e.thrust / 1e6).toFixed(e.thrust >= 1e6 ? 2 : 3)} MN</td></tr><tr><th>Specific impulse</th><td>${Math.round(e.isp).toLocaleString("en-US")} s${e.exhaustOfC > 0.1 ? ` (effective exhaust ${e.exhaustOfC} c, fictional)` : ""}</td></tr><tr><th>Mass flow, each</th><td>${e.massFlow.toFixed(3)} kg/s</td></tr><tr><th>Fuel</th><td>${esc(e.fuel)}</td></tr><tr><th>Capacity</th><td>${e.fuelCapacity.toLocaleString("en-US")} t</td></tr><tr><th>Operation</th><td>${e.operation}</td></tr></table></div><div style="color:#9fb4c8;margin-top:8px">${esc(e.note)}</div></div>`; };
  await shoot("6-thruster-cards.png", page(6, "PROPULSION CARDS", "NOT TO SCALE", `<div class="grid">${engineRow("hanabusa-main", "MAIN DRIVE: MND, MAGNETIC NOZZLE DRIVE, 19 THRUSTERS", "card-card-main")}${engineRow("hanabusa-trim", "PLASMA TRIM POD (MANOEUVRING, SPIN-UP)", "card-card-trim")}</div>`));

  // 7: insets
  const inset = (id: string) => { const i = SHIP_INSETS[id]; return `<div class="panel"><h2>${esc(i.name.toUpperCase())}</h2><div style="color:#9fb4c8;margin-bottom:8px">${esc(i.note)}</div><div class="grid" style="grid-template-columns:repeat(6,1fr)">${i.parts.map((p) => `<div><img src="${img(`inset-${id}-${p.n}`)}" style="width:100%"/><b style="color:#f0b44c">${p.n}</b> ${esc(p.name)}<br><small style="color:#8fa6bd">${esc(p.does)}</small></div>`).join("")}</div></div>`; };
  await shoot("7-system-insets.png", page(7, "SYSTEM INSETS", "NOT TO SCALE", `<div class="grid">${Object.keys(SHIP_INSETS).map(inset).join("")}<div class="panel"><h2>THE FLEET'S FOUR</h2>The reactor core, the navigation and sensor suite, life support and the docking port are shared by every ship of the fleet; their six numbered sub-parts are in the kit's own insets.</div></div>`));

  // 8: specification, decks, legend
  const legend = [["shield", "Removable shield or shutter"], ["protected", "Protected volume (white blanket)"], ["structure", "Structure and plating"], ["coolant", "Coolant and feed line"], ["coil", "Copper field coil, gold foil"], ["service", "Service access, rail"], ["heatSink", "Heat sink"], ["farm", "Farm and garden"], ["propellant", "Propellant"], ["light", "Light, lamp, LED"]] as const;
  await shoot("8-specification-decks-legend.png", page(8, "SPECIFICATION, DECKS AND LEGEND", "—", `<div class="grid" style="grid-template-columns:1.1fr 1fr"><div class="panel"><h2>SPECIFICATION</h2><table>${specification().map((l) => `<tr><th>${esc(l.name)}</th><td>${esc(l.value)}${l.note ? `<br><small style="color:#8fa6bd">${esc(l.note)}</small>` : ""}</td></tr>`).join("")}</table></div><div class="grid"><div class="panel"><h2>DECKS, BOW TO STERN</h2><table>${deckSummary().map((d) => `<tr><th>${d.number}. ${esc(d.name)}</th><td>${esc(d.does)}</td></tr>`).join("")}</table></div><div class="panel"><h2>LEGEND</h2>${legend.map(([k, t]) => `<div><span class="sw" style="background:${(FLEET_PALETTE as Record<string, string>)[k] ?? "#888"}"></span>${esc(t)}</div>`).join("")}<h2 style="margin-top:14px">WHAT EACH MODULE DESCENDS FROM</h2><table>${Object.entries(ANCESTORS).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table></div></div></div>`));
} finally {
  await browser.close();
}
