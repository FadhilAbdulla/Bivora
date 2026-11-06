import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { adminLogout } from "@/app/admin/auth-actions";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { LogoMark } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinkList, NavLinks, type NavItem } from "./nav-links";
import { Toaster } from "./toast";
import { Skeleton } from "./ui";

const navStyles =
  "[&_a]:text-white/75 [&_a:hover]:bg-white/5 [&_a:hover]:text-white [&_a[aria-current=page]]:bg-white/10 [&_a[aria-current=page]]:text-white";

function Brand() {
  return (
    <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2.5 px-5">
      <LogoMark className="size-10" />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-white">Bivora</span>
        <span className="block text-[11px] uppercase tracking-wider text-white/55">Admin console</span>
      </span>
    </Link>
  );
}

function SidebarContent({ nav }: { nav: NavItem[] }) {
  return (
    <>
      <Brand />
      <p className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-white/45">Operations</p>
      <nav className={`flex flex-1 flex-col gap-1 px-3 pb-3 ${navStyles}`}>
        <Suspense fallback={<NavLinkList items={nav} />}>
          <NavLinks items={nav} />
        </Suspense>
      </nav>
      <Suspense>
        <AdminIdentity />
      </Suspense>
    </>
  );
}

export function AdminShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="hidden bg-[#0b1210] text-white/75 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        <SidebarContent nav={nav} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-8">
          <MobileNav panelClassName="bg-[#0b1210] text-white/75">
            <SidebarContent nav={nav} />
          </MobileNav>
          <Suspense fallback={<Skeleton className="h-6 w-32 sm:w-48" />}>
            <PendingBanner />
          </Suspense>
          <span className="ml-auto hidden rounded-full border border-line px-2.5 py-1 text-xs text-muted sm:inline">Super admin</span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        <Toaster />
      </div>
    </div>
  );
}

async function AdminIdentity() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return (
    <div className="border-t border-white/10 p-4">
      <p className="text-sm font-medium text-white">
        {admin.firstName} {admin.lastName}
      </p>
      <p className="truncate text-xs text-white/55">{admin.email}</p>
      <form action={adminLogout} className="mt-3">
        <button className="w-full rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}

async function PendingBanner() {
  const pending = await db.fundRequest.count({ where: { status: "PENDING" } });
  return pending > 0 ? (
    <Link href="/admin/requests" className="flex items-center gap-2 text-sm">
      <span className="grid min-w-6 place-items-center rounded-full bg-warning px-1.5 text-xs font-semibold text-white">{pending}</span>
      <span className="text-muted hover:text-foreground">
        <span className="sm:hidden">pending</span>
        <span className="hidden sm:inline">request{pending === 1 ? "" : "s"} awaiting review</span>
      </span>
    </Link>
  ) : (
    <span className="text-sm text-muted">
      <span className="sm:hidden">All caught up</span>
      <span className="hidden sm:inline">No requests awaiting review</span>
    </span>
  );
}
