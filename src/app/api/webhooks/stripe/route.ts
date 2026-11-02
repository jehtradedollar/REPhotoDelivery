import { NextResponse, type NextRequest } from "next/server";
import { markInvoicePaid } from "@/lib/billing";
import { payments } from "@/lib/integrations";

export const runtime = "nodejs";

// Point a Stripe webhook (checkout.session.completed and
// checkout.session.async_payment_succeeded) at /api/webhooks/stripe.
export async function POST(req: NextRequest) {
  let result;
  try {
    result = await payments.handleWebhook(await req.text(), req.headers.get("stripe-signature"));
  } catch (e) {
    console.error("Stripe webhook rejected", e);
    return new NextResponse("Invalid signature", { status: 400 });
  }
  if (result) await markInvoicePaid(result.invoiceId, result.paymentRef);
  return NextResponse.json({ received: true });
}
