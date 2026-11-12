import { atmosphereAt, EARTH_ATMOSPHERE, MARS_ATMOSPHERE, standardAtmosphere } from "@johnmorrisdotca/uchusen-rockets/physics";

// The air at a few heights: Orbiter's 2006 Earth beside the 1976 U.S. Standard Atmosphere, and Mars. Kelvin, pascals, kg/m^3.
for (const height of [0, 11_000, 30_000]) {
  const orbiter = atmosphereAt(EARTH_ATMOSPHERE, height);
  const standard = standardAtmosphere(height);
  console.log(height / 1000, "km:", orbiter.pressure.toFixed(0), "Pa (Orbiter),", standard.pressure.toFixed(0), "Pa (1976 standard)");
}
console.log("Mars at the surface:", atmosphereAt(MARS_ATMOSPHERE, 0).pressure, "Pa,", atmosphereAt(MARS_ATMOSPHERE, 0).density, "kg/m^3");
