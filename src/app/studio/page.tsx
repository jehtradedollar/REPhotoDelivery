import { AlertCircle, CalendarClock, CircleDollarSign, Download, ImageUp, Plus, Receipt, UserPlus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RevenueChart } from "@/components/revenue-chart";
import { ShootRow } from "@/components/shoot-row";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { confirmShoot } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { db, getActivity, getClient, getProject, invoiceTotal } from "@/lib/data";
import { money, relative, time } from "@/lib/format";
import { revenueHistory } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Dashboard" };

const activityIcon = { booking: CalendarClock, upload: ImageUp, payment: Wallet, download: Download, client: UserPlus, delivery: ImageUp };

export default async function Dashboard() {
  const user = await requireOwner();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const weekEnd = new Date(startOfToday.getTime() + 7 * 86_400_000);

  const upcoming = db.shoots
    .filter((s) => new Date(s.end) >= now && s.status !== "cancelled" && s.status !== "completed")
    .sort((a, b) => a.start.localeCompare(b.start));
  const thisWeek = upcoming.filter((s) => new Date(s.start) < weekEnd);
  const today = upcoming.filter((s) => new Date(s.start).toDateString() === now.toDateString());
  const requested = upcoming.filter((s) => s.status === "requested");
  const editing = db.projects.filter((p) => p.status === "editing");
  const unpaid = db.invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const overdue = unpaid.filter((i) => i.status === "overdue");
  const outstanding = unpaid.reduce((s, i) => s + invoiceTotal(i).total, 0);

  const monthPaid = db.invoices
    .filter((i) => i.paidAt && new Date(i.paidAt).getMonth() === now.getMonth() && new Date(i.paidAt).getFullYear() === now.getFullYear())
    .reduce((s, i) => s + invoiceTotal(i).total, 0);
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + k, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  });
  const chart = months.map((label, k) => ({ label, value: k === 5 ? monthPaid : revenueHistory[k], current: k === 5 }));

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-muted">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight sm:text-[34px]">
            {greeting}, {user.name}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {today.length === 0
              ? "No shoots on the books today."
              : `${today.length} shoot${today.length > 1 ? "s" : ""} today, first at ${time(today[0].start)}.`}
            {requested.length > 0 && ` ${requested.length} booking request${requested.length > 1 ? "s" : ""} waiting on you.`}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/studio/clients/new" variant="secondary">
            <UserPlus /> Add client
          </ButtonLink>
          <ButtonLink href="/studio/projects/new">
            <Plus /> New shoot
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Shoots this week" value={thisWeek.length} sub={`${requested.length} awaiting confirmation`} icon={<CalendarClock />} href="/studio/calendar" />
        <Stat label="In editing" value={editing.length} sub="Ready to upload and deliver" icon={<ImageUp />} href="/studio/projects?status=editing" />
        <Stat label="Outstanding" value={money(outstanding)} sub={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"} icon={<Receipt />} href="/studio/invoices" />
        <Stat label="Paid this month" value={money(monthPaid)} sub={`${db.invoices.filter((i) => i.status === "paid").length} invoices paid all time`} icon={<CircleDollarSign />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Upcoming shoots" sub="Next 7 days" action={<Link href="/studio/calendar" className="text-[13px] font-medium text-accent hover:underline">Open calendar</Link>} />
            {thisWeek.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title="Nothing scheduled this week" />
            ) : (
              <div className="divide-y divide-line">
                {thisWeek.map((s) => (
                  <ShootRow key={s.id} shoot={s} project={getProject(s.projectId)} client={getClient(s.clientId)} href={`/studio/projects/${s.projectId}`} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Revenue" sub="Paid invoices by month" />
            <div className="px-5 pt-6 pb-5">
              <RevenueChart data={chart} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs attention" />
            <ul className="divide-y divide-line">
              {requested.map((s) => {
                const p = getProject(s.projectId);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
                      <CalendarClock className="size-4" />
                    </span>
                    <Link href={`/studio/projects/${s.projectId}`} className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">Booking request</div>
                      <div className="truncate text-[13px] text-muted">{p?.address} · {getClient(s.clientId)?.name}</div>
                    </Link>
                    <form action={confirmShoot.bind(null, s.id)}>
                      <SubmitButton size="sm" variant="secondary">Confirm</SubmitButton>
                    </form>
                  </li>
                );
              })}
              {editing.map((p) => (
                <li key={p.id}>
                  <Link href={`/studio/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info-soft text-info">
                      <ImageUp className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">Upload and deliver</div>
                      <div className="truncate text-[13px] text-muted">{p.address}</div>
                    </div>
                  </Link>
                </li>
              ))}
              {overdue.map((i) => (
                <li key={i.id}>
                  <Link href={`/studio/invoices/${i.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bad-soft text-bad">
                      <AlertCircle className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">{i.number} overdue</div>
                      <div className="truncate text-[13px] text-muted">
                        {money(invoiceTotal(i).total)} · {getClient(i.clientId)?.name}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
              {requested.length + editing.length + overdue.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted">All caught up.</li>
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            <ul className="space-y-0 px-5 py-2">
              {getActivity().slice(0, 7).map((a) => {
                const Icon = activityIcon[a.kind];
                return (
                  <li key={a.id} className="flex gap-3 py-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1 text-[13px]">
                      <p className="text-ink-2">{a.text}</p>
                      <p className="text-xs text-muted">{relative(a.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
