import { Suspense, type ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import { TickerTape } from "./markets/tradingview";
import { MobileNav } from "./mobile-nav";
import { NavLinkList, NavLinks, type NavItem } from "./nav-links";
import { Skeleton } from "./ui";

function SidebarContent({ nav }: { nav: NavItem[] }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-3">
        <Suspense fallback={<NavLinkList items={nav} />}>
          <NavLinks items={nav} />
        </Suspense>
      </nav>
      <div className="border-t border-line p-4 text-xs text-muted">
        Trading involves risk. Only trade with money you can afford to lose.
      </div>
    </>
  );
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="flex flex-1">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <SidebarContent nav={nav} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur-xl sm:px-8">
          <MobileNav>
            <SidebarContent nav={nav} />
          </MobileNav>
          <div className="lg:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="ml-auto">
            <Suspense fallback={<Skeleton className="h-8 w-24 sm:w-40" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        {/* Live prices pinned to the bottom of the viewport, like a terminal status bar. */}
        <div className="sticky bottom-0 z-30 border-t border-line bg-background/85 backdrop-blur-xl">
          <TickerTape />
        </div>
      </div>
    </div>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="hidden text-right text-sm leading-tight sm:block">
        <p className="font-medium">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-muted">{user.email}</p>
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <form action={logout}>
        <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground">
          Log out
        </button>
      </form>
    </div>
  );
}
