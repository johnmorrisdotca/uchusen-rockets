// Tiangong, China's space station, as its article and its modules' articles give it: Tianhe, the core module, 16.6 m long and 4.2 m across with its docking node at its forward end; Wentian and Mengtian, the two
// laboratory modules, 17.9 m by 4.2 m, on the node's starboard and port sides; Shenzhou at the forward and nadir ports and Tianzhou at the aft. It stands on end here, Tianhe's axis up and its aft at the foot, as the ISS does.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-tiangong" as const;
export const TIANHE_WIDE: Figure = { value: 4.2, source: "wikipedia-tianhe", note: "14 feet, its big cylinder." };
export const LAB_WIDE: Figure = { value: 4.2, source: "wikipedia-wentian", note: "14 feet." };
export const SHENZHOU_WIDE: Figure = { value: 2.8, source: "wikipedia-shenzhou" };
export const TIANZHOU_WIDE: Figure = { value: 3.35, source: "wikipedia-tianzhou", note: "11 feet." };
export const LAB_LONG: Figure = { value: 17.9, source: "wikipedia-wentian", note: "59 feet, its length: it lies out from the node, so it is its widest here, and its height here is its 4.2 m width." };
export const SHENZHOU_LONG: Figure = { value: 9.25, source: "wikipedia-shenzhou", note: "Its length: it lies out from the nadir port, so it is its widest here, and its height here is its wings' span." };
export const SHENZHOU_WINGS: Figure = { value: 17, source: "wikipedia-shenzhou", note: "Its two wings, tip to tip." };
export const TIANZHOU_WINGS: Figure = { value: 14.9, source: "wikipedia-tianzhou", note: "Its two wings, tip to tip: 49 feet." };
/** The laboratories' wings, tip to tip: "over 55 m" in their articles, drawn as 55.6 m, the station's sourced length. */
export const WING_SPAN: Figure = { value: 55.6, source: "wikipedia-wentian", note: "Each laboratory's two wings, tip to tip: its article says over 55 m, and 110 m² of cells each. Drawn at the station's sourced length." };

export const TIANGONG_VARIANTS: readonly Variant[] = [
  {
    id: "tiangong",
    rocket: "tiangong",
    name: "Tiangong 天宮",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "2021-04-29", source: S, note: "Tianhe, on a Long March 5B. Wentian followed on 2022-07-24 and Mengtian on 2022-10-31." },
    slots: ["tianhe", "hub", "shenzhou-forward", "tianzhou", "wentian", "mengtian", "tianhe-arrays", "wentian-arrays", "mengtian-arrays", "shenzhou-nadir"],
    note: "w29572227's model, its flags and mark left out, in the painted look, one file a part, each module and craft at its own sourced size; this package's own plain shapes in the line looks, from the sourced lengths and widths. It stands with Tianhe's axis up and the laboratories across the front: height here is the laboratories' wings tip to tip, along that axis. The two Shenzhou and the Tianzhou are the model's visiting craft.",
    facts: {
      height: { value: 55.6, source: S, note: "182 feet, the length its article gives. Drawn as the laboratories' wings, tip to tip, along Tianhe's axis." },
      diameter: { value: 39, source: S, note: "128 feet, the width its article gives: across the two laboratories." },
      parts: {
        tianhe: blank("Tianhe's body without its node: 12.2 m of the sourced 16.6 m, as the model divides them."),
        hub: blank("Tianhe's docking node: 4.4 m of the sourced 16.6 m, as the model divides them."),
        "shenzhou-forward": { value: 9.25, source: "wikipedia-shenzhou", note: "Its service, re-entry and orbital modules are 2.94 m, 2.5 m and 2.8 m." },
        tianzhou: { value: 10.6, source: "wikipedia-tianzhou", note: "35 feet." },
        wentian: blank("It lies out from the node: 17.9 m long (59 feet) and 4.2 m across, so its height here is its width, 4.2 m."),
        mengtian: blank("It lies out from the node: 17.9 m long (59 feet) and 4.2 m across, so its height here is its width, 4.2 m."),
        "tianhe-arrays": blank("Tianhe's two wings have no size in a source read here: they are the model's, at Tianhe's scale."),
        "wentian-arrays": WING_SPAN,
        "mengtian-arrays": WING_SPAN,
        "shenzhou-nadir": blank("The same craft as at the forward port, 9.25 m long, lying out from the nadir port: its height here is its wings' span, 17 m."),
      },
      engines: {},
      more: {
        "tianhe-length": { value: 16.6, source: "wikipedia-tianhe", note: "54 feet, the core module with its node." },
        mass: { value: "about 100,000 kg", source: S },
        crew: { value: 3, source: S },
        orbit: { value: "386 to 392 km, 41.47 degrees", source: S, note: "As the infobox gave it on the day it was read." },
        "shenzhou-wings": SHENZHOU_WINGS,
        "tianzhou-wings": TIANZHOU_WINGS,
        "wentian-length": LAB_LONG,
        "mengtian-length": { value: 17.9, source: "wikipedia-mengtian", note: "59 feet." },
        "pressurised-volume": { value: 340, source: S, note: "Cubic metres." },
      },
    },
  },
];
