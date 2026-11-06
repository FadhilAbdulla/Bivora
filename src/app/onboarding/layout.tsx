import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/app/(auth)/actions";
import { LogoMark } from "@/components/logo";
import { Steps } from "./steps";

export const metadata: Metadata = { title: "Verify your account", robots: { index: false, follow: false } };

/** Dashboard-shaped placeholder behind the blur; no real account data shows before verification. */
function BlurredDashboard() {
  const block = "rounded-xl bg-surface-2";
  return (
    <div aria-hidden className="absolute inset-0 flex scale-105 opacity-70 blur-[6px]">
      <div className="hidden w-60 shrink-0 space-y-3 border-r border-line bg-surface p-5 lg:block">
        <div className={`${block} h-10 w-32`} />
        <div className="pt-4" />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`${block} h-8`} />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-6 p-6 sm:p-8">
        <div className={`${block} h-9 w-64`} />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className={`${block} h-28 bg-brand/25`} />
          <div className={`${block} h-28`} />
          <div className={`${block} h-28 bg-gold/20`} />
          <div className={`${block} h-28`} />
        </div>
        <div className={`${block} h-24`} />
        <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
          <div className={`${block} h-80`} />
          <div className={`${block} h-80`} />
        </div>
      </div>
    </div>
  );
}

// A modal with no close button: onboarding is mandatory, and the only other way out is logging out.
export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <BlurredDashboard />
      <div className="animate-fade-in absolute inset-0 bg-black/55" aria-hidden />
      <div className="relative flex h-full items-end justify-center sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Verify your account"
          className="onboarding-panel flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-t-2xl border border-line bg-surface shadow-2xl shadow-black/60 sm:max-h-[90dvh] sm:rounded-2xl"
        >
          <div className="shrink-0 space-y-3 border-b border-line px-4 pb-3 pt-3 sm:px-6 sm:pt-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold tracking-tight">
                <LogoMark className="size-9" />
                Bivora
              </span>
              <form action={logout}>
                <button className="-my-1 py-2.5 pl-3 text-sm text-muted hover:text-foreground">Log out</button>
              </form>
            </div>
            <Suspense fallback={<div className="h-7" />}>
              <Steps />
            </Suspense>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 sm:px-6 sm:pt-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
