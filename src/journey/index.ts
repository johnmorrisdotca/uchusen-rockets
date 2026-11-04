// Journey mode: the arithmetic and the plan of a trip between places in the solar system. Pure: no DOM, no three.js, no dependency (a page hands it a `BodySource`).
export { AU_KM, AU_M, C, DAY_S, G0, GM_KM3_S2, LY_M, PARKING_ALTITUDE_KM, PERIOD_DAYS, YEAR_S } from "./constants.ts";
export { circularSpeed, escapeBurn, flipAndBurn, hohmann, kepler, synodicPeriod } from "./physics.ts";
export type { BodySource, Stop } from "./bodies.ts";
export { CRAFTS, craftOf, stageOf } from "./crafts.ts";
export type { BallisticCraft, ContinuousCraft, Craft, Quantity, Stage } from "./crafts.ts";
export { bestDate, planTrip, windows } from "./trip.ts";
export type { Phase, Trip, Verdict, Window } from "./trip.ts";
export { placeAt, playSeconds, stateAt } from "./timeline.ts";
export type { Place, PlaySpeed, State } from "./timeline.ts";
export { burnTimer, ignition, preheat } from "./countdown.ts";
export { astronomicalUnits, duration, gWords, kilometres, lightTime, percentOfLight, speedWords, tonnesWords } from "./words.ts";
