"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { KYC_DOCS } from "@/lib/kyc";

const STEPS = [
  ...KYC_DOCS.map((d) => ({ label: d.title === "Proof of address" ? "Address" : d.title, href: `/onboarding/${d.step}` })),
  { label: "Terms", href: "/onboarding/terms" },
];

/** Lives in the layout, so the bars animate as the client moves between steps. */
export function Steps() {
  const pathname = usePathname();
  if (pathname === "/onboarding/review") return null;
  const current = Math.max(STEPS.findIndex((s) => s.href === pathname), 0) + 1;

  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map((step, i) => {
        const n = i + 1;
        const done = n < current;
        const inner = (
          <>
            <span className="block h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className={cn(
                  "block h-full origin-left rounded-full bg-brand transition-transform duration-500 ease-out",
                  n <= current ? "scale-x-100" : "scale-x-0",
                )}
              />
            </span>
            <span className={cn("mt-1.5 block truncate text-xs transition-colors", n === current ? "font-semibold text-foreground" : "text-muted")}>
              {done && <span aria-hidden>✓ </span>}
              {step.label}
            </span>
          </>
        );
        return (
          <li key={step.label} aria-current={n === current ? "step" : undefined}>
            {done ? <Link href={step.href}>{inner}</Link> : inner}
          </li>
        );
      })}
    </ol>
  );
}
