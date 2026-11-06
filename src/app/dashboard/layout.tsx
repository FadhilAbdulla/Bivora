import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "M3 12l9-9 9 9M5 10v10h14V10", exact: true },
  { href: "/dashboard/trading", label: "Trading account", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
  { href: "/dashboard/deposit", label: "Deposit", icon: "M12 5v14M5 12l7 7 7-7" },
  { href: "/dashboard/withdraw", label: "Withdraw", icon: "M12 19V5M5 12l7-7 7 7" },
  { href: "/dashboard/transactions", label: "Transactions", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
  { href: "/dashboard/profile", label: "Profile", icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
];

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AppShell nav={nav}>
      {children}
    </AppShell>
  );
}
