// Ariane 5 as its article gives it, in two forms that share the core and the boosters: the ECA, whose upper stage is the ESC, and the ES, whose upper stage is the EPS. The stage infoboxes give the boosters, the core and each upper stage a length. The whole is a range and the fairing has no length, so the fairing is an estimate: what the least of the range leaves.
import { FUTURE_STAGE_LENGTHS } from "./future-lengths.ts";
import type { Figure, Variant } from "./types.ts";

const S = "wikipedia-ariane-5" as const;
const L = FUTURE_STAGE_LENGTHS["ariane-5"];
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const ARIANE_5_BOOSTER_DIAMETER = L.diameters.eap;

const WHOLE = L.height.value ?? 0;
const CORE = L.parts.epc.value ?? 0;
const round = (value: number) => Math.round(value * 1000) / 1000;
const fairingOf = (stage: string, upper: number): Figure => ({ value: round(WHOLE - CORE - upper), source: S, estimate: true, derivation: `${WHOLE} m whole minus the sourced core and ${stage}; its rounded nose is a plain shape, not sourced` });
export const ARIANE_5_FAIRING_DIAMETER: Figure = { value: L.diameters.epc.value, source: S, estimate: true, derivation: "the vehicle's sourced 5.4 m: no source gives the fairing's own width" };

const shared = {
  height: L.height,
  diameter: L.diameters.epc,
  sizes: { "Booster diameter": ARIANE_5_BOOSTER_DIAMETER },
  more: {},
};
const SOLID = said("1 solid motor, P241", { note: "The ECA's and the ES's boosters; the P238 of the G and G+ is the same length." });

export const ARIANE_5_VARIANTS: readonly Variant[] = [
  {
    id: "eca",
    rocket: "ariane-5",
    name: "Ariane 5 ECA",
    status: "flown",
    firstFlight: said("2002-12-11", { note: "The first launch of the ECA, which failed. Its first successful launch was on 2005-02-12." }),
    slots: ["first-stage", "srb-left", "srb-right", "second-stage", "fairing"],
    note: "Two boosters, the core and the ESC upper stage at the lengths the stage infoboxes give; the ECA+ has the same lengths and is not listed apart. The article gives the whole as a range, 46 to 52 m, and the least is drawn. It gives the fairing no length, so the fairing is an estimate, about 17.489 m: what the 46 m leaves after the sourced core and upper stage. Its text says the core's tank is 30.5 m high, which the infobox's 23.8 m does not match: the infobox's is drawn, as for every stage. The boosters stand against the core, and the engines' size and the paint are not sourced; no name or mark is drawn. The G, G+ and GS are not listed.",
    facts: {
      ...shared,
      parts: {
        "first-stage": L.parts.epc,
        "srb-left": L.parts.eap,
        "srb-right": L.parts.eap,
        "second-stage": L.parts.esc,
        fairing: fairingOf("the ESC", L.parts.esc.value ?? 0),
      },
      engines: { "first-stage": said("1 Vulcain 2"), "srb-left": SOLID, "srb-right": SOLID, "second-stage": said("1 HM7B") },
    },
  },
  {
    id: "es",
    rocket: "ariane-5",
    name: "Ariane 5 ES",
    status: "flown",
    firstFlight: said("2008-03-09", { note: "The ES's first launch, which carried the first Automated Transfer Vehicle." }),
    slots: ["first-stage", "srb-left", "srb-right", "second-stage", "fairing"],
    note: "Two boosters, the core and the EPS upper stage at the lengths the stage infoboxes give. The G, G+ and GS have the same lengths and are not listed. The article gives the whole as a range, 46 to 52 m, and the least is drawn. It gives the fairing no length, so the fairing is an estimate, about 18.8 m: what the 46 m leaves after the sourced core and upper stage. Its text says the core's tank is 30.5 m high, which the infobox's 23.8 m does not match: the infobox's is drawn, as for every stage. The boosters stand against the core, and the engines' size and the paint are not sourced; no name or mark is drawn.",
    facts: {
      ...shared,
      parts: {
        "first-stage": L.parts.epc,
        "srb-left": L.parts.eap,
        "srb-right": L.parts.eap,
        "second-stage": L.parts.eps,
        fairing: fairingOf("the EPS", L.parts.eps.value ?? 0),
      },
      engines: { "first-stage": said("1 Vulcain 2"), "srb-left": SOLID, "srb-right": SOLID, "second-stage": said("1 Aestus") },
    },
  },
];
