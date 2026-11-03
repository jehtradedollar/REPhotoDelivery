import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Media storage. Pages and routes only talk to this interface.
//   S3StorageProvider    when STORAGE_PROVIDER=s3 (production)
//   LocalStorageProvider otherwise: files live in ./.uploads and are served by
//                        /api/local-storage with signed, expiring URLs, so the
//                        whole upload and download flow works on a laptop.

export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageProvider {
  readonly name: "s3" | "local";
  /** Presigned URL the browser PUTs the file to directly. */
  createUploadTarget(key: string, contentType: string): Promise<UploadTarget>;
  /** Short-lived URL to show a file inline (thumbnails, previews, video). */
  getPreviewUrl(key: string): Promise<string>;
  /** Short-lived URL that downloads the file. Only hand out after checking payment. */
  getDownloadUrl(key: string, opts?: { filename?: string; expiresInSec?: number }): Promise<string>;
  /** Stream an object (used to build zip downloads). */
  getObjectStream(key: string): Promise<{ body: ReadableStream<Uint8Array>; size?: number } | null>;
  deleteObject(key: string): Promise<void>;
  /** Server-side write, for files the app makes itself (e.g. virtual staging results). */
  putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;
}

export const mediaKey = (projectId: string, mediaId: string, name: string) =>
  `projects/${projectId}/${mediaId}/${name.replace(/[^\w.\-]+/g, "_")}`;

/* ---------------- Local (development) ---------------- */

const LOCAL_ROOT = path.resolve(process.env.LOCAL_STORAGE_DIR ?? ".uploads");
const secret = () => process.env.AUTH_SECRET ?? "dev-secret";

export function signLocal(key: string, op: "get" | "put", exp: number, filename = "") {
  return createHmac("sha256", secret()).update(`${op}:${key}:${exp}:${filename}`).digest("base64url");
}

export function verifyLocal(key: string, op: "get" | "put", exp: number, sig: string, filename = "") {
  if (!sig || exp < Date.now() / 1000) return false;
  const want = Buffer.from(signLocal(key, op, exp, filename));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function localPath(key: string) {
  const p = path.resolve(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Bad key");
  return p;
}

class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  private url(key: string, op: "get" | "put", ttl: number, filename = "") {
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const q = new URLSearchParams({ key, exp: String(exp), sig: signLocal(key, op, exp, filename) });
    if (filename) q.set("filename", filename);
    return `/api/local-storage?${q}`;
  }

  async createUploadTarget(key: string, contentType: string) {
    return { url: this.url(key, "put", 3600), method: "PUT" as const, headers: { "Content-Type": contentType } };
  }
  async getPreviewUrl(key: string) {
    return this.url(key, "get", 3600);
  }
  async getDownloadUrl(key: string, opts?: { filename?: string; expiresInSec?: number }) {
    return this.url(key, "get", opts?.expiresInSec ?? 300, opts?.filename ?? key.split("/").pop());
  }
  async getObjectStream(key: string) {
    const p = localPath(key);
    if (!existsSync(p)) return null;
    const size = (await stat(p)).size;
    return { body: Readable.toWeb(createReadStream(p)) as ReadableStream<Uint8Array>, size };
  }
  async deleteObject(key: string) {
    await rm(localPath(key), { force: true });
  }
  async putObject(key: string, body: Uint8Array) {
    await this.write(key, body);
  }
  /** Used by the local upload route. */
  async write(key: string, data: Uint8Array) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  }
}

/* ---------------- Amazon S3 (production) ---------------- */

class S3StorageProvider implements StorageProvider {
  readonly name = "s3" as const;
  private bucket = process.env.AWS_S3_BUCKET!;
  private clientPromise = import("@aws-sdk/client-s3").then(
    ({ S3Client }) =>
      new S3Client({
        region: process.env.AWS_REGION,
        ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
      }),
  );

  private async sign(command: object, expiresIn: number) {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSignedUrl((await this.clientPromise) as any, command as any, { expiresIn });
  }

  async createUploadTarget(key: string, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const url = await this.sign(new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), 3600);
    return { url, method: "PUT" as const, headers: { "Content-Type": contentType } };
  }

  async getPreviewUrl(key: string) {
    const cdn = process.env.MEDIA_CDN_URL;
    // Thumbnails and watermarked previews can come from a CDN; originals never do.
    if (cdn && !key.includes("/original-")) return `${cdn.replace(/\/$/, "")}/${key}`;
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    return this.sign(new GetObjectCommand({ Bucket: this.bucket, Key: key }), 3600);
  }

  async getDownloadUrl(key: string, opts?: { filename?: string; expiresInSec?: number }) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const name = (opts?.filename ?? key.split("/").pop() ?? "file").replace(/"/g, "");
    return this.sign(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `attachment; filename="${name}"` }),
      opts?.expiresInSec ?? 300,
    );
  }

  async getObjectStream(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.clientPromise).send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return { body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>, size: res.ContentLength };
    } catch {
      return null;
    }
  }

  async putObject(key: string, body: Uint8Array, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async deleteObject(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const localStorageProvider = new LocalStorageProvider();

export function createStorage(): StorageProvider {
  if (process.env.STORAGE_PROVIDER === "s3") {
    if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION) throw new Error("STORAGE_PROVIDER=s3 needs AWS_S3_BUCKET and AWS_REGION.");
    return new S3StorageProvider();
  }
  return localStorageProvider;
}
