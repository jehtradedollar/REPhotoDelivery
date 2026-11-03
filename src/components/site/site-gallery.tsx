"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { SitePhoto } from "@/lib/site";

/** Photo grid with a full-screen viewer, for property websites. */
export function SiteGallery({ photos, layout = "grid", className }: { photos: SitePhoto[]; layout?: "grid" | "masonry" | "stack"; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const move = useCallback((d: number) => setOpen((o) => (o === null ? o : (o + d + photos.length) % photos.length)), [photos.length]);
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
  if (!photos.length) return null;

  return (
    <>
      <ul
        className={cn(
          layout === "grid" && "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3",
          layout === "masonry" && "columns-2 gap-2 sm:columns-3 sm:gap-3 [&>li]:mb-2 sm:[&>li]:mb-3",
          layout === "stack" && "space-y-4 sm:space-y-6",
          className,
        )}
      >
        {photos.map((p, i) => (
          <li key={p.id} className="break-inside-avoid">
            <button onClick={() => setOpen(i)} className="group block w-full overflow-hidden rounded-[inherit]" aria-label={`View photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layout === "stack" ? p.url : p.thumb || p.url}
                alt=""
                loading="lazy"
                className={cn("w-full transition duration-500 group-hover:scale-[1.02]", layout === "grid" ? "aspect-[3/2] object-cover" : "h-auto")}
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[open].url} alt="" className="max-h-[92dvh] max-w-[96vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setOpen(null)} className="absolute top-3 right-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
            <X className="size-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  move(-1);
                }}
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-5"
                aria-label="Previous"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  move(1);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-5"
                aria-label="Next"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] text-white/70">
            {open + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}
