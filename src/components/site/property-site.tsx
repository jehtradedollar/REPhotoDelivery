import { Check, Download, Globe, Mail, Phone } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { defaultDescription, type SiteData, type SiteTemplate } from "@/lib/site";
import { SiteGallery } from "./site-gallery";

// Public property websites. One data shape, three looks, and a branded or
// unbranded (MLS-safe: no agent, brokerage or studio contact info) version.
// Sites always render light so they look the same for every visitor.

type Props = { data: SiteData; template: SiteTemplate; branded: boolean; preview?: ReactNode };

const fontFor: Record<SiteTemplate, string> = {
  classic: "font-display",
  modern: "font-sans tracking-tight",
  minimal: "font-sans font-light tracking-tight",
};

function stats(p: SiteData["project"]) {
  return [
    p.beds != null && { label: "Beds", value: String(p.beds) },
    p.baths != null && { label: "Baths", value: String(p.baths) },
    p.sqft != null && { label: "Sq ft", value: p.sqft.toLocaleString() },
    p.acreage != null && { label: "Acres", value: String(p.acreage) },
  ].filter((x): x is { label: string; value: string } => !!x);
}

function Section({ title, children, template, className }: { title: string; children: ReactNode; template: SiteTemplate; className?: string }) {
  return (
    <section className={cn("py-10 sm:py-14", className)}>
      <h2
        className={cn(
          "mb-6",
          template === "classic" && "font-display text-[28px] font-medium sm:text-[34px]",
          template === "modern" && "text-[13px] font-bold tracking-[0.18em] text-[var(--site-accent)] uppercase",
          template === "minimal" && "text-[12px] font-medium tracking-[0.25em] text-neutral-500 uppercase",
        )}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function AgentCard({ data, template }: { data: SiteData; template: SiteTemplate }) {
  const { client: c, branding: b } = data;
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center", template === "modern" ? "rounded-none border-l-4 border-[var(--site-accent)] bg-neutral-50 p-6" : "rounded-2xl border border-neutral-200 p-6")}>
      {b.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.photoUrl} alt={c.name} className="size-20 rounded-full object-cover" />
      ) : (
        <span className="grid size-20 place-items-center rounded-full bg-[var(--site-accent)] text-2xl font-semibold text-white">{c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium tracking-wide text-neutral-500 uppercase">Listed by</p>
        <p className={cn("text-[22px] leading-tight", fontFor[template])}>{c.name}</p>
        <p className="text-[14px] text-neutral-600">
          {b.brokerageName}
          {c.licenseNo && ` · DRE ${c.licenseNo}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px]">
          {c.phone && (
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-neutral-800 hover:text-[var(--site-accent)]">
              <Phone className="size-4" /> {c.phone}
            </a>
          )}
          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 break-all text-neutral-800 hover:text-[var(--site-accent)]">
            <Mail className="size-4" /> {c.email}
          </a>
          {b.website && (
            <a href={b.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-neutral-800 hover:text-[var(--site-accent)]">
              <Globe className="size-4" /> Website
            </a>
          )}
        </div>
      </div>
      {b.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logoUrl} alt={b.brokerageName} className="h-14 max-w-40 object-contain sm:ml-auto" />
      )}
    </div>
  );
}

export function PropertySite({ data, template, branded, preview }: Props) {
  const p = data.project;
  const hero = data.photos[0];
  const st = stats(p);
  const description = p.mlsDescription || defaultDescription(p);
  const headline = p.siteHeadline || (template === "minimal" ? p.address : "Welcome home");
  const location = [p.city, `${p.state} ${p.zip}`.trim()].filter(Boolean).join(", ");
  const accent = branded ? data.branding.color : "#262626";
  const style = { "--site-accent": accent } as CSSProperties;
  const gallery = data.photos.slice(1);

  const statRow = st.length > 0 && (
    <dl className={cn("flex flex-wrap", template === "minimal" ? "gap-x-10 gap-y-4" : "gap-x-8 gap-y-4 sm:gap-x-12")}>
      {st.map((x) => (
        <div key={x.label}>
          <dt className="text-[12px] font-medium tracking-wider text-neutral-500 uppercase">{x.label}</dt>
          <dd className={cn("text-[28px] leading-tight sm:text-[34px]", fontFor[template], template === "modern" && "font-bold")}>{x.value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="min-h-dvh bg-white text-neutral-900 [color-scheme:light]" style={style}>
      {preview}

      {/* Header */}
      {branded && (
        <header className={cn("mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8", template === "modern" && "max-w-none bg-[var(--site-accent)] text-white")}>
          {data.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.branding.logoUrl} alt={data.branding.brokerageName} className={cn("h-9 max-w-44 object-contain", template === "modern" && "rounded bg-white p-1")} />
          ) : (
            <span className="text-[15px] font-semibold">{data.branding.brokerageName || data.client.name}</span>
          )}
          <a href={`mailto:${data.client.email}?subject=${encodeURIComponent(p.address)}`} className={cn("rounded-full px-4 py-2 text-[13px] font-medium", template === "modern" ? "bg-white text-neutral-900" : "bg-[var(--site-accent)] text-white")}>
            Contact {data.client.name.split(" ")[0]}
          </a>
        </header>
      )}

      {/* Hero */}
      {template === "classic" && (
        <div className="relative">
          <div className="aspect-[4/3] w-full bg-neutral-200 sm:aspect-[21/9]">
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-8 text-white sm:px-8 sm:pb-12">
            <p className="text-[13px] font-medium tracking-[0.2em] uppercase opacity-85">{headline}</p>
            <h1 className="mt-2 font-display text-[36px] leading-[1.05] font-medium sm:text-[60px]">{p.address}</h1>
            <p className="mt-1 text-[16px] opacity-85">{location}</p>
          </div>
        </div>
      )}
      {template === "modern" && (
        <div className="grid lg:grid-cols-[5fr_7fr]">
          <div className="flex flex-col justify-end bg-neutral-900 px-5 py-10 text-white sm:px-10 sm:py-16">
            <p className="text-[12px] font-bold tracking-[0.2em] text-[var(--site-accent)] uppercase brightness-150">{headline}</p>
            <h1 className="mt-3 text-[38px] leading-[1.02] font-bold tracking-tight sm:text-[56px]">{p.address}</h1>
            <p className="mt-2 text-[16px] text-white/70">{location}</p>
          </div>
          <div className="aspect-[4/3] bg-neutral-200 lg:aspect-auto lg:min-h-[560px]">
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        </div>
      )}
      {template === "minimal" && (
        <div className="mx-auto max-w-3xl px-5 pt-12 sm:px-8 sm:pt-20">
          <p className="text-[12px] font-medium tracking-[0.25em] text-neutral-500 uppercase">{location}</p>
          <h1 className="mt-3 text-[36px] leading-[1.1] font-light tracking-tight sm:text-[52px]">{headline}</h1>
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.url} alt="" className="mt-10 w-full" />
          )}
        </div>
      )}

      <main className={cn("mx-auto px-5 sm:px-8", template === "minimal" ? "max-w-3xl" : "max-w-6xl")}>
        {statRow && <div className={cn("border-b border-neutral-200 py-8 sm:py-10", template === "modern" && "border-b-0")}>{statRow}</div>}

        <div className={cn(template !== "minimal" && "grid gap-x-16 lg:grid-cols-[1fr_320px]")}>
          <Section title="About this home" template={template}>
            <div className={cn("space-y-4 text-[16px] leading-relaxed whitespace-pre-line text-neutral-700 sm:text-[17px]", template === "minimal" && "font-light")}>{description}</div>
          </Section>
          {p.features.length > 0 && (
            <Section title="Features" template={template} className={cn(template !== "minimal" && "lg:pt-14")}>
              <ul className="space-y-2.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--site-accent)]" strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {gallery.length > 0 && (
          <Section title="Photos" template={template}>
            <SiteGallery photos={gallery} layout={template === "classic" ? "grid" : template === "modern" ? "masonry" : "stack"} className={template === "classic" ? "[&_li]:rounded-lg" : ""} />
          </Section>
        )}

        {(data.videos.length > 0 || data.embeds.length > 0) && (
          <Section title={data.embeds.some((e) => /Matterport|iGUIDE|Zillow|Kuula|CloudPano/.test(e.provider)) ? "Video and 3D tour" : "Video"} template={template}>
            <div className="grid gap-6">
              {data.videos.map((v) => (
                <video key={v} src={v} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
              ))}
              {data.embeds.map((e) =>
                e.embedUrl ? (
                  <div key={e.id} className="relative aspect-video overflow-hidden rounded-xl bg-neutral-100">
                    <iframe
                      src={e.embedUrl}
                      title={e.title}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; gyroscope; accelerometer"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-[var(--site-accent)] underline underline-offset-4">
                    {e.title}
                  </a>
                ),
              )}
            </div>
          </Section>
        )}

        {data.floorplans.length > 0 && (
          <Section title="Floor plan" template={template}>
            <div className="flex flex-wrap gap-3">
              {data.floorplans.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-[14px] font-medium hover:border-neutral-900">
                  <Download className="size-4" /> {f.name}
                </a>
              ))}
            </div>
          </Section>
        )}

        {data.local.length > 0 && (
          <Section title="Around the neighborhood" template={template}>
            <SiteGallery photos={data.local} layout="grid" className="[&_li]:rounded-lg" />
          </Section>
        )}

        {branded && (
          <section className="py-10 sm:py-14">
            <AgentCard data={data} template={template} />
          </section>
        )}
      </main>

      <footer className="border-t border-neutral-200 py-8 text-center text-[12px] text-neutral-500">
        {branded ? <>Photography by {brand.name}</> : <>{p.address}{location && `, ${location}`}</>}
      </footer>
    </div>
  );
}
