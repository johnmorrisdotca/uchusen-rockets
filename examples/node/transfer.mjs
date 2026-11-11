import { hohmann, GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
import { elementsOf, exhaustSpeedOf, flyPlan, gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";

// From a 400 km circle to the geostationary radius, with two burns of a 1 MN engine, each centred on its point. Metres and seconds.
const gm = GM_KM3_S2.earth * 1e9;
const earth = [{ gm, position: [0, 0, 0] }];
const [r1, r2] = [6_778_137, 42_164_000];
const plan = hohmann(gm, r1, r2);
const engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(314) };
const burns = [
  { at: 600, engine, direction: "prograde", dv: plan.dv1 },
  { at: 600 + plan.seconds, engine, direction: "prograde", dv: plan.dv2 },
];
const start = { t: 0, position: [r1, 0, 0], velocity: [0, Math.sqrt(gm / r1), 0] };
const flown = flyPlan(start, 20_000, burns, 600 + plan.seconds + 3_600, { step: 2, gravity: (_t, p) => gravityAt(p, earth) });
const orbit = elementsOf(gm, flown.state.position, flown.state.velocity);
console.log((plan.dv1 + plan.dv2).toFixed(0), "m/s,", (20_000 - flown.mass).toFixed(0), "kg of propellant");
console.log("ends", Math.round(Math.abs(orbit.a - r2) / 1000), "km from the circle, eccentricity", orbit.e.toFixed(4));
