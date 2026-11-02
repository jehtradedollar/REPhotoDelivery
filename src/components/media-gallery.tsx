"use client";

import { Check, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Lock, Play, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { removeMedia, setCover } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { bytes } from "@/lib/format";
import { embedInfo } from "@/lib/embeds";
import type { MediaKind, MediaView } from "@/lib/types";
import { PropertyImage } from "./property-image";
import { buttonClass } from "./ui";

type TabKey = MediaKind | "local";
type Quality = "full" | "mls";

const tabs: { key: TabKey; label: string }[] = [
  { key: "photo", label: "Photos" },
  { key: "video", label: "Video" },
  { key: "floorplan", label: "Floor plans" },
  { key: "tour", label: "Embedded links" },
  { key: "local", label: "Local area" },
];

const inTab = (i: MediaView, t: TabKey) => (t === "local" ? i.group === "local" : !i.group && i.kind === t);
const hrefFor = (i: MediaView, q: Quality) => (q === "mls" ? (i.mlsUrl ?? i.downloadUrl) : i.downloadUrl);

/** Two download choices for photos: the untouched original, or the MLS-size copy. */
function DownloadChoices({ item, dark }: { item: MediaView; dark?: boolean }) {
  const cls = dark
    ? "inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium hover:bg-white/20"
    : buttonClass("secondary", "sm");
  return (
    <>
      {item.downloadUrl && (
        <a href={item.downloadUrl} className={cls} title="Original file, full resolution">
          <Download className="size-4" /> Full quality
        </a>
      )}
      {item.mlsUrl && (
        <a href={item.mlsUrl} className={cls} title="2048px JPEG under 1 MB, sized for MLS uploads">
          <Download className="size-4" /> MLS
        </a>
      )}
    </>
  );
}

function EmbeddedLink({ item, locked, owner, onRemove }: { item: MediaView; locked: boolean; owner: boolean; onRemove?: () => void }) {
  const info = item.externalUrl ? embedInfo(item.externalUrl) : null;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative aspect-video bg-surface-2">
        {!locked && info?.embedUrl ? (
          <iframe
            src={info.embedUrl}
            title={item.filename}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; gyroscope; accelerometer"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <>
            <Thumb item={item} />
            <div className="absolute inset-0 grid place-items-center bg-black/35">
              {locked ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white">
                  <Lock className="size-4" /> Unlocks after payment
                </span>
              ) : (
                item.externalUrl && (
                  <a href={item.externalUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
                    Open link <ExternalLink />
                  </a>
                )
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
        <div className="min-w-0">
          <div className="truncate font-medium">{item.filename}</div>
          <div className="truncate text-xs text-muted">{info?.provider ?? "Link"}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!locked && item.externalUrl && (
            <a href={item.externalUrl} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Open ${item.filename} in a new tab`}>
              <ExternalLink className="size-4" />
            </a>
          )}
          {owner && onRemove && (
            <button onClick={onRemove} className="rounded-lg p-1.5 text-muted hover:bg-bad-soft hover:text-bad" aria-label={`Remove ${item.filename}`}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function Thumb({ item, className, large }: { item: MediaView; className?: string; large?: boolean }) {
  const src = large ? (item.viewUrl ?? item.thumbUrl) : item.thumbUrl;
  if (src && item.kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={item.filename} loading="lazy" className={cn("block h-full w-full", large ? "object-contain" : "object-cover", className)} />;
  }
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
  items: MediaView[];
  mode: "owner" | "client";
  locked?: boolean;
  projectId: string;
}) {
  const available = tabs.filter((t) => items.some((i) => inTab(i, t.key)));
  const [tabState, setTab] = useState<TabKey>(available[0]?.key ?? "photo");
  const tab = available.some((t) => t.key === tabState) ? tabState : (available[0]?.key ?? "photo");
  const [open, setOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState<Quality>("full");
  const [pending, start] = useTransition();
  const list = useMemo(() => items.filter((i) => inTab(i, tab)), [items, tab]);
  const selectable = mode === "client" && !locked && tab !== "tour";
  const hasMls = list.some((i) => i.mlsUrl);

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
    const hrefs = list.filter((i) => selected.has(i.id)).map((i) => hrefFor(i, quality)).filter((h): h is string => !!h);
    hrefs.forEach((h, i) =>
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = h;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 400),
    );
  }

  if (items.length === 0) return null;
  const current = open !== null ? list[open] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
          {available.map((t) => {
            const count = items.filter((i) => inTab(i, t.key)).length;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelected(new Set());
                }}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition",
                  tab === t.key ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2",
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
              <>
                {hasMls && (
                  <div className="flex rounded-lg border border-line p-0.5 text-[12px] font-medium" role="radiogroup" aria-label="Download quality">
                    {(["full", "mls"] as const).map((q) => (
                      <button
                        key={q}
                        role="radio"
                        aria-checked={quality === q}
                        onClick={() => setQuality(q)}
                        className={cn("rounded-md px-2 py-1", quality === q ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}
                      >
                        {q === "full" ? "Full quality" : "MLS"}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={downloadSelected} className={buttonClass("secondary", "sm")}>
                  <Download /> Download {selected.size}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {tab === "tour" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <EmbeddedLink
              key={t.id}
              item={t}
              locked={locked}
              owner={mode === "owner"}
              onRemove={() => {
                if (window.confirm(`Remove ${t.filename}?`)) start(() => removeMedia(t.id));
              }}
            />
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
                {mode === "owner" && !item.group && item.kind === "photo" && item.thumbUrl && (
                  <button
                    onClick={() => start(() => setCover(projectId, item.id))}
                    disabled={pending}
                    aria-label={`Use ${item.filename} as the cover photo`}
                    title="Use as cover photo"
                    className="absolute top-2 right-11 grid size-7 place-items-center rounded-full bg-black/55 text-white opacity-100 backdrop-blur transition hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                {mode === "owner" && !item.group && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${item.filename}? This removes the file from storage.`)) start(() => removeMedia(item.id));
                    }}
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
                <DownloadChoices item={current} dark />
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
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="size-10" />
                      <span className="text-sm">{current.filename}</span>
                      {!locked && current.downloadUrl && (
                        <a href={current.downloadUrl} className="mt-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white">
                          Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                ) : current.kind === "video" && current.viewUrl ? (
                  <video src={current.viewUrl} controls playsInline className="h-full w-full bg-black object-contain" />
                ) : (
                  <Thumb item={current} large />
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
