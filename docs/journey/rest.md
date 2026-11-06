# The rest of a trip (MODULES-400)

John, 2026-11-04: cover what a real trip needs beyond the basics. This is the list, written before any of it is built. Each row after the first table is one later slice, in the order a person would miss it, and each one ships on its own.

The reference pictures stay outside the repository. They set the mood. Nothing in them is copied.

## Already on the page

These are in `src/journey/` and on `demo/journey.html`. They are not built again.

- **Escape and circular speed.** `circularSpeed` and `escapeBurn`. The departure burn from a parking orbit is the escape burn for the speed the transfer needs at infinity.
- **Hohmann transfers and launch windows.** `hohmann`, the patched-conic burn, and `windows`, from the planets' real positions. The Moon needs no window.
- **The Moon's own speed as a help.** Leaving the Moon for another planet takes the Moon's orbital speed as helping (`leaveForPlanet`). A swing past a third body is not this, and is still to do.
- **Delta-v of the trip.** Both burns are on the panel. A continuous-thrust ship uses flip-and-burn, and the propellant used is checked against what it carries.
- **Signal delay.** `signalS` is on the panel during the flight and on the arrival card.
- **Two clocks.** Ship time and Earth time are on the panel and the card for a flip-and-burn. The sentence that says what that means is still to do.

## Still to build

1. **A 1 g comfort choice.** The page flies each fleet ship at its own design acceleration. Add a choice of 1 g beside that, and show how much longer the same trip takes. The ticket names 1.61 million g as the extreme on the reference sheet. The page does not offer that as a way to fly.
2. **Mass ratio on this trip.** The fleet bibles already compute a mass ratio for their own voyages. The journey page should say, for the trip on screen, the mass ratio the rocket equation gives and whether the craft's tanks hold it. A chemical rocket aimed past the solar system says it cannot, with the delta-v it would need, rather than a made-up fuel load.
3. **The twin-paradox note.** The two clocks are already numbers. Add one sentence beside them: the travelling clock runs slow, and the summary is where the two times are stated together. No new formula.
4. **Escape speed as its own line.** The burn is shown. The escape speed of the parking orbit, and the body's escape speed from the surface, are not labelled. One line each, from the same `mu` the burn already uses.
5. **A gravity assist.** A direct Hohmann is what the page flies. A later slice can offer one swing past a third body (Jupiter on the way out), with the delta-v it saves and a path that says it is an assist. The Moon's help, above, stays as it is.
6. **Radiation and dust.** On the panel. The ship bibles describe shields and name no figure, so the row says no source. Not a simulation.
7. **The CMB ahead.** On the panel: 2.72548 K ± 0.00057 K, Fixsen 2009, ApJ 707, 916, from COBE/FIRAS. Radiation and dust stay "no source".

## What done looks like for this list

This file is the slice. The seven rows above are not built here. The next slice is row 1.
