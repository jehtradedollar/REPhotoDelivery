import { ExternalLink } from "lucide-react";
import { CopyField } from "@/components/copy-field";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { updatePropertySite } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { defaultDescription, SITE_TEMPLATES } from "@/lib/site";
import type { Project } from "@/lib/types";
import { appUrl } from "@/lib/url";

const swatch: Record<string, string> = {
  classic: "bg-[linear-gradient(180deg,#d6d3cd_0_55%,#fff_55%)]",
  modern: "bg-[linear-gradient(90deg,#171717_0_40%,#cfd8d3_40%)]",
  minimal: "bg-[linear-gradient(180deg,#fff_0_22%,#e5e5e5_22%_70%,#fff_70%)]",
};

/** Edit a listing's website: template, headline, MLS description and features. */
export function SiteEditor({ project: p, saved, live }: { project: Project; saved?: boolean; live: boolean }) {
  const slug = p.siteSlug;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
      <form action={updatePropertySite.bind(null, p.id)} className="space-y-6">
        {saved && <p className="rounded-lg bg-ok-soft px-4 py-3 text-sm text-ok">Website saved.</p>}
        <Card>
          <CardHeader title="Template" sub="Pick a look; both the branded and unbranded sites use it" />
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {SITE_TEMPLATES.map((t) => (
              <label key={t.key} className="group cursor-pointer">
                <input type="radio" name="siteTemplate" value={t.key} defaultChecked={p.siteTemplate === t.key} className="peer sr-only" />
                <div className={cn("aspect-[4/3] rounded-xl border border-line ring-accent transition peer-checked:ring-2 group-hover:border-line-strong", swatch[t.key])} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold">{t.name}</span>
                  {slug && (
                    <a href={`/p/${slug}?template=${t.key}`} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-accent hover:underline">
                      Preview
                    </a>
                  )}
                </div>
                <p className="text-[12px] text-muted">{t.blurb}</p>
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Listing details" />
          <div className="space-y-4 p-5">
            <Field label="Headline" hint="A short line above the address, e.g. Riverfront retreat with mountain views">
              <Input name="siteHeadline" defaultValue={p.siteHeadline ?? ""} maxLength={120} placeholder="Welcome home" />
            </Field>
            <Field label="Description" hint="Paste the MLS public remarks and edit freely. Leave blank to use the starter text shown.">
              <Textarea name="mlsDescription" defaultValue={p.mlsDescription ?? ""} rows={10} placeholder={defaultDescription(p)} />
            </Field>
            <Field label="Features" hint="One per line or separated by commas">
              <Textarea name="features" defaultValue={p.features.join("\n")} rows={5} />
            </Field>
            <label className="flex items-center gap-2.5 text-[14px]">
              <input type="checkbox" name="sitePublished" defaultChecked={p.sitePublished} className="size-4 accent-[var(--accent)]" />
              Publish the website once the media is delivered and paid
            </label>
          </div>
        </Card>
        <SubmitButton>Save website</SubmitButton>
      </form>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Links" sub={live ? "Live now" : "Not public yet; previews work for you and the agent"} />
          {slug ? (
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Branded</p>
                <p className="mb-2 text-[12px] text-muted">With the agent&apos;s photo, contact info and logo</p>
                <CopyField value={appUrl(`/p/${slug}`)} />
                <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "mt-2")}>
                  <ExternalLink /> Open
                </a>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold">Unbranded</p>
                <p className="mb-2 text-[12px] text-muted">No agent or brokerage info, for MLS virtual tour fields</p>
                <CopyField value={appUrl(`/p/${slug}/u`)} />
                <a href={`/p/${slug}/u`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "mt-2")}>
                  <ExternalLink /> Open
                </a>
              </div>
            </div>
          ) : (
            <p className="p-5 text-[13px] text-muted">Save once to create the website address.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
