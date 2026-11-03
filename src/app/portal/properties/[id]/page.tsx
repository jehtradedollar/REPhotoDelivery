import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryView } from "@/components/delivery-view";
import { isDelivered } from "@/lib/access";
import { requireClient } from "@/lib/auth";
import { confirmCheckoutReturn } from "@/lib/billing";
import { getInvoice, getMedia, getProject, getShoot, heroUrl, isUnlocked, mediaViews } from "@/lib/data";
import { stagingOffer } from "@/lib/staging";
import { stockViews } from "@/lib/stock";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await getProject((await params).id))?.address ?? "Property" };
}

export default async function PortalProperty({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; booked?: string; session_id?: string; pay?: string; staging?: string }>;
}) {
  const s = await requireClient();
  const { id } = await params;
  const q = await searchParams;
  const p = await getProject(id);
  if (!p || p.clientId !== s.clientId) notFound();
  await confirmCheckoutReturn(q.session_id, p.id);
  const [shoot, invoice, unlocked] = await Promise.all([getShoot(p.shootId), getInvoice(p.invoiceId), isUnlocked(p)]);
  const delivered = isDelivered(p);
  const [media, stock, hero] = delivered ? await Promise.all([getMedia(p.id).then((m) => mediaViews(m, unlocked)), stockViews(p, unlocked), heroUrl(p, unlocked)]) : [[], [], null];

  const stagingInfo = delivered ? await stagingOffer(p.id, unlocked, media) : null;

  return (
    <>
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Properties
      </Link>
      <DeliveryView
        project={p}
        shoot={shoot}
        invoice={invoice}
        media={[...media, ...stock]}
        unlocked={unlocked}
        hero={hero}
        flash={{ paid: !!q.paid, booked: !!q.booked, payOffline: q.pay === "offline", staging: q.staging === "unlocked" ? "unlocked" : q.staging ? "sent" : undefined }}
        staging={stagingInfo}
      />
    </>
  );
}
