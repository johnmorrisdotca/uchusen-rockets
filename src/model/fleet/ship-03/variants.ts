// Which part stands in which slot of each variant of Miyamoto. Stacked slots come first, tail to bow; the placed parts (hangars, pod, radiators) follow. Pure: no three.js and no DOM.
import { parts, type MiyamotoPart } from "./index.ts";

export const MIYAMOTO_PARTS: readonly MiyamotoPart[] = parts();

const STACKED = ["drive", "engineering", "fuel-aft", "fuel-fore", "habitat", "command", "bow"] as const;

/** For each variant, slot by slot, the id of its part (after `fleet-ship-03-`). */
export const MIYAMOTO_VARIANT_SLOTS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const make = (o: { cut?: boolean; deployed?: boolean; pod: "relay" | "relief" }): Record<string, string> => {
    const sfx = o.cut ? "-cutaway" : "";
    return {
      ...Object.fromEntries(STACKED.map((slot) => [slot, `${slot}${sfx}`])),
      "hangar-starboard": `hangar-starboard${sfx}`,
      "hangar-port": `hangar-port${sfx}`,
      pod: `pod-${o.pod}`,
      "radiators-dorsal": `radiators-dorsal-${o.deployed ? "deployed" : "stowed"}`,
      "radiators-ventral": `radiators-ventral-${o.deployed ? "deployed" : "stowed"}`,
    };
  };
  return { miyamoto: make({ pod: "relay" }), "miyamoto-deployed": make({ pod: "relay", deployed: true }), "miyamoto-relief": make({ pod: "relief" }), "miyamoto-cutaway": make({ pod: "relay", cut: true }) };
})();
