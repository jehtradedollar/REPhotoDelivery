import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { StockUploader } from "@/components/stock-uploader";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { db, schema as s } from "@/db";
import { removeStockItem, saveStockPack, setStockPackActive } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { bytes, money } from "@/lib/format";
import { storage } from "@/lib/integrations";

export const metadata: Metadata = { title: "Stock pack" };

export default async function StockPackPage({ params, searchParams }: { params: Promise<{ packId: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireOwner();
  const { packId } = await params;
  const q = await searchParams;
  const [pack] = await db.select().from(s.stockPacks).where(eq(s.stockPacks.id, packId));
  if (!pack) notFound();
  const [zones, items] = await Promise.all([db.select().from(s.zones).orderBy(asc(s.zones.name)), db.select().from(s.stockMedia).where(eq(s.stockMedia.packId, packId)).orderBy(asc(s.stockMedia.uploadedAt))]);
  const thumbs = await Promise.all(items.map((m) => (m.thumbKey ? storage.getPreviewUrl(m.thumbKey) : null)));
  const zone = zones.find((z) => z.id === pack.zoneId);

  return (
    <>
      <Link href="/studio/settings/zones" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Zones
      </Link>
      <PageHeader title={pack.name} description={`${zone?.name ?? "No zone"} · ${money(pack.price)} · ${items.length} photos`} />
      {q.saved && <p className="mb-4 rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Saved.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <Card>
          <CardHeader title="Photos" sub="Agents see watermarked previews until their invoice is paid" action={<StockUploader packId={pack.id} />} />
          <div className="p-5">
            {items.length === 0 ? (
              <EmptyState title="No photos yet" body="Packs without photos aren't offered at booking." />
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((m, i) => (
                  <li key={m.id} className="group relative">
                    <div className="aspect-[3/2] overflow-hidden rounded-xl border border-line bg-surface-2">
                      {thumbs[i] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[i]!} alt={m.filename} className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <form action={removeStockItem.bind(null, m.id)} className="absolute top-2 right-2">
                      <button className="grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-bad sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Remove ${m.filename}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                    <div className="mt-1 flex justify-between gap-2 text-xs text-muted">
                      <span className="truncate">{m.filename}</span>
                      <span className="shrink-0">{bytes(m.sizeBytes)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Pack details" />
            <form action={saveStockPack} className="grid gap-3 p-5">
              <input type="hidden" name="id" value={pack.id} />
              <Field label="Zone">
                <Select name="zoneId" defaultValue={pack.zoneId}>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Name">
                <Input name="name" defaultValue={pack.name} required />
              </Field>
              <Field label="Price ($)">
                <Input name="price" defaultValue={(pack.price / 100).toFixed(2)} inputMode="decimal" required />
              </Field>
              <Field label="Description">
                <Textarea name="description" defaultValue={pack.description} rows={3} className="min-h-0" />
              </Field>
              <div>
                <SubmitButton size="sm">Save</SubmitButton>
              </div>
            </form>
          </Card>
          <form action={setStockPackActive.bind(null, pack.id, !pack.active)}>
            <SubmitButton variant="ghost" size="sm">
              {pack.active ? "Stop offering this pack" : "Offer this pack again"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
