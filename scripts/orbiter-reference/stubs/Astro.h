// Stand-in for Orbiter's Astro.h with the few lines of it, and of Orbitersdk/include/OrbiterAPI.h, that Element.cpp uses, as Orbiter
// has them (Copyright (c) 2000-2026 Martin Schweiger, MIT licence; see LICENSES/Orbiter-MIT.txt).
#pragma once
#include <cmath>
#include "Vecmat.h"
const double Ggrav = 6.67259e-11;
const double MJD2000 = 51544.5;
inline double posangle (double angle) { double a = fmod (angle, Pi2); return (a >= 0.0 ? a : a+Pi2); }
inline double Jepoch2MJD (double J) { return (J-2000.0)*365.25 + MJD2000; }
inline double MJD2Jepoch (double mjd) { return 2000.0 + (mjd-MJD2000)/365.25; }
