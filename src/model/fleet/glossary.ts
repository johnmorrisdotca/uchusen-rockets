// The fleet's in-universe words, in one form for every ship, sheet and doc: the ship prefix, the class codes, the drives, the ship's computer and the small craft, and the operator's name, which is just SPX.
// Pure: no imports.

/**
 * The fleet's acronyms and what they stand for. A ship's name is written "ISV Kaminari, SPX-207": ISV is the prefix (never USS, never ISS, which reads as the space station), the registry number comes from John and is
 * never explained, and a class code follows: IHT, ICV or IXV.
 *
 * @example
 * ```ts
 * import { GLOSSARY } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(GLOSSARY.FTD, GLOSSARY.KAZE);
 * ```
 */
export const GLOSSARY = {
  ISV: "Interstellar Service Vehicle",
  IHT: "Interstellar Heavy Transport",
  ICV: "Interstellar Command Vessel",
  IXV: "Interstellar eXploration Vessel",
  FTD: "Fusion Torch Drive",
  DCD: "Directed Conversion Drive",
  KAZE: "Kinetic Autonomous Zonal Executive",
  ATC: "Auxiliary Transfer Craft",
} as const;

/**
 * The name of an acronym in `GLOSSARY`.
 *
 * @example
 * ```ts
 * import { GLOSSARY, type GlossaryCode } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const code: GlossaryCode = "ATC";
 * console.log(GLOSSARY[code]);
 * ```
 */
export type GlossaryCode = keyof typeof GLOSSARY;

/**
 * The organisation that operates the fleet, in the story: just "SPX", never spelled out. One line, so it is changed in one place.
 *
 * @example
 * ```ts
 * import { FLEET_OPERATOR } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_OPERATOR);
 * ```
 */
export const FLEET_OPERATOR = "SPX";
