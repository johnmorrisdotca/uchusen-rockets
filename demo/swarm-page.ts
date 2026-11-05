// One moment of the Miyamoto build: a box for each drone, on a lane outside the hull, with the last leg running in to the slot.
import { buildOf, playFrame } from "../src/buildPlay.ts";
import { approachPath, pathClears, swarmCount, swarmJobs, type HullBox } from "../src/swarm.ts";
import { WORDS } from "./words.js";

const hull: HullBox = { min: [-69, 0, -40], max: [69, 380, 34] };

/** Stations for the diagram. These are the module's place on the spine, not a mesh origin. */
const SLOT_AT: Record<string, [number, number, number]> = {
  drive: [0, 29, 0],
  engineering: [0, 74, 0],
  "fuel-aft": [0, 130, 0],
  "fuel-fore": [0, 210, 0],
  habitat: [0, 276, 0],
  command: [0, 326, 0],
  bow: [0, 365, 0],
  "hangar-starboard": [46, 154, 14],
  "hangar-port": [-46, 270, 14],
  "hangar-starboard-fore": [46, 270, 14],
  "hangar-port-aft": [-46, 154, 14],
  "drive-collar": [0, 40, 20],
  pod: [0, 365, 8],
  array: [0, 276, 30],
  "radiators-dorsal": [0, 130, 20],
  "radiators-ventral": [0, 130, -20],
  "exterior-load": [46, 154, 14],
};

type Chooser = { word(key: string): string | undefined };
const say = (key: string, values: Record<string, string | number> = {}): string => {
  const chooser = (window as unknown as { uchusenLanguage?: Chooser }).uchusenLanguage;
  return (chooser?.word(key) ?? WORDS.en[key] ?? key).replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
};

const hullX = 36;
const hullTop = 24;
const hullH = 520;
const hullW = hullH * ((hull.max[0] - hull.min[0]) / (hull.max[1] - hull.min[1]));
const laneX = hullX + hullW + 14;
const boxX = laneX + 40;
const sx = (x: number): number => hullX + ((x - hull.min[0]) / (hull.max[0] - hull.min[0])) * hullW;
const sy = (y: number): number => hullTop + ((hull.max[1] - y) / (hull.max[1] - hull.min[1])) * hullH;

const steps = buildOf("miyamoto");
const count = swarmCount("miyamoto") ?? 0;
let at = 0;
let slots = 0;
if (steps) {
  for (let i = 0; i <= 100; i += 1) {
    const n = playFrame(steps, i / 100).going.length;
    if (n > slots) {
      slots = n;
      at = i / 100;
    }
  }
}
const frame = steps ? playFrame(steps, at) : undefined;
const jobs = steps ? swarmJobs(steps, count, at) : [];

const hullMark = `<rect data-hull x="${hullX}" y="${hullTop}" width="${hullW}" height="${hullH}" fill="#1c2433" stroke="#8ea0b8"/>`;

const marks = jobs.map((job) => {
  const slot = SLOT_AT[job.slot] ?? [0, 190, 0];
  const path = approachPath(job.drone, count, slot, hull);
  const clear = pathClears(path, hull) ? "yes" : "no";
  const boxY = hullTop + 8 + (count <= 1 ? 0 : (job.drone * (hullH - 24)) / (count - 1));
  const into = `${sx(slot[0])},${sy(slot[1])}`;
  return `<polyline data-leg points="${boxX},${boxY} ${laneX},${boxY} ${laneX},${sy(slot[1])} ${into}" fill="none" stroke="#9ecfff" stroke-width="1.5"/>
<rect data-drone data-clear="${clear}" x="${boxX - 4}" y="${boxY - 4}" width="8" height="8" fill="#c5d0de"/>`;
}).join("");

const host = document.getElementById("swarm-map");
if (host) {
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 570">${hullMark}${marks}</svg>`;
}
const caption = document.getElementById("swarm-now");
if (caption && frame) caption.textContent = say("swarmNow", { day: Math.round(frame.day), drones: count, slots });
