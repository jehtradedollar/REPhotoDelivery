import "server-only";
import { createCalendar } from "./calendar";
import { createMailer } from "./mail";
import { createPayments } from "./payments";
import { createSms } from "./sms";
import { createStaging } from "./staging";
import { createStorage } from "./storage";

// One place that picks each provider from environment variables.
export const storage = createStorage();
export const payments = createPayments();
export const calendar = createCalendar();
export const mailer = createMailer();
export const sms = createSms();
export const staging = createStaging();

export async function integrationStatus() {
  const connected = await calendar.isConnected();
  return [
    {
      key: "storage",
      label: "Amazon S3",
      detail: storage.name === "s3" ? `Bucket ${process.env.AWS_S3_BUCKET}` : "Using local disk. Set STORAGE_PROVIDER=s3 to store media in S3.",
      state: storage.name === "s3" ? "connected" : "local",
    },
    {
      key: "payments",
      label: "Stripe",
      detail: payments.name === "stripe" ? (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "Test mode" : "Live mode") : "Demo checkout. Add STRIPE_SECRET_KEY to take real payments.",
      state: payments.name === "stripe" ? "connected" : "demo",
    },
    {
      key: "calendar",
      label: "Google Calendar",
      detail: !calendar.configured
        ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable."
        : connected
          ? `Connected${(await calendar.connectedAccount()) ? ` as ${await calendar.connectedAccount()}` : ""}`
          : "Ready to connect.",
      state: !calendar.configured ? "off" : connected ? "connected" : "ready",
    },
    {
      key: "mail",
      label: "Email",
      detail: mailer.name === "smtp" ? "Sending through SMTP" : "Printing emails to the server log. Set SMTP_URL to send.",
      state: mailer.name === "smtp" ? "connected" : "demo",
    },
    {
      key: "sms",
      label: "Text messages (Twilio)",
      detail: sms.name === "twilio" ? "Sending through Twilio" : "Printing texts to the server log. Add Twilio keys to send.",
      state: sms.name === "twilio" ? "connected" : "demo",
    },
    {
      key: "staging",
      label: "Virtual staging AI",
      detail: staging.name === "http" ? `Sending to ${new URL(process.env.VIRTUAL_STAGING_API_URL!).host}` : "No API yet. Paid requests queue on the project page for you to fulfil.",
      state: staging.name === "http" ? "connected" : "demo",
    },
  ] as const;
}
