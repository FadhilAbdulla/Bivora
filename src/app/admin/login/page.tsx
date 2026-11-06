import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* The logo is designed for dark backgrounds, so it sits on a dark tile on this light page. */}
          <span className="mx-auto grid size-20 place-items-center rounded-2xl bg-[#070908]">
            <LogoMark className="size-14" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Bivora Admin Console</h1>
          <p className="mt-1 text-sm text-muted">Restricted access. Authorized staff only.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
