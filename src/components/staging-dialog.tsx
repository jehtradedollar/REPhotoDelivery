"use client";

import { Check, Sofa, X } from "lucide-react";
import { useEffect, useState } from "react";
import { orderStaging } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import { Button, Field, Select, Textarea } from "./ui";

type Photo = { id: string; thumbUrl: string | null; filename: string };
type Choice = { roomType: string; style: string; prompt: string };

/** "Virtual staging" button and order form on the delivery page. */
export function StagingDialog({
  projectId,
  token,
  photos,
  price,
  roomTypes,
  styles,
}: {
  projectId: string;
  token?: string;
  photos: Photo[];
  price: number;
  roomTypes: readonly string[];
  styles: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, Choice>>({});
  const ids = Object.keys(picked);
  const fresh = (): Choice => ({ roomType: roomTypes[0], style: styles[0], prompt: "" });
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = ids.length ? { ...p[ids[ids.length - 1]] } : fresh();
      return n;
    });
  const set = (id: string, patch: Partial<Choice>) => setPicked((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Sofa /> Add virtual staging
      </Button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="staging-title" onClick={() => setOpen(false)}>
          <form
            action={orderStaging.bind(null, projectId, token ?? "")}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <input type="hidden" name="choices" value={JSON.stringify(ids.map((id) => ({ mediaId: id, ...picked[id] })))} />
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h2 id="staging-title" className="font-display text-[24px] leading-tight font-medium tracking-tight">
                  Virtual staging
                </h2>
                <p className="mt-1 text-[14px] text-ink-2">Pick empty rooms, then tell us the furniture you want. {money(price)} per photo.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {photos.map((p) => {
                  const on = !!picked[p.id];
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={on}
                        aria-label={`${on ? "Remove" : "Choose"} ${p.filename}`}
                        className={cn("relative block w-full overflow-hidden rounded-lg border-2 transition", on ? "border-accent" : "border-transparent hover:border-line-strong")}
                      >
                        {p.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbUrl} alt="" className="aspect-[3/2] w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="block aspect-[3/2] bg-surface-2" />
                        )}
                        {on && (
                          <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-ink">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {ids.map((id) => {
                const p = photos.find((x) => x.id === id)!;
                const c = picked[id];
                return (
                  <div key={id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[120px_1fr]">
                    {p.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbUrl} alt="" className="aspect-[3/2] w-full rounded-md object-cover" />
                    ) : (
                      <span className="aspect-[3/2] rounded-md bg-surface-2" />
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Room">
                        <Select value={c.roomType} onChange={(e) => set(id, { roomType: e.target.value })}>
                          {roomTypes.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Style">
                        <Select value={c.style} onChange={(e) => set(id, { style: e.target.value })}>
                          {styles.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Describe the furniture (optional)" className="sm:col-span-2">
                        <Textarea
                          value={c.prompt}
                          onChange={(e) => set(id, { prompt: e.target.value })}
                          maxLength={500}
                          rows={2}
                          className="min-h-0"
                          placeholder="Light oak dining table for six, linen chairs, a large jute rug and a few plants"
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
              {ids.length === 0 && <p className="text-center text-[13px] text-muted">Tap the photos you&apos;d like staged.</p>}
            </div>

            <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink-2">
                {ids.length} photo{ids.length === 1 ? "" : "s"} · <span className="font-semibold text-ink">{money(ids.length * price)}</span>
                <span className="block text-[12px] text-muted">Staged photos appear in your gallery, usually within a day.</span>
              </p>
              <SubmitButton size="lg" disabled={!ids.length}>
                {price > 0 ? `Continue to payment` : "Order staging"}
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
