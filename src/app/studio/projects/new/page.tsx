import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShootForm } from "@/components/shoot-form";
import { PageHeader } from "@/components/ui";
import { createProject } from "@/lib/actions";
import { requireOwner } from "@/lib/auth";
import { getClients, getPackages, getServices, getShoots } from "@/lib/data";

export const metadata: Metadata = { title: "New shoot" };

export default async function NewProjectPage() {
  await requireOwner();
  const busy = getShoots().filter((s) => s.status !== "cancelled").map(({ start, end }) => ({ start, end }));
  return (
    <>
      <Link href="/studio/projects" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Projects
      </Link>
      <PageHeader title="Schedule a shoot" description="Creates the project, books the time and adds it to your Google Calendar." />
      <ShootForm
        action={createProject}
        clients={getClients()}
        packages={getPackages()}
        services={getServices()}
        busy={busy}
        submitLabel="Schedule shoot"
        note="Times that overlap an existing shoot are crossed out."
      />
    </>
  );
}
