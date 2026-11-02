"use client";

import { AlertCircle, CheckCircle2, CloudUpload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { completeUploads, prepareUploads, type UploadedFile, type UploadPlan } from "@/lib/actions";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { bytes } from "@/lib/format";
import { photoDerivatives, pool, put, RESIZABLE } from "@/lib/upload-client";

// Upload flow:
//   1. In the browser, make a thumbnail, a watermarked preview and the MLS copy
//      (2048px, under 1 MB) of each photo. Originals are never resized.
//   2. Ask the server for presigned URLs (S3 in production, local disk in dev).
//   3. PUT every file straight to storage, so large files never pass through
//      the app server, with real progress.
//   4. Record the finished files.

type Row = { name: string; size: number; progress: number; state: "queued" | "processing" | "uploading" | "done" | "error"; error?: string };

function videoDuration(file: File): Promise<number | undefined> {
  return new Promise((res) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      res(Number.isFinite(v.duration) ? v.duration : undefined);
    };
    v.onerror = () => res(undefined);
    v.src = URL.createObjectURL(file);
  });
}

export function UploadDropzone({ projectId }: { projectId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const busy = rows.some((r) => r.state !== "done" && r.state !== "error");

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function accept(list: FileList | null) {
    if (!list?.length || busy) return;
    const files = Array.from(list);
    setRows(files.map((f) => ({ name: f.name, size: f.size, progress: 0, state: "queued" })));

    let plans: UploadPlan[];
    try {
      plans = await prepareUploads(
        projectId,
        files.map((f) => ({ name: f.name, type: f.type || "application/octet-stream", size: f.size, derivatives: RESIZABLE.test(f.type) })),
      );
    } catch {
      setRows((rs) => rs.map((r) => ({ ...r, state: "error", error: "Could not start the upload. Try again." })));
      return;
    }

    const done: UploadedFile[] = [];
    await pool(files, 3, async (file, i) => {
      const plan = plans[i];
      try {
        const record: UploadedFile = { mediaId: plan.mediaId, name: file.name, type: file.type || "application/octet-stream", size: file.size, keys: { original: plan.original.key } };
        if (plan.thumb && plan.preview && plan.web) {
          update(i, { state: "processing" });
          const { thumb, preview, web, width, height } = await photoDerivatives(file, `${brand.short.toUpperCase()} · PREVIEW`);
          await Promise.all([put(plan.thumb, thumb), put(plan.preview, preview), put(plan.web, web)]);
          Object.assign(record, { width, height, keys: { ...record.keys, thumb: plan.thumb.key, preview: plan.preview.key, web: plan.web.key } });
        } else if (file.type.startsWith("video/")) {
          record.durationSec = await videoDuration(file);
        }
        update(i, { state: "uploading" });
        await put(plan.original, file, (p) => update(i, { progress: Math.round(p * 100) }));
        done.push(record);
        update(i, { state: "done", progress: 100 });
      } catch (e) {
        update(i, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    });

    if (done.length) {
      await completeUploads(projectId, done);
      router.refresh();
    }
    setTimeout(() => setRows((rs) => rs.filter((r) => r.state === "error")), 2500);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          accept(e.dataTransfer.files);
        }}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition disabled:opacity-70",
          over ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent hover:bg-surface-2",
        )}
      >
        <CloudUpload className="size-7 text-accent" />
        <span className="mt-2 text-sm font-semibold">{busy ? "Uploading…" : "Drop photos, video or floor plans"}</span>
        <span className="mt-0.5 text-[13px] text-muted">or click to browse · JPG, PNG, MP4, MOV, PDF</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      {rows.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {rows.map((f, i) => (
            <li key={`${f.name}-${i}`} className="rounded-lg border border-line bg-surface px-3 py-2">
              <div className="flex items-center gap-2 text-[13px]">
                {f.state === "done" ? (
                  <CheckCircle2 className="size-4 text-ok" />
                ) : f.state === "error" ? (
                  <AlertCircle className="size-4 text-bad" />
                ) : (
                  <Loader2 className="size-4 animate-spin text-muted" />
                )}
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="tabular text-muted">{f.state === "processing" ? "Making previews" : f.state === "error" ? "" : bytes(f.size)}</span>
              </div>
              {f.state === "error" ? (
                <p className="mt-1 text-xs text-bad">{f.error}</p>
              ) : (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${f.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
