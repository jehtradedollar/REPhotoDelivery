"use client";

import { useState } from "react";
import { money, moneyShort } from "@/lib/format";

// Single-series bar chart: paid revenue by month. The card title names the
// series, so there is no legend. Hover or focus a bar for its exact value.
export function RevenueChart({ data }: { data: { label: string; value: number; current?: boolean }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = Math.ceil(max / 250000) * 250000; // round axis to $2,500
  const ticks = [0, nice / 2, nice];
  const H = 160;

  return (
    <div className="relative">
      <div className="flex gap-3">
        <div className="tabular relative w-12 shrink-0 text-right text-[11px] text-muted" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / nice) * H }}>
              {moneyShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: H }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t" style={{ top: H - (t / nice) * H, borderColor: "var(--chart-grid)" }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[6%] px-[3%]">
            {data.map((d, i) => {
              const h = Math.max(2, (d.value / nice) * H);
              return (
                <button
                  key={d.label}
                  type="button"
                  className="group relative flex h-full flex-1 items-end focus:outline-none"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${d.label}: ${money(d.value)}`}
                >
                  <span
                    className="block w-full rounded-t-[4px] transition-opacity"
                    style={{
                      height: h,
                      background: "var(--chart-bar)",
                      opacity: hover === null || hover === i ? (d.current ? 1 : 0.78) : 0.35,
                    }}
                  />
                  {hover === i && (
                    <span
                      className="tabular pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-xs whitespace-nowrap shadow-card"
                      style={{ bottom: h + 8 }}
                    >
                      <span className="block text-muted">{d.label}</span>
                      <span className="block font-semibold text-ink">{money(d.value)}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        <div className="w-12 shrink-0" />
        <div className="flex flex-1 gap-[6%] px-[3%]">
          {data.map((d) => (
            <span key={d.label} className={`flex-1 text-center text-[11px] ${d.current ? "font-semibold text-ink" : "text-muted"}`}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
