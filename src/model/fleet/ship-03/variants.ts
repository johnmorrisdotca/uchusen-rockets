// Which part stands in which slot of each variant of Miyamoto. Stacked slots come first, tail to bow; the placed parts (hangars, pod, radiators) follow. Pure: no three.js and no DOM.
import { parts, type MiyamotoPart } from "./index.ts";

export const MIYAMOTO_PARTS: readonly MiyamotoPart[] = parts();

const STACKED = ["drive", "engineering", "fuel-aft", "fuel-fore", "habitat", "command", "bow"] as const;

/** For each variant, slot by slot, the id of its part (after `fleet-ship-03-`). */
export const MIYAMOTO_VARIANT_SLOTS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const make = (o: { cut?: boolean; deployed?: boolean; bare?: boolean; sister?: boolean; array?: boolean; pod: "relay" | "relief" | "survey" }): Record<string, string> => {
    const sfx = o.cut ? "-cutaway" : "";
    // the sister has her own drum in both forms and her own drive, citadel and bow whole; her cutaway shows Miyamoto's cut for the rest
    const own = (slot: string): boolean => !!o.sister && (o.cut ? slot === "habitat" || slot === "drive" : ["drive", "habitat", "command", "bow"].includes(slot));
    const hangarSfx = o.sister && !o.cut ? "-ariake" : "";
    return {
      ...Object.fromEntries(STACKED.map((slot) => [slot, `${slot}${own(slot) ? "-ariake" : ""}${sfx}`])),
      "hangar-starboard": `hangar-starboard${hangarSfx}${sfx}`,
      "hangar-port": `hangar-port${hangarSfx}${sfx}`,
      "drive-collar": o.bare ? "collar-none" : o.sister ? "shield-collar-ariake" : "shield-collar",
      ...(o.sister ? { "hangar-starboard-fore": "hangar-starboard-fore-ariake", "hangar-port-aft": "hangar-port-aft-ariake" } : {}),
      pod: `pod-${o.pod}`,
      ...(o.sister ? {} : { array: `array-${o.array ? "deployed" : "stowed"}` }),
      "radiators-dorsal": `radiators-dorsal-${o.deployed ? "deployed" : "stowed"}`,
      "radiators-ventral": `radiators-ventral-${o.deployed ? "deployed" : "stowed"}`,
    };
  };
  return { miyamoto: make({ pod: "relay" }), "miyamoto-deployed": make({ pod: "relay", deployed: true }), "miyamoto-array": make({ pod: "relay", array: true }), "miyamoto-relief": make({ pod: "relief" }), "miyamoto-cutaway": make({ pod: "relay", cut: true }), "miyamoto-no-collar": make({ pod: "relay", bare: true }), ariake: make({ pod: "survey", sister: true }), "ariake-cutaway": make({ pod: "survey", sister: true, cut: true }) };
})();
