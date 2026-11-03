"use client";

import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { prepareImageUpload, saveImage } from "@/lib/actions";
import { cn } from "@/lib/cn";

type Kind = "client-logo" | "client-photo" | "brokerage-logo";

/** Upload a logo (kept as PNG for transparency) or a square profile photo. */
export function ImageUpload({ kind, targetId, currentUrl, label }: { kind: Kind; targetId: string; currentUrl: string | null; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isPhoto = kind === "client-photo";

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const max = isPhoto ? 480 : 800;
      const canvas = document.createElement("canvas");
      if (isPhoto) {
        // Center-crop to a square.
        const side = Math.min(bitmap.width, bitmap.height);
        canvas.width = canvas.height = Math.min(max, side);
        canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      } else {
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      }
      const type = isPhoto ? "image/jpeg" : "image/png";
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), type, 0.88));
      const target = await prepareImageUpload(kind, targetId, type);
      const res = await fetch(target.url, { method: "PUT", headers: target.headers, body: blob });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await saveImage(kind, targetId, target.key);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className={cn("grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-2", isPhoto ? "size-16 rounded-full" : "h-16 w-32 rounded-xl")}>
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={label} className={cn("h-full w-full", isPhoto ? "object-cover" : "object-contain p-2")} />
        ) : (
          <ImageUp className="size-5 text-muted" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-medium">{label}</div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-medium hover:bg-surface-2 disabled:opacity-60">
            {busy && <Loader2 className="size-3.5 animate-spin" />} {currentUrl ? "Replace" : "Upload"}
          </button>
          {currentUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await saveImage(kind, targetId, null);
                router.refresh();
                setBusy(false);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted hover:bg-surface-2 hover:text-bad"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-bad">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
