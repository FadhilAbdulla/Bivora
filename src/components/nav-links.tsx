"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  return <NavLinkList items={items} pathname={usePathname()} />;
}

// Rendered without an active item while the pathname streams in.
export function NavLinkList({ items, pathname }: { items: NavItem[]; pathname?: string }) {
  return (
    <>
      {items.map((item) => {
        const active =
          pathname !== undefined && (item.exact ? pathname === item.href : pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
