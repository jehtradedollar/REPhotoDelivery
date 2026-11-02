import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceTable } from "@/components/invoice-table";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getInvoices, invoiceTotal } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Invoices" };

const filters = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
  { key: "draft", label: "Drafts" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await requireOwner();
  const { f = "all" } = await searchParams;
  const all = await getInvoices();
  const sum = (xs: typeof all) => xs.reduce((s, i) => s + invoiceTotal(i).total, 0);
  const open = all.filter((i) => i.status === "sent" || i.status === "overdue");
  const list = all.filter((i) => (f === "all" ? true : f === "open" ? open.includes(i) : i.status === f));

  return (
    <>
      <PageHeader title="Invoices" description="One invoice per project. Agents pay online to unlock downloads." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat label="Open" value={money(sum(open))} sub={`${open.length} invoices`} />
        <Stat label="Overdue" value={money(sum(all.filter((i) => i.status === "overdue")))} sub={`${all.filter((i) => i.status === "overdue").length} invoices`} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="Collected" value={money(sum(all.filter((i) => i.status === "paid")))} sub="All time, via Stripe and manual" />
        </div>
      </div>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {filters.map((x) => (
          <Link
            key={x.key}
            href={x.key === "all" ? "?" : `?f=${x.key}`}
            className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap", f === x.key ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-strong")}
          >
            {x.label}
          </Link>
        ))}
      </div>
      <Card>{list.length ? <InvoiceTable invoices={list} hrefBase="/studio/invoices" /> : <EmptyState icon={<Receipt />} title="No invoices here" />}</Card>
    </>
  );
}
