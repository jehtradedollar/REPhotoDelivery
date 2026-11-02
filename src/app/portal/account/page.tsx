import type { Metadata } from "next";
import { ImageUpload } from "@/components/image-upload";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Field, Input, PageHeader, Select } from "@/components/ui";
import { changePassword, updateAgentBranding, updateMyProfile } from "@/lib/actions";
import { requireClient } from "@/lib/auth";
import { agentBranding, getBrokerages } from "@/lib/branding";
import { getClient } from "@/lib/data";

export const metadata: Metadata = { title: "Account" };

const pwMessages: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: "Password changed. Other devices were signed out." },
  wrong: { ok: false, text: "Your current password didn't match." },
  short: { ok: false, text: "The new password needs at least 8 characters." },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; pw?: string; error?: string }> }) {
  const s = await requireClient();
  const q = await searchParams;
  const c = (await getClient(s.clientId))!;
  const [branding, brokerages] = await Promise.all([agentBranding(c), getBrokerages()]);
  const pw = q.pw ? pwMessages[q.pw] : undefined;

  return (
    <>
      <PageHeader title="Account" description="Your contact details and branding appear on your property websites." />
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}
      {q.error === "missing" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">Your name is required.</p>}

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" />
            <form action={updateMyProfile} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2">
                <Input name="name" defaultValue={c.name} autoComplete="name" required />
              </Field>
              <Field label="Email" hint="Ask the studio to change your sign-in email">
                <Input value={c.email} readOnly />
              </Field>
              <Field label="Mobile" hint="Delivery texts go here">
                <Input name="phone" type="tel" defaultValue={c.phone} autoComplete="tel" />
              </Field>
              <Field label="Brokerage name" className="sm:col-span-2" hint="Shown when you're not linked to a brokerage below">
                <Input name="brokerage" defaultValue={c.brokerage} />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton variant="secondary">Save profile</SubmitButton>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Password" />
            <form action={changePassword} className="grid gap-4 p-5 sm:grid-cols-2">
              {pw && <p className={`rounded-lg px-4 py-3 text-sm sm:col-span-2 ${pw.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{pw.text}</p>}
              <Field label="Current password">
                <Input name="current" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton variant="secondary">Change password</SubmitButton>
              </div>
            </form>
          </Card>
        </div>

        <Card>
          <CardHeader title="Branding" sub="Used on the branded version of your property websites" />
          <div className="space-y-5 p-5">
            <ImageUpload kind="client-photo" targetId={c.id} currentUrl={branding.photoUrl} label="Profile photo" />
            <ImageUpload kind="client-logo" targetId={c.id} currentUrl={c.logoKey ? branding.logoUrl : null} label="Your logo (replaces your brokerage's logo)" />
            {!c.logoKey && branding.source === "brokerage" && branding.logoUrl && (
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={branding.logoUrl} alt="" className="h-8 max-w-28 object-contain" /> Using {branding.brokerageName}&apos;s logo
              </div>
            )}
            <form action={updateAgentBranding.bind(null, c.id)} className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <Field label="Brokerage" className="sm:col-span-2" hint="Linking pulls in your brokerage's logo and color">
                <Select name="brokerageId" defaultValue={c.brokerageId ?? ""}>
                  <option value="">Not linked</option>
                  {brokerages.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Website">
                <Input name="website" type="url" defaultValue={c.website} placeholder="https://" />
              </Field>
              <Field label="License number">
                <Input name="licenseNo" defaultValue={c.licenseNo} />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton variant="secondary">Save branding</SubmitButton>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
