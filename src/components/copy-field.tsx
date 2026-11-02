"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} aria-label={label ?? "Link"} className="field min-w-0 flex-1 font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium hover:bg-surface-2"
      >
        {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
