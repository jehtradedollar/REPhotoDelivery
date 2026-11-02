import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { resetDeliveryTemplates, saveDeliveryTemplates } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { sms } from "@/lib/integrations";
import { fill, getTemplates, PLACEHOLDERS } from "@/lib/templates";

export const metadata: Metadata = { title: "Delivery messages" };

const sample = {
  agent_first_name: "Maya",
  agent_name: "Maya Thompson",
  address: "2418 Hilltop Drive",
  file_count: "42",
  amount: "$395.00",
  invoice_number: "INV-1042",
  link: "https://…/d/3f9c…",
  portal_link: "https://…/portal/properties/…",
  site_link: "https://…/p/2418-hilltop-drive",
  studio_name: brand.name,
};

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOwner();
  const { saved } = await searchParams;
  const t = await getTemplates();

  return (
    <>
      <Link href="/studio/settings" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Delivery email and text" description="Sent to the agent's email and mobile number when you mark a project delivered." />
      {saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">{saved === "reset" ? "Templates reset to the defaults." : "Templates saved."}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <form action={saveDeliveryTemplates} className="space-y-6">
          <Card>
            <CardHeader title="Email" />
            <div className="space-y-4 p-5">
              <Field label="Subject">
                <Input name="emailSubject" defaultValue={t.emailSubject} required />
              </Field>
              <Field label="Message" hint="Blank lines start a new paragraph. A button linking to the delivery page is added below.">
                <Textarea name="emailBody" defaultValue={t.emailBody} rows={8} required />
              </Field>
              <Field label="Extra line when the invoice is unpaid" hint="Leave blank to skip">
                <Textarea name="emailUnpaidLine" defaultValue={t.emailUnpaidLine} rows={2} className="min-h-0" />
              </Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Text message" sub={sms.name === "twilio" ? "Sent through Twilio" : "Twilio isn't connected yet, so texts are written to the server log"} />
            <div className="space-y-4 p-5">
              <label className="flex items-center gap-2.5 text-[14px]">
                <input type="checkbox" name="sendSms" defaultChecked={t.sendSms} className="size-4 accent-[var(--accent)]" />
                Text the agent when a project is delivered
              </label>
              <Field label="Message" hint="Keep it short; long texts are split into several messages.">
                <Textarea name="sms" defaultValue={t.sms} rows={3} maxLength={640} />
              </Field>
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <SubmitButton>Save templates</SubmitButton>
          </div>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placeholders" sub="Type these anywhere above" />
            <ul className="space-y-2 p-5 text-[13px]">
              {Object.entries(PLACEHOLDERS).map(([k, v]) => (
                <li key={k}>
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px]">{`{${k}}`}</code> <span className="text-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Preview" sub="With sample details" />
            <div className="space-y-3 p-5 text-[13px]">
              <p className="font-semibold">{fill(t.emailSubject, sample)}</p>
              {fill(t.emailBody, sample)
                .split(/\n{2,}/)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line text-ink-2">
                    {para}
                  </p>
                ))}
              {t.emailUnpaidLine && <p className="text-ink-2">{fill(t.emailUnpaidLine, sample)}</p>}
              {t.sendSms && <p className="rounded-xl bg-surface-2 p-3 text-ink-2">{fill(t.sms, sample)}</p>}
            </div>
          </Card>
          <ConfirmButton action={resetDeliveryTemplates} message="Replace your templates with the defaults?" variant="ghost" size="sm">
            Reset to defaults
          </ConfirmButton>
        </div>
      </div>
    </>
  );
}
