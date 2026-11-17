// The Auxiliary Transfer Craft (ATC): the small craft the fleet's ships share. This package's own designs, so every figure is blank and says it is a design. Names come from one map (`ATC_NAMES`); the labelled
// sections, the propulsion cards, the hull stacks and where the extra parts stand come from `craft/cards.ts`.
import { ATC, ATC_NAMES, BUILT, specRows, type AtcId } from "../model/fleet/craft/index.ts";
import { CRAFT_STACKS, gapOf, placeOf, PROPULSION, SECTIONS, STACK_OF } from "../model/fleet/craft/cards.ts";
import { ENGINE_CARD, LAYER_SCALE } from "../model/fleet/craft/extras.ts";
import { COLLARS } from "../model/fleet/collars.ts";
import { blank, type Inspector, type InspectorInset, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(2))} m, as designed`;

/** Where the cutaway part of the crew shuttle stands beside the shell, metres across. */
export const INSIDE_OFFSET = gapOf(ATC["crew-shuttle"]?.envelope.across ?? 7);

/** The slot ids of each craft's own part, and the slots of its extra parts. */
export const ATC_SLOT: Readonly<Record<AtcId, string>> = { "crew-shuttle": "shuttle", "cargo-tug": "tug", "rescue-cutter": "cutter", "survey-lander": "lander", "survey-drone": "survey-drone", "eva-pod": "pod" };
export const extraSlot = (id: AtcId, which: "inside" | "engine" | "layers"): string => `${ATC_SLOT[id]}-${which}`;

/** What the picker and the labels call each slot. */
export const ATC_SLOT_NAMES: Readonly<Record<string, string>> = Object.fromEntries(BUILT.flatMap((id) => [[ATC_SLOT[id], ATC_NAMES[id].name.replace(/^ATC /, "").replace(/^./, (c) => c.toUpperCase())], [extraSlot(id, "inside"), `${ATC_NAMES[id].name.replace(/^ATC /, "").replace(/^./, (c) => c.toUpperCase())}, cutaway`], [extraSlot(id, "engine"), `${ATC_NAMES[id].name.replace(/^ATC /, "").replace(/^./, (c) => c.toUpperCase())}, engine card`], [extraSlot(id, "layers"), `${ATC_NAMES[id].name.replace(/^ATC /, "").replace(/^./, (c) => c.toUpperCase())}, hull layers`]]));

const at = (x: number, y: number, z: number) => [x, y, z] as const;

/** The parts of an engine card, where each stands on the card (a bell standing at `x`, or a quad facing +Z). */
function cardParts(id: AtcId, x: number): InspectorInset["parts"] {
  const slot = extraSlot(id, "engine");
  const spots = PROPULSION[id].parts[0].name === "Bell" ? [at(x, 0.9, 1.1), at(x, 1.95, 0.7), at(x, 2.7, 0.7), at(x + 1.3, 4, 0), at(x, 3.0, 0.6), at(x - 1.5, 4.5, 0)] : [at(x + 0.5, 0.4, 1.9), at(x, 0.2, 0.5), at(x, 0, 0.5), at(x - 1.0, 0.6, 0.9)];
  return PROPULSION[id].parts.map((p, i) => ({ n: p.n, name: p.name, at: spots[i], slot }));
}

/** The hull layers at the cut edge of the card's shell, one numbered part to a layer. */
function layerParts(id: AtcId, x: number): InspectorInset["parts"] {
  const slot = extraSlot(id, "layers");
  let outer = 4;
  return CRAFT_STACKS[STACK_OF[id]].layers.map((l) => {
    const thick = (l.mm * LAYER_SCALE) / 1000;
    const mid = outer - thick / 2;
    outer -= thick;
    return { n: l.n, name: l.name, at: at(x + Math.sin(0.5) * mid, 0.8, Math.cos(0.5) * mid), slot };
  });
}

/** One craft's panel: its labelled sections, its places, spec rows, notes and the insets that open on a click. */
function inspector(id: AtcId, notes: Inspector["notes"]): Inspector {
  const craft = ATC[id];
  if (!craft) throw new Error(`ATC craft ${id} is missing`);
  const main = ATC_SLOT[id];
  const w = Math.max(craft.envelope.across, craft.envelope.deep);
  const where = placeOf(w, craft.crewed);
  const places: Record<string, readonly [number, number, number]> = { [main]: at(0, 0, 0), [extraSlot(id, "engine")]: at(where.engine, 0, 0), [extraSlot(id, "layers")]: at(where.layers, 0, 0) };
  if (craft.crewed) places[extraSlot(id, "inside")] = at(where.inside, 0, 0);
  const sections = SECTIONS[id].map((s) => ({ id: s.id, name: s.name, job: s.job, slot: s.inside ? extraSlot(id, "inside") : main, at: s.inside ? at(s.at[0] + where.inside, s.at[1], s.at[2]) : s.at, inside: s.inside === true }));
  const L = craft.envelope.long;
  const insets: InspectorInset[] = [];
  if (craft.crewed) insets.push({ id: "cabin", name: "Cabin", slots: [extraSlot(id, "inside")], target: at(where.inside, L * 0.45, 0), direction: at(0, 0.2, 1), distance: Math.max(6, L * 0.8), parts: [] });
  if (craft.collar) {
    const c = COLLARS[craft.collar];
    const nose = SECTIONS[id][0].at[1];
    const R = c.outer / 2;
    const names: [string, number, number][] = [["Flange ring", R, 0], ["Seal", c.bore / 2, 0.5], ["Hazard blocks", R * 0.7, 1.2], ["Bolts", R * 0.8, 2.2], ["Alignment pins", R * 0.55, 3.5], ["Latch dogs", R, 4.7]];
    insets.push({ id: "collar", name: `Docking collar, class ${craft.collar}`, slots: [main], target: at(0, nose - 0.3, 0), direction: at(0.3, 0.5, 1), distance: Math.max(4, R * 3.2), parts: names.map(([name, r, a], i) => ({ n: i + 1, name, at: at(Math.sin(a) * r, nose, Math.cos(a) * r), slot: main })) });
  }
  insets.push({ id: "engine", name: PROPULSION[id].name, slots: [extraSlot(id, "engine")], target: at(where.engine, 2.2, 0), direction: at(0.4, 0.2, 1), distance: 9, parts: cardParts(id, where.engine) });
  insets.push({ id: "layers", name: "Hull layers", slots: [extraSlot(id, "layers")], target: at(where.layers + 1.2, 0.8, 3.6), direction: at(0.5, 0.1, 1), distance: 5, parts: layerParts(id, where.layers) });
  return { sections, places, spec: [...specRows(id), ...propulsionRows(id), ["Hull layers", `${CRAFT_STACKS[STACK_OF[id]].role}: ${CRAFT_STACKS[STACK_OF[id]].layers.length} layers, shown at ${LAYER_SCALE} times their thickness`]], notes, insets };
}

function propulsionRows(id: AtcId): [string, string][] {
  const card = PROPULSION[id];
  return [["Propulsion", `${card.count} x ${card.name.toLowerCase()}: ${card.operation}`], ["Thrust, specific impulse", "Not given: a design of this package, with no source"]];
}

const variant = (id: AtcId, note: string, notes: Inspector["notes"]): Variant => {
  const craft = ATC[id];
  if (!craft) throw new Error(`ATC craft ${id} is missing`);
  const e = craft.envelope;
  const main = ATC_SLOT[id];
  const slots = [main, ...(craft.crewed ? [extraSlot(id, "inside")] : []), extraSlot(id, "engine"), extraSlot(id, "layers")];
  const parts = Object.fromEntries(slots.map((slot) => [slot, fiction(metres(slot.endsWith("-engine") ? ENGINE_CARD.height : slot.endsWith("-layers") ? 1.6 : e.long))]));
  return {
    id,
    rocket: "fleet-atc",
    name: ATC_NAMES[id].name,
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots,
    note: `${craft.role}. ${note}`,
    inspector: inspector(id, notes),
    view: { tiltMax: 90 },
    facts: { height: fiction(metres(e.long)), diameter: fiction(metres(Math.max(e.across, e.deep))), parts, engines: {}, more: {} },
  };
};

const ancestorOf = (id: AtcId) => ATC[id]?.ancestor ?? "";

/** What each craft's variant says about it: a note, and the notes tabs. */
const WORDS: Readonly<Record<AtcId, { note: string; notes: Inspector["notes"] }>> = {
  "crew-shuttle": { note: "A white pressure cabin on a service section, four thruster quads and a class M docking collar at the nose. The cutaway stands beside it.", notes: { propulsion: ["One main engine and four thruster quads."], construction: [`A round cabin and a service section. Descends from ${ancestorOf("crew-shuttle")}.`], history: [], equipment: ["Class M docking collar.", "Six couches, a console.", "Side hatch with a handwheel."] } },
  "cargo-tug": { note: "A square-truss keel with a class L collar at the nose, two tanks, two grapple arms and a thruster block.", notes: { propulsion: ["Four engines and four thruster quads."], construction: [`A round-tube truss and two tanks. Descends from ${ancestorOf("cargo-tug")}.`], history: [], equipment: ["Class L docking collar.", "Two grapple arms.", "Two radiator panels."] } },
  "rescue-cutter": { note: "A long white-and-orange cabin with two decks of stretcher bays, a side lock for a hand-to-hand transfer, a tow hook and a class M collar. The cutaway stands beside it.", notes: { propulsion: ["One main engine and four thruster quads."], construction: [`A round cabin, longer than the shuttle's, on a service section. Descends from ${ancestorOf("rescue-cutter")}.`], history: [], equipment: ["Class M docking collar.", "Four stretcher cots on two decks.", "Side lock, 1.4 m across.", "Tow hook.", "Two floodlights."] } },
  "survey-lander": { note: "An eight-sided descent stage in gold foil on four legs, a round ascent cabin, a sample arm, a dish and a class S collar.", notes: { propulsion: ["One descent engine and four thruster quads."], construction: [`An eight-sided drum on four legs under a round cabin. Descends from ${ancestorOf("survey-lander")}.`], history: [], equipment: ["Class S docking collar.", "Sample arm with a scoop.", "Dish and whip."] } },
  "survey-drone": { note: "A round instrument body 1.6 m long with a boom, a dish and four cold-gas pods, held by a cradle's clamp. It is a card of its own, apart from the lander's.", notes: { propulsion: ["Four cold-gas jets in pulses."], construction: [`A drum with a boom. Descends from ${ancestorOf("survey-drone")}.`], history: [], equipment: ["Clamp bar.", "Camera and spectrometer.", "Magnetometer on a boom."] } },
  "eva-pod": { note: "A round cab with a window ring in a frame of round tubes, two folded arms, a tool tray, four thruster quads and a class S collar. The cutaway stands beside it.", notes: { propulsion: ["Four thruster quads in pulses."], construction: [`A sphere in a frame of round tubes. Descends from ${ancestorOf("eva-pod")}.`], history: [], equipment: ["Class S docking collar.", "Two arms with grippers.", "Tool tray."] } },
};

/** The craft's variants, in the family's order. */
export const ATC_VARIANTS: readonly Variant[] = BUILT.map((id) => variant(id, WORDS[id].note, WORDS[id].notes));
