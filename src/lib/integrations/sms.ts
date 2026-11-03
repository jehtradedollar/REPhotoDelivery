import "server-only";

// Text messages. Twilio when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and
// TWILIO_FROM (or TWILIO_MESSAGING_SERVICE_SID) are set; otherwise texts are
// printed to the server log.

export interface SmsSender {
  readonly name: "twilio" | "log";
  send(to: string, body: string): Promise<boolean>;
}

/** Best-effort E.164: assumes US/Canada for 10-digit numbers. */
export function toE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    const d = trimmed.slice(1).replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
  }
  const d = trimmed.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

class LogSms implements SmsSender {
  readonly name = "log" as const;
  async send(to: string, body: string) {
    console.log(`\n[sms] to=${to}\n${body}\n`);
    return true;
  }
}

class TwilioSms implements SmsSender {
  readonly name = "twilio" as const;
  async send(to: string, body: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const params = new URLSearchParams({ To: to, Body: body });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else params.set("From", process.env.TWILIO_FROM!);
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      if (!res.ok) console.error("[sms] Twilio error", res.status, await res.text());
      return res.ok;
    } catch (e) {
      console.error("[sms] send failed", e);
      return false;
    }
  }
}

export function createSms(): SmsSender {
  const ok = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID);
  return ok ? new TwilioSms() : new LogSms();
}
