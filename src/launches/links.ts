// Which of GCAT's launch vehicles are rockets this package draws. GCAT names a vehicle by its type ("Soyuz-2-1A"); the package names it by a rocket id ("soyuz") and a variant id ("soyuz-2").
// Only a vehicle that is the one drawn, or a plain member of the family of the one drawn, is listed. Any other vehicle in the log has no link and its `rocket` is null.

/**
 * How a GCAT vehicle relates to the rocket this package draws: `same` when it is the vehicle drawn, `family` when it is another member of the same named family (Soyuz-U beside the drawn Soyuz-2).
 *
 * @example
 * ```ts
 * import { LAUNCH_VEHICLE_LINKS, type VehicleMatch } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const match: VehicleMatch | undefined = LAUNCH_VEHICLE_LINKS[0]?.match;
 * console.log(match);
 * ```
 */
export type VehicleMatch = "same" | "family";

/**
 * One row of the table that links a GCAT launch vehicle to this package's rocket: GCAT's vehicle name as the log spells it, the rocket id, the variant id where one variant is the vehicle, and how close the two are.
 *
 * @example
 * ```ts
 * import { LAUNCH_VEHICLE_LINKS, type VehicleLink } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * const falcon: VehicleLink | undefined = LAUNCH_VEHICLE_LINKS.find((link) => link.vehicle === "Falcon 9");
 * console.log(falcon?.rocket);
 * ```
 */
export interface VehicleLink {
  /** The vehicle's type name in GCAT, exactly as `Launch.vehicle` spells it. */
  vehicle: string;
  /** The id of the rocket in `ROCKETS`. */
  rocket: string;
  /** The id of the variant in `ROCKETS[rocket].variants`, only where one variant is this vehicle. */
  variant?: string;
  match: VehicleMatch;
}

const same = (vehicle: string, rocket: string, variant?: string): VehicleLink => ({ vehicle, rocket, ...(variant === undefined ? {} : { variant }), match: "same" });
const family = (vehicle: string, rocket: string): VehicleLink => ({ vehicle, rocket, match: "family" });

/**
 * The table that links the log's vehicle names to this package's rocket ids. A test holds that every row names a vehicle that flew, a rocket that is in `ROCKETS` and a variant that belongs to it.
 *
 * @example
 * ```ts
 * import { LAUNCH_VEHICLE_LINKS } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(LAUNCH_VEHICLE_LINKS.filter((link) => link.rocket === "soyuz").map((link) => link.vehicle));
 * ```
 */
export const LAUNCH_VEHICLE_LINKS: readonly VehicleLink[] = [
  same("Falcon 9", "falcon-9"),
  same("Falcon Heavy", "falcon-heavy", "falcon-heavy"),
  same("Falcon 1", "falcon-1", "falcon-1"),
  same("Saturn V", "saturn-v", "saturn-v"),
  same("Space Shuttle", "space-shuttle", "stack"),
  same("SLS Block 1", "sls", "block-1"),
  same("New Glenn 7x2", "new-glenn", "7x2"),
  same("Electron", "electron", "electron"),
  same("Jupiter C", "jupiter-c", "jupiter-c"),
  same("Starship V2", "starship", "v2"),
  same("Starship V3", "starship", "v3"),
  family("Starship V1.0", "starship"),
  same("Soyuz-2-1A", "soyuz", "soyuz-2"),
  same("Soyuz-2-1B", "soyuz", "soyuz-2"),
  family("Soyuz-2-1V", "soyuz"),
  family("Soyuz-ST-A", "soyuz"),
  family("Soyuz-ST-B", "soyuz"),
  family("Soyuz-FG", "soyuz"),
  family("Soyuz-U", "soyuz"),
  family("Soyuz-U2", "soyuz"),
  family("Soyuz-U-PVB", "soyuz"),
  family("Soyuz 11A511", "soyuz"),
  family("Soyuz 11A511L", "soyuz"),
  family("Soyuz 11A511M", "soyuz"),
];
