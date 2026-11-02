import { CalendarPlus, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { ShootRow } from "@/components/shoot-row";
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { getInvoices, getProject, getShoots, invoiceTotal, projectRows } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Your properties" };

export default async function PortalHome() {
  const s = await requireClient();
  const rows = projectRows({ clientId: s.clientId }).filter((r) => r.project.status !== "archived");
  const unpaid = getInvoices({ clientId: s.clientId }).filter((i) => i.status === "sent" || i.status === "overdue");
  const upcoming = getShoots({ clientId: s.clientId }).filter((x) => new Date(x.end) > new Date() && x.status !== "cancelled" && x.status !== "completed");

  return (
    <>
      <PageHeader
        eyebrow={`Hi ${s.name.split(" ")[0]}`}
        title="Your properties"
        description="Media for every listing we've shot for you, plus anything coming up."
        actions={
          <ButtonLink href="/portal/book">
            <CalendarPlus /> Book a shoot
          </ButtonLink>
        }
      />

      {unpaid.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warm/30 bg-warm-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-warm" />
            <div>
              <p className="text-[14px] font-semibold">
                {unpaid.length === 1 ? "1 gallery is ready to unlock" : `${unpaid.length} galleries are ready to unlock`}
              </p>
              <p className="text-[13px] text-ink-2">
                Pay {money(unpaid.reduce((t, i) => t + invoiceTotal(i).total, 0))} to download full-resolution files.
              </p>
            </div>
          </div>
          <ButtonLink href={`/portal/properties/${unpaid[0].projectId}`} variant="secondary" size="sm">
            View {unpaid.length === 1 ? getProject(unpaid[0].projectId)?.address : "first"}
          </ButtonLink>
        </div>
      )}

      {upcoming.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Upcoming shoots" />
          <div className="divide-y divide-line">
            {upcoming.map((x) => (
              <ShootRow key={x.id} shoot={x} project={getProject(x.projectId)} href={`/portal/properties/${x.projectId}`} />
            ))}
          </div>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No properties yet" body="Book your first shoot and it will show up here." action={<ButtonLink href="/portal/book">Book a shoot</ButtonLink>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <PropertyCard key={r.project.id} row={r} showClient={false} href={`/portal/properties/${r.project.id}`} />
          ))}
        </div>
      )}
      <p className="mt-8 text-center text-[13px] text-muted">
        Looking for an older listing? <Link href="/portal/invoices" className="font-medium text-accent hover:underline">See all invoices</Link>
      </p>
    </>
  );
}
