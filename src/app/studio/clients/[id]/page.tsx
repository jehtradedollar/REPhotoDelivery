import { ArrowLeft, Mail, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/property-card";
import { Avatar, ButtonLink, Card, CardHeader, EmptyState, InvoiceStatusBadge, Stat } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { getClient, getInvoices, getProject, invoiceTotal, projectRows } from "@/lib/data";
import { date, money } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: getClient((await params).id)?.name ?? "Client" };
}

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireOwner();
  const { id } = await params;
  const { created } = await searchParams;
  const c = getClient(id);
  if (!c) notFound();
  const rows = projectRows({ clientId: c.id });
  const invoices = getInvoices({ clientId: c.id });
  const owed = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + invoiceTotal(i).total, 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i).total, 0);

  return (
    <>
      <Link href="/studio/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      {created && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Client added. A portal invite will go out once email is connected.</p>}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={c.name} hue={c.hue} size={56} />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight">{c.name}</h1>
            <p className="text-[14px] text-ink-2">{c.brokerage}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`mailto:${c.email}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2">
            <Mail className="size-4" /> Email
          </a>
          <ButtonLink href="/studio/projects/new">
            <Plus /> New shoot
          </ButtonLink>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Projects" value={rows.length} />
        <Stat label="Outstanding" value={money(owed)} />
        <Stat label="Lifetime paid" value={money(paid)} />
        <Stat label="Client since" value={<span className="text-[22px]">{date(c.createdAt, { month: "short", year: "numeric" })}</span>} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">Properties</h2>
          {rows.length === 0 ? (
            <Card>
              <EmptyState title="No projects yet" action={<ButtonLink href="/studio/projects/new" size="sm">Schedule their first shoot</ButtonLink>} />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <PropertyCard key={r.project.id} row={r} showClient={false} href={`/studio/projects/${r.project.id}`} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <div className="space-y-2.5 p-5 text-[14px]">
              <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                <Mail className="size-4 text-muted" /> {c.email}
              </a>
              <a href={`tel:${c.phone}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                <Phone className="size-4 text-muted" /> {c.phone || "No phone"}
              </a>
              {c.notes && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-[13px] text-ink-2">{c.notes}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Invoices" />
            {invoices.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((i) => (
                  <li key={i.id}>
                    <Link href={`/studio/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium">{i.number}</span>
                        <span className="block truncate text-[12px] text-muted">{getProject(i.projectId)?.address}</span>
                      </span>
                      <span className="text-right">
                        <span className="tabular block text-[14px]">{money(invoiceTotal(i).total)}</span>
                        <InvoiceStatusBadge status={i.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
