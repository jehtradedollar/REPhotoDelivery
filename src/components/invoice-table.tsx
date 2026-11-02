import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getClient, getProject, invoiceTotal } from "@/lib/data";
import { date, money } from "@/lib/format";
import type { Invoice } from "@/lib/types";
import { InvoiceStatusBadge } from "./ui";

export function InvoiceTable({ invoices, hrefBase, showClient = true }: { invoices: Invoice[]; hrefBase: string; showClient?: boolean }) {
  return (
    <>
      <div className="hidden grid-cols-[0.9fr_2fr_1.2fr_1fr_1fr_1fr_20px] gap-4 border-b border-line px-5 py-2.5 text-[12px] font-medium text-muted md:grid">
        <span>Invoice</span>
        <span>Property</span>
        <span>{showClient ? "Client" : ""}</span>
        <span>Due</span>
        <span>Status</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {invoices.map((i) => {
          const p = getProject(i.projectId);
          return (
            <li key={i.id}>
              <Link href={`${hrefBase}/${i.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-surface-2 md:grid-cols-[0.9fr_2fr_1.2fr_1fr_1fr_1fr_20px]">
                <span className="text-[14px] font-semibold">{i.number}</span>
                <span className="col-start-1 row-start-2 truncate text-[13px] text-ink-2 md:col-start-auto md:row-start-auto md:text-[14px]">{p?.address}</span>
                <span className="hidden truncate text-[14px] text-ink-2 md:block">{showClient ? getClient(i.clientId)?.name : ""}</span>
                <span className="hidden text-[14px] text-ink-2 md:block">{date(i.dueAt, { month: "short", day: "numeric" })}</span>
                <span className="col-start-2 row-start-2 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start">
                  <InvoiceStatusBadge status={i.status} />
                </span>
                <span className="tabular col-start-2 row-start-1 text-right text-[14px] font-medium md:col-start-auto md:row-start-auto">{money(invoiceTotal(i).total)}</span>
                <ChevronRight className="hidden size-4 text-muted md:block" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
