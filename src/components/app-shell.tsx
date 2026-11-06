import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { KycBanner } from "./kyc-banner";
import { Logo } from "./logo";
import { BottomTabList, BottomTabs, NavLinkList, NavLinks, type NavItem } from "./nav-links";
import { Toaster } from "./toast";
import { Skeleton } from "./ui";

function SidebarContent({ nav }: { nav: NavItem[] }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-5">
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
  const tabs = nav.filter((item) => item.tab);
  return (
    <div className="flex flex-1">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
        <SidebarContent nav={nav} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="lg:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="ml-auto">
            <Suspense fallback={<Skeleton className="h-8 w-24 sm:w-40" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pt-8 lg:pb-8">
          <Suspense>
            <KycBanner />
          </Suspense>
          {children}
          <p className="mt-8 text-xs text-muted lg:hidden">Trading involves risk. Only trade with money you can afford to lose.</p>
        </main>
        {/* Phones and tablets: app-style tabs. Profile and Log out are behind the avatar in the header. */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          <div className="flex h-16">
            <Suspense fallback={<BottomTabList items={tabs} />}>
              <BottomTabs items={tabs} />
            </Suspense>
          </div>
        </nav>
        <Toaster />
      </div>
    </div>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <Link href="/dashboard/profile" aria-label="Your profile" className="group flex items-center gap-3">
      <span className="hidden text-right text-sm leading-tight sm:block">
        <span className="block font-medium group-hover:text-brand">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-xs text-muted">{user.email}</span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
    </Link>
  );
}
