import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/components/site/site-editor";
import { PageHeader } from "@/components/ui";
import { isDelivered } from "@/lib/access";
import { requireClient } from "@/lib/auth";
import { getProject, isUnlocked } from "@/lib/data";

export const metadata: Metadata = { title: "Property website" };

export default async function PortalSitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const s = await requireClient();
  const p = await getProject((await params).id);
  if (!p || p.clientId !== s.clientId) notFound();
  const live = p.sitePublished && isDelivered(p) && (await isUnlocked(p));
  return (
    <>
      <Link href={`/portal/properties/${p.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {p.address}
      </Link>
      <PageHeader
        title="Property website"
        description={
          <>
            Your listing site, filled in from the booking. Your photo and logo come from{" "}
            <Link href="/portal/account" className="font-medium text-accent hover:underline">
              your account
            </Link>
            .
          </>
        }
      />
      <SiteEditor project={p} saved={!!(await searchParams).saved} live={live} />
    </>
  );
}
