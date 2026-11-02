"use client";

import { CheckCircle2, CloudUpload, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { addMedia } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { bytes } from "@/lib/format";

interface Pending {
  name: string;
  size: number;
  type: string;
  progress: number;
}

// Upload flow once S3 is live:
//   1. ask the server for a presigned PUT per file (storage.createUploadTarget)
//   2. PUT the file straight to S3 with XHR for real progress events
//   3. call addMedia() with the resulting keys
// In mock mode step 2 is simulated so the UI can be reviewed end to end.
export function UploadDropzone({ projectId }: { projectId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [queue, setQueue] = useState<Pending[]>([]);
  const [, start] = useTransition();
  const busy = queue.some((q) => q.progress < 100);

  function accept(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).map((f) => ({ name: f.name, size: f.size, type: f.type || "image/jpeg", progress: 0 }));
    setQueue(list);
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setQueue((q) => q.map((f, i) => ({ ...f, progress: Math.min(100, f.progress + 12 + ((i * 7 + tick) % 9)) })));
    }, 120);
    setTimeout(() => {
      clearInterval(timer);
      setQueue((q) => q.map((f) => ({ ...f, progress: 100 })));
      start(() => addMedia(projectId, list.map(({ name, size, type }) => ({ name, size, type }))));
      setTimeout(() => setQueue([]), 1800);
    }, 1500);
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
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition",
          over ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent hover:bg-surface-2",
        )}
      >
        <CloudUpload className="size-7 text-accent" />
        <span className="mt-2 text-sm font-semibold">Drop photos, video or floor plans</span>
        <span className="mt-0.5 text-[13px] text-muted">or click to browse · JPG, PNG, MP4, PDF</span>
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
      {queue.length > 0 && (
        <ul className="mt-3 space-y-2">
          {queue.map((f) => (
            <li key={f.name} className="rounded-lg border border-line bg-surface px-3 py-2">
              <div className="flex items-center gap-2 text-[13px]">
                {f.progress < 100 ? <Loader2 className="size-4 animate-spin text-muted" /> : <CheckCircle2 className="size-4 text-ok" />}
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="tabular text-muted">{bytes(f.size)}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${f.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
