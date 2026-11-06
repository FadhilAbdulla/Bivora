import { AdminShell } from "@/components/admin-shell";
import type { NavItem } from "@/components/nav-links";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "M3 12l9-9 9 9M5 10v10h14V10", exact: true },
  { href: "/admin/requests", label: "Fund requests", icon: "M9 12l2 2 4-4M5 3h14v18H5z" },
  { href: "/admin/messages", label: "Messages", icon: "M4 6h16v12H4zM4 7l8 6 8-6" },
  { href: "/admin/users", label: "Clients", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/admin/admins", label: "Admins", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4" },
  { href: "/admin/settings", label: "ARK settings", icon: "M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M16 4v4M8 10v4M14 16v4" },
];

export default function AdminConsoleLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell nav={nav}>{children}</AdminShell>;
}
