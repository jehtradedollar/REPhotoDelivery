import "server-only";
import { getSetting, setSetting } from "./settings";

// Editable message templates. Placeholders in {curly_braces} are filled in when sent.
export const PLACEHOLDERS = {
  agent_first_name: "Agent's first name",
  agent_name: "Agent's full name",
  address: "Property street address",
  file_count: "Number of files delivered",
  amount: "Invoice total, e.g. $395.00",
  invoice_number: "Invoice number",
  link: "Link to the stand-alone delivery page (no sign-in needed)",
  portal_link: "Link to the property in their portal",
  site_link: "Link to the branded property website",
  studio_name: "Your studio name",
} as const;

export type TemplateVars = Partial<Record<keyof typeof PLACEHOLDERS, string>>;

export interface DeliveryTemplates {
  emailSubject: string;
  emailBody: string;
  /** Used when the invoice is still unpaid. */
  emailUnpaidLine: string;
  sms: string;
  sendSms: boolean;
}

export const DEFAULT_TEMPLATES: DeliveryTemplates = {
  emailSubject: "Your media is ready: {address}",
  emailBody: "Hi {agent_first_name},\n\nYour photos and media for {address} are ready. {file_count} files are ready to view and download at the link below, along with a property website you can share.\n\nThanks for booking with {studio_name}!",
  emailUnpaidLine: "You can preview everything now. Pay invoice {invoice_number} ({amount}) to download the full-resolution files.",
  sms: "{studio_name}: Media for {address} is ready! View and download: {link}",
  sendSms: true,
};

export async function getTemplates(): Promise<DeliveryTemplates> {
  return { ...DEFAULT_TEMPLATES, ...((await getSetting<Partial<DeliveryTemplates>>("delivery_templates")) ?? {}) };
}

export async function saveTemplates(t: DeliveryTemplates) {
  await setSetting("delivery_templates", t);
}

export { fill } from "./fill";
