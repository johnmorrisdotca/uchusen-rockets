// Tiangong-1. The length, the maximum diameter, the mass, the launch day and the two module sizes are the Czech Academy of Sciences library catalogue for 2011-053A, read 2026-11-19. The two-cylinder description, the front cone and the solar panels are the ESA Space Debris Office FAQ of 26 March 2018, read the same day. The front cone's height is not given, and the panels are only approximate with no place along the module, so neither is drawn.
import type { Variant } from "./types.ts";

const CATALOGUE = "space40-2011-053a" as const;
const ESA = "esa-tiangong-1" as const;

/** The catalogue's overall length, in metres. */
const LENGTH = 10.4;
/** The catalogue's service module. */
const SERVICE = 3.2;
/** The catalogue's truncated cone between the two modules. */
const CONE = 1.6;
/** What the stated 10.4 m leaves after the service module and the cone. The catalogue does not state this length on its own. */
const EXPERIMENT = Number((LENGTH - SERVICE - CONE).toFixed(2));

/** Tiangong-1: the experiment section, the joining cone and the service module. */
export const TIANGONG_1: Variant = {
  id: "tiangong-1",
  rocket: "tiangong-1",
  name: "Tiangong-1",
  status: "flown",
  firstFlight: { value: "2011-09-29", source: CATALOGUE, note: "The catalogue's launch, 2011-09-29 13:16:03.507 UT, COSPAR 2011-053A. ESA's FAQ says 30 September 2011 at 03:16:03.507 UTC, which is not the same clock." },
  slots: ["craft"],
  facts: {
    height: { value: LENGTH, source: CATALOGUE, note: "The catalogue's overall length, 10.4 m. ESA's FAQ says the same 10.4 m for the main body." },
    diameter: { value: 3.35, source: CATALOGUE, note: "The catalogue's maximum diameter. It is the experiment module's diameter." },
    parts: {
      craft: { value: LENGTH, source: CATALOGUE, note: "The experiment section, the joining cone and the service module, end to end." },
    },
    engines: {},
    more: {
      mass: { value: 8506, source: CATALOGUE, note: "The catalogue's 8506 kg. ESA's FAQ says about 8.5 tonnes including fuel at launch." },
      experimentLength: { value: EXPERIMENT, source: CATALOGUE, note: "This package's own remainder: the catalogue's 10.4 m, less the service module's 3.2 m and the joining cone's 1.6 m. The catalogue states the experiment module's diameter, 3.35 m, and not this length." },
      coneLength: { value: CONE, source: CATALOGUE, note: "The truncated cone that joins the service module to the experiment module, 1.6 m. It is drawn from the experiment module's 3.35 m to the service module's 2.8 m." },
      serviceLength: { value: SERVICE, source: CATALOGUE, note: "The service module, 3.2 m long and 2.8 m across." },
      serviceDiameter: { value: 2.8, source: CATALOGUE, note: "The service module's diameter." },
      panelLength: { value: 7, source: ESA, note: "ESA's FAQ says two solar panels, each approximately 3 by 7 m, on the service module. It does not say where along the module they sit, so they are not drawn." },
    },
    sizes: {
      "Experiment section": { value: EXPERIMENT, source: CATALOGUE, note: "5.6 m, this package's remainder." },
      Cone: { value: CONE, source: CATALOGUE, note: "1.6 m." },
      "Service module": { value: SERVICE, source: CATALOGUE, note: "3.2 m." },
    },
  },
  note: "Tiangong-1, the station alone, without a docked Shenzhou. The length, the diameters, the mass and the day are the catalogue for 2011-053A. ESA's FAQ describes two cylinders of about equal length, a thicker experiment module with a front cone, and a thinner service module. The drawing is this package's own: a 5.6 m experiment cylinder at 3.35 m, the 1.6 m cone, and a 3.2 m service cylinder at 2.8 m. The front cone is not drawn: its height is not given. The solar panels are not drawn: ESA gives them only as approximately 3 by 7 m and does not place them. Both looks are the same. No name or mark is drawn. Maker CASTC, as the catalogue names the manufacturer, country China.",
};

export const TIANGONG_1_VARIANTS: readonly Variant[] = [TIANGONG_1];
