// Runs Orbiter's own atmosphere models (the clbkParams of Src/Celbody/Atmosphere/EarthAtm2006, MarsAtm2006 and VenusAtm2006, cut
// unchanged from their files by scripts/orbiter-reference.ts into atmosphere-bodies.inc, each renamed to a free function) at the heights
// on stdin, one "<earth|mars|venus> <altitude in metres>" a line, and prints the answers as JSON.
#include <cmath>
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>
using namespace std;

#define PRM_ALT 0x0001
struct PRM_IN { int flag; double alt; };
struct PRM_OUT { double T, p, rho; };

#include "atmosphere-bodies.inc"

int main() {
  string line;
  bool first = true;
  printf("[");
  while (getline(cin, line)) {
    istringstream in(line);
    string planet;
    double alt;
    if (!(in >> planet >> alt)) continue;
    PRM_IN prm_in = { PRM_ALT, alt };
    PRM_OUT prm = { 0, 0, 0 };
    if (planet == "earth") earth_params(&prm_in, &prm);
    else if (planet == "mars") mars_params(&prm_in, &prm);
    else venus_params(&prm_in, &prm);
    printf("%s{\"planet\":\"%s\",\"altitude\":%.17g,\"temperature\":%.17g,\"pressure\":%.17g,\"density\":%.17g}", first ? "" : ",", planet.c_str(), alt, prm.T, prm.p, prm.rho);
    first = false;
  }
  printf("]\n");
  return 0;
}
