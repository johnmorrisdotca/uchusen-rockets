import { fireFor, killRotation, stepSpin, torqueLimits } from "@johnmorrisdotca/uchusen-rockets/physics";

// An 8 m craft standing along +y, with four 445 N thrusters at each end and two pairs for the roll, stops a tumble.
const inertia = [20_000, 6_000, 20_000];
const thrusters = [];
for (const y of [4, -4]) for (const direction of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) thrusters.push({ position: [0, y, 0], direction, thrust: 445, exhaustSpeed: 2_800 });
for (const s of [1, -1]) thrusters.push({ position: [1.5, 0, 0], direction: [0, 0, s], thrust: 445, exhaustSpeed: 2_800 }, { position: [-1.5, 0, 0], direction: [0, 0, -s], thrust: 445, exhaustSpeed: 2_800 });
const limits = torqueLimits(thrusters);

let spin = { t: 0, q: [1, 0, 0, 0], omega: [0.05, -0.03, 0.02] };
let propellant = 0;
while (Math.hypot(...spin.omega) >= 1e-5) {
  const fired = fireFor(thrusters, killRotation(spin, inertia, limits, 0.1));
  propellant += fired.massFlow * 0.1;
  spin = stepSpin(spin, 0.1, inertia, () => fired.torque);
}
console.log("stopped in", spin.t.toFixed(1), "s with", propellant.toFixed(2), "kg of propellant");
