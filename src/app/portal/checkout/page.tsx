import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Input } from "@/components/ui";
import { completeMockCheckout } from "@/lib/actions";
import { requireClient } from "@/lib/auth";
import { getInvoice, getProject, invoiceTotal } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };

// Demo-only stand-in for the hosted Stripe Checkout page. When Stripe is
// connected, startCheckout() redirects to Stripe instead and this page is unused.
export default async function MockCheckout({ searchParams }: { searchParams: Promise<{ invoice?: string; session?: string; success?: string; cancel?: string }> }) {
  const s = await requireClient();
  const q = await searchParams;
  const inv = getInvoice(q.invoice);
  if (!inv || inv.clientId !== s.clientId) notFound();
  const p = getProject(inv.projectId);
  const total = invoiceTotal(inv).total;

  return (
    <div className="mx-auto max-w-md">
      <Link href={q.cancel || "/portal"} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Cancel
      </Link>
      <div className="mb-4 rounded-xl border border-dashed border-warn/50 bg-warn-soft px-4 py-3 text-[13px] text-warn">
        Demo checkout. No card is charged. This screen is replaced by Stripe Checkout once payments are connected.
      </div>
      <Card className="p-5 sm:p-6">
        <div className="text-[13px] text-muted">{inv.number} · {p?.address}</div>
        <div className="tabular mt-1 font-display text-[36px] font-medium tracking-tight">{money(total)}</div>
        <form action={completeMockCheckout} className="mt-6 space-y-4">
          <input type="hidden" name="invoice" value={inv.id} />
          <input type="hidden" name="session" value={q.session ?? ""} />
          <input type="hidden" name="success" value={q.success ?? ""} />
          <Field label="Email">
            <Input defaultValue={s.email} readOnly />
          </Field>
          <Field label="Card number">
            <Input defaultValue="4242 4242 4242 4242" inputMode="numeric" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry">
              <Input defaultValue="12 / 29" />
            </Field>
            <Field label="CVC">
              <Input defaultValue="123" />
            </Field>
          </div>
          <SubmitButton size="lg" className="w-full">
            <Lock /> Pay {money(total)}
          </SubmitButton>
        </form>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="size-3.5" /> Downloads unlock as soon as payment clears.
        </p>
      </Card>
    </div>
  );
}
