import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { imageDerivatives, MLS_MAX_BYTES } from "../src/lib/image-server";

test("the MLS copy is at most 2048px and under 1 MB, even from a noisy 24 MP photo", async () => {
  const w = 6000;
  const h = 4000;
  // Random noise compresses badly, the worst case for the size limit.
  const noise = Buffer.alloc(w * h * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  const input = await sharp(noise, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const d = await imageDerivatives(input);
  const meta = await sharp(d.web).metadata();
  assert.ok(Math.max(meta.width!, meta.height!) <= 2048);
  assert.ok(d.web.length <= MLS_MAX_BYTES, `web copy is ${d.web.length} bytes`);
  assert.equal(d.width, w);
  assert.ok((await sharp(d.thumb).metadata()).width! <= 640);
});
