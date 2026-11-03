import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { updateAgentBranding, updateClient } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { agentBranding, getBrokerages } from "@/lib/branding";
import { getClient } from "@/lib/data";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireOwner();
  const { id } = await params;
  const { error } = await searchParams;
  const c = await getClient(id);
  if (!c) notFound();
  const [brokerages, branding] = await Promise.all([getBrokerages(), agentBranding(c)]);
  return (
    <div className="max-w-2xl">
      <Link href={`/studio/clients/${c.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {c.name}
      </Link>
      <PageHeader title="Edit client" />
      {error && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error === "taken" ? "Another account already uses that email." : "Name and a valid email are required."}</p>}
      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <form action={updateClient.bind(null, c.id)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <Input name="name" required defaultValue={c.name} />
            </Field>
            <Field label="Email" hint="Also their sign-in email.">
              <Input name="email" type="email" required defaultValue={c.email} />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" defaultValue={c.phone} />
            </Field>
            <Field label="Brokerage or team name" className="sm:col-span-2">
              <Input name="brokerage" defaultValue={c.brokerage} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" hint="Only visible to you.">
              <Textarea name="notes" defaultValue={c.notes ?? ""} />
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <SubmitButton>Save</SubmitButton>
            </div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Branding" sub="Shown on their branded property websites" />
          <div className="space-y-5 p-5 sm:p-6">
            <ImageUpload kind="client-photo" targetId={c.id} currentUrl={branding.photoUrl} label="Profile photo" />
            <ImageUpload kind="client-logo" targetId={c.id} currentUrl={c.logoKey ? branding.logoUrl : null} label="Agent logo (overrides the brokerage logo)" />
            <form action={updateAgentBranding.bind(null, c.id)} className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <Field label="Parent brokerage" className="sm:col-span-2" hint="Their sites use the brokerage logo and color unless they upload their own logo.">
                <Select name="brokerageId" defaultValue={c.brokerageId ?? ""}>
                  <option value="">None</option>
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
                <Input name="licenseNo" defaultValue={c.licenseNo} placeholder="DRE #01234567" />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <Link href="/studio/brokerages" className="text-[13px] font-medium text-accent hover:underline">
                  Manage brokerages
                </Link>
                <SubmitButton variant="secondary">Save branding</SubmitButton>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
