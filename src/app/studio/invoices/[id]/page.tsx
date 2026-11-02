import { ArrowLeft, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { InvoiceDocument } from "@/components/invoice-document";
import { InvoiceEditor } from "@/components/invoice-editor";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, CardHeader } from "@/components/ui";
import { markInvoicePaidManually, sendInvoice, voidInvoice } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getClient, getInvoice, getProject } from "@/lib/data";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string }> }) {
  await requireOwner();
  const q = await searchParams;
  const inv = await getInvoice((await params).id);
  if (!inv) notFound();
  const [project, client] = await Promise.all([getProject(inv.projectId), getClient(inv.clientId)]);
  const editable = inv.status !== "paid" && inv.status !== "void";
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
            <>
              <form action={sendInvoice.bind(null, inv.id)}>
                <SubmitButton size="sm" variant="ghost">
                  Resend
                </SubmitButton>
              </form>
              <form action={markInvoicePaidManually.bind(null, inv.id)}>
                <SubmitButton size="sm" variant="secondary">
                  Mark paid
                </SubmitButton>
              </form>
            </>
          )}
          {editable && (
            <ConfirmButton action={voidInvoice.bind(null, inv.id)} message="Void this invoice? The agent's downloads unlock without payment." size="sm" variant="ghost">
              Void
            </ConfirmButton>
          )}
        </div>
      </div>
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Invoice saved.</p>}
      {q.sent && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Invoice emailed to {client?.email}.</p>}
      {editable && (
        <Card className="mb-6">
          <CardHeader title="Edit invoice" sub="Changes show on the agent's invoice right away" />
          <div className="p-5">
            <InvoiceEditor invoiceId={inv.id} lines={inv.lines} taxRate={inv.taxRate} dueAt={inv.dueAt} />
          </div>
        </Card>
      )}
      <InvoiceDocument invoice={inv} client={client} project={project} />
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Printer className="size-3.5" /> Use your browser&apos;s print to save as PDF. Payment reference: {inv.paymentRef ?? "not paid yet"}
      </p>
    </div>
  );
}
