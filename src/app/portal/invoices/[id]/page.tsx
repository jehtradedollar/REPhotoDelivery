import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { startCheckout } from "@/lib/actions";
import { requireClient } from "@/lib/auth";
import { getClient, getInvoice, getProject, invoiceTotal } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Invoice" };

export default async function PortalInvoice({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireClient();
  const inv = await getInvoice((await params).id);
  if (!inv || inv.clientId !== s.clientId || inv.status === "draft") notFound();
  const [client, project] = await Promise.all([getClient(inv.clientId), getProject(inv.projectId)]);
  const open = inv.status === "sent" || inv.status === "overdue";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/portal/invoices" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Invoices
        </Link>
        <div className="flex gap-2">
          <Link href={`/portal/properties/${inv.projectId}`} className={buttonClass("ghost", "sm")}>
            View property
          </Link>
          {open && (
            <form action={startCheckout.bind(null, inv.id, undefined)}>
              <SubmitButton size="sm">Pay {money(invoiceTotal(inv).total)}</SubmitButton>
            </form>
          )}
        </div>
      </div>
      <InvoiceDocument invoice={inv} client={client} project={project} />
    </div>
  );
}
