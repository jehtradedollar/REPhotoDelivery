"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { updateInvoice } from "@/lib/actions";
import type { InvoiceLine } from "@/lib/types";
import { SubmitButton } from "./submit-button";
import { Field, Input } from "./ui";

type Row = { key: number; description: string; quantity: string; unitPrice: string };

/** Edit an unpaid invoice's lines, tax rate and due date. Amounts are typed in dollars. */
export function InvoiceEditor({ invoiceId, lines, taxRate, dueAt }: { invoiceId: string; lines: InvoiceLine[]; taxRate: number; dueAt: string }) {
  const [rows, setRows] = useState<Row[]>(() =>
    (lines.length ? lines : [{ description: "", quantity: 1, unitPrice: 0 }]).map((l, i) => ({ key: i, description: l.description, quantity: String(l.quantity), unitPrice: (l.unitPrice / 100).toFixed(2) })),
  );
  const [next, setNext] = useState(rows.length);
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const subtotal = rows.reduce((t, r) => t + (Number(r.quantity) || 0) * (Number(r.unitPrice.replace(/[$,]/g, "")) || 0), 0);

  return (
    <form action={updateInvoice.bind(null, invoiceId)} className="space-y-4">
      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_70px_110px_36px] gap-2 text-[12px] font-medium text-muted sm:grid">
          <span>Description</span>
          <span>Qty</span>
          <span>Price ($)</span>
          <span />
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_70px_110px_36px] gap-2">
            <Input name="description" value={r.description} onChange={(e) => set(r.key, { description: e.target.value })} placeholder="Line item" aria-label="Description" className="col-span-4 sm:col-span-1" />
            <Input name="quantity" value={r.quantity} onChange={(e) => set(r.key, { quantity: e.target.value })} inputMode="decimal" aria-label="Quantity" className="col-start-1 sm:col-start-auto" />
            <Input name="unitPrice" value={r.unitPrice} onChange={(e) => set(r.key, { unitPrice: e.target.value })} inputMode="decimal" aria-label="Unit price" />
            <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="grid place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad" aria-label="Remove line">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setRows((rs) => [...rs, { key: next, description: "", quantity: "1", unitPrice: "0.00" }]);
            setNext(next + 1);
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
        >
          <Plus className="size-4" /> Add line
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tax rate (%)">
          <Input name="taxRate" defaultValue={String(+(taxRate * 100).toFixed(3))} inputMode="decimal" />
        </Field>
        <Field label="Due date">
          <Input name="dueAt" type="date" defaultValue={dueAt.slice(0, 10)} />
        </Field>
        <div className="flex items-end justify-between gap-3 sm:justify-end">
          <span className="text-[13px] text-muted">Subtotal ${subtotal.toFixed(2)}</span>
          <SubmitButton>Save</SubmitButton>
        </div>
      </div>
    </form>
  );
}
