import { ArrowLeft, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { markInvoicePaidManually, sendInvoice } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getClient, getInvoice, getProject } from "@/lib/data";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const inv = getInvoice((await params).id);
  if (!inv) notFound();
  const project = getProject(inv.projectId);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/studio/invoices" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/studio/projects/${inv.projectId}`} className={buttonClass("ghost", "sm")}>
            Open project
          </Link>
          {inv.status === "draft" && (
            <form action={sendInvoice.bind(null, inv.id)}>
              <SubmitButton size="sm">Send to agent</SubmitButton>
            </form>
          )}
          {(inv.status === "sent" || inv.status === "overdue") && (
            <form action={markInvoicePaidManually.bind(null, inv.id)}>
              <SubmitButton size="sm" variant="secondary">
                Mark paid
              </SubmitButton>
            </form>
          )}
        </div>
      </div>
      <InvoiceDocument invoice={inv} client={getClient(inv.clientId)} project={project} />
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Printer className="size-3.5" /> Use your browser&apos;s print to save as PDF. Payment reference: {inv.paymentRef ?? "not paid yet"}
      </p>
    </div>
  );
}
