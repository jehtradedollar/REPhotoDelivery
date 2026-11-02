import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getInvoice } from "@/lib/data";
import { payments } from "@/lib/integrations";

// Stripe calls this after checkout. The provider verifies the signature and
// tells us which invoice was paid; we mark it paid, which unlocks downloads.
export async function POST(req: NextRequest) {
  const result = await payments.handleWebhook(await req.text(), req.headers.get("stripe-signature"));
  if (result) {
    const inv = getInvoice(result.invoiceId);
    if (inv && inv.status !== "paid") {
      inv.status = "paid";
      inv.paidAt = new Date().toISOString();
      inv.paymentRef = result.paymentRef;
      revalidatePath("/", "layout");
    }
  }
  return NextResponse.json({ received: true });
}
