import Link from "next/link";
import { cn } from "@/lib/cn";
import { date, dayLabel, time } from "@/lib/format";
import type { Client, Project, Shoot } from "@/lib/types";
import { ShootStatusBadge } from "./ui";

export function ShootRow({ shoot, project, client, href, compact }: { shoot: Shoot; project?: Project; client?: Client; href: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2", compact && "px-4 py-3")}>
      <div className="w-12 shrink-0 text-center">
        <div className="text-[11px] font-semibold tracking-wide text-warm uppercase">{date(shoot.start, { month: "short" })}</div>
        <div className="tabular font-display text-2xl leading-none font-medium">{date(shoot.start, { day: "numeric" })}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{project?.address ?? "Property"}</div>
        <div className="truncate text-[13px] text-muted">
          {dayLabel(shoot.start)} · {time(shoot.start)} to {time(shoot.end)}
          {client && <span className="hidden sm:inline"> · {client.name}</span>}
        </div>
      </div>
      <ShootStatusBadge status={shoot.status} />
    </Link>
  );
}
