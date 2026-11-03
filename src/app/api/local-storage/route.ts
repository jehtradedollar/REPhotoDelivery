import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { localPath, localStorageProvider, verifyLocal } from "@/lib/integrations/storage";

// Serves and accepts files for local development storage. Every request
// carries an HMAC signature and expiry, just like an S3 presigned URL.

function params(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return { key: q.get("key") ?? "", exp: Number(q.get("exp")), sig: q.get("sig") ?? "", filename: q.get("filename") ?? "" };
}

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", mp4: "video/mp4", mov: "video/quicktime", pdf: "application/pdf" };

export async function GET(req: NextRequest) {
  const { key, exp, sig, filename } = params(req);
  if (!verifyLocal(key, "get", exp, sig, filename)) return new NextResponse("Link expired or invalid", { status: 403 });
  const p = localPath(key);
  if (!existsSync(p)) return new NextResponse("Not found", { status: 404 });
  const size = (await stat(p)).size;
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const headers: Record<string, string> = { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" };
  if (filename) headers["Content-Disposition"] = `attachment; filename="${filename.replace(/"/g, "")}"`;

  // Byte ranges so video can seek.
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    return new NextResponse(Readable.toWeb(createReadStream(p, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new NextResponse(Readable.toWeb(createReadStream(p)) as ReadableStream, { headers: { ...headers, "Accept-Ranges": "bytes", "Content-Length": String(size) } });
}

export async function PUT(req: NextRequest) {
  const { key, exp, sig } = params(req);
  if (!verifyLocal(key, "put", exp, sig)) return new NextResponse("Link expired or invalid", { status: 403 });
  await localStorageProvider.write(key, new Uint8Array(await req.arrayBuffer()));
  return new NextResponse(null, { status: 200 });
}
