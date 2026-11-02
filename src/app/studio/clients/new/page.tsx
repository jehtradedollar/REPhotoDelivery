import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { createClient } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOwner();
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl">
      <Link href="/studio/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Clients
      </Link>
      <PageHeader title="Add a client" description="They'll get a portal login to book shoots, view media and pay invoices." />
      {error && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">Name and email are required.</p>}
      <Card className="p-5 sm:p-6">
        <form action={createClient} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input name="name" required autoComplete="name" placeholder="Jordan Avery" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" required placeholder="jordan@brokerage.com" />
          </Field>
          <Field label="Phone">
            <Input name="phone" type="tel" placeholder="(530) 555-0100" />
          </Field>
          <Field label="Brokerage or team" className="sm:col-span-2">
            <Input name="brokerage" placeholder="Brokerage name" />
          </Field>
          <Field label="Notes" className="sm:col-span-2" hint="Only visible to you.">
            <Textarea name="notes" placeholder="Preferences, billing contacts, usual add-ons" />
          </Field>
          <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
            <input type="checkbox" name="invite" defaultChecked className="accent-[var(--accent)]" /> Email them a portal invite
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Link href="/studio/clients" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-ink-2 hover:bg-surface-2">
              Cancel
            </Link>
            <SubmitButton>Add client</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
