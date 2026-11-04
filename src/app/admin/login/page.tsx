import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto size-14" />
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
