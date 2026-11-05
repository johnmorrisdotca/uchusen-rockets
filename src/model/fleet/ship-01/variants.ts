// Which part stands in which slot of each variant of Hanabusa. Stacked slots come first, tail to bow; the placed parts (booms, hubs, rings, the wheel) follow. Pure: no three.js and no DOM.
import { parts, type HanabusaPart } from "./index.ts";
import { SPINE } from "./hull.ts";

export const HANABUSA_PARTS: readonly HanabusaPart[] = parts();

const STACKED = SPINE.map((one) => one.id);

/** For each variant, slot by slot, the id of its part (after `fleet-ship-01-`). `hanabusa-aft` swaps the order of the rings; `hanabusa-section` opens the living ring for a flat section view. */
export const HANABUSA_VARIANT_SLOTS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const make = (o: { aft?: boolean; section?: boolean }): Record<string, string> => {
    const sfx = o.aft ? "-aft" : "";
    return {
      ...Object.fromEntries(STACKED.map((slot) => [slot, slot])),
      "boom-port": "boom-port",
      "boom-starboard": "boom-starboard",
      hubs: "hubs",
      "ring-garden": `ring-garden${sfx}`,
      "ring-research": `ring-research${sfx}`,
      "ring-living": o.section ? "ring-living-section" : `ring-living${sfx}`,
      "wheel-industrial": "wheel-industrial",
    };
  };
  return { hanabusa: make({}), "hanabusa-aft": make({ aft: true }), "hanabusa-section": make({ section: true }) };
})();
