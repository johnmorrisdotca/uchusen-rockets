# ISV 鏡鳥 Kyotori, SPX-045 (the mirror bird)

Planned first flight 2469. The fleet's explorer of ships and a station: four ships of one class that dock into the housing at the stern of a station with a figured mirror ahead and four quarters of eight decks each. This package's own design; every figure is a design and says so. Concepts for John's V2, built to the standard of Hanabusa. Names of the four ships come later: A, B, C and D stand in.

**鏡鳥 · Kyotori · "mirror bird".** Designation SPX-045. Class: explorer. The English is `IDENTITY.plain` in `src/model/fleet/ship-kyotori/specs.ts`. The record has no kana reading.

## Identity

What the record gives, from `specification()` in that file. A row it does not give is left as not given, not filled in.

| | |
|---|---|
| Name | ISV 鏡鳥 Kyotori, SPX-045 |
| Layout | Two ships (A and B) side by side, docked into the housing at the stern of a station that has room for four |
| Station rim | 60 m, 3.86 rpm, 1.00 g, computed from the radius |
| Quarters | four towers of eight decks |
| Drive | two drives of twelve coil rings, no bell. One drive on each ship |
| Length, beam, height | not given |
| Dry mass, full mass, propellant, cargo | not given |
| Crew | not given as a number. The class table says "the standard crew", and ship D adds about a hundred |
| Max g, cruise, theoretical speed, range, endurance | not given |

Strengths, from the page below: the four ships can part, and a ship alone is a lean runner while the station stays. Weaknesses the record states: the ships' names are not chosen.

## The class: four ships of one design

The Kyotori class has four ships, A, B, C and D. They share one model (the drive of twelve coil rings, the tank bouquet on the outer faces, the truss, the latch frames, the bows and the docking arms) and each carries one group of its own. Each is its own variant record on the viewer's picker and shares every part it does not change.

| | Ship A | Ship B | Ship C | Ship D |
|---|---|---|---|---|
| Role | survey and mapping | laboratory | astronomy | crew and medical |
| Hull | the long hull with the payload bay and the glass lift | the short hull with the crew space | the long hull with the payload bay and the glass lift | the short hull with the crew space |
| Its own compartments | two sensor booms with radar, lidar and camera heads | sample labs, a clean room and a cold store | a second telescope on its own mast | extra quarters and a sick bay |
| Instruments | radar, lidar, cameras and star trackers on 34 m booms | two laboratory modules and a refrigerated sample store | a seven-segment mirror with a sun shield | a medical pod with a treatment bay and isolation room |
| Crew | the standard crew | the standard crew and a laboratory staff | the standard crew and an observing staff | the standard crew and about a hundred more |
| Shared | drive of twelve coil rings, tank bouquet, latch frames, bows and docking arms | same | same | same |
| Name | to be chosen (A) | to be chosen (B) | to be chosen (C) | to be chosen (D) |

## The station

A hub on a bearing with four airlocks, four lift houses and four S-class ports; four arms of corridor and lift to four quarters; a slim rim that turns the quarters at 3.86 rpm for 1.00 g at its 60 m radius (computed from the radius in code); the stem and the figured mirror ahead of the hub. Each quarter is a tower of eight decks of furnished rooms (cabins, mess and galley, gym, medical bay, lounges, school, gardens: the kit's rooms), a shell of facets with a lit window in each, and an end of its own: the control quarter's Cupola and dishes, the laboratory quarter's radiator fins, the observatory quarter's two telescopes, the engineering quarter's reactor can and tanks. Descends from the Stanford torus's apartment towers and the ISS's Destiny and Harmony racks, the ISS's Node 3 and Cupola, and Nautilus-X's centrifuge.

## Solar wings

Four wings on diagonal masts, in the ISS manner and in three states: stowed (two canisters of folded blanket on each mast), flared (the wing swung out with half the blanket let out), and full (the mast, an extending lattice of two sections, extended by 22 m so that the blanket unfolds to double its length). The blankets are one group, wing-turn, for the viewer's Motion choice. On the flared wings the outer lattice is its own group, mast-extend, and slides 22 m out to the full length. The full wings stay the extended drawing. Descends from the ISS solar wings on their rotary joints and masts.

## Docking (LESSONS 31)

Ports are typed data first (src/model/fleet/ship-kyotori/docking.ts) and the pieces are drawn from the same numbers.
- An H-class dock at every quarter, at the end of a stub that leaves the tower's flank and faces aft, on a despun bearing so the ring does not turn the ship docking at it. Why aft and along the axis: the ISS keeps its visiting-vehicle ports on the axial faces of its nodes (Harmony's forward port, the zenith and nadir ports of Unity), so vehicles arrive along one line and the plane of the rim stays clear; the outward end of a quarter is where the rim's bearing runs. A walkway runs from each dock into the quarter, so people dock at a quadrant and walk in.
- A Crew Dragon (an adapter from the H ring to its own port) at the control quarter and a Starship upper stage at the observatory quarter are drawn attached in the default look, from the package's own models at true scale, as photographs show Dragon on the ISS.
- Four L-class bays in the housing at the stern, at the corners of a square 27 m on a side, each with twelve capture latches, four umbilical plates, four guide petals, approach lamps and floodlights. They take the 2x2 cluster of four ships (latched along two faces each, tanks on the outer faces only, drives side by side steered three degrees outward so no beam meets a neighbour); the other arrangement, one ship at each quarter's dock, stays possible, and a test holds both. Descends from the ISS's common berthing mechanism and the NASA docking system's latch ring.
- Four S ports on the hub's forward shoulder, a crew-vehicle arm on each ship and an M dock in the long ship's bay.

## Drive

Each ship has its own drive of twelve field coils flaring out of a reactor chamber: the field is the nozzle, no bell (LESSONS 29). The exhaust is a narrow collimated beam straight aft; magnetic-nozzle plasma drives, drawn as field coils: no bell.

## Real ancestors

- quarters: the Stanford torus's apartment towers and the ISS's Destiny and Harmony racks.
- wings: the ISS solar wings on their rotary joints and masts.
- housing: the ISS's common berthing mechanism and the NASA docking system's latch ring.
- bay: the Space Shuttle's payload bay doors, their radiators and latch gangs.
- mirror: the James Webb Space Telescope's eighteen segments, backplane and five-layer sunshield.
- hub: the ISS's Node 3 and Cupola, and Nautilus-X's centrifuge.
- tanks: the Space Shuttle's external tank blankets and the ISS's pressurant tank valve clusters.
- drive: magnetic-nozzle plasma drives, drawn as field coils: no bell.

## Honest weak spots

The rooms are the kit's furniture sets in plain decks; the quarters' outsides are patterned shells. The full wings are still their own drawing; the slide lives on the flared wings. The mirror segments are shallow facets. Latch frame loads are not computed. See the concept boards in the pictures folder for the references and the look.

## Motion

With the Motion choice on, the four solar wings turn on their masts; see [motion.md](motion.md).
