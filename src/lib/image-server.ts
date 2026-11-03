import "server-only";
import sharp from "sharp";

// Server-side versions of the browser upload derivatives, for images the app
// receives itself (virtual staging results). Same sizes as upload-client.ts.

export const MLS_MAX_EDGE = 2048;
export const MLS_MAX_BYTES = 1_000_000;

async function mls(input: Buffer) {
  let edge = MLS_MAX_EDGE;
  let out: Buffer | null = null;
  for (let tries = 0; tries < 4; tries++) {
    for (const quality of [86, 78, 70, 62]) {
      out = await sharp(input).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).jpeg({ quality, mozjpeg: true }).toBuffer();
      if (out.length <= MLS_MAX_BYTES) return out;
    }
    edge = Math.round(edge * 0.85);
  }
  return out!;
}

export async function imageDerivatives(input: Buffer) {
  const meta = await sharp(input).rotate().metadata();
  const original = meta.format === "jpeg" ? input : await sharp(input).rotate().jpeg({ quality: 92 }).toBuffer();
  const [thumb, web] = await Promise.all([sharp(input).rotate().resize({ width: 640, height: 640, fit: "inside" }).jpeg({ quality: 80 }).toBuffer(), mls(input)]);
  return { original, thumb, web, width: meta.autoOrient?.width ?? meta.width ?? null, height: meta.autoOrient?.height ?? meta.height ?? null };
}
