import { AppShell, type NavItem } from "@/components/app-shell";
import { requireClient } from "@/lib/auth";
import { getClient } from "@/lib/data";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient();
  const client = await getClient(user.clientId);
  const nav: NavItem[] = [
    { href: "/portal", label: "Properties", icon: "properties", primary: true, exact: true, match: ["/portal/properties"] },
    { href: "/portal/book", label: "Book a shoot", icon: "book", primary: true },
    { href: "/portal/invoices", label: "Invoices", icon: "invoices", primary: true },
    { href: "/portal/account", label: "Account", icon: "settings" },
  ];
  return (
    <AppShell nav={nav} area="Agent portal" user={{ ...user, hue: client?.hue }}>
      {children}
    </AppShell>
  );
}
