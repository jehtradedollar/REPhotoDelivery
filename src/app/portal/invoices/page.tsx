import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import { InvoiceTable } from "@/components/invoice-table";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth";
import { getInvoices } from "@/lib/data";

export const metadata: Metadata = { title: "Invoices" };

export default async function PortalInvoices() {
  const s = await requireClient();
  const list = getInvoices({ clientId: s.clientId }).filter((i) => i.status !== "draft");
  return (
    <>
      <PageHeader title="Invoices" description="Receipts and open balances for each property." />
      <Card>{list.length ? <InvoiceTable invoices={list} hrefBase="/portal/invoices" showClient={false} /> : <EmptyState icon={<Receipt />} title="No invoices yet" />}</Card>
    </>
  );
}
