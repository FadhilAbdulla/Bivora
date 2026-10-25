import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-foreground text-background">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Bivora Admin Console</h1>
          <p className="mt-1 text-sm text-muted">Restricted access. Authorized staff only.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Admin sessions expire after 8 hours.</p>
      </div>
    </div>
  );
}
