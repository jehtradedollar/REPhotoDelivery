"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import type { Client, Package, Service } from "@/lib/types";
import { SubmitButton } from "./submit-button";
import { Card, Field, Input, Select, Textarea } from "./ui";

const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ShootForm({
  action,
  packages,
  services,
  clients,
  busy,
  submitLabel,
  note,
}: {
  action: (fd: FormData) => void | Promise<void>;
  packages: Package[];
  services: Service[];
  clients?: Client[];
  /** Existing shoots/busy time as ISO ranges; overlapping slots are hidden. */
  busy: { start: string; end: string }[];
  submitLabel: string;
  note?: string;
}) {
  const [pkg, setPkg] = useState(packages.find((p) => p.popular)?.id ?? packages[0]?.id ?? "");
  const [extras, setExtras] = useState<string[]>([]);
  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 1; out.length < 14; i++) {
      const x = new Date(d.getTime() + i * 86_400_000);
      if (x.getDay() !== 0) out.push(x); // closed Sundays
    }
    return out;
  }, []);
  const [day, setDay] = useState(ymd(days[0]));
  const [slot, setSlot] = useState<string>("");

  const chosen = packages.find((p) => p.id === pkg);
  const included = new Set(chosen?.serviceIds ?? []);
  const addOns = services.filter((s) => !included.has(s.id));
  const total = (chosen?.price ?? 0) + extras.reduce((s, id) => s + (services.find((x) => x.id === id)?.price ?? 0), 0);
  const duration = Math.max(60, [...included, ...extras].reduce((s, id) => s + (services.find((x) => x.id === id)?.durationMin ?? 0), 0));

  const slots = SLOT_HOURS.map((h) => {
    const start = new Date(`${day}T${String(h).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    const taken = busy.some((b) => new Date(b.start) < end && new Date(b.end) > start);
    return { value: `${String(h).padStart(2, "0")}:00`, label: start.toLocaleTimeString("en-US", { hour: "numeric" }), taken };
  });

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        {clients && (
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Agent</h2>
            <Field label="Client">
              <Select name="clientId" required defaultValue="">
                <option value="" disabled>
                  Choose a client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.brokerage}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Property</h2>
          <div className="grid grid-cols-6 gap-4">
            <Field label="Street address" className="col-span-6">
              <Input name="address" required placeholder="123 Main Street" autoComplete="street-address" />
            </Field>
            <Field label="City" className="col-span-6 sm:col-span-3">
              <Input name="city" required placeholder="Redding" />
            </Field>
            <Field label="State" className="col-span-2 sm:col-span-1">
              <Input name="state" defaultValue="CA" maxLength={2} />
            </Field>
            <Field label="ZIP" className="col-span-4 sm:col-span-2">
              <Input name="zip" inputMode="numeric" placeholder="96001" />
            </Field>
            <Field label="Square feet" className="col-span-6 sm:col-span-2">
              <Input name="sqft" type="number" min={100} required placeholder="2,400" inputMode="numeric" />
            </Field>
            <Field label="Beds (optional)" className="col-span-2 sm:col-span-1">
              <Input name="beds" type="number" min={0} />
            </Field>
            <Field label="Baths (optional)" className="col-span-2 sm:col-span-1">
              <Input name="baths" type="number" min={0} step={0.5} />
            </Field>
            <Field label="Acreage (optional)" className="col-span-2 sm:col-span-2">
              <Input name="acreage" type="number" min={0} step={0.01} placeholder="0.25" />
            </Field>
            <Field label="Features (optional)" className="col-span-6" hint="One per line or separated by commas. Shown on the property website.">
              <Textarea name="features" placeholder={"Pool and spa\nRV parking\nOwned solar"} className="min-h-20" />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Package</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {packages.map((p) => (
              <label
                key={p.id}
                className={cn(
                  "relative cursor-pointer rounded-xl border p-4 transition",
                  pkg === p.id ? "border-accent bg-accent-soft/50 ring-1 ring-accent" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="package" value={p.id} checked={pkg === p.id} onChange={() => { setPkg(p.id); setExtras([]); }} className="sr-only" />
                {p.popular && <span className="absolute -top-2.5 right-3 rounded-full bg-warm px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">Popular</span>}
                <div className="font-semibold">{p.name}</div>
                <div className="tabular mt-0.5 font-display text-xl font-medium">{money(p.price)}</div>
                <ul className="mt-2 space-y-1 text-[12px] text-ink-2">
                  {p.serviceIds.map((id) => (
                    <li key={id} className="flex items-center gap-1.5">
                      <Check className="size-3 text-accent" strokeWidth={3} /> {services.find((s) => s.id === id)?.name}
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
          {addOns.length > 0 && (
            <>
              <h3 className="mt-6 mb-3 text-[13px] font-medium text-ink-2">Add-ons</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {addOns.map((s) => {
                  const on = extras.includes(s.id);
                  return (
                    <label key={s.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition", on ? "border-accent bg-accent-soft/50" : "border-line hover:border-line-strong")}>
                      <input
                        type="checkbox"
                        name="services"
                        value={s.id}
                        checked={on}
                        onChange={() => setExtras((e) => (on ? e.filter((x) => x !== s.id) : [...e, s.id]))}
                        className="mt-1 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2 text-[14px] font-medium">
                          {s.name} <span className="tabular text-ink-2">+{money(s.price)}</span>
                        </span>
                        <span className="block text-[12px] text-muted">{s.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-[15px] font-semibold">Date and time</h2>
          <p className="mb-4 text-[13px] text-muted">About {Math.round(duration / 15) * 15} minutes on site.</p>
          <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {days.map((d) => {
              const v = ymd(d);
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => { setDay(v); setSlot(""); }}
                  className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition", day === v ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-line-strong")}
                >
                  <span className="text-[11px] font-medium uppercase opacity-80">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="tabular text-lg font-semibold">{d.getDate()}</span>
                  <span className="text-[10px] uppercase opacity-70">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button
                type="button"
                key={s.value}
                disabled={s.taken}
                onClick={() => setSlot(s.value)}
                className={cn(
                  "rounded-lg border py-2 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted disabled:line-through",
                  slot === s.value ? "border-accent bg-accent text-accent-ink" : "border-line hover:border-line-strong",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="date" value={day} />
          <input type="hidden" name="time" value={slot} />
          <input type="hidden" name="startIso" value={slot ? new Date(`${day}T${slot}:00`).toISOString() : ""} />
          <Field label="Access notes" className="mt-5" hint="Lockbox codes, pets, parking, who will be there.">
            <Textarea name="notes" placeholder="Lockbox on front door, code 1234" />
          </Field>
        </Card>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Summary</h2>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {chosen && (
              <li className="flex justify-between">
                <span className="text-ink-2">{chosen.name} package</span>
                <span className="tabular">{money(chosen.price)}</span>
              </li>
            )}
            {extras.map((id) => {
              const s = services.find((x) => x.id === id)!;
              return (
                <li key={id} className="flex justify-between">
                  <span className="text-ink-2">{s.name}</span>
                  <span className="tabular">{money(s.price)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold">
            <span>Total</span>
            <span className="tabular">{money(total)}</span>
          </div>
          <div className="mt-3 text-[13px] text-ink-2">
            {slot ? (
              <>
                {new Date(`${day}T${slot}:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
                {new Date(`${day}T${slot}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </>
            ) : (
              <span className="text-muted">Pick a time slot</span>
            )}
          </div>
          {clients && (
            <label className="mt-4 flex items-center gap-2 text-[13px] text-ink-2">
              <input type="checkbox" name="notify" defaultChecked className="accent-[var(--accent)]" /> Email the agent a confirmation
            </label>
          )}
          <SubmitButton size="lg" className="mt-5 w-full" disabled={!slot}>
            {submitLabel}
          </SubmitButton>
          {note && <p className="mt-3 text-xs text-muted">{note}</p>}
        </Card>
      </div>
    </form>
  );
}
