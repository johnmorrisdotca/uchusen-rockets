// Every source a figure may name. Plain facts are taken from these, and each figure says which one it came from. `read` is how this project read it: "direct" means the page itself, "search" that only
// a search engine's quote of it could be read, and "cited" that it is known through another source's citation.

/**
 * A source of a figure: its title, publisher and address, the date on it where it has one, how it was read (directly, by search or cited) and its licence.
 *
 * @example
 * ```ts
 * import { SOURCES, type Source } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const source: Source = SOURCES["wikipedia-starship"];
 * console.log(source.publisher, source.read);
 * ```
 */
export interface Source {
  title: string;
  publisher: string;
  url: string;
  /** The date on the source, when it has one. */
  date?: string;
  read: "direct" | "search" | "cited";
  licence?: string;
}

/**
 * Every source a figure can name, by id. A figure carries only an id; look the id up here for the page it came from.
 *
 * @example
 * ```ts
 * import { SOURCES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(SOURCES).length > 20, SOURCES["wikipedia-starship"].url);
 * ```
 */
export const SOURCES = {
  "uchusen-design": { title: "The SPX fleet of this package: original ships and modules, drawn by its own code", publisher: "SPX", url: "https://github.com/johnmorrisdotca/uchusen-rockets", date: "2026-11-04", read: "direct", licence: "MIT" },
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
  "wikipedia-falcon-1": { title: "Falcon 1 (the infobox and the table of versions, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_1", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "spacex-falcon-1-guide": { title: "Falcon 1 Launch Vehicle Payload User's Guide, Rev 7, as archived by the Internet Archive", publisher: "SpaceX", url: "https://web.archive.org/web/2012/http://www.georing.biz/usefull/Falcon1UsersGuide.pdf", date: "2008", read: "direct" },
  "wikipedia-falcon-9": { title: "Falcon 9", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-merlin": { title: "SpaceX Merlin (the engine infobox, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Merlin", date: "2026-11-01", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-dragon-1": { title: "SpaceX Dragon 1", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Dragon_1", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-dragon-2": { title: "SpaceX Dragon 2", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Dragon_2", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-grasshopper": { title: "SpaceX Grasshopper", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Grasshopper", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-9-ft": { title: "Falcon 9 Full Thrust (the infobox and the section on Block 4, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_Full_Thrust", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-9-block-5": { title: "Falcon 9 Block 5", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_Block_5", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-saturn-v": { title: "Saturn V (the infobox, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Saturn_V", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-apollo-csm": { title: "Apollo command and service module", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Apollo_command_and_service_module", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-apollo-spacecraft": { title: "Apollo (spacecraft), the adapter's panels, and Saturn V instrument unit", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Apollo_(spacecraft)", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-f-1": { title: "Rocketdyne F-1 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rocketdyne_F-1", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-j-2": { title: "Rocketdyne J-2 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rocketdyne_J-2", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-space-shuttle": { title: "Space Shuttle (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Shuttle", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-shuttle-orbiter": { title: "Space Shuttle orbiter (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-shuttle-tank": { title: "Space Shuttle external tank (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Shuttle_external_tank", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "sfn-cassiope": { title: "The launch of the first Falcon 9 v1.1, with CASSIOPE (Spaceflight Now's live coverage, its status page)", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/falcon9/006/cassiopestatus.html", date: "2013-09-29", read: "direct" },
  "sfn-abs-eutelsat": { title: "Mission events timeline for Falcon 9's launch for ABS and Eutelsat", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2016/06/14/mission-events-timeline-for-falcon-9s-launch-for-abs-and-eutelsat/", date: "2016-06-14", read: "direct" },
  "wikipedia-abs-2a": { title: "ABS-2A (its infobox: the rocket was a Falcon 9 Full Thrust)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/ABS-2A", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-be-4": { title: "Blue Origin BE-4 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Blue_Origin_BE-4", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-be-3": { title: "Blue Origin BE-3 (the infobox, for the BE-3 and the BE-3U)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Blue_Origin_BE-3", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-rutherford": { title: "Rutherford (rocket engine) (the infobox and the lead)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-rd-107": { title: "RD-107 (the infobox and its design section, for the RD-107 and the RD-108)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/RD-107", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-kestrel": { title: "SpaceX Kestrel (the infobox and the lead)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Kestrel", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-sls-srb": { title: "Space Launch System Solid Rocket Booster (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Launch_System_Solid_Rocket_Booster", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-shuttle-srb": { title: "Space Shuttle Solid Rocket Booster (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Shuttle_Solid_Rocket_Booster", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-rs-25": { title: "RS-25 (the infobox and the nozzle's sizes)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/RS-25", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-sls": { title: "Space Launch System (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Launch_System", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-orion": { title: "Orion (spacecraft) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Orion_(spacecraft)", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-esm": { title: "European Service Module", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/European_Service_Module", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-new-glenn": { title: "New Glenn (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/New_Glenn", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-electron": { title: "Rocket Lab Electron (the infobox and the fairing's size)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rocket_Lab_Electron", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-soyuz-2": { title: "Soyuz-2 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Soyuz-2", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-vulcan": { title: "Vulcan Centaur (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Vulcan_Centaur", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-ariane-6": { title: "Ariane 6 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Ariane_6", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-spacex": { title: "SpaceX (the infobox: its headquarters)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-nasa": { title: "NASA (the infobox and first lines: an agency of the United States government)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/NASA", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-blue-origin": { title: "Blue Origin (the infobox: its headquarters)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Blue_Origin", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-rocket-lab": { title: "Rocket Lab (the infobox: its headquarters and where it was founded)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rocket_Lab", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-asds": { title: "Autonomous spaceport drone ship", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Autonomous_spaceport_drone_ship", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-lz": { title: "Landing Zones 1 and 2", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Landing_Zones_1_and_2", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-slc-4": { title: "Vandenberg Space Launch Complex 4", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Vandenberg_Space_Launch_Complex_4", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "faa-pea-2022": { title: "Final Programmatic Environmental Assessment for the SpaceX Starship/Super Heavy Launch Vehicle Program at the Boca Chica Launch Site", publisher: "Federal Aviation Administration", url: "https://www.faa.gov/sites/faa.gov/files/2022-06/PEA_for_SpaceX_Starship_Super_Heavy_at_Boca_Chica_FINAL.pdf", date: "2022-06", read: "direct" },
  "wikipedia-starbase": { title: "SpaceX Starbase", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/SpaceX_Starbase", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  openstreetmap: { title: "OpenStreetMap: named places at Starbase, read through its Overpass API", publisher: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", date: "2026-11-02", read: "direct", licence: "ODbL 1.0" },
  "wikipedia-lunar-module": { title: "Apollo Lunar Module (the infobox and its specifications)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Apollo_Lunar_Module", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-apollo-soyuz": { title: "Apollo–Soyuz", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Apollo%E2%80%93Soyuz", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-soyuz-7k-tm": { title: "Soyuz 7K-TM (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Soyuz_7K-TM", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-gemini": { title: "Project Gemini", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Project_Gemini", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-mercury": { title: "Mercury spacecraft", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Mercury_spacecraft", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-jupiter-c": { title: "Jupiter-C (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Jupiter-C", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-iss": { title: "International Space Station (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/International_Space_Station", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-hubble": { title: "Hubble Space Telescope (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Hubble_Space_Telescope", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-tiangong": { title: "Tiangong space station (the infobox and the module table)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tiangong_space_station", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-tianhe": { title: "Tianhe core module (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tianhe_core_module", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-wentian": { title: "Wentian module (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Wentian_module", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-mengtian": { title: "Mengtian module (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Mengtian", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-shenzhou": { title: "Shenzhou (spacecraft) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Shenzhou_(spacecraft)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-tianzhou": { title: "Tianzhou (spacecraft) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tianzhou_(spacecraft)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-zarya": { title: "Zarya (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Zarya_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-unity": { title: "Unity (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Unity_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-zvezda": { title: "Zvezda (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Zvezda_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-destiny": { title: "Destiny (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Destiny_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-harmony": { title: "Harmony (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Harmony_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-columbus": { title: "Columbus (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Columbus_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-kibo": { title: "Kibo (ISS module) (the infobox and the parts' sections)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Kibo_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-truss": { title: "Integrated Truss Structure (the segment table and the solar array wings)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Integrated_Truss_Structure", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-quest": { title: "Quest Joint Airlock (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Quest_Joint_Airlock", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-poisk": { title: "Poisk (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Poisk_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-rassvet": { title: "Rassvet (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rassvet_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-tranquility": { title: "Tranquility (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tranquility_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-cupola": { title: "Cupola (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Cupola_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-leonardo": { title: "Leonardo (ISS module) (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Leonardo_(ISS_module)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-roadster-in-space": { title: "The Roadster launched on Falcon Heavy's test flight (the infobox, and its background and trajectory sections)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Elon_Musk%27s_Tesla_Roadster", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-roadster-first-generation": { title: "The Roadster, first generation (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tesla_Roadster_(first_generation)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-roadster-second-generation": { title: "The Roadster, second generation (the infobox and its history)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tesla_Roadster_(second_generation)", date: "2026-11-11", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-discovery": { title: "Space Shuttle Discovery (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Space_Shuttle_Discovery", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-falcon-heavy": { title: "Falcon Heavy", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_Heavy", date: "2026-10-31", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-5": { title: "Starship flight test 5 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_5", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-7": { title: "Starship flight test 7 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_7", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-flight-12": { title: "Starship flight test 12 (its flight timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Starship_flight_test_12", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-fh-test-flight": { title: "Falcon Heavy test flight (its timeline, read as raw wikitext)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_Heavy_test_flight", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "wikipedia-landing-tests": { title: "Falcon 9 first-stage landing tests", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_first-stage_landing_tests", date: "2026-11-02", read: "direct", licence: "CC BY-SA 4.0" },
  "sfn-crs-16": { title: "Launch timeline for SpaceX's 16th resupply launch to the space station", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2018/12/05/launch-timeline-for-spacexs-16th-resupply-launch-to-the-space-station/", date: "2018-12-05", read: "direct" },
  "sfn-starlink-2019": { title: "Timeline for Falcon 9 launch of Starlink satellites", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2019/11/11/launch-timeline-for-falcon-9-launch-of-starlink-satellites/", date: "2019-11-11", read: "direct" },
  "sfn-flight-23": { title: "Timeline for the Falcon 9 rocket's 23rd flight", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/2016/04/07/timeline-for-the-falcon-9-rockets-23rd-flight/", date: "2016-04-07", read: "direct" },
  "wikipedia-falcon-9-v1-0": { title: "Falcon 9 v1.0 (the infobox)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Falcon_9_v1.0", date: "2026-11-03", read: "direct", licence: "CC BY-SA 4.0" },
  "sfn-cots1-timeline": { title: "Falcon 9/COTS 1 launch timeline", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/falcon9/002/launchtimeline.html", date: "2010-12-06", read: "direct" },
  "sfn-cots1-presskit": { title: "SpaceX COTS Demo Flight 1 press kit (its mission timeline, page 7)", publisher: "SpaceX, as hosted by Spaceflight Now", url: "https://spaceflightnow.com/falcon9/002/cots1_presskit.pdf", date: "2026-11-03", read: "direct" },
  "sfn-flight-35": { title: "Timeline of SpaceX's 35th Falcon 9 launch", publisher: "Spaceflight Now", url: "https://spaceflightnow.com/?p=24998", date: "2017-05-31", read: "direct" },
  "uchusen-fleet-ship-02": { title: "ISV 加美鳴 Kaminari, SPX-207, the Interstellar Heavy Transport: an original SPX fleet design (docs/fleet/ship-02.md)", publisher: "John Morris, uchusen-rockets", url: "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/docs/fleet/ship-02.md", date: "2026-11-04", read: "direct", licence: "MIT" },
  "uchusen-fleet-kaminari-concepts": { title: "ISV 加美鳴 Kaminari, SPX-207, with ISV Emiake and ISV Romaryū (docs/fleet/kaminari-concepts.md)", publisher: "John Morris, uchusen-rockets", url: "https://github.com/johnmorrisdotca/uchusen-rockets/blob/main/docs/fleet/kaminari-concepts.md", date: "2026-11-04", read: "direct", licence: "MIT" },
  "wikipedia-voyager-1": { title: "Voyager 1 (its speed leaving the Solar System, 61,602 km/h in 2013)", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Voyager_1", date: "2026-11-04", read: "direct", licence: "CC BY-SA 4.0" },
} as const satisfies Record<string, Source>;

/**
 * The id of a source in `SOURCES`.
 *
 * @example
 * ```ts
 * import type { SourceId } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const id: SourceId = "wikipedia-starship";
 * console.log(id);
 * ```
 */
export type SourceId = keyof typeof SOURCES;
