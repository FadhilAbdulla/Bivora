import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { ASSET_CLASSES } from "@/lib/markets";

const nav = [
  { href: "/markets", label: "Markets" },
  { href: "/#platform", label: "Platform" },
  { href: "/#accounts", label: "Accounts" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup">Open account</ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

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
            {nav.slice(1).map((item) => (
              <Link key={item.href} href={item.href} className="block text-muted hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="space-y-2.5 text-sm">
            <p className="font-medium">Account</p>
            <Link href="/signup" className="block text-muted hover:text-foreground">Open account</Link>
            <Link href="/login" className="block text-muted hover:text-foreground">Client login</Link>
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
