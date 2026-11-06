// The compare page's Earth and Moon, at their true sizes, and a star field. The craft stay at the origin, 400 km above the surface. Loaded only when a page asks for it.
import { BODIES, DWARF_IDS, heliocentric, moonGeocentric, PLANET_IDS, type HostId } from "@johnmorrisdotca/wakusei-planets";
import { BufferAttribute, BufferGeometry, Group, LineLoop, LineBasicMaterial, Mesh, MeshBasicMaterial, Points, PointsMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from "three";

const ALTITUDE_M = 400_000;
const STAR_R_M = 2e13;
const AU_M = 149_597_870_700;
const ORBIT_IDS: HostId[] = [...PLANET_IDS, ...DWARF_IDS.filter((id) => id === "ceres" || id === "haumea" || id === "makemake" || id === "eris")];

/** Stars as points, so a wide view stays a sky and not a stretched picture. */
function starField(): Points {
  const count = 420;
  const positions = new Float32Array(count * 3);
  let n = 20261106;
  for (let i = 0; i < count; i += 1) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const u = (n % 10000) / 10000;
    n = (n * 1664525 + 1013904223) >>> 0;
    const v = (n % 10000) / 10000;
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    positions[i * 3] = STAR_R_M * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = STAR_R_M * Math.cos(phi);
    positions[i * 3 + 2] = STAR_R_M * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: "#d5def2", size: 1.5, sizeAttenuation: false }));
}

type Triple = readonly [number, number, number];

const turn = (a: Triple, b: Triple): number => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const denom = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]);
  return Math.acos(Math.min(1, Math.max(-1, dot / (denom || 1))));
};

/** One lap of a planet, sampled from the ephemeris until it has gone all the way round. */
function orbitPoints(id: HostId, when: number, earth: Triple): Float32Array {
  const day = 86_400_000;
  const start = heliocentric(id, when);
  const step0 = turn(start, heliocentric(id, when + day));
  const guess = ((2 * Math.PI) / Math.max(step0, 1e-8)) * day;
  const step = Math.max(day, guess / 80);
  const raw: Triple[] = [];
  let t = when;
  let prev = start;
  let swept = 0;
  while (swept < Math.PI * 2 && raw.length < 120) {
    t += step;
    const place = heliocentric(id, t);
    swept += turn(prev, place);
    prev = place;
    raw.push(place);
  }
  const positions = new Float32Array(raw.length * 3);
  raw.forEach((place, index) => {
    positions[index * 3] = (place[0] - earth[0]) * AU_M;
    positions[index * 3 + 1] = (place[2] - earth[2]) * AU_M;
    positions[index * 3 + 2] = (place[1] - earth[1]) * AU_M;
  });
  return positions;
}

/** The planets' paths around the Sun, in the same frame as the Earth. Hidden until the camera is far enough that a path is something you can see. */
function planetOrbits(when: number): Group {
  const orbits = new Group();
  orbits.name = "planet-orbits";
  orbits.visible = false;
  const earth = heliocentric("earth", when);
  for (const id of ORBIT_IDS) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(orbitPoints(id, when, earth), 3));
    const line = new LineLoop(geometry, new LineBasicMaterial({ color: "#6e7c90" }));
    line.name = `orbit-${id}`;
    orbits.add(line);
  }
  return orbits;
}

/** The Earth under the craft, the Moon where it is today, and the stars behind both. `ready` runs when the Earth's picture has arrived. */
export function orbitWorld(ready: () => void): { group: Group; dispose: () => void } {
  const earthR = BODIES.earth.radiusKm * 1000;
  const moonR = BODIES.moon.radiusKm * 1000;
  const group = new Group();
  group.name = "orbit-world";
  const stars = starField();
  stars.name = "stars";
  stars.renderOrder = -1;
  (stars.material as PointsMaterial).depthWrite = false;
  const earth = new Mesh(new SphereGeometry(earthR, 96, 64), new MeshBasicMaterial({ color: "#1a4f86" }));
  earth.name = "earth";
  earth.position.set(0, -(earthR + ALTITUDE_M), 0);
  const [mx, my, mz] = moonGeocentric(Date.now());
  const moon = new Mesh(new SphereGeometry(moonR, 48, 32), new MeshBasicMaterial({ color: "#c4bfb4" }));
  moon.name = "moon";
  moon.position.set(earth.position.x + mx * 1000, earth.position.y + mz * 1000, earth.position.z + my * 1000);
  const orbits = planetOrbits(Date.now());
  orbits.position.copy(earth.position);
  group.add(stars, earth, moon, orbits);
  const loader = new TextureLoader();
  const base = new URL("textures/", document.baseURI);
  const paint = (file: string, body: Mesh) => {
    loader.load(new URL(file, base).href, (map) => {
      map.colorSpace = SRGBColorSpace;
      const material = body.material as MeshBasicMaterial;
      material.map = map;
      material.color.set("#ffffff");
      material.needsUpdate = true;
      if (body === earth) ready();
    });
  };
  paint("day-2048.webp", earth);
  paint("moon-2048.webp", moon);
  return {
    group,
    dispose: () => {
      group.traverse((node) => {
        const mesh = node as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as MeshBasicMaterial | undefined;
        material?.map?.dispose();
        material?.dispose();
      });
    },
  };
}
