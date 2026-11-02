import { AppShell, type NavItem } from "@/components/app-shell";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/data";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOwner();
  const requests = db.shoots.filter((s) => s.status === "requested").length;
  const nav: NavItem[] = [
    { href: "/studio", label: "Dashboard", icon: "dashboard", primary: true, exact: true },
    { href: "/studio/calendar", label: "Calendar", icon: "calendar", primary: true, badge: requests },
    { href: "/studio/projects", label: "Projects", icon: "projects", primary: true },
    { href: "/studio/clients", label: "Clients", icon: "clients", primary: true },
    { href: "/studio/invoices", label: "Invoices", icon: "invoices" },
    { href: "/studio/settings", label: "Settings", icon: "settings" },
  ];
  return (
    <AppShell nav={nav} area="Studio" user={user}>
      {children}
    </AppShell>
  );
}
