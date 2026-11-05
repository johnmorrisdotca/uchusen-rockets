// Which part stands in which slot of each variant of Kyotori V2. The ships' slots come first, tail to bow, then the station's. Pure: no three.js and no DOM.
import { parts, SHIPS } from "./index.ts";
import { STATION } from "./station.ts";

export const KYOTORI_PARTS = parts();
const LONG = ["drive", "shaft", "tanks", "bay", "elevator", "bow", "role", "joints"] as const;
const RUNNER = ["drive", "shaft", "tanks", "crew", "bow", "role", "joints"] as const;

/** For each variant, slot by slot, the id of its part (after `fleet-kyotori-`). `kyotori` is ships A and B docked into the station's housing with the wings fully out and a Dragon and a Starship at the quarters' docks; `-flared` and `-stowed` have the wings in their other two states; `-separated` has the ships away from the station; `-cutaway` opens the four quarters; `-four` is the 2x2 cluster of four ships. */
export const KYOTORI_VARIANT_SLOTS: Readonly<Record<string, Readonly<Record<string, string>>>> = (() => {
  const make = (o: { apart?: boolean; wings?: "stowed" | "flared" | "full"; cut?: boolean; four?: boolean }): Record<string, string> => {
    const sfx = o.apart ? "-apart" : "";
    const ships = o.four ? SHIPS : SHIPS.slice(0, 2);
    return {
      ...Object.fromEntries(ships.flatMap((sh) => (sh.type === "long" ? LONG : RUNNER).map((s) => [`${sh.id}-${s}`, `${sh.id}-${s}${sfx}`]))),
      ...(o.four ? Object.fromEntries(ships.map((sh) => [`${sh.id}-jz`, `${sh.id}-jz`])) : {}),
      "s-core": "s-core",
      "s-housing": "s-housing",
      "s-wings": `s-wings-${o.wings ?? "full"}`,
      "s-visitors": "s-visitors",
      ...Object.fromEntries(STATION.kinds.map((k) => [`s-quarter-${k}`, `s-quarter-${k}${o.cut ? "-cut" : ""}`])),
    };
  };
  const cls = (type: "long" | "runner", role: string): Record<string, string> => ({
    drive: "k-drive",
    tanks: "k-tanks",
    shaft: `k-shaft-${type}`,
    ...(type === "long" ? { bay: "k-bay-long", elevator: "k-elevator-long", bow: "k-bow-long" } : { crew: "k-crew-runner", bow: "k-bow-runner" }),
    role: `k-role-${role}`,
  });
  return { "kyotori-a": cls("long", "survey"), "kyotori-b": cls("runner", "laboratory"), "kyotori-c": cls("long", "astronomy"), "kyotori-d": cls("runner", "crew"), kyotori: make({}), "kyotori-flared": make({ wings: "flared" }), "kyotori-stowed": make({ wings: "stowed" }), "kyotori-separated": make({ apart: true, wings: "stowed" }), "kyotori-cutaway": make({ cut: true }), "kyotori-four": make({ four: true }) };
})();
