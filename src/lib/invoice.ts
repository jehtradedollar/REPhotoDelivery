import type { Invoice } from "./types";

export function invoiceTotal(inv: Pick<Invoice, "lines" | "taxRate">) {
  const subtotal = inv.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0);
  const tax = Math.round(subtotal * inv.taxRate);
  return { subtotal, tax, total: subtotal + tax };
}

/** A sent invoice past its due date reads as overdue. */
export function effectiveStatus(inv: Pick<Invoice, "status" | "dueAt">, now = new Date()): Invoice["status"] {
  return inv.status === "sent" && new Date(inv.dueAt) < now ? "overdue" : inv.status;
}

export const isOpen = (inv: Pick<Invoice, "status">) => inv.status === "sent" || inv.status === "overdue";

/** INV-1041 -> INV-1042. Starts at INV-1001. */
export function nextInvoiceNumber(existing: string[]) {
  const max = existing.reduce((m, n) => Math.max(m, Number(n.replace(/\D/g, "")) || 0), 1000);
  return `INV-${max + 1}`;
}
