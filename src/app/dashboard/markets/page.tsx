import type { Metadata } from "next";
import { MarketsWorkspace } from "@/components/markets/markets-workspace";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Markets" };

export default async function DashboardMarketsPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Markets"
        description="Live prices and professional charts for stocks, indices, commodities and metals."
      />
      <MarketsWorkspace chartClassName="h-[420px] sm:h-[560px]" />
    </>
  );
}
