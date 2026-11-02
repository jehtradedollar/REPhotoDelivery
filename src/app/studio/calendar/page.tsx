import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShootRow } from "@/components/shoot-row";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getClient, getProject, getShoots } from "@/lib/data";
import { time } from "@/lib/format";
import { calendar } from "@/lib/integrations";

export const metadata: Metadata = { title: "Calendar" };

const tone = {
  requested: "border-l-warn bg-warn-soft text-warn",
  confirmed: "border-l-accent bg-accent-soft text-accent-strong dark:text-accent",
  completed: "border-l-line-strong bg-surface-2 text-ink-2",
  cancelled: "border-l-bad bg-bad-soft text-bad line-through",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireOwner();
  const { m } = await searchParams;
  const now = new Date();
  const [y, mo] = m && /^\d{4}-\d{2}$/.test(m) ? m.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const first = new Date(y, mo - 1, 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(y, mo, 0).getDate()) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const key = (d: Date) => d.toDateString();
  const shoots = getShoots();
  const byDay = new Map<string, typeof shoots>();
  for (const s of shoots) {
    const k = key(new Date(s.start));
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prev = fmt(new Date(y, mo - 2, 1));
  const next = fmt(new Date(y, mo, 1));
  const upcoming = shoots.filter((s) => new Date(s.end) >= now && s.status !== "cancelled");
  const connected = await calendar.isConnected();

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          <>
            <Badge tone={connected ? "ok" : "neutral"} className="py-1.5">
              <CalendarCheck className="size-3.5" />
              {connected ? "Synced with Google Calendar" : "Google Calendar: demo mode"}
            </Badge>
            <ButtonLink href="/studio/projects/new">
              <Plus /> New shoot
            </ButtonLink>
          </>
        }
      />

      <Card className="hidden md:block">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-xl font-medium">{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          <div className="flex items-center gap-1">
            <Link href={`?m=${prev}`} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href="?" className="rounded-lg px-3 py-1.5 text-[13px] font-medium hover:bg-surface-2">
              Today
            </Link>
            <Link href={`?m=${next}`} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Next month">
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === mo - 1;
            const isToday = key(d) === key(now);
            const list = byDay.get(key(d)) ?? [];
            return (
              <div key={i} className={cn("min-h-[118px] border-line p-1.5", i % 7 !== 6 && "border-r", i < cells.length - 7 && "border-b", !inMonth && "bg-surface-2/50")}>
                <div className={cn("tabular mb-1 ml-1 inline-grid size-6 place-items-center rounded-full text-[12px] font-medium", isToday ? "bg-accent text-accent-ink" : inMonth ? "text-ink" : "text-muted")}>
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {list.map((s) => (
                    <Link key={s.id} href={`/studio/projects/${s.projectId}`} className={cn("block truncate rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight font-medium transition hover:brightness-95", tone[s.status])}>
                      <span className="tabular">{time(s.start)}</span> {getProject(s.projectId)?.address}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Phone: agenda list */}
      <Card className="md:hidden">
        <CardHeader title="Upcoming" sub={`${upcoming.length} shoots`} />
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing scheduled" />
        ) : (
          <div className="divide-y divide-line">
            {upcoming.map((s) => (
              <ShootRow key={s.id} compact shoot={s} project={getProject(s.projectId)} client={getClient(s.clientId)} href={`/studio/projects/${s.projectId}`} />
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-warn" /> Requested by agent</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" /> Confirmed</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-line-strong" /> Completed</span>
      </div>
    </>
  );
}
