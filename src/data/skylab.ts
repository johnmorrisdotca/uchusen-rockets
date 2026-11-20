// Skylab. The launch date, the launch mass, the funding agency and the five parts are NASA's NSSDCA catalogue page for 1973-027A, read 2026-11-17. The lengths and diameters of the workshop, airlock, docking adapter and telescope mount are the table "General characteristics of the Skylab cluster" in NASA SP-400, Skylab, Our First Space Station, chapter 2, read the same day. No source read gives the solar wings' size or where the telescope mount sat along the axis, so neither is drawn.
import type { Variant } from "./types.ts";

const CATALOGUE = "nasa-nssdca-skylab" as const;
const BOOK = "nasa-sp-400-chapter-2" as const;

/** NASA SP-400's table, in metres. */
const OWS = 14.66;
const AM = 5.36;
const MDA = 5.27;
/** The three modules that make the cylinder, end to end. */
const LENGTH = OWS + AM + MDA;

/** Skylab: the workshop, airlock and docking adapter as one cylinder of three tubes. */
export const SKYLAB: Variant = {
  id: "skylab",
  rocket: "skylab",
  name: "Skylab",
  status: "flown",
  firstFlight: { value: "1973-05-14", source: CATALOGUE, note: "NASA's launch date. SP-400 and NASA's history page give the same day." },
  slots: ["craft"],
  facts: {
    height: { value: Number(LENGTH.toFixed(2)), source: BOOK, note: "The sum of three lengths in NASA SP-400's table: the workshop 14.66 m, the airlock module 5.36 m and the docking adapter 5.27 m. NASA states no overall length in the pages read, so this sum is this package's own, and it leaves out the command and service module that docked and the telescope mount, which stood out from the side." },
    diameter: { value: 6.7, source: BOOK, note: "The orbital workshop's 6.70 m (22.0 ft) in NASA SP-400's table; the text says the fixed airlock shroud had the same diameter." },
    parts: {
      craft: { value: Number(LENGTH.toFixed(2)), source: BOOK, note: "Workshop, airlock module and docking adapter end to end." },
    },
    engines: {},
    more: {
      mass: { value: 90607, source: CATALOGUE, note: "NASA's catalogue page: 90607 kg. NASA SP-400's first chapter says the five assemblies together weighed 'nearly 100 tons'." },
      workshopLength: { value: OWS, source: BOOK, note: "The orbital workshop, 14.66 m (48.1 ft) long and 6.70 m (22.0 ft) across, in NASA SP-400's table." },
      airlockLength: { value: AM, source: BOOK, note: "The airlock module and fixed airlock shroud, 5.36 m (17.6 ft) long. The table gives three diameters for it, 3.04, 1.67 and 6.70 m, and no lengths for them, so only the 3.04 m body is drawn." },
      dockingAdapterLength: { value: MDA, source: BOOK, note: "The multiple docking adapter, 5.27 m (17.3 ft) long and 3.04 m (10.0 ft) across. The text says 17 feet long and 10 feet in diameter." },
      telescopeMountLength: { value: 4.05, source: BOOK, note: "The Apollo Telescope Mount, 4.05 m (13.3 ft) long and 3.35 m (11.0 ft) across. NASA's catalogue page puts it at 90 degrees to the cluster's long axis and gives no place along it, so it is not drawn." },
    },
    sizes: { Workshop: { value: OWS, source: BOOK, note: "14.66 m." }, Airlock: { value: AM, source: BOOK, note: "5.36 m." }, "Docking adapter": { value: MDA, source: BOOK, note: "5.27 m." } },
  },
  note: "Skylab, the cluster as it was launched without the docked Apollo spacecraft. The lengths and diameters are NASA SP-400's table; the date, the mass and the funding agency are NASA's catalogue page. The line looks are this package's own three tubes: the workshop, the airlock module's 3.04 m body and the docking adapter. The airlock shroud's wider and narrower diameters, the telescope mount and the solar wings are not in that drawing: no source read gives their places or the wings' size. The painted look is NASA's model, scaled so its round body is the sourced 6.70 m; at that scale the file stands 31.46 m and the arrays reach 24.24 m across. No name or mark is drawn. Maker NASA (the funding agency; the contractors are not recorded here), country the United States.",
};

export const SKYLAB_VARIANTS: readonly Variant[] = [SKYLAB];
