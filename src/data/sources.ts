// Every source a figure may name. Plain facts are taken from these, and each figure says which one it came from. `read` is how this project read it: "direct" means the page itself, "search" that only
// a search engine's quote of it could be read, and "cited" that it is known through another source's citation.

export interface Source {
  title: string;
  publisher: string;
  url: string;
  /** The date on the source, when it has one. */
  date?: string;
  read: "direct" | "search" | "cited";
  licence?: string;
}

export const SOURCES = {
  "wikipedia-starship": { title: "SpaceX Starship (the block table and infobox, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Starship", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-super-heavy": { title: "SpaceX Super Heavy", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Super_Heavy", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-ship": { title: "SpaceX Starship (spacecraft)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-1": { title: "Starship flight test 1", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_1", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-launches": { title: "List of Starship launches (dates in UTC)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/List_of_Starship_launches", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-raptor": { title: "SpaceX Raptor", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Raptor", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "spacex-starship": { title: "Starship (vehicle page)", publisher: "SpaceX", url: "https://new.spacex.com/vehicles/starship", date: "2026-10-31", read: "search" },
  "nsf-block3": { title: "The Future of the Starship Program, Block 3 and Mars", publisher: "NASASpaceflight", url: "https://www.nasaspaceflight.com/2025/05/future-starship-block-3-mars/", date: "2025-05-30", read: "cited" },
  "ars-2024": { title: "Elon Musk just gave another Mars speech", publisher: "Ars Technica", url: "https://arstechnica.com/space/2024/04/elon-musk-just-gave-another-mars-speech-this-time-the-vision-seems-tangible/", date: "2024-04-08", read: "cited" },
  "satnews-v3": { title: "SpaceX Debuts Starship V3", publisher: "SatNews", url: "https://satnews.com/2026/05/14/spacex-debuts-starship-v3-redefining-heavy-lift-launch-capability/", date: "2026-05-14", read: "direct" },
  "gunter": { title: "Starship (Super Heavy Starship, BFR, Big Falcon Rocket)", publisher: "Gunter's Space Page", url: "https://space.skyrocket.de/doc_lau/super-heavy-starship.htm", date: "2026-10-31", read: "direct" },
  "newspace-v1-v4": { title: "SpaceX Starship from V1 to V4", publisher: "New Space Economy", url: "https://newspaceeconomy.ca/2026/05/28/spacex-starship-from-v1-to-v4/", date: "2026-05-28", read: "direct" },
  "spacecom-mk1": { title: "SpaceX Finishes Assembling New Starship Prototype", publisher: "Space.com", url: "https://www.space.com/spacex-assembles-starship-mk1-photo.html", date: "2019-09", read: "search" },
  "r-spacex": { title: "SpaceX-API, docs/rockets/v4: its Falcon 9 row in query.md and its Falcon Heavy row in all.md", publisher: "r/SpaceX (Apache-2.0, archived 2024)", url: "https://github.com/r-spacex/SpaceX-API/tree/master/docs/rockets/v4", date: "2024-08-17", read: "direct", licence: "Apache-2.0" },
  "wikipedia-falcon-1": { title: "Falcon 1", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_1", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-9": { title: "Falcon 9", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-merlin": { title: "SpaceX Merlin (the engine infobox, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Merlin", date: "2026-11-01", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-dragon-1": { title: "SpaceX Dragon 1", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Dragon_1", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-dragon-2": { title: "SpaceX Dragon 2", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Dragon_2", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-grasshopper": { title: "SpaceX Grasshopper", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Grasshopper", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-9-block-5": { title: "Falcon 9 Block 5", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_Block_5", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-heavy": { title: "Falcon Heavy", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_Heavy", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-5": { title: "Starship flight test 5 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_5", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-7": { title: "Starship flight test 7 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_7", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-12": { title: "Starship flight test 12 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_12", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-fh-test-flight": { title: "Falcon Heavy test flight (its timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_Heavy_test_flight", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-landing-tests": { title: "Falcon 9 first-stage landing tests", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_first-stage_landing_tests", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "sfn-crs-16": { title: "Launch timeline for SpaceX's 16th resupply launch to the space station", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2018/12/05/launch-timeline-for-spacexs-16th-resupply-launch-to-the-space-station/", date: "2018-12-05", read: "direct" },
  "sfn-starlink-2019": { title: "Timeline for Falcon 9 launch of Starlink satellites", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2019/11/11/launch-timeline-for-falcon-9-launch-of-starlink-satellites/", date: "2019-11-11", read: "direct" },
  "sfn-flight-23": { title: "Timeline for the Falcon 9 rocket's 23rd flight", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2016/04/07/timeline-for-the-falcon-9-rockets-23rd-flight/", date: "2016-04-07", read: "direct" },
  "sfn-flight-35": { title: "Timeline of SpaceX's 35th Falcon 9 launch", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/?p=24998", date: "2017-05-31", read: "direct" },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
