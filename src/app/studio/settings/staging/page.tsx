import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";
import { saveStagingSettings } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { staging } from "@/lib/integrations";
import { getStagingConfig } from "@/lib/staging";

export const metadata: Metadata = { title: "Virtual staging" };

export default async function StagingSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOwner();
  const { saved } = await searchParams;
  const c = await getStagingConfig();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/studio/settings" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Virtual staging" description="Agents can order AI staging for empty rooms from their delivery page once their gallery is paid. Each order is paid at checkout before staging starts." />
      {saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}
      <Card>
        <CardHeader title="Offer" sub={staging.name === "http" ? "Orders go to your staging API automatically" : "No staging API yet: paid orders queue on the project page and you upload the result"} />
        <form action={saveStagingSettings} className="space-y-4 p-5">
          <label className="flex items-center gap-2.5 text-[14px]">
            <input type="checkbox" name="enabled" defaultChecked={c.enabled} className="size-4 accent-[var(--accent)]" /> Offer virtual staging on delivery pages
          </label>
          <Field label="Price per photo ($)" hint="Set to 0 to include it free">
            <Input name="price" defaultValue={(c.price / 100).toFixed(2)} inputMode="decimal" className="max-w-40" />
          </Field>
          <SubmitButton>Save</SubmitButton>
        </form>
      </Card>
      <p className="mt-4 text-[13px] text-muted">
        To connect an AI staging service, set VIRTUAL_STAGING_API_URL, VIRTUAL_STAGING_API_KEY and VIRTUAL_STAGING_WEBHOOK_SECRET. See docs/DEPLOY.md.
      </p>
    </div>
  );
}
