import { invoiceTotal } from "@/lib/data";
import { money } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export function InvoiceLines({ invoice }: { invoice: Invoice }) {
  const { subtotal, tax, total } = invoiceTotal(invoice);
  return (
    <div className="text-[14px]">
      <ul className="divide-y divide-line">
        {invoice.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-4 py-2.5">
            <span className="text-ink-2">
              {l.description}
              {l.quantity > 1 && <span className="text-muted"> × {l.quantity}</span>}
            </span>
            <span className="tabular">{money(l.quantity * l.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 space-y-1 border-t border-line pt-3">
        {tax > 0 && (
          <>
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="tabular">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Tax ({(invoice.taxRate * 100).toFixed(2)}%)</span>
              <span className="tabular">{money(tax)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-[15px] font-semibold">
          <span>Total</span>
          <span className="tabular">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
