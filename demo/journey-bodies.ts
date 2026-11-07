// The journey's places, from wakusei-planets: the planets and the Moon, with their real positions (JPL's approximate elements, good to about an arc minute).
import { BODIES, heliocentric, moonGeocentric, PLANET_IDS, type HostId } from "@johnmorrisdotca/wakusei-planets";
import type { BodySource, Stop } from "../src/journey/index.ts";

const IDS = ["mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune"] as const;

const stops: Stop[] = [
  ...IDS.map((id) => {
    const facts = BODIES[id];
    return { id, name: facts.name, kind: facts.kind, ...(facts.parent ? { parent: facts.parent } : {}), radiusKm: facts.radiusKm, colour: facts.colour };
  }),
  { id: "beyond", name: { en: "Past the solar system", ja: "太陽系の外" }, kind: "beyond", radiusKm: 0, colour: "#9fb4d4" },
];

/** The places the journey page offers, from wakusei-planets. */
export const WAKUSEI_SOURCE: BodySource = {
  stops,
  positionAu: (id, ms) => heliocentric(id as HostId, ms),
  offsetKm: (id, ms) => {
    if (id !== "moon") throw new Error(`No offset for ${id}`);
    return moonGeocentric(ms);
  },
};

void PLANET_IDS;
