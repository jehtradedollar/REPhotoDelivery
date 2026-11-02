"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { completeStockUploads, prepareStockUploads, type UploadedFile } from "@/lib/actions";
import { brand } from "@/lib/brand";
import { photoDerivatives, pool, put, RESIZABLE } from "@/lib/upload-client";
import { buttonClass } from "./ui";

/** Adds JPEG/PNG/WebP photos to a stock pack, with the same previews and MLS copy as project photos. */
export function StockUploader({ packId }: { packId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function accept(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => RESIZABLE.test(f.type));
    if (!files.length) {
      setStatus("Choose JPEG, PNG or WebP photos.");
      return;
    }
    setStatus(`Preparing ${files.length} photos…`);
    const plans = await prepareStockUploads(
      packId,
      files.map((f) => ({ name: f.name, type: f.type, size: f.size, derivatives: true })),
    );
    const done: UploadedFile[] = [];
    let n = 0;
    await pool(files, 3, async (file, i) => {
      const plan = plans[i];
      try {
        const { thumb, preview, web, width, height } = await photoDerivatives(file, `${brand.short.toUpperCase()} · PREVIEW`);
        await Promise.all([put(plan.thumb!, thumb), put(plan.preview!, preview), put(plan.web!, web), put(plan.original, file)]);
        done.push({ mediaId: plan.mediaId, name: file.name, type: file.type, size: file.size, width, height, keys: { original: plan.original.key, thumb: plan.thumb!.key, preview: plan.preview!.key, web: plan.web!.key } });
      } catch {
        /* counted below */
      }
      setStatus(`Uploaded ${++n} of ${files.length}`);
    });
    if (done.length) await completeStockUploads(packId, done);
    setStatus(done.length === files.length ? null : `${files.length - done.length} photos failed to upload.`);
    router.refresh();
  }

  const busy = !!status && /^(Preparing|Uploaded)/.test(status);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={buttonClass("secondary", "sm")}>
        {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Add photos
      </button>
      {status && <span className="text-[13px] text-muted">{status}</span>}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
