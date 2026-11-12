// Runs Orbiter's own quaternion code (Src/Orbiter/Vecmat.cpp, compiled unchanged: mul, tmul, Quaternion::Rotate) and its Euler equation
// (RigidBody::EulerInv_full, its body cut from Src/Orbiter/Rigidbody.cpp by scripts/orbiter-reference.ts into euler-body.inc) on the cases
// on stdin, and prints the answers as JSON. One case a line: "q qvx qvy qvz qs  px py pz  wx wy wz" or "e Ix Iy Iz  tx ty tz  wx wy wz",
// all in Orbiter's left-handed frame (the script swaps y and z on the way in and out).
#include "Vecmat.h"
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>

static Vector pmi;
static Vector EulerInv_full (const Vector &tau, const Vector &omega)
#include "euler-body.inc"

int main() {
  std::string line;
  bool first = true;
  std::printf("[");
  while (std::getline(std::cin, line)) {
    std::istringstream in(line);
    std::string kind;
    double a[10];
    if (!(in >> kind)) continue;
    for (double &x : a) in >> x;
    if (kind == "q") {
      Quaternion q(a[0], a[1], a[2], a[3]);
      Vector p(a[4], a[5], a[6]), w(a[7], a[8], a[9]);
      Vector m = mul(q, p), t = tmul(q, p);
      Quaternion r(q);
      r.Rotate(w);
      std::printf("%s{\"mul\":[%.17g,%.17g,%.17g],\"tmul\":[%.17g,%.17g,%.17g],\"rotated\":[%.17g,%.17g,%.17g,%.17g]}", first ? "" : ",", m.x, m.y, m.z, t.x, t.y, t.z, r.qvx, r.qvy, r.qvz, r.qs);
    } else {
      pmi = Vector(a[0], a[1], a[2]);
      Vector d = EulerInv_full(Vector(a[3], a[4], a[5]), Vector(a[6], a[7], a[8]));
      std::printf("%s{\"angularAcceleration\":[%.17g,%.17g,%.17g]}", first ? "" : ",", d.x, d.y, d.z);
    }
    first = false;
  }
  std::printf("]\n");
  return 0;
}
