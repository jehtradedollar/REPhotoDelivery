import { eq } from "drizzle-orm";
import { ArrowLeft, Building2, Globe, Mail, Pencil, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyField } from "@/components/copy-field";
import { InvoiceTable } from "@/components/invoice-table";
import { PropertyCard } from "@/components/property-card";
import { SubmitButton } from "@/components/submit-button";
import { Avatar, Badge, buttonClass, ButtonLink, Card, CardHeader, EmptyState, Stat } from "@/components/ui";
import { db, schema as s } from "@/db";
import { resendInvite, setClientArchived } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { agentBranding } from "@/lib/branding";
import { getClient, getInvoices, invoiceTotal, projectRows } from "@/lib/data";
import { date, money, relative } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await getClient((await params).id))?.name ?? "Client" };
}

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string; inviteLink?: string }> }) {
  await requireOwner();
  const { id } = await params;
  const q = await searchParams;
  const c = await getClient(id);
  if (!c) notFound();
  const [rows, invoices, user, branding] = await Promise.all([
    projectRows({ clientId: c.id }),
    getInvoices({ clientId: c.id }),
    db.select().from(s.users).where(eq(s.users.clientId, c.id)).then((r) => r[0]),
    agentBranding(c),
  ]);
  const owed = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((t, i) => t + invoiceTotal(i).total, 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((t, i) => t + invoiceTotal(i).total, 0);
  const active = !!user?.passwordHash;

  return (
    <>
      <Link href="/studio/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      {q.created && (
        <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">{q.created === "invited" ? `Client added and an invite was emailed to ${c.email}.` : "Client added."}</p>
      )}
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Changes saved.</p>}
      {q.inviteLink && (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-sm">Invite emailed to {c.email}. You can also send them this link yourself; it works for 14 days.</p>
          <CopyField value={q.inviteLink} />
        </Card>
      )}
      {c.archived && <p className="mb-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">This client is archived and can&apos;t sign in.</p>}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {branding.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.photoUrl} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <Avatar name={c.name} hue={c.hue} size={56} />
          )}
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight">{c.name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
              {c.brokerage}
              {active ? (
                <Badge tone="ok" dot>
                  Portal active{user?.lastLoginAt ? ` · seen ${relative(user.lastLoginAt)}` : ""}
                </Badge>
              ) : (
                <Badge tone="warn" dot>
                  Invite pending
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/studio/clients/${c.id}/edit`} className={buttonClass("secondary")}>
            <Pencil /> Edit
          </Link>
          {!c.archived && (
            <form action={resendInvite.bind(null, c.id)}>
              <SubmitButton variant="ghost">{active ? "Send login link" : "Resend invite"}</SubmitButton>
            </form>
          )}
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
        <div className="space-y-6">
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
          {invoices.length > 0 && (
            <Card>
              <CardHeader title="Invoices" />
              <InvoiceTable invoices={invoices} hrefBase="/studio/invoices" showClient={false} />
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <div className="space-y-2.5 p-5 text-[14px]">
              <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 break-all text-ink-2 hover:text-ink">
                <Mail className="size-4 shrink-0 text-muted" /> {c.email}
              </a>
              <a href={`tel:${c.phone}`} className="flex items-center gap-2.5 text-ink-2 hover:text-ink">
                <Phone className="size-4 text-muted" /> {c.phone || "No phone"}
              </a>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 break-all text-ink-2 hover:text-ink">
                  <Globe className="size-4 shrink-0 text-muted" /> {c.website}
                </a>
              )}
              {c.notes && <p className="mt-3 rounded-lg bg-surface-2 p-3 text-[13px] whitespace-pre-line text-ink-2">{c.notes}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Branding" sub="Used on their property websites" />
            <div className="flex items-center gap-3 p-5 text-[14px]">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="" className="h-10 max-w-32 object-contain" />
              ) : (
                <Building2 className="size-5 text-muted" />
              )}
              <span className="text-ink-2">{branding.source === "agent" ? "Their own logo" : branding.source === "brokerage" ? `From ${branding.brokerageName}` : "No logo yet"}</span>
            </div>
          </Card>
          <Card className="p-5">
            <form action={setClientArchived.bind(null, c.id, !c.archived)}>
              <SubmitButton variant={c.archived ? "secondary" : "ghost"} size="sm">
                {c.archived ? "Restore client" : "Archive client"}
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-muted">{c.archived ? "Restoring lets them sign in again." : "Archived clients can't sign in. Their projects and invoices stay."}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
