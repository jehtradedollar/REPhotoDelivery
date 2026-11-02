import { FolderOpen, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { projectRows } from "@/lib/data";
import type { ProjectStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };

const filters: { key: ProjectStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "editing", label: "In editing" },
  { key: "delivered", label: "Delivered" },
  { key: "archived", label: "Archived" },
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireOwner();
  const { status = "all", q = "" } = await searchParams;
  const all = await projectRows();
  const rows = all.filter(
    (r) =>
      (status === "all" ? r.project.status !== "archived" : r.project.status === status) &&
      (!q || `${r.project.address} ${r.project.city} ${r.client?.name} ${r.client?.brokerage}`.toLowerCase().includes(q.toLowerCase())),
  );
  const count = (k: string) => (k === "all" ? all.filter((r) => r.project.status !== "archived").length : all.filter((r) => r.project.status === k).length);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every property you've shot or have on the books."
        actions={
          <ButtonLink href="/studio/projects/new">
            <Plus /> New shoot
          </ButtonLink>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={{ query: { ...(f.key !== "all" && { status: f.key }), ...(q && { q }) } }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition",
                status === f.key ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-strong",
              )}
            >
              {f.label} <span className="tabular opacity-60">{count(f.key)}</span>
            </Link>
          ))}
        </div>
        <form className="relative md:w-72">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search address or client" className="field pl-9" />
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<FolderOpen />} title="No projects match" body="Try a different filter or search." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <PropertyCard key={r.project.id} row={r} href={`/studio/projects/${r.project.id}`} />
          ))}
        </div>
      )}
    </>
  );
}
