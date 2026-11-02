import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema as s } from "@/db";
import { getClient, getInvoice, getProject, logActivity } from "./data";
import { money } from "./format";
import { payments } from "./integrations";
import { invoiceTotal } from "./invoice";
import { notifyPaid } from "./notify";
import { startStagingForInvoice } from "./staging";

/** Mark an invoice paid once (safe to call from the webhook and the return page). */
export async function markInvoicePaid(invoiceId: string, paymentRef: string, opts: { revalidate?: boolean } = {}) {
  const updated = await db
    .update(s.invoices)
    .set({ status: "paid", paidAt: new Date().toISOString(), paymentRef })
    .where(and(eq(s.invoices.id, invoiceId), ne(s.invoices.status, "paid")))
    .returning();
  if (!updated.length) return false;
  const inv = (await getInvoice(invoiceId))!;
  const [project, client] = await Promise.all([getProject(inv.projectId), getClient(inv.clientId)]);
  await logActivity("payment", `Payment received for ${inv.number} (${money(invoiceTotal(inv).total)})`, { projectId: inv.projectId, clientId: inv.clientId });
  const staged = (await db.select({ id: s.stagingRequests.id }).from(s.stagingRequests).where(eq(s.stagingRequests.invoiceId, invoiceId)).limit(1)).length > 0;
  if (staged) await startStagingForInvoice(invoiceId);
  else if (project && client && paymentRef !== "manual") await notifyPaid(client, project, inv);
  // Pages rendering this call (the Stripe return) can't revalidate mid-render.
  if (opts.revalidate !== false) revalidatePath("/", "layout");
  return true;
}

/**
 * When the agent lands back from Stripe with ?session_id, confirm the payment
 * right away instead of waiting for the webhook. Safe to call from a page.
 */
export async function confirmCheckoutReturn(sessionId: string | undefined, projectId: string) {
  if (!sessionId || payments.name !== "stripe") return false;
  try {
    const paid = await payments.getPaidSession(sessionId);
    if (paid && (await getInvoice(paid.invoiceId))?.projectId === projectId) {
      await markInvoicePaid(paid.invoiceId, paid.paymentRef, { revalidate: false });
      return true;
    }
  } catch (e) {
    console.error("Could not confirm Stripe session", e);
  }
  return false;
}
