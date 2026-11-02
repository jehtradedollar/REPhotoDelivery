import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertySite } from "@/components/site/property-site";
import { defaultDescription, loadSite } from "@/lib/site";

// Shared by the branded (/p/<slug>) and unbranded (/p/<slug>/u) routes.

export async function siteMetadata(slug: string, branded: boolean): Promise<Metadata> {
  const data = await loadSite(slug);
  if (!data) return { title: "Not found" };
  const p = data.project;
  const title = `${p.address}${p.city ? `, ${p.city}` : ""}`;
  const description = (p.mlsDescription || defaultDescription(p)).slice(0, 180);
  return {
    title: { absolute: branded ? `${title} · ${data.client.name}` : title },
    description,
    robots: data.live ? undefined : { index: false },
    openGraph: { title, description, images: data.photos[0] ? [{ url: data.photos[0].url }] : undefined, type: "website" },
  };
}

export async function SitePage({ slug, branded, template }: { slug: string; branded: boolean; template?: string }) {
  const data = await loadSite(slug);
  if (!data) notFound();
  // ?template= lets the editor preview a look before saving it.
  const look = template === "classic" || template === "modern" || template === "minimal" ? template : data.project.siteTemplate;
  const preview = !data.live && (
    <div className="bg-amber-100 px-4 py-2 text-center text-[13px] text-amber-900">
      Preview only. This site goes public once the media is delivered and paid{data.project.sitePublished ? "" : " and the site is turned on"}.
    </div>
  );
  return <PropertySite data={data} template={look} branded={branded} preview={preview} />;
}
