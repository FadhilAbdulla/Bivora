import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin Console", template: "%s · Bivora Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="theme-admin flex min-h-full flex-1 flex-col">{children}</div>;
}
