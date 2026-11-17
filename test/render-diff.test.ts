// The render comparison tool: it reads a PNG and counts the pixels that differ by more than a tolerance.
import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { differing, readPng } from "../scripts/render-diff.ts";

const crc = (buf: Buffer): number => {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
};
const chunk = (kind: string, body: Buffer): Buffer => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(kind, 4, "latin1");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, tail]);
};
/** A 4 by 2 RGBA PNG, filter 0 on the first line and Sub (1) on the second, every pixel the colour given. */
function png(first: number, second = first): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(4, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const line0 = Buffer.from([0, ...Array.from({ length: 4 }, () => [first, first, first, 255]).flat()]);
  // Sub filter: the first pixel as is, then each pixel stored as the difference from the one before
  const line1 = Buffer.from([1, second, second, second, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat([line0, line1]))), chunk("IEND", Buffer.alloc(0))]);
}

test("readPng decodes plain and Sub-filtered lines", () => {
  const raster = readPng(png(10, 200));
  assert.equal(raster.width, 4);
  assert.equal(raster.height, 2);
  assert.deepEqual([...raster.data.subarray(0, 4)], [10, 10, 10, 255]);
  assert.deepEqual([...raster.data.subarray(16 + 12, 16 + 16)], [200, 200, 200, 255], "the last pixel of the Sub line");
});

test("differing counts the pixels over the tolerance and no others", () => {
  assert.equal(differing(readPng(png(10)), readPng(png(10))), 0);
  assert.equal(differing(readPng(png(10)), readPng(png(15))), 0, "5 apart is inside 8");
  assert.equal(differing(readPng(png(10)), readPng(png(10, 40))), 0.5, "the second line is 30 apart");
  assert.equal(differing(readPng(png(10)), readPng(png(20))), 1, "10 apart is over 8");
  assert.equal(differing(readPng(png(10)), readPng(png(20)), 12), 0, "and inside 12");
  assert.throws(() => differing(readPng(png(1)), { width: 2, height: 2, data: new Uint8Array(16) }));
});
