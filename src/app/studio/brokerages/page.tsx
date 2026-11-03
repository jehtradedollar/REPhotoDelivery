import { ArrowLeft, Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ImageUpload } from "@/components/image-upload";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { db, schema as s } from "@/db";
import { saveBrokerage } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getBrokerages } from "@/lib/branding";
import { storage } from "@/lib/integrations";

export const metadata: Metadata = { title: "Brokerages" };

export default async function BrokeragesPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireOwner();
  const q = await searchParams;
  const [list, agents] = await Promise.all([getBrokerages(), db.select({ brokerageId: s.clients.brokerageId }).from(s.clients)]);
  const withLogos = await Promise.all(list.map(async (b) => ({ ...b, logoUrl: b.logoKey ? await storage.getPreviewUrl(b.logoKey) : null, agents: agents.filter((a) => a.brokerageId === b.id).length })));

  return (
    <div className="max-w-3xl">
      <Link href="/studio/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      <PageHeader title="Brokerages" description="Branding profiles agents can link to. Linked agents' property websites use the brokerage logo and color unless they upload their own logo." />
      {q.error && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">A brokerage needs a name.</p>}
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}

      <div className="space-y-4">
        {withLogos.length === 0 && (
          <Card>
            <EmptyState icon={<Building2 />} title="No brokerages yet" body="Add one below, then link agents to it from their profile." />
          </Card>
        )}
        {withLogos.map((b) => (
          <Card key={b.id}>
            <CardHeader title={b.name} sub={`${b.agents} linked agent${b.agents === 1 ? "" : "s"}`} action={<span className="size-5 rounded-full border border-line" style={{ background: b.color }} aria-label={`Brand color ${b.color}`} />} />
            <div className="space-y-5 p-5">
              <ImageUpload kind="brokerage-logo" targetId={b.id} currentUrl={b.logoUrl} label="Brokerage logo" />
              <form action={saveBrokerage} className="grid gap-3 sm:grid-cols-6">
                <input type="hidden" name="id" value={b.id} />
                <Field label="Name" className="sm:col-span-4">
                  <Input name="name" defaultValue={b.name} required />
                </Field>
                <Field label="Brand color" className="sm:col-span-2">
                  <Input name="color" type="color" defaultValue={b.color} className="h-[42px] p-1" />
                </Field>
                <Field label="Website" className="sm:col-span-3">
                  <Input name="website" type="url" defaultValue={b.website} placeholder="https://" />
                </Field>
                <Field label="Phone" className="sm:col-span-3">
                  <Input name="phone" defaultValue={b.phone} />
                </Field>
                <Field label="Office address" className="sm:col-span-6">
                  <Input name="address" defaultValue={b.address} />
                </Field>
                <div className="sm:col-span-6">
                  <SubmitButton size="sm" variant="secondary">
                    Save
                  </SubmitButton>
                </div>
              </form>
            </div>
          </Card>
        ))}

        <Card>
          <CardHeader title="Add a brokerage" />
          <form action={saveBrokerage} className="grid gap-3 p-5 sm:grid-cols-6">
            <Field label="Name" className="sm:col-span-4">
              <Input name="name" required placeholder="Summit Realty Group" />
            </Field>
            <Field label="Brand color" className="sm:col-span-2">
              <Input name="color" type="color" defaultValue="#2b5d4f" className="h-[42px] p-1" />
            </Field>
            <Field label="Website" className="sm:col-span-3">
              <Input name="website" type="url" placeholder="https://" />
            </Field>
            <Field label="Phone" className="sm:col-span-3">
              <Input name="phone" />
            </Field>
            <div className="sm:col-span-6">
              <SubmitButton size="sm">
                <Plus /> Add brokerage
              </SubmitButton>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
