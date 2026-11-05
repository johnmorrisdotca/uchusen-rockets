// Which part stands in which slot of each variant of Kyotori V2. The ships' slots come first, tail to bow, then the station's. Pure: no three.js and no DOM.
import { parts } from "./index.ts";
import { STATION } from "./station.ts";

export const KYOTORI_PARTS = parts();
const SHIP_SLOTS = ["drive", "shaft", "tanks", "bay", "elevator", "bow", "joints"] as const;
const B_SLOTS = ["drive", "shaft", "tanks", "crew", "bow", "joints"] as const;

/** For each variant, slot by slot, the id of its part (after `fleet-kyotori-`). `kyotori` is the ships joined with the wings out; `kyotori-stowed` has them folded; `kyotori-separated` has the ships away from the station; `kyotori-cutaway` opens the four quarters. */
export const KYOTORI_VARIANT_SLOTS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const make = (o: { apart?: boolean; stowed?: boolean; cut?: boolean }): Record<string, string> => {
    const sfx = o.apart ? "-apart" : "";
    return {
      ...Object.fromEntries(SHIP_SLOTS.map((s) => [`a-${s}`, `a-${s}${sfx}`])),
      ...Object.fromEntries(B_SLOTS.map((s) => [`b-${s}`, `b-${s}${sfx}`])),
      "c-core": "c-core",
      "c-housing": "c-housing",
      "c-wings": o.stowed ? "c-wings-stowed" : "c-wings-deployed",
      ...Object.fromEntries(STATION.kinds.map((k) => [`c-quarter-${k}`, `c-quarter-${k}${o.cut ? "-cut" : ""}`])),
    };
  };
  return { kyotori: make({}), "kyotori-stowed": make({ stowed: true }), "kyotori-separated": make({ apart: true }), "kyotori-cutaway": make({ cut: true, stowed: true }) };
})();
