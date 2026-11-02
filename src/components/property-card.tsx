import { Bath, BedDouble, CalendarDays, Images, Ruler } from "lucide-react";
import Link from "next/link";
import type { ProjectRow } from "@/lib/data";
import { date, dayLabel, time } from "@/lib/format";
import { PropertyImage } from "./property-image";
import { InvoiceStatusBadge, ProjectStatusBadge } from "./ui";

export function PropertyCard({ row, href, showClient = true }: { row: ProjectRow; href: string; showClient?: boolean }) {
  const { project: p, client, shoot, invoice, mediaCount } = row;
  const upcoming = shoot && new Date(shoot.end) > new Date() && p.status === "scheduled";
  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:border-line-strong">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <PropertyImage seed={p.coverSeed} className="transition duration-500 group-hover:scale-[1.03]" label={p.address} />
        <div className="absolute top-3 left-3">
          <ProjectStatusBadge status={p.status} />
        </div>
        {mediaCount > 0 && (
          <span className="tabular absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            <Images className="size-3.5" /> {mediaCount}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-[15px] font-semibold">{p.address}</h3>
        <p className="truncate text-[13px] text-muted">
          {p.city}, {p.state}
          {showClient && client && ` · ${client.name}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
          {p.beds && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-3.5 text-muted" /> {p.beds} bd
            </span>
          )}
          {p.baths && (
            <span className="inline-flex items-center gap-1">
              <Bath className="size-3.5 text-muted" /> {p.baths} ba
            </span>
          )}
          {p.sqft && (
            <span className="tabular inline-flex items-center gap-1">
              <Ruler className="size-3.5 text-muted" /> {p.sqft.toLocaleString()} sqft
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <CalendarDays className="size-3.5 text-muted" />
            {upcoming && shoot ? `${dayLabel(shoot.start)}, ${time(shoot.start)}` : p.deliveredAt ? `Delivered ${date(p.deliveredAt, { month: "short", day: "numeric" })}` : shoot ? `Shot ${date(shoot.start, { month: "short", day: "numeric" })}` : "Not scheduled"}
          </span>
          {invoice && <InvoiceStatusBadge status={invoice.status} />}
        </div>
      </div>
    </Link>
  );
}
