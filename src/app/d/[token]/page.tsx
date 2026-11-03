import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryView } from "@/components/delivery-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDelivered, projectByToken } from "@/lib/access";
import { confirmCheckoutReturn } from "@/lib/billing";
import { brand } from "@/lib/brand";
import { agentBranding } from "@/lib/branding";
import { getClient, getInvoice, getMedia, getShoot, heroUrl, isUnlocked, mediaViews } from "@/lib/data";
import { stagingOffer } from "@/lib/staging";
import { stockViews } from "@/lib/stock";

// Stand-alone delivery page. The link in the delivery email and text points
// here; it works without signing in, for anyone holding the link.

export const metadata: Metadata = { title: "Your media", robots: { index: false, follow: false } };

export default async function DeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; session_id?: string; pay?: string; staging?: string }>;
}) {
  const { token } = await params;
  const q = await searchParams;
  const p = await projectByToken(token);
  if (!p) notFound();
  await confirmCheckoutReturn(q.session_id, p.id);
  const [client, shoot, invoice, unlocked] = await Promise.all([getClient(p.clientId), getShoot(p.shootId), getInvoice(p.invoiceId), isUnlocked(p)]);
  const delivered = isDelivered(p);
  const [media, stock, hero] = delivered
    ? await Promise.all([getMedia(p.id).then((m) => mediaViews(m, unlocked, { token })), stockViews(p, unlocked, { token }), heroUrl(p, unlocked)])
    : [[], [], null];
  const branding = client ? await agentBranding(client) : null;

  const stagingInfo = delivered ? await stagingOffer(p.id, unlocked, media) : null;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="font-display text-lg font-medium tracking-tight">{brand.name}</span>
          <div className="flex items-center gap-2">
            {client && (
              <span className="hidden items-center gap-2 text-[13px] text-ink-2 sm:flex">
                {branding?.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={branding.photoUrl} alt="" className="size-7 rounded-full object-cover" />
                )}
                Delivered to {client.name}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DeliveryView
          project={p}
          shoot={shoot}
          invoice={invoice}
          media={[...media, ...stock]}
          unlocked={unlocked}
          hero={hero}
          token={token}
          flash={{ paid: !!q.paid, payOffline: q.pay === "offline", staging: q.staging === "unlocked" ? "unlocked" : q.staging ? "sent" : undefined }}
        staging={stagingInfo}
        />
        <p className="mt-10 text-center text-[13px] text-muted">
          Have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(`/portal/properties/${p.id}`)}`} className="font-medium text-accent hover:underline">
            Sign in to see all your listings
          </Link>
          {brand.email && (
            <>
              {" "}· Questions? <a href={`mailto:${brand.email}`} className="hover:underline">{brand.email}</a>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
