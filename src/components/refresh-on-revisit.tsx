"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/** Matches staleTimes.dynamic in next.config.ts: how long the device keeps a page it has shown. */
const KEPT_MS = 5 * 60_000;

/**
 * Pages opened before come straight from this device's copy (see staleTimes in next.config.ts).
 * This then asks the server for fresh data in the background; the page updates when it arrives,
 * without a loading screen. A page seen for the first time already has fresh data, so it isn't asked twice.
 */
export function RefreshOnRevisit() {
  const pathname = usePathname();
  const router = useRouter();
  const seen = useRef(new Map<string, number>());
  const [, start] = useTransition();

  useEffect(() => {
    const last = seen.current.get(pathname);
    seen.current.set(pathname, Date.now());
    // Older than the kept copy: the page was just loaded fresh, so there's nothing to refresh.
    if (last !== undefined && Date.now() - last < KEPT_MS) start(() => router.refresh());
  }, [pathname, router]);

  return null;
}
