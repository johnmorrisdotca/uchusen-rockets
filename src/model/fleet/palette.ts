// The fleet's palette: the colours every ship of the fleet shares, by what they mean on a sheet (the symbol legend of the fleet's drawings). One maker, so one set of colours: orange marks what is removable
// (shields, shutters), white the protected volumes, grey the structure and plating, teal the coolant and feed lines, gold the copper field coils, yellow the service access and rails, near-black the heat sinks and
// blast doors, green the farms, blue the propellant and water, pale blue the lights and windows. `materials.ts` builds the fleet's materials from these; a ship asks for a role, never for a colour. Pure: no imports.

/**
 * The fleet's colours by role, as sRGB hex. Each role is what a sheet's legend says it is.
 *
 * @example
 * ```ts
 * import { FLEET_PALETTE } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_PALETTE.shield, FLEET_PALETTE.protected);
 * ```
 */
export const FLEET_PALETTE = {
  /** Removable shields and shutters. */
  shield: "#d17a3c",
  /** Protected volumes: ceramic white. */
  protected: "#dad8d0",
  /** Structure and plating. */
  structure: "#8b9097",
  /** Coolant and feed lines. */
  coolant: "#4f8085",
  /** Copper field coils. */
  coil: "#d3a34a",
  /** Service access and rails. */
  service: "#d6aa2b",
  /** Heat sinks, blast doors, dark structure. */
  heatSink: "#2a2d32",
  /** Farms. */
  farm: "#3f7d3a",
  /** Propellant and water. */
  propellant: "#3a68a0",
  /** Lights and windows. */
  light: "#9ad8ff",
} as const;

/**
 * The name of a role in `FLEET_PALETTE`.
 *
 * @example
 * ```ts
 * import { FLEET_PALETTE, type FleetColour } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const role: FleetColour = "coolant";
 * console.log(FLEET_PALETTE[role]);
 * ```
 */
export type FleetColour = keyof typeof FLEET_PALETTE;
