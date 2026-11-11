// The Roadster, the car that a Falcon Heavy carried on its test flight with Starman at the wheel, and two models of the second generation of the same car, which has not flown. The first generation's
// sizes are its own article's; the second generation's article gives only its wheelbase and an approximate width. The flight's date, mass and orbit are the launched car's own article's.
import { blank, type Figure, type Variant } from "./types.ts";

const SPACE = "wikipedia-roadster-in-space" as const;
const FIRST = "wikipedia-roadster-first-generation" as const;
const SECOND = "wikipedia-roadster-second-generation" as const;

const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });

/** Starman: a mannequin in a pressure suit, in the driver's seat. No source gives his size: he is drawn at a grown man's size, seated. */
const STARMAN: Figure = blank("A mannequin in a pressure suit, in the driver's seat. No source read here gives its size.", "not given");

const SECOND_FACTS = {
  height: blank("No source read here gives its height. The model, at the sourced wheelbase, stands 1.1 m.", "not given"),
  diameter: m(2, SECOND, { brief: "about", note: "About 79 in, the article's own approximate width. The model, at the sourced wheelbase, is 1.85 m across." }),
  parts: { car: blank("No source read here gives its height."), starman: STARMAN },
  engines: {},
  more: {},
  sizes: { Wheelbase: m(2.825, SECOND, { note: "111.2 in. The model is scaled to it." }) },
};

const SECOND_NOTE = "The second generation has not flown: it was shown as a prototype and has not been produced. Starman sits in it for comparison only. Its length and height have no source here: the model is scaled to the sourced wheelbase. Painted in the first generation's red, so the three compare under one light.";

export const ROADSTER_VARIANTS: readonly Variant[] = [
  {
    id: "first-generation",
    rocket: "roadster",
    name: "First generation, the one in space",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "2018-02-06", source: SPACE, note: "20:45 UTC, on Falcon Heavy's test flight, FH-001, from Kennedy LC-39A." },
    slots: ["car", "starman"],
    note: "The car that flew, with Starman at the wheel, roof off, its bonnet bare carbon. Its article calls it a 2010 car of the first generation; the model is its author's 2008 car of the same generation, scaled to the generation's sourced length, and the years' small differences are not drawn. Starman is this package's own plain shapes in every look; no source gives his size.",
    facts: {
      height: m(1.127, FIRST, { note: "44.4 in, with its roof on. It flew with the roof off: the model, without it, stands 1.07 m." }),
      diameter: m(1.873, FIRST, { note: "73.7 in, its width." }),
      parts: { car: blank("The sourced height is the whole car's, with its roof on."), starman: STARMAN },
      engines: {},
      more: {
        mass: m(1300, SPACE, { brief: "about", note: "About 1,300 kg launched; about 5,900 kg with the upper stage it stayed on." }),
        perihelion: m(0.98613, SPACE, { note: "In astronomical units, epoch 1 May 2018." }),
        aphelion: m(1.6637, SPACE, { note: "In astronomical units, epoch 1 May 2018." }),
        period: m(1.525, SPACE, { note: "In years round the Sun." }),
      },
      sizes: { Length: m(3.946, FIRST, { note: "155.4 in. The model is scaled to it." }), Wheelbase: m(2.352, FIRST, { note: "92.6 in." }) },
    },
  },
  {
    id: "second-generation",
    rocket: "roadster",
    name: "Second generation, not flown",
    status: "announced",
    firstWord: "Shown",
    firstFlight: { value: "2017-11-16", source: SECOND, brief: "shown, not flown", note: "Shown as a prototype. It has not been produced and has not flown." },
    slots: ["car", "starman"],
    note: SECOND_NOTE,
    facts: SECOND_FACTS,
  },
  {
    id: "second-generation-2",
    rocket: "roadster",
    name: "Second generation, another model",
    status: "announced",
    firstWord: "Shown",
    firstFlight: { value: "2017-11-16", source: SECOND, brief: "shown, not flown", note: "Shown as a prototype. It has not been produced and has not flown." },
    slots: ["car", "starman"],
    note: `${SECOND_NOTE} A second model of the same car, by another author, its wheels by a third.`,
    facts: SECOND_FACTS,
  },
];

/** Falcon Heavy as it flew on its test flight: the Roadster and Starman on its upper stage, inside the fairing. */
export const ROADSTER_FLIGHT = {
  id: "test-flight",
  name: "Test flight, with the Roadster",
  firstFlight: { value: "2018-02-06", source: SPACE, note: "20:45 UTC, FH-001, from Kennedy LC-39A." } as Figure<string>,
  note: "The test flight's payload: the Roadster, with Starman at the wheel, on the upper stage inside the fairing. Together, the fairing hides them, as it did; apart, or in space, they show. The car was mounted inclined above its payload adapter; here it stands level where the fairing begins, and the adapter is not drawn. In space the upper stage it stayed on is not drawn either: in the painted model it is one shell with the centre core.",
  payload: { car: blank("The car's own height is in the Roadster's facts."), starman: STARMAN },
} as const;
