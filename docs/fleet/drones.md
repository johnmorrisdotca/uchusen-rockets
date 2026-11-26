# SPX repair drone

A compact, metre-class work drone services ship hulls during assembly. Its forward lens is the tractor emitter and the right-hand working arm carries the weld tool. Their local coordinates are defined in `src/element/repair-drone.ts`. The twin arm assemblies use three articulated links with motor housings, cable runs and different tools.

The hull includes a central deck and thermal foil from NASA's Cluster II, motor housings from InSight, and upper and lower printable Curiosity arm pieces. A NASA grease gun contributes to the tool housing. These pieces are resized and assembled with original hull panels, cameras, emitters, antennae and grippers. The sources are not endorsed by NASA.

- Cluster II, NASA/Brian E. Kumanchik. [NASA model](https://science.nasa.gov/3d-resources/cluster-ii/).
- Curiosity Rover (Detailed), NASA. [NASA printable parts](https://science.nasa.gov/3d-resources/curiosity-rover-detailed/).
- InSight Cruise Lander, NASA/Brian E. Kumanchik. [NASA model](https://science.nasa.gov/3d-resources/insight-cruise-lander/).
- Grease Gun, NASA/Ames Research Center. [NASA model](https://science.nasa.gov/3d-resources/grease-gun/).
- Design reference: images supplied by the project owner (kept privately, not distributed).

NASA describes its 3D material as generally free of US copyright, subject to its media and branding guidelines. The originals are retained outside the package. No source logos or markings are included. [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)

The full drone has 83,494 triangles. The far model has 4,488 triangles. Each has one baked texture atlas and one mesh primitive. The swarm draws each active level with a single instanced mesh. The full asset is requested only for a close view. The embedded light map is switched on with the viewer's lit control.

To rebuild, place the four NASA source files and the Curiosity printable `Parts` directory under a local source directory. Run Blender with `DRONE_SOURCE`, `DRONE_OUTPUT` and `DRONE_COARSE_OUTPUT` set to the source directory and desired GLB paths, then run `scripts/build-repair-drone.py` in background mode. The source models remain separate from this repository.
