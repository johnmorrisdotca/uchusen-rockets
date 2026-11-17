// The Auxiliary Transfer Craft (ATC): the small craft the fleet's ships share. This package's own designs, so every figure is blank and says it is a design. Names come from one map (`ATC_NAMES`).
import { ATC, ATC_NAMES, specRows, type AtcId } from "../model/fleet/craft/index.ts";
import { blank, type Inspector, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(2))} m, as designed`;

/** Where the cutaway part stands beside the shell, metres across. */
export const INSIDE_OFFSET = 10;

const at = (x: number, y: number, z: number) => [x, y, z] as const;

const inspector = (id: AtcId, slot: string, sections: Inspector["sections"], notes: Inspector["notes"], insideSlot?: string): Inspector => ({
  sections,
  places: insideSlot ? { [slot]: [0, 0, 0], [insideSlot]: [INSIDE_OFFSET, 0, 0] } : { [slot]: [0, 0, 0] },
  spec: specRows(id),
  notes,
  insets: insideSlot ? [{ id: "cabin", name: "Cabin", slots: [insideSlot], target: at(INSIDE_OFFSET, 8, 0), direction: at(0, 0.2, 1), distance: 14, parts: [] }] : [],
});

const shuttle = ATC["crew-shuttle"];
if (!shuttle) throw new Error("ATC craft are missing");

/** The variants built so far: the crew shuttle. */
export const ATC_VARIANTS: readonly Variant[] = [
  {
    id: "crew-shuttle",
    rocket: "fleet-atc",
    name: ATC_NAMES["crew-shuttle"].name,
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots: ["shuttle", "shuttle-inside"],
    note: `${shuttle.role}. A white pressure cabin on a service section, four thruster quads and a class M docking collar at the nose. The cutaway stands beside it.`,
    inspector: inspector(
      "crew-shuttle",
      "shuttle",
      [
        { id: "collar", name: "Docking collar, class M", job: "Mates a class M port: the 6 m ring on the standard's bolt circle", slot: "shuttle", at: at(0, 13, 0), inside: false },
        { id: "cabin", name: "Crew cabin", job: "Six couches, a console and the vestibule to the collar", slot: "shuttle-inside", at: at(INSIDE_OFFSET, 8, 0), inside: true },
        { id: "quads", name: "Thruster quads", job: "Four quads of four small bells, for attitude and short moves", slot: "shuttle", at: at(2.3, 3, 2.3), inside: false },
        { id: "engine", name: "Main engine", job: "One engine for transfers between ships", slot: "shuttle", at: at(0, -0.5, 0), inside: false },
        { id: "radiators", name: "Radiator bands", job: "Four wrapped bands on the service section", slot: "shuttle", at: at(3.4, 2.3, 0), inside: false },
      ],
      { propulsion: ["One main engine and four thruster quads."], construction: [`A round cabin and a service section. Descends from ${shuttle.ancestor}.`], history: [], equipment: ["Class M docking collar.", "Six couches, a console.", "Side hatch with a handwheel."] },
      "shuttle-inside",
    ),
    view: { tiltMax: 90 },
    facts: { height: fiction(metres(shuttle.envelope.long)), diameter: fiction(metres(Math.max(shuttle.envelope.across, shuttle.envelope.deep))), parts: { shuttle: fiction(metres(shuttle.envelope.long)), "shuttle-inside": fiction(metres(shuttle.envelope.long)) }, engines: {}, more: {} },
  },
];
