import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { brand } from "./brand";
import { fullAddress, money } from "./format";
import { mailer, sms } from "./integrations";
import { toE164 } from "./integrations/sms";
import { fill, getTemplates } from "./templates";
import { invoiceTotal } from "./invoice";
import { appUrl } from "./url";
import type { Client, Invoice, Project, Shoot } from "./types";

// Every email the app sends lives here, so wording stays consistent.

const when = (shoot: Pick<Shoot, "start">) =>
  new Date(shoot.start).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: process.env.STUDIO_TIMEZONE || undefined });

async function ownerEmails() {
  return (await db.select({ email: s.users.email }).from(s.users).where(eq(s.users.role, "owner"))).map((r) => r.email);
}
const first = (name: string) => name.split(" ")[0];

export async function sendInvite(client: Pick<Client, "name" | "email">, token: string) {
  await mailer.send({
    to: client.email,
    subject: `Your ${brand.name} client portal`,
    lines: [`Hi ${first(client.name)},`, `${brand.name} set up a portal for you. Use it to book shoots, see media for each listing, pay invoices and download your files.`, "Choose a password to get started. This link works for 14 days."],
    action: { label: "Set up my account", url: appUrl(`/invite/${token}`) },
  });
}

export async function sendPasswordReset(user: { name: string; email: string }, token: string) {
  await mailer.send({
    to: user.email,
    subject: "Reset your password",
    lines: [`Hi ${first(user.name)},`, "Someone asked to reset the password for this account. If that was you, use the button below within 2 hours. If not, you can ignore this email."],
    action: { label: "Choose a new password", url: appUrl(`/reset/${token}`) },
  });
}

export async function notifyBookingRequested(client: Client, project: Project, shoot: Shoot) {
  for (const to of await ownerEmails()) {
    await mailer.send({
      to,
      subject: `Booking request: ${project.address}`,
      lines: [`${client.name} (${client.brokerage || client.email}) requested a shoot.`, `${fullAddress(project)}`, `Requested time: ${when(shoot)}`],
      action: { label: "Review and confirm", url: appUrl(`/studio/projects/${project.id}`) },
    });
  }
}

export async function notifyShootConfirmed(client: Client, project: Project, shoot: Shoot) {
  await mailer.send({
    to: client.email,
    subject: `Shoot confirmed: ${project.address}`,
    lines: [`Hi ${first(client.name)},`, `Your shoot at ${fullAddress(project)} is confirmed for ${when(shoot)}.`, "Please have the home ready to photograph and leave any access details in the portal."],
    action: { label: "View booking", url: appUrl(`/portal/properties/${project.id}`) },
  });
}

export async function notifyShootChanged(client: Client, project: Project, shoot: Shoot, change: "rescheduled" | "cancelled") {
  await mailer.send({
    to: client.email,
    subject: `Shoot ${change}: ${project.address}`,
    lines:
      change === "rescheduled"
        ? [`Hi ${first(client.name)},`, `Your shoot at ${project.address} has moved to ${when(shoot)}.`]
        : [`Hi ${first(client.name)},`, `Your shoot at ${project.address} on ${when(shoot)} has been cancelled. Reply to this email if that's unexpected.`],
    action: { label: "View in portal", url: appUrl(`/portal/properties/${project.id}`) },
  });
}

/** Delivery email and text, from the owner's editable templates. Returns what was sent. */
export async function notifyDelivered(client: Client, project: Project, invoice: Invoice | undefined, count: number) {
  const t = await getTemplates();
  const unpaid = !!invoice && invoice.status !== "paid" && invoice.status !== "void";
  const portalLink = appUrl(`/portal/properties/${project.id}`);
  const link = project.deliveryToken ? appUrl(`/d/${project.deliveryToken}`) : portalLink;
  const vars = {
    agent_first_name: first(client.name),
    agent_name: client.name,
    address: project.address,
    file_count: String(count),
    amount: invoice ? money(invoiceTotal(invoice).total) : "",
    invoice_number: invoice?.number ?? "",
    link,
    portal_link: portalLink,
    site_link: project.siteSlug ? appUrl(`/p/${project.siteSlug}`) : link,
    studio_name: brand.name,
  };
  const body = fill(t.emailBody, vars).split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (unpaid) body.push(fill(t.emailUnpaidLine, vars));
  await mailer.send({ to: client.email, subject: fill(t.emailSubject, vars), lines: body, action: { label: unpaid ? "View and pay" : "View and download", url: link } });

  let texted = false;
  const phone = toE164(client.phone);
  if (t.sendSms && phone) texted = await sms.send(phone, fill(t.sms, vars));
  return { emailed: true, texted };
}

export async function notifyInvoiceSent(client: Client, project: Project, invoice: Invoice) {
  await mailer.send({
    to: client.email,
    subject: `Invoice ${invoice.number} for ${project.address}`,
    lines: [`Hi ${first(client.name)},`, `Invoice ${invoice.number} for ${project.address} is ${money(invoiceTotal(invoice).total)}, due ${new Date(invoice.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`],
    action: { label: "View and pay", url: appUrl(project.deliveryToken ? `/d/${project.deliveryToken}` : `/portal/invoices/${invoice.id}`) },
  });
}

export async function notifyPaid(client: Client, project: Project, invoice: Invoice) {
  const amount = money(invoiceTotal(invoice).total);
  await mailer.send({
    to: client.email,
    subject: `Receipt for ${invoice.number}`,
    lines: [`Hi ${first(client.name)},`, `Thanks, we received ${amount} for ${project.address}. Your downloads are unlocked.`],
    action: { label: "Download your media", url: appUrl(project.deliveryToken ? `/d/${project.deliveryToken}` : `/portal/properties/${project.id}`) },
  });
  for (const to of await ownerEmails()) {
    await mailer.send({ to, subject: `Paid: ${invoice.number} (${amount})`, lines: [`${client.name} paid ${amount} for ${project.address}.`], action: { label: "Open project", url: appUrl(`/studio/projects/${project.id}`) } });
  }
}
