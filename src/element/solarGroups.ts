// Which bodies the compare page draws when the camera is far out. Pure: the page and the viewer both ask this, so the marks and the meshes cannot disagree.

export const SKY_GROUPS = ["planets", "moons", "dwarfs", "belts", "craft"] as const;

export type SkyGroup = (typeof SKY_GROUPS)[number];

export type SkyShown = Record<SkyGroup, boolean>;

const PLANETS = new Set(["sun", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]);
const DWARFS = new Set(["ceres", "pluto", "haumea", "makemake", "eris"]);

/** Planets, moons or dwarf planets. Anything else is not a sky body. */
export function skyGroupOf(id: string): "planets" | "moons" | "dwarfs" | null {
  if (id === "moon") return "moons";
  if (PLANETS.has(id)) return "planets";
  if (DWARFS.has(id)) return "dwarfs";
  return null;
}

/** Every group on when the address has nothing, so the first visit shows the sky. */
export function skyShown(raw: string | null): SkyShown {
  const named = raw?.split(",").filter((part) => (SKY_GROUPS as readonly string[]).includes(part)) ?? [];
  const all = named.length === 0;
  return {
    planets: all || named.includes("planets"),
    moons: all || named.includes("moons"),
    dwarfs: all || named.includes("dwarfs"),
    belts: all || named.includes("belts"),
    craft: all || named.includes("craft"),
  };
}

/** The address value. Null when every group is on, so a plain visit stays a plain address. */
export function skyQuery(shown: SkyShown): string | null {
  const on = SKY_GROUPS.filter((id) => shown[id]);
  return on.length === SKY_GROUPS.length ? null : on.join(",");
}

export type SkySpot = { id: string; x: number; y: number; range: number; radius: number };

/**
 * The marks that fit. Largest first, then nearest. One that sits within `gap` pixels of a mark already kept is left out, and the list stops at `limit`.
 */
export function thinSky(spots: readonly SkySpot[], limit: number, gap: number): SkySpot[] {
  const ranked = [...spots].sort((a, b) => b.radius - a.radius || a.range - b.range);
  const kept: SkySpot[] = [];
  const gap2 = gap * gap;
  for (const spot of ranked) {
    if (kept.length >= limit) break;
    const close = kept.some((one) => (one.x - spot.x) ** 2 + (one.y - spot.y) ** 2 < gap2);
    if (!close) kept.push(spot);
  }
  return kept;
}
