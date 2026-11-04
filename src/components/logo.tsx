import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "./ui";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <Image src={BRAND.logoPath} alt="" width={64} height={64} className={cn("shrink-0 rounded-[22%]", className)} />
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
