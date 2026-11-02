"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { completeStagingUpload, prepareStagingUpload } from "@/lib/actions";
import { put } from "@/lib/upload-client";
import { buttonClass } from "./ui";

/** Owner uploads a staged photo made outside the app (when no staging API is connected). */
export function StagingFulfil({ requestId }: { requestId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const target = await prepareStagingUpload(requestId, file.type);
      await put(target, file);
      await completeStagingUpload(requestId, target.key);
      router.refresh();
    } catch {
      setError("Upload failed. Use a JPEG, PNG or WebP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={buttonClass("secondary", "sm")}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} Upload staged photo
      </button>
      {error && <span className="text-xs text-bad">{error}</span>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </span>
  );
}
