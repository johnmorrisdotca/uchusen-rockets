// What the review gate asks of every craft, as data: the labelled sections, the propulsion card, the hull stack it uses and the places its extra parts (the cabin cutaway, the engine on its own, the hull layers)
// stand beside it. A figure here is blank or a metre "as designed": the engines' thrust and the stacks' thicknesses are this package's own design, with no source. Pure: no three.js and no DOM.
import type { AtcId } from "./names.ts";
import type { HullStack, HullLayer } from "../layers.ts";

/** A labelled section: where a label points on the craft, in the craft's own metres, and whether it is inside the cutaway. */
export interface CraftSection {
  id: string;
  name: string;
  job: string;
  at: readonly [number, number, number];
  inside?: boolean;
}

/** One numbered sub-part of a propulsion card. */
export interface CardPart {
  n: number;
  name: string;
  job: string;
}

/** A propulsion card: the engine kind a craft carries, how many, its parts drawn on its own, and the figures a source would give (blank here). */
export interface PropulsionCard {
  id: string;
  name: string;
  count: number;
  /** What it burns, in words, or null when the design does not say. */
  propellant: string | null;
  /** How it works, in a line. */
  operation: string;
  parts: readonly CardPart[];
}

/** The engine's parts, the same six for every bell: what the card draws and numbers. */
const BELL_PARTS: readonly CardPart[] = [
  { n: 1, name: "Bell", job: "Turns the hot gas into a jet" },
  { n: 2, name: "Throat", job: "The narrowest part, where the flow reaches the speed of sound" },
  { n: 3, name: "Chamber", job: "Where the propellants burn" },
  { n: 4, name: "Feed manifolds", job: "Two round pipes bring fuel and oxidiser to the injector" },
  { n: 5, name: "Injector plate", job: "Sprays the propellants into the chamber" },
  { n: 6, name: "Gimbal", job: "A ring and two actuators that tilt the engine for steering" },
];
const JET_PARTS: readonly CardPart[] = [
  { n: 1, name: "Nozzle", job: "A small bell that points the jet" },
  { n: 2, name: "Valve", job: "Opens and shuts the gas in short pulses" },
  { n: 3, name: "Manifold", job: "One round pipe feeds all four nozzles of a quad" },
  { n: 4, name: "Housing", job: "Holds the four nozzles on the craft's frame" },
];

/** The propulsion cards of the family. Their thrust and specific impulse are blank: no source gives them for a design that does not exist. */
export const PROPULSION: Readonly<Record<AtcId, PropulsionCard>> = {
  "crew-shuttle": { id: "main", name: "Main engine", count: 1, propellant: null, operation: "Continuous for a transfer burn, with four thruster quads for attitude and short moves", parts: BELL_PARTS },
  "cargo-tug": { id: "main", name: "Four engines", count: 4, propellant: null, operation: "Continuous, throttled; four thruster quads for attitude and docking", parts: BELL_PARTS },
  "rescue-cutter": { id: "main", name: "Main engine", count: 1, propellant: null, operation: "Continuous for a transfer burn, with four thruster quads for attitude and short moves", parts: BELL_PARTS },
  "survey-lander": { id: "descent", name: "Descent engine", count: 1, propellant: null, operation: "Throttled for a landing, with four thruster quads for attitude", parts: BELL_PARTS },
  "survey-drone": { id: "jets", name: "Cold-gas jets", count: 4, propellant: null, operation: "Pulsed: a short opening of a valve for each push", parts: JET_PARTS },
  "eva-pod": { id: "quads", name: "Thruster quads", count: 4, propellant: null, operation: "Pulsed: a hand controller opens the valves for each push", parts: JET_PARTS },
};

const layer = (n: number, id: HullLayer["id"], name: string, material: HullLayer["material"], made: string, mm: number, note: string): HullLayer => ({ n, id, name, material, made, mm, note });

/**
 * The hull stacks of the small craft, outside in, in millimetres: this package's own design, so no figure has a source. They are thin by nature (a small craft stays near its ship), so they sit apart from the ships'
 * `HULL_STACKS`, whose rules (an ablative skin outside, a pressure hull, a stack more than 0.2 m deep) do not suit a craft.
 */
export const CRAFT_STACKS: Readonly<Record<"craft" | "probe", HullStack>> = {
  craft: {
    role: "Crewed small craft",
    why: "A thin shell for a craft that stays near its ship: a blanket, one bumper, a foam layer and a pressure wall, with the crew's lining inside.",
    layers: [
      layer(1, "whipple", "Blanket", "foil", "multi-layer foil blanket", 12, "Sheds heat and stops dust."),
      layer(2, "whipple", "Bumper", "hull-grey", "thin aluminium sheet, spaced", 30, "Turns a grain to vapour."),
      layer(3, "foam", "Foam absorber", "foam", "aluminium foam", 25, "Takes the rest."),
      layer(4, "pressure", "Pressure hull", "hull-white", "aluminium-lithium shell", 8, "Holds the air in."),
      layer(5, "frame", "Frame", "hull-grey-dark", "ring frames and stringers", 60, "Carries the loads of thrust and docking."),
      layer(6, "lining", "Interior lining", "hull-white-worn", "padded panels on cable runs", 15, "What the crew sees."),
    ],
  },
  probe: {
    role: "Uncrewed small craft",
    why: "A light skin: a blanket, one bumper and a frame, because nobody breathes inside and the craft's mass is its range.",
    layers: [
      layer(1, "whipple", "Blanket", "foil", "multi-layer foil blanket", 10, "Sheds heat and stops dust."),
      layer(2, "whipple", "Bumper", "hull-grey", "thin aluminium sheet", 20, "Turns a grain to vapour."),
      layer(3, "frame", "Frame", "hull-grey-dark", "carbon-fibre ribs", 40, "Holds the shape and the loads."),
    ],
  },
};

/** Which hull stack a craft's cutaway shows: a crewed craft's pressure shell or an uncrewed craft's lighter skin. */
export const STACK_OF: Readonly<Record<AtcId, "craft" | "probe">> = { "crew-shuttle": "craft", "cargo-tug": "probe", "rescue-cutter": "craft", "survey-lander": "probe", "survey-drone": "probe", "eva-pod": "craft" };

const at = (x: number, y: number, z: number) => [x, y, z] as const;

/** The labelled sections of each craft, nose to tail: at least one label to every 5 per cent of its length. */
export const SECTIONS: Readonly<Record<AtcId, readonly CraftSection[]>> = {
  "crew-shuttle": [
    { id: "collar", name: "Docking collar, class M", job: "Mates a class M port: the 6 m ring on the standard's bolt circle", at: at(0, 13, 0) },
    { id: "cabin", name: "Crew cabin", job: "Six couches, a console and the vestibule to the collar", at: at(0, 8, 0), inside: true },
    { id: "windows", name: "Windows", job: "Four round windows at the couches' height", at: at(2.6, 9.4, 1.5) },
    { id: "hatch", name: "Side hatch", job: "A round hatch with a handwheel, for a transfer by hand", at: at(0, 6.6, -3) },
    { id: "whips", name: "Antennas", job: "Two whips on the nose for ship-to-craft radio", at: at(1.1, 13.5, 0.2) },
    { id: "radiators", name: "Radiator bands", job: "Four wrapped bands on the service section", at: at(3.4, 2.3, 0) },
    { id: "quads", name: "Thruster quads", job: "Four quads of four small bells, for attitude and short moves", at: at(2.3, 3, 2.3) },
    { id: "engine", name: "Main engine", job: "One engine for transfers between ships", at: at(0, -0.5, 0) },
  ],
  "cargo-tug": [
    { id: "collar", name: "Docking collar, class L", job: "Mates a container's end frame and the L ports of the ships", at: at(0, 18, 0) },
    { id: "nose-frame", name: "Nose frame", job: "Four struts spread the collar's load into the keel", at: at(2.6, 17.4, 2.6) },
    { id: "arms", name: "Grapple arms", job: "Two three-segment arms folded along the keel, for the clamps and the cell frames", at: at(3, 11, 1) },
    { id: "radiators", name: "Radiator panels", job: "Two panels on booms that shed the engines' heat", at: at(0, 10, 3.1) },
    { id: "keel", name: "Keel truss", job: "Square truss of round chords and diagonals that carries every load", at: at(0, 9, 0) },
    { id: "tanks", name: "Propellant tanks", job: "Two domed tanks on saddle straps", at: at(4.9, 9, 0) },
    { id: "quads", name: "Thruster quads", job: "Four quads at the tail for attitude and docking", at: at(2.5, 2.5, 2.5) },
    { id: "thrusters", name: "Engine block", job: "Four engines on a thrust plate at the tail", at: at(0, 1, 0) },
  ],
  "rescue-cutter": [
    { id: "collar", name: "Docking collar, class M", job: "Mates a class M port: the 6 m ring on the standard's bolt circle", at: at(0, 16.6, 0) },
    { id: "bands", name: "Rescue bands", job: "Two orange bands that say what it is from a distance", at: at(3, 12.8, 0) },
    { id: "cabin", name: "Stretcher decks", job: "Two decks, each with two cots, a medic's seat and a console", at: at(0, 8, 0), inside: true },
    { id: "windows", name: "Windows", job: "Eight round windows, four to each deck", at: at(2.6, 11.6, 1.5) },
    { id: "lock", name: "Side lock", job: "A tube out of the side, 1.4 m across, for a hand-to-hand transfer", at: at(3.9, 8.7, 0) },
    { id: "hatch", name: "Cabin hatch", job: "A round hatch with a handwheel", at: at(0, 9.4, -3) },
    { id: "floods", name: "Floodlights", job: "Two lamps that light a casualty on the hull", at: at(2.1, 13.8, 2.1) },
    { id: "hook", name: "Tow hook", job: "An eye on an arm below the service section, with a safety latch", at: at(0, 0.8, -4.4) },
    { id: "quads", name: "Thruster quads", job: "Four quads of four small bells", at: at(2.3, 3, 2.3) },
    { id: "engine", name: "Main engine", job: "One engine for the run to a ship", at: at(0, -0.5, 0) },
  ],
  "survey-lander": [
    { id: "collar", name: "Docking collar, class S", job: "Mates a class S port: the 3 m ring", at: at(0, 7, 0) },
    { id: "dish", name: "Dish and mast", job: "A dish on a pole for the link to the ship", at: at(0.9, 7.3, -0.3) },
    { id: "cabin", name: "Ascent cabin", job: "A round cabin with two windows, over the descent stage", at: at(0, 4.8, 0) },
    { id: "quads", name: "Thruster quads", job: "Four blocks of bells on the cabin's shoulder", at: at(1.3, 3.9, 1.3) },
    { id: "stage", name: "Descent stage", job: "An eight-sided drum in gold foil that holds the tanks", at: at(0, 2.6, 0) },
    { id: "arm", name: "Sample arm", job: "A shoulder, two joints and a scoop, folded to the stage's side", at: at(3.6, 2.2, -2.5) },
    { id: "legs", name: "Legs", job: "Four splayed legs of a main strut and two braces", at: at(3.5, 1.8, 0) },
    { id: "engine", name: "Descent engine", job: "One throttled engine under the stage", at: at(0, 0.8, 0) },
    { id: "pads", name: "Footpads", job: "Four round pads with a probe each", at: at(4.2, 0.1, 0) },
  ],
  "survey-drone": [
    { id: "dish", name: "Dish", job: "A small dish for the link to the ship", at: at(0, 1.45, 0) },
    { id: "boom", name: "Instrument boom", job: "A boom out of the side with a magnetometer and a sensor head", at: at(0.7, 0.9, 0) },
    { id: "camera", name: "Camera and spectrometer", job: "A camera and a spectrometer port on the face", at: at(0, 0.7, 0.4) },
    { id: "body", name: "Body", job: "A round drum that holds the computer and the battery", at: at(0, 0.75, 0) },
    { id: "pods", name: "Cold-gas pods", job: "Four small tanks with a jet each", at: at(0.5, 0.6, 0) },
    { id: "clamp", name: "Clamp bar", job: "The bar a cradle's clamp takes hold of", at: at(0, 0.15, 0) },
  ],
  "eva-pod": [
    { id: "collar", name: "Docking collar, class S", job: "Mates a class S port: the 3 m ring", at: at(0, 3.5, 0) },
    { id: "neck", name: "Neck", job: "A short tube from the cab's hatch to the collar", at: at(0, 3.0, 0) },
    { id: "cab", name: "Cab", job: "A round cab with a seat, a hand controller and a display", at: at(0, 1.7, 0), inside: true },
    { id: "windows", name: "Window ring", job: "A band of window round the cab, for the view to the work", at: at(0, 1.85, 1.0) },
    { id: "arms", name: "Arms", job: "Two three-segment arms with grippers, folded to the sides", at: at(1.4, 1.5, 0.5) },
    { id: "frame", name: "Frame", job: "Four round posts and rings that carry the loads", at: at(1.15, 1.5, 1.15) },
    { id: "tray", name: "Tool tray", job: "A tray with the tools, within the arms' reach", at: at(0, 0.15, 0.9) },
    { id: "quads", name: "Thruster quads", job: "A quad on each lower corner", at: at(1.15, 0.2, 1.15) },
  ],
};

/** The gap between a craft and the part that stands beside it, metres: a little more than the craft's width. */
export const gapOf = (across: number): number => Math.ceil(across) + 3;

/** Where each extra part of a craft stands, as an offset along X: the cutaway to the starboard, the engine card to port, the hull layers beyond the cutaway (or beside the craft when it has none). */
export const placeOf = (across: number, crewed: boolean): { inside: number; engine: number; layers: number } => {
  const gap = gapOf(across);
  return { inside: gap, engine: -gap, layers: crewed ? 2 * gap : gap };
};
