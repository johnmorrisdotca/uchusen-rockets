// The log of real flights: which rocket flew, on what date, and how it came out, as the source's table says. Data only: what plays is `FLIGHTS` in flights.ts, the timelines. A flight is named for the variant this package has that is nearest it: its vehicles are named where the source names them, and a booster's or ship's fate is only the source's own words.
import type { SourceId } from "./sources.ts";

export interface LoggedFlight {
  id: string;
  name: string;
  rocket: string;
  /** The variant in this package that shows it. */
  variant: string;
  /** UTC, as the source gives it. */
  date: string;
  launch: "Success" | "Failure";
  vehicles?: string;
  /** The source's own words on how it came out. */
  outcome: string;
  source: SourceId;
}

export const FLIGHT_LOG: readonly LoggedFlight[] = [
  { id: "falcon-1-flight-1", name: "Falcon 1, flight 1", rocket: "falcon-1", variant: "falcon-1", date: "2006-03-24", launch: "Failure", outcome: "Engine failure at T+33 seconds, and the vehicle was lost.", source: "wikipedia-falcon-1" },
  { id: "falcon-1-flight-2", name: "Falcon 1, flight 2", rocket: "falcon-1", variant: "falcon-1", date: "2007-03-21", launch: "Failure", outcome: "Reached 289 km and did not reach orbit: an oscillation of the second stage, and an early engine shutdown.", source: "wikipedia-falcon-1" },
  { id: "falcon-1-flight-3", name: "Falcon 1, flight 3", rocket: "falcon-1", variant: "falcon-1", date: "2008-08-03", launch: "Failure", outcome: "The first stage recontacted the second at separation.", source: "wikipedia-falcon-1" },
  { id: "falcon-1-flight-4", name: "Falcon 1, flight 4", rocket: "falcon-1", variant: "falcon-1", date: "2008-09-28", launch: "Success", outcome: "The first privately developed fully liquid-fuelled rocket to reach orbit, carrying a mass simulator.", source: "wikipedia-falcon-1" },
  { id: "falcon-1-flight-5", name: "Falcon 1, flight 5", rocket: "falcon-1", variant: "falcon-1", date: "2009-07-14", launch: "Success", outcome: "Its first commercial flight, placing RazakSAT in orbit.", source: "wikipedia-falcon-1" },
  { id: "starship-flight-1", name: "Starship flight 1", rocket: "starship", variant: "v1-flight1", date: "2023-04-20", launch: "Failure", vehicles: "Booster B7, Ship S24", outcome: "Booster: Precluded. Ship: Precluded.", source: "wikipedia-launches" },
  { id: "starship-flight-2", name: "Starship flight 2", rocket: "starship", variant: "v1", date: "2023-11-18", launch: "Failure", vehicles: "Booster B9, Ship S25", outcome: "Booster: Failure (gulf). Ship: Precluded.", source: "wikipedia-launches" },
  { id: "starship-flight-3", name: "Starship flight 3", rocket: "starship", variant: "v1", date: "2024-03-14", launch: "Success", vehicles: "Booster B10, Ship S28", outcome: "Booster: Failure (gulf). Ship: Failure (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-4", name: "Starship flight 4", rocket: "starship", variant: "v1", date: "2024-06-06", launch: "Success", vehicles: "Booster B11, Ship S29", outcome: "Booster: Controlled (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-5", name: "Starship flight 5", rocket: "starship", variant: "v1", date: "2024-10-13", launch: "Success", vehicles: "Booster B12, Ship S30", outcome: "Booster: Caught (OLP-1). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-6", name: "Starship flight 6", rocket: "starship", variant: "v1", date: "2024-11-19", launch: "Success", vehicles: "Booster B13, Ship S31", outcome: "Booster: Catch aborted, diverted to the ocean. Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-7", name: "Starship flight 7", rocket: "starship", variant: "v2", date: "2025-01-16", launch: "Failure", vehicles: "Booster B14-1, Ship S33", outcome: "Booster: Caught (OLP-1). Ship: Precluded.", source: "wikipedia-launches" },
  { id: "starship-flight-8", name: "Starship flight 8", rocket: "starship", variant: "v2", date: "2025-03-06", launch: "Failure", vehicles: "Booster B15-1, Ship S34", outcome: "Booster: Caught (OLP-1). Ship: Precluded.", source: "wikipedia-launches" },
  { id: "starship-flight-9", name: "Starship flight 9", rocket: "starship", variant: "v2", date: "2025-05-27", launch: "Failure", vehicles: "Booster B14-2, Ship S35", outcome: "Booster: Failure (gulf). Ship: Failure (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-10", name: "Starship flight 10", rocket: "starship", variant: "v2", date: "2025-08-26", launch: "Success", vehicles: "Booster B16, Ship S37", outcome: "Booster: Controlled (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-11", name: "Starship flight 11", rocket: "starship", variant: "v2", date: "2025-10-13", launch: "Success", vehicles: "Booster B15-2, Ship S38", outcome: "Booster: Controlled (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-12", name: "Starship flight 12", rocket: "starship", variant: "v3", date: "2026-05-22", launch: "Success", vehicles: "Booster B19, Ship S39", outcome: "Booster: Failure (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-13", name: "Starship flight 13", rocket: "starship", variant: "v3", date: "2026-07-24", launch: "Success", vehicles: "Booster B20, Ship S40", outcome: "Booster: Failure (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
  { id: "starship-flight-14", name: "Starship flight 14", rocket: "starship", variant: "v3", date: "2026-09-28", launch: "Success", vehicles: "Booster B21, Ship S41", outcome: "Booster: Controlled (gulf). Ship: Controlled (ocean).", source: "wikipedia-launches" },
];

/** A rocket's flights, in order. */
export const flightLogOf = (rocket: string): readonly LoggedFlight[] => FLIGHT_LOG.filter((flight) => flight.rocket === rocket);
