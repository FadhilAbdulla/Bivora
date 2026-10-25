import Link from "next/link";
import { BRAND, MARK } from "@/lib/brand";
import { cn } from "./ui";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  const { wick, body, bowls } = MARK;
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="bivora-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.gradientFrom} />
          <stop offset="1" stopColor={BRAND.gradientTo} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#bivora-mark)" />
      <line {...wick} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <rect {...body} fill="#fff" />
      <path d={bowls} fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 font-semibold tracking-tight" aria-label="Bivora home">
      <LogoMark className="size-8 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="text-lg">Bivora</span>
    </Link>
  );
}
