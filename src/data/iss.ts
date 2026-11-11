// The International Space Station as its article gives it: 109 m long overall, 73 m across its solar arrays; and its modules as their own articles give them. NASA's model is scaled to the 109 m, and its arrays
// then span 71.7 m. It is cut into parts by where each stands in that model, so a module's length here is the model's at that scale, with its article's figure beside it.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-iss" as const;
export const ISS_LONG: Figure = { value: 109, source: S, note: "358 feet overall; 94 m (310 feet) for the truss." };
/** NASA's model at the sourced length. */
export const ISS_DRAWN_TALL = 71.66;

const drawn = (what: string, metres: number, article: string, sourced: number) => blank(`${what}: NASA's model at the station's sourced length draws it ${metres} m; its article gives ${sourced} m (${article}).`);

export const ISS_VARIANTS: readonly Variant[] = [
  {
    id: "iss",
    rocket: "iss",
    name: "International Space Station",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "1998-11-20", source: S },
    slots: [
      "zvezda", "zarya", "unity", "destiny", "harmony",
      "soyuz-aft", "soyuz-zvezda-nadir", "soyuz-zvezda-zenith", "soyuz-zarya-nadir", "airlock", "columbus", "kibo",
      "truss-s0", "truss-s1", "truss-p1", "truss-s3-s4", "truss-p3-p4", "truss-s5", "truss-p5", "truss-s6", "truss-p6",
      "arrays-s4", "arrays-p4", "arrays-s6", "arrays-p6", "radiators-starboard", "radiators-port",
    ],
    note: "NASA's model, of the station as it was when that was made, in the painted look, one file a part, scaled to the sourced length; it is not today's station. NASA's copy leaves its materials all one grey: their colours are judged from photographs. This package's own plain shapes in the line looks. It stands with its truss across the front, Zvezda's aft at the foot and Harmony at the top: height here is across its arrays. The four visiting craft are those the model carries, Soyuz or Progress as it draws them.",
    facts: {
      height: { value: 73, source: S, note: "239 feet, across its solar arrays. NASA's model, at the sourced length, comes to 71.7 m." },
      diameter: ISS_LONG,
      parts: {
        zvezda: drawn("Zvezda with its transfer compartment", 11.9, "wikipedia-zvezda", 13.1),
        zarya: drawn("Zarya", 10.8, "wikipedia-zarya", 12.56),
        unity: drawn("Unity with PMA-1, which the model draws narrow", 4.7, "wikipedia-unity", 5.47),
        destiny: drawn("Destiny", 6.3, "wikipedia-destiny", 8.5),
        harmony: drawn("Harmony with PMA-2", 5.6, "wikipedia-harmony", 6.7),
        "soyuz-aft": blank("A visiting craft at Zvezda's aft port, as NASA's model draws it: 5.5 m. A Soyuz is 7.48 m."),
        "soyuz-zvezda-nadir": blank("A visiting craft at Zvezda's nadir port, lying out from the run: its height here is its width, 2.2 m."),
        "soyuz-zvezda-zenith": blank("A visiting craft at Zvezda's zenith port, lying out from the run: its height here is its width, 2.2 m."),
        "soyuz-zarya-nadir": blank("A visiting craft at Zarya's nadir port, lying out from the run: its height here is its width, 2.2 m."),
        airlock: blank("The airlock, lying out from the run where NASA's model puts it, under Unity: its height here is its width, 3.7 m. Quest is 5.5 m long and 4 m across in its article."),
        columbus: blank("Columbus lies out from Harmony's starboard side: its height here is its width, 3.7 m. Its article gives 6.9 m long and 4.5 m across; the model draws it 5.75 m long."),
        kibo: blank("Kibo lies out from Harmony's port side, with its logistics module on top and its exposed facility beyond: its height here is across them, 7 m. Its pressurised module is 11.2 m long and 4.4 m across in its article; the model draws it 7.5 m long."),
        "truss-s0": blank("The truss's centre segment, 2 m deep as the model draws it; S0 is 13.4 m long in its article."),
        "truss-s1": blank("A truss segment, 2 m deep as the model draws it; S1 is 13.7 m long in its article."),
        "truss-p1": blank("A truss segment, 2 m deep as the model draws it; P1 is 13.7 m long in its article."),
        "truss-s3-s4": blank("A truss segment, 2 m deep as the model draws it; S3/S4 is 13.7 m long in its article."),
        "truss-p3-p4": blank("A truss segment, 2 m deep as the model draws it; P3/P4 is 13.7 m long in its article."),
        "truss-s5": blank("A truss segment, 2 m deep as the model draws it; S5 is 3.37 m long in its article."),
        "truss-p5": blank("A truss segment, 2 m deep as the model draws it; P5 is 3.37 m long in its article."),
        "truss-s6": blank("A truss segment, 2 m deep as the model draws it; S6 is 13.7 m long in its article."),
        "truss-p6": blank("A truss segment, 2 m deep as the model draws it; P6 is 18.3 m long in its article."),
        "arrays-s4": blank("A pair of solar array wings, 71.7 m tip to tip as the model draws them; each wing is 34 m by 12 m in the truss's article."),
        "arrays-p4": blank("A pair of solar array wings, 71.7 m tip to tip as the model draws them; each wing is 34 m by 12 m in the truss's article."),
        "arrays-s6": blank("A pair of solar array wings, 71.7 m tip to tip as the model draws them; each wing is 34 m by 12 m in the truss's article."),
        "arrays-p6": blank("A pair of solar array wings, 71.7 m tip to tip as the model draws them; each wing is 34 m by 12 m in the truss's article."),
        "radiators-starboard": blank("Three radiator panels hanging from the truss, 19.4 m as the model draws them; no source read here gives their size."),
        "radiators-port": blank("Three radiator panels hanging from the truss, 19.4 m as the model draws them; no source read here gives their size."),
      },
      engines: {},
      more: {
        truss: { value: 94, source: S, note: "The truss's length, in metres." },
        "zvezda-length": { value: 13.1, source: "wikipedia-zvezda", note: "43 feet; 4.35 m across; launched 2000-07-12." },
        "zarya-length": { value: 12.56, source: "wikipedia-zarya", note: "41.2 feet; 4.11 m across; launched 1998-11-20." },
        "unity-length": { value: 5.47, source: "wikipedia-unity", note: "17.9 feet; 4.57 m across; launched 1998-12-04." },
        "destiny-length": { value: 8.5, source: "wikipedia-destiny", note: "28 feet; 4.3 m across; launched 2001-02-07." },
        "harmony-length": { value: 6.7, source: "wikipedia-harmony", note: "22 feet; 4.4 m across; launched 2007-10-23." },
        "columbus-length": { value: 6.9, source: "wikipedia-columbus", note: "23 feet; 4.5 m across; launched 2008-02-07, berthed on Harmony's starboard side." },
        "kibo-length": { value: 11.2, source: "wikipedia-kibo", note: "Its pressurised module, 4.4 m across, launched 2008-05-31; its logistics module is 4.2 m long and its exposed facility 4 m, on Harmony's port side." },
        "quest-length": { value: 5.5, source: "wikipedia-quest", note: "18 feet; 4 m across; launched 2001-07-12, berthed on Unity's starboard side." },
        "array-wing": { value: 34, source: "wikipedia-truss", note: "Each solar array wing, by 12 m wide; four pairs, on P6, P4, S4 and S6." },
        "truss-s0-length": { value: 13.4, source: "wikipedia-truss", note: "Launched 2002-04-08; S1 and P1 13.7 m, S3/S4 and P3/P4 13.7 m, S5 and P5 3.37 m, S6 13.7 m, P6 18.3 m." },
      },
    },
  },
];
