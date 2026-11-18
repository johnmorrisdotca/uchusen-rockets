// ISO 3166-1 alpha-2 codes for the launch log's states and sites (MODULES-1137). Typed by hand, one code at a time, from the state codes GCAT gives its organizations (orgs.tsv, column StateCode) and its launch sites (sites.tsv, column StateCode), both
// read on 2026-11-18 (updated that day, 01:43 UTC) from https://planet4589.org/space/gcat/tsv/tables/. GCAT's own name for each state (its orgs.tsv ShortEName) is in the comment beside it, so a reader can check the pairing. Nothing is guessed:
// a code that is not a current country with an ISO 3166-1 code of its own is `null`. Pure data: no DOM, no clock, no dependency.

/**
 * The ISO 3166-1 alpha-2 code for each state code GCAT gives an organization, or `null` where there is none to give. `null` is for what is not a country: an international body (ELDO, ESA) and a company's flag of convenience (Sea Launch, `CYM`),
 * and for a state that no longer exists and has no current code (`SU`, the USSR). A code is a fact about the state GCAT credits the launch to, which is the operator's, not the place: Baikonur is
 * `RU` in GCAT (the site's operator), not Kazakhstan.
 *
 * @example
 * ```ts
 * import { GCAT_STATE_ISO } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(GCAT_STATE_ISO.F, GCAT_STATE_ISO.UK, GCAT_STATE_ISO["I-ESA"]);
 * ```
 */
export const GCAT_STATE_ISO: Readonly<Record<string, string | null>> = {
  AU: "AU", // Australia
  BR: "BR", // Brazil
  CN: "CN", // China
  CYM: null, // Cayman Is.: Sea Launch's flag of convenience, which the ticket (MODULES-1137) leaves without a code
  D: "DE", // Germany (GCAT: BRD)
  DZ: "DZ", // Algeria
  ESCN: null, // Canary Is: a part of Spain with no ISO 3166-1 code of its own (IC is only an exceptional reservation)
  F: "FR", // France
  GUF: "GF", // French Guiana: it has an ISO 3166-1 code of its own, which GCAT's code also names; John decides (FR or GF)
  I: "IT", // Italy
  "I-ELDO": null, // ELDO: an international body
  "I-ESA": null, // ESA: an international body
  IL: "IL", // Israel
  IN: "IN", // India
  IR: "IR", // Iran
  J: "JP", // Japan
  KE: "KE", // Kenya
  KI: "KI", // Kiribati
  KP: "KP", // North Korea
  KR: "KR", // South Korea
  N: "NO", // Norway
  NZ: "NZ", // New Zealand
  RU: "RU", // Russia
  SU: null, // USSR (GCAT: 1922 Dec 30 to 1991 Dec 26): no current ISO 3166-1 code, and Russia's would rewrite history; John decides (RU, none or SU)
  TTPI: null, // Trust Territory of the Pacific Islands (GCAT: 1947 Jul 18 to 1979)
  UK: "GB", // United Kingdom
  US: "US", // United States
};

/**
 * The state code GCAT gives each launch site in the log (its `sites.tsv`), or `null` where GCAT's entry has none (its own doubtful `TYSC?`). Look it up in `GCAT_STATE_ISO` for the country's code.
 *
 * @example
 * ```ts
 * import { GCAT_SITE_STATE } from "@johnmorrisdotca/uchusen-rockets/launches";
 *
 * console.log(GCAT_SITE_STATE["CSG"], GCAT_SITE_STATE["NIIP-5"]);
 * ```
 */
export const GCAT_SITE_STATE: Readonly<Record<string, string | null>> = {
  "NIIP-5": "SU",
  "CC": "US",
  "NOTS": "US",
  "V": "US",
  "PA": "US",
  "WI": "US",
  "GTsP-4": "SU",
  "VS": "US",
  "HMG": "DZ",
  "NIIP-53": "SU",
  "KASC": "J",
  "SMLC": "KE",
  "KSC": "US",
  "WOO": "AU",
  "CSG": "GUF",
  "JQ": "CN",
  "TNSC": "J",
  "SHAR": "IN",
  "XSC": "CN",
  "TYSC": "CN",
  "PALB": "IL",
  "GIK-5": "RU",
  "EAFB": "US",
  "GNIIPV": "RU",
  "GNIIP": "RU",
  "GIK-1": "RU",
  "WIMB": "US",
  "GIK-2": "RU",
  "GANC": "ESCN",
  "ALCA": "BR",
  "SPFL": "US",
  "BLA": "SU",
  "TONGH": "KP",
  "KLA": "KI",
  "GTsMP-4": "SU",
  "KMR": "TTPI",
  "KLC": "US",
  "YAS": "RU",
  "MARS": "US",
  "SEM": "IR",
  "NARO": "KR",
  "SOHAE": "KP",
  "USC": "J",
  "KAU": "US",
  "VOST": "RU",
  "WEN": "CN",
  "MAHIA": "NZ",
  "SPFLA": "US",
  "HHAI": "CN",
  "SHAHR": "IR",
  "MHV": "US",
  "PSCA": "US",
  "VSFB": "US",
  "TYSC?": null,
  "VSFBS": "US",
  "NEWQ": "UK",
  "JEJU": "KR",
  "YJ": "CN",
  "KII": "J",
  "STB": "US",
  "HCSLS": "CN",
  "AND": "N",
  "BOWEN": "AU",
  "SDSC": "IN",
  "ECS": "CN",
};
