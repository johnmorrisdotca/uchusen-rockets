// ISV 加美鳴 (かみなり) Kaminari, SPX-207, the Interstellar Heavy Transport, as data. Its status stays "fictional" in the data (the .glb exemption keys on it) and is shown nowhere; every figure names the design bible (docs/fleet/ship-02.md) as its source and
// none is a measurement of anything real. Sizes are the model's own; the numbers of the voyage are worked out in src/model/fleet/ship-02/journey.ts.
import { type Figure, type Inspector, type Variant } from "./types.ts";
import { LENGTH } from "../model/fleet/ship-02/dims.ts";
import { SHIP_02_SLOTS, SHIP_02_VARIANT_PARTS } from "../model/fleet/ship-02/index.ts";
import { SECTIONS } from "../model/fleet/ship-02/sections.ts";
import { DECKS, ENGINE_CARDS, HULL_STACK_RING, INSETS, NOTES, SPEC } from "../model/fleet/ship-02/specs.ts";

const S = "uchusen-fleet-ship-02" as const;
const fig = (value: number, note?: string): Figure => ({ value, source: S, ...(note ? { note } : {}) });

/** What to call each slot of the ship in the picker, from the ship's own table. */
export const SHIP_02_SLOT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(SHIP_02_SLOTS.map((slot) => [slot.slot, slot.name]));

export const SHIP_02_LENGTH: Figure = fig(LENGTH, "Tail to the tip of the bow mast.");

const wording = (value: string, note?: string): Figure<string> => ({ value, source: S, ...(note ? { note } : {}) });

const t = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} million t` : `${Math.round(n).toLocaleString("en-US")} t`);

/** Replace a shell by its inside part where an inset has cut the ship open, so the viewer shows the inside without a cut. */
const viewerSlots = (slots: readonly string[], cut: boolean): string[] => {
  const insides = new Set(slots.filter((s) => s.endsWith("-inside")).map((s) => s.replace("-inside", "")));
  return slots.filter((s) => !cut || !(insides.has(s) || (s.startsWith("habitat-") && !s.endsWith("inside") && slots.includes("habitat-inside"))));
};

const INSPECTOR: Inspector = {
  sections: SECTIONS.map((x) => ({ id: x.id, name: x.name, job: x.job, slot: x.slot, at: x.at, inside: Boolean(x.inside) })),
  places: Object.fromEntries(SHIP_02_SLOTS.map((slot) => [slot.slot, slot.at])),
  spec: [
    ["Name", "ISV 加美鳴 (かみなり) Kaminari, \"thunder\""],
    ["Role", "大型輸送船, large transport ship"],
    ["Designation", "SPX-207 · IHT class (Interstellar Heavy Transport)"],
    ["Operator", "SPX"],
    ["Drive", "FTD, Fusion Torch Drive, 8 nozzles"],
    ["Computer", "KAZE core v4"],
    ["Small craft", "ATC (Auxiliary Transfer Craft)"],
    ["Status", "Planned: first flight 2520"],
    ["Length", `${SPEC.length.toLocaleString("en-US")} m`],
    ["Beam (radiators out)", `${SPEC.beam} m (${SPEC.beamRadiatorsOut} m)`],
    ["Dry mass", t(SPEC.dryMassT)],
    ["Full mass", t(SPEC.fullMassT)],
    ["Crew", `${SPEC.crewNominal} (max ${SPEC.crewMax})`],
    ["Passengers", SPEC.passengers.toLocaleString("en-US")],
    ["Cargo", `${t(SPEC.cargoT)}, ${SPEC.containers} containers`],
    ["Propellant", `${t(SPEC.propellantT)} of ${t(SPEC.tankCapacityT)}`],
    ...ENGINE_CARDS.map((c): [string, string] => [c.name, `${c.count} x ${(c.thrustEachN / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })} MN, Isp ${Math.round(c.isp).toLocaleString("en-US")} s`]),
    ["Main thrust", `${(SPEC.mainThrustN / 1e9).toFixed(2)} GN at full mass`],
    ["Manoeuvring thrust", `${SPEC.maneuverThrustN / 1e6} MN (verniers)`],
    ["Acceleration", `${SPEC.maxG} g`],
    ["Cruise / top speed", `${SPEC.cruiseC.toFixed(3)} c / ${SPEC.topC} c`],
    ["Proxima, 4.37 ly", `${SPEC.proxima.shipYears.toFixed(1)} y on board, ${SPEC.proxima.earthYears.toFixed(1)} y Earth`],
    ["Range, full payload", `${SPEC.rangeLy} ly`],
    ["Endurance", `${SPEC.enduranceYears} years sealed`],
    ["Hull layers (crew rings)", `${HULL_STACK_RING.length}, outside to inside: ${HULL_STACK_RING.map((l) => `${l.n} ${l.name} ${l.thicknessM} m`).join("; ")}`],
    ["Decks", `${DECKS.length}, bow to stern`],
  ],
  notes: { propulsion: NOTES.propulsion, construction: NOTES.construction, history: NOTES.history, equipment: NOTES.equipment },
  insets: INSETS.map((i) => ({
    id: i.id,
    name: i.name,
    slots: viewerSlots(i.slots, i.cut !== undefined),
    target: i.view.target,
    direction: i.view.from,
    distance: i.view.dist,
    parts: i.parts.map((p) => ({ n: p.n, name: p.name, at: p.at, slot: "" })),
  })),
};

const STANDARD: Variant = {
    id: "fleet-02",
    rocket: "fleet-02",
    name: "ISV 加美鳴 (かみなり) Kaminari, SPX-207",
    status: "fictional",
    firstWord: "Planned first flight",
    firstFlight: { value: "2520", source: S, note: "Planned first flight." },
    slots: SHIP_02_SLOTS.map((slot) => slot.slot),
    note: "An original SPX fleet design, drawn in code from the table of numbers in docs/fleet/ship-02.md. The inside parts are the cutaway's contents: show one alone to see it.",
    inspector: INSPECTOR,
    facts: {
      height: SHIP_02_LENGTH,
      diameter: fig(410, "The bow shield, the widest part of the hull. With both radiator wings out the ship is 910 m across."),
      parts: Object.fromEntries(SHIP_02_SLOTS.map((slot) => [slot.slot, fig(slot.height)])),
      engines: { "drive-engines": wording("8 fusion torch nozzles, 4 vernier clusters", "See the design bible for the mechanism and its limits.") },
      more: {
        designation: wording("SPX-207", "Interstellar Heavy Transport."),
        "dry mass, tonnes": fig(1_100_000, "Design target."),
        "full mass, tonnes": fig(8_450_000, "With 1,000,000 t of payload and 6,350,000 t of propellant."),
        "width with radiators out, m": fig(910),
        crew: fig(640),
        passengers: fig(60000, "24,000 awake in two rings and 36,000 in cold-sleep berths."),
      },
    },
  };

const NAMES: Readonly<Record<string, [string, string]>> = {
  "fleet-02-survey": ["ISV 加美鳴 (かみなり) Kaminari, SPX-207, survey configuration", "Survey pod on the dorsal mount, laboratory pod underneath, relay masts on the wing tips: the same ship for mapping a system."],
  "fleet-02-tanker": ["ISV 加美鳴 (かみなり) Kaminari, SPX-207, tanker configuration", "Tanker pod on the dorsal mount, cargo pod underneath, a tug on each wing tip: the same ship for fuelling a station."],
  "fleet-02-rescue": ["ISV 加美鳴 (かみなり) Kaminari, SPX-207, rescue configuration", "Settlement pod as a refuge on the dorsal mount, rescue pod underneath, a tug on each wing tip: the same ship for an evacuation."],
};

const STANDARD_PARTS = Object.fromEntries(SHIP_02_SLOTS.map((s) => [s.slot, `fleet-02-fleet-02-${s.slot}`]));

export const SHIP_02_VARIANTS: readonly Variant[] = [
  STANDARD,
  ...Object.entries(SHIP_02_VARIANT_PARTS).map(([id, swaps]): Variant => ({
    ...STANDARD,
    id,
    name: NAMES[id][0],
    note: NAMES[id][1],
    partIds: { ...STANDARD_PARTS, ...swaps },
  })),
];
