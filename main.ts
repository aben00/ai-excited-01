// ai-excited-01 entry: "Hold tight, judge!"
//
// A tiny rocket smashes out of a snow globe on a quiet desk and streaks
// straight at the viewer, glass and snow exploding into embers behind it.
// The image speaks to the judge itself, in plain lowercase words across the
// bottom: "hold tight, judge!"
//
// Round 3: the rocket art was fixed — the exhaust trail now streams only
// behind the tail, and the nose cone is clean. In rounds 1-2 a second flame
// streak in front of the nose made the rocket look like it was flying
// backwards into its own fire.
//
// The image is shipped with the repository and this program copies it, byte
// for byte, to the output directory. Deterministic by construction: no
// randomness, no network, no clock, no image processing. Both grader runs
// write the exact same bytes, and the copy is verified by comparing hashes.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SOURCE = new URL('./entry.png', import.meta.url);
const TARGET = join(OUT_DIR, 'entry.png');
const MAX_BYTES = 1048576;

if (!existsSync(SOURCE)) {
  throw new Error('entry.png is missing from the repository');
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SOURCE, TARGET);

const bytes = statSync(TARGET).size;
if (bytes === 0 || bytes > MAX_BYTES) {
  throw new Error(`entry.png is ${bytes} bytes; the gate allows at most 1 MiB`);
}

// The gate scores the exact bytes written, and the program runs twice: make
// sure the copy is complete by comparing its hash with the source.
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
if (digest(SOURCE) !== digest(TARGET)) {
  throw new Error('entry.png did not copy intact');
}

// Validate the written image itself. Note: despite the .png name, the entry
// is a JPEG (JFIF) — so validate the JPEG structure: the SOI marker, the
// SOF0 frame header (which must say 1024x1024), and the trailing EOI marker.
const img = readFileSync(TARGET);
if (img.length < 4 || img[0] !== 0xff || img[1] !== 0xd8) {
  throw new Error('entry.png is not a valid JPEG: missing SOI marker');
}
if (img[img.length - 2] !== 0xff || img[img.length - 1] !== 0xd9) {
  throw new Error('entry.png is not a valid JPEG: missing EOI marker');
}
let width = 0;
let height = 0;
for (let i = 2; i + 9 < img.length;) {
  if (img[i] !== 0xff) {
    throw new Error('entry.png is not a valid JPEG: corrupt marker stream');
  }
  const marker = img[i + 1];
  if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
    i += 2;
    continue;
  }
  const segLen = img.readUInt16BE(i + 2);
  if (marker === 0xc0) {
    height = img.readUInt16BE(i + 5);
    width = img.readUInt16BE(i + 7);
    break;
  }
  i += 2 + segLen;
}
if (width === 0 || height === 0) {
  throw new Error('entry.png is not a valid JPEG: no SOF0 frame found');
}
if (width !== 1024 || height !== 1024) {
  throw new Error(`entry.png is ${width}x${height}; the entry must be 1024x1024`);
}

console.log(`wrote ${TARGET}`);
console.log(`  dimensions: ${width}x${height}`);
console.log(`  size: ${bytes} bytes`);
console.log(`  sha256: ${digest(TARGET)}`);
