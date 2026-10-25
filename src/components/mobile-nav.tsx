"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./ui";

/** Hamburger button + slide-out drawer for the dashboard and admin sidebars on small screens. */
export function MobileNav({ children, panelClassName }: { children: ReactNode; panelClassName?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:text-foreground lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {/* Portalled to <body>: the blurred sticky header would otherwise trap a fixed-position drawer. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div onClick={() => setOpen(false)} className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              // Close after following a link inside the drawer.
              onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
              className={cn(
                "animate-slide-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto shadow-2xl",
                panelClassName ?? "border-r border-line bg-surface text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 grid size-8 place-items-center rounded-md opacity-70 hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              {children}
            </div>
          </div>,
          // Inside the admin console, keep the console's theme tokens.
          (document.querySelector(".theme-admin") as HTMLElement | null) ?? document.body,
        )}
    </>
  );
}
