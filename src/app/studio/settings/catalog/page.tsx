import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { savePackage, saveService, setPackageActive, setServiceActive } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getPackages, getServices } from "@/lib/data";
import { money } from "@/lib/format";
import type { Package, Service } from "@/lib/types";

export const metadata: Metadata = { title: "Services and packages" };

const kinds: { value: Service["kind"]; label: string }[] = [
  { value: "photo", label: "Photography" },
  { value: "drone", label: "Drone" },
  { value: "video", label: "Video" },
  { value: "floorplan", label: "Floor plan" },
  { value: "tour", label: "3D tour" },
  { value: "twilight", label: "Twilight" },
];

const dollars = (c: number) => (c / 100).toFixed(2);

function ServiceForm({ s }: { s?: Service }) {
  return (
    <form action={saveService} className="grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Name">
        <Input name="name" defaultValue={s?.name} required />
      </Field>
      <Field label="Type">
        <Select name="kind" defaultValue={s?.kind ?? "photo"}>
          {kinds.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Price ($)">
        <Input name="price" defaultValue={s ? dollars(s.price) : ""} inputMode="decimal" required />
      </Field>
      <Field label="Time on site (minutes)">
        <Input name="durationMin" type="number" min={15} step={15} defaultValue={s?.durationMin ?? 60} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <Input name="description" defaultValue={s?.description} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton size="sm">{s ? "Save" : "Add service"}</SubmitButton>
      </div>
    </form>
  );
}

function PackageForm({ p, services }: { p?: Package; services: Service[] }) {
  return (
    <form action={savePackage} className="grid gap-3 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Name">
        <Input name="name" defaultValue={p?.name} required />
      </Field>
      <Field label="Bundle price ($)">
        <Input name="price" defaultValue={p ? dollars(p.price) : ""} inputMode="decimal" required />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <Textarea name="description" defaultValue={p?.description} rows={2} className="min-h-0" />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[13px] font-medium">Includes</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={p?.serviceIds.includes(s.id)} className="accent-[var(--accent)]" />
              {s.name} <span className="text-muted">{money(s.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
        <input type="checkbox" name="popular" defaultChecked={p?.popular} className="accent-[var(--accent)]" /> Highlight as most popular
      </label>
      <div className="sm:col-span-2">
        <SubmitButton size="sm">{p ? "Save" : "Add package"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOwner();
  const q = await searchParams;
  const [services, packages] = await Promise.all([getServices({ includeInactive: true }), getPackages({ includeInactive: true })]);
  const active = services.filter((s) => s.active);

  return (
    <>
      <Link href="/studio/settings" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader title="Services and packages" description="What agents can book, and what goes on the invoice. Hidden items stay on past invoices." />
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}
      {q.error === "package" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">A package needs a name and at least one service.</p>}
      {q.error === "missing" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">A service needs a name.</p>}

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Services" sub="A la carte" />
          <ul className="divide-y divide-line">
            {services.map((s) => (
              <li key={s.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[14px] font-medium">
                        {s.name} {!s.active && <Badge>Hidden</Badge>}
                      </span>
                      <span className="block truncate text-[13px] text-muted">{s.description}</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block text-[14px] font-medium">{money(s.price)}</span>
                      <span className="block text-[12px] text-muted">{s.durationMin} min</span>
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-line bg-surface-2/50 p-5">
                    <ServiceForm s={s} />
                    <form action={setServiceActive.bind(null, s.id, !s.active)}>
                      <SubmitButton size="sm" variant="ghost">
                        {s.active ? "Hide from booking" : "Show in booking"}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
            <li>
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[14px] font-medium text-accent hover:bg-surface-2">
                  <Plus className="size-4" /> New service
                </summary>
                <div className="border-t border-line p-5">
                  <ServiceForm />
                </div>
              </details>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader title="Packages" sub="Bundles at a set price" />
          <ul className="divide-y divide-line">
            {packages.map((p) => (
              <li key={p.id}>
                <details>
                  <summary className="cursor-pointer list-none px-5 py-3 hover:bg-surface-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-[14px] font-medium">
                        {p.name} {p.popular && <Badge tone="accent">Popular</Badge>} {!p.active && <Badge>Hidden</Badge>}
                      </span>
                      <span className="tabular text-[14px] font-medium">{money(p.price)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted">{p.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(" · ")}</p>
                  </summary>
                  <div className="space-y-3 border-t border-line bg-surface-2/50 p-5">
                    <PackageForm p={p} services={active} />
                    <form action={setPackageActive.bind(null, p.id, !p.active)}>
                      <SubmitButton size="sm" variant="ghost">
                        {p.active ? "Hide from booking" : "Show in booking"}
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </li>
            ))}
            <li>
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[14px] font-medium text-accent hover:bg-surface-2">
                  <Plus className="size-4" /> New package
                </summary>
                <div className="border-t border-line p-5">
                  <PackageForm services={active} />
                </div>
              </details>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
