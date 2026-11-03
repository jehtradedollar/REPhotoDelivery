import "server-only";
import { brand } from "../brand";

// Outgoing email. SMTP when SMTP_URL is set (works with Postmark, SendGrid,
// SES, Resend, Gmail...); otherwise messages are printed to the server log so
// links (invites, password resets) are still usable in development.

export interface Mail {
  to: string;
  subject: string;
  /** Plain paragraphs; a link renders as a button. */
  lines: string[];
  action?: { label: string; url: string };
}

export interface Mailer {
  readonly name: "smtp" | "log";
  send(mail: Mail): Promise<void>;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function renderMail(mail: Mail) {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1b1a17">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#fff;border:1px solid #e2ded5;border-radius:14px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px">
<div style="font-family:Georgia,serif;font-size:20px;margin-bottom:20px">${esc(brand.name)}</div>
${mail.lines.map((l) => `<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${esc(l)}</p>`).join("")}
${mail.action ? `<p style="margin:22px 0 6px"><a href="${esc(mail.action.url)}" style="display:inline-block;background:#2b5d4f;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:600;font-size:14px">${esc(mail.action.label)}</a></p><p style="font-size:12px;color:#77736b;word-break:break-all">${esc(mail.action.url)}</p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#77736b;margin-top:16px">${esc(brand.name)} · ${esc(brand.email)} · ${esc(brand.phone)}</p>
</td></tr></table></body></html>`;
  const text = [...mail.lines, ...(mail.action ? [`${mail.action.label}: ${mail.action.url}`] : [])].join("\n\n");
  return { html, text };
}

class LogMailer implements Mailer {
  readonly name = "log" as const;
  async send(mail: Mail) {
    console.log(`\n[mail] to=${mail.to} subject="${mail.subject}"\n${renderMail(mail).text}\n`);
  }
}

class SmtpMailer implements Mailer {
  readonly name = "smtp" as const;
  private transport = import("nodemailer").then((m) => m.default.createTransport(process.env.SMTP_URL!));
  async send(mail: Mail) {
    const { html, text } = renderMail(mail);
    try {
      await (await this.transport).sendMail({ from: process.env.MAIL_FROM || `${brand.name} <${brand.email}>`, to: mail.to, subject: mail.subject, html, text });
    } catch (e) {
      // Email failures shouldn't break the action that triggered them.
      console.error("[mail] send failed", e);
    }
  }
}

export function createMailer(): Mailer {
  return process.env.SMTP_URL ? new SmtpMailer() : new LogMailer();
}
