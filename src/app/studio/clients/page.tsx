import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { getClients, getInvoices, getProjects, invoiceTotal } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireOwner();
  const { q = "" } = await searchParams;
  const rows = getClients()
    .filter((c) => !q || `${c.name} ${c.email} ${c.brokerage}`.toLowerCase().includes(q.toLowerCase()))
    .map((c) => {
      const projects = getProjects({ clientId: c.id });
      const invoices = getInvoices({ clientId: c.id });
      return {
        c,
        projects: projects.length,
        active: projects.filter((p) => p.status === "scheduled" || p.status === "editing").length,
        owed: invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + invoiceTotal(i).total, 0),
        lifetime: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i).total, 0),
      };
    });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Agents and teams who book with you."
        actions={
          <ButtonLink href="/studio/clients/new">
            <UserPlus /> Add client
          </ButtonLink>
        }
      />
      <form className="relative mb-5 md:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Search name, email or brokerage" className="field pl-9" />
      </form>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title="No clients found" />
        ) : (
          <>
            <div className="hidden grid-cols-[2fr_1.6fr_0.8fr_1fr_1fr_24px] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-muted md:grid">
              <span>Client</span>
              <span>Contact</span>
              <span className="text-right">Projects</span>
              <span className="text-right">Outstanding</span>
              <span className="text-right">Lifetime paid</span>
              <span />
            </div>
            <ul className="divide-y divide-line">
              {rows.map(({ c, projects, active, owed, lifetime }) => (
                <li key={c.id}>
                  <Link href={`/studio/clients/${c.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2 md:grid-cols-[2fr_1.6fr_0.8fr_1fr_1fr_24px]">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={c.name} hue={c.hue} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">{c.name}</span>
                        <span className="block truncate text-[13px] text-muted">{c.brokerage}</span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 text-[13px] md:block">
                      <span className="block truncate text-ink-2">{c.email}</span>
                      <span className="block text-muted">{c.phone}</span>
                    </span>
                    <span className="tabular hidden text-right text-[14px] md:block">
                      {projects}
                      {active > 0 && <span className="block text-[12px] text-muted">{active} active</span>}
                    </span>
                    <span className={`tabular hidden text-right text-[14px] md:block ${owed ? "font-semibold" : "text-muted"}`}>{owed ? money(owed) : "None"}</span>
                    <span className="tabular hidden text-right text-[14px] text-ink-2 md:block">{money(lifetime)}</span>
                    <span className="flex items-center gap-2 md:block">
                      <span className="tabular text-right text-[12px] text-muted md:hidden">{projects} projects</span>
                      <ChevronRight className="size-4 text-muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
