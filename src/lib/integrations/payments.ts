import "server-only";

// Payments. Pages and actions only talk to this interface.
//   StripePaymentProvider when STRIPE_SECRET_KEY is set: hosted Stripe Checkout,
//                         confirmed by the webhook and by checking the session
//                         when the agent lands back on the property page.
//   MockPaymentProvider   otherwise: an in-app demo checkout page.

export interface CheckoutRequest {
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
  customerEmail: string;
  description: string;
  /** Absolute URLs. Stripe appends ?session_id=... to successUrl. */
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly name: "stripe" | "mock";
  createCheckoutSession(req: CheckoutRequest): Promise<{ id: string; url: string }>;
  /** Look up a finished checkout. Returns the invoice it paid, or null if unpaid. */
  getPaidSession(sessionId: string): Promise<{ invoiceId: string; paymentRef: string } | null>;
  /** Verify a webhook payload; returns the paid invoice or null. Throws on a bad signature. */
  handleWebhook(rawBody: string, signature: string | null): Promise<{ invoiceId: string; paymentRef: string } | null>;
}

/**
 * The demo checkout marks invoices paid without charging anything, so it only
 * runs in development or when DEMO_MODE=true. A production site without Stripe
 * keys tells agents to contact the studio instead.
 */
export function mockCheckoutAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;
  async createCheckoutSession(req: CheckoutRequest) {
    const id = `cs_mock_${Date.now()}`;
    const path = (u: string) => {
      const x = new URL(u);
      return x.pathname + x.search;
    };
    const q = new URLSearchParams({ session: id, invoice: req.invoiceId, success: path(req.successUrl), cancel: path(req.cancelUrl) });
    return { id, url: `/checkout/demo?${q}` };
  }
  async getPaidSession() {
    return null;
  }
  async handleWebhook() {
    return null;
  }
}

class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  private stripe = import("stripe").then(({ default: Stripe }) => new Stripe(process.env.STRIPE_SECRET_KEY!));

  async createCheckoutSession(req: CheckoutRequest) {
    const stripe = await this.stripe;
    const success = new URL(req.successUrl);
    success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: req.amountCents,
            product_data: { name: `${req.invoiceNumber} · ${req.description}` },
          },
        },
      ],
      metadata: { invoiceId: req.invoiceId },
      payment_intent_data: { metadata: { invoiceId: req.invoiceId } },
      // Stripe would encode the braces; keep them literal so Stripe substitutes the id.
      success_url: success.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
      cancel_url: req.cancelUrl,
    });
    return { id: session.id, url: session.url! };
  }

  async getPaidSession(sessionId: string) {
    const stripe = await this.stripe;
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== "paid" || !s.metadata?.invoiceId) return null;
    return { invoiceId: s.metadata.invoiceId, paymentRef: String(s.payment_intent ?? s.id) };
  }

  async handleWebhook(rawBody: string, signature: string | null) {
    const stripe = await this.stripe;
    const event = stripe.webhooks.constructEvent(rawBody, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const s = event.data.object;
      if (s.payment_status === "paid" && s.metadata?.invoiceId) return { invoiceId: s.metadata.invoiceId, paymentRef: String(s.payment_intent ?? s.id) };
    }
    return null;
  }
}

export function createPayments(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) console.warn("STRIPE_WEBHOOK_SECRET is not set; payments only confirm when the agent returns from checkout.");
    return new StripePaymentProvider();
  }
  return new MockPaymentProvider();
}
