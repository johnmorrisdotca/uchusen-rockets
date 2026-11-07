// Where the Sun, the planets and the major moons sit in the compare scene. The craft stays at the origin. The Earth is held 400 km under it, and everything else is measured from that.
import { apparent, BODIES, heliocentric, moonGeocentric, system, type BodyId, type HostId } from "@johnmorrisdotca/wakusei-planets";

export const AU_M = 149_597_870_700;

type Triple = readonly [number, number, number];

const DROP_M = BODIES.earth.radiusKm * 1000 + 400_000;
const MOON_HOSTS: HostId[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

export function earthCentre(): Triple {
  return [0, -DROP_M, 0];
}

/** Scene metres of a heliocentric place, in AU, with the Earth held under the craft. Ecliptic z is up. */
export function sceneOf(place: Triple, earth: Triple): Triple {
  const [ex, ey, ez] = earthCentre();
  return [ex + (place[0] - earth[0]) * AU_M, ey + (place[2] - earth[2]) * AU_M, ez + (place[1] - earth[1]) * AU_M];
}

/** The Sun or a planet, in scene metres, at `when`. */
export function bodyScene(id: "sun" | HostId, when: number): Triple {
  const earth = heliocentric("earth", when);
  if (id === "earth") return earthCentre();
  if (id === "sun") return sceneOf([0, 0, 0], earth);
  return sceneOf(heliocentric(id, when), earth);
}

/** The Earth's Moon, in scene metres. */
export function moonScene(when: number): Triple {
  const [mx, my, mz] = moonGeocentric(when);
  const [ex, ey, ez] = earthCentre();
  return [ex + mx * 1000, ey + mz * 1000, ez + my * 1000];
}

export type MoonSpot = { id: string; at: Triple; radiusM: number };

const radiusOf = (id: string): number => (id in BODIES ? BODIES[id as BodyId].radiusKm : 200);

/**
 * The major moons other than the Earth's, in scene metres. Their places come from the package's
 * system view, turned back into the ecliptic with the same frame that view uses.
 */
export function majorMoons(when: number): MoonSpot[] {
  const earth = heliocentric("earth", when);
  const spots: MoonSpot[] = [];
  for (const host of MOON_HOSTS) {
    const pose = apparent(host, when);
    const centre = sceneOf(heliocentric(host, when), earth);
    const radius = BODIES[host].radiusKm;
    const { right, up, toward } = pose.frame;
    for (const moon of system(host, when).moons) {
      const sx = moon.x * radius;
      const sy = moon.y * radius;
      const sz = moon.z * radius;
      const kmx = sx * right[0] + sy * up[0] + sz * toward[0];
      const kmy = sx * right[1] + sy * up[1] + sz * toward[1];
      const kmz = sx * right[2] + sy * up[2] + sz * toward[2];
      spots.push({
        id: moon.id,
        at: [centre[0] + kmx * 1000, centre[1] + kmz * 1000, centre[2] + kmy * 1000],
        radiusM: radiusOf(moon.id) * 1000,
      });
    }
  }
  return spots;
}

export type BeltKind = "asteroids" | "kuiper";

const BELT: Record<BeltKind, { count: number; inner: number; outer: number; tilt: number; radiusM: number; seed: number }> = {
  asteroids: { count: 420, inner: 2.15, outer: 3.25, tilt: 6, radiusM: 4e9, seed: 485001 },
  kuiper: { count: 560, inner: 30, outer: 50, tilt: 12, radiusM: 2e10, seed: 485002 },
};

/** A faint band of dots between two distances from the Sun. Not a catalogue: the published span of that belt, scattered so it reads as a band. */
export function beltPlaces(kind: BeltKind, when: number): { at: Triple; radiusM: number }[] {
  const spec = BELT[kind];
  const earth = heliocentric("earth", when);
  let n = spec.seed;
  const next = (): number => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return (n % 10000) / 10000;
  };
  const tilt = (spec.tilt * Math.PI) / 180;
  const places: { at: Triple; radiusM: number }[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    const au = spec.inner + (spec.outer - spec.inner) * next();
    const ang = next() * Math.PI * 2;
    const inc = (next() - 0.5) * 2 * tilt;
    const x = au * Math.cos(ang);
    const y = au * Math.sin(ang) * Math.cos(inc);
    const z = au * Math.sin(ang) * Math.sin(inc);
    places.push({ at: sceneOf([x, y, z], earth), radiusM: spec.radiusM });
  }
  return places;
}
