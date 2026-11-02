// Browser-side upload helpers. Image derivatives are made before upload so the
// server never handles full-size files, and files go straight to storage.

export const RESIZABLE = /^image\/(jpeg|png|webp)$/;

/** The MLS copy: long edge 2048px, JPEG, under this many bytes. */
export const MLS_MAX_EDGE = 2048;
export const MLS_MAX_BYTES = 1_000_000;

export async function loadImage(file: File) {
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

export function resize(bitmap: ImageBitmap, maxEdge: number, quality: number, watermark?: string): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (watermark) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 9);
    const size = Math.round(Math.min(w, h) / 9);
    ctx.font = `600 ${size}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(1, size / 40);
    for (let y = -h; y <= h; y += size * 3) {
      ctx.fillText(watermark, 0, y);
      ctx.strokeText(watermark, 0, y);
    }
    ctx.restore();
  }
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", quality));
}

/** MLS-ready JPEG: steps quality down, then size, until it fits under MLS_MAX_BYTES. */
export async function mlsCopy(bitmap: ImageBitmap): Promise<Blob> {
  let edge = MLS_MAX_EDGE;
  let blob: Blob | null = null;
  for (let tries = 0; tries < 4; tries++) {
    for (const q of [0.86, 0.78, 0.7, 0.62]) {
      blob = await resize(bitmap, edge, q);
      if (blob.size <= MLS_MAX_BYTES) return blob;
    }
    edge = Math.round(edge * 0.85);
  }
  return blob!;
}

/** Thumbnail, watermarked preview and MLS/web copy for one photo. */
export async function photoDerivatives(file: File, watermark: string) {
  const { bitmap, width, height } = await loadImage(file);
  try {
    const [thumb, preview, web] = await Promise.all([resize(bitmap, 640, 0.8), resize(bitmap, 1600, 0.75, watermark), mlsCopy(bitmap)]);
    return { thumb, preview, web, width, height };
  } finally {
    bitmap.close();
  }
}

/** PUT a file to a presigned URL with progress. */
export function put(target: { url: string; headers: Record<string, string> }, body: Blob, onProgress?: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", target.url);
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error. If this is S3, check the bucket's CORS settings."));
    xhr.send(body);
  });
}

/** Run fn over items, `size` at a time. */
export async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

