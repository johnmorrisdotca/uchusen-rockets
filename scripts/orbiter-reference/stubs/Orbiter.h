// Stand-in for Orbiter's Orbiter.h, so that Orbiter's own Element.cpp compiles outside Orbiter for scripts/orbiter-reference.ts. Only what Element.cpp uses.
#pragma once
#include <algorithm>
#include <istream>
using std::max;
using std::min;
struct TimeData { double SimT0 = 0, SimT1 = 0, MJD_ref = 51544.5; };
class Orbiter { public: const char *ConfigPath(const char *name) { return name; } };
extern TimeData td;
extern char DBG_MSG[256];
inline bool GetItemReal(std::istream &, const char *, double &) { return false; }
