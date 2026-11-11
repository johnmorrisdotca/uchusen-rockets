// Flight physics: orbits from a position and a speed, gravity from the bodies of a scene, a craft moved forward in time, the rocket equation, burns and transfers. Ported in part from Orbiter (MIT, see NOTICE.md). Pure: no DOM, no clock, no dependency. SI units: metres, seconds, kilograms.
export type { Vec3 } from "./vector.ts";
export { eccentricAnomaly, elementsOf, stateAtTrueAnomaly, stateOf, timeToTrueAnomaly } from "./elements.ts";
export type { Elements, StateVector } from "./elements.ts";
export { gravityAt } from "./gravity.ts";
export type { GravityBody, Zonal } from "./gravity.ts";
export { path, propagate, step } from "./propagate.ts";
export type { Acceleration, Method, PropagateOptions, State } from "./propagate.ts";
export { burnSeconds, deltaV, exhaustSpeedOf, massAfter, massFlow, thrustAt } from "./rocket.ts";
export type { Engine } from "./rocket.ts";
export { burnStart, directionOf, flyBurn, flyPlan, impulse } from "./burns.ts";
export type { Burn, BurnResult, Centre, Direction, FlyOptions, PlannedBurn } from "./burns.ts";
export { biElliptic, crossings, nodes, planeChange, relativeInclination, speedChangeFor } from "./transfers.ts";
export type { Node } from "./transfers.ts";
