import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveStatus, invoiceTotal, nextInvoiceNumber } from "../src/lib/invoice";

test("invoiceTotal adds lines and rounds tax to the cent", () => {
  const t = invoiceTotal({ lines: [{ description: "Photos", quantity: 1, unitPrice: 29500 }, { description: "Drone", quantity: 2, unitPrice: 7500 }], taxRate: 0.0725 });
  assert.equal(t.subtotal, 44500);
  assert.equal(t.tax, 3226);
  assert.equal(t.total, 47726);
});

test("a sent invoice past its due date reads as overdue", () => {
  const now = new Date("2026-05-10T12:00:00Z");
  assert.equal(effectiveStatus({ status: "sent", dueAt: "2026-05-01T00:00:00Z" }, now), "overdue");
  assert.equal(effectiveStatus({ status: "sent", dueAt: "2026-05-20T00:00:00Z" }, now), "sent");
  assert.equal(effectiveStatus({ status: "paid", dueAt: "2026-05-01T00:00:00Z" }, now), "paid");
});

test("invoice numbers continue from the highest existing one", () => {
  assert.equal(nextInvoiceNumber([]), "INV-1001");
  assert.equal(nextInvoiceNumber(["INV-1003", "INV-1010", "INV-1002"]), "INV-1011");
});
