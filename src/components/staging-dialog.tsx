"use client";

import { ArrowLeft, Check, Lock, Sofa, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { orderStaging } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { SubmitButton } from "./submit-button";
import { Button, Field, Select, Textarea } from "./ui";

type Photo = { id: string; thumbUrl: string | null; filename: string };
type Choice = { roomType: string; style: string; prompt: string };

/**
 * The paid virtual staging add-on on the delivery page: an offer banner the
 * agent can't miss, and a two-step order (pick photos, then describe the
 * furniture) that ends at checkout.
 */
export function StagingOffer({
  projectId,
  token,
  photos,
  price,
  roomTypes,
  styles,
  canOrder,
}: {
  projectId: string;
  token?: string;
  photos: Photo[];
  price: number;
  roomTypes: readonly string[];
  styles: readonly string[];
  /** False while the gallery itself is unpaid: the offer shows, ordering waits. */
  canOrder: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
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
  const describeAll = (prompt: string) => setPicked((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, prompt }])));
  const total = ids.length * price;
  const close = () => {
    setOpen(false);
    setStep(1);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const sample = photos.slice(0, 3);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-accent/30 bg-accent-soft" aria-labelledby="staging-offer-title">
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-accent uppercase">
              <Sparkles className="size-3.5" /> Add-on
            </p>
            <h2 id="staging-offer-title" className="mt-1 font-display text-[24px] leading-tight font-medium tracking-tight">
              Virtual staging
            </h2>
            <p className="mt-1 max-w-[52ch] text-[14px] text-ink-2">
              Furnish empty rooms with AI. Pick the photos, describe the furniture you want, and the staged versions land in your gallery, usually within a day.
            </p>
            <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
              <li>
                <span className="font-semibold text-ink">1</span> Choose photos
              </li>
              <li>
                <span className="font-semibold text-ink">2</span> Describe the furniture
              </li>
              <li>
                <span className="font-semibold text-ink">3</span> Pay to unlock
              </li>
            </ol>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <p className="text-[14px] sm:text-right">
              <span className="font-display text-[28px] leading-none font-medium tabular">{money(price)}</span>
              <span className="text-ink-2"> per photo</span>
            </p>
            {canOrder ? (
              <Button type="button" size="lg" onClick={() => setOpen(true)}>
                <Sofa /> Stage photos
              </Button>
            ) : (
              <p className="flex items-center gap-1.5 text-[13px] text-ink-2 sm:justify-end">
                <Lock className="size-4" /> Available once this shoot is paid
              </p>
            )}
          </div>
        </div>
        {sample.length > 0 && (
          <div className="grid grid-cols-3 gap-px border-t border-accent/20 bg-accent/20">
            {sample.map((p) =>
              p.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.thumbUrl} alt="" className="aspect-[3/1] w-full object-cover opacity-90" loading="lazy" />
              ) : (
                <span key={p.id} className="aspect-[3/1] bg-surface-2" />
              ),
            )}
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="staging-title" onClick={close}>
          <form
            action={orderStaging.bind(null, projectId, token ?? "")}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <input type="hidden" name="choices" value={JSON.stringify(ids.map((id) => ({ mediaId: id, ...picked[id] })))} />
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <p className="text-[12px] font-semibold tracking-wide text-accent uppercase">Step {step} of 2</p>
                <h2 id="staging-title" className="mt-0.5 font-display text-[24px] leading-tight font-medium tracking-tight">
                  {step === 1 ? "Choose photos to stage" : "Describe the furniture"}
                </h2>
                <p className="mt-1 text-[14px] text-ink-2">
                  {step === 1 ? `Tap the empty rooms you want furnished. ${money(price)} per photo.` : "Pick a room and style for each photo and say what you'd like in it."}
                </p>
              </div>
              <button type="button" onClick={close} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {step === 1 ? (
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
              ) : (
                <>
                  {ids.length > 1 && (
                    <Field label="Same description for every photo (optional)">
                      <Textarea rows={2} className="min-h-0" maxLength={500} onChange={(e) => describeAll(e.target.value)} placeholder="Warm modern furniture, light oak and linen, a few plants" />
                    </Field>
                  )}
                  {ids.map((id) => {
                    const p = photos.find((x) => x.id === id)!;
                    const c = picked[id];
                    return (
                      <div key={id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[140px_1fr]">
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
                          <Field label="Furniture you'd like" className="sm:col-span-2">
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
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink-2">
                {ids.length} photo{ids.length === 1 ? "" : "s"} selected · <span className="font-semibold text-ink tabular">{money(total)}</span>
                <span className="block text-[12px] text-muted">Staged photos appear in your gallery, usually within a day.</span>
              </p>
              {step === 1 ? (
                <Button type="button" size="lg" disabled={!ids.length} onClick={() => setStep(2)}>
                  Next: describe the furniture
                </Button>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)}>
                    <ArrowLeft /> Back
                  </Button>
                  <SubmitButton size="lg" disabled={!ids.length}>
                    {price > 0 ? `Pay ${money(total)} and unlock staging` : "Order staging"}
                  </SubmitButton>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
