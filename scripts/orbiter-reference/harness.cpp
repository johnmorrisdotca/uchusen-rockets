// Runs Orbiter's own Elements class (Src/Orbiter/Element.cpp, compiled unchanged) on the cases scripts/orbiter-reference.ts passes in,
// and prints what it gives as JSON. Input on stdin, one case a line: mu x y z vx vy vz followed by the times. Vectors are read and
// written in Orbiter's left-handed frame (y is the pole); the script swaps y and z on the way in and out.
#include "Orbiter.h"
#include "Element.h"
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

TimeData td;
char DBG_MSG[256];
Orbiter *g_pOrbiter = nullptr;

int main() {
  std::string line;
  bool first = true;
  std::printf("[");
  while (std::getline(std::cin, line)) {
    std::istringstream in(line);
    double mu, x, y, z, vx, vy, vz, t;
    if (!(in >> mu >> x >> y >> z >> vx >> vy >> vz)) continue;
    std::vector<double> times;
    while (in >> t) times.push_back(t);
    Elements el;
    el.SetMasses(0.0, mu / Ggrav);
    el.Calculate(Vector(x, y, z), Vector(vx, vy, vz), 0.0);
    std::printf("%s{\"a\":%.17g,\"e\":%.17g,\"i\":%.17g,\"node\":%.17g,\"argPeriapsis\":%.17g,\"longitudePeriapsis\":%.17g,"
                "\"trueAnomaly\":%.17g,\"eccentricAnomaly\":%.17g,\"meanAnomaly\":%.17g,\"periapsis\":%.17g,\"semiLatus\":%.17g,"
                "\"period\":%.17g,\"apoapsis\":%.17g,\"timeToPeriapsis\":%.17g,\"states\":[",
                first ? "" : ",", el.a, el.e, el.i, el.theta, el.ArgPer(), el.omegab, el.TrueAnm(), el.EccAnm(), el.MeanAnm(),
                el.PeDist(), el.P(), el.e < 1 ? el.OrbitT() : -1.0, el.e < 1 ? el.ApDist() : -1.0, el.PeT());
    for (size_t k = 0; k < times.size(); k++) {
      Vector pos, vel;
      el.PosVel(pos, vel, times[k]);
      std::printf("%s{\"t\":%.17g,\"position\":[%.17g,%.17g,%.17g],\"velocity\":[%.17g,%.17g,%.17g]}", k ? "," : "", times[k], pos.x, pos.y, pos.z, vel.x, vel.y, vel.z);
    }
    std::printf("]}");
    first = false;
  }
  std::printf("]\n");
  return 0;
}
