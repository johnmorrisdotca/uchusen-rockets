// The Tiangong space station (天宮) as the pages read for it give it: three modules in a T, each 4.2 m across, Tianhe 16.6 m long and Wentian and Mengtian 17.9 m, with Shenzhou and Tianzhou craft docked to it.
// No official model of it is published for reuse, so this package draws it from these sizes with its own code. A figure with no source here is blank; where the drawing needs a size no source gives, the drawing's own
// choice is said in the variant's note and in src/model/tiangong.ts, and is never offered as a fact.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-tiangong" as const;

export const TIANHE_LONG: Figure = { value: 16.6, source: "wikipedia-tianhe", note: "54 feet. Its article's infobox and the station's module table agree." };
export const WENTIAN_LONG: Figure = { value: 17.9, source: S, note: "59 feet, from the station's module table." };
export const MENGTIAN_LONG: Figure = { value: 17.9, source: "wikipedia-mengtian", note: "59 feet. The station's module table agrees." };
/** Each laboratory and the core are this wide, as the module table gives. */
export const MODULE_WIDE: Figure = { value: 4.2, source: S, note: "14 feet, for each of the three modules." };
export const SHENZHOU_LONG: Figure = { value: 9.25, source: "wikipedia-shenzhou", note: "30 ft 4 in, for Shenzhou 12. The three modules' own lengths add to 8.24 m, and the article does not say what makes up the rest." };
export const TIANZHOU_LONG: Figure = { value: 10.6, source: "wikipedia-tianzhou", note: "35 feet." };

const SHENZHOU_WIDE: Figure = { value: 2.8, source: "wikipedia-shenzhou", note: "9 ft 2 in, the widest, at the service module." };
const TIANZHOU_WIDE: Figure = { value: 3.35, source: "wikipedia-tianzhou", note: "11.0 feet." };

/** What every variant of the station says about how it is drawn. */
const DRAWN =
  "Drawn by this package's code from the sourced lengths and widths: the core, the two laboratories, the hub and the arrays, with no licensed model. Where each section ends, the hub's size, the ports, the arrays' widths and the colours are judged from photographs and are not figures. It stands with its core upright and its laboratories across the top, as a T: the real station has no up. No flag, mark or lettering is drawn.";

const sizes: Readonly<Record<string, Figure>> = {
  "Tianhe length": TIANHE_LONG,
  "Wentian length": WENTIAN_LONG,
  "Mengtian length": MENGTIAN_LONG,
  "Module width, each": MODULE_WIDE,
  "Wentian's wings, each": { value: 27, source: "xinhua-wentian-wings", note: "Its two 27-metre wings. The article gives over 55 m for the span, and about 110 square metres for one wing." },
};

const more: Readonly<Record<string, Figure<number | string>>> = {
  mass: { value: "about 100,000 kg", source: S, note: "220,000 lb, as of 25 April 2024." },
  "Station length": { value: "about 55.6 m", source: S, note: "The page does not say what it measures." },
  "Pressurised volume": { value: "340 m³, 122 m³ habitable", source: S, note: "12,000 ft³ and 4,310 ft³." },
  orbit: { value: "about 340 to 450 km up, tilted 41.47°", source: S, note: "The infobox gives a periapsis of 386.4 km and an apoapsis of 391.8 km at its date; the text gives the range." },
  crew: { value: "three, six during a handover", source: S },
  "T-shape complete": { value: "2022-11-03", source: S, note: "Mengtian berthed at 01:32 UTC, forming the T; the agency then announced construction complete." },
  "Tianhe launched": { value: "2021-04-29", source: S, note: "03:23:15 UTC." },
  "Wentian launched": { value: "2022-07-24", source: S, note: "06:22:32 UTC; it moved to its side port on 30 September 2022." },
  "Mengtian launched": { value: "2022-10-31", source: S, note: "07:37:23 UTC; it moved to its side port on 3 November 2022." },
};

const diameter: Figure = { value: 39, source: S, note: "The infobox gives about 39 m (128 ft) and does not say what it measures." };

export const TIANGONG_VARIANTS: readonly Variant[] = [
  {
    id: "tiangong",
    rocket: "tiangong",
    name: "Tiangong space station 天宮",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "2021-04-29", source: S, note: "Tianhe, the core module." },
    slots: ["tianhe", "wentian", "mengtian"],
    note: `The station as a T: the Tianhe core, and the Wentian and Mengtian laboratories on its hub's two side ports. ${DRAWN}`,
    facts: {
      height: blank("A T has no one height: its modules' lengths are under sizes.", "not given"),
      diameter,
      parts: { tianhe: TIANHE_LONG, wentian: blank("Its 17.9 m runs sideways, across the top; it is under sizes."), mengtian: blank("Its 17.9 m runs sideways, across the top; it is under sizes.") },
      engines: {},
      more,
      sizes,
    },
  },
  {
    id: "tiangong-docked",
    rocket: "tiangong",
    name: "Tiangong with a Shenzhou and a Tianzhou docked 天宮",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "2021-04-29", source: S, note: "Tianhe, the core module; the T itself was complete on 2022-11-03." },
    slots: ["tianhe", "wentian", "mengtian", "shenzhou", "tianzhou"],
    note: `The station as it usually stands: a Shenzhou crew ship on the hub's forward port and a Tianzhou cargo ship on the core's aft port. ${DRAWN}`,
    facts: {
      height: blank("A T has no one height: its modules' lengths are under sizes.", "not given"),
      diameter,
      parts: {
        tianhe: TIANHE_LONG,
        wentian: blank("Its 17.9 m runs sideways, across the top; it is under sizes."),
        mengtian: blank("Its 17.9 m runs sideways, across the top; it is under sizes."),
        shenzhou: SHENZHOU_LONG,
        tianzhou: TIANZHOU_LONG,
      },
      engines: {},
      more,
      sizes: { ...sizes, "Shenzhou width": SHENZHOU_WIDE, "Tianzhou width": TIANZHOU_WIDE },
    },
  },
  {
    id: "tiangong-detailed",
    rocket: "tiangong",
    name: "Tiangong, a detailed model 天宮",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "2021-04-29", source: S, note: "Tianhe, the core module." },
    slots: ["station"],
    note: "A detailed model of the station by the Sketchfab user w29572227 (CC BY 4.0), in the painted look, cut down to about 75,000 triangles with its flag's picture removed and scaled to the sourced 39 m across; its modules and the craft docked to it are the model's, drawn as its author made them, and its arrays are shorter than the real station's. This package's own plain shapes in the line looks, laid out as the other two variants are. Show the credit wherever the model shows.",
    facts: {
      height: blank("The model has no one sourced height.", "not given"),
      diameter,
      parts: { station: blank("The model is one piece: its size is the sourced 39 m across, and no source gives its height.") },
      engines: {},
      more,
      sizes,
    },
  },
];
