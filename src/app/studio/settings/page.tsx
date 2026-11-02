import { CalendarDays, CreditCard, HardDrive } from "lucide-react";
import type { Metadata } from "next";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { getPackages, getServices } from "@/lib/data";
import { money } from "@/lib/format";
import { integrationStatus } from "@/lib/integrations";

export const metadata: Metadata = { title: "Settings" };

const icons = { storage: HardDrive, payments: CreditCard, calendar: CalendarDays };

export default async function SettingsPage() {
  await requireOwner();
  const services = getServices();
  return (
    <>
      <PageHeader title="Settings" description="Your studio profile, price list and connected services." />
      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Integrations" sub="Running on demo stand-ins until keys are added in .env.local" />
          <ul className="divide-y divide-line">
            {integrationStatus().map((i) => {
              const Icon = icons[i.key as keyof typeof icons];
              const live = i.provider !== "mock";
              return (
                <li key={i.key} className="flex items-center gap-4 px-5 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
                    <Icon className="size-5 text-ink-2" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{i.label}</span>
                    <span className="block text-[13px] text-muted">{i.detail}</span>
                  </span>
                  {live ? <Badge tone="ok" dot>Connected</Badge> : <Badge tone="warn" dot>Demo mode</Badge>}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Studio profile" sub="Shown on invoices and the agent portal" />
          <form className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Business name" className="sm:col-span-2">
              <Input defaultValue={brand.name} />
            </Field>
            <Field label="Email">
              <Input defaultValue={brand.email} />
            </Field>
            <Field label="Phone">
              <Input defaultValue={brand.phone} />
            </Field>
            <div className="sm:col-span-2">
              <Button type="button" variant="secondary" disabled title="Saving settings comes with the database">
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Services" sub="A la carte prices" />
          <ul className="divide-y divide-line">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">{s.name}</span>
                  <span className="block truncate text-[13px] text-muted">{s.description}</span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[14px] font-medium">{money(s.price)}</span>
                  <span className="block text-[12px] text-muted">{s.durationMin} min</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Packages" sub="Bundles agents can book" />
          <ul className="divide-y divide-line">
            {getPackages().map((p) => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-[14px] font-medium">
                    {p.name} {p.popular && <Badge tone="accent">Popular</Badge>}
                  </span>
                  <span className="tabular text-[14px] font-medium">{money(p.price)}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted">{p.serviceIds.map((id) => services.find((s) => s.id === id)?.name).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
