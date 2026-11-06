import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { StickyTicker } from "@/components/markets/sticky-ticker";
import { MobileNav } from "@/components/mobile-nav";
import { ButtonLink } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/markets";

const nav = [
  { href: "/about", label: "About" },
  { href: "/markets", label: "Markets" },
  { href: "/#platform", label: "Platform" },
  { href: "/#accounts", label: "Accounts" },
  { href: "/contact", label: "Contact" },
];

const footerLinks = [
  { href: "/#platform", label: "Platform" },
  { href: "/#accounts", label: "Accounts" },
  { href: "/#faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

// The ticker lives here, between the page's hero slot and its content, so the
// TradingView widget survives navigation instead of reloading on every page change.
export default function MarketingLayout({ children, hero }: { children: ReactNode; hero: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-10">
            <MobileNav>
              <div className="flex h-16 shrink-0 items-center px-5">
                <Logo />
              </div>
              <nav className="flex flex-col gap-1 px-3 text-base">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg px-3 py-3 hover:bg-surface-2">
                    {item.label}
                  </Link>
                ))}
                <Link href="/login" className="rounded-lg px-3 py-3 hover:bg-surface-2">
                  Log in
                </Link>
              </nav>
            </MobileNav>
            <Logo />
            <nav className="hidden items-center gap-7 text-sm text-muted lg:flex">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ButtonLink href="/login" variant="ghost">
                Log in
              </ButtonLink>
            </div>
            <ButtonLink href="/signup" className="max-[359px]:px-2.5">Open account</ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {hero}
        <StickyTicker />
        {children}
      </main>

      <footer className="border-t border-line bg-surface/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-sm text-sm text-muted">
              Trade stocks, indices, commodities and metals — and manage every deposit and withdrawal from one
              dashboard.
            </p>
          </div>
          <div className="space-y-2.5 text-sm">
            <p className="font-medium">Markets</p>
            {ASSET_CLASSES.map((c) => (
              <Link key={c.id} href={`/markets#${c.id}`} className="block text-muted hover:text-foreground">
                {c.title}
              </Link>
            ))}
          </div>
          <div className="space-y-2.5 text-sm">
            <p className="font-medium">Platform</p>
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="block text-muted hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-2.5 text-sm">
            <p className="font-medium">Account</p>
            <Link href="/signup" className="block text-muted hover:text-foreground">Open account</Link>
            <Link href="/login" className="block text-muted hover:text-foreground">Client login</Link>
            <Link href="/terms" className="block text-muted hover:text-foreground">Terms &amp; Conditions</Link>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
            <p>
              <strong className="text-foreground">Risk warning:</strong> Trading leveraged products such as
              CFDs carries a high level of risk and may not be suitable for all investors. You could lose more than your
              initial deposit. Make sure you understand the risks involved and seek independent advice if necessary.
            </p>
            <p>Market data is provided for information only by TradingView and may be delayed.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
