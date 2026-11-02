import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteEditor } from "@/components/site/site-editor";
import { PageHeader } from "@/components/ui";
import { isDelivered } from "@/lib/access";
import { requireOwner } from "@/lib/auth";
import { getProject, isUnlocked } from "@/lib/data";

export const metadata: Metadata = { title: "Property website" };

export default async function StudioSitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireOwner();
  const p = await getProject((await params).id);
  if (!p) notFound();
  const live = p.sitePublished && isDelivered(p) && (await isUnlocked(p));
  return (
    <>
      <Link href={`/studio/projects/${p.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {p.address}
      </Link>
      <PageHeader title="Property website" description="Agents can edit this too, from their portal." />
      <SiteEditor project={p} saved={!!(await searchParams).saved} live={live} />
    </>
  );
}
