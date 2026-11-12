// The air: temperature, pressure and density with height for the Earth, Mars and Venus, the 1976 U.S. Standard Atmosphere, and what the
// air does to a craft (its speed through the air, the dynamic pressure, the Mach number and the drag). Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter): the layered models of Src/Celbody/Atmosphere/EarthAtm2006/EarthAtm2006.cpp,
// MarsAtm2006/MarsAtm2006.cpp and VenusAtm2006/VenusAtm2006.cpp (clbkConstants and clbkParams: each layer's base, temperature, lapse rate,
// pressure and density, the geopotential height from the planet's radius, and the height above which the model has no air), the speed of
// sound of Src/Orbiter/Planet.h (AtmSoundSpeed), the airspeed and dynamic pressure of Src/Orbiter/Vesselbase.cpp (air turning with the
// planet, no wind), and the drag of a drag element of Src/Orbiter/Vessel.cpp (CD times the dynamic pressure, against the airflow).
// Copyright (c) 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt). Changed in the port: the three models are tables of
// layers read by one function in place of three nested if-chains, with the same numbers. Not ported: Orbiter's Jacchia 71-Gill model and
// the NRLMSISE-00 model, which need the Sun's activity, and NRLMSISE-00's C code, which is not Orbiter's own.
// Written here: standardAtmosphere, from the defining constants and equations of U.S. Standard Atmosphere, 1976 (NOAA, NASA and the U.S.
// Air Force, NASA-TM-X-74335), its tables 2, 3 and 4.
import { cross, length, scale, sub, type Vec3 } from "./vector.ts";

/**
 * One layer of a layered atmosphere: from its base up, the temperature changes at a fixed rate with geopotential height (or stays the same), and the pressure and density follow.
 *
 * @example
 * ```ts
 * import { EARTH_ATMOSPHERE, type AtmosphereLayer } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const ground: AtmosphereLayer = EARTH_ATMOSPHERE.layers[0]!;
 * console.log(ground.temperature, ground.lapse);
 * ```
 */
export interface AtmosphereLayer {
  /** The layer's base, geopotential metres. */
  base: number;
  /** Temperature at the base, kelvin. */
  temperature: number;
  /** How the temperature changes going up, kelvin a geopotential metre (0 for a layer of one temperature). */
  lapse: number;
  /** Pressure at the base, pascals. */
  pressure: number;
  /** Density at the base, kg/m^3. */
  density: number;
}

/**
 * A layered model of a planet's air, as Orbiter's 2006 models are.
 *
 * @example
 * ```ts
 * import { MARS_ATMOSPHERE, type AtmosphereModel } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const mars: AtmosphereModel = MARS_ATMOSPHERE;
 * console.log(mars.name, mars.limit);
 * ```
 */
export interface AtmosphereModel {
  name: string;
  /** The radius the geopotential height is worked from, metres. */
  radius: number;
  /** Standard gravity over the gas constant, g0 / R, kelvin a metre. */
  g0R: number;
  /** The specific gas constant, J/(kg K). */
  gasConstant: number;
  /** The ratio of specific heats. */
  gamma: number;
  /** Above this height (geometric metres) the model has no air. */
  limit: number;
  /** The layers, lowest first. */
  layers: readonly AtmosphereLayer[];
}

/**
 * The air at a height: temperature (K), pressure (Pa), density (kg/m^3) and the speed of sound (m/s). All zero where there is no air.
 *
 * @example
 * ```ts
 * import { atmosphereAt, EARTH_ATMOSPHERE, type Air } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const air: Air = atmosphereAt(EARTH_ATMOSPHERE, 10_000);
 * console.log(air.density.toFixed(3));
 * ```
 */
export interface Air {
  temperature: number;
  pressure: number;
  density: number;
  speedOfSound: number;
}

/**
 * The Earth's air as Orbiter 2006 models it (Orbiter's EarthAtm2006: "a simple static atmosphere model", its own description, ending at 200 km).
 *
 * @example
 * ```ts
 * import { atmosphereAt, EARTH_ATMOSPHERE } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(atmosphereAt(EARTH_ATMOSPHERE, 0).pressure);
 * ```
 */
export const EARTH_ATMOSPHERE: AtmosphereModel = {
  name: "Earth (Orbiter 2006)",
  radius: 6.37101e6,
  g0R: 0.0341643,
  gasConstant: 286.91,
  gamma: 1.4,
  limit: 200e3,
  layers: [
    { base: 0, temperature: 288.16, lapse: -6.5e-3, pressure: 1.01325e5, density: 1.225 },
    { base: 11e3, temperature: 216.66, lapse: 0, pressure: 2.26323e4, density: 0.36392 },
    { base: 25e3, temperature: 216.66, lapse: 3e-3, pressure: 2488.726, density: 0.0400179 },
    { base: 47e3, temperature: 282.66, lapse: 0, pressure: 120.4524, density: 0.00148459 },
    { base: 53e3, temperature: 282.66, lapse: -4.5e-3, pressure: 58.32623, density: 0.000718878 },
    { base: 79e3, temperature: 165.66, lapse: 0, pressure: 1.009601, density: 2.12319e-5 },
    { base: 90e3, temperature: 165.66, lapse: 4e-3, pressure: 0.1044559, density: 2.19671e-6 },
    { base: 105e3, temperature: 225.66, lapse: 0, pressure: 0.007454273, density: 1.15082e-7 },
  ],
};

/**
 * Mars's air as Orbiter 2006 models it (Orbiter's MarsAtm2006), ending at 100 km.
 *
 * @example
 * ```ts
 * import { atmosphereAt, MARS_ATMOSPHERE } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(atmosphereAt(MARS_ATMOSPHERE, 0).pressure);
 * ```
 */
export const MARS_ATMOSPHERE: AtmosphereModel = {
  name: "Mars (Orbiter 2006)",
  radius: 3.38992e6,
  g0R: 0.0197275,
  gasConstant: 188.92,
  gamma: 1.2941,
  limit: 100e3,
  layers: [
    { base: 0, temperature: 195, lapse: 2.5e-3, pressure: 610, density: 0.02 },
    { base: 2e3, temperature: 200, lapse: 0, pressure: 4.99534e2, density: 1.59687e-2 },
    { base: 4e3, temperature: 200, lapse: -2e-3, pressure: 4.101e2, density: 1.31097e-2 },
    { base: 14e3, temperature: 180, lapse: 0, pressure: 1.45061e2, density: 5.1524e-3 },
    { base: 20e3, temperature: 180, lapse: -1.5e-3, pressure: 7.51564e1, density: 2.66947e-3 },
    { base: 30e3, temperature: 165, lapse: 0, pressure: 2.39322e1, density: 9.27323e-4 },
  ],
};

/**
 * Venus's air as Orbiter 2006 models it (Orbiter's VenusAtm2006), ending at 200 km.
 *
 * @example
 * ```ts
 * import { atmosphereAt, VENUS_ATMOSPHERE } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(atmosphereAt(VENUS_ATMOSPHERE, 0).temperature);
 * ```
 */
export const VENUS_ATMOSPHERE: AtmosphereModel = {
  name: "Venus (Orbiter 2006)",
  radius: 6.05184e6,
  g0R: 0.0469506,
  gasConstant: 188.92,
  gamma: 1.2857,
  limit: 200e3,
  layers: [
    { base: 0, temperature: 750, lapse: -0.009, pressure: 9.2e6, density: 65 },
    { base: 30e3, temperature: 480, lapse: -0.00833, pressure: 8.967687e5, density: 9.89979 },
    { base: 60e3, temperature: 230, lapse: 0, pressure: 1.421879e4, density: 3.274408e-1 },
    { base: 70e3, temperature: 230, lapse: -0.0025, pressure: 1.846393e3, density: 4.252010e-2 },
    { base: 90e3, temperature: 180, lapse: 0, pressure: 1.849556e1, density: 5.442431e-4 },
  ],
};

const NO_AIR: Air = { temperature: 0, pressure: 0, density: 0, speedOfSound: 0 };

/**
 * The air of a layered model at a height above the surface (Orbiter's `clbkParams`): the geometric height is turned into geopotential height, the layer below it is found, and the temperature, pressure and density follow from that layer.
 * @param model The model.
 * @param altitude The geometric height above the reference radius, metres (below 0 the lowest layer goes on down).
 * @returns The air there; all zero above the model's limit, as Orbiter has no air there.
 * @example
 * ```ts
 * import { atmosphereAt, EARTH_ATMOSPHERE } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const air = atmosphereAt(EARTH_ATMOSPHERE, 30_000);
 * console.log(air.temperature.toFixed(1), "K,", air.pressure.toFixed(0), "Pa,", air.density.toFixed(4), "kg/m^3");
 * ```
 */
export function atmosphereAt(model: AtmosphereModel, altitude: number): Air {
  if (altitude > model.limit) return NO_AIR;
  const h = (altitude * model.radius) / (model.radius + altitude);
  const layers = model.layers;
  let layer = layers[0]!;
  for (const candidate of layers) if (h > candidate.base) layer = candidate;
  let temperature: number;
  let e: number;
  let t = 1;
  if (layer.lapse === 0) {
    temperature = layer.temperature;
    e = Math.exp((-model.g0R / layer.temperature) * (h - layer.base));
  } else {
    temperature = (h - layer.base) * layer.lapse + layer.temperature;
    t = temperature / layer.temperature;
    e = Math.pow(t, -model.g0R / layer.lapse);
  }
  return { temperature, pressure: layer.pressure * e, density: (layer.density * e) / t, speedOfSound: Math.sqrt(model.gamma * model.gasConstant * temperature) };
}

// U.S. Standard Atmosphere, 1976: table 2 (adopted constants), table 3 (sea-level air) and table 4 (the layers to 86 km).
const R_STAR = 8.31432e3;
const G0 = 9.80665;
const R0 = 6.356766e6;
const T0 = 288.15;
const P0 = 1.01325e5;
const GAMMA = 1.4;
const AIR: readonly [number, number][] = [
  [28.0134, 0.78084],
  [31.9988, 0.209476],
  [39.948, 0.00934],
  [44.00995, 0.000314],
  [20.183, 0.00001818],
  [4.0026, 0.00000524],
  [83.8, 0.00000114],
  [131.3, 0.000000087],
  [16.04303, 0.000002],
  [2.01594, 0.0000005],
];
const M0 = AIR.reduce((sum, [m, f]) => sum + m * f, 0);
const BASES = [0, 11e3, 20e3, 32e3, 47e3, 51e3, 71e3];
const LAPSES = [-6.5e-3, 0, 1e-3, 2.8e-3, 0, -2.8e-3, -2e-3];
const TOP = 84.852e3;
const STANDARD_LAYERS: { base: number; lapse: number; temperature: number; pressure: number }[] = [];
{
  let temperature = T0;
  let pressure = P0;
  BASES.forEach((base, b) => {
    STANDARD_LAYERS.push({ base, lapse: LAPSES[b]!, temperature, pressure });
    const next = BASES[b + 1] ?? TOP;
    const end = temperature + LAPSES[b]! * (next - base);
    pressure = LAPSES[b] === 0 ? pressure * Math.exp((-G0 * M0 * (next - base)) / (R_STAR * temperature)) : pressure * Math.pow(temperature / end, (G0 * M0) / (R_STAR * LAPSES[b]!));
    temperature = end;
  });
}

/**
 * The 1976 U.S. Standard Atmosphere from 5 km below sea level to 86 km, worked from its defining constants and equations (its tables 2, 3 and 4): seven layers of fixed temperature gradient in geopotential height, the sea-level air's mean molecular weight from its table 3, the hydrostatic equation and the gas law.
 * @param altitude The geometric height above sea level, metres, from -5,000 to 86,000.
 * @returns The air there (the temperature is the molecular-scale temperature, the same as the kinetic temperature below 80 km), or null outside those heights.
 * @example
 * ```ts
 * import { standardAtmosphere } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const air = standardAtmosphere(11_000);
 * console.log(air?.temperature.toFixed(3), "K,", air?.pressure.toFixed(0), "Pa");
 * ```
 */
export function standardAtmosphere(altitude: number): Air | null {
  if (!(altitude >= -5_000 && altitude <= 86_000)) return null;
  const h = (R0 * altitude) / (R0 + altitude);
  let layer = STANDARD_LAYERS[0]!;
  for (const candidate of STANDARD_LAYERS) if (h >= candidate.base) layer = candidate;
  const temperature = layer.temperature + layer.lapse * (h - layer.base);
  const pressure = layer.lapse === 0 ? layer.pressure * Math.exp((-G0 * M0 * (h - layer.base)) / (R_STAR * layer.temperature)) : layer.pressure * Math.pow(layer.temperature / temperature, (G0 * M0) / (R_STAR * layer.lapse));
  return { temperature, pressure, density: (pressure * M0) / (R_STAR * temperature), speedOfSound: Math.sqrt((GAMMA * R_STAR * temperature) / M0) };
}

/**
 * A craft's speed through the air, for air that turns with its planet and no wind (Orbiter's airspeed): its speed relative to the planet less the speed of the air where it is, `v - w x r`.
 * @param position The craft's position from the planet's centre, metres.
 * @param velocity Its speed relative to the planet's centre, metres a second.
 * @param spin The planet's turn rate as a vector along its pole, radians a second (`[0, 0, 7.292115e-5]` for the Earth in an equatorial frame).
 * @returns The velocity through the air, metres a second.
 * @example
 * ```ts
 * import { airVelocity } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(airVelocity([6_778_000, 0, 0], [0, 7_669, 0], [0, 0, 7.292115e-5]));
 * ```
 */
export const airVelocity = (position: Vec3, velocity: Vec3, spin: Vec3): Vec3 => sub(velocity, cross(spin, position));

/**
 * The dynamic pressure of the air on a craft, `rho v^2 / 2` (Orbiter's `dynp`).
 * @param density The air's density, kg/m^3.
 * @param airspeed The speed through the air, metres a second.
 * @returns The dynamic pressure, pascals.
 * @example
 * ```ts
 * import { dynamicPressure } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(dynamicPressure(0.4, 400));
 * ```
 */
export const dynamicPressure = (density: number, airspeed: number): number => 0.5 * density * airspeed * airspeed;

/**
 * The Mach number: the speed through the air over the speed of sound there (Orbiter's `atmM`).
 * @param airspeed The speed through the air, metres a second.
 * @param air The air, from {@link atmosphereAt} or {@link standardAtmosphere}.
 * @returns The Mach number; 0 where there is no air.
 * @example
 * ```ts
 * import { atmosphereAt, EARTH_ATMOSPHERE, machNumber } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(machNumber(600, atmosphereAt(EARTH_ATMOSPHERE, 11_000)).toFixed(2));
 * ```
 */
export const machNumber = (airspeed: number, air: Air): number => (air.speedOfSound > 0 ? airspeed / air.speedOfSound : 0);

/**
 * The drag on a craft as an acceleration: `-(rho |v| v / 2) Cd A / m`, against its velocity through the air (Orbiter's drag element: its drag coefficient times the dynamic pressure, along the airflow).
 * @param density The air's density, kg/m^3.
 * @param air The velocity through the air, from {@link airVelocity}, metres a second.
 * @param dragArea The drag coefficient times the reference area, `Cd A`, m^2.
 * @param mass The craft's mass, kilograms.
 * @returns The acceleration, metres a second squared.
 * @example
 * ```ts
 * import { atmosphereAt, dragAcceleration, EARTH_ATMOSPHERE } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(dragAcceleration(atmosphereAt(EARTH_ATMOSPHERE, 60_000).density, [0, 7_000, 0], 1.3 * 12, 9_000));
 * ```
 */
export function dragAcceleration(density: number, air: Vec3, dragArea: number, mass: number): Vec3 {
  const speed = length(air);
  return speed > 0 ? scale(air, (-0.5 * density * speed * dragArea) / mass) : [0, 0, 0];
}
