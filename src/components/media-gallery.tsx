"use client";

import { Check, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Lock, Play, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { removeMedia } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { bytes } from "@/lib/format";
import { downloadHref } from "@/lib/links";
import type { MediaItem, MediaKind } from "@/lib/types";
import { PropertyImage } from "./property-image";
import { buttonClass } from "./ui";

const tabs: { kind: MediaKind; label: string }[] = [
  { kind: "photo", label: "Photos" },
  { kind: "video", label: "Video" },
  { kind: "floorplan", label: "Floor plans" },
  { kind: "tour", label: "3D tour" },
];


function Thumb({ item, className }: { item: MediaItem; className?: string }) {
  if (item.kind === "floorplan") {
    return (
      <div className={cn("grid h-full w-full place-items-center bg-surface-2", className)}>
        <svg viewBox="0 0 120 80" className="h-3/5 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="6" y="6" width="108" height="68" />
          <path d="M6 40h40V6M46 40v34M46 52h30M76 6v46M76 30h38M92 52h22" />
        </svg>
      </div>
    );
  }
  const variant = item.kind === "photo" ? (/(kitchen|living|bed|bath|dining|room|office|laundry|entry)/.test(item.filename) ? "interior" : "exterior") : "exterior";
  return <PropertyImage seed={item.seed} variant={variant} className={className} label={item.filename} />;
}

export function MediaGallery({
  items,
  mode,
  locked = false,
  projectId,
}: {
  items: MediaItem[];
  mode: "owner" | "client";
  locked?: boolean;
  projectId: string;
}) {
  const available = tabs.filter((t) => items.some((i) => i.kind === t.kind));
  const [tab, setTab] = useState<MediaKind>(available[0]?.kind ?? "photo");
  const [open, setOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const list = useMemo(() => items.filter((i) => i.kind === tab), [items, tab]);
  const selectable = mode === "client" && !locked && tab !== "tour";

  const move = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + list.length) % list.length)), [list.length]);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, move]);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function downloadSelected() {
    // Browsers block many simultaneous downloads; stagger them. With S3 a
    // zip-on-demand endpoint is the better long-term answer for big selections.
    [...selected].forEach((id, i) => setTimeout(() => window.open(downloadHref(id), "_blank"), i * 250));
  }

  if (items.length === 0) return null;
  const current = open !== null ? list[open] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
          {available.map((t) => {
            const count = items.filter((i) => i.kind === t.kind).length;
            return (
              <button
                key={t.kind}
                role="tab"
                aria-selected={tab === t.kind}
                onClick={() => {
                  setTab(t.kind);
                  setSelected(new Set());
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition",
                  tab === t.kind ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2",
                )}
              >
                {t.label} <span className="tabular opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        {selectable && (
          <div className="flex items-center gap-2">
            <button
              className="text-[13px] font-medium text-ink-2 hover:text-ink"
              onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((i) => i.id)))}
            >
              {selected.size === list.length ? "Clear" : "Select all"}
            </button>
            {selected.size > 0 && (
              <button onClick={downloadSelected} className={buttonClass("secondary", "sm")}>
                <Download /> Download {selected.size}
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "tour" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <div key={t.id} className="relative overflow-hidden rounded-xl border border-line">
              <div className="aspect-video">
                <Thumb item={t} />
              </div>
              <div className="absolute inset-0 grid place-items-center bg-black/35">
                {locked ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white">
                    <Lock className="size-4" /> Unlocks after payment
                  </span>
                ) : (
                  <a href={t.externalUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                    Open 3D tour <ExternalLink />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className={cn("grid gap-2 sm:gap-3", tab === "photo" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
          {list.map((item, idx) => {
            const isSel = selected.has(item.id);
            return (
              <li key={item.id} className="group relative">
                <button
                  onClick={() => setOpen(idx)}
                  className={cn(
                    "relative block w-full overflow-hidden rounded-xl border bg-surface-2 transition",
                    isSel ? "border-accent ring-2 ring-accent" : "border-line",
                  )}
                  aria-label={`Open ${item.filename}`}
                >
                  <div className={cn(tab === "photo" ? "aspect-[3/2]" : "aspect-video")}>
                    <Thumb item={item} className="transition duration-300 group-hover:scale-[1.03]" />
                  </div>
                  {item.kind === "video" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-12 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                        <Play className="ml-0.5 size-5" fill="currentColor" />
                      </span>
                    </span>
                  )}
                  {locked && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white/90 uppercase backdrop-blur">
                      Preview
                    </span>
                  )}
                </button>
                {selectable && (
                  <button
                    onClick={() => toggle(item.id)}
                    aria-label={isSel ? "Deselect" : "Select"}
                    aria-pressed={isSel}
                    className={cn(
                      "absolute top-2 left-2 grid size-6 place-items-center rounded-full border-2 transition",
                      isSel ? "border-accent bg-accent text-accent-ink" : "border-white/90 bg-black/20 text-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </button>
                )}
                {mode === "owner" && (
                  <button
                    onClick={() => start(() => removeMedia(item.id))}
                    disabled={pending}
                    aria-label={`Remove ${item.filename}`}
                    className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/55 text-white opacity-100 backdrop-blur transition hover:bg-bad sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5 text-xs text-muted">
                  <span className="truncate">{item.filename}</span>
                  <span className="tabular shrink-0">{item.durationSec ? `${Math.floor(item.durationSec / 60)}:${String(item.durationSec % 60).padStart(2, "0")}` : bytes(item.sizeBytes)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {current && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true" aria-label={current.filename}>
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{current.filename}</div>
              <div className="text-white/60">
                {open! + 1} of {list.length}
                {current.width && ` · ${current.width}×${current.height}`} · {bytes(current.sizeBytes)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {locked ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px]">
                  <Lock className="size-4" /> Pay to download
                </span>
              ) : (
                <a href={downloadHref(current.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium hover:bg-white/20">
                  <Download className="size-4" /> <span className="hidden sm:inline">Download</span>
                </a>
              )}
              <button onClick={() => setOpen(null)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
            <div className={cn("relative w-full overflow-hidden rounded-lg", current.kind === "floorplan" ? "max-w-3xl" : "max-w-6xl")}>
              <div className="aspect-[3/2] max-h-[78vh] w-full">
                {current.kind === "floorplan" ? (
                  <div className="grid h-full place-items-center bg-white text-neutral-700">
                    <FileText className="size-10" />
                    <span className="text-sm">{current.filename}</span>
                  </div>
                ) : (
                  <Thumb item={current} />
                )}
              </div>
              {locked && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="rotate-[-18deg] font-display text-5xl font-medium text-white/30 sm:text-7xl">PREVIEW</span>
                </div>
              )}
            </div>
            {list.length > 1 && (
              <>
                <button onClick={() => move(-1)} className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 hover:bg-white/20 sm:left-4" aria-label="Previous">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => move(1)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 hover:bg-white/20 sm:right-4" aria-label="Next">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
