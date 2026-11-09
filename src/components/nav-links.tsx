"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "./ui";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** Short label for the phone tab bar. Items without one stay out of the bar. */
  tab?: string;
  /** Makes this item an expandable group; its own href is not used. */
  children?: NavItem[];
};

const isActive = (item: NavItem, pathname?: string) =>
  pathname !== undefined && (item.exact ? pathname === item.href : pathname.startsWith(item.href));

export function NavLinks({ items }: { items: NavItem[] }) {
  return <NavLinkList items={items} pathname={usePathname()} />;
}

// Rendered without an active item while the pathname streams in.
export function NavLinkList({ items, pathname }: { items: NavItem[]; pathname?: string }) {
  return (
    <>
      {items.map((item) => {
        if (item.children) return <NavGroup key={item.label} item={item} pathname={pathname} />;
        const active = isActive(item, pathname);
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

function NavGroup({ item, pathname }: { item: NavItem; pathname?: string }) {
  const children = item.children!;
  const containsActive = children.some((child) => isActive(child, pathname));
  // Starts open on any of its pages; after that the admin decides.
  const [open, setOpen] = useState(containsActive);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          containsActive ? "text-brand" : "text-muted hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={item.icon} />
        </svg>
        <span className="flex-1">{item.label}</span>
        <svg viewBox="0 0 24 24" className={cn("size-4 opacity-70 transition-transform", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-1 pl-4">
          <NavLinkList items={children} pathname={pathname} />
        </div>
      )}
    </div>
  );
}

export function BottomTabs({ items }: { items: NavItem[] }) {
  return <BottomTabList items={items} pathname={usePathname()} />;
}

// Rendered without an active tab while the pathname streams in.
export function BottomTabList({ items, pathname }: { items: NavItem[]; pathname?: string }) {
  return (
    <>
      {items.map((item) => {
        if (item.children) return <NavGroup key={item.label} item={item} pathname={pathname} />;
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-brand" : "text-muted hover:text-foreground",
            )}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={item.icon} />
            </svg>
            {item.tab}
          </Link>
        );
      })}
    </>
  );
}
