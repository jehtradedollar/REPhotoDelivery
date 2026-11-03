import { ArrowLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { db, schema as s } from "@/db";
import { deleteZone, saveStockPack, saveZone } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Zone } from "@/lib/stock";

export const metadata: Metadata = { title: "Location zones" };

function ZoneForm({ z }: { z?: Zone }) {
  return (
    <form action={saveZone} className="grid gap-3 sm:grid-cols-2">
      {z && <input type="hidden" name="id" value={z.id} />}
      <Field label="Zone name" className="sm:col-span-2">
        <Input name="name" defaultValue={z?.name} placeholder="Downtown Redding" required />
      </Field>
      <Field label="ZIP codes" hint="Separate with commas">
        <Textarea name="zips" defaultValue={z?.zips.join(", ")} rows={2} className="min-h-0" placeholder="96001, 96002" />
      </Field>
      <Field label="Cities" hint="Matched when the ZIP isn't listed">
        <Textarea name="cities" defaultValue={z?.cities.join(", ")} rows={2} className="min-h-0" placeholder="Redding, Shasta Lake" />
      </Field>
      {z && (
        <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
          <input type="hidden" name="active" value="off" />
          <input type="checkbox" name="active" defaultChecked={z.active} className="accent-[var(--accent)]" /> Offer this zone&apos;s packs when booking
        </label>
      )}
      <div className="sm:col-span-2">
        <SubmitButton size="sm">{z ? "Save zone" : "Add zone"}</SubmitButton>
      </div>
    </form>
  );
}

export default async function ZonesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOwner();
  const q = await searchParams;
  const [zones, packs] = await Promise.all([
    db.select().from(s.zones).orderBy(asc(s.zones.name)),
    db
      .select({ pack: s.stockPacks, count: sql<number>`(select count(*)::int from stock_media m where m.pack_id = ${s.stockPacks.id})` })
      .from(s.stockPacks)
      .orderBy(asc(s.stockPacks.name)),
  ]);

  return (
    <>
      <Link href="/studio/settings" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Settings
      </Link>
      <PageHeader
        title="Location zones and stock media"
        description="When an agent books an address inside a zone, a pop-up offers that zone's local-area photo packs as an add-on. Packs are added to the invoice and delivered in a Local area tab."
      />
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}
      {q.error === "zone" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">A zone needs a name and at least one ZIP code or city.</p>}
      {q.error === "pack" && <p className="mb-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">A pack needs a name and a zone.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          {zones.length === 0 && (
            <Card>
              <EmptyState icon={<MapPin />} title="No zones yet" body="Add a zone by ZIP code or city, then add a stock pack of local photos to it." />
            </Card>
          )}
          {zones.map((z) => {
            const zp = packs.filter((p) => p.pack.zoneId === z.id);
            return (
              <Card key={z.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {z.name} {!z.active && <Badge>Paused</Badge>}
                    </span>
                  }
                  sub={[z.zips.join(", "), z.cities.join(", ")].filter(Boolean).join(" · ")}
                />
                <ul className="divide-y divide-line">
                  {zp.map(({ pack, count }) => (
                    <li key={pack.id}>
                      <Link href={`/studio/settings/zones/${pack.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-[14px] font-medium">
                            {pack.name} {!pack.active && <Badge>Hidden</Badge>} {count === 0 && <Badge tone="warn">No photos</Badge>}
                          </span>
                          <span className="block text-[13px] text-muted">
                            {count} photos · {money(pack.price)}
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <details className="border-t border-line">
                  <summary className="cursor-pointer list-none px-5 py-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2">Edit zone</summary>
                  <div className="space-y-3 border-t border-line p-5">
                    <ZoneForm z={z} />
                    <ConfirmButton action={deleteZone.bind(null, z.id)} message={`Delete ${z.name} and its stock packs? Photos already delivered on projects stop showing.`} variant="ghost" size="sm">
                      Delete zone
                    </ConfirmButton>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="New zone" />
            <div className="p-5">
              <ZoneForm />
            </div>
          </Card>
          {zones.length > 0 && (
            <Card>
              <CardHeader title="New stock pack" sub="Add photos on the next screen" />
              <form action={saveStockPack} className="grid gap-3 p-5">
                <Field label="Zone">
                  <Select name="zoneId" required>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Name">
                  <Input name="name" placeholder="Sundial Bridge and riverfront" required />
                </Field>
                <Field label="Price ($)">
                  <Input name="price" inputMode="decimal" placeholder="49.00" required />
                </Field>
                <Field label="Description" hint="Shown to the agent in the booking pop-up">
                  <Textarea name="description" rows={2} className="min-h-0" />
                </Field>
                <div>
                  <SubmitButton size="sm">
                    <Plus /> Create pack
                  </SubmitButton>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
