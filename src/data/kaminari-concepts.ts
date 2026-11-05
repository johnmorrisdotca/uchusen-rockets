// Three ships from the concept hulls. A is the public ISV Kaminari (the Quiver). B is ISV Emiake. C is ISV Romaryū. The first Kaminari hull is a rocket of its own.
// Their status stays "fictional" in the data (the .glb exemption keys on it) and is shown nowhere; every figure names the write-up (docs/fleet/kaminari-concepts.md) as its source and none is a measurement of anything real.
import { BERTHS, CONCEPT_KEYS, CONCEPT_SLOTS, EMIAKE_DEPLOYED, ROCKET_OF, SPECS, type ConceptKey } from "../model/fleet/kaminari-concepts/index.ts";
import { type Figure, type Inspector, type Variant } from "./types.ts";

const S = "uchusen-fleet-kaminari-concepts" as const;
const fig = (value: number, note?: string): Figure => ({ value, source: S, ...(note ? { note } : {}) });
const wording = (value: string, note?: string): Figure<string> => ({ value, source: S, ...(note ? { note } : {}) });
const t = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} million t` : `${Math.round(n).toLocaleString("en-US")} t`);
const n = (v: number, digits = 0): string => v.toLocaleString("en-US", { maximumFractionDigits: digits });

const ENGINE_SLOTS: Readonly<Record<ConceptKey, readonly string[]>> = { a: ["thrusters"], b: ["thrusters"], c: ["centre-drive", "pods"] };

const PUBLIC: Readonly<Record<ConceptKey, { name: string; designation: string; plain: string; ja: string }>> = {
  a: { name: "ISV 加美鳴 Kaminari, SPX-207", designation: "SPX-207", plain: "The Quiver is the public ship.", ja: "加美鳴 かみなり" },
  b: { name: "ISV 笑明 Emiake, SPX-109", designation: "SPX-109", plain: "Smiling dawn.", ja: "笑明 えみあけ" },
  c: { name: "ISV 羅馬龍 Romaryū, SPX-118", designation: "SPX-118", plain: "Dragon of Rome.", ja: "羅馬龍 ローマりゅう" },
};

const inspectorOf = (key: ConceptKey): Inspector => {
  const spec = SPECS[key];
  const slots = CONCEPT_SLOTS[key];
  return {
    sections: slots.map((slot) => ({ id: slot.slot, name: slot.name, job: slot.note, slot: slot.slot, at: [slot.at[0], slot.at[1] + slot.height / 2, slot.at[2]] as const, inside: false })),
    places: Object.fromEntries(slots.map((slot) => [slot.slot, slot.at])),
    spec: [
      ["Name", `${PUBLIC[key].name} · ${PUBLIC[key].plain}`],
      ["Name in Japanese", PUBLIC[key].ja],
      ["Designation", `${PUBLIC[key].designation} · IHT class (Interstellar Heavy Transport)`],
      ["Operator", "SPX"],
      ["Length", `${n(spec.length)} m at full size`],
      ["Beam, hull", `${n(spec.beamHull)} m`],
      ["Beam, overall", `${n(spec.beamOverall)} m`],
      ["Dry mass", t(spec.dryT)],
      ["Full mass", t(spec.fullT)],
      ["Propellant", `${t(spec.propellantT)} in ${spec.tanks} tanks`],
      ["Cargo", spec.containers ? `${t(spec.cargoT)}, ${spec.containers} containers` : "four Miyamoto-size craft"],
      ["Drive", spec.thrusters.layout],
      ["Reactor cells", String(spec.reactorCells)],
      ["Main thrust", `${n(spec.thrustN / 1e6)} MN at full mass`],
      ["Acceleration", `${spec.accelG.toFixed(3)} g`],
      ["Delta-v, all propellant", `${spec.deltaVC.toFixed(2)} c`],
      ["Proxima, 4.37 ly", `${spec.proximaShipYears.toFixed(1)} y on board`],
      ["Crew and passengers", "640 crew, 60,000 passengers"],
      ["Crewed modules", spec.crewedModules],
      ["Status", "Planned: first flight 2520"],
    ],
    notes: {
      propulsion: [`${spec.thrusters.layout}.`, "Many small magnetic-nozzle thrusters, no scaled-up bell: each thruster is a ceramic plasma chamber, superconducting booster coils and six separate field-coil rings that shape the exhaust.", `Thrust is the same rule for all three concepts: each reactor cell gives 6 PW of heat, half of it reaches the exhaust, and the exhaust leaves at 0.4 c. ${spec.reactorCells} cells give ${n(spec.thrustN / 1e6)} MN.`],
      construction: [spec.idea, ...spec.ancestors.map((a) => `Descends from ${a}.`)],
      history: ["Three hulls for a ship about 1.8 km long. The beam of a round tube was too wide, so the Quiver, the keel and the carrier are three ships.", "The first Kaminari hull is kept, and is opened by address as fleet-02-original. It is not in the Rocket list."],
      equipment: slots.map((slot) => `${slot.name}: ${slot.note}`),
      docking: BERTHS[key].map((port) => `${port.name}: collar ${port.collar}, ${port.accepts}, at ${port.at.map((n) => n.toFixed(0)).join(" ")} m, faces ${port.direction.join(" ")}, for ${port.craft.join(" and ")}.`),
    },
    insets: [],
  };
};

const NOTES: Readonly<Record<ConceptKey, string>> = {
  a: "ISV Kaminari, the Quiver: thinner cylinders. One long truss carries rings of slim propellant tanks like the barrels of a revolver, rings of cargo containers, reactor cells and two counter-rotating carousels of slim habitat drums. The drive is a ring array of 19 magnetic-nozzle thrusters behind a stack of fusion coil rings. Visiting craft berth on the open truss, outside the hull. Use the size slider to try 60 to 100 per cent.",
  b: "ISV Emiake, smiling dawn: a hull that is not a tube. A flattened wedge built like a ship: an armoured keel, six longerons and ribs every 30 m, open aft where the slim tanks and containers lie in rows, plated forward where the crew's town sits under a glazed gallery. Three radiator sails stand on the dorsal ridge; the outer two swing down and out, and the middle stays up. The drive is a grid of 27 magnetic-nozzle thrusters across the stern. Visiting craft berth outside the hull. Use the size slider to try 60 to 100 per cent.",
  c: "ISV Romaryū, dragon of Rome: a spine with four Miyamoto-size craft docked round it in two pairs, ISV Miyamoto's own model at its true size, and SpaceX craft berthed outside the shaft beside them. Two stations of propellant barrels aft, two counter-rotating habitat rings, and a drive of four flank pods of seven magnetic-nozzle thrusters with one large thruster on the axis. Use the size slider to try 60 to 100 per cent.",
};

const variantOf = (key: ConceptKey): Variant => {
  const spec = SPECS[key];
  const slots = CONCEPT_SLOTS[key];
  return {
    id: spec.id,
    rocket: ROCKET_OF[key],
    name: PUBLIC[key].name,
    status: "fictional",
    firstWord: "Planned first flight",
    firstFlight: { value: "2520", source: S, note: "Planned first flight." },
    slots: slots.map((slot) => slot.slot),
    note: NOTES[key],
    inspector: inspectorOf(key),
    facts: {
      height: fig(spec.length, "Tail to the tip of the bow shield, at full size."),
      diameter: fig(spec.beamOverall, "The widest part, at full size."),
      parts: Object.fromEntries(slots.map((slot) => [slot.slot, fig(slot.height)])),
      engines: Object.fromEntries(ENGINE_SLOTS[key].map((slot) => [slot, wording(spec.thrusters.layout, "Magnetic-nozzle thrusters: no scaled-up bell.")])),
      more: {
        designation: wording(PUBLIC[key].designation, "Interstellar Heavy Transport."),
        "dry mass, tonnes": fig(Math.round(spec.dryT), "Design target."),
        "full mass, tonnes": fig(Math.round(spec.fullT), "With the propellant, the cargo and the people."),
        "main thrust, MN": fig(Math.round(spec.thrustN / 1e6)),
        "width, m": fig(spec.beamOverall),
        crew: fig(640),
        passengers: fig(60000),
      },
    },
  };
};

/** One variant list for each ship. Emiake has a second variant with the outer sails deployed. */
const deployedSails = (): Variant => {
  const stowed = variantOf("b");
  const slots = CONCEPT_SLOTS.b;
  return {
    ...stowed,
    id: EMIAKE_DEPLOYED,
    name: `${stowed.name}, radiator sails deployed`,
    note: `${stowed.note} This variant has the outer two sails swung down and out.`,
    partIds: Object.fromEntries(slots.map((slot) => [slot.slot, `${ROCKET_OF.b}-${slot.slot === "fin-port" || slot.slot === "fin-starboard" ? EMIAKE_DEPLOYED : stowed.id}-${slot.slot}`])),
    inspector: stowed.inspector ? { ...stowed.inspector, spec: [...stowed.inspector.spec, ["Radiator sails", "Outer two deployed, middle stowed"]] } : undefined,
  };
};

/** One variant list for each ship. Emiake has a second variant with the outer sails deployed. */
export const KAMINARI_VARIANTS: Readonly<Record<ConceptKey, readonly Variant[]>> = { a: [variantOf("a")], b: [variantOf("b"), deployedSails()], c: [variantOf("c")] };

/**
 * The three ships' variants: Kaminari, Emiake and its deployed sails, then Romaryū.
 *
 * @example
 * ```ts
 * import { KAMINARI_CONCEPT_VARIANTS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(KAMINARI_CONCEPT_VARIANTS.map((variant) => variant.id));
 * ```
 */
export const KAMINARI_CONCEPT_VARIANTS: readonly Variant[] = CONCEPT_KEYS.flatMap((key) => KAMINARI_VARIANTS[key]);

/** What to call each slot of the concepts in the picker: one name for a slot, whichever concept it is in. */
export const CONCEPT_SLOT_NAMES: Readonly<Record<string, string>> = {
  thrusters: "Drive: magnetic-nozzle thrusters",
  "centre-drive": "Axis thruster",
  pods: "Flank drive pods",
  "drive-bay": "Engine bay and thrust plate",
  bulkhead: "Thrust bulkhead",
  reactors: "Reactor cells",
  "coil-stack": "Coil stack and reactor cells",
  radiators: "Radiator fins",
  "fin-port": "Port radiator sail",
  "fin-centre": "Centre radiator sail",
  "fin-starboard": "Starboard radiator sail",
  visiting: "Visiting craft",
  carousel: "Habitat carousel",
  "carousel-a": "Habitat carousel A",
  "carousel-b": "Habitat carousel B",
  rings: "Habitat rings",
  frame: "Ribs and longerons",
  keel: "Armoured keel girder",
  ridge: "Dorsal ridge truss",
  "plated-hull": "Plated forward hull",
  gallery: "Glazed gallery",
  bridge: "Bridge tower",
  nose: "Nose and dust shield",
  bow: "Crew bow",
  barrels: "Propellant barrels",
  shaft: "Shaft: truss and transit tube",
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`quiver-${i}`, `Tank quiver ${i}`])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`cargo-${i}`, `Cargo ring ${i}`])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`tanks-${i}`, `Tank group ${i}`])),
  ...Object.fromEntries([1, 2, 3, 4].map((i) => [`miyamoto-${i}`, `Docked craft ${i}`])),
  ...Object.fromEntries([1, 2, 3, 4].map((i) => [`cradle-${i}`, `Docking cradle ${i}`])),
};
