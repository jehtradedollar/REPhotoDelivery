// Payments. The UI only talks to this interface.
// Today: MockPaymentProvider sends the client to an in-app fake checkout page.
// Later: StripePaymentProvider using Stripe Checkout Sessions + a webhook at
// /api/webhooks/stripe that calls markInvoicePaid() on checkout.session.completed.

export interface CheckoutRequest {
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: "usd";
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  /** Redirect the browser here. */
  url: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verify a webhook payload; returns the paid invoice id or null. */
  handleWebhook(rawBody: string, signature: string | null): Promise<{ invoiceId: string; paymentRef: string } | null>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession> {
    const id = `cs_mock_${Date.now()}`;
    const params = new URLSearchParams({ session: id, invoice: req.invoiceId, success: req.successUrl, cancel: req.cancelUrl });
    return { id, url: `/portal/checkout?${params.toString()}` };
  }

  async handleWebhook(): Promise<null> {
    return null;
  }
}

/*
 * Stripe sketch for later:
 *
 * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 * const session = await stripe.checkout.sessions.create({
 *   mode: "payment",
 *   customer_email: req.customerEmail,
 *   line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: req.amountCents,
 *     product_data: { name: `${req.invoiceNumber} · ${req.description}` } } }],
 *   metadata: { invoiceId: req.invoiceId },
 *   success_url: req.successUrl, cancel_url: req.cancelUrl,
 * });
 * return { id: session.id, url: session.url! };
 */
