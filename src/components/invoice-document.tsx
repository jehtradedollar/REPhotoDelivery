import { brand } from "@/lib/brand";
import { fullAddress, date } from "@/lib/format";
import type { Client, Invoice, Project } from "@/lib/types";
import { InvoiceLines } from "./invoice-lines";
import { Card, InvoiceStatusBadge } from "./ui";

export function InvoiceDocument({ invoice, client, project }: { invoice: Invoice; client?: Client; project?: Project }) {
  return (
    <Card className="p-6 sm:p-10">
      <div className="flex flex-col justify-between gap-6 sm:flex-row">
        <div>
          <div className="font-display text-2xl font-medium tracking-tight">{brand.name}</div>
          <div className="mt-1 text-[13px] text-muted">
            {brand.email}
            <br />
            {brand.phone}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-[12px] font-semibold tracking-wider text-muted uppercase">Invoice</div>
          <div className="font-display text-2xl font-medium">{invoice.number}</div>
          <div className="mt-1.5">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-6 border-y border-line py-6 text-[14px] sm:grid-cols-3">
        <div>
          <div className="mb-1 text-[12px] font-medium text-muted">Billed to</div>
          <div className="font-medium">{client?.name}</div>
          <div className="text-ink-2">{client?.brokerage}</div>
          <div className="text-ink-2">{client?.email}</div>
        </div>
        <div>
          <div className="mb-1 text-[12px] font-medium text-muted">Property</div>
          <div className="text-ink-2">{project && fullAddress(project)}</div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 sm:justify-start">
            <span className="w-16 text-[12px] font-medium text-muted">Issued</span>
            <span>{date(invoice.issuedAt)}</span>
          </div>
          <div className="flex justify-between gap-4 sm:justify-start">
            <span className="w-16 text-[12px] font-medium text-muted">Due</span>
            <span>{date(invoice.dueAt)}</span>
          </div>
          {invoice.paidAt && (
            <div className="flex justify-between gap-4 sm:justify-start">
              <span className="w-16 text-[12px] font-medium text-muted">Paid</span>
              <span>{date(invoice.paidAt)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6">
        <InvoiceLines invoice={invoice} />
      </div>
    </Card>
  );
}
