// The resizable kit parts: the size in metres is the input, the limits are named, a part is the size it says, and its detail scales with it.
import assert from "node:assert/strict";
import test from "node:test";
import { SIZED, SIZED_LIMITS } from "../src/index.ts";
import { boundsOf, meshOf, type Piece } from "../src/model/pieces.ts";

const size = (pieces: Piece[]) => {
  const b = boundsOf(meshOf(pieces));
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
};
const json = (pieces: Piece[]) => JSON.stringify(pieces);

test("container: a size outside 15 to 60 m across or 15 to 200 m long throws and says which limit", () => {
  assert.equal(SIZED_LIMITS.container.across[1], 60);
  for (const across of [6, 14.9, 60.1, Number.NaN]) assert.throws(() => SIZED.container({ across, long: 40, mass: 1 }), /m across/, String(across));
  for (const long of [10, 200.1]) assert.throws(() => SIZED.container({ across: 22, long, mass: 1 }), /m long/, String(long));
  assert.doesNotThrow(() => SIZED.container({ across: 15, long: 15, mass: 1 }));
  assert.doesNotThrow(() => SIZED.container({ across: 60, long: 200, mass: 1 }));
});

test("container: it is the size it says (its length to a metre, its width to the fittings that stand out), the base on y = 0", () => {
  for (const [across, long] of [[22, 40], [30, 60], [16, 24]] as const) {
    const box = SIZED.container({ across, long, mass: 900 });
    assert.equal(box.length, long);
    const b = boundsOf(meshOf(box.pieces()));
    const s = across / 22;
    assert.ok(Math.abs(b.min[1]) < 1.5 * s && Math.abs(b.max[1] - long) < 1.5 * s, `${across}x${long} spans y ${b.min[1]} to ${b.max[1]}`);
    const [x, , z] = size(box.pieces());
    assert.ok(x >= across - 0.5 && x <= across * 1.2 && z >= across - 0.5 && z <= across * 1.2, `${across}: ${x} by ${z}`);
  }
});

test("container: detail scales with size, so a box twice as wide is twice the size with more fittings and not a stretched mesh", () => {
  const small = SIZED.container({ across: 22, long: 40, mass: 900 }).pieces();
  const big = SIZED.container({ across: 44, long: 80, mass: 7200 }).pieces();
  assert.ok(big.length >= small.length + 16, `${big.length} pieces against ${small.length}: nine ribs a face become eighteen`);
  const [sx, sy] = size(small);
  const [bx, by] = size(big);
  assert.ok(Math.abs(bx / sx - 2) < 0.1 && Math.abs(by / sy - 2) < 0.1, "twice the size");
  // the fittings are the same share of the box: the middle piece is about twice as thick
  const middle = (pieces: Piece[]) => {
    const t = pieces.flatMap((p) => (p.kind === "plate" ? [p.thickness] : [])).sort((x, y) => x - y);
    return t[Math.floor(t.length / 2)];
  };
  assert.ok(middle(big) > middle(small) * 1.6, `${middle(big)} against ${middle(small)}: the fittings grow with the box`);
});

test("container: the same input is the same bytes, another seed is not, and coarse is the box and its castings only", () => {
  const box = SIZED.container({ across: 22, long: 40, mass: 900 });
  assert.equal(json(box.pieces({ seed: "a" })), json(box.pieces({ seed: "a" })));
  assert.notEqual(json(box.pieces({ seed: "a" })), json(box.pieces({ seed: "b" })));
  const coarse = box.pieces({ level: "coarse" });
  assert.ok(coarse.length > 8 && coarse.length < box.pieces().length / 10, `${coarse.length} coarse pieces`);
});

const tankOf = (radius: number, length: number, extra = {}) => SIZED.tank({ radius, length, mass: 1000, propellant: 20000, ...extra });

test("tank: a radius outside 8 to 60 m or a length under four radii or over 600 m throws and says which limit", () => {
  for (const radius of [7.9, 60.1, Number.NaN]) assert.throws(() => tankOf(radius, 400), /in radius/, String(radius));
  assert.throws(() => tankOf(20, 79), /4 radii/);
  assert.throws(() => tankOf(20, 601), /m long/);
  assert.doesNotThrow(() => tankOf(8, 32));
  assert.doesNotThrow(() => tankOf(60, 600));
});

test("tank: it is the size it says, tail at y = 0 and nose at y = its length, and the cutaway adds what is inside", () => {
  for (const [radius, length] of [[40, 440], [20, 200], [12, 90]] as const) {
    const tank = tankOf(radius, length);
    assert.equal(tank.length, length);
    const b = boundsOf(meshOf(tank.pieces()));
    // the vent stacks on the domes stand a fifth of the radius clear of them
    assert.ok(Math.abs(b.min[1]) < radius / 5 + 1 && Math.abs(b.max[1] - length) < radius / 5 + 1, `${radius}x${length}: y ${b.min[1]} to ${b.max[1]}`);
    const [x] = size(tank.pieces());
    assert.ok(x >= 2 * radius && x < 2.3 * radius, `${x} across for ${2 * radius}`);
    assert.ok(tank.pieces({ cutaway: true }).length > tank.pieces().length, "the propellant and pumps");
  }
});

test("tank: detail scales with the length (rings, valve houses, hatches) and the radius (every fitting)", () => {
  const short = tankOf(20, 200).pieces();
  const long = tankOf(20, 400).pieces();
  assert.ok(long.length > short.length * 1.1, `${long.length} pieces against ${short.length}: more of each along the barrel`);
  const narrow = size(tankOf(10, 100).pieces());
  const wide = size(tankOf(20, 200).pieces());
  assert.ok(Math.abs(wide[0] / narrow[0] - 2) < 0.1 && Math.abs(wide[1] / narrow[1] - 2) < 0.1, "twice the size");
  assert.equal(json(tankOf(20, 200).pieces({ seed: "a" })), json(tankOf(20, 200).pieces({ seed: "a" })));
  assert.notEqual(json(tankOf(20, 200).pieces({ seed: "a" })), json(tankOf(20, 200).pieces({ seed: "b" })));
  const braced = tankOf(20, 200, { brace: { distance: 60, half: 9 } }).pieces();
  assert.ok(braced.length > short.length, "four braces to the spine at each cradle ring");
});

const ringOf = (major: number, tube: number, extra = {}) => SIZED.habitatRing({ major, tube, mass: 5000, ...extra });

test("habitat ring: a section outside 4 to 60 m or a radius under 2.5 sections or over 400 m throws and says which limit", () => {
  for (const tube of [3.9, 60.1, Number.NaN]) assert.throws(() => ringOf(165, tube), /section is/, String(tube));
  assert.throws(() => ringOf(89, 36), /2\.5 sections/);
  assert.throws(() => ringOf(401, 36), /from its axis/);
  assert.doesNotThrow(() => ringOf(10, 4));
  assert.doesNotThrow(() => ringOf(400, 60));
});

test("habitat ring: it is the size it says, its axis up Y from 0 to its section, and the cutaway adds the decks", () => {
  for (const [major, tube] of [[165, 36], [60, 12], [30, 8]] as const) {
    const ring = ringOf(major, tube);
    assert.equal(ring.length, tube);
    const [x, y, z] = size(ring.pieces());
    const reach = 2 * (major + tube / 2);
    assert.ok(x >= reach && x < reach + 0.6 * tube && z >= reach && z < reach + 0.6 * tube, `${major}: ${x} by ${z} for ${reach}`);
    assert.ok(y >= tube - 0.1 && y < tube * 1.3, `${y} high for ${tube}`);
    assert.ok(ring.pieces({ cutaway: true }).length > ring.pieces().length + 100, "three decks of blocks");
  }
});

test("habitat ring: detail scales with the circumference (window cells keep their size) and the section (every fitting)", () => {
  const ten = ringOf(120, 12).pieces();
  const twenty = ringOf(240, 12).pieces();
  assert.ok(twenty.length > ten.length * 1.6, `${twenty.length} pieces against ${ten.length}: twice the circumference, twice the cells`);
  const small = ringOf(60, 12).pieces();
  const big = ringOf(120, 24).pieces();
  assert.ok(Math.abs(big.length / small.length - 1) < 0.1, "the same ring at twice the size has the same cells, each twice as big");
  assert.equal(json(ringOf(60, 12).pieces({ seed: "a" })), json(ringOf(60, 12).pieces({ seed: "a" })));
  assert.notEqual(json(ringOf(60, 12).pieces({ seed: "a" })), json(ringOf(60, 12).pieces({ seed: "b" })));
});

const trussOf = (square: number, bay: number, length: number) => SIZED.trussSpine({ square, bay, length, mass: 100 });

test("truss spine: a width outside 3 to 60 m, a bay outside a quarter to twice the width or a length under one bay or over 3,000 m throws and says which limit", () => {
  for (const square of [2.9, 60.1, Number.NaN]) assert.throws(() => trussOf(square, 24, 240), /m square/, String(square));
  assert.throws(() => trussOf(36, 8, 240), /bay is/);
  assert.throws(() => trussOf(36, 73, 240), /bay is/);
  assert.throws(() => trussOf(36, 24, 23), /one bay/);
  assert.throws(() => trussOf(36, 24, 3001), /one bay/);
  assert.doesNotThrow(() => trussOf(3, 2, 2));
  assert.doesNotThrow(() => trussOf(60, 48, 3000));
});

test("truss spine: it is the length and width it says, and its bays and fittings scale", () => {
  const spine = trussOf(36, 24, 240);
  assert.equal(spine.length, 240);
  const [x, y, z] = size(spine.pieces());
  assert.ok(x >= 36 && x < 36 + 8 && z >= 36 && z < 36 + 8, `${x} by ${z}`);
  assert.ok(y >= 240 - 1 && y < 240 + 6, `${y} long`);
  const longer = trussOf(36, 24, 480).pieces();
  assert.ok(longer.length > spine.pieces().length * 1.8, "twice the bays, twice the pieces");
  const wider = size(trussOf(18, 12, 240).pieces());
  assert.ok(Math.abs(x / wider[0] - 2) < 0.4, "half the width is half the chords and rails");
  assert.equal(json(spine.pieces({ seed: "a" })), json(spine.pieces({ seed: "a" })));
  assert.notEqual(json(spine.pieces({ seed: "a" })), json(spine.pieces({ seed: "b" })));
});

const wingOf = (length: number, panelWidth: number, panels: number, extra = {}) => SIZED.radiatorWing({ length, panelWidth, panels, mass: 100, ...extra });

test("radiator wing: a panel outside 8 to 120 m, a panel count outside 1 to 12 or a boom under four panels' widths or over 1,500 m throws and says which limit", () => {
  for (const panelWidth of [7.9, 120.1, Number.NaN]) assert.throws(() => wingOf(560, panelWidth, 6), /panel is/, String(panelWidth));
  for (const panels of [0, 13, 2.5]) assert.throws(() => wingOf(560, 56, panels), /panels/, String(panels));
  assert.throws(() => wingOf(200, 56, 6), /boom/);
  assert.throws(() => wingOf(1501, 56, 6), /boom/);
  assert.doesNotThrow(() => wingOf(32, 8, 1));
  assert.doesNotThrow(() => wingOf(1500, 120, 12));
});

test("radiator wing: its reach is the panels and the root, its sections follow the boom and its fittings follow the panel; it can fold, and turn to the other side", () => {
  const wing = wingOf(560, 56, 6);
  const [x, y] = size(wing.pieces());
  assert.ok(x > 6 * 56 && x < 6 * 58 + 60, `${x} out`);
  assert.ok(Math.abs(y - 560) < 4, `${y} long`);
  assert.ok(wingOf(1120, 56, 6).pieces().length > wing.pieces().length * 1.8, "twice the boom, twice the sections");
  const big = wingOf(1120, 112, 6).pieces();
  const middle = (pieces: Piece[]) => {
    const t = pieces.flatMap((p) => (p.kind === "plate" ? [p.thickness] : [])).sort((a, b) => a - b);
    return t[Math.floor(t.length / 2)];
  };
  assert.ok(middle(big) > middle(wing.pieces()) * 1.6, "twice the panel, twice as thick the tubes and ribs");
  assert.ok(Math.abs(big.length / wing.pieces().length - 1) < 0.1, "the same wing at twice the size has the same sections");
  const port = boundsOf(meshOf(wingOf(560, 56, 6, { side: -1 }).pieces()));
  assert.ok(port.max[0] <= 0.5 && port.min[0] < -300, "the port wing reaches to -x");
  const folded = wingOf(240, 56, 6, { folded: true });
  assert.ok(folded.pieces().length < 100 && size(folded.pieces())[0] >= 60 && size(folded.pieces())[0] < 64, "a stack of six panels 60 m wide");
  assert.equal(json(wing.pieces({ seed: "a" })), json(wing.pieces({ seed: "a" })));
  assert.notEqual(json(wing.pieces({ seed: "a" })), json(wing.pieces({ seed: "b" })));
});
