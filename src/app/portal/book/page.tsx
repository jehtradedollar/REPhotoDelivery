import type { Metadata } from "next";
import { ShootForm } from "@/components/shoot-form";
import { PageHeader } from "@/components/ui";
import { bookShoot } from "@/lib/actions";
import { requireClient } from "@/lib/auth";
import { getPackages, getServices, bookingBusy } from "@/lib/data";

export const metadata: Metadata = { title: "Book a shoot" };

export default async function BookPage() {
  await requireClient();
  // Only time ranges are sent to the browser, never other agents' details.
  const busy = await bookingBusy();
  return (
    <>
      <PageHeader title="Book a shoot" description="Pick a package and an open time. We'll confirm by email, usually within the hour." />
      <ShootForm
        action={bookShoot}
        packages={await getPackages()}
        services={await getServices()}
        busy={busy}
        submitLabel="Request this time"
        note="You won't be charged now. You'll pay when your media is delivered."
      />
    </>
  );
}
