// Flight physics: orbits from a position and a speed, gravity from the bodies of a scene, a craft moved forward in time, the rocket equation, burns and transfers, attitude and thrusters, and the air. Ported in part from Orbiter (MIT, see NOTICE.md). Pure: no DOM, no clock, no dependency. SI units: metres, seconds, kilograms.
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
export { angularAcceleration, fireFor, gravityGradientTorque, holdDirection, killRotation, quatFromAxisAngle, rotateVector, spinFor, stepCraft, stepSpin, thrusterPush, torqueLimits, turnBy, unrotateVector } from "./attitude.ts";
export type { Craft, CraftForces, Quat, Spin, Thruster, Torque, TorqueLimits } from "./attitude.ts";
export { airVelocity, atmosphereAt, dragAcceleration, dynamicPressure, EARTH_ATMOSPHERE, MARS_ATMOSPHERE, machNumber, standardAtmosphere, VENUS_ATMOSPHERE } from "./atmosphere.ts";
export type { Air, AtmosphereLayer, AtmosphereModel } from "./atmosphere.ts";
