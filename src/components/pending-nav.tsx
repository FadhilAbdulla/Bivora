"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { cn } from "./ui";

// Filters, tabs and dropdowns that reload the page with new search params. While the new page
// loads, a bar runs along the top and the current content dims, so it's clear something is happening.

const Pending = createContext<{ pending: boolean; go: (href: string) => void }>({ pending: false, go: () => {} });

export function PendingArea({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (href: string) => start(() => router.push(href, { scroll: false }));
  return (
    <Pending value={{ pending, go }}>
      {pending && (
        <div role="progressbar" aria-label="Loading" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand/20">
          <div className="h-full w-1/3 animate-[pending-bar_1s_ease-in-out_infinite] bg-brand" />
        </div>
      )}
      <div aria-busy={pending} className={cn("transition-opacity duration-150", pending && "pointer-events-none opacity-55", className)}>
        {children}
      </div>
    </Pending>
  );
}

export function usePendingNav() {
  return use(Pending);
}

/** A link that shows the loading state; ctrl/cmd-click still opens a new tab. */
export function PendingLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { go } = usePendingNav();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(href);
      }}
      {...props}
    />
  );
}

/** A GET filter form that loads its results with the loading state instead of a full page load. */
export function PendingForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action" | "onSubmit"> & { action: string }) {
  const { go } = usePendingNav();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget)) {
      if (typeof value === "string" && value !== "") query.append(key, value);
    }
    go(query.size ? `${action}?${query}` : action);
  };
  return (
    <form action={action} onSubmit={submit} {...props}>
      {children}
    </form>
  );
}
