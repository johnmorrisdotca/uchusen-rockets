# Assets

Ready files, under `@johnmorrisdotca/uchusen-rockets/assets/`:

| File | What |
| --- | --- |
| `starship-v3.glb` | A rocket's code-made mesh, its parts as nodes named `booster` and `ship`, with the line looks' lines as line primitives |
| `starship-v3-booster.glb`, `starship-v3-ship.glb` | Each part on its own |
| `starship-v3.svg`, `starship-v3.thick.svg`, `starship-v3.painted.svg` | Together, in each look |
| `starship-v3-apart.svg`, `starship-v3-booster.svg`, `starship-v3-ship.svg` | Apart and each part, in each look |
| `parts/raptor-vacuum.glb`, `parts/raptor-vacuum.svg` | A small part |
| `models/starship-v3-booster.glb` | A painted model, under **CC BY 4.0**: see [NOTICE.md](../NOTICE.md) |

Everything is in metres, Y up, the base of a part on its axis, the windward side towards +Z. Positions and normals are packed with `KHR_mesh_quantization`, which three.js and other viewers read with no decoder.

A code-made mesh is under 600 KB and a drawing under 80 KB. A painted model is under 8 MB.
