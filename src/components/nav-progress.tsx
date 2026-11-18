"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Waits this long before showing, so pages that open instantly don't flash the bar. */
const SHOW_AFTER_MS = 120;
/** Gives up after this long, in case a navigation never finishes. */
const GIVE_UP_MS = 20_000;

/**
 * A thin bar across the top of the screen while a page is loading, for every link in the app.
 * It shows while the address is still the one the link was clicked on, and while the new page's
 * loading screen is up, and goes away as soon as the page itself is showing. Links that show their own loading state (PendingLink) are left to it.
 */
export function NavProgress() {
  const here = `${usePathname()}?${useSearchParams().toString()}`;
  // The page a link was clicked on, while its new page is loading.
  const [leaving, setLeaving] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // A page's loading screen is showing: the address has changed, but the page is still loading.
  const [loadingScreen, setLoadingScreen] = useState(false);

  useEffect(() => {
    const check = () => {
      const el = document.querySelector("[data-page-loading]");
      // Pages kept in the background are hidden, so only a visible loading screen counts.
      setLoadingScreen(Boolean(el && el.checkVisibility()));
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Same page (or only a #hash): nothing loads.
      if (url.pathname === location.pathname && url.search === location.search) return;
      const from = `${location.pathname}?${location.search.slice(1)}`;
      clear();
      timers.current.push(setTimeout(() => setLeaving(from), SHOW_AFTER_MS));
      timers.current.push(setTimeout(() => setLeaving(null), GIVE_UP_MS));
    };
    // Bubble phase: a link that handled its own loading has already called preventDefault.
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clear();
    };
  }, []);

  // The new page is showing: forget the old one, so coming back to it later doesn't show the bar.
  if (leaving !== null && leaving !== here) setLeaving(null);
  if (!loadingScreen && (leaving === null || leaving !== here)) return null;
  return (
    <div role="progressbar" aria-label="Loading page" className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-brand/20">
      <div className="h-full w-1/3 animate-[pending-bar_1s_ease-in-out_infinite] bg-brand" />
    </div>
  );
}
