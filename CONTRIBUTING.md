# Contributing

Thank you for helping. Bug reports, ideas and pull requests are all welcome. Bug reports and ideas go in the [issues](https://github.com/johnmorrisdotca/uchusen-rockets/issues).

## The rules

- **A figure names its source, or is blank.** Every size, count and date in `src/data/` carries where it came from and, where it has one, its date. Never estimate to fill a gap. Where sources disagree, keep the one you chose and put the other in `others`, with why. A variant goes in only if a source documents it.
- **No logos, no marks, no flags.** No mesh or drawing carries a maker's logo, wordmark, flag or printed name. `test/legal.test.ts` holds it, on the generated files and the models.
- **Drawn here, or credited.** A mesh or drawing is made by this package's code from plain geometry and sourced sizes. The only meshes from outside are the licensed models named in `NOTICE.md`, each under CC BY 4.0, or public domain where it says so, and credited there, with what was changed; a new one needs its row, its licence read from its own files, and its page checked for any notice against use. No traced photograph, no icon set. Anything else from outside must be MIT, ISC, BSD or Apache.
- **A model is labelled as what it shows.** A rocket labelled as a real version uses only parts true for it. A mix is a custom build and says so. A model never stands in for another version, stretched or not.
- **One part record.** Every part from every source has the same record in `src/model/registry.ts`: its real size in metres, the joints it mates at and where its shape came from. `check` reads nothing else. Origin: the middle of the part's base on its axis. Y up, windward side towards +Z, in metres. One material naming scheme, `src/model/materials.ts`, for every source.
- **A part is a table of numbers.** A change of block is a change of numbers in `src/model/starship.ts`. A mesh and a drawing come from the same pieces, so they cannot disagree.
- **A mesh is a pure function of its description.** No clock, no unseeded random number: the same description gives the same bytes, and a test holds it. A code-made mesh stays under 600 KB and a drawing under 80 KB, in every look. A painted model stays under 8 MB and is loaded only when the painted look asks for it.
- **A look is one table entry** in `src/looks.ts`. It changes lines, colours and fills, never a shape. Every look works for every variant, together, apart and each part alone.
- **The core has no dependency.** The root and build entries import neither three.js nor the DOM. The element loads three.js only for a 3D view.
- **Anything from outside is treated as text.** A new option that reaches markup has a test with a hostile value.
- **Test what you change.** Tests sit in `test/` and `e2e/`. A rule you change has a test that would have caught it.
- **Needs Node 22 or later** to use the package, and **22.18 or later** to work on it: the tests and scripts run TypeScript directly with Node's own type stripping. So the TypeScript uses only syntax that can be erased (`erasableSyntaxOnly`), `import type` for types and a `.ts` extension on every relative import.
- **Ports.** This package owns local ports 8275 to 8299 and nothing outside them. The demo's server is on 8275 (`scripts/dev.ts`), the tests' on 8276 (`playwright.config.ts`; `TEST_PORT` names another), the picture scripts' on 8277, and any other server takes 8278 and up. Check with `lsof -iTCP:<port> -sTCP:LISTEN` first, and stop a server by its process id, never by name.

## A new rocket

Add its variants to `src/data/`, its parts to `src/model/registry.ts` with pieces from plain geometry, and its row to `ROCKETS`. Nothing else changes: the element, the drawing, the fit check and the demo read those.

## The source models

They are kept outside this repository. `UCHUSEN_MODEL_SOURCES=<folder> pnpm models` rebuilds `models/` from them, and `pnpm models:nasa` NASA's, by hand; the results are committed, and the build and CI never need the sources.

## Pull requests

One change per pull request. Say what changed and how you checked it, and add a line to `CHANGELOG.md` under **Unreleased**.

## Commands

```sh
pnpm check          # lint, types, tests, the build and the packed package
pnpm verify         # all of that, the docs' examples and the browser tests
pnpm test           # the unit tests
pnpm test:demo      # build the site and play it in a real browser at a phone's width and a desk's
pnpm test:freeze    # only the freeze test: what the page asks of the machine, in software, at a desk's width
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:readme    # run every example of the README, the docs and the guides
pnpm test:usage     # every way to use the package, from examples/, built and opened as npm packs it
pnpm docs:check     # the reference site's checks: every export has a doc comment with an example, every guide has its Japanese twin's links
pnpm docs:site      # make the documentation site into site/docs
pnpm dev            # the demo on http://127.0.0.1:8275/uchusen-rockets/
pnpm assets         # make dist/assets again
pnpm models         # make models/ from the source models, by hand
pnpm screenshots    # the pictures in docs/images
```
