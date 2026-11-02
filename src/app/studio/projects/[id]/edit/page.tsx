import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { updateProject } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getProject, getServices } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireOwner();
  const p = await getProject((await params).id);
  if (!p) notFound();
  const services = (await getServices({ includeInactive: true })).filter((s) => s.active || p.serviceIds.includes(s.id));
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/studio/projects/${p.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {p.address}
      </Link>
      <h1 className="mb-6 font-display text-[28px] font-medium tracking-tight">Edit project</h1>
      {error && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">The street address is required.</p>}
      <form action={updateProject.bind(null, p.id)} className="space-y-6">
        <Card>
          <CardHeader title="Property" />
          <div className="grid grid-cols-6 gap-4 p-5">
            <Field label="Street address" className="col-span-6">
              <Input name="address" defaultValue={p.address} required />
            </Field>
            <Field label="City" className="col-span-6 sm:col-span-3">
              <Input name="city" defaultValue={p.city} />
            </Field>
            <Field label="State" className="col-span-2 sm:col-span-1">
              <Input name="state" defaultValue={p.state} maxLength={2} />
            </Field>
            <Field label="ZIP" className="col-span-4 sm:col-span-2">
              <Input name="zip" defaultValue={p.zip} inputMode="numeric" />
            </Field>
            <Field label="Square feet" className="col-span-6 sm:col-span-2">
              <Input name="sqft" type="number" min={0} defaultValue={p.sqft ?? ""} />
            </Field>
            <Field label="Beds" className="col-span-2 sm:col-span-1">
              <Input name="beds" type="number" min={0} defaultValue={p.beds ?? ""} />
            </Field>
            <Field label="Baths" className="col-span-2 sm:col-span-1">
              <Input name="baths" type="number" min={0} step={0.5} defaultValue={p.baths ?? ""} />
            </Field>
            <Field label="Acreage" className="col-span-2 sm:col-span-2">
              <Input name="acreage" type="number" min={0} step={0.01} defaultValue={p.acreage ?? ""} />
            </Field>
            <Field label="Features" className="col-span-6" hint="One per line or separated by commas">
              <Textarea name="features" defaultValue={p.features.join("\n")} />
            </Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Services" sub="Used when the invoice is created" />
          <div className="grid gap-2 p-5 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 text-[14px]">
                <input type="checkbox" name="services" value={s.id} defaultChecked={p.serviceIds.includes(s.id)} className="accent-[var(--accent)]" />
                {s.name} <span className="text-muted">{money(s.price)}</span>
              </label>
            ))}
          </div>
        </Card>
        <SubmitButton>Save changes</SubmitButton>
      </form>
    </div>
  );
}
